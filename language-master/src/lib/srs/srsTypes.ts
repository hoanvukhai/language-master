// src/lib/srs/srsTypes.ts
// Định nghĩa types và constants cho hệ thống SRS

// ── 8 Level Mastery ──────────────────────────────────────────────────────
export const SRS_INTERVALS = [0, 4/24, 8/24, 1, 3, 7, 14, 30] as const; // ngày
export const RAM_REQUIRED_SCORE = 6; // 6 lần đúng trong phiên (2 Nhận diện, 2 Nhớ lại, 2 Gõ phím) = tốt nghiệp

export const MASTERY_ICONS = ['🌰', '🌱', '🌿', '🪴', '🌳', '🌸', '🍎', '🌲'] as const;

export const MASTERY_LABELS_VI = [
  'Chưa học',      // Level 0 — Hạt giống lơ lửng
  'Mới học',       // Level 1 — Hạt giống gieo
  'Nảy mầm',       // Level 2 — Mầm non
  'Cây non',       // Level 3 — Cây con
  'Trưởng thành',  // Level 4 — Cây to
  'Đơm hoa',       // Level 5 — Cây hoa
  'Kết trái',      // Level 6 — Cây táo
  'Cổ thụ',        // Level 7 — Rừng (Mastered)
] as const;

export const MASTERY_LABELS_EN = [
  'New',
  'Learning',
  'Familiar',
  'Remembered',
  'Almost there',
  'Flowering',
  'Fruiting',
  'MASTERED',
] as const;

export const MASTERY_COLORS = [
  'text-slate-400',    // 0
  'text-lime-500',     // 1
  'text-green-500',    // 2
  'text-emerald-500',  // 3
  'text-teal-500',     // 4
  'text-cyan-500',     // 5
  'text-pink-500',     // 6
  'text-red-500',      // 7
] as const;

// ── Types ────────────────────────────────────────────────────────────────
export type SRSSubject =
  | 'vocab'
  | 'kanji'
  | 'kanji_single'
  | 'kanji_words'
  | 'grammar'
  | 'vocab_n3'
  | 'kanji_n3'
  | 'kanji_single_n3'
  | 'kanji_words_n3'
  | 'grammar_n3'
  | 'vocab_n2'
  | 'kanji_n2'
  | 'kanji_single_n2'
  | 'kanji_words_n2'
  | 'grammar_n2';
export type SRSStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WordProgress {
  itemId: string;
  courseId: string;
  status: SRSStatus;
  masteryLevel: MasteryLevel;
  waterDrops: number;         // 0 - 3 giọt nước
  subStep: number;            // 0 - 6 bước thử thách (0: view, 1: flashcard forward, 2: flashcard reverse, 3: quiz forward, 4: quiz reverse, 5: typing forward, 6: typing reverse)
  pendingVerification3h?: Date | null; // Hẹn 3 tiếng sau để xác nhận thuộc
  isMasteredUserMarked?: boolean;     // Người dùng bấm "Đã thuộc" bỏ qua Level 0
  interval: number;           // Số ngày đến lần ôn tiếp
  nextReviewDate: Date;       // Ngày cần ôn
  lastStudiedDate: Date;      // Ngày cuối cùng học thành công
  streak: number;             // Chuỗi đúng liên tiếp (qua ngày)
  totalCorrect: number;       // Tổng lần đúng
  totalWrong: number;         // Tổng lần sai
  subject: SRSSubject;
}

// Dữ liệu lưu trên Firestore (không có itemId vì dùng làm document ID)
export interface WordProgressFirestore {
  courseId: string;
  status: SRSStatus;
  masteryLevel: MasteryLevel;
  waterDrops?: number;
  subStep?: number;
  pendingVerification3h?: any; // Firestore Timestamp
  isMasteredUserMarked?: boolean;
  interval: number;
  nextReviewDate: any;  // Firestore Timestamp
  lastStudiedDate: any; // Firestore Timestamp
  streak: number;
  totalCorrect: number;
  totalWrong: number;
  subject: SRSSubject;
}

// ── Session (RAM) ────────────────────────────────────────────────────────
export interface SessionItem {
  itemId: string;
  subject: SRSSubject;
  score: number;          // 0-3, đạt 3 = tốt nghiệp
  isGraduated: boolean;   // true khi score === RAM_REQUIRED_SCORE
  previousProgress?: WordProgress; // Để undo
}

// ── Learn Settings ───────────────────────────────────────────────────────
export interface LearnSettings {
  dailyNewWordLimit: number;    // Mặc định: 15
  maxPendingWords: number;      // Mặc định: 50
  sessionSize: number;          // Mặc định: 15
  reviewSessionSize: number;    // Mặc định: 30
  showKana: boolean;            // Hiện furigana (chữ Kana nhỏ)
}

export const DEFAULT_LEARN_SETTINGS: LearnSettings = {
  dailyNewWordLimit: 15,
  maxPendingWords: 50,
  sessionSize: 15,
  reviewSessionSize: 30,
  showKana: true,
};
