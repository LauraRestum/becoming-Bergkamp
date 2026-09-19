/* Save-the-Date — envelope reveal, cycling photo frames, and the
   "coming soon" note. The full wedding website isn't live yet; tapping the
   wax seal simply lets guests know it's on its way. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------- Envelope reveal ------------------------ */
  /* The envelope is a single button holding a stack of pre-composed layers:
     one closed envelope, then the filled "save the date" compositions. Tap
     anywhere on it to cross-fade from the closed envelope to the open
     composition, then gently cycle through the photo variants. */
  var opener = document.getElementById('opener');
  var closedLayer = document.querySelector('.env-layer.closed');
  var openLayers = Array.prototype.slice.call(document.querySelectorAll('.env-layer.open'));
  var opened = false;

  function openEnvelope() {
    if (opened) return;
    opened = true;
    // The tap that opens the envelope is a real user gesture, so it's the
    // moment we're allowed to begin the music. (See music.js.)
    if (window.BKMusic) window.BKMusic.start();
    document.body.classList.add('opening');
    if (closedLayer) closedLayer.classList.remove('active');
    if (openLayers[0]) openLayers[0].classList.add('active');
    if (reduce) { document.body.classList.add('opened'); startFrames(); return; }
    setTimeout(function () { document.body.classList.add('opened'); startFrames(); }, 700);
  }
  if (opener) opener.addEventListener('click', openEnvelope);

  /* --------------- Cycling save-the-date compositions --------------- */
  var framesStarted = false;
  function startFrames() {
    if (framesStarted) return;
    framesStarted = true;
    if (openLayers.length < 2) return;
    var i = 0;
    setInterval(function () {
      openLayers[i].classList.remove('active');
      i = (i + 1) % openLayers.length;
      openLayers[i].classList.add('active');
    }, 5200);
  }

  /* ----------------------- "Coming soon" note ----------------------- */
  /* Tapping the wax seal opens a small note letting guests know the full
     wedding website is on its way. No passcode, no gate — just a message. */
  var gate = document.getElementById('gate');
  var gateClose = document.getElementById('gateClose');
  var seal = document.getElementById('seal');
  var lastFocus = null;

  function openGate() {
    if (!gate) return;
    lastFocus = document.activeElement;
    gate.classList.add('open');
    gate.setAttribute('aria-hidden', 'false');
    setTimeout(function () { if (gateClose) gateClose.focus(); }, 380);
  }
  function closeGate() {
    if (!gate) return;
    gate.classList.remove('open');
    gate.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  if (seal) seal.addEventListener('click', openGate);
  if (gateClose) gateClose.addEventListener('click', closeGate);
  if (gate) gate.addEventListener('click', function (e) { if (e.target === gate) closeGate(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && gate && gate.classList.contains('open')) closeGate(); });
})();
