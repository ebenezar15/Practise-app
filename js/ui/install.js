/* Overture — "install the app" guidance: Add to Home Screen on iPad/iPhone, the browser install
 * prompt on Android/Chrome/Edge, and an https warning when the mic/offline mode can't work. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $ } = UI;
  const KEY = 'cadenza.installHint.v1';

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iosBrowser = /CriOS/.test(ua) ? 'chrome' : /FxiOS/.test(ua) ? 'firefox' : /EdgiOS/.test(ua) ? 'edge' : 'safari';
  const isAndroid = /Android/.test(ua);
  const standalone = () => navigator.standalone === true || (root.matchMedia && matchMedia('(display-mode: standalone)').matches);
  const isDesktopApp = () => !!root.cadenzaDesktop;
  const insecure = () => root.isSecureContext === false && location.protocol !== 'file:';

  let deferredPrompt = null;
  root.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const host = document.getElementById('installHint');
    if (host) render(host);
  });
  root.addEventListener('appinstalled', () => { deferredPrompt = null; const h = document.getElementById('installHint'); if (h) h.remove(); });

  const shareIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';
  const addIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

  function steps() {
    const device = isIPad ? 'iPad' : 'iPhone';
    const first = iosBrowser === 'safari'
      ? `Tap the <b>Share</b> button ${shareIcon} ${isIPad ? 'at the top right of Safari' : 'at the bottom of Safari'}.`
      : iosBrowser === 'chrome' ? `Tap the <b>Share</b> button ${shareIcon} in the address bar.`
        : `Open this page in <b>Safari</b> (best on ${device}), then tap <b>Share</b> ${shareIcon}.`;
    return [first, `Scroll down and tap <b>Add to Home Screen</b> ${addIcon}.`, 'Tap <b>Add</b>. Then open Overture from its new icon on your Home Screen.'];
  }

  function needsHint() {
    if (isDesktopApp() || standalone()) return false;
    return isIOS || !!deferredPrompt || insecure();
  }

  function dismissed() {
    try { const t = +localStorage.getItem(KEY); return t && Date.now() - t < 14 * 86400000; } catch (e) { return false; }
  }

  function render(host) {
    if (!needsHint() || (dismissed() && !insecure())) { host.innerHTML = ''; host.classList.add('hidden'); return; }
    host.classList.remove('hidden');
    let body;
    if (insecure()) {
      body = `<div class="assign-card"><div class="a-ic">🔒</div><div style="flex:1"><b>Open Overture over a secure https:// address</b>
        <p class="small" style="margin-top:4px">This address starts with <span class="code">http://</span>, so the browser blocks the microphone and offline mode. Ask your teacher for the https:// link${isIOS ? ', then add it to your Home Screen' : ''}.</p></div></div>`;
    } else if (isIOS) {
      body = `<div class="assign-card"><div class="a-ic">📲</div><div style="flex:1"><b>Install Overture on your ${isIPad ? 'iPad' : 'iPhone'}</b>
        <p class="small" style="margin-top:4px">Add it to your Home Screen: it opens full-screen like an app, works offline, and keeps you signed in.</p>
        <div class="row" style="margin-top:10px"><button class="btn primary sm" data-guide>${icon('download')} Show me how</button><button class="btn ghost sm" data-later>Later</button></div></div></div>`;
    } else {
      body = `<div class="assign-card"><div class="a-ic">💻</div><div style="flex:1"><b>Install Overture as an app</b>
        <p class="small" style="margin-top:4px">One click: it gets its own icon and window, works offline and keeps you signed in.</p>
        <div class="row" style="margin-top:10px"><button class="btn primary sm" data-install>${icon('download')} Install app</button><button class="btn ghost sm" data-later>Later</button></div></div></div>`;
    }
    host.innerHTML = `<section class="card" style="margin-bottom:18px;border-color:var(--v-300)">${body}</section>`;
    const later = host.querySelector('[data-later]');
    if (later) later.onclick = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ } render(host); };
    const guide = host.querySelector('[data-guide]');
    if (guide) guide.onclick = showGuide;
    const inst = host.querySelector('[data-install]');
    if (inst) inst.onclick = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice.catch(() => null); deferredPrompt = null; render(host); };
  }

  function showGuide() {
    UI.modal(`
      <div class="modal-top"><div style="font-size:44px">📲</div><h2 style="color:#fff;margin-top:6px">Add Overture to your ${isIPad ? 'iPad' : isIOS ? 'iPhone' : 'device'}</h2>
        <p style="margin-top:6px">Takes 10 seconds. You only do it once.</p></div>
      <div class="modal-body">
        <ol class="install-steps">${steps().map((s) => `<li>${s}</li>`).join('')}</ol>
        <div class="notice" style="margin-top:14px">${icon('info')}<div>
          <b>Good to know</b><br>
          • Always open Overture from the <b>Home Screen icon</b> — that copy keeps your login and practice safely. (Safari may clear website data that isn't used for a week; the Home Screen app is exempt.)<br>
          • Sign in once inside the Home Screen app (Classroom tab). Your progress then syncs automatically.<br>
          • Allow the <b>microphone</b> when asked. Headphones give the best results.<br>
          • USB MIDI keyboards are not supported on ${isIPad ? 'iPad' : 'iPhone'} — use the microphone or an audio interface.
        </div></div>
        <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" data-close>Got it</button></div>
      </div>`);
  }

  PM.Install = { render, showGuide, isIOS, isIPad, standalone, needsHint };
})(typeof self !== 'undefined' ? self : globalThis);
