// src/context/features/flashcard/useFlashcardSettings.ts
import { useContext } from 'react';
import { FlashcardSettingsContext } from './FlashcardSettingsContext';

export const useFlashcardSettings = () => {
  const context = useContext(FlashcardSettingsContext);
  
  // Bắt lỗi nếu dev quên bọc Provider ở App.tsx
  if (!context) {
    throw new Error('useFlashcardSettings must be used within a FlashcardSettingsProvider');
  }
  
  return context;
};