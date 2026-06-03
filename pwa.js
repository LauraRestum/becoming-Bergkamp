/* Bergkamp Wedding — install prompt.
   Adds a tasteful "Add to Home Screen" prompt that matches the site.
   - Android/Chrome: shows a button that fires the real install dialog.
   - iPhone/Safari: shows Share -> Add to Home Screen instructions.
   - Already installed (standalone): shows nothing.
   This file only ADDS a prompt element + its own scoped styles; it does
   not touch existing page content, layout, or CSS. */
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

  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;

  // --- Scoped styles, matched to the site (serif display, ink + gold) ---
  var style = document.createElement('style');
  style.textContent = [
    '.pwa-install{position:fixed;left:50%;transform:translateX(-50%) translateY(140%);',
    'bottom:calc(18px + env(safe-area-inset-bottom));width:min(440px,calc(100vw - 32px));',
    'z-index:9999;background:#111;color:#f0f0f0;border:1px solid rgba(184,145,73,0.55);',
    'border-radius:4px;box-shadow:0 18px 50px rgba(0,0,0,0.55);',
    'padding:18px 20px 16px;font-family:"Rosaline",serif;opacity:0;',
    'transition:transform 600ms cubic-bezier(.22,1,.36,1),opacity 600ms ease;}',
    '.pwa-install.pwa-show{transform:translateX(-50%) translateY(0);opacity:1;}',
    '.pwa-install .pwa-kicker{font-family:"Vintage Glamour",serif;font-size:11px;',
    'letter-spacing:.22em;text-transform:uppercase;color:#b89149;margin:0 0 6px;}',
    '.pwa-install .pwa-title{font-size:21px;line-height:1.25;margin:0 0 4px;color:#f5f5f5;}',
    '.pwa-install .pwa-text{font-size:15px;line-height:1.5;margin:0;color:rgba(240,240,240,0.78);}',
    '.pwa-install .pwa-actions{margin-top:14px;display:flex;gap:10px;align-items:center;}',
    '.pwa-install .pwa-btn{font-family:"Vintage Glamour",serif;font-size:12px;letter-spacing:.14em;',
    'text-transform:uppercase;cursor:pointer;border:1px solid #b89149;background:#b89149;',
    'color:#0a0a0a;padding:11px 18px;border-radius:3px;transition:background 200ms ease,color 200ms ease;}',
    '.pwa-install .pwa-btn:hover{background:transparent;color:#b89149;}',
    '.pwa-install .pwa-dismiss{position:absolute;top:8px;right:10px;background:none;border:none;',
    'color:rgba(240,240,240,0.5);font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;}',
    '.pwa-install .pwa-dismiss:hover{color:#f0f0f0;}',
    '.pwa-install .pwa-share{display:inline-block;width:1em;height:1em;vertical-align:-0.12em;}'
  ].join('');
  document.head.appendChild(style);

  function buildCard(innerHTML) {
    var card = document.createElement('div');
    card.className = 'pwa-install';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Add the Bergkamp Wedding app to your home screen');
    card.innerHTML =
      '<button class="pwa-dismiss" aria-label="Dismiss">&times;</button>' + innerHTML;
    document.body.appendChild(card);

    card.querySelector('.pwa-dismiss').addEventListener('click', function () {
      hide(card);
      try { localStorage.setItem('bergkamp-install-dismissed', '1'); } catch (e) {}
    });

    // Animate in on the next frame.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { card.classList.add('pwa-show'); });
    });
    return card;
  }

  function hide(card) {
    card.classList.remove('pwa-show');
    setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 650);
  }

  if (isIOS) {
    // iPhone/Safari: Apple does not allow programmatic install — instruct.
    var shareGlyph =
      '<svg class="pwa-share" viewBox="0 0 24 24" fill="none" stroke="#b89149" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 16V4"/><path d="M8 8l4-4 4 4"/>' +
      '<path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
    buildCard(
      '<p class="pwa-kicker">Keep us close</p>' +
      '<h2 class="pwa-title">Add the Bergkamp Wedding app</h2>' +
      '<p class="pwa-text">Tap the Share icon ' + shareGlyph +
      ' below, then choose <strong>&ldquo;Add to Home Screen.&rdquo;</strong></p>'
    );
    return;
  }

  // Android/Chrome: capture the install event and offer the real dialog.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    var deferredPrompt = e;

    var card = buildCard(
      '<p class="pwa-kicker">Keep us close</p>' +
      '<h2 class="pwa-title">Add the Bergkamp Wedding app</h2>' +
      '<p class="pwa-text">Save our wedding to your home screen for full-screen, ' +
      'one-tap access.</p>' +
      '<div class="pwa-actions"><button class="pwa-btn" type="button">' +
      'Add the Bergkamp Wedding app</button></div>'
    );

    card.querySelector('.pwa-btn').addEventListener('click', function () {
      hide(card);
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        try { localStorage.setItem('bergkamp-install-dismissed', '1'); } catch (e) {}
        deferredPrompt = null;
      });
    });
  });

  // If the user installs via the browser menu, hide any prompt.
  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem('bergkamp-install-dismissed', '1'); } catch (e) {}
  });
})();
