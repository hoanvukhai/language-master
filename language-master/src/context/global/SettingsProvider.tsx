import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { SettingsContext } from './SettingsContext';
import type { SettingsState } from './SettingsContext';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  // Khởi tạo state từ LocalStorage (nếu có) hoặc dùng mặc định
  const [settings, setSettings] = useState<Omit<SettingsState, 'updateSettings'>>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : {
      theme: 'system',
      language: 'vi',
      // soundEnabled removed — audio mute managed by AudioContext
      fontSize: 'base',
    };
  });

  // Hàm cập nhật Settings và lưu vào LocalStorage
  const updateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('app_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Dùng ref để tránh stale closure trong event listener
  const themeRef = useRef(settings.theme);
  useEffect(() => {
    themeRef.current = settings.theme;
  }, [settings.theme]);

  // EFFECT: Áp dụng Theme (Giao diện) vào thẻ <html>
  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (theme: string) => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    // Áp dụng theme ngay lập tức
    applyTheme(settings.theme);

    // Lắng nghe sự thay đổi của Hệ thống — luôn đọc theme mới nhất qua ref
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (themeRef.current === 'system') applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [settings.theme]);

  // EFFECT: Áp dụng Cỡ chữ (Font Size) vào thẻ <html>
  useEffect(() => {
    const root = window.document.documentElement;
    // Xóa các class cũ
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    // Thêm class mới
    root.classList.add(`text-${settings.fontSize}`);
  }, [settings.fontSize]);

  // CHỈ TRẢ VỀ COMPONENT Ở FILE NÀY
  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};