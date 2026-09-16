// src/data/vocabularyN3.ts
import type { Word } from '../../../types';
import { vocabularyN3 as n3Data } from './vocabulary';

// Export dữ liệu từ vựng N3 (đã gộp từ lesson01 đến lesson12)
export const vocabularyN3: Word[] = n3Data;

// Helper: lấy danh sách bài học duy nhất
export const getN3Lessons = (): string[] => {
  const lessons = vocabularyN3
    .map(w => w.lesson ?? '')
    .filter(Boolean);
  return [...new Set(lessons)];
};

// Helper: lọc theo bài học
export const getN3ByLesson = (lesson: string): Word[] =>
  vocabularyN3.filter(w => w.lesson === lesson);
