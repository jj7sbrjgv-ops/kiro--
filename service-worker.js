/**
 * Service Worker for 歩数計アプリ
 * PWA対応のためのサービスワーカー
 */

const CACHE_NAME = 'step-counter-v3';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './StorageManager.js',
  './SensorAdapter.js',
  './StepCounter.js',
  './ResetTimer.js',
  './UIController.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
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

  // POSTなどはそのままネットワークへ
  if (request.method !== 'GET') {
    return;
  }

  // ナビゲーションリクエストはオフラインでもindexを返す
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedIndex = await cache.match('./index.html');

      try {
        // オンラインなら通常のレスポンス
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch (error) {
        // オフライン時はキャッシュしたindexを返す
        if (cachedIndex) return cachedIndex;
        throw error;
      }
    })());
    return;
  }

  // その他のGETリクエストはキャッシュ優先、なければネットワーク、失敗時はindexにフォールバック
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
      throw error;
    }
  })());
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
