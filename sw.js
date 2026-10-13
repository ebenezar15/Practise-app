/* Cadenza service worker — caches the whole app so it runs fully offline. */
const CACHE = 'cadenza-v9';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css', './icons/icon.svg', './icons/icon.png',
  './js/core/dsp.js', './js/core/theory.js', './js/core/instruments.js', './js/core/separation.js', './js/core/improv.js', './js/core/backing.js', './js/core/rhythm.js', './js/core/midi.js', './js/core/analyzer.js', './js/core/coach.js', './js/core/game.js', './js/core/syncmerge.js', './js/core/songs.js', './js/core/learn.js', './js/core/curriculum.js', './js/core/styles.js', './js/core/agent.js', './js/audio/drums.js', './js/ui/pitchtrail.js', './js/ui/theme.js', './js/core/worship.js', './js/core/kids.js', './js/views/kids.js', './js/core/harmony.js', './js/views/harmony.js', './js/core/academy.js', './js/views/academy.js', './js/views/toolkit.js', './js/views/planner.js', './vendor/fonts/nunito-sans-latin-400-normal.woff2', './vendor/fonts/nunito-sans-latin-600-normal.woff2', './vendor/fonts/nunito-sans-latin-700-normal.woff2', './vendor/fonts/nunito-sans-latin-800-normal.woff2', './vendor/fonts/atkinson-hyperlegible-latin-400-normal.woff2', './vendor/fonts/atkinson-hyperlegible-latin-700-normal.woff2', './vendor/fonts/lexend-latin-400-normal.woff2', './vendor/fonts/lexend-latin-600-normal.woff2', './vendor/fonts/lexend-latin-700-normal.woff2', './js/ui/playalong.js', './js/ui/agent.js', './js/views/rhythm.js', './js/audio/recorder.js', './js/ui/docview.js', './js/ui/recordpanel.js', './js/views/songs.js', './js/views/learn.js', './vendor/pdfjs/pdf.min.js', './vendor/pdfjs/pdf.worker.min.js', './js/sync/sync.js', './js/views/classroom.js',
  './js/audio/audio.js', './js/audio/live.js', './js/audio/metronome.js',
  './js/ui/components.js', './js/ui/install.js', './js/app.js',
  './js/views/shared.js', './js/views/home.js', './js/views/studio.js', './js/views/insights.js', './js/views/games.js', './js/views/metronome.js', './js/views/tuner.js', './js/views/progress.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Cache-first, then network (and refresh the cache in the background).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.startsWith('/api/')) return; // classroom API: always live
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
