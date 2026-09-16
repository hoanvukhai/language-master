// src/lib/rankSystem.ts
// Hệ thống cấp độ (Rank) dùng chung cho Toàn Diện game

export interface Rank {
  key: string;
  badge: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  kanji: string;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  emoji: string;
  color: string;
  bgColor: string;
  solidColor: string; // for progress bar
  minExp: number;
}

export const RANKS: Rank[] = [
  {
    key: 'minarai', badge: 'F', kanji: '見習い', nameVi: 'Học việc', nameEn: 'Apprentice',
    descVi: 'Bắt đầu hành trình. Hãy kiên trì luyện tập mỗi ngày!',
    descEn: 'Just started. Keep practicing every day!',
    emoji: '🪨', color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-700',
    solidColor: 'bg-slate-500', minExp: 0,
  },
  {
    key: 'shogakusha', badge: 'E', kanji: '初学者', nameVi: 'Tập sự', nameEn: 'Novice',
    descVi: 'Đã có nền tảng. Tiếp tục mở rộng vốn từ!',
    descEn: 'A good start. Keep expanding your vocabulary!',
    emoji: '🌱', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/40',
    solidColor: 'bg-green-500', minExp: 40,
  },
  {
    key: 'shugyo', badge: 'D', kanji: '修行中', nameVi: 'Tu luyện', nameEn: 'Practitioner',
    descVi: 'Đang trên đà tiến bộ tốt. Hãy thử thách bản thân!',
    descEn: 'Good progress. Challenge yourself with harder words!',
    emoji: '⚔️', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    solidColor: 'bg-blue-500', minExp: 80,
  },
  {
    key: 'chuden', badge: 'C', kanji: '中伝', nameVi: 'Trung cấp', nameEn: 'Intermediate',
    descVi: 'Kỹ năng ổn định. Bạn đã vượt phần lớn người học!',
    descEn: 'Solid skills. You surpass most learners!',
    emoji: '🥋', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    solidColor: 'bg-indigo-500', minExp: 120,
  },
  {
    key: 'joden', badge: 'B', kanji: '上伝', nameVi: 'Thượng cấp', nameEn: 'Advanced',
    descVi: 'Trình độ cao. Rất ít người đạt được đến đây!',
    descEn: 'High level. Very few reach this far!',
    emoji: '🌟', color: 'text-violet-600', bgColor: 'bg-violet-100 dark:bg-violet-900/40',
    solidColor: 'bg-violet-500', minExp: 160,
  },
  {
    key: 'tatsujin', badge: 'A', kanji: '達人', nameVi: 'Đạt nhân', nameEn: 'Master',
    descVi: 'Xuất sắc! Bạn đã làm chủ nội dung này!',
    descEn: 'Excellent! You have mastered this content!',
    emoji: '🔥', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40',
    solidColor: 'bg-orange-500', minExp: 200,
  },
  {
    key: 'kakusha', badge: 'S', kanji: '覚者', nameVi: 'Giác giả', nameEn: 'Enlightened',
    descVi: 'Xuất sắc! Đỉnh cao của sự thành thạo. Bạn đã đạt tới cảnh giới tối cao!',
    descEn: 'Outstanding! The pinnacle of mastery!',
    emoji: '👑', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    solidColor: 'bg-amber-500', minExp: 250,
  },
];

// ── Helpers for normalization ─────────────────────────────────────────────
function getMaxExp(level: Level, totalQ: number): number {
  if (level === 'easy') {
    return totalQ * 15;
  } else if (level === 'normal') {
    return Math.round(totalQ * 22.5 + 100);
  } else {
    return Math.round(totalQ * 82.5 + 10);
  }
}

export function calculateMaxPossibleExp(
  questions: any[],
  level: Level,
  blitzSecs: number,
  subject: GameSubject
): number {
  let maxBaseScore = 0;

  questions.forEach(q => {
    let base = 0;
    let timeLimit = 0;

    if (subject === 'grammar') {
      if (q.type === 'flashcard') { base = 5; timeLimit = 5; }
      else if (q.type === 'quiz') { base = 10; timeLimit = 10; }
      else if (q.type === 'error') { base = 15; timeLimit = 12; }
      else if (q.type === 'fill_blank') { base = 15; timeLimit = 15; }
      else if (q.type === 'matching') {
        const numPairs = q.pairs ? q.pairs.length : 8;
        base = numPairs * 5;
        timeLimit = 45;
      }
    } else {
      // vocab or kanji
      if (q.type === 'flashcard') { base = 5; timeLimit = 5; }
      else if (q.type === 'quiz') { base = 10; timeLimit = 8; }
      else if (q.type === 'error') { base = 10; timeLimit = 8; }
      else if (q.type === 'typing') { base = 20; timeLimit = 15; }
      else if (q.type === 'matching') {
        const numPairs = q.pairs ? q.pairs.length : 8;
        base = numPairs * 5;
        timeLimit = 45;
      }
    }

    const multiplier = level === 'easy' ? 1.0 : level === 'normal' ? 1.5 : 2.5;
    let earned = base * multiplier;
    if (level === 'hard') {
      earned += (timeLimit * 3);
    }
    maxBaseScore += Math.round(earned);
  });

  let maxExp = maxBaseScore;
  if (level === 'normal') {
    maxExp += Math.round(blitzSecs * 0.5);
  }
  if (level !== 'easy') {
    maxExp += 10;
  }

  return maxExp;
}

