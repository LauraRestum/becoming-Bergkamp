/* Save-the-Date — countdown + the soft passcode gate.
   The full wedding website lives at /home, behind this page. Entering the
   passcode unlocks it for the rest of this browser session, so guests can roam
   freely once they are in; a fresh visit greets them with the Save-the-Date
   again. This is a gentle speed-bump, not a vault. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     PASSCODE — to change it, replace the word below (keep it lowercase).
     It is lightly obscured (base64) so it isn't sitting in plain sight;
     btoa('yourword') in any browser console gives you the new value.
     Current value decodes to: bergkamp
     ------------------------------------------------------------------ */
  var EXPECTED = atob('YmVyZ2thbXA=');
  var UNLOCK_KEY = 'bk_unlocked';
  var DESTINATION = '/home';

  function isUnlocked() {
    try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; }
  }
  function setUnlocked() {
    try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
  }

  /* ---------------------------- Countdown --------------------------- */
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
    if (fields.days) fields.days.textContent = Math.floor(s / 86400);
    if (fields.hours) fields.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    if (fields.minutes) fields.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    if (fields.seconds) fields.seconds.textContent = pad(s % 60);
  }
  if (fields.days || fields.hours || fields.minutes || fields.seconds) {
    tick();
    setInterval(tick, 1000);
  }

  /* ------------------------------ Gate ------------------------------ */
  var gate = document.getElementById('gate');
  var gateCard = document.getElementById('gateCard');
  var gateForm = document.getElementById('gateForm');
  var gateInput = document.getElementById('gateInput');
  var gateNote = document.getElementById('gateNote');
  var gateClose = document.getElementById('gateClose');
  var seal = document.getElementById('seal');
  var enterBtn = document.getElementById('enterBtn');
  var lastFocus = null;

  function go() { window.location.href = DESTINATION; }

  function openGate() {
    // Already unlocked this session? Skip the passcode and walk straight in.
    if (isUnlocked()) { go(); return; }
    if (!gate) { return; }
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
    if (gateCard) {
      gateCard.classList.remove('shake');
      void gateCard.offsetWidth; // restart the animation
      gateCard.classList.add('shake');
    }
    if (gateInput) { gateInput.value = ''; gateInput.focus(); }
  }

  function attempt(value) {
    var guess = (value || '').trim().toLowerCase();
    if (!guess) { if (gateInput) gateInput.focus(); return; }
    if (guess === EXPECTED) {
      setUnlocked();
      if (gateNote) { gateNote.textContent = 'Welcome — come on in.'; gateNote.className = 'gate-note'; }
      setTimeout(go, 420);
    } else {
      reject();
    }
  }

  if (seal) seal.addEventListener('click', openGate);
  if (enterBtn) enterBtn.addEventListener('click', openGate);
  if (gateClose) gateClose.addEventListener('click', closeGate);
  if (gate) {
    gate.addEventListener('click', function (e) { if (e.target === gate) closeGate(); });
  }
  if (gateForm) {
    gateForm.addEventListener('submit', function (e) { e.preventDefault(); attempt(gateInput ? gateInput.value : ''); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && gate && gate.classList.contains('open')) closeGate();
  });
})();
