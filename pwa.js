/* Bergkamp Wedding — "Add to Home Screen" pop-up.
   Most visitors arrive by scanning a QR code on their phone, so this shows a
   centred, mobile-first pop-up (dimmed backdrop + app icon) inviting them to
   install the site to their home screen for a full-screen, app-like experience.
   - Android/Chrome: a button that fires the real install dialog.
   - iPhone/Safari: Share -> Add to Home Screen instructions.
   - Already installed (standalone) or previously dismissed: shows nothing.
   This file only ADDS the pop-up element + its own scoped styles; it does not
   touch existing page content, layout, or CSS. */
(function () {
  'use strict';

  // Don't show anything if the app is already running installed.
  var isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (isStandalone) return;

  // Respect a previous dismissal so we're not naggy.
  try {
    if (localStorage.getItem('bergkamp-install-dismissed') === '1') return;
  } catch (e) {}

  var ua = window.navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  // On iPad, iPadOS 13+ reports as a Mac; catch it via touch support.
  if (!isIOS && /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) isIOS = true;

  // How long to wait after the page settles before inviting (ms).
  var SHOW_DELAY = 1100;

  // --- Scoped styles, matched to the site (serif display, ink + gold) ---
  var style = document.createElement('style');
  style.textContent = [
    /* Dimmed backdrop that fades in behind the card. */
    '.pwa-backdrop{position:fixed;inset:0;z-index:9998;background:rgba(8,8,8,0.62);',
    '-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);opacity:0;',
    'transition:opacity 420ms ease;display:flex;align-items:center;justify-content:center;',
    'padding:24px;box-sizing:border-box;}',
    '.pwa-backdrop.pwa-show{opacity:1;}',
    /* Centred pop-up card. */
    '.pwa-install{position:relative;width:min(360px,calc(100vw - 40px));',
    'background:#111;color:#f0f0f0;border:1px solid rgba(184,145,73,0.55);',
    'border-radius:5px;box-shadow:0 24px 70px rgba(0,0,0,0.6);',
    'padding:30px 26px 26px;font-family:"Rosaline",serif;text-align:center;',
    'transform:translateY(14px) scale(0.97);opacity:0;',
    'transition:transform 480ms cubic-bezier(.22,1,.36,1),opacity 420ms ease;}',
    '.pwa-backdrop.pwa-show .pwa-install{transform:translateY(0) scale(1);opacity:1;}',
    '.pwa-install .pwa-icon{width:66px;height:66px;border-radius:15px;display:block;',
    'margin:0 auto 16px;box-shadow:0 6px 18px rgba(0,0,0,0.45);}',
    '.pwa-install .pwa-kicker{font-family:"Vintage Glamour",serif;font-size:11px;',
    'letter-spacing:.24em;text-transform:uppercase;color:#b89149;margin:0 0 8px;}',
    '.pwa-install .pwa-title{font-size:23px;line-height:1.25;margin:0 0 8px;color:#f5f5f5;}',
    '.pwa-install .pwa-text{font-size:15px;line-height:1.55;margin:0 auto;max-width:30ch;',
    'color:rgba(240,240,240,0.8);}',
    '.pwa-install .pwa-actions{margin-top:22px;display:flex;flex-direction:column;gap:12px;',
    'align-items:stretch;}',
    '.pwa-install .pwa-btn{font-family:"Vintage Glamour",serif;font-size:13px;letter-spacing:.16em;',
    'text-transform:uppercase;cursor:pointer;border:1px solid #b89149;background:#b89149;',
    'color:#0a0a0a;padding:14px 18px;border-radius:3px;width:100%;',
    'transition:background 200ms ease,color 200ms ease;}',
    '.pwa-install .pwa-btn:hover{background:transparent;color:#b89149;}',
    '.pwa-install .pwa-later{font-family:"Vintage Glamour",serif;font-size:11px;',
    'letter-spacing:.14em;text-transform:uppercase;cursor:pointer;background:none;border:none;',
    'color:rgba(240,240,240,0.5);padding:4px;transition:color 200ms ease;}',
    '.pwa-install .pwa-later:hover{color:#f0f0f0;}',
    '.pwa-install .pwa-dismiss{position:absolute;top:8px;right:10px;background:none;border:none;',
    'color:rgba(240,240,240,0.5);font-size:24px;line-height:1;cursor:pointer;padding:4px 9px;}',
    '.pwa-install .pwa-dismiss:hover{color:#f0f0f0;}',
    '.pwa-install .pwa-share{display:inline-block;width:1em;height:1em;vertical-align:-0.12em;}'
  ].join('');
  document.head.appendChild(style);

  var shownAlready = false;

  function rememberDismissed() {
    try { localStorage.setItem('bergkamp-install-dismissed', '1'); } catch (e) {}
  }

  function buildPopup(innerHTML) {
    if (shownAlready) return null;
    shownAlready = true;

    var backdrop = document.createElement('div');
    backdrop.className = 'pwa-backdrop';

    var card = document.createElement('div');
    card.className = 'pwa-install';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Add the Bergkamp Wedding app to your home screen');
    card.innerHTML =
      '<button class="pwa-dismiss" aria-label="Dismiss">&times;</button>' +
      '<img class="pwa-icon" src="/icons/icon-192.png" alt="" aria-hidden="true" />' +
      innerHTML;

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    function close() { hide(backdrop); rememberDismissed(); }
    card.querySelector('.pwa-dismiss').addEventListener('click', close);
    var later = card.querySelector('.pwa-later');
    if (later) later.addEventListener('click', close);
    // Tapping the dimmed area (outside the card) also dismisses.
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) close();
    });

    // Animate in on the next frame.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { backdrop.classList.add('pwa-show'); });
    });
    return card;
  }

  function hide(backdrop) {
    backdrop.classList.remove('pwa-show');
    setTimeout(function () {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }, 520);
  }

  function whenReady(fn) {
    setTimeout(fn, SHOW_DELAY);
  }

  if (isIOS) {
    // iPhone/iPad Safari: Apple does not allow programmatic install — instruct.
    var shareGlyph =
      '<svg class="pwa-share" viewBox="0 0 24 24" fill="none" stroke="#b89149" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 16V4"/><path d="M8 8l4-4 4 4"/>' +
      '<path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
    whenReady(function () {
      buildPopup(
        '<p class="pwa-kicker">Keep us close</p>' +
        '<h2 class="pwa-title">Add our wedding to your home screen</h2>' +
        '<p class="pwa-text">Tap the Share icon ' + shareGlyph +
        ' in your browser bar, then choose ' +
        '<strong>&ldquo;Add to Home Screen.&rdquo;</strong></p>' +
        '<div class="pwa-actions">' +
        '<button class="pwa-later" type="button">Maybe later</button></div>'
      );
    });
    return;
  }

  // Android/Chrome (and desktop): capture the install event, then offer the
  // real dialog inside our pop-up.
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    whenReady(function () {
      if (!deferredPrompt) return;
      var card = buildPopup(
        '<p class="pwa-kicker">Keep us close</p>' +
        '<h2 class="pwa-title">Add our wedding to your home screen</h2>' +
        '<p class="pwa-text">Save us to your home screen for full-screen, ' +
        'one-tap access — just like an app.</p>' +
        '<div class="pwa-actions">' +
        '<button class="pwa-btn" type="button">Add to home screen</button>' +
        '<button class="pwa-later" type="button">Maybe later</button></div>'
      );
      if (!card) return;
      card.querySelector('.pwa-btn').addEventListener('click', function () {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          rememberDismissed();
          deferredPrompt = null;
        });
        var backdrop = card.parentNode;
        if (backdrop) hide(backdrop);
      });
    });
  });

  // If the user installs via the browser menu, don't nag again.
  window.addEventListener('appinstalled', function () { rememberDismissed(); });
})();
