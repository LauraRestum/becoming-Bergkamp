/* Bergkamp Wedding — service worker registration + "update available" prompt.
   The service worker fetches the newest version whenever you're online, so an
   online visitor always lands on the latest site automatically. When a brand
   new version of the app shell has been prepared, this shows a small, gentle
   prompt inviting the visitor to update. Tapping "Update":
     - Online: loads the newest version straight away.
     - Offline: asks them to try again once they're back online.
   First-time visitors never see the prompt — there is no older version to
   replace, so the worker just takes over quietly. */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var bannerEl = null;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      // A new version downloaded on a previous visit may already be waiting.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(reg.waiting);
      }

      // A new version started downloading during this visit.
      reg.addEventListener('updatefound', function () {
        var incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener('statechange', function () {
          // "installed" + an existing controller == this is an UPDATE (not the
          // very first install), so it's safe to offer it.
          if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(incoming);
          }
        });
      });

      // Re-check for a newer version each time the app is reopened or refocused
      // (e.g. coming back to an installed home-screen app), so the prompt can
      // appear without a manual refresh.
      function checkForUpdate() {
        if (document.visibilityState === 'visible') {
          reg.update().catch(function () {});
        }
      }
      document.addEventListener('visibilitychange', checkForUpdate);
      window.addEventListener('focus', checkForUpdate);
    }).catch(function () {});
  });

  function showUpdateBanner(worker) {
    if (bannerEl) return; // only one prompt at a time
    injectStyles();

    bannerEl = document.createElement('div');
    bannerEl.className = 'swu-banner';
    bannerEl.setAttribute('role', 'status');
    bannerEl.innerHTML =
      '<span class="swu-text">A new version is available.</span>' +
      '<button class="swu-update" type="button">Update</button>' +
      '<button class="swu-close" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(bannerEl);

    // Animate in on the next frame.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bannerEl.classList.add('swu-show'); });
    });

    var textEl = bannerEl.querySelector('.swu-text');
    var updateBtn = bannerEl.querySelector('.swu-update');
    var closeBtn = bannerEl.querySelector('.swu-close');

    closeBtn.addEventListener('click', hideBanner);

    updateBtn.addEventListener('click', function () {
      // Offline: we can't fetch the newest version yet — ask them to retry.
      if (!navigator.onLine) {
        textEl.textContent = 'You’re offline — connect, then try again.';
        updateBtn.disabled = true;
        window.addEventListener('online', function back() {
          window.removeEventListener('online', back);
          if (!bannerEl) return;
          textEl.textContent = 'A new version is available.';
          updateBtn.disabled = false;
        });
        return;
      }

      updateBtn.disabled = true;
      updateBtn.textContent = 'Updating…';

      // Reload once the new worker has taken control. Scoped to this click so
      // the silent first-install hand-off never triggers a reload.
      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });

      // Tell the waiting worker to activate now.
      worker.postMessage('SKIP_WAITING');
    });
  }

  function hideBanner() {
    if (!bannerEl) return;
    var b = bannerEl;
    b.classList.remove('swu-show');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
    bannerEl = null;
  }

  // Scoped styles, matched to the site (serif display, ink + gold).
  function injectStyles() {
    if (document.getElementById('swu-styles')) return;
    var style = document.createElement('style');
    style.id = 'swu-styles';
    style.textContent = [
      '.swu-banner{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));',
      'transform:translate(-50%,150%);z-index:9997;display:flex;align-items:center;gap:12px;',
      'width:max-content;max-width:calc(100vw - 28px);background:#111;color:#f0f0f0;',
      'border:1px solid rgba(184,145,73,0.55);border-radius:4px;',
      'box-shadow:0 16px 44px rgba(0,0,0,0.5);padding:12px 12px 12px 18px;',
      'font-family:"Rosaline",serif;opacity:0;',
      'transition:transform 460ms cubic-bezier(.22,1,.36,1),opacity 360ms ease;}',
      '.swu-banner.swu-show{transform:translate(-50%,0);opacity:1;}',
      '.swu-text{font-size:14.5px;line-height:1.4;}',
      '.swu-update{font-family:"Vintage Glamour",serif;font-size:12px;letter-spacing:.16em;',
      'text-transform:uppercase;cursor:pointer;border:1px solid #b89149;background:#b89149;',
      'color:#0a0a0a;padding:9px 16px;border-radius:3px;white-space:nowrap;',
      'transition:background 200ms ease,color 200ms ease;}',
      '.swu-update:hover{background:transparent;color:#b89149;}',
      '.swu-update:disabled{opacity:.55;cursor:default;background:transparent;color:#b89149;}',
      '.swu-close{background:none;border:none;color:rgba(240,240,240,0.55);font-size:22px;',
      'line-height:1;cursor:pointer;padding:2px 6px;}',
      '.swu-close:hover{color:#f0f0f0;}'
    ].join('');
    document.head.appendChild(style);
  }
})();
