// Service Worker - 捕手訓練計畫 PWA
const CACHE_NAME = 'catcher-v1';
const BASE = '/catcher-training';

// 需要離線快取的資源
const CACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
];

// 安裝：快取核心資源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

// 啟動：清除舊快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 請求攔截：網路優先，失敗則用快取
self.addEventListener('fetch', e => {
  // 只處理同源請求
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 更新快取
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ===== 推播通知 =====
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || '⚾ 捕手訓練提醒';
  const options = {
    body: data.body || '記得完成今天的訓練！',
    icon: data.icon || BASE + '/icon-192.png',
    badge: BASE + '/icon-192.png',
    tag: data.tag || 'catcher-reminder',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || BASE + '/' },
    actions: [
      { action: 'open', title: '開啟 App' },
      { action: 'dismiss', title: '稍後再說' }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// 點擊通知
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = (e.notification.data && e.notification.data.url) || BASE + '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(BASE) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
