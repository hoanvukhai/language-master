// src/context/features/flashcard/FlashcardSettingsProvider.tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { 
  FlashcardSettingsContext, 
  defaultFlashcardSettings 
} from './FlashcardSettingsContext';
import type { FlashcardSettingsState } from './FlashcardSettingsContext';
export const FlashcardSettingsProvider = ({ children }: { children: ReactNode }) => {
  // Khởi tạo state từ LocalStorage (nếu có) hoặc dùng mặc định
  const [settings, setSettings] = useState<FlashcardSettingsState>(() => {
    const saved = localStorage.getItem('flashcard_settings');
    return saved ? JSON.parse(saved) : defaultFlashcardSettings;
  });

  // Hàm cập nhật và lưu ngay xuống LocalStorage
  const updateSettings = (newSettings: Partial<FlashcardSettingsState>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('flashcard_settings', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <FlashcardSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </FlashcardSettingsContext.Provider>
  );
};