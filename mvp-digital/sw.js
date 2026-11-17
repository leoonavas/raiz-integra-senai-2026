/* Service worker do Raiz: rede primeiro, cache de reserva — o app abre mesmo sem internet. */
const CACHE = 'raiz-v3';
const ASSETS = ['./', 'index.html', 'css/style.css', 'js/app.js', 'manifest.webmanifest', 'assets/logo-raiz.svg', 'assets/favicon.svg', 'assets/bg-pattern.svg',
  'assets/icon-soil.svg', 'assets/icon-flow.svg', 'assets/icon-pressure.svg', 'assets/icon-temp.svg', 'assets/icon-pump.svg', 'assets/icon-cloud.svg', 'assets/icon-cloud-off.svg', 'assets/icon-alert.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('index.html') || caches.match('./'))));
});
