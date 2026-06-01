(function () {
  'use strict';

  var cover = document.getElementById('cover');
  var doors = document.getElementById('coverDoors');

  function enter() {
    if (!cover || cover.classList.contains('opening')) return;
    cover.classList.add('opening');
    window.scrollTo(0, 0);
    document.body.classList.remove('cover-open');
    setTimeout(function () { document.body.classList.add('entered'); }, 200);
    setTimeout(function () { cover.style.display = 'none'; }, 1600);
  }

  if (doors) {
    doors.addEventListener('click', enter);
    doors.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
    });
  }
  if (cover) {
    setTimeout(function () { cover.addEventListener('click', enter); }, 4000);
  }
  // If the user arrives with a hash (deep link), open straight away.
  if (cover && window.location.hash && window.location.hash !== '#top') {
    enter();
  }
  // Subpages have no cover — render entered immediately so nav and content show.
  if (!cover) {
    document.body.classList.add('entered');
  }

  // Replay the chapel intro. On the home page it re-runs in place; from a
  // subpage (no cover present) it returns home where the intro plays fresh.
  function restartCover() {
    if (!cover) {
      window.location.href = '/';
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    cover.style.display = 'block';
    cover.classList.remove('opening');
    document.body.classList.remove('entered');
    document.body.classList.add('cover-open');
    var animated = [
      cover.querySelector('.cover-art'),
      cover.querySelector('.cover-mono'),
      cover.querySelector('.cover-verse'),
      cover.querySelector('.cover-cue')
    ];
    animated.forEach(function (el) { if (el) el.style.animation = 'none'; });
    void cover.offsetWidth; // force reflow so the animations restart
    animated.forEach(function (el) { if (el) el.style.animation = ''; });
  }

  // Inject the replay control into the footer on every page.
  var footer = document.querySelector('footer');
  if (footer) {
    var replay = document.createElement('button');
    replay.type = 'button';
    replay.className = 'replay-cover';
    replay.innerHTML = '&#8635; Replay the chapel';
    footer.appendChild(replay);
    replay.addEventListener('click', restartCover);
  }

  // nav scroll behavior — switches to dark-on-light over any paper section
  var nav = document.getElementById('nav');
  var lightZones = Array.from(document.querySelectorAll(
    '.light-section, .ceremony-bleed, .lattice-section, .quote-section, .countdown, .section-strip, .section-portals, .almanac'
  ));

  function updateNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 60);
    var probe = 80;
    var overLight = lightZones.some(function (el) {
      var r = el.getBoundingClientRect();
      return r.top < probe && r.bottom > probe;
    });
    nav.classList.toggle('light', overLight || document.body.classList.contains('subpage'));
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav, { passive: true });
  updateNav();

  // Mobile menu toggle
  var navToggle = document.getElementById('navToggle');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('menu-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && nav.classList.contains('menu-open')) {
        nav.classList.remove('menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Countdown to 2027-03-20T16:00:00-05:00
  var target = new Date('2027-03-20T16:00:00-05:00').getTime();
  var fields = {
    days: document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    minutes: document.querySelector('[data-cd="minutes"]'),
    seconds: document.querySelector('[data-cd="seconds"]')
  };
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) {
      if (fields.days) fields.days.textContent = '0';
      if (fields.hours) fields.hours.textContent = '00';
      if (fields.minutes) fields.minutes.textContent = '00';
      if (fields.seconds) fields.seconds.textContent = '00';
      return;
    }
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (fields.days) fields.days.textContent = d;
    if (fields.hours) fields.hours.textContent = pad(h);
    if (fields.minutes) fields.minutes.textContent = pad(m);
    if (fields.seconds) fields.seconds.textContent = pad(sec);
  }
  if (fields.days || fields.hours || fields.minutes || fields.seconds) {
    tick();
    setInterval(tick, 1000);
  }

  // RSVP form — graceful fallback if Formspree id isn't set
  var rsvpForm = document.getElementById('rsvpForm');
  var rsvpNote = document.getElementById('rsvpNote');
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (rsvpForm.elements['name'].value || '').trim();
      if (!name) {
        if (rsvpNote) {
          rsvpNote.textContent = 'Please enter your name as printed on the card.';
          rsvpNote.className = 'portal-feedback error';
        }
        return;
      }
      var action = rsvpForm.getAttribute('action') || '';
      if (action.indexOf('your-id') !== -1 || !action) {
        if (rsvpNote) {
          rsvpNote.textContent = 'Thank you, ' + name + '. Your reply will be received once the form is connected.';
          rsvpNote.className = 'portal-feedback success';
        }
        return;
      }
      fetch(action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(rsvpForm)
      }).then(function (r) {
        if (r.ok) {
          if (rsvpNote) {
            rsvpNote.textContent = 'Thank you, ' + name + '. We have your reply.';
            rsvpNote.className = 'portal-feedback success';
          }
          rsvpForm.reset();
        } else {
          throw new Error('failed');
        }
      }).catch(function () {
        if (rsvpNote) {
          rsvpNote.textContent = 'Something prevented your reply from sending. Please try again or write to us.';
          rsvpNote.className = 'portal-feedback error';
        }
      });
    });
  }

  // Honeymoon amounts feedback
  var honeyNote = document.getElementById('honeymoonNote');
  document.querySelectorAll('.honeymoon-amounts .amt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var amt = btn.getAttribute('data-amt');
      if (honeyNote) {
        honeyNote.textContent = amt === 'other'
          ? 'Thank you. A note from us is on its way with the contribution link.'
          : 'Thank you. $' + amt + ' — a note from us is on its way with the contribution link.';
        honeyNote.className = 'portal-feedback success';
      }
    });
  });
})();
