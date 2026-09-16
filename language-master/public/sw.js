// public/sw.js
// Service Worker cho Language Master: Cache App Shell & Hỗ trợ học Offline

const CACHE_NAME = 'language-master-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
];

// 1. Install: Cache app shell & lập tức kích hoạt
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Caching failed for some static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate: Dọn dẹp TOÀN BỘ cache cũ của các phiên bản trước
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Chiến lược Network-first với HTML navigation, Cache-first với hashed assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bỏ qua các request không phải GET hoặc request của Firebase/Google APIs bên ngoài
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    return;
  }

  // A. Navigation Request (Truy cập trang web / chuyển route SPA)
  // CHIẾN LƯỢC: NETWORK-FIRST
  // -> Luôn lấy bản HTML mới nhất từ Vercel khi có mạng.
  // -> Nhờ đó khi có bản update mới, người dùng không bao giờ bị kẹt ở bản cũ và KHÔNG CẦN reset cache!
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Khi MẤT MẠNG: Lấy index.html từ cache để React Router mount giao diện offline
          const cachedHtml = await caches.match('/index.html');
          return cachedHtml || caches.match('/');
        })
    );
    return;
  }

  // B. Static Assets có hash trong /assets/ (JS, CSS, hình ảnh Vite build)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. Các tài nguyên cục bộ khác (icons, manifest, svgs): Network-First, fallback Cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
