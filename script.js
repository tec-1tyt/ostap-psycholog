/* =========================================================
   Остап — психолог · інтерактив
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     НАЛАШТУВАННЯ — заповнити реальними даними
     --------------------------------------------------------- */
  var CONFIG = {
    email:     '',   // напр. 'ostap@example.com'
    telegram:  '',   // напр. 'https://t.me/nickname'
    instagram: '',   // напр. 'https://instagram.com/nickname'

    // Якщо є бекенд або Formspree — вставити URL сюди, форма
    // почне слати POST. Якщо порожньо, але вказано email —
    // форма відкриє поштовий клієнт із заповненим листом.
    formEndpoint: ''
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------------------------------------------------------
     1. СМУГА ПРОГРЕСУ ЧИТАННЯ
     Ефект появи/розгортання блоків при скролі прибрано —
     секції тепер завжди в кінцевому вигляді (--p:1 за замовчуванням
     з @property у styles.css). Лишається лише індикатор прогресу.
     --------------------------------------------------------- */
  var Morph = (function () {
    var docH = 0, vh = 0, ticking = false;
    var progressBar = $('.progress__bar');

    function measure() {
      vh = window.innerHeight;
      docH = document.documentElement.scrollHeight - vh;
      update();
    }

    function update() {
      var y = window.scrollY || window.pageYOffset;
      if (progressBar && docH > 0) {
        progressBar.style.setProperty('--sp', clamp(y / docH, 0, 1));
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    return {
      init: function () {
        measure();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', measure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
        window.addEventListener('load', measure);
      }
    };
  })();

  /* ---------------------------------------------------------
     2. ПОЯВА ЕЛЕМЕНТІВ ПРИ СКРОЛІ
     --------------------------------------------------------- */
  function initRise() {
    var els = $$('[data-rise]');
    els.forEach(function (el) {
      var d = el.getAttribute('data-rise-d');
      if (d) el.style.setProperty('--rd', d);
    });

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     3. ЗАГОЛОВКИ: рядки виїжджають з-під маски
     --------------------------------------------------------- */
  function splitHeadings() {
    var heads = $$('[data-split]');
    if (!heads.length) return;

    heads.forEach(function (h) {
      if (!h.dataset.raw) h.dataset.raw = h.innerHTML;

      if (reduced) { h.classList.add('is-in'); return; }

      // 1) кожне слово в окремий inline-span, щоб зміряти рядки
      var words = h.dataset.raw.split(/\s+/).filter(Boolean);
      h.innerHTML = words.map(function (w) {
        return '<span class="w">' + w + '</span>';
      }).join(' ');

      // 2) групуємо слова за offsetTop → це і є візуальні рядки
      var spans = $$('.w', h), lines = [], cur = null, prevTop = null;
      spans.forEach(function (s) {
        var t = s.offsetTop;
        if (prevTop === null || Math.abs(t - prevTop) > 3) {
          cur = [];
          lines.push(cur);
          prevTop = t;
        }
        cur.push(s.innerHTML);
      });

      // 3) перебудова у маски
      h.innerHTML = lines.map(function (words, i) {
        return '<span class="line-mask" style="--ld:' + i + '"><span>' +
               words.join(' ') + '</span></span>';
      }).join('');
    });

    if (reduced || !('IntersectionObserver' in window)) {
      heads.forEach(function (h) { h.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.2 });

    heads.forEach(function (h) { io.observe(h); });
  }

  /* ---------------------------------------------------------
     4. ШАПКА + активний пункт навігації
     --------------------------------------------------------- */
  function initHeader() {
    var hdr = $('#hdr');
    var links = $$('.hdr__nav a');
    var heroH = function () { return (window.innerHeight * 0.72); };

    function onScroll() {
      if (!hdr) return;
      hdr.classList.toggle('is-stuck', (window.scrollY || 0) > heroH());
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (!('IntersectionObserver' in window) || !links.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('data-nav') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    ['about', 'work', 'approach', 'edu', 'reviews'].forEach(function (id) {
      var s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  /* ---------------------------------------------------------
     5. МОБІЛЬНЕ МЕНЮ
     --------------------------------------------------------- */
  function initMobnav() {
    var burger = $('#burger'), nav = $('#mobnav');
    if (!burger || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    }

    burger.addEventListener('click', function () {
      setOpen(nav.classList.contains('is-open') === false);
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ---------------------------------------------------------
     6. ЧИСЛА В СТАТИСТИЦІ — без анімації лічильника, одразу готове значення
     --------------------------------------------------------- */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      el.textContent = target.toLocaleString('uk-UA');
    });
  }

  /* ---------------------------------------------------------
     7. КАРУСЕЛІ (Освіта / Відгуки)
     --------------------------------------------------------- */
  function initRails() {
    $$('.rail').forEach(function (rail) {
      var key = rail.id.replace('rail-', '');
      var btns = $$('.rail-btn[data-rail="' + key + '"]');
      if (!btns.length) return;

      function stepSize() {
        var first = rail.firstElementChild;
        if (!first) return rail.clientWidth * 0.8;
        var gap = parseFloat(getComputedStyle(rail).columnGap || getComputedStyle(rail).gap) || 16;
        return first.getBoundingClientRect().width + gap;
      }

      function sync() {
        var max = rail.scrollWidth - rail.clientWidth - 2;
        btns.forEach(function (b) {
          var dir = parseInt(b.getAttribute('data-dir'), 10);
          b.disabled = dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max;
        });
      }

      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var dir = parseInt(b.getAttribute('data-dir'), 10);
          rail.scrollBy({ left: dir * stepSize(), behavior: reduced ? 'auto' : 'smooth' });
        });
      });

      rail.addEventListener('scroll', function () {
        window.requestAnimationFrame(sync);
      }, { passive: true });
      window.addEventListener('resize', sync);
      sync();
    });
  }

  /* ---------------------------------------------------------
     8. КОНТАКТИ + ФОРМА
     --------------------------------------------------------- */
  function initContacts() {
    var map = {
      email:     CONFIG.email ? 'mailto:' + CONFIG.email : '',
      telegram:  CONFIG.telegram,
      instagram: CONFIG.instagram
    };
    $$('[data-social]').forEach(function (a) {
      var href = map[a.getAttribute('data-social')];
      if (href) {
        a.href = href;
        if (href.indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
      }
    });
  }

  function initForm() {
    var form = $('#bookForm'), status = $('#formStatus');
    if (!form) return;

    function fail(msg) {
      if (status) { status.textContent = msg; status.className = 'form__status is-bad'; }
    }
    function ok(msg) {
      if (status) { status.textContent = msg; status.className = 'form__status is-ok'; }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var bad = false;
      $$('.field', form).forEach(function (f) {
        var input = $('input, textarea', f);
        if (!input) return;
        var empty = !input.value.trim();
        f.classList.toggle('is-bad', empty);
        if (empty) bad = true;
      });
      if (bad) { fail('Заповни, будь ласка, всі поля.'); return; }

      var data = {
        name:    $('#f-name').value.trim(),
        contact: $('#f-contact').value.trim(),
        message: $('#f-msg').value.trim()
      };

      // варіант 1 — свій бекенд / Formspree
      if (CONFIG.formEndpoint) {
        ok('Надсилаю…');
        fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error('bad status');
          form.reset();
          ok('Дякую. Я відповім упродовж доби.');
        }).catch(function () {
          fail('Не вдалось надіслати. Напиши, будь ласка, у Telegram або на пошту.');
        });
        return;
      }

      // варіант 2 — поштовий клієнт
      if (CONFIG.email) {
        var subject = 'Запис на сесію — ' + data.name;
        var body = 'Імʼя: ' + data.name + '\nКонтакт: ' + data.contact + '\n\nЗапит:\n' + data.message;
        window.location.href = 'mailto:' + CONFIG.email +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        ok('Відкрив поштовий клієнт — залишилось натиснути «Надіслати».');
        return;
      }

      // ще не налаштовано
      fail('Форма ще не підключена: вкажи email або formEndpoint у script.js.');
    });

    $$('input, textarea', form).forEach(function (i) {
      i.addEventListener('input', function () {
        var f = i.closest('.field');
        if (f) f.classList.remove('is-bad');
      });
    });
  }

  /* ---------------------------------------------------------
     9. ДРІБНИЦІ
     --------------------------------------------------------- */
  /* ---------------------------------------------------------
     СТАРТ
     --------------------------------------------------------- */
  function boot() {
    splitHeadings();
    Morph.init();
    initRise();
    initHeader();
    initMobnav();
    initCounters();
    initRails();
    initContacts();
    initForm();

    // після завантаження шрифтів рядки заголовків треба перерахувати
    if (document.fonts && document.fonts.ready && !reduced) {
      document.fonts.ready.then(function () {
        var done = $$('[data-split].is-in');
        splitHeadings();
        done.forEach(function (h) { h.classList.add('is-in'); });
      });
    }

    // перерахунок рядків при зміні ширини
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var done = $$('[data-split].is-in');
        splitHeadings();
        done.forEach(function (h) { h.classList.add('is-in'); });
      }, 220);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
