import type { GrammarItem } from '../../../types';
import { allN3Grammar as n3GrammarData } from './grammar';

// Export dữ liệu Grammar N3 (đã gộp từ các bài)
export const grammarN3: GrammarItem[] = n3GrammarData;

// Clean structure string by removing standard parenthetical annotations (e.g. (bù trừ))
export const cleanStructure = (str: string): string => {
  if (!str) return '';
  return str.replace(/\s*\([^)]*\)/g, '').trim();
};

export const grammarN3Clean: GrammarItem[] = n3GrammarData.map(g => ({
  ...g,
  structure: cleanStructure(g.structure)
}));

// Helper: lấy danh sách bài học duy nhất (sắp xếp theo số bài)
export const getN3GrammarLessons = (): string[] => {
  const lessons = grammarN3
    .map(g => g.lesson ?? '')
    .filter(Boolean);
  return [...new Set(lessons)].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10);
    const numB = parseInt(b.replace(/\D/g, ''), 10);
    return numA - numB;
  });
};

// Helper: lọc theo bài học
export const getN3GrammarByLesson = (lesson: string): GrammarItem[] =>
  grammarN3.filter(g => g.lesson === lesson);

// Helper: lấy danh sách group duy nhất
export const getN3GrammarGroups = (): string[] => {
  const groups = grammarN3.map(g => g.group).filter(Boolean);
  return [...new Set(groups)];
};

// Helper: lọc theo group (dùng cho Game đối kháng)
export const getN3GrammarByGroup = (group: string): GrammarItem[] =>
  grammarN3.filter(g => g.group === group);
