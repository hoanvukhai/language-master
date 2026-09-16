// src/lib/srs/sessionManager.ts
// Session Manager cho Thuật toán SRS 6 bước & Nạp đan xen từ mới sớm

import type { SRSSubject } from './srsTypes';

export interface RAMItemState {
  itemId: string;
  subject: SRSSubject;
  prompt: string;          // Kanji/Hiragana
  hiragana: string;        // Reading
  meaning: string;         // Vietnamese meaning
  exampleKanji?: string;   // Ví dụ mẫu
  exampleMeaning?: string; // Nghĩa câu ví dụ
  waterDrops: number;      // 0, 1, 2, 3
  subStep: number;         // 0: Preview, 1-6: Testing steps
  isGraduated: boolean;    // true khi waterDrops === 3
  isUserMarkedMastered?: boolean;
}

export interface SessionQueueItem {
  item: RAMItemState;
  step: number;            // 0: preview, 1: flashcard_fwd, 2: flashcard_rev, 3: quiz_fwd, 4: quiz_rev, 5: typing_fwd, 6: typing_rev
  direction: 'fwd' | 'rev';
}

/**
 * Trộn danh sách ngẫu nhiên (Fisher-Yates Shuffle)
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const list = [...arr];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * Tạo danh sách câu hỏi 4 lựa chọn cho Quiz
 */
export function generateQuizOptions(correctAnswer: string, allPossibleAnswers: string[]): string[] {
  const distractors = allPossibleAnswers
    .filter(a => a !== correctAnswer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  return shuffleArray([correctAnswer, ...distractors]);
}
