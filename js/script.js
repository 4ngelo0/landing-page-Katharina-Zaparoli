/* =========================================================
   Katharina Zaparoli — animações
   GSAP + ScrollTrigger + SplitText, scroll suave com Lenis
   ========================================================= */
(function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- escala do palco de 1440px ---------- */
  var Z = 1, FIT = 1;
  function fitVars() {
    var w = root.clientWidth, h = window.innerHeight;
    var desktop = w >= 1024;
    Z = desktop ? Math.min(1, w / 1440) : 1;
    FIT = desktop ? Math.min(1, (h - 60) / (760 * Z)) : 1;
    root.style.setProperty('--z', Z);
    root.style.setProperty('--fit', FIT);
    root.style.setProperty('--m', w / 1440);
    root.style.setProperty('--mz', desktop ? 1 : w / 390);   // celular: escala do frame mobile (390px)
    zapLayout();
  }

  /* KATHARINA / ZAPAROLI: cada palavra ocupa exatamente a largura da tela */
  function zapLayout() {
    var sec = $('.zaparoli');
    if (!sec) return;
    var W = root.clientWidth, mob = W < 1024;
    var size = function (el) {
      el.style.fontSize = '100px';
      var w = el.getBoundingClientRect().width;
      el.style.fontSize = '';
      return 100 * W / (w + 3);           // +3 = espaçamento negativo (-0.03em) da última letra
    };
    var f1, f2, stripH, s, b;
    if (mob) {
      // frame mobile do Figma (390px): palavras um pouco maiores que a tela, faixa bem mais alta
      var k = W / 390;
      f1 = 83.646 * k; f2 = 92.916 * k;
      stripH = 213.071 * k;
      s = 61.14 * k;                      // faixa cobre a parte de baixo da 1ª palavra
      b = 239.48 * k;                     // e a parte de cima da 2ª
    } else {
      f1 = size($('.zap-top')); f2 = size($('.zap-bottom'));
      stripH = W * 379.419 / 1440;        // proporção da faixa no Figma
      s = 0.412 * f1;                     // faixa cobre a parte de baixo da 1ª palavra (como no Figma)
      b = s + stripH - 0.597 * f2;        // e a parte de cima da 2ª
    }
    sec.style.setProperty('--zap-f1', f1 + 'px');
    sec.style.setProperty('--zap-f2', f2 + 'px');
    sec.style.setProperty('--zap-s', s + 'px');
    sec.style.setProperty('--zap-sh', stripH + 'px');
    sec.style.setProperty('--zap-b', b + 'px');
    var h = b + 1.022 * f2 + 0.45 * f2;
    sec.style.setProperty('--zap-h', h + 'px');
    // a seção seguinte começa (foto) exatamente no pé da faixa, como no Figma
    root.style.setProperty('--zap-over', (h - s - stripH) + 'px');
  }
  fitVars();

  /* ---------- carregamento adiado (fora do caminho crítico) ----------
     Fotos da cena "Quem é a Kath" e o fundo dos números baixam depois que a página
     carrega, ou antes se a pessoa chegar perto — o que vier primeiro. */
  (function deferLoad() {
    var done = false;
    function loadAll() {
      if (done) return;
      done = true;
      $$('img[data-src]').forEach(function (img) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); });
      var st = $('.stats');
      if (st) st.classList.add('bg-on');
    }
    if (document.readyState === 'complete') setTimeout(loadAll, 0);
    else window.addEventListener('load', function () { setTimeout(loadAll, 0); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { loadAll(); io.disconnect(); }
      }, { rootMargin: '150% 0px' });
      $$('.stats, .story').forEach(function (el) { io.observe(el); });
    }
  })();

  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    root.classList.remove('js');
    window.addEventListener('resize', fitVars);
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll suave ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });   /* mesmo ritmo da página do ebook */
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  ScrollTrigger.addEventListener('refreshInit', fitVars);

  /* progresso da rolagem (no lugar da barra de rolagem) */
  var progBar = $('.scroll-progress i');
  function progress() {
    if (!progBar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progBar.style.transform = 'scaleY(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
  }
  if (lenis) lenis.on('scroll', progress); else window.addEventListener('scroll', progress, { passive: true });
  ScrollTrigger.addEventListener('refresh', progress);
  window.addEventListener('resize', progress);
  progress();

  /* ---------- nav ----------
     Fica no hero e sobe junto na primeira rolagem; só vira fixa (descendo do topo)
     quando a seção dos cards chega ao topo da tela. Subindo acima dela, sai pelo topo. */
  var navEl = $('.nav-stage .nav'), chooseEl = $('.choose');
  var navFixed = false, outTimer = null;
  function navScroll() {
    if (!navEl || !chooseEl) return;
    var want = chooseEl.getBoundingClientRect().top <= 100;   // quando a seção chega perto do topo
    if (want === navFixed) return;
    navFixed = want;
    clearTimeout(outTimer);
    if (want) {
      root.classList.remove('nav-out');
      root.classList.add('nav-fixed');
    } else {
      root.classList.add('nav-out');   // sai pelo topo e só então volta pro lugar dela no hero
      outTimer = setTimeout(function () { root.classList.remove('nav-fixed', 'nav-out'); }, reduce ? 0 : 400);
    }
  }
  if (lenis) lenis.on('scroll', navScroll); else window.addEventListener('scroll', navScroll, { passive: true });
  ScrollTrigger.addEventListener('refresh', navScroll);
  navScroll();

  /* destaca na nav a seção que está no meio da tela (depois das cenas fixadas, que mudam a altura da página).
     Os cards de Palestras/Ebook/Camisetas/KAZE ficam lado a lado: quando mais de um está no meio da tela,
     vale o que tem o centro mais perto do centro da tela — só um link aceso por vez. */
  function navActive() {
    var items = [], current = null;
    function pick() {
      var mid = window.innerHeight / 2, best = null, bestD = Infinity;
      items.forEach(function (it) {
        if (!it.st.isActive) return;
        var r = it.sec.getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestD) { bestD = d; best = it; }
      });
      if (best === current) return;
      if (current) current.a.classList.remove('is-active');
      current = best;
      if (!best) return;
      best.a.classList.add('is-active');
      var list = best.a.closest('.nav-links');
      if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: (function (li) { var r = li.getBoundingClientRect(), lr = list.getBoundingClientRect(); return list.scrollLeft + r.left - lr.left - (list.clientWidth - r.width) / 2; })(best.a.parentNode), behavior: 'smooth' });   // centraliza o link ativo
    }
    $$('.nav-stage .nav-links a[href^="#"]').forEach(function (a) {
      var sec = document.querySelector(a.getAttribute('href'));
      if (!sec) return;
      var st = ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: pick, onUpdate: pick });
      items.push({ a: a, sec: sec, st: st });
    });
  }

  /* links internos (nav): rolagem suave até a seção, deixando um respiro no topo.
     #quem-e-a-kath tem tratamento próprio (vai direto ao fim da cena fixada). */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id === '#quem-e-a-kath' || id === '#topo') return;
    var y = hashY(id);
    if (y == null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  });

  // posição de destino de uma âncora (#palestras, #quem-e-a-kath...)
  var aboutEnd = null;   // definido pela cena do "Quem é a Kath?" no desktop
  function hashY(id) {
    if (id === '#quem-e-a-kath' && aboutEnd) return aboutEnd();
    var el = id && id.length > 1 && document.querySelector(id);
    if (!el) return null;
    // desconta o deslocamento da animação de entrada (o card ainda pode estar 70px abaixo)
    return el.getBoundingClientRect().top - (gsap.getProperty(el, 'y') || 0) * Z + window.scrollY - 120;
  }

  // chegou de outra página com âncora (ex.: index.html#palestras): o navegador pula
  // antes das cenas fixadas existirem, então reposiciona depois de montar tudo
  if (location.hash && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
  function arriveAtHash() {
    if (!location.hash) return;
    var jump = function () {
      var y = hashY(location.hash);
      if (y == null) return;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      window.scrollTo(0, y);
    };
    jump();
    // as entradas disparadas pelo pulo mexem um pouco no layout: confere de novo
    setTimeout(function () { ScrollTrigger.refresh(); jump(); }, 450);
    setTimeout(jump, 1400);
  }

  // a foto do hero anima sozinha em CSS (liberada no <head>); aqui só esperamos as fontes
  document.fonts.ready.then(init);

  // devolve o controle ao navegador entre um passo e outro (scheduler.yield quando existe)
  function nextTask() {
    if (window.scheduler && scheduler.yield) return scheduler.yield();
    return new Promise(function (r) { setTimeout(r, 0); });
  }

  function init() {
    zapLayout();
    if (reduce) {
      gsap.set('.nav, .hero-title, .hero-text, .hero-ctas, .hero-kanji', { autoAlpha: 1 });
      $('.hero').classList.add('is-in');
    } else {
      heroIntro();   // 1º: o que está na tela
    }
    // o resto da página é montado em tarefas curtas, na ordem da página
    var steps = [
      stats,
      function () {
        var mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', storyDesktop);
        mm.add('(max-width: 1023.98px)', storyMobile);
      },
      choose,
      zaparoli,
      provoke,
      heroScroll,
      navActive,
      function () { ScrollTrigger.refresh(); },
      arriveAtHash
    ];
    steps.reduce(function (p, fn) { return p.then(nextTask).then(fn); }, Promise.resolve());
  }

  /* =========================================================
     HERO — foto e kanji animam em CSS (styles.css); aqui entra o texto
     ========================================================= */
  function heroIntro() {
    var hero = $('.hero');
    // quando o zoom da foto termina, desliga as animações CSS (libera as camadas da GPU)
    $('.hp-img').addEventListener('animationend', function () { hero.classList.add('is-in'); }, { once: true });

    var title = SplitText.create('.hero-title > span', { type: 'lines', mask: 'lines' });
    var text = justifiedLines('.hero-text')[0];

    gsap.set('.hero-title, .hero-text', { autoAlpha: 1 });

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 });
    tl
      .fromTo('.nav', { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.1)
      .from(title.lines, { yPercent: 110, duration: 0.85, stagger: 0.06 }, 0.2)
      .from(text.lines, { yPercent: 110, duration: 0.7, stagger: 0.04 }, 0.55)
      .fromTo('.hero-ctas', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.7)
      .from('.hero-ctas .btn', { y: 24, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.7);
  }

  /* =========================================================
     NÚMEROS — seção única, texto troca com o scroll
     ========================================================= */
  function stats() {
    var texts = $$('.stat-text');
    var splits = texts.map(function (t) {
      // linhas = controladas pelo scroll; palavras = só a entrada (elementos diferentes, sem conflito)
      return SplitText.create(t.querySelectorAll('p'), { type: 'lines,words', mask: 'lines' });
    });
    gsap.set(texts, { autoAlpha: 1 });
    gsap.set(splits[1].lines.concat(splits[2].lines), { yPercent: 110 });

    if (reduce) return;

    // entrada do primeiro número — anima as PALAVRAS (as linhas ficam só com o scroll)
    gsap.timeline({ scrollTrigger: { trigger: '.stats', start: 'top 65%', toggleActions: 'play none none reverse' } })
      .fromTo('.stat-kanji, .stat-kanji-m', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'power3.out' }, 0)
      .from(splits[0].words, { yPercent: 110, duration: 1, stagger: 0.04, ease: 'power3.out' }, 0.15);

    var tl = gsap.timeline({
      defaults: { duration: 0.5 },
      scrollTrigger: {
        trigger: '.stats',
        start: 'top top',
        end: function () { return '+=' + window.innerHeight * 2.4; },
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true
      }
    });
    // kanji parado (sem rotação), com um mini zoom a cada troca
    tl.to({}, { duration: 0.35 })
      .addLabel('s1')
      .to(splits[0].lines, { yPercent: -110, stagger: 0.06, ease: 'power2.in' }, 's1')
      .to(splits[1].lines, { yPercent: 0, stagger: 0.06, ease: 'power2.out' }, 's1+=0.35')
      .to('.stat-kanji, .stat-kanji-m', { scale: 1.06, duration: 0.7, ease: 'power2.out' }, 's1+=0.2')
      .to({}, { duration: 0.6 })
      .addLabel('s2')
      .to(splits[1].lines, { yPercent: -110, stagger: 0.06, ease: 'power2.in' }, 's2')
      .to(splits[2].lines, { yPercent: 0, stagger: 0.06, ease: 'power2.out' }, 's2+=0.35')
      .to('.stat-kanji, .stat-kanji-m', { scale: 1.12, duration: 0.7, ease: 'power2.out' }, 's2+=0.2')
      .to({}, { duration: 0.45 });

    tl.fromTo('.stat-bg', { yPercent: -4 }, { yPercent: 4, ease: 'none', duration: tl.duration() }, 0);

    // +100 milhões / +10 anos contam enquanto entram (e voltam se a pessoa rolar pra cima)
    $$('.stat-num .cnt').forEach(function (el, i) {
      var to = +el.getAttribute('data-to'), o = { v: 0 };
      el.style.minWidth = String(to).length * 0.62 + 'em';
      el.textContent = '0';
      tl.to(o, { v: to, duration: 0.7, ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); } }, (i ? 's2' : 's1') + '+=0.3');
    });
  }

  /* =========================================================
     FOTOS → "QUEM É A KATH?" → traçado → pilha (desktop)
     ========================================================= */
  var IMG_RATIO = 2731 / 4096;                         // todas as fotos são 2731×4096
  var COL_W = [361.535, 361.343, 371.072, 373.326];    // larguras das colunas no Figma
  var COL_X0 = -13.638;                                // fileira centralizada (1467px em 1440)
  var COL_POS = [0.5, 0.606, 0.838, 0.5];              // enquadramento horizontal de cada foto
  // destino de cada foto na pilha (sp-1..sp-4 → c-4..c-1)
  var CARDS = [
    { sel: '.c-4', w: 446.374, h: 637.765, rot: 3.83 - 2.73, crop: { left: -10.07, top: -15.55, width: 120.14, height: 126.12 } },
    { sel: '.c-3', w: 450.187, h: 643.556, rot: 3.83 + 4.98, crop: { left: -3.65,  top: -12.57, width: 107.3,  height: 112.57 } },
    { sel: '.c-2', w: 433.9,   h: 604.011, rot: 3.83 + 0.16, crop: { left: -11.28, top: -9.95,  width: 111.28, height: 119.89 } },
    { sel: '.c-1', w: 473.11,  h: 654.617, rot: 3.83 - 6.1,  crop: { left: -11.67, top: -16.85, width: 123.35, height: 133.7 } }
  ];

  function storyDesktop() {
    var pin = $('.story-pin');
    var track = $('.story-track');
    var photos = $$('.sp');
    var imgs = photos.map(function (p) { return $('img', p); });
    var dims = $$('.sp-dim');
    var path = $('.kath-swoosh path');
    var L = null;

    function measure() {
      var W = pin.offsetWidth, H = pin.offsetHeight, k = W / 1440, s = Z * FIT;
      var x = COL_X0 * k;
      var cols = COL_W.map(function (w, i) {
        var c = { x: x, w: w * k, h: H };
        x += w * k;
        var r = c.w / c.h, crop;
        if (r > IMG_RATIO) { var hh = r / IMG_RATIO * 100; crop = { left: 0, width: 100, top: -(hh - 100) / 2, height: hh }; }
        else { var ww = IMG_RATIO / r * 100; crop = { top: 0, height: 100, width: ww, left: -(ww - 100) * COL_POS[i] }; }
        c.crop = crop;
        return c;
      });
      var pr = pin.getBoundingClientRect(), tr = track.getBoundingClientRect();
      var targets = CARDS.map(function (c) {
        var r = $(c.sel).getBoundingClientRect();
        var w = c.w * s, h = c.h * s;
        var cx = r.left + r.width / 2 - pr.left;
        var cy = r.top + r.height / 2 - tr.top;       // relativo ao topo do track (que termina em 0)
        return { x: cx - w / 2, y: cy - h / 2, w: w, h: h, rot: c.rot, crop: c.crop, radius: 20 * s };
      });
      L = { W: W, H: H, cols: cols, targets: targets, f: swooshSplit(W, H, pr, tr) };
    }

    // até que ponto o traçado é desenhado antes da seção começar a subir:
    // quando a linha chega perto do canto inferior esquerdo da tela
    function swooshSplit(W, H, pr, tr) {
      var svg = path.ownerSVGElement, sr = svg.getBoundingClientRect();
      var sx = sr.width / 1475.26, sy = sr.height / 1086.36;
      var ox = sr.left - pr.left, oy = H + (sr.top - tr.top);   // posição com o track parado (y = 0)
      var total = path.getTotalLength();
      for (var l = 0; l <= total; l += total / 600) {
        var p = path.getPointAtLength(l);
        if (oy + p.y * sy > H * 0.8 && ox + p.x * sx < W * 0.35) return l / total;
      }
      return 0.62;
    }
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);

    var len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(photos[2], { scaleX: -1 });
    photos.forEach(function (p, i) { p.style.zIndex = 4 - i; });

    var titleSplit = SplitText.create('.kath-banner-title', { type: 'chars,lines', mask: 'lines' });
    var aboutTitle = SplitText.create('.about-title', { type: 'lines', mask: 'lines' });
    var aboutBodySplits = justifiedLines('.about-body p');
    var aboutBody = { lines: aboutBodySplits.reduce(function (a, s) { return a.concat(s.lines); }, []), revert: function () { aboutBodySplits.forEach(function (s) { s.revert(); }); } };

    var col = function (i, key) { return function () { return L.cols[i][key]; }; };
    var tgt = function (i, key) { return function () { return L.targets[i][key]; }; };

    var startVars = function (i) {
      return { x: col(i, 'x'), y: function () { return -L.H; }, width: col(i, 'w'), height: col(i, 'h'), rotation: 0, borderRadius: 0 };
    };
    var cropVars = function (i) {
      return { left: function () { return L.cols[i].crop.left + '%'; }, top: function () { return L.cols[i].crop.top + '%'; },
               width: function () { return L.cols[i].crop.width + '%'; }, height: function () { return L.cols[i].crop.height + '%'; },
               scale: 1.25 };
    };

    // 0) a 1ª foto já cai enquanto as duas seções estão na tela (antes de fixar)
    // a queda usa yPercent (e não y): o y é da timeline principal, que leva a foto até a pilha.
    // Se as duas mexessem no y, num pulo rápido (link "Quem sou eu") o atraso do scrub desta
    // aqui terminava DEPOIS da principal e devolvia a foto para y = 0 — ela ficava levantada.
    var fall0 = startVars(0);
    fall0.y = 0;
    fall0.yPercent = -100;   // altura da foto = altura da tela, então -100% = -L.H
    gsap.timeline({
      scrollTrigger: { trigger: '.story', start: 'top 75%', end: 'top top', scrub: 1, invalidateOnRefresh: true }
    })
      .fromTo(photos[0], fall0, { yPercent: 0, ease: 'power2.out' }, 0)
      .fromTo(imgs[0], cropVars(0), { scale: 1, ease: 'power2.out' }, 0);

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.story',
        start: 'top top',
        end: function () { return '+=' + window.innerHeight * 5.5; },
        pin: pin,
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    // 1) as outras fotos caem de cima pra baixo e cobrem a tela
    photos.slice(1).forEach(function (p, j) {
      var i = j + 1;
      tl.fromTo(p, startVars(i), { y: 0, duration: 1, ease: 'power3.out' }, j * 0.22);
      tl.fromTo(imgs[i], cropVars(i), { scale: 1, duration: 1.3, ease: 'power2.out' }, j * 0.22);
    });

    // 2) escurece e aparece o título
    tl.to(dims, { opacity: 0.6, duration: 0.8, ease: 'none' }, 1.3)
      .from(titleSplit.chars, { yPercent: 110, duration: 0.6, stagger: 0.03, ease: 'power3.out' }, 1.45);

    // 3) traçado começa no canto superior direito e segue o curso da linha…
    var T = 4.2;   // …até chegar perto do canto inferior esquerdo, quando a seção começa a subir
    tl.fromTo(path,
      { strokeDashoffset: function () { return len; } },
      { strokeDashoffset: function () { return len * (1 - L.f); }, duration: T - 2.1, ease: 'none' }, 2.1);

    // …e continua até o título enquanto a seção sobe
    tl.to(path, { strokeDashoffset: 0, duration: 1.9, ease: 'power1.inOut' }, T);

    // 4) a seção sobe e as fotos voam para formar a pilha
    tl.to([track, '.about-bg', '.story-title'], { yPercent: -100, duration: 1.9, ease: 'power2.inOut' }, T)
      .to(dims, { opacity: 0, duration: 1.2, ease: 'none' }, T + 0.4);
    photos.forEach(function (p, i) {
      var at = T + (3 - i) * 0.1;
      tl.to(p, {
        x: tgt(i, 'x'), y: tgt(i, 'y'), width: tgt(i, 'w'), height: tgt(i, 'h'),
        rotation: tgt(i, 'rot'), borderRadius: tgt(i, 'radius'),
        duration: 1.9, ease: 'power2.inOut'
      }, at);
      tl.to(imgs[i], {
        left: function () { return L.targets[i].crop.left + '%'; }, top: function () { return L.targets[i].crop.top + '%'; },
        width: function () { return L.targets[i].crop.width + '%'; }, height: function () { return L.targets[i].crop.height + '%'; },
        duration: 1.9, ease: 'power2.inOut'
      }, at);
    });

    // 5) texto do "Quem é a Kath?"
    tl.from(aboutTitle.lines, { yPercent: 110, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, T + 1.2)
      .from(aboutBody.lines, { yPercent: 110, duration: 0.5, stagger: 0.02, ease: 'power3.out' }, T + 1.35)
      .from('.about-ctas .btn', { y: 24, autoAlpha: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, T + 1.9)
      .to({}, { duration: 0.5 });

    // "Saiba Mais" leva direto ao fim da cena
    var st = tl.scrollTrigger;
    aboutEnd = function () { return st.end; };
    $$('a[href="#quem-e-a-kath"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(st.end, { duration: 2.2 });
        else window.scrollTo({ top: st.end, behavior: 'smooth' });
      });
    });

    return function () {
      ScrollTrigger.removeEventListener('refreshInit', measure);
      titleSplit.revert(); aboutTitle.revert(); aboutBody.revert();
      gsap.set([photos, imgs, dims, path], { clearProps: 'all' });
    };
  }

  /* celular (frame mobile do Figma): 4 faixas de foto com o título por cima,
     traçado vermelho descendo até o "Quem é a Kath?", pilha de fotos e texto */
  function storyMobile() {
    if (reduce) return;
    // faixas entram alternando os lados, a foto assenta de um leve zoom
    $$('.sp').forEach(function (p, i) {
      gsap.from(p, { xPercent: i % 2 ? 100 : -100, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: p, start: 'top 92%' } });
      gsap.from($('img', p), { scale: 1.25, duration: 1.6, ease: 'power3.out',
        scrollTrigger: { trigger: p, start: 'top 92%' } });
    });
    var title = SplitText.create('.kath-banner-title', { type: 'chars,lines', mask: 'lines' });
    gsap.from(title.chars, { yPercent: 110, duration: 0.6, stagger: 0.03, ease: 'power3.out',
      scrollTrigger: { trigger: '.story-photos', start: 'center 70%' } });
    // o traçado "se desenha" de cima pra baixo acompanhando o scroll
    gsap.fromTo('.kath-swoosh-m', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: '.kath-swoosh-m', start: 'top 75%', end: 'bottom 65%', scrub: 0.6 } });
    gsap.from('.stack .card-box', { y: 80, autoAlpha: 0, stagger: 0.12, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.stack', start: 'top 85%' } });
    reveal('.about-title');
    var splits = justifiedLines('.about-body p');
    splits.forEach(function (s) {
      gsap.from(s.lines, { yPercent: 110, duration: 0.9, stagger: 0.04, ease: 'power3.out', scrollTrigger: { trigger: s.elements[0], start: 'top 88%' } });
    });
    gsap.from('.about-ctas .btn', { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: '.about-ctas', start: 'top 92%' } });
    return function () { title.revert(); splits.forEach(function (s) { s.revert(); }); };
  }

  /* =========================================================
     ZAPAROLI — palavras deslizam, faixa horizontal abre
     ========================================================= */
  function zaparoli() {
    if (reduce) return;
    var range = { trigger: '.zaparoli', start: 'top bottom', end: 'bottom top', scrub: true };
    // as palavras entram de lados opostos e terminam cobrindo exatamente a largura da tela
    var settle = { trigger: '.zaparoli', start: 'top bottom', end: 'bottom bottom', scrub: 1 };
    gsap.fromTo('.zap-top', { xPercent: 14 }, { xPercent: 0, ease: 'power2.out', scrollTrigger: settle });
    gsap.fromTo('.zap-bottom', { xPercent: -14 }, { xPercent: 0, ease: 'power2.out', scrollTrigger: settle });

    gsap.timeline({ scrollTrigger: { trigger: '.zaparoli', start: 'top 80%', end: 'bottom bottom', scrub: 1 } })
      .fromTo('.zap-strip', { clipPath: 'inset(46% 50% 46% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut' });
    gsap.fromTo('.zap-strip img', { scale: 1.3, xPercent: -7 }, { scale: 1, xPercent: 7, ease: 'none', scrollTrigger: range });
  }

  /* =========================================================
     SE VOCÊ QUER SER LEMBRADO — entrada
     ========================================================= */
  function provoke() {
    if (reduce) return;
    fillWords('.provoke-title');
    gsap.from('.provoke-lead, .provoke-ctas', { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '.provoke-copy', start: 'top 70%' } });
    // foto abre de baixo pra cima. Só anima com a imagem já decodificada (senão ela
    // "pula" pronta no fim) e começa a carregar antes de chegar na tela (era lazy).
    // no celular a foto é a versão com máscara (.pp-m)
    var mob = !window.matchMedia('(min-width: 1024px)').matches && $('.pp-m');
    var photo = mob || $('.provoke-photo'), photoImg = $('img', photo);
    var reveal = gsap.fromTo(photo, { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power4.inOut', paused: true });
    ScrollTrigger.create({ trigger: '.zaparoli', start: 'top bottom', once: true,
      onEnter: function () { photoImg.loading = 'eager'; } });
    ScrollTrigger.create({ trigger: '.provoke', start: 'top 75%', once: true,
      onEnter: function () {
        var play = function () { reveal.play(); };
        if (photoImg.complete && photoImg.naturalWidth) { play(); return; }
        photoImg.loading = 'eager';
        (photoImg.decode ? photoImg.decode() : Promise.resolve()).then(play, play);
      } });
    gsap.from('.provoke-brush img', { scale: 0.8, autoAlpha: 0, duration: 1.5, ease: 'power3.out',
      scrollTrigger: { trigger: '.provoke', start: 'top 75%' } });
    gsap.from(mob ? '.pp-m img' : '.provoke-photo img', { yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.provoke', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* =========================================================
     ESCOLHA POR ONDE COMEÇAR — entrada + vídeo das camisetas
     ========================================================= */
  function choose() {
    var card = $('.pcard-camisetas');
    var video = card && $('video', card);
    if (video) {
      var visible = false;
      var play = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
      if (reduce) {
        // sem movimento automático: o vídeo só roda com o mouse em cima
        card.addEventListener('mouseenter', play);
        card.addEventListener('mouseleave', function () { video.pause(); });
      } else if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting;
          if (visible) play(); else video.pause();
        }, { rootMargin: '200px 0px' }).observe(card);
      } else {
        play();
      }
    }

    if (reduce) return;
    fillWords('.choose-title');
    gsap.from('.choose-grid .pcard, .socials li', { y: 70, autoAlpha: 0, duration: 1, stagger: 0.09, ease: 'power3.out',
      scrollTrigger: { trigger: '.choose-grid', start: 'top 85%' } });
  }

  /* ---------- helper: divide em linhas mantendo o texto justificado ---------- */
  function justifiedLines(sel) {
    return $$(sel).map(function (el) {
      var s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'jl' });
      if (s.lines.length) s.lines[s.lines.length - 1].classList.add('jl-last');
      return s;
    });
  }

  /* ---------- helper: as palavras acendem no ritmo do scroll ---------- */
  function fillWords(sel) {
    $$(sel).forEach(function (el) {
      var s = SplitText.create(el, { type: 'words' });
      gsap.fromTo(s.words, { opacity: 0.12 }, { opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 60%', scrub: 0.5 } });
    });
  }

  /* ---------- hero: ao sair, a foto desce devagar e o texto sobe e some ---------- */
  function heroScroll() {
    // só no desktop: no celular o texto fica embaixo da foto e sumiria justo quando a pessoa vai ler
    if (reduce || !window.matchMedia('(min-width: 1024px)').matches) return;
    var st = function () { return { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }; };
    gsap.to('.hero-visual', { y: 120, ease: 'none', scrollTrigger: st() });
    gsap.to('.hero-copy', { y: -110, opacity: 0, ease: 'none', scrollTrigger: st() });
  }

  /* ---------- helper: linhas subindo ao entrar na tela ---------- */
  function reveal(sel) {
    $$(sel).forEach(function (el) {
      var s = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(s.lines, { yPercent: 110, duration: 0.9, stagger: 0.05, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
  }
})();
