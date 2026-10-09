(function () {
  'use strict';

  /* =====================================================================
   * VoiceMatch Studio — local-first, zero-dependency.
   * State lives in localStorage under KEY. Media (object URLs) is in memory only.
   * ===================================================================== */

  var KEY = 'voicematch.v2';
  var OLD_KEY = 'voicematch.v1';
  var THEME_KEY = 'voicematch.theme';
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var STATUS = { draft: 'Draft', ready: 'Ready', posted: 'Posted' };
  var ASPECTS = ['1 / 1', '4 / 5', '1.91 / 1'];
  var DEFAULT_BANNED = ['delve', 'testament', 'tapestry', 'spearhead', 'supercharge', 'game-changer',
    'game changer', 'thrilled to announce', 'excited to share', 'beacon', 'leverage', 'synergy',
    'cutting-edge', 'cutting edge', 'unlock', 'landscape', 'navigate the', 'in today\'s fast-paced',
    'revolutionize', 'paradigm', 'elevate', 'seamless', 'robust', 'holistic', 'unleash'];
  // lines = where LinkedIn folds the post; cpl is only a fallback when layout can't be measured.
  var VIEW = { mobile: { lines: 3, cpl: 44, label: 'Mobile fold · 3 lines' }, desktop: { lines: 5, cpl: 72, label: 'Desktop fold · 5 lines' } };
  var LINE_HEIGHT = 20;

  var $ = function (id) { return document.getElementById(id); };
  var view = 'mobile';
  var media = [null, null, null, null, null];
  var refIdx = 0;

  /* ---------------- State ---------------- */

  function uid() { return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function newSlot() { return { text: '', comment: '', status: 'draft', history: [] }; }
  function blank() {
    return {
      v: 2, active: 0, aspect: ASPECTS[0], custom: [], voice: [],
      slots: [newSlot(), newSlot(), newSlot(), newSlot(), newSlot()],
      profile: { name: 'Your Founder', headline: 'Founder & CEO', photo: '' },
      playbook: {
        style: 'Sentences under 15 words.\nNo exclamation marks.\nConversational tone.',
        pillars: 'Search & Hiring Trends\nFounder Musings\nClient Win Stories\nContrarian Takes',
        hooks: ''
      }
    };
  }
  // Accepts v2 data, v1 data (drafts[]/comments[]) or an import file; always returns a safe v2 object.
  function normalize(d) {
    var b = blank(); d = d && typeof d === 'object' ? d : {};
    var src = Array.isArray(d.slots) ? d.slots : (Array.isArray(d.drafts) ? d.drafts.map(function (t, i) {
      return { text: t, comment: (d.comments || [])[i] };
    }) : []);
    b.slots = b.slots.map(function (_, i) {
      var s = src[i] || {};
      return {
        text: String(s.text || ''), comment: String(s.comment || ''),
        status: STATUS[s.status] ? s.status : 'draft',
        history: (Array.isArray(s.history) ? s.history : []).filter(function (h) { return h && STATUS[h.s] && isFinite(h.at); })
          .map(function (h) { return { s: h.s, at: +h.at }; }).slice(-30)
      };
    });
    b.active = Math.min(4, Math.max(0, d.active | 0));
    b.custom = Array.isArray(d.custom) ? d.custom.map(String).filter(Boolean) : [];
    b.aspect = ASPECTS.indexOf(d.aspect) >= 0 ? d.aspect : b.aspect;
    if (d.profile) {
      b.profile.name = String(d.profile.name || b.profile.name);
      b.profile.headline = String(d.profile.headline || '');
      b.profile.photo = /^data:image\//.test(d.profile.photo || '') ? d.profile.photo : '';
    }
    if (d.playbook) ['style', 'pillars', 'hooks'].forEach(function (k) { if (typeof d.playbook[k] === 'string') b.playbook[k] = d.playbook[k]; });
    b.voice = (Array.isArray(d.voice) ? d.voice : []).slice(0, 5).map(function (v) {
      return { id: String(v && v.id || uid()), title: String(v && v.title || ''), text: String(v && v.text || '') };
    });
    return b;
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {}
    return blank();
  }
  var saveFailed = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveFailed = false; }
    catch (e) { if (!saveFailed) { saveFailed = true; toast('Could not save. Browser storage may be full or blocked.'); } }
  }
  var state = load();
  function slot() { return state.slots[state.active]; }

  /* ---------------- Text helpers ---------------- */

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function allBanned() { return DEFAULT_BANNED.concat(state.custom); }
  function bannedRegex() {
    var list = allBanned().filter(Boolean).sort(function (a, b) { return b.length - a.length; });
    if (!list.length) return null;
    return new RegExp('(^|[^\\w])(' + list.map(reEsc).join('|') + ')(?![\\w])', 'gi');
  }
  function findFlags(text) {
    var re = bannedRegex(), out = [], m;
    if (!re) return out;
    while ((m = re.exec(text))) { out.push(m[2].toLowerCase()); if (m[0].length === 0) re.lastIndex++; }
    return out;
  }
  function highlight(text) {
    var re = bannedRegex();
    if (!re) return esc(text);
    var res = '', last = 0, m;
    while ((m = re.exec(text))) {
      var start = m.index + m[1].length;
      res += esc(text.slice(last, start)) + '<mark>' + esc(m[2]) + '</mark>';
      last = start + m[2].length;
    }
    return res + esc(text.slice(last));
  }
  function forLinkedIn(text) {
    return text.replace(/\r\n?/g, '\n').replace(/[   ]/g, ' ')
      .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function fmtTime(ts) {
    try { return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
    catch (e) { return ''; }
  }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }
  function writeClipboard(text, ok) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('Copy failed. Select the text manually.'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }

  /* ---------------- Theme ---------------- */

  var themeMode = 'auto';
  try { themeMode = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {}
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var root = document.documentElement;
    if (themeMode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', themeMode);
    var dark = themeMode === 'dark' || (themeMode === 'auto' && mql && mql.matches);
    var meta = $('metaTheme'); if (meta) meta.setAttribute('content', dark ? '#1B1F23' : '#0A66C2');
    $('themeIcon').textContent = { auto: '🌓', light: '☀️', dark: '🌙' }[themeMode];
    $('themeLabel').textContent = { auto: 'Theme: Auto', light: 'Theme: Light', dark: 'Theme: Dark' }[themeMode];
    $('btnTheme').setAttribute('aria-label', 'Theme: ' + themeMode + '. Click to change.');
  }

  /* ---------------- Editor (highlight layer) ---------------- */

  function autoGrow() {
    var ed = $('editor'), wrap = ed.parentNode;
    wrap.style.height = wrap.offsetHeight + 'px'; // hold layout steady so the page doesn't jump
    ed.style.height = 'auto';
    ed.style.height = Math.max(340, ed.scrollHeight + 2) + 'px';
    wrap.style.height = '';
  }
  function syncEditor() {
    var text = slot().text;
    $('hl').innerHTML = highlight(text) + '​';
    autoGrow();

    var words = (text.trim().match(/\S+/g) || []).length;
    $('statChars').textContent = text.length;
    $('statWords').textContent = words;
    $('statRead').textContent = Math.max(words ? 1 : 0, Math.round(words / 238 * 60));

    var flags = findFlags(text), uniq = flags.filter(function (f, i) { return flags.indexOf(f) === i; });
    var fl = $('statFlags');
    fl.textContent = flags.length + ' flagged';
    fl.className = 'flags ' + (flags.length ? 'bad' : 'ok');
    $('flagList').innerHTML = uniq.map(function (f) { return '<span class="flag-chip">' + esc(f) + '</span>'; }).join('');
  }

  /* ---------------- Feed preview + fold line ---------------- */

  function estimateCut(text, cfg) {
    // Fallback when layout can't be measured: approximate by characters per line.
    var lines = 0, i = 0, parts = text.split('\n');
    for (var p = 0; p < parts.length; p++) {
      var rows = Math.max(1, Math.ceil(parts[p].length / cfg.cpl));
      if (lines + rows > cfg.lines) {
        var end = Math.min(parts[p].length, (cfg.lines - lines) * cfg.cpl);
        var sp = parts[p].lastIndexOf(' ', end);
        return i + (sp > 0 && end < parts[p].length ? sp : end);
      }
      lines += rows; i += parts[p].length + 1;
    }
    return -1;
  }
  // Index of the first character that renders below line N, or -1 if everything fits.
  function measureCut(el, text, cfg) {
    var node = el.firstChild;
    if (!node || !document.createRange) return estimateCut(text, cfg);
    var box = el.getBoundingClientRect(), limit = box.top + cfg.lines * LINE_HEIGHT, n = text.length;
    if (box.height <= cfg.lines * LINE_HEIGHT + 1) return -1;
    var range = document.createRange();
    function mid(i) {
      for (var j = i; j < n; j++) {
        range.setStart(node, j); range.setEnd(node, j + 1);
        var r = range.getClientRects();
        if (r.length && r[0].height > 0) return r[0].top + r[0].height / 2;
      }
      return Infinity;
    }
    var lo = 0, hi = n - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (mid(m) >= limit) hi = m; else lo = m + 1; }
    return lo;
  }

  function renderPreview() {
    var s = slot(), text = s.text, cfg = VIEW[view];
    $('pvName').textContent = state.profile.name;
    $('pvHeadline').textContent = state.profile.headline;
    $('pvAvatar').src = state.profile.photo || 'icons/icon-48x48.png';

    var pt = $('pvText'), rest = $('pvRest'), fold = $('foldLine'), note = $('hookNote');
    var empty = !text.trim();
    $('pvEmpty').hidden = !empty;
    $('pvPost').hidden = empty;
    fold.hidden = true; rest.hidden = true; rest.innerHTML = '';
    if (empty) { pt.textContent = ''; note.hidden = true; return; }

    pt.textContent = text;
    var cut = measureCut(pt, text, cfg);
    if (cut >= 0 && !text.slice(cut).trim()) cut = -1;
    note.hidden = false;
    if (cut < 0) {
      pt.innerHTML = highlight(text);
      note.textContent = 'Fits above the fold. No "…see more" needed.';
      return;
    }
    var visible = text.slice(0, cut).replace(/\s+$/, ''), guard = 0;
    for (;;) {
      pt.innerHTML = highlight(visible) + '<span class="see-more" role="button" tabindex="-1">…see more</span>';
      if (pt.getBoundingClientRect().height <= cfg.lines * LINE_HEIGHT + 1 || guard++ > 40) break;
      var next = visible.replace(/\s*\S+\s*$/, ''); // make room for "…see more" by dropping the last word
      if (!next || next.length === visible.length) break;
      visible = next;
    }
    rest.innerHTML = highlight(text.slice(visible.length).replace(/^\s+/, ''));
    rest.hidden = false;
    $('foldLabel').textContent = cfg.label;
    fold.hidden = false;
    note.textContent = 'Hook zone: ' + visible.length + ' characters show before "…see more" (' + view + ').';
  }

  /* ---------------- Tabs, status, history ---------------- */

  function firstWords(text) {
    var w = text.replace(/​/g, '').trim().split(/\s+/).filter(Boolean);
    return w.length ? w.slice(0, 3).join(' ') + (w.length > 3 ? '…' : '') : 'Empty';
  }
  function renderSlots() {
    var wrap = $('slots'); wrap.innerHTML = '';
    DAYS.forEach(function (d, i) {
      var s = state.slots[i], st = s.text.trim() ? s.status : 'empty';
      var label = st === 'empty' ? 'Empty' : STATUS[st];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot' + (i === state.active ? ' active' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === state.active ? 'true' : 'false');
      b.title = d + ' · ' + label;
      b.innerHTML = '<b><i class="dot s-' + st + '" aria-hidden="true"></i>' + d.slice(0, 3) +
        '<span class="sr-only">, ' + label + '</span></b><span class="title">' + esc(firstWords(s.text)) + '</span>';
      b.onclick = function () { state.active = i; save(); renderAll(); };
      b.onkeydown = function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (n >= 0 && n < 5) { e.preventDefault(); state.active = n; save(); renderAll(); $('slots').children[n].focus(); }
      };
      wrap.appendChild(b);
    });
  }
  function renderStatus() {
    var s = slot();
    document.querySelectorAll('[data-status]').forEach(function (b) {
      var on = b.getAttribute('data-status') === s.status;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    var last = s.history[s.history.length - 1];
    $('histLine').textContent = last ? 'Marked ' + STATUS[last.s] + ' · ' + fmtTime(last.at) : 'Status: ' + STATUS[s.status] + ' · no changes yet';
    var ol = $('histList'); ol.innerHTML = '';
    s.history.slice(-8).reverse().forEach(function (h) {
      var li = document.createElement('li'); li.textContent = STATUS[h.s] + ' · ' + fmtTime(h.at); ol.appendChild(li);
    });
  }
  function setStatus(st) {
    var s = slot();
    if (s.status === st) return;
    s.status = st; s.history.push({ s: st, at: Date.now() }); s.history = s.history.slice(-30);
    save(); renderStatus(); renderSlots();
    toast(DAYS[state.active] + ' marked ' + STATUS[st]);
  }

  /* ---------------- Copy ---------------- */

  function copyPost() {
    var out = forLinkedIn(slot().text);
    if (!out) return toast('Nothing to copy yet.');
    var flagged = findFlags(out).length;
    writeClipboard(out, function () {
      toast('Copied · ' + out.length + ' characters, ' + (out.match(/\S+/g) || []).length + ' words' + (flagged ? ' · ' + flagged + ' flagged' : ''));
    });
  }

  /* ---------------- Unicode formatter ---------------- */

  var RANGES = { bold: { U: 0x1D5D4, l: 0x1D5EE, d: 0x1D7EC }, italic: { U: 0x1D608, l: 0x1D622, d: null } };
  function styleText(str, style) {
    return Array.from(str).map(function (ch) {
      var c = ch.codePointAt(0);
      if (style === 'plain') {
        for (var k in RANGES) {
          var r = RANGES[k];
          if (c >= r.U && c < r.U + 26) return String.fromCharCode(65 + c - r.U);
          if (c >= r.l && c < r.l + 26) return String.fromCharCode(97 + c - r.l);
          if (r.d && c >= r.d && c < r.d + 10) return String.fromCharCode(48 + c - r.d);
        }
        return ch;
      }
      var m = RANGES[style];
      if (c >= 65 && c <= 90) return String.fromCodePoint(m.U + c - 65);
      if (c >= 97 && c <= 122) return String.fromCodePoint(m.l + c - 97);
      if (m.d && c >= 48 && c <= 57) return String.fromCodePoint(m.d + c - 48);
      return ch;
    }).join('');
  }
  function applyEdit(fn) {
    var ed = $('editor'), res = fn(ed.value, ed.selectionStart, ed.selectionEnd);
    slot().text = res.text; save();
    ed.value = res.text;
    syncEditor(); renderPreview(); renderSlots();
    ed.focus(); ed.setSelectionRange(res.start, res.end);
  }
  function format(style) {
    applyEdit(function (v, s, e) {
      if (s === e) return { text: v, start: s, end: e };
      var out = styleText(v.slice(s, e), style);
      return { text: v.slice(0, s) + out + v.slice(e), start: s, end: s + out.length };
    });
  }
  function bullet(sym) {
    applyEdit(function (v, s, e) {
      var ls = v.lastIndexOf('\n', s - 1) + 1, le = v.indexOf('\n', e); if (le < 0) le = v.length;
      var block = v.slice(ls, le).split('\n').map(function (l) {
        return l.trim() ? sym + ' ' + l.replace(/^[•➔✦\-*]\s+/, '') : l;
      }).join('\n');
      return { text: v.slice(0, ls) + block + v.slice(le), start: ls, end: ls + block.length };
    });
  }

  /* ---------------- Media staging ---------------- */

  function setMedia(file) {
    if (!file) return;
    var isImg = /^image\//.test(file.type), isPdf = file.type === 'application/pdf';
    if (!isImg && !isPdf) return toast('Use an image or a PDF.');
    var old = media[state.active]; if (old && old.url) URL.revokeObjectURL(old.url);
    media[state.active] = { type: isImg ? 'image' : 'pdf', name: file.name, url: isImg ? URL.createObjectURL(file) : '' };
    renderMedia();
  }
  function renderMedia() {
    var m = media[state.active], pv = $('pvMedia');
    $('mediaCtl').hidden = !m;
    $('dropText').textContent = m ? 'Replace: ' + m.name : 'Drop an image or PDF carousel here, or click to choose';
    pv.innerHTML = '';
    if (!m) { pv.hidden = true; return; }
    pv.hidden = false;
    pv.style.setProperty('--ar', state.aspect);
    if (m.type === 'image') {
      var img = document.createElement('img'); img.src = m.url; img.alt = m.name; pv.appendChild(img);
    } else {
      var d = document.createElement('div'); d.className = 'pdf'; d.textContent = '📄 Carousel · ' + m.name; pv.appendChild(d);
    }
    document.querySelectorAll('[data-ar]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-ar') === state.aspect); });
  }

  /* ---------------- Voice Bank ---------------- */

  function renderReference() {
    var v = state.voice, has = v.length > 0;
    $('refEmpty').hidden = has; $('refBody').hidden = !has;
    if (!has) return;
    if (refIdx >= v.length) refIdx = 0;
    var sel = $('refSelect'); sel.innerHTML = '';
    v.forEach(function (p, i) {
      var o = document.createElement('option'); o.value = i; o.textContent = p.title || ('Golden Post ' + (i + 1)); sel.appendChild(o);
    });
    sel.value = String(refIdx);
    $('refText').textContent = v[refIdx].text || '(empty)';
  }
  function renderVoiceList() {
    var list = $('voiceList'); list.innerHTML = '';
    state.voice.forEach(function (p, i) {
      var item = document.createElement('div'); item.className = 'voice-item';
      var title = document.createElement('input'); title.type = 'text'; title.value = p.title; title.placeholder = 'Label (e.g. "Hiring lesson, 42k impressions")';
      title.setAttribute('aria-label', 'Golden post ' + (i + 1) + ' label');
      var ta = document.createElement('textarea'); ta.value = p.text; ta.placeholder = 'Paste the post here…';
      ta.setAttribute('aria-label', 'Golden post ' + (i + 1) + ' text');
      var row = document.createElement('div'); row.className = 'row';
      var count = document.createElement('span'); count.className = 'muted small-text'; count.textContent = p.text.length + ' characters';
      var del = document.createElement('button'); del.type = 'button'; del.className = 'btn ghost small'; del.textContent = 'Delete';
      title.addEventListener('input', function () { p.title = title.value; save(); renderReference(); });
      ta.addEventListener('input', function () { p.text = ta.value; count.textContent = p.text.length + ' characters'; save(); renderReference(); });
      del.onclick = function () {
        if (p.text.trim() && !confirm('Delete this Golden Post?')) return;
        state.voice.splice(i, 1); save(); renderVoiceList(); renderReference();
      };
      row.appendChild(count); row.appendChild(del);
      item.appendChild(title); item.appendChild(ta); item.appendChild(row); list.appendChild(item);
    });
    var n = state.voice.length;
    $('voiceCount').textContent = n + ' of 5 saved' + (n < 3 ? ' · add at least 3 for a useful reference' : '');
    $('voiceAdd').disabled = n >= 5;
  }

  /* ---------------- Banned-word manager ---------------- */

  function renderBlacklist() {
    $('defaultList').textContent = DEFAULT_BANNED.join(', ');
    var ul = $('customList'); ul.innerHTML = '';
    state.custom.forEach(function (w, i) {
      var li = document.createElement('li');
      var span = document.createElement('span'); span.textContent = w; span.title = 'Click to edit'; span.style.cursor = 'pointer';
      span.onclick = function () {
        var v = prompt('Edit phrase', w);
        if (v !== null && v.trim()) { state.custom[i] = v.trim(); save(); renderBlacklist(); refresh(); }
      };
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Delete ' + w);
      x.onclick = function () { state.custom.splice(i, 1); save(); renderBlacklist(); refresh(); };
      li.appendChild(span); li.appendChild(x); ul.appendChild(li);
    });
  }
  function addWord() {
    var v = $('newWord').value.trim();
    if (!v) return;
    if (allBanned().some(function (w) { return w.toLowerCase() === v.toLowerCase(); })) return toast('Already on the list.');
    state.custom.push(v); $('newWord').value = ''; save(); renderBlacklist(); refresh();
  }

  /* ---------------- Render orchestration ---------------- */

  function refresh() { syncEditor(); renderPreview(); renderSlots(); }
  function renderAll() {
    $('slotTitle').textContent = DAYS[state.active];
    $('editor').value = slot().text;
    $('commentEditor').value = slot().comment;
    renderStatus(); renderMedia(); renderReference();
    refresh();
  }

  /* ---------------- Photo downscale (keeps localStorage small) ---------------- */

  function downscale(file, cb) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var s = 192, c = document.createElement('canvas'); c.width = c.height = s;
      var r = Math.max(s / img.width, s / img.height), w = img.width * r, h = img.height * r;
      c.getContext('2d').drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
      URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(''); };
    img.src = url;
  }

  /* ---------------- Event wiring ---------------- */

  function bind() {
    var ed = $('editor');
    ed.addEventListener('input', function () { slot().text = ed.value; save(); refresh(); });
    ed.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'b' || e.key === 'i')) { e.preventDefault(); format(e.key === 'b' ? 'bold' : 'italic'); }
    });
    $('btnCopy').onclick = copyPost;
    $('btnClear').onclick = function () {
      var s = slot();
      if (s.text.trim() && !confirm('Clear ' + DAYS[state.active] + '? This removes the text, comment and status history.')) return;
      var m = media[state.active]; if (m && m.url) URL.revokeObjectURL(m.url);
      media[state.active] = null; state.slots[state.active] = newSlot(); save(); renderAll();
    };

    function setView(v) {
      view = v; $('card').className = 'card ' + v;
      $('vMobile').classList.toggle('active', v === 'mobile');
      $('vDesktop').classList.toggle('active', v === 'desktop');
      renderPreview();
    }
    $('vMobile').onclick = function () { setView('mobile'); };
    $('vDesktop').onclick = function () { setView('desktop'); };

    document.querySelectorAll('[data-status]').forEach(function (b) {
      b.onclick = function () { setStatus(b.getAttribute('data-status')); };
    });

    // Theme
    $('btnTheme').onclick = function () {
      themeMode = { auto: 'light', light: 'dark', dark: 'auto' }[themeMode];
      try { localStorage.setItem(THEME_KEY, themeMode); } catch (e) {}
      applyTheme();
    };
    if (mql && mql.addEventListener) mql.addEventListener('change', applyTheme);

    // Toolbar
    document.querySelectorAll('[data-fmt]').forEach(function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.onclick = function () { format(b.getAttribute('data-fmt')); };
    });
    document.querySelectorAll('[data-bullet]').forEach(function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.onclick = function () { bullet(b.getAttribute('data-bullet')); };
    });

    // Media
    var drop = $('drop'), file = $('mediaFile');
    drop.onclick = function () { file.click(); };
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
    file.addEventListener('change', function () { setMedia(file.files[0]); file.value = ''; });
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { setMedia(e.dataTransfer && e.dataTransfer.files[0]); });
    document.querySelectorAll('[data-ar]').forEach(function (b) {
      b.onclick = function () { state.aspect = b.getAttribute('data-ar'); save(); renderMedia(); };
    });
    $('mediaRemove').onclick = function () {
      var m = media[state.active]; if (m && m.url) URL.revokeObjectURL(m.url);
      media[state.active] = null; renderMedia();
    };

    // First comment
    $('commentEditor').addEventListener('input', function (e) { slot().comment = e.target.value; save(); });
    $('btnCopyComment').onclick = function () {
      var t = forLinkedIn(slot().comment || '');
      if (!t) return toast('No comment to copy.');
      writeClipboard(t, function () { toast('Comment copied · ' + t.length + ' characters'); });
    };

    // Voice Bank
    $('btnVoice').onclick = function () { renderVoiceList(); $('dlgVoice').showModal(); };
    $('voiceAdd').onclick = function () {
      if (state.voice.length >= 5) return;
      state.voice.push({ id: uid(), title: '', text: '' }); save(); renderVoiceList(); renderReference();
      var tas = $('voiceList').querySelectorAll('textarea'); if (tas.length) tas[tas.length - 1].focus();
    };
    $('refSelect').addEventListener('change', function (e) { refIdx = +e.target.value || 0; renderReference(); });

    // Banned words
    $('btnBlacklist').onclick = function () { renderBlacklist(); $('dlgBlacklist').showModal(); };
    $('addWord').onclick = addWord;
    $('newWord').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addWord(); } });

    // Profile
    $('btnProfile').onclick = function () { $('pfName').value = state.profile.name; $('pfHeadline').value = state.profile.headline; $('dlgProfile').showModal(); };
    $('pfSave').onclick = function () {
      state.profile.name = $('pfName').value.trim() || 'Your Founder';
      state.profile.headline = $('pfHeadline').value.trim();
      var f = $('pfPhoto').files[0];
      if (f) downscale(f, function (url) { if (url) state.profile.photo = url; save(); renderPreview(); });
      else { save(); renderPreview(); }
    };

    // Playbook
    var tab = 'style';
    var HELP = { style: 'House rules for the founder\'s voice. One per line.', pillars: 'Content pillars to rotate through. One per line.', hooks: 'Swipe file of strong opening lines. One per line.' };
    function showTab() {
      document.querySelectorAll('[data-pb]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-pb') === tab); });
      $('pbText').value = state.playbook[tab] || ''; $('pbHelp').textContent = HELP[tab];
      $('pbSaveHook').hidden = tab !== 'hooks';
    }
    $('btnPlaybook').onclick = function () { showTab(); $('dlgPlaybook').showModal(); };
    document.querySelectorAll('[data-pb]').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-pb'); showTab(); }; });
    $('pbText').addEventListener('input', function (e) { state.playbook[tab] = e.target.value; save(); });
    $('pbSaveHook').onclick = function () {
      var first = slot().text.split('\n')[0].trim();
      if (!first) return toast('Write a first line first.');
      state.playbook.hooks = (state.playbook.hooks ? state.playbook.hooks + '\n' : '') + first; save(); showTab(); toast('Hook saved');
    };

    // Export / import
    $('btnExport').onclick = function () {
      var blob = new Blob([JSON.stringify({ app: 'voicematch-studio', version: 2, exportedAt: new Date().toISOString(), data: state }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'voicematch-drafts-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('Exported as JSON');
    };
    $('importFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result), d = j && j.data ? j.data : j;
          if (!d || (!Array.isArray(d.slots) && !Array.isArray(d.drafts))) throw new Error('bad');
          if (!confirm('Replace everything in this browser with the imported file?')) return;
          state = normalize(d); save(); renderAll(); toast('Import complete');
        } catch (err) { toast('Could not read that file.'); }
        e.target.value = '';
      };
      r.readAsText(f);
    });

    // Keep layout-dependent parts right when the window or fonts change
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { autoGrow(); renderPreview(); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { autoGrow(); renderPreview(); });
  }

  applyTheme();
  bind();
  renderAll();
})();
