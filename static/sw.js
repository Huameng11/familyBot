const CACHE_NAME = 'familybot-cache-v3';

// 移除了容易报404的 './'，并将 Vue 换成了 prod 生产版
const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://unpkg.com/vue@3/dist/vue.global.prod.js' 
];

self.addEventListener('install', event => {
  // 强制立即接管控制权
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // 清理旧版本的缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});