/* =========================================================
   Menu hambúrguer da nav (celular e tablet em pé, < 1024px).
   Abre/fecha pelo botão; fecha ao tocar num link, fora da nav ou no Esc.
   ========================================================= */
(function () {
  var nav = document.querySelector('.nav');
  var btn = nav && nav.querySelector('.nav-toggle');
  if (!btn) return;
  var desk = window.matchMedia('(min-width: 1024px)');

  function set(open) {
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  btn.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });

  // tocou num link do menu: fecha (a rolagem/transição segue normalmente)
  nav.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) set(false);
  });

  // tocou fora da nav
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !nav.contains(e.target)) set(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); }
  });

  // virou desktop (girou o tablet, redimensionou a janela)
  var onDesk = function () { if (desk.matches) set(false); };
  if (desk.addEventListener) desk.addEventListener('change', onDesk); else desk.addListener(onDesk);
})();
