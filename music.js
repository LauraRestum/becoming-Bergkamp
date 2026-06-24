/* Ambient music for the wedding site.
   ------------------------------------------------------------------
   Browsers refuse to play sound until the visitor has interacted with
   the page, so we never "autoplay" in the literal sense — playback is
   *started* from a gesture the guest already makes: opening the envelope
   on the Save-the-Date (see std.js), or the first tap on any later page.
   To the guest it feels automatic; to the browser it's a blessed gesture.

   The site is multi-page (every nav link reloads), so this module also
   carries the music across pages: it remembers whether the music is on
   and where it left off in sessionStorage, and resumes seamlessly.

   TO ADD YOUR TRACK: drop an mp3 at the path in SRC below
   (default: /audio/theme.mp3). A soft, looping instrumental works best.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var SRC = '/audio/theme.mp3'; // ← your music file goes here
  var VOLUME = 0.35;            // gentle by default (0–1)
  var FADE_MS = 1400;           // fade-in when the music first starts
  var ON_KEY = 'bk_music_on';   // '1' = playing, '0' = muted by the guest
  var TIME_KEY = 'bk_music_time'; // last playback position, in seconds

  function read(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { sessionStorage.setItem(key, val); } catch (e) {} }

  // "started" once the guest has engaged the music at all (on OR muted).
  function hasStarted() { return read(ON_KEY) !== null; }
  function wantsOn() { return read(ON_KEY) === '1'; }

  /* ----------------------------- audio ---------------------------- */
  var audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.src = SRC;
  audio.volume = VOLUME;

  var savedTime = parseFloat(read(TIME_KEY));
  if (!isNaN(savedTime) && savedTime > 0) {
    audio.addEventListener('loadedmetadata', function () {
      try { if (savedTime < audio.duration) audio.currentTime = savedTime; } catch (e) {}
    });
  }

  // Remember where we are so the next page picks up here, not at zero.
  audio.addEventListener('timeupdate', function () {
    if (!audio.paused) write(TIME_KEY, audio.currentTime);
  });
  window.addEventListener('pagehide', function () {
    if (!audio.paused) write(TIME_KEY, audio.currentTime);
  });

  function fadeIn() {
    if (FADE_MS <= 0) { audio.volume = VOLUME; return; }
    audio.volume = 0;
    var steps = 24, i = 0;
    var timer = setInterval(function () {
      i++;
      audio.volume = Math.min(VOLUME, (i / steps) * VOLUME);
      if (i >= steps) clearInterval(timer);
    }, FADE_MS / 24);
  }

  function play(fade) {
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () { if (fade) fadeIn(); reflect(); })
       .catch(function () { resumeOnGesture(); });
    } else {
      if (fade) fadeIn();
      reflect();
    }
  }

  // If the browser blocks a resume on page load (no gesture yet), wait for
  // the very next tap/scroll/key anywhere and start then. Removes itself.
  var armed = false;
  function resumeOnGesture() {
    if (armed) return;
    armed = true;
    var events = ['pointerdown', 'touchstart', 'keydown', 'scroll'];
    function go() {
      events.forEach(function (ev) { document.removeEventListener(ev, go, true); });
      armed = false;
      if (wantsOn()) play(false);
    }
    events.forEach(function (ev) { document.addEventListener(ev, go, true); });
  }

  /* ---------------------------- toggle ---------------------------- */
  var btn;
  function buildToggle() {
    var style = document.createElement('style');
    style.textContent =
      '.bk-music{position:fixed;z-index:60;left:calc(16px + env(safe-area-inset-left));' +
      'bottom:calc(16px + env(safe-area-inset-bottom));width:46px;height:46px;border-radius:50%;' +
      'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
      'background:linear-gradient(180deg,#f6f1e7,#efe7d8);color:#35472f;' +
      'border:1px solid rgba(53,71,47,0.45);box-shadow:0 6px 16px rgba(53,71,47,0.30);' +
      'opacity:0;transform:scale(0.9);pointer-events:none;' +
      'transition:opacity 360ms ease,transform 360ms ease,background 200ms ease;}' +
      '.bk-music.show{opacity:0.92;transform:scale(1);pointer-events:auto;}' +
      '.bk-music:hover,.bk-music:focus-visible{opacity:1;background:#fff;}' +
      '.bk-music svg{width:20px;height:20px;}' +
      '.bk-music .off{display:none;}' +
      '.bk-music.muted .on{display:none;}' +
      '.bk-music.muted .off{display:block;}';
    document.head.appendChild(style);

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bk-music';
    btn.setAttribute('aria-label', 'Toggle music');
    btn.innerHTML =
      '<svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 10v4h4l5 4V6L7 10H3z"/><path d="M16 9a4 4 0 0 1 0 6"/>' +
      '<path d="M18.5 6.5a7 7 0 0 1 0 11"/></svg>' +
      '<svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 10v4h4l5 4V6L7 10H3z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>';
    btn.addEventListener('click', function () {
      if (audio.paused) { write(ON_KEY, '1'); play(false); }
      else { audio.pause(); write(ON_KEY, '0'); reflect(); }
    });
    document.body.appendChild(btn);
    reflect();
  }

  function reflect() {
    if (!btn) return;
    var on = !audio.paused;
    btn.classList.toggle('muted', !on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? 'Pause music' : 'Play music';
    // Show the control once music is in play, so the pristine Save-the-Date
    // screen stays clean until the envelope is opened.
    var isStart = location.pathname === '/' || location.pathname === '/index.html';
    if (hasStarted() || !isStart) btn.classList.add('show');
  }

  /* --------------------------- lifecycle -------------------------- */
  function init() {
    buildToggle();
    if (wantsOn()) play(true); // resume across a page navigation
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public hook — std.js calls this from the envelope-open tap (a real
  // user gesture), which is what lets the sound actually begin.
  window.BKMusic = {
    start: function () {
      if (read(ON_KEY) === '0') return; // guest muted on purpose; respect it
      write(ON_KEY, '1');
      play(true);
      if (btn) btn.classList.add('show');
    },
    toggle: function () { if (btn) btn.click(); }
  };
})();
