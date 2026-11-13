const CACHE_VERSION = 'salary-v1.0.1';   // ← МЕНЯЙТЕ ПРИ КАЖДОМ РЕЛИЗЕ
const CACHE = `salary-${CACHE_VERSION}`;

const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // === 1. Навигация (открытие/перезагрузка страницы) — NETWORK-FIRST ===
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(response => {
                    // Кэшируем свежий HTML на случай офлайна
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put(req, copy));
                    return response;
                })
                .catch(() =>
                    // Офлайн: сначала пробуем точный URL, потом index.html
                    caches.match(req).then(r => r || caches.match('./index.html'))
                )
        );
        return;
    }

    // === 2. Остальные GET (CSS, JS, иконки) — CACHE-FIRST ===
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(response => {
                if (response.status === 200 && (response.type === 'basic' || response.type === 'default')) {
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put(req, copy));
                }
                return response;
            });
        })
    );
});

// Ручное обновление по сообщению из приложения (для баннера "Доступно обновление")
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
