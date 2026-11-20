/* =========================================================
   Influência Intencional — página de vendas
   1. Intro: o vídeo toca em tela cheia com o scroll travado. Quando acaba, a imagem
      final (4K) assume num fade lento e o conteúdo do hero entra.
      Pular, autoplay bloqueado, erro ou rede lenta: vai direto pra imagem final.
   2. Scroll suave (Lenis) + entradas (GSAP/ScrollTrigger só decidem QUANDO;
      as animações em si são transições CSS de transform/opacity/clip-path → lisas).
      - painéis pretos: abrem de um cartão arredondado até a tela toda (no lugar das pinceladas)
      - "E se perguntam:": a seção fica fixa e as perguntas trocam com o scroll
      - fotos: só revelam depois de decodificadas; parallax numa camada separada
   3. FAQ em acordeão (um aberto por vez).
   ========================================================= */
(function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger && window.SplitText);

  /* ---------- escala do palco de 1440px (só nav e footer usam o palco) ---------- */
  function Z() { return parseFloat(root.style.getPropertyValue('--z')) || 1; }
  function fit() {
    var w = root.clientWidth;
    root.style.setProperty('--z', w >= 1024 ? Math.min(1.2, w / 1440) : 1);
  }
  fit();
  window.addEventListener('resize', fit);

  /* ---------- scroll suave ---------- */
  var lenis = null;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    if (!reduce && window.Lenis) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* links internos (#faq, #o-que-tem-dentro...): rolagem suave */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || root.classList.contains('ii-intro')) return;
    var el = a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    var y = el.getBoundingClientRect().top + window.scrollY - (a.closest('.ii-nav') ? 24 : 40);
    if (lenis) lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* progresso da leitura (no lugar da barra de rolagem) + nav fixa */
  var bar = $('.ii-progress i');
  var hero = $('.ii-hero');
  function progress() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleY(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
  }
  if (lenis) lenis.on('scroll', progress); else window.addEventListener('scroll', progress, { passive: true });
  progress();

  /* nav (mesmo esquema da home): fica no hero, sem animação, e sobe junto com ele.
     Quando a seção seguinte chega ao topo, vira fixa e desce do topo.
     Subindo de volta para o hero, sai pelo topo e volta pro lugar dela. */
  var navFixed = false, navOutTimer = null;
  var band = $('.ii-band');   // "e se perguntam:" — a nav sai de cena enquanto ela ocupa a tela
  function navScroll() {
    if (band) {
      var b = band.getBoundingClientRect();
      root.classList.toggle('ii-nav-away', b.top <= 100 && b.bottom > 100);
    }
    var want = hero.getBoundingClientRect().bottom <= 100;   // seção seguinte perto do topo
    if (want === navFixed) return;
    navFixed = want;
    clearTimeout(navOutTimer);
    if (want) {
      root.classList.remove('ii-nav-out');
      root.classList.add('ii-nav-fixed');
    } else {
      root.classList.add('ii-nav-out');   // sai pelo topo e só então volta pro hero
      navOutTimer = setTimeout(function () { root.classList.remove('ii-nav-fixed', 'ii-nav-out'); }, reduce ? 0 : 400);
    }
  }
  if (lenis) lenis.on('scroll', navScroll); else window.addEventListener('scroll', navScroll, { passive: true });
  window.addEventListener('resize', navScroll);
  navScroll();

  /* =========================================================
     1. INTRO EM VÍDEO
     ========================================================= */
  var video = $('.ii-hero-video');
  var still = $('.ii-hero-still');
  var skip = $('.ii-skip');
  var introDone = !root.classList.contains('ii-intro');
  var fontsReady = false, heroShown = false;
  var slowTimer, maxTimer;

  if (!introDone) {
    window.scrollTo(0, 0);
    if (lenis) lenis.stop();

    var started = false;
    slowTimer = setTimeout(function () { if (!started) finishIntro('slow'); }, 4000);   // não começou a tocar
    maxTimer = setTimeout(function () { finishIntro('timeout'); }, 15000);              // trava de segurança

    video.addEventListener('playing', function () { started = true; });
    video.addEventListener('ended', function () { finishIntro('ended'); });
    video.addEventListener('error', function () { finishIntro('error'); });
    video.addEventListener('ii-blocked', function () { finishIntro('blocked'); });
    if (video.dataset.blocked) finishIntro('blocked');
    skip.addEventListener('click', function () { finishIntro('skip'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') finishIntro('skip'); });

    // aba em segundo plano: o navegador pausa o vídeo; ao voltar, continua
    document.addEventListener('visibilitychange', function () {
      if (!introDone && !document.hidden && video.paused && !video.ended) {
        var p = video.play(); if (p && p.catch) p.catch(function () { finishIntro('blocked'); });
      }
    });
  }

  function finishIntro(kind) {
    if (introDone) return;
    introDone = true;
    clearTimeout(slowTimer);
    clearTimeout(maxTimer);
    if (kind !== 'ended') video.pause();
    // o vídeo fica parado no último frame; a imagem final (mais nítida) entra por cima num fade
    // só depois de decodificada, pra não piscar
    root.classList.add('ii-keep-video');
    var show = function () { root.classList.add('ii-show-still'); };
    if (still.decode) still.decode().then(show, show); else show();
    if (skip === document.activeElement) skip.blur();
    root.classList.remove('ii-intro');
    root.classList.add('ii-done');
    if (lenis) lenis.start();
    if (hasGsap) ScrollTrigger.refresh();
    showHero();
  }

  document.fonts.ready.then(function () { fontsReady = true; showHero(); init(); });

  /* entrada do conteúdo do hero */
  function showHero() {
    if (!introDone || !fontsReady || heroShown) return;
    heroShown = true;
    if (!hasGsap || reduce) {
      $$('.ii-nav, .ii-hero-copy').forEach(function (el) { el.style.visibility = 'visible'; });
      return;
    }
    // sem máscara no título: a entrelinha é fechada e a máscara cortaria os acentos (JÁ, OPINIÃO, VOCÊ)
    var title = SplitText.create('.ii-hero-title', { type: 'lines' });
    var text = SplitText.create('.ii-hero-text', { type: 'lines', mask: 'lines' });
    gsap.set('.ii-hero-copy', { autoAlpha: 1 });
    gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
      .fromTo('.ii-nav', { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0)
      .from(title.lines, { y: 60, autoAlpha: 0, duration: 1.4, stagger: 0.08 }, 0.1)
      .from(text.lines, { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.5)
      .from('.ii-hero-ctas > *', { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08, clearProps: 'transform' }, 0.7);
  }

  /* =========================================================
     2. ENTRADAS NO SCROLL
     ========================================================= */
  function init() {
    faq();
    if (!hasGsap) return;
    if (reduce) { buybar(); return; }
    root.classList.add('ii-anim');   // estados iniciais (ebook.css)

    panels();    // painéis pretos abrindo
    insidePanel();
    asks();      // o pin muda a altura da página; os gatilhos abaixo dele são calculados depois
    heroScroll();
    fillTitles();
    scripts();
    reveals();
    photos();
    parallax();
    marks();
    forList();
    numbers();
    cards();
    buybar();
    navActive();

    // "O que tem / dentro" e "Perguntas frequentes" (versão anterior): linhas subindo
    gsap.from('.ii-inside-title > span', { y: 40, autoAlpha: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '.ii-inside-title', start: 'top 85%' } });
    var fq = SplitText.create('.ii-faq-title', { type: 'lines' });
    gsap.from(fq.lines, { y: 40, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: '.ii-faq-title', start: 'top 85%' } });

    // livro do "O que tem dentro": entra deslizando (na camada .ii-book-mv, sem repintar a sombra), a mancha cresce
    gsap.from('.ii-book-mv', { x: -120, autoAlpha: 0, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: '.ii-inside', start: 'top 70%' } });
    gsap.from('.ii-splash img', { scale: 0.85, autoAlpha: 0, duration: 1.4, ease: 'power3.out',
      scrollTrigger: { trigger: '.ii-inside', start: 'top 70%' } });

    ScrollTrigger.refresh();
    progress();
  }

  /* liga a classe .is-in quando o elemento entra na tela (a animação é a transição CSS) */
  function onEnter(el, start, fn) {
    ScrollTrigger.create({ trigger: el, start: start || 'top 88%', once: true, onEnter: fn || function () { el.classList.add('is-in'); } });
  }

  /* blocos [data-r], réguas dos cabeçalhos, cards, livro: entram em sequência quando chegam juntos */
  function reveals() {
    ScrollTrigger.batch('[data-r]', {
      start: 'top 90%',
      once: true,
      onEnter: function (els) {
        els.forEach(function (el, i) { el.style.setProperty('--d', (i * 0.08) + 's'); el.classList.add('is-in'); });
      }
    });
  }

  /* painéis pretos: cartão arredondado com margem → tela toda, acompanhando o scroll */
  function panels() {
    $$('.ii-panel').forEach(function (p) {
      gsap.fromTo(p,
        { clipPath: 'inset(0% 4% 0% 4% round 40px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
          scrollTrigger: { trigger: p, start: 'top 95%', end: 'top 20%', scrub: 0.6 } });
    });
  }

  /* ---------- "E se perguntam:" — perguntas trocando com o scroll ---------- */
  function asks() {
    var lines = $$('.ii-ask-l');
    var answer = $('.ii-band-t2');
    var num = $('.ii-ask-n'), meta = $('.ii-ask-meta');
    gsap.set(lines, { visibility: 'visible' });
    gsap.set(lines.slice(1), { autoAlpha: 0, yPercent: 40 });
    gsap.set(answer, { autoAlpha: 0, y: 24 });

    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '.ii-band',
        start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * 2.6); },
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true
      },
      onUpdate: function () {
        var k = 0, best = -1;
        lines.forEach(function (l, j) { var o = +gsap.getProperty(l, 'opacity'); if (o > best + 0.01) { best = o; k = j; } });
        num.textContent = '0' + (k + 1);
        answer.classList.toggle('is-marked', tl.progress() > 0.93);
      }
    });
    tl.to({}, { duration: 0.35 });
    for (var i = 1; i < lines.length; i++) {
      tl.to(lines[i - 1], { autoAlpha: 0, yPercent: -40, filter: 'blur(6px)', duration: 0.5 })
        .fromTo(lines[i], { filter: 'blur(6px)' }, { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.5 }, '<0.2');
      if (i < lines.length - 1) tl.to({}, { duration: 0.6 });
    }
    var last = tl.duration();
    tl.to(answer, { autoAlpha: 1, y: 0, duration: 0.5 }, '<0.3')
      .to(meta, { autoAlpha: 0, y: -10, duration: 0.35 }, '<')
      .to({}, { duration: 0.45 });
    tl.fromTo('.ii-ask-bar > i', { scaleX: 0.25 }, { scaleX: 1, ease: 'none', duration: last }, 0)
      .fromTo('.ii-ask-glyph', { scale: 0.7 }, { scale: 1.35, ease: 'none', duration: tl.duration() }, 0);   // zoom contínuo
  }

  /* ---------- hero: ao rolar, a imagem aproxima e escurece; o texto sobe e some ---------- */
  function heroScroll() {
    var st = function () { return { trigger: '.ii-hero', start: 'top top', end: 'bottom top', scrub: true }; };
    gsap.to('.ii-hero-media', { scale: 1.1, opacity: 0.35, ease: 'none', scrollTrigger: st() });
    gsap.to('.ii-hero-inner', { y: -120, opacity: 0, ease: 'none', scrollTrigger: st() });
  }

  /* ---------- títulos grandes: as palavras acendem no ritmo do scroll ---------- */
  function fillTitles() {
    $$('.ii-fill').forEach(function (el) {
      var sp = SplitText.create(el, { type: 'words' });
      // as palavras em script (anotação) ficam de fora: elas "se escrevem" sozinhas (scripts())
      var words = sp.words.filter(function (w) { return !w.closest('.ii-script'); });
      gsap.fromTo(words, { opacity: 0.12 }, { opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 60%', scrub: 0.6 } });
    });
  }

  /* ---------- palavras em script: se escrevem da esquerda pra direita ---------- */
  function scripts() {
    $$('.ii-script').forEach(function (el) {
      if (el.closest('.ii-note-n')) return;
      el.classList.add('ii-sx');
      onEnter(el, 'top 82%');
    });
  }

  /* ---------- fotos: revelam só depois de decodificadas (era isso que fazia elas "pularem") ---------- */
  function photos() {
    $$('.ii-photo').forEach(function (f) {
      var img = $('img', f);
      var media = f.closest('.ii-author-media');
      var go = function () {
        var show = function () { requestAnimationFrame(function () { f.classList.add('is-in'); if (media) media.classList.add('is-in'); }); };
        if (img.complete && img.naturalWidth) show();
        else if (img.decode) img.decode().then(show, show);
        else img.addEventListener('load', show, { once: true });
      };
      onEnter(f, 'top 85%', go);
    });
  }

  /* ---------- parallax: só na camada .ii-px (a <img> dentro dela cuida do zoom de entrada) ---------- */
  function parallax() {
    $$('.ii-px').forEach(function (px) {
      gsap.fromTo(px, { yPercent: -5 }, { yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: px.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.ii-crown', { rotate: -10 }, { rotate: 18, ease: 'none',
      scrollTrigger: { trigger: '.ii-for', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- marca-texto vermelho se desenha sob os negritos ---------- */
  function marks() {
    $$('.ii-mark').forEach(function (el) {
      onEnter(el, 'top 72%', function () { setTimeout(function () { el.classList.add('is-marked'); }, 400); });
    });
  }

  /* ---------- checklist: cada linha acende ao passar pelo meio da tela ---------- */
  function forList() {
    $$('.ii-for-list li').forEach(function (li) {
      ScrollTrigger.create({ trigger: li, start: 'center 66%',
        onEnter: function () { li.classList.add('is-on'); },
        onLeaveBack: function () { li.classList.remove('is-on'); } });
    });
  }

  /* ---------- números contando (124 páginas, 14 capítulos, 30 dias) ---------- */
  function numbers() {
    $$('.ii-num').forEach(function (el) {
      var end = parseInt(el.textContent, 10), o = { v: 0 };
      el.style.minWidth = String(end).length * 0.62 + 'em';
      el.textContent = '0';
      gsap.to(o, { v: end, duration: 1.8, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = Math.round(o.v); } });
    });
  }

  /* ---------- nav: destaca a seção que está no meio da tela ---------- */
  function navActive() {
    $$('.ii-nav .nav-links a[href^="#"]').forEach(function (a) {
      var sec = $(a.getAttribute('href'));
      if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: function (self) {
          a.classList.toggle('is-active', self.isActive);
          // celular: a lista de links rola de lado até mostrar o link ativo
          var list = a.closest('.nav-links');
          if (self.isActive && list.scrollWidth > list.clientWidth) list.scrollTo({ left: (function (li) { var r = li.getBoundingClientRect(), lr = list.getBoundingClientRect(); return list.scrollLeft + r.left - lr.left - (list.clientWidth - r.width) / 2; })(a.parentNode), behavior: 'smooth' });   // centraliza o link ativo
        } });
    });
  }

  /* ---------- antes × depois (versão anterior): entram dos lados opostos ---------- */
  function cards() {
    var st = function () { return { trigger: '.ii-card', start: 'top 85%' }; };
    gsap.from('.ii-card-before', { x: -160, autoAlpha: 0, duration: 1.2, ease: 'power3.out', clearProps: 'transform', scrollTrigger: st() });
    gsap.from('.ii-card-after', { x: 160, autoAlpha: 0, duration: 1.2, delay: 0.12, ease: 'power3.out', clearProps: 'transform', scrollTrigger: st() });
    gsap.from('.ii-card-list li', { x: -16, autoAlpha: 0, duration: 0.6, stagger: 0.06, delay: 0.5, ease: 'power2.out', scrollTrigger: st() });
  }

  /* ---------- "O que tem dentro" (versão anterior): o painel sobe por cima da faixa preta ---------- */
  function insidePanel() {
    var mob = function () { return window.matchMedia('(max-width: 1023.98px)').matches; };
    var st = function () {
      return { trigger: '.ii-inside', start: 'top bottom', end: 'top 20%', scrub: true, invalidateOnRefresh: true };
    };
    gsap.fromTo('.ii-inside-bg', { y: function () { return mob() ? 120 : 300 * Z(); } }, { y: 0, ease: 'none', scrollTrigger: st() });
    // o palco tem zoom: o deslocamento dele já é multiplicado pelo --z
    gsap.fromTo('.ii-inside > .stage', { y: function () { return mob() ? 140 : 340; } }, { y: 0, ease: 'none', scrollTrigger: st() });
  }

  /* ---------- barra de compra: depois do hero, some perto do CTA final e do footer ---------- */
  function buybar() {
    var b = $('.ii-buybar'), past = false, nearEnd = false;
    var upd = function () { b.classList.toggle('is-on', past && !nearEnd && introDone); };
    ScrollTrigger.create({ trigger: '.ii-hero', start: 'bottom 25%',
      onEnter: function () { past = true; upd(); }, onLeaveBack: function () { past = false; upd(); } });
    // fim bem depois do fim da página: no último pixel de rolagem ela não pode voltar a aparecer
    ScrollTrigger.create({ trigger: '.ii-final', start: 'top 85%', end: '+=100000',
      onToggle: function (self) { nearEnd = self.isActive; upd(); } });
  }

  /* =========================================================
     3. FAQ — acordeão
     ========================================================= */
  function faq() {
    var items = $$('.ii-q');
    items.forEach(function (item) {
      var btn = $('.ii-q-btn', item);
      btn.addEventListener('click', function () {
        var open = !item.classList.contains('is-open');
        items.forEach(function (other) {
          if (other !== item && other.classList.contains('is-open')) {
            other.classList.remove('is-open');
            $('.ii-q-btn', other).setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 600);
      });
    });
  }
})();
