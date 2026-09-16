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
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });
  });
}

