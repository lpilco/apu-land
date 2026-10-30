/* Apu Coach · Landing */
(function () {
  'use strict';

  // ---------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------
  // URL /exec del Apps Script (apps-script/Code.gs). Vacía = modo vista previa.
  var FEEDBACK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyXThe8qT5F_9oQsD1WL62FHx-iB9KPLtOnTb91YVHMGtr2E0WrCSTuBbwk5Do80g2bww/exec';
  // URL pública de la app. Vacía = se oculta el botón "Abrir Apu Coach".
  var APP_URL = 'https://apu-kamayuk.netlify.app';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  // ---------------------------------------------------------
  // 1. Tema claro / oscuro
  // ---------------------------------------------------------
  var root = document.documentElement;
  function isDark() {
    if (root.dataset.theme) return root.dataset.theme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function syncThemeColor() {
    var m = $('meta[name="theme-color"]');
    if (m) m.content = isDark() ? '#060a14' : '#fbfaf7';
  }
  $('#theme').addEventListener('click', function () {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    store('apu-theme', root.dataset.theme);
    syncThemeColor();
  });
  syncThemeColor();

  // ---------------------------------------------------------
  // 2. Pestañas por hash (#apu, #conectar, #proyecto, #comunidad)
  // ---------------------------------------------------------
  var TABS = ['apu', 'conectar', 'proyecto', 'comunidad'];
  var currentTab = null;

  function selectTab(id, scroll) {
    if (TABS.indexOf(id) < 0) id = 'apu';
    if (id !== currentTab) {
      currentTab = id;
      $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'v-' + id); });
      $$('[data-tab]').forEach(function (a) { a.setAttribute('aria-selected', a.dataset.tab === id ? 'true' : 'false'); });
      document.title = {
        apu: 'Apu Coach · Tu coach de montaña con IA',
        conectar: 'Conectar tu reloj · Apu Coach',
        proyecto: 'El proyecto · Apu Coach',
        comunidad: 'Comunidad · Apu Coach'
      }[id];
      observeReveals();
      playVisibleVideos();
    }
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }

  function goto(id) {
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    selectTab(id, true);
  }

  $$('[data-tab], [data-goto]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      goto(a.dataset.tab || a.dataset.goto);
    });
  });

  // Enlaces internos (#paso-2, #ver-chat) dentro de una pestaña
  window.addEventListener('popstate', function () { route(); });
  function route() {
    var h = (location.hash || '').slice(1);
    if (TABS.indexOf(h) > -1 || !h) return selectTab(h || 'apu', true);
    var el = document.getElementById(h);
    var view = el && el.closest('.view');
    if (view) {
      selectTab(view.id.slice(2), false);
      setTimeout(function () { el.scrollIntoView({ behavior: 'smooth' }); }, 60);
    } else {
      selectTab('apu', true);
    }
  }

  // ---------------------------------------------------------
  // 3. Revelado al hacer scroll
  // ---------------------------------------------------------
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  function observeReveals() {
    $$('.view.on .rv:not(.in)').forEach(function (el) { revealIO.observe(el); });
  }

  // ---------------------------------------------------------
  // 4. Videos en bucle: solo se reproducen cuando se ven
  // ---------------------------------------------------------
  var autoVideos = $$('video.auto');
  var videoIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting && !reduceMotion) { v.play().catch(function () {}); } else { v.pause(); }
    });
  }, { threshold: 0.35 });
  autoVideos.forEach(function (v) {
    videoIO.observe(v);
    if (reduceMotion) {
      v.controls = true;
    }
  });
  function playVisibleVideos() {
    // Al cambiar de pestaña el observer vuelve a evaluar los elementos visibles
    autoVideos.forEach(function (v) { videoIO.unobserve(v); videoIO.observe(v); });
  }

  // Zoom del portátil del hero al hacer scroll
  var laptop = $('.laptop');
  function onScroll() {
    if (!laptop || reduceMotion || currentTab !== 'apu') return;
    var r = laptop.getBoundingClientRect();
    var p = Math.min(Math.max((window.innerHeight - r.top) / (window.innerHeight * 0.9), 0), 1);
    laptop.style.setProperty('--s', (0.88 + p * 0.12).toFixed(3));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Preguntas de ejemplo que se encienden una a una
  var asks = $$('.asks li');
  var askIdx = 0;
  if (asks.length) {
    asks[0].classList.add('on');
    setInterval(function () {
      asks[askIdx].classList.remove('on');
      askIdx = (askIdx + 1) % asks.length;
      asks[askIdx].classList.add('on');
    }, 2200);
  }

  // ---------------------------------------------------------
  // 5. Carrusel "Lo esencial"
  // ---------------------------------------------------------
  (function highlights() {
    var track = $('#hl-track');
    if (!track) return;
    var cards = $$('.hl-card', track);
    var dotsBox = $('#hl-dots');
    var playBtn = $('#hl-play');
    var active = 0;
    var paused = reduceMotion;
    var imgTimer = null;
    var imgStart = 0;
    var IMG_MS = 6000;
    var inView = false;

    var dots = cards.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Ver ' + (i + 1) + ' de ' + cards.length);
      b.innerHTML = '<i></i>';
      b.addEventListener('click', function () { go(i, true); });
      dotsBox.appendChild(b);
      return b;
    });

    function media(i) { return cards[i].querySelector('video, img'); }

    function setProgress(p) {
      dots.forEach(function (d, i) { d.firstChild.style.width = i === active ? (p * 100) + '%' : '0'; });
    }

    function start() {
      clearInterval(imgTimer);
      var m = media(active);
      if (paused || !inView) return;
      if (m.tagName === 'VIDEO') {
        if (m.preload === 'none') m.preload = 'auto';
        m.play().catch(function () {});
      } else {
        imgStart = Date.now() - (m._elapsed || 0);
        imgTimer = setInterval(function () {
          var p = (Date.now() - imgStart) / IMG_MS;
          m._elapsed = Date.now() - imgStart;
          setProgress(Math.min(p, 1));
          if (p >= 1) { m._elapsed = 0; next(); }
        }, 60);
      }
    }

    function stopAll() {
      clearInterval(imgTimer);
      cards.forEach(function (c) { var v = c.querySelector('video'); if (v) v.pause(); });
    }

    function go(i, scroll) {
      stopAll();
      var prev = media(active);
      if (prev.tagName === 'VIDEO' && i !== active) prev.currentTime = 0;
      active = (i + cards.length) % cards.length;
      cards.forEach(function (c, k) { c.classList.toggle('on', k === active); });
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === active ? 'true' : 'false'); });
      setProgress(0);
      if (scroll) {
        track.scrollTo({ left: cards[active].offsetLeft - track.firstElementChild.offsetLeft, behavior: 'smooth' });
      }
      start();
    }
    function next() { go(active + 1, true); }

    cards.forEach(function (c, i) {
      var v = c.querySelector('video');
      if (!v) return;
      v.addEventListener('timeupdate', function () { if (i === active && v.duration) setProgress(v.currentTime / v.duration); });
      v.addEventListener('ended', function () { if (i === active) next(); });
    });

    playBtn.addEventListener('click', function () {
      paused = !paused;
      playBtn.classList.toggle('paused', paused);
      playBtn.setAttribute('aria-label', paused ? 'Reproducir' : 'Pausar');
      if (paused) stopAll(); else start();
    });
    playBtn.classList.toggle('paused', paused);

    // Si el usuario desliza a mano, sigue la tarjeta centrada
    var scrollT;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollT);
      scrollT = setTimeout(function () {
        var x = track.scrollLeft;
        var best = 0;
        var bestD = Infinity;
        cards.forEach(function (c, i) {
          var d = Math.abs(c.offsetLeft - track.firstElementChild.offsetLeft - x);
          if (d < bestD) { bestD = d; best = i; }
        });
        if (best !== active) go(best, false);
      }, 120);
    }, { passive: true });

    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      if (inView) start(); else stopAll();
    }, { threshold: 0.4 }).observe(track);

    go(0, false);
  })();

  // ---------------------------------------------------------
  // 6. Cordillera: el paso visible enciende su hito
  // ---------------------------------------------------------
  (function ridge() {
    var steps = $$('.ridge-steps li');
    var hots = $$('.hot');
    if (!steps.length) return;
    function on(k) {
      steps.forEach(function (s) { s.classList.toggle('on', s.dataset.k === k); });
      hots.forEach(function (h) { h.classList.toggle('on', h.dataset.k === k); });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) on(en.target.dataset.k); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
    on('0');
  })();

  // ---------------------------------------------------------
  // 7. Comparador zona óptima / sobrecarga
  // ---------------------------------------------------------
  (function compare() {
    var box = $('#compare');
    var range = $('#cmp-range');
    if (!box || !range) return;
    range.addEventListener('input', function () { box.style.setProperty('--x', range.value + '%'); });
    // Pequeña pista de movimiento la primera vez que se ve
    if (reduceMotion) return;
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      (function anim(t) {
        var p = Math.min((t - t0) / 1600, 1);
        var v = 50 + Math.sin(p * Math.PI * 2) * 18;
        box.style.setProperty('--x', v + '%');
        range.value = v;
        if (p < 1) requestAnimationFrame(anim);
      })(t0);
    }, { threshold: 0.6 });
    io.observe(box);
  })();

  // ---------------------------------------------------------
  // 8. Selector de dispositivo y tema de las capturas
  // ---------------------------------------------------------
  (function devices() {
    var stage = $('#devstage');
    var img = $('#dev-img');
    var cap = $('#dev-cap');
    if (!stage) return;
    var dev = 'web';
    var mode = 'claro';
    var names = { web: 'Web', tablet: 'Tablet', movil: 'Móvil' };
    var modes = { claro: 'Amanecer andino', oscuro: 'Noche en la cordillera' };
    function render() {
      img.classList.add('swap');
      setTimeout(function () {
        stage.dataset.dev = dev;
        img.src = 'media/' + dev + '-' + mode + '.webp';
        img.alt = 'Apu Coach en ' + names[dev].toLowerCase() + ', tema ' + mode;
        cap.textContent = names[dev] + ' · ' + modes[mode];
      }, 200);
    }
    img.addEventListener('load', function () { img.classList.remove('swap'); });
    $$('[data-dev]', document).forEach(function (b) {
      if (b === stage) return;
      b.addEventListener('click', function () {
        dev = b.dataset.dev;
        $$('button[data-dev]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        render();
      });
    });
    $$('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.mode;
        $$('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        render();
      });
    });
    // Precarga del resto de capturas
    setTimeout(function () {
      ['web', 'tablet', 'movil'].forEach(function (d) {
        ['claro', 'oscuro'].forEach(function (m) { new Image().src = 'media/' + d + '-' + m + '.webp'; });
      });
    }, 3000);
  })();

  // ---------------------------------------------------------
  // 9. Tutorial de conexión
  // ---------------------------------------------------------
  (function tutorial() {
    // Paso activo en el índice lateral
    var links = $$('.tut-nav a');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.step').forEach(function (s) { io.observe(s); });
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        $(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Instrucciones por marca
    var TIPS = {
      garmin: ['En Conexiones toca la tarjeta <b>connect · powered by Garmin</b> e inicia sesión con tu cuenta de Garmin.',
        'Marca <b>Descargar actividades</b> y <b>Descargar datos de bienestar</b>.',
        'Pulsa <b>Importar todos los datos de Garmin</b> para traer tu historial.',
        'Sincroniza el reloj con la app Garmin Connect del móvil: desde ahí todo llega solo.'],
      coros: ['En Conexiones toca la tarjeta <b>COROS</b> e inicia sesión con tu cuenta COROS.',
        'Marca <b>Descargar actividades</b> y <b>Descargar datos de bienestar</b>.',
        'Sincroniza el reloj con la app COROS; tus actividades pasarán a Intervals.icu.'],
      suunto: ['En Conexiones toca la tarjeta <b>SUUNTO</b> e inicia sesión con tu cuenta Suunto.',
        'Marca <b>Descargar actividades</b> y <b>Descargar datos de bienestar</b>.',
        'Pulsa <b>Descargar datos antiguos</b> en ambos para traer tu historial.'],
      polar: ['En Conexiones toca la tarjeta <b>POLAR</b> e inicia sesión con tu cuenta Polar Flow.',
        'Marca <b>Descargar actividades</b> y <b>Descargar datos de bienestar</b>.',
        'Pulsa <b>Importar todos los datos de Polar</b> para traer tu historial.'],
      apple: ['Apple Watch no tiene tarjeta propia en Conexiones.',
        'Usa una app de iPhone que envíe tus entrenos y datos de Salud a Intervals.icu, como <b>HealthFit</b> o <b>RunGap</b>.',
        'En esa app elige Intervals.icu como destino y activa la sincronización automática.']
    };
    var tip = $('#brand-tip');
    function showBrand(k) {
      $$('[data-brand]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.brand === k ? 'true' : 'false'); });
      tip.innerHTML = '<ol>' + TIPS[k].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>';
    }
    $$('[data-brand]').forEach(function (b) { b.addEventListener('click', function () { showBrand(b.dataset.brand); }); });
    showBrand('garmin');

    if (APP_URL) {
      $$('.app-link').forEach(function (a) { a.href = APP_URL; a.hidden = false; });
    }
  })();

  // ---------------------------------------------------------
  // 10. Comunidad: muro de comentarios (Google Sheets vía Apps Script)
  // ---------------------------------------------------------
  (function community() {
    var STORAGE_KEY = 'apu-feedback-local';
    var allPosts = [];
    var activeFilter = 'Todos';

    if (!FEEDBACK_ENDPOINT) $('#fb-preview').hidden = false;

    function getLocalPosts() {
      try { return JSON.parse(store(STORAGE_KEY) || '[]'); } catch (e) { return []; }
    }
    function saveLocalPost(p) {
      var arr = getLocalPosts();
      arr.unshift(p);
      store(STORAGE_KEY, JSON.stringify(arr.slice(0, 50)));
    }

    function typeClass(t) {
      return { Bug: 't-bug', Mejora: 't-mejora', 'Felicitación': 't-fel' }[t] || 't-idea';
    }
    function icon(id) { return '<svg class="ic" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
    function typeLabel(t) {
      return {
        Bug: icon('i-bug') + 'Bug',
        Mejora: icon('i-bolt') + 'Mejora',
        'Felicitación': icon('i-heart') + 'Experiencia'
      }[t] || icon('i-bulb') + 'Idea';
    }
    function fmtDate(iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function esc(s) {
      var d = document.createElement('div');
      d.textContent = s == null ? '' : String(s);
      return d.innerHTML;
    }

    function updateCounters() {
      var n = function (f) { return allPosts.filter(f).length; };
      $('#cnt-total').textContent = allPosts.length;
      $('#cnt-mejora').textContent = n(function (x) { return x.tipo === 'Mejora'; });
      $('#cnt-bug').textContent = n(function (x) { return x.tipo === 'Bug'; });
      $('#cnt-idea').textContent = n(function (x) { return x.tipo === 'Idea' || x.tipo === 'Felicitación'; });
    }

    function renderFeed() {
      var feed = $('#feed-list');
      updateCounters();
      var list = allPosts.filter(function (p) { return activeFilter === 'Todos' || p.tipo === activeFilter; });
      if (!list.length) {
        feed.innerHTML = '<div class="empty"><svg class="mark" aria-hidden="true"><use href="#apu-iso"/></svg>' +
          '<h3>' + (allPosts.length ? 'Nada en esta categoría todavía' : 'Sé la primera persona en comentar') + '</h3>' +
          '<p>Tu aporte ayuda a que Apu entrene mejor a todos.</p></div>';
        return;
      }
      feed.innerHTML = list.map(function (p) {
        return '<article class="post ' + typeClass(p.tipo) + '">' +
          '<header><span class="badge">' + typeLabel(p.tipo) + '</span>' +
          (p.area ? '<span class="area">' + esc(p.area) + '</span>' : '') +
          (p.estado ? '<span class="st">● ' + esc(p.estado) + '</span>' : '') + '</header>' +
          '<p>' + esc(p.mensaje) + '</p>' +
          '<footer><b>' + esc(p.nombre || 'Anónimo') + '</b>' + (fmtDate(p.fecha) ? ' · ' + fmtDate(p.fecha) : '') + '</footer>' +
          '</article>';
      }).join('');
    }

    function mergePosts(remote) {
      var seen = {};
      allPosts = [];
      getLocalPosts().concat(remote || []).forEach(function (it) {
        var key = (it.mensaje || '') + '|' + (it.nombre || '');
        if (it.mensaje && !seen[key]) { seen[key] = true; allPosts.push(it); }
      });
      allPosts.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
      renderFeed();
    }

    function loadFeedback() {
      mergePosts([]);
      if (!FEEDBACK_ENDPOINT) return;
      fetch(FEEDBACK_ENDPOINT)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && Array.isArray(data.items)) {
            // Lo que ya llegó a la hoja deja de guardarse localmente
            store(STORAGE_KEY, '[]');
            mergePosts(data.items);
          }
        })
        .catch(function () {});
    }

    $$('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeFilter = btn.dataset.filter;
        $$('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        renderFeed();
      });
    });

    var msgInput = $('#fb-mensaje');
    var charCount = $('#fb-chars');
    msgInput.addEventListener('input', function () { charCount.textContent = msgInput.value.length + ' / 600'; });

    var form = $('#fb-form');
    var formMsg = $('#fb-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      if (fd.get('website')) return; // honeypot

      var post = {
        id: 'local-' + Date.now(),
        fecha: new Date().toISOString(),
        nombre: (fd.get('nombre') || '').trim() || 'Anónimo',
        tipo: fd.get('tipo') || 'Mejora',
        area: fd.get('area') || '',
        mensaje: (fd.get('mensaje') || '').trim(),
        estado: 'Nuevo'
      };
      var email = (fd.get('email') || '').trim();

      if (post.mensaje.length < 5) {
        formMsg.className = 'form-msg err';
        formMsg.textContent = 'Escribe al menos 5 caracteres.';
        msgInput.focus();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;

      function done(ok) {
        btn.disabled = false;
        formMsg.className = 'form-msg ' + (ok ? 'ok' : 'err');
        formMsg.textContent = ok
          ? '¡Gracias! Tu comentario ya está en el muro.'
          : 'No pudimos enviarlo. Revisa tu conexión e inténtalo otra vez.';
        if (ok) { form.reset(); charCount.textContent = '0 / 600'; }
      }

      if (!FEEDBACK_ENDPOINT) {
        saveLocalPost(post);
        mergePosts([]);
        done(true);
        return;
      }

      // text/plain evita el preflight CORS que Apps Script no responde
      fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ nombre: post.nombre, email: email, tipo: post.tipo, area: post.area, mensaje: post.mensaje })
      }).then(function () {
        saveLocalPost(post);
        mergePosts([]);
        done(true);
      }).catch(function () { done(false); });
    });

    loadFeedback();
  })();

  // ---------------------------------------------------------
  // Inicio
  // ---------------------------------------------------------
  route();
})();
