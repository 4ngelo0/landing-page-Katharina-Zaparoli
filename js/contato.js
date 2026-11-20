/* =========================================================
   Trabalhe comigo — formulário em etapas
   Uma pergunta por vez, opções em chips, revisão e envio por e-mail (mailto).
   Nada é salvo: a mensagem só é montada no aplicativo de e-mail da pessoa.
   ========================================================= */
(function () {
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!window.gsap;
  var EMAIL = 'kathzaparolly@gmail.com';

  /* escala do palco de 1440px (igual à home) */
  function fit() {
    var w = root.clientWidth;
    root.style.setProperty('--z', w >= 1024 ? Math.min(1, w / 1440) : 1);
  }
  window.addEventListener('resize', fit);

  /* scroll suave (mesmo ritmo da home e do ebook) + linha de progresso no lugar da barra de rolagem */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
    if (hasGsap) {
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  }
  var progBar = $('.scroll-progress i');
  function progress() {
    if (!progBar) return;
    var max = root.scrollHeight - window.innerHeight;
    progBar.style.transform = 'scaleY(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
  }
  if (lenis) lenis.on('scroll', progress); else window.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('resize', progress);
  if (window.ResizeObserver) new ResizeObserver(progress).observe(document.body);   // etapas do formulário mudam a altura
  progress();

  var form = $('#cf');
  var box = $('.cf-steps', form);
  var steps = $$('.cf-step', form);
  var questions = steps.filter(function (s) { return !s.classList.contains('cf-review') && !s.classList.contains('cf-done'); });
  var review = $('.cf-review', form), done = $('.cf-done', form);
  var nextBtn = $('.cf-next', form), backBtn = $('.cf-back', form);
  var cur = 0, busy = false;

  $('.cf-total', form).textContent = pad(questions.length);

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function field(name) { return form.elements[name]; }
  function val(name) {
    var f = field(name);
    if (!f) return '';
    if (f instanceof RadioNodeList || (f.length && !f.tagName)) return f.value || '';
    if (f.type === 'checkbox') return f.checked ? f.value : '';
    return (f.value || '').trim();
  }

  /* ---------- valores legíveis de cada etapa ---------- */
  function answer(key) {
    switch (key) {
      case 'nome': return val('nome');
      case 'contato': return val('email') + (val('whatsapp') ? ' · WhatsApp: ' + val('whatsapp') : '');
      case 'tipo': return val('tipo') === 'Outro' ? ('Outro' + (val('tipo_outro') ? ': ' + val('tipo_outro') : '')) : val('tipo');
      case 'data':
        if (val('sem_data')) return 'Ainda não tenho data';
        var d = val('data');
        if (!d) return '';
        var p = d.split('-');
        return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d;
      case 'formato':
        var f = val('formato');
        return f && val('cidade') && f !== 'On-line' ? f + ' — ' + val('cidade') : f;
      case 'orcamento': return val('orcamento');
      case 'detalhes': return val('detalhes');
    }
    return '';
  }

  /* ---------- validação ---------- */
  function check(step) {
    var key = step.dataset.key, msg = '';
    if (key === 'nome' && !val('nome')) msg = 'Me diz como posso te chamar.';
    if (key === 'contato' && !/^[^s@]+@[^s@]+.[^s@]{2,}$/.test(val('email'))) msg = val('email') ? 'Confere o e-mail: parece que faltou alguma coisa.' : 'Me passa um e-mail pra eu conseguir te responder.';
    if (key === 'tipo' && !val('tipo')) msg = 'Escolhe uma das opções.';
    if (key === 'tipo' && val('tipo') === 'Outro' && !val('tipo_outro')) msg = 'Me conta rapidinho qual é o projeto.';
    if (key === 'detalhes' && val('detalhes').length < 20) msg = 'Escreve um pouquinho mais (pelo menos 20 caracteres).';
    var err = $('.cf-err', step);
    if (err) err.textContent = msg;
    if (msg) {
      form.classList.remove('is-shake');
      void form.offsetWidth;
      form.classList.add('is-shake');
      var input = $('.cf-input:not([hidden])', step);
      if (input && step.dataset.key !== 'tipo') input.focus();
    }
    return !msg;
  }

  /* ---------- troca de etapa (com animação) ---------- */
  function setState(step) {
    var idx = questions.indexOf(step);
    form.classList.toggle('is-first', step === questions[0]);
    form.classList.toggle('is-review', step === review);
    form.classList.toggle('is-done', step === done);
    form.classList.toggle('is-textarea', step.dataset.key === 'detalhes');
    var n = idx >= 0 ? idx + 1 : questions.length;
    $('.cf-cur', form).textContent = pad(n);
    form.style.setProperty('--p', step === review ? 1 : n / questions.length);
    // botão "Continuar" vira "Pular" nas perguntas opcionais ainda vazias
    var optional = ['data', 'formato', 'orcamento'].indexOf(step.dataset.key) >= 0;
    nextBtn.textContent = optional && !answer(step.dataset.key) ? 'Pular' : (idx === questions.length - 1 ? 'Revisar' : 'Continuar');
  }

  function focusStep(step) {
    var el = $('.cf-input:not(.cf-date)', step) || $('.cf-date', step) || $('input', step) || step;
    if (step === done) el = step;
    // no celular não abre o teclado sozinho na troca de etapa
    if (window.matchMedia('(hover: hover)').matches || el === step) el.focus({ preventScroll: true });
  }

  function go(to, dir) {
    var from = steps.filter(function (s) { return s.classList.contains('is-on'); })[0];
    if (busy || to === from) return;
    if (to === review) buildSummary();
    setState(to);

    if (!hasGsap || reduce || !from) {
      if (from) from.classList.remove('is-on');
      to.classList.add('is-on');
      focusStep(to);
      return;
    }
    busy = true;
    var h0 = box.offsetHeight;
    gsap.to(from, {
      y: -24 * dir, autoAlpha: 0, duration: 0.28, ease: 'power2.in',
      onComplete: function () {
        from.classList.remove('is-on');
        gsap.set(from, { clearProps: 'all' });
        to.classList.add('is-on');
        busy = false;   // libera já: a entrada continua animando, mas dá pra seguir
        var h1 = box.offsetHeight;
        gsap.fromTo(box, { height: h0 }, { height: h1, duration: 0.45, ease: 'power3.inOut', clearProps: 'height' });
        var bits = $$('.cf-n, .cf-q, .cf-hint, .cf-input, .cf-chips, .cf-more:not([hidden]), .cf-meta, .cf-sum > div, .cf-done-ctas', to);
        gsap.fromTo(bits, { y: 34 * dir, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity,visibility'
        });
        focusStep(to);
      }
    });
  }

  function current() { return steps.filter(function (s) { return s.classList.contains('is-on'); })[0]; }

  function next() {
    var s = current();
    if (busy || !s) return;
    if (questions.indexOf(s) >= 0 && !check(s)) return;
    var i = questions.indexOf(s);
    go(i === questions.length - 1 ? review : questions[i + 1], 1);
  }
  function back() {
    var s = current();
    if (busy || !s) return;
    if (s === review) return go(questions[questions.length - 1], -1);
    var i = questions.indexOf(s);
    if (i > 0) go(questions[i - 1], -1);
  }

  /* ---------- resumo ---------- */
  function buildSummary() {
    var dl = $('.cf-sum', review);
    dl.innerHTML = '';
    questions.forEach(function (q) {
      var row = document.createElement('div');
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      var ed = document.createElement('button');
      var a = answer(q.dataset.key);
      dt.textContent = q.dataset.label;
      dd.textContent = a || 'Não informado';
      if (!a) dd.className = 'is-empty';
      ed.type = 'button';
      ed.className = 'cf-edit';
      ed.textContent = 'Editar';
      ed.setAttribute('aria-label', 'Editar ' + q.dataset.label.toLowerCase());
      ed.addEventListener('click', function () { go(q, -1); });
      row.append(dt, dd, ed);
      dl.appendChild(row);
    });
  }

  /* ---------- mensagem do e-mail ---------- */
  function mailto() {
    var nome = answer('nome'), tipo = answer('tipo');
    var lines = ['Oi, Kath!', '', 'Vim pelo site e queria conversar sobre um projeto.', ''];
    questions.forEach(function (q) {
      if (q.dataset.key === 'detalhes') return;
      lines.push(q.dataset.label + ': ' + (answer(q.dataset.key) || 'Não informado'));
    });
    lines.push('', 'Detalhes do projeto:', answer('detalhes'), '', nome);
    var subject = 'Projeto: ' + tipo + ' — ' + nome;
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  /* ---------- eventos ---------- */
  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', back);

  /* ---------- envio automático (FormSubmit) ----------
     As respostas vão por POST pro formsubmit.co, que repassa por e-mail pro EMAIL.
     No 1º envio pra um endereço novo o FormSubmit manda um e-mail de ativação:
     é só clicar em "Activate Form" e daí em diante tudo chega direto.
     Se o envio falhar, oferece abrir o app de e-mail com a mensagem pronta. */
  var sendBtn = $('.cf-send', form), sending = false;

  function payload() {
    var data = {
      _subject: 'Projeto: ' + answer('tipo') + ' — ' + answer('nome'),
      _template: 'table',
      _captcha: 'false',
      _replyto: val('email'),   // "Responder" no e-mail já vai pra pessoa
      _honey: (form.elements._honey || {}).value || ''
    };
    questions.forEach(function (q) { data[q.dataset.label] = answer(q.dataset.key) || 'Não informado'; });
    return data;
  }

  function sendFail() {
    var err = $('.cf-err', review);
    err.innerHTML = '';
    err.append('Não consegui enviar agora. ');
    var a = document.createElement('a');
    a.href = mailto();
    a.textContent = 'Enviar pelo seu app de e-mail';
    a.className = 'cf-fallback';
    err.append(a, ' ou tenta de novo daqui a pouco.');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    for (var i = 0; i < questions.length; i++) {
      if (!check(questions[i])) { go(questions[i], -1); return; }
    }
    sending = true;
    form.classList.add('is-sending');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Enviando…';
    $('.cf-err', review).textContent = '';

    fetch('https://formsubmit.co/ajax/' + EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload())
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return r.ok && String(d.success) !== 'false'; }); })
      .catch(function () { return false; })
      .then(function (ok) {
        sending = false;
        form.classList.remove('is-sending');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Enviar';
        if (ok) go(done, 1); else sendFail();
      });
  });

  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing) return;
    var s = current();
    if (!s || s === done) return;
    if (e.target.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return;
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
    e.preventDefault();
    if (s === review) form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
    else next();
  });

  form.addEventListener('change', function (e) {
    var t = e.target, s = t.closest('.cf-step');
    // opções que revelam um campo extra (Outro → qual? / Presencial → cidade)
    if (t.type === 'radio') {
      $$('input[name="' + t.name + '"]', form).forEach(function (r) {
        var id = r.getAttribute('data-reveal');
        if (!id) return;
        var more = document.getElementById(id);
        var show = $$('input[data-reveal="' + id + '"]', form).some(function (x) { return x.checked; });
        if (more.hidden === !show) return;
        more.hidden = !show;
        if (show) {
          if (hasGsap && !reduce) gsap.from(more, { y: 14, autoAlpha: 0, duration: 0.45, ease: 'power3.out' });
          $('input', more).focus();
        }
      });
    }
    // "Ainda não tenho data" desliga o campo de data
    if (t.dataset.clears) {
      var d = field(t.dataset.clears);
      d.disabled = t.checked;
      if (t.checked) d.value = '';
    }
    // (o 'change' de um campo pode chegar depois de já ter trocado de etapa: só atualiza a etapa atual)
    if (s && s === current()) { var err = $('.cf-err', s); if (err) err.textContent = ''; setState(s); }
    // escolha única sem campo extra: avança sozinho
    if (t.type === 'radio' && s && s.hasAttribute('data-auto') && !t.hasAttribute('data-reveal')) {
      setTimeout(next, 380);
    }
  });

  form.addEventListener('input', function (e) {
    var s = e.target.closest('.cf-step');
    if (e.target.name === 'detalhes') {
      var n = e.target.value.length;
      $('.cf-chars', form).textContent = n;
      $('.cf-meta', form).classList.toggle('is-ok', n >= 20);
    }
    if (s && s === current()) { var err = $('.cf-err', s); if (err && err.textContent) err.textContent = ''; setState(s); }
  });

  /* ---------- pré-seleção vinda da home (?tipo=palestra) ---------- */
  (function () {
    var m = /[?&]tipo=([^&]+)/.exec(location.search);
    if (!m) return;
    var map = { palestra: 'Palestra ou evento', campanha: 'Campanha ou publicidade', consultoria: 'Consultoria de imagem', entrevista: 'Entrevista ou podcast' };
    var v = map[decodeURIComponent(m[1]).toLowerCase()];
    var r = v && $('input[name="tipo"][value="' + v + '"]', form);
    if (r) r.checked = true;
  })();

  /* ---------- início ---------- */
  buildSummary();   // já monta o resumo pra ele entrar na medida da altura

  /* reserva no formulário a altura da sua maior etapa (com campos extras abertos):
     a coluna da esquerda é centralizada nele e assim não se mexe na troca de etapa */
  function reserve() {
    if (busy) return;
    form.style.minHeight = '';
    if (root.clientWidth < 1024) return;   // no celular é uma coluna só
    var on = current(), more = $$('.cf-more[hidden]', form), max = 0;
    more.forEach(function (m) { m.hidden = false; });
    steps.forEach(function (s) {
      steps.forEach(function (o) { o.classList.toggle('is-on', o === s); });
      max = Math.max(max, form.offsetHeight);
    });
    more.forEach(function (m) { m.hidden = true; });
    steps.forEach(function (o) { o.classList.toggle('is-on', o === on); });
    form.style.minHeight = max + 'px';
  }
  window.addEventListener('resize', reserve);
  questions[0].classList.add('is-on');
  setState(questions[0]);

  function intro() {
    reserve();
    root.classList.add('ct-ready');
    if (!hasGsap || reduce) return;
    var title = window.SplitText ? SplitText.create('.ct-title > span', { type: 'lines,words', mask: 'lines' }) : null;
    var tl = gsap.timeline({ delay: root.classList.contains('pt-in') ? 0.55 : 0.1 });
    // banner abre do centro pra fora, com a foto saindo de um zoom
    tl.fromTo('.ct-banner', { clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut' }, 0)
      .from('.ct-banner img', { scale: 1.3, duration: 1.8, ease: 'power3.out' }, 0);
    // título: as linhas sobem e as palavras acendem em sequência
    if (title) {
      tl.from(title.lines, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.2)
        .fromTo(title.words, { opacity: 0.15 }, { opacity: 1, duration: 0.5, stagger: 0.09, ease: 'power1.out' }, 0.45);
    }
    tl.from('.ct-text, .ct-direct', { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out' }, 0.5)
      .from('.cf', { y: 60, autoAlpha: 0, duration: 1, ease: 'power3.out' }, 0.35);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(intro); else intro();
})();
