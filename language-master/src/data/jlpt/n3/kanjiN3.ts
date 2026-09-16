import type { Kanji } from '../../../types';
import { allN3Kanji as n3KanjiData } from './kanji';

// Export dữ liệu Kanji N3 (đã gộp từ các bài)
export const kanjiN3: Kanji[] = n3KanjiData;

// Helper: lấy danh sách bài học duy nhất
export const getN3KanjiLessons = (): string[] => {
  const lessons = kanjiN3
    .map(k => k.lesson ?? '')
    .filter(Boolean);
  return [...new Set(lessons)];
};

// Helper: lọc theo bài học
export const getN3KanjiByLesson = (lesson: string): Kanji[] =>
  kanjiN3.filter(k => k.lesson === lesson);
