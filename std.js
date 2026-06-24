/* Save-the-Date — envelope reveal, cycling photo frames, countdown, and the
   soft passcode gate. The full wedding website lives at /home, behind this
   page. Entering the passcode unlocks it for the rest of this browser session;
   a fresh visit greets guests with the Save-the-Date again. A gentle
   speed-bump, not a vault. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     PASSCODE — to change it, replace the word below (keep it lowercase).
     Lightly obscured (base64): btoa('yourword') in a console gives the value.
     Current value decodes to: bergkamp
     ------------------------------------------------------------------ */
  var EXPECTED = atob('YmVyZ2thbXA=');
  var UNLOCK_KEY = 'bk_unlocked';
  var DESTINATION = '/home';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isUnlocked() { try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; } }
  function setUnlocked() { try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {} }

  /* ------------------------- Envelope reveal ------------------------ */
  var opener = document.getElementById('opener');
  var opened = false;

  function openEnvelope() {
    if (opened) return;
    opened = true;
    document.body.classList.add('opening');
    if (reduce) { document.body.classList.add('opened'); startFrames(); return; }
    setTimeout(function () { document.body.classList.add('opened'); startFrames(); }, 700);
  }
  if (opener) opener.addEventListener('click', openEnvelope);

  /* ------------------- Cycling photo frames ------------------------- */
  function cycler(el, interval, delay) {
    if (!el) return;
    var imgs = Array.prototype.slice.call(el.querySelectorAll('img'));
    if (imgs.length < 2) return;
    var i = 0;
    setTimeout(function () {
      setInterval(function () {
        imgs[i].classList.remove('active');
        i = (i + 1) % imgs.length;
        imgs[i].classList.add('active');
      }, interval);
    }, delay);
  }
  var framesStarted = false;
  function startFrames() {
    if (framesStarted) return;
    framesStarted = true;
    // Offset the two frames so they change at different moments.
    cycler(document.getElementById('frameOval'), 3600, 0);
    cycler(document.getElementById('frameRect'), 3600, 1800);
  }

  /* ---------------------------- Countdown --------------------------- */
  var fields = {
    days: document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    minutes: document.querySelector('[data-cd="minutes"]'),
    seconds: document.querySelector('[data-cd="seconds"]')
  };
  var target = new Date('2027-03-20T16:00:00-05:00').getTime();
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
    if (fields.days) fields.days.textContent = Math.floor(s / 86400);
    if (fields.hours) fields.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    if (fields.minutes) fields.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    if (fields.seconds) fields.seconds.textContent = pad(s % 60);
  }
  if (fields.days || fields.hours || fields.minutes || fields.seconds) { tick(); setInterval(tick, 1000); }

  /* ------------------------------ Gate ------------------------------ */
  var gate = document.getElementById('gate');
  var gateCard = document.getElementById('gateCard');
  var gateForm = document.getElementById('gateForm');
  var gateInput = document.getElementById('gateInput');
  var gateNote = document.getElementById('gateNote');
  var gateClose = document.getElementById('gateClose');
  var seal = document.getElementById('seal');
  var lastFocus = null;

  function go() { window.location.href = DESTINATION; }

  function openGate() {
    if (isUnlocked()) { go(); return; }
    if (!gate) return;
    lastFocus = document.activeElement;
    gate.classList.add('open');
    gate.setAttribute('aria-hidden', 'false');
    if (gateNote) { gateNote.textContent = ''; gateNote.className = 'gate-note'; }
    setTimeout(function () { if (gateInput) gateInput.focus(); }, 380);
  }
  function closeGate() {
    if (!gate) return;
    gate.classList.remove('open');
    gate.setAttribute('aria-hidden', 'true');
    if (gateInput) gateInput.value = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function reject() {
    if (gateNote) { gateNote.textContent = "That's not quite it — try again."; gateNote.className = 'gate-note error'; }
    if (gateCard) { gateCard.classList.remove('shake'); void gateCard.offsetWidth; gateCard.classList.add('shake'); }
    if (gateInput) { gateInput.value = ''; gateInput.focus(); }
  }
  function attempt(value) {
    var guess = (value || '').trim().toLowerCase();
    if (!guess) { if (gateInput) gateInput.focus(); return; }
    if (guess === EXPECTED) {
      setUnlocked();
      if (gateNote) { gateNote.textContent = 'Welcome — come on in.'; gateNote.className = 'gate-note'; }
      setTimeout(go, 420);
    } else { reject(); }
  }

  if (seal) seal.addEventListener('click', openGate);
  if (gateClose) gateClose.addEventListener('click', closeGate);
  if (gate) gate.addEventListener('click', function (e) { if (e.target === gate) closeGate(); });
  if (gateForm) gateForm.addEventListener('submit', function (e) { e.preventDefault(); attempt(gateInput ? gateInput.value : ''); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && gate && gate.classList.contains('open')) closeGate(); });
})();
