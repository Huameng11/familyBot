const CACHE_NAME = 'familybot-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/components/ChatTab.js',
  '/components/MedicineTab.js',
  '/components/StorageTab.js',
  '/components/MoreTab.js',
  '/components/CalendarTab.js',
  '/components/RecipeTab.js',
  '/components/MemoTab.js',
  '/manifest.json'
];

// 1. 安装阶段
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      // 🚀 核心改动：让新的 Service Worker 安装后立刻跳过等待，强行激活
      return self.skipWaiting();
    })
  );
});

// 2. 激活阶段：清理旧版本缓存，并让新脚本立即接管所有页面
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // 🚀 核心改动：立刻接管受控制的客户端页面，确保首次加载也能应用最新策略
      return self.clients.claim();
    })
  );
});

// 3. 网络请求拦截网络优先策略（网络如果畅通，绝对优先用最新的）
self.addEventListener('fetch', (e) => {
  // 针对后端的 API 请求，直接放行，绝不缓存
  if (e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    // 🚀 优化：采用“网络优先”策略。先去线上/本地后端拿最新的，拿不到（断网）再用缓存兜底
    fetch(e.request)
      .then((response) => {
        // 如果网络请求成功，顺手更新一下本地缓存
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 彻底断网/回家WiFi还没连上时，才降级从缓存里掏数据实现秒开
        return caches.match(e.request);
      })
  );
});