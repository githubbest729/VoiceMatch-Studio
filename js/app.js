(function () {
  'use strict';

  var KEY = 'voicematch.v1';
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var DEFAULT_BANNED = ['delve', 'testament', 'tapestry', 'spearhead', 'supercharge', 'game-changer',
    'game changer', 'thrilled to announce', 'excited to share', 'beacon', 'leverage', 'synergy',
    'cutting-edge', 'cutting edge', 'unlock', 'landscape', 'navigate the', 'in today\'s fast-paced',
    'revolutionize', 'paradigm', 'elevate', 'seamless', 'robust', 'holistic', 'unleash'];
  // Approximate characters per rendered line at LinkedIn's font sizes.
  var VIEW = { mobile: { lines: 3, cpl: 44 }, desktop: { lines: 5, cpl: 72 } };

  var $ = function (id) { return document.getElementById(id); };
  var state = load();
  var view = 'mobile';

  function blank() {
    return { drafts: ['', '', '', '', ''], active: 0, custom: [], profile: { name: 'Your Founder', headline: 'Founder & CEO', photo: '' } };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); var b = blank(); for (var k in b) if (!(k in s)) s[k] = b[k]; return s; }
    } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

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
      res += esc(text.slice(last, start)) + '<mark class="bad">' + esc(m[2]) + '</mark>';
      last = start + m[2].length;
    }
    return res + esc(text.slice(last));
  }

  // Find the character index where LinkedIn would cut the post, by simulating line wrapping.
  function cutIndex(text, cfg) {
    var lines = 0, i = 0, parts = text.split('\n');
    for (var p = 0; p < parts.length; p++) {
      var line = parts[p];
      var rows = Math.max(1, Math.ceil(line.length / cfg.cpl));
      if (lines + rows > cfg.lines) {
        var rowsLeft = cfg.lines - lines;
        if (rowsLeft <= 0) return i;
        var end = Math.min(line.length, rowsLeft * cfg.cpl);
        var sp = line.lastIndexOf(' ', end);
        return i + (sp > 0 && end < line.length ? sp : end);
      }
      lines += rows; i += line.length + 1;
      if (lines >= cfg.lines && p < parts.length - 1) return i;
    }
    return -1;
  }

  function render() {
    var text = state.drafts[state.active] || '';
    var cfg = VIEW[view];
    $('editor').value = text;
    $('slotTitle').textContent = DAYS[state.active];

    var words = (text.trim().match(/\S+/g) || []).length;
    $('statChars').textContent = text.length;
    $('statWords').textContent = words;
    $('statRead').textContent = Math.max(words ? 1 : 0, Math.round(words / 238 * 60));

    var flags = findFlags(text), uniq = flags.filter(function (f, i) { return flags.indexOf(f) === i; });
    var fl = $('statFlags');
    fl.textContent = flags.length + ' flagged';
    fl.className = 'flags ' + (flags.length ? 'bad' : 'ok');
    $('flagList').innerHTML = uniq.map(function (f) { return '<span class="flag-chip">' + esc(f) + '</span>'; }).join('');

    $('pvName').textContent = state.profile.name;
    $('pvHeadline').textContent = state.profile.headline;
    var av = $('pvAvatar');
    av.src = state.profile.photo || 'icons/icon-48x48.png';

    var body = $('pvBody'), note = $('hookNote');
    if (!text.trim()) {
      body.innerHTML = '<span class="muted">Your post preview appears here.</span>';
      note.hidden = true;
    } else {
      var cut = cutIndex(text, cfg);
      if (cut < 0 || cut >= text.length) {
        body.innerHTML = '<span class="hook">' + highlight(text) + '</span>';
        note.hidden = false;
        note.textContent = 'Fits entirely above the fold. No "see more" needed.';
      } else {
        var visible = text.slice(0, cut).replace(/\s+$/, ''), rest = text.slice(cut);
        body.innerHTML = '<span class="hook">' + highlight(visible) + '</span>' +
          '<span class="see-more">…see more</span><span class="rest">' + highlight(rest) + '</span>';
        note.hidden = false;
        note.textContent = 'Hook zone: ' + visible.length + ' chars visible before "see more" (' + cfg.lines + ' lines, ' + view + ').';
      }
    }

    var slots = $('slots');
    slots.innerHTML = '';
    DAYS.forEach(function (d, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot' + (i === state.active ? ' active' : '') + (state.drafts[i] ? ' filled' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === state.active);
      b.innerHTML = '<b>' + d.slice(0, 3) + '</b><span>' + (esc((state.drafts[i] || '').split('\n')[0]) || 'Empty') + '</span>';
      b.onclick = function () { state.active = i; save(); render(); };
      slots.appendChild(b);
    });
  }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  // Normalise text so line breaks survive a paste into LinkedIn's composer.
  function forLinkedIn(text) {
    return text.replace(/\r\n?/g, '\n').replace(/[   ]/g, ' ')
      .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function copy() {
    var out = forLinkedIn(state.drafts[state.active] || '');
    if (!out) return toast('Nothing to copy yet.');
    var done = function () { toast('Copied · ' + out.length + ' characters, ' + (out.match(/\S+/g) || []).length + ' words'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = out; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Select the text manually.'); }
      document.body.removeChild(ta);
    }
  }

  function renderBlacklist() {
    $('defaultList').textContent = DEFAULT_BANNED.join(', ');
    var ul = $('customList'); ul.innerHTML = '';
    state.custom.forEach(function (w, i) {
      var li = document.createElement('li');
      var span = document.createElement('span'); span.textContent = w; span.title = 'Click to edit'; span.style.cursor = 'pointer';
      span.onclick = function () {
        var v = prompt('Edit phrase', w);
        if (v !== null && v.trim()) { state.custom[i] = v.trim(); save(); renderBlacklist(); render(); }
      };
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Delete ' + w);
      x.onclick = function () { state.custom.splice(i, 1); save(); renderBlacklist(); render(); };
      li.appendChild(span); li.appendChild(x); ul.appendChild(li);
    });
  }
  function addWord() {
    var v = $('newWord').value.trim();
    if (!v) return;
    if (state.custom.concat(DEFAULT_BANNED).some(function (w) { return w.toLowerCase() === v.toLowerCase(); })) { toast('Already on the list.'); return; }
    state.custom.push(v); $('newWord').value = ''; save(); renderBlacklist(); render();
  }

  function bind() {
    $('editor').addEventListener('input', function (e) { state.drafts[state.active] = e.target.value; save(); render2(); });
    function render2() { var pos = $('editor').selectionStart; render(); $('editor').setSelectionRange(pos, pos); }
    $('btnCopy').onclick = copy;
    $('btnClear').onclick = function () { if (!state.drafts[state.active] || confirm('Clear this slot?')) { state.drafts[state.active] = ''; save(); render(); } };
    function setView(v) {
      view = v;
      $('card').className = 'card ' + v;
      $('vMobile').classList.toggle('active', v === 'mobile');
      $('vDesktop').classList.toggle('active', v === 'desktop');
      render();
    }
    $('vMobile').onclick = function () { setView('mobile'); };
    $('vDesktop').onclick = function () { setView('desktop'); };

    $('btnBlacklist').onclick = function () { renderBlacklist(); $('dlgBlacklist').showModal(); };
    $('addWord').onclick = addWord;
    $('newWord').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addWord(); } });

    $('btnProfile').onclick = function () { $('pfName').value = state.profile.name; $('pfHeadline').value = state.profile.headline; $('dlgProfile').showModal(); };
    $('pfSave').onclick = function () {
      state.profile.name = $('pfName').value.trim() || 'Your Founder';
      state.profile.headline = $('pfHeadline').value.trim();
      var f = $('pfPhoto').files[0];
      if (f) {
        var r = new FileReader();
        r.onload = function () { state.profile.photo = r.result; save(); render(); };
        r.readAsDataURL(f);
      } else { save(); render(); }
    };

    $('btnExport').onclick = function () {
      var blob = new Blob([JSON.stringify({ app: 'voicematch-studio', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'voicematch-drafts-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('Exported drafts as JSON');
    };
    $('importFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result), d = j.data || j;
          if (!Array.isArray(d.drafts)) throw new Error('bad');
          var b = blank();
          state = { drafts: d.drafts.slice(0, 5).concat(['', '', '', '', '']).slice(0, 5).map(String), active: 0,
            custom: Array.isArray(d.custom) ? d.custom.map(String) : [], profile: Object.assign(b.profile, d.profile || {}) };
          save(); render(); toast('Import complete');
        } catch (err) { toast('Could not read that file.'); }
        e.target.value = '';
      };
      r.readAsText(f);
    });
  }

  bind();
  render();
})();
