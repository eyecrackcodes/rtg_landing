/* ═══════════════════════════════════════════════════════════
   BOLD FC — front-end behaviour
   Zero dependencies. Vanilla only.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── year ─────────────────────────────────────────────── */
  var yr = $('#yr');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ── sticky nav state ─────────────────────────────────── */
  var nav = $('#nav');
  var onScroll = function () {
    nav.setAttribute('data-stuck', window.scrollY > 24 ? '1' : '0');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── mobile nav ───────────────────────────────────────── */
  var burger = $('.burger');
  var mobnav = $('#mobnav');
  var lockedAt = 0;

  var isOpen = function () { return burger.getAttribute('aria-expanded') === 'true'; };

  /* iOS won't honour overflow:hidden on body alone — pin the scroll
     position, then restore it exactly on close.
     `restore` is false when an anchor link closed the menu, so we don't
     fight the browser's jump to the target section. */
  var setMenu = function (open, restore) {
    if (open === isOpen()) return;
    burger.setAttribute('aria-expanded', String(open));
    mobnav.hidden = !open;

    if (open) {
      lockedAt = window.scrollY;
      document.body.style.top = -lockedAt + 'px';
      document.body.classList.add('is-locked');
      return;
    }

    document.body.classList.remove('is-locked');
    document.body.style.top = '';
    if (restore === false) return;
    try { window.scrollTo({ top: lockedAt, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, lockedAt); }
  };

  burger.addEventListener('click', function () { setMenu(!isOpen()); });

  $$('#mobnav a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false, false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  /* rotate to landscape / resize to desktop with the menu open → close it,
     otherwise the body stays locked with no visible way to unlock. */
  var mq = window.matchMedia('(min-width:1001px)');
  var onWide = function (e) { if (e.matches) setMenu(false); };
  if (mq.addEventListener) mq.addEventListener('change', onWide);
  else if (mq.addListener) mq.addListener(onWide);

  /* ── scroll reveal ────────────────────────────────────── */
  var revealables = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ── textarea counter ─────────────────────────────────── */
  var looking = $('#looking');
  var count = $('#count');
  if (looking && count) {
    var tick = function () {
      var n = looking.value.trim().length;
      count.textContent = n ? n + (n === 1 ? ' char' : ' chars') : '';
    };
    looking.addEventListener('input', tick);
    tick();
  }

  /* ═════════════════════════════════════════════════════════
     FORM
     ═════════════════════════════════════════════════════════ */
  var form = $('#interestForm');
  if (!form) return;

  var btn     = $('#submitBtn');
  var btnText = $('.btn__t', btn);
  var fail    = $('#formFail');
  var done    = $('#done');
  var doneMsg = $('#doneMsg');

  var RULES = {
    parentName: { label: 'Parent name',  test: function (v) { return v.length >= 2; },  msg: 'Please enter your full name.' },
    playerName: { label: 'Player name',  test: function (v) { return v.length >= 2; },  msg: 'Please enter your player’s name.' },
    email:      { label: 'Email',        test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v); }, msg: 'Please enter a valid email address.' },
    phone:      { label: 'Phone',        test: function (v) { return (v.replace(/\D/g, '').length >= 10); },     msg: 'Please enter a 10-digit phone number.' },
    age:        { label: 'Age',          test: function (v) { var n = Number(v); return v !== '' && n >= 4 && n <= 19; }, msg: 'Age should be between 4 and 19.' },
    birthYear:  { label: 'Birth year',   test: function (v) { return v !== ''; },  msg: 'Please select a birth year.' },
    position:   { label: 'Position',     test: function (v) { return v !== ''; },  msg: 'Please pick a position (or “Not sure yet”).' },
    looking:    { label: 'This question', test: function (v) { return v.length >= 10; }, msg: 'Tell us a little more — even one sentence helps.' }
  };

  var showErr = function (name, msg) {
    var slot = $('[data-err="' + name + '"]');
    var input = form.elements[name];
    if (slot) { slot.textContent = msg || ''; if (msg) slot.setAttribute('data-on', '1'); else slot.removeAttribute('data-on'); }
    if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  };

  var checkField = function (name) {
    var rule = RULES[name];
    var input = form.elements[name];
    if (!rule || !input) return true;
    var ok = rule.test(String(input.value).trim());
    showErr(name, ok ? '' : rule.msg);
    return ok;
  };

  /* validate on blur, clear the error as soon as they fix it */
  Object.keys(RULES).forEach(function (name) {
    var input = form.elements[name];
    if (!input) return;
    input.addEventListener('blur', function () { checkField(name); });
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') checkField(name);
    });
    input.addEventListener('change', function () {
      if (input.getAttribute('aria-invalid') === 'true') checkField(name);
    });
  });

  /* phone formatting — light touch, US style, never blocks typing */
  var phone = form.elements.phone;
  phone.addEventListener('input', function () {
    var d = phone.value.replace(/\D/g, '').slice(0, 10);
    if (!d) { phone.value = ''; return; }
    if (d.length < 4)      phone.value = '(' + d;
    else if (d.length < 7) phone.value = '(' + d.slice(0, 3) + ') ' + d.slice(3);
    else                   phone.value = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    fail.hidden = true;

    var firstBad = null;
    Object.keys(RULES).forEach(function (name) {
      if (!checkField(name) && !firstBad) firstBad = name;
    });
    if (firstBad) {
      var el = form.elements[firstBad];
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    data.submittedAt = new Date().toISOString();
    data.source = 'boldfc-landing';
    data.pageUrl = window.location.href;

    btn.disabled = true;
    btnText.textContent = 'Sending…';

    fetch('/api/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) throw new Error(body.error || ('Request failed (' + res.status + ')'));
          return body;
        });
      })
      .then(function () {
        if (data.playerName) {
          doneMsg.innerHTML = 'Thanks, ' + esc(firstNameOf(data.parentName)) +
            ' — we’ve got <b>' + esc(data.playerName) + '’s</b> details. You’ll be among the first to hear about ' +
            'open sessions, tryout dates, and age groups.';
        }
        form.hidden = true;
        done.hidden = false;
        done.setAttribute('tabindex', '-1');
        done.focus({ preventScroll: true });
        done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (err) {
        btn.disabled = false;
        btnText.textContent = 'Send My Interest';
        fail.hidden = false;
        fail.textContent = 'Something went wrong sending that (' + err.message +
          '). Please try again, or email hello@boldfctaylor.com and we’ll add you manually.';
      });
  });

  function firstNameOf(full) { return String(full).trim().split(/\s+/)[0] || 'there'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})();
