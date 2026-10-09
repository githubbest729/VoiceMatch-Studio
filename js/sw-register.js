(function () {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('js/sw.js', { scope: './' }).then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            var bar = document.getElementById('updateBar');
            if (bar) {
              bar.hidden = false;
              document.getElementById('btnReload').onclick = function () { nw.postMessage('SKIP_WAITING'); location.reload(); };
            }
          }
        });
      });
    }).catch(function () {});
  });
})();
