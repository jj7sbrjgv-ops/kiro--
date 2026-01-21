/**
 * Service Worker for 歩数計アプリ
 * PWA対応のためのサービスワーカー
 */

const CACHE_NAME = 'step-counter-v2';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './StorageManager.js',
  './SensorAdapter.js',
  './StepCounter.js',
  './ResetTimer.js',
  './UIController.js'
];

// インストール時にキャッシュを作成
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // すぐに新しいSWを有効化して古いキャッシュを置き換える
  self.skipWaiting();
});

// フェッチ時にキャッシュから返す
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // ナビゲーションリクエストはindex.htmlを返してPWA内ルーティングを維持
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        if (cached) return cached;
        return fetch('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request);
      })
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
