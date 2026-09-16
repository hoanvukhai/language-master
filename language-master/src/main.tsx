import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Đăng ký Service Worker hỗ trợ PWA & Chế độ Ngoại Tuyến
if ('serviceWorker' in navigator && (import.meta.env.PROD || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] Registered successfully:', reg.scope);

      // Tự động kiểm tra bản cập nhật mới định kỳ khi người dùng active tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });

    // Khi Service Worker mới kích hoạt và tiếp quản, reload nhẹ nếu cần hoặc ghi nhận
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed: New version active.');
    });
  });
}
