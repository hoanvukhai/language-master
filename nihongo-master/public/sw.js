// public/sw.js
// Service Worker cho Nihongo Master: Cache App Shell & Hỗ trợ học Offline

const CACHE_NAME = 'nihongo-master-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/test.png',
];

// 1. Install: Cache app shell
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

// 2. Activate: Dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Chiến lược Network-first với fallback sang Cache cho HTML (SPA),
//    và Cache-first cho static hashed assets (/assets/...)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bỏ qua các request không phải GET hoặc request của Firebase/Google APIs
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    // Để request bên ngoài (Google Fonts, Firebase, Firestore) đi qua bình thường
    return;
  }

  // A. Navigation Request (mở trang web / chuyển trang SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Lưu bản mới nhất của index.html vào cache
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Khi mất mạng: Luôn trả về index.html từ cache để React Router mount giao diện!
          const cachedHtml = await caches.match('/index.html');
          return cachedHtml || caches.match('/');
        })
    );
    return;
  }

  // B. Static Assets có hash trong /assets/ (JS, CSS, hình ảnh)
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

  // C. Các tài nguyên cục bộ khác: Thử Network trước, lỗi thì lấy Cache
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