export const LEVEL_EXP_THRESHOLDS: Record<Level, Record<'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S', number>> = {
  easy: { F: 0, E: 20, D: 45, C: 70, B: 95, A: 120, S: 140 },
  normal: { F: 0, E: 70, D: 140, C: 215, B: 290, A: 365, S: 440 },
  hard: { F: 0, E: 220, D: 460, C: 700, B: 940, A: 1180, S: 1420 }
};



export function getRankModifier(
  exp: number,
  level: Level,
  isPerfectRun: boolean,
  maxExp?: number
): { rank: Rank; modifier: string; isPerfect: boolean } {
  if (isPerfectRun) {
    const rank = RANKS[RANKS.length - 1]; // S rank
    return { rank, modifier: '+', isPerfect: true }; // S+
  }

  let thresholds = LEVEL_EXP_THRESHOLDS[level];

  if (maxExp && maxExp > 0) {
    thresholds = {
      F: 0,
      E: Math.round(maxExp * 0.20),
      D: Math.round(maxExp * 0.40),
      C: Math.round(maxExp * 0.55),
      B: Math.round(maxExp * 0.70),
      A: Math.round(maxExp * 0.82),
      S: Math.round(maxExp * 0.92),
    };
  }

  // Find the rank
  let actualRankIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const badge = RANKS[i].badge;
    if (exp >= thresholds[badge]) {
      actualRankIdx = i;
      break;
    }
  }

  const rank = RANKS[actualRankIdx];
  let modifier = '';
  let isPerfect = false;

  if (rank.badge === 'S') {
    const minS = thresholds.S;
    const maxS = maxExp && maxExp > minS ? maxExp : thresholds.S * 1.25;
    const range = maxS - minS;
    if (exp < minS + range / 3) {
      modifier = '-';
    }
  } else {
    const nextRank = RANKS[actualRankIdx + 1];
    const currentMin = thresholds[rank.badge];
    const nextMin = thresholds[nextRank.badge];
    const range = nextMin - currentMin;
    const oneThird = range / 3;
    
    if (exp >= nextMin - oneThird) {
      modifier = '+';
    } else if (exp < currentMin + oneThird) {
      modifier = '-';
    }
  }

  return { rank, modifier, isPerfect };
}

// ── Storage keys ─────────────────────────────────────────────────────────
export type GameSubject = 'vocab' | 'kanji' | 'grammar';
export type Level = 'easy' | 'normal' | 'hard';

// Kỷ lục theo độ khó
export function getStorageKey(subject: GameSubject, level: Level): string {
  return `fullrun_exp_${subject}_${level}`;
}

// Kỷ lục tổng
export function getStorageKeyGlobal(subject: GameSubject): string {
  return `fullrun_exp_${subject}_global`;
}

export interface BestScoreRecord {
  exp: number;
  level: Level;
  totalQ: number;
  maxExp?: number;
  isPerfect?: boolean;
}

export function getBestRecord(key: string): BestScoreRecord {
  try {
    const val = localStorage.getItem(key);
    if (!val) return { exp: 0, level: 'normal', totalQ: 25 };
    if (val.trim().startsWith('{')) {
      return JSON.parse(val) as BestScoreRecord;
    }
    const num = parseInt(val);
    return { exp: isNaN(num) ? 0 : num, level: 'normal', totalQ: 25 };
  } catch {
    return { exp: 0, level: 'normal', totalQ: 25 };
  }
}

export function getBestExp(key: string): number {
  return getBestRecord(key).exp;
}

export function saveBestRecord(key: string, exp: number, level: Level, totalQ: number, maxExp?: number, isPerfect?: boolean): boolean {
  try {
    const prev = getBestRecord(key);
    if (exp > prev.exp) {
      const record: BestScoreRecord = { exp, level, totalQ, maxExp, isPerfect };
      localStorage.setItem(key, JSON.stringify(record));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getRankForRecord(key: string): { rank: Rank; modifier: string; isPerfect: boolean } | null {
  const record = getBestRecord(key);
  if (record.exp <= 0) return null;
  const maxExpFallback = record.maxExp || getMaxExp(record.level, record.totalQ || 25);
  return getRankModifier(record.exp, record.level, !!record.isPerfect, maxExpFallback);
}
