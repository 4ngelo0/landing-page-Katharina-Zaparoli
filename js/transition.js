/* =========================================================
   Transição entre páginas: ao clicar num link para outra página do site,
   a cortina vermelha sobe; a página nova abre coberta e revela.
   (a classe .pt-in é posta no <head> de cada página, antes do 1º paint)
   ========================================================= */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KEY = 'kz-pt';

  // a fonte script do nome: só mostra o nome na cortina quando ela já carregou
  function fontReady(cb) {
    if (!document.fonts || !document.fonts.load) return cb();
    var done = false, go = function () { if (!done) { done = true; cb(); } };
    document.fonts.load('40px "Christmas Bella"').then(go, go);
    setTimeout(go, 600);
  }
  fontReady(function () { root.classList.add('pt-font'); });

  // chegou por uma transição: revela
  if (root.classList.contains('pt-in')) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('pt-reveal');
        setTimeout(function () { root.classList.remove('pt-in', 'pt-reveal'); }, 1200);
      });
    });
  }

  // voltar/avançar do navegador (página restaurada do cache): tira a cortina
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) root.classList.remove('pt-leave', 'pt-in', 'pt-reveal');
  });

  document.addEventListener('click', function (e) {
    if (reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.protocol !== location.protocol) return;                       // mailto:, tel:...
    if (location.protocol !== 'file:' && url.origin !== location.origin) return;  // outro site
    if (url.pathname === location.pathname) return;                       // mesma página (âncora)
    e.preventDefault();
    try { sessionStorage.setItem(KEY, '1'); } catch (err) {}
    root.classList.add('pt-leave');
    setTimeout(function () { location.href = url.href; }, 850);
  });
})();
