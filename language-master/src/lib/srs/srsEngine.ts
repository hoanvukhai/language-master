// src/lib/srs/srsEngine.ts
// Core SRS Algorithm — Thuật toán lặp lại ngắt quãng 7 level

import {
  SRS_INTERVALS,
  type WordProgress,
  type MasteryLevel,
  type SRSSubject,
} from './srsTypes';

// ── Helpers ──────────────────────────────────────────────────────────────



/** Cộng thêm N ngày vào date */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + days * 24 * 60 * 60 * 1000);
  return result;
}

// ── Tạo progress mới cho từ lần đầu gặp ─────────────────────────────────

export function createNewProgress(itemId: string, courseId: string, subject: SRSSubject): WordProgress {
  return {
    itemId,
    courseId,
    status: 'new',
    masteryLevel: 0 as MasteryLevel,
    waterDrops: 0,
    subStep: 0,
    interval: SRS_INTERVALS[0],
    nextReviewDate: new Date(),
    lastStudiedDate: new Date(0),
    streak: 0,
    totalCorrect: 0,
    totalWrong: 0,
    subject,
  };
}

export function createGraduatedProgress(itemId: string, courseId: string, subject: SRSSubject): WordProgress {
  const now = new Date();
  return {
    itemId,
    courseId,
    status: 'learning',
    masteryLevel: 1 as MasteryLevel,
    waterDrops: 0,
    subStep: 0,
    interval: SRS_INTERVALS[1],
    nextReviewDate: addDays(now, SRS_INTERVALS[1]),
    lastStudiedDate: now,
    streak: 1,
    totalCorrect: 1,
    totalWrong: 0,
    subject,
  };
}

export function markAsMasteredUser(itemId: string, courseId: string, subject: SRSSubject): WordProgress {
  const now = new Date();
  return {
    itemId,
    courseId,
    status: 'reviewing',
    masteryLevel: 2 as MasteryLevel,
    waterDrops: 3,
    subStep: 6,
    isMasteredUserMarked: true,
    interval: SRS_INTERVALS[2],
    nextReviewDate: addDays(now, SRS_INTERVALS[2]),
    lastStudiedDate: now,
    streak: 1,
    totalCorrect: 1,
    totalWrong: 0,
    subject,
  };
}

// ── Long-term SRS: Trả lời ĐÚNG ──────────────────────────────────────────

/**
 * Khi user trả lời đúng (qua chế độ Ôn tập / đã tốt nghiệp RAM).
 * 
 * Quy tắc:
 * - Nếu đã học hôm nay → KHÔNG tăng level (Khóa 24h)
 * - Ngày mới → tăng level + 1, cập nhật interval và nextReviewDate
 */
export function onCorrectLongTerm(progress: WordProgress): WordProgress {
  const now = new Date();

  const newLevel = Math.min(7, progress.masteryLevel + 1) as MasteryLevel;
  return {
    ...progress,
    masteryLevel: newLevel,
    interval: SRS_INTERVALS[newLevel],
    nextReviewDate: addDays(now, SRS_INTERVALS[newLevel]),
    lastStudiedDate: now,
    streak: progress.streak + 1,
    totalCorrect: progress.totalCorrect + 1,
    status: newLevel >= 7 ? 'mastered' : 'reviewing',
  };
}

// ── Long-term SRS: Trả lời SAI ───────────────────────────────────────────

/**
 * Khi user trả lời sai.
 * 
 * Quy tắc:
 * - Nếu đã học hôm nay → Luật miễn nhiễm (chỉ đếm sai, không tụt level)
 * - Ngày mới → Proportional Drop:
 *   + Level 0-2: về 0
 *   + Level 3-6: trừ 2
 */
export function onWrongLongTerm(progress: WordProgress): WordProgress {
  const now = new Date();

  // Proportional Drop (Tụt tỷ lệ thuận, chia đôi level)
  const newLevel = Math.max(1, Math.ceil(progress.masteryLevel / 2)) as MasteryLevel;

  return {
    ...progress,
    masteryLevel: newLevel,
    interval: SRS_INTERVALS[newLevel],
    nextReviewDate: addDays(now, 4 / 24), // Lưới an toàn: Bắt buộc ôn lại sau 4 tiếng
    lastStudiedDate: now,
    streak: 0,
    totalWrong: progress.totalWrong + 1,
    status: 'reviewing',
  };
}

