import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import {
  RANKS,
  LEVEL_EXP_THRESHOLDS,
} from '../../../lib/rankSystem';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';
import { formatDualIpa } from '../../../lib/english/ipaHelper';

// ── types ────────────────────────────────────────────────────────
export type Level = 'easy' | 'normal' | 'hard';

export const LEVEL_CONFIG: Record<Level, { label: string; kanji: string; questions: number; blitzSecs: number; hintPenalty: number; freeHint: boolean }> = {
  easy: { label: 'Dễ', kanji: '入門', questions: 15, blitzSecs: 300, hintPenalty: 0, freeHint: true },
  normal: { label: 'Vừa', kanji: '普通', questions: 25, blitzSecs: 180, hintPenalty: 2, freeHint: false },
  hard: { label: 'Khó', kanji: '上級', questions: 35, blitzSecs: 120, hintPenalty: 0, freeHint: false },
};

export type QType = 'quiz' | 'typing' | 'flashcard' | 'error' | 'matching';

export interface BaseQ { id: string; type: QType; explanation?: string; }
export interface QuizOption { id: string; label: string; subLabel?: string }

export interface QuizQ extends BaseQ {
  type: 'quiz';
  prompt: string; promptSub?: string;
  options: QuizOption[];
  correctId: string;
}
export interface TypingQ extends BaseQ {
  type: 'typing';
  prompt: string; promptSub?: string;
  answer: string; answerDisplay: string;
  hintText?: string;
}
export interface FlashQ extends BaseQ {
  type: 'flashcard';
  front: string; frontSub?: string; back: string; backSub?: string;
}
export interface ErrorQ extends BaseQ {
  type: 'error';
  word: string; hiragana: string;
  displayedMeaning: string; isCorrect: boolean; actualMeaning: string;
}
export interface MatchQ extends BaseQ {
  type: 'matching';
  pairs: { jp: string; vi: string; jpSub?: string; pairId: string }[];
}

export type UnifiedQ = QuizQ | TypingQ | FlashQ | ErrorQ | MatchQ;

export interface AttemptRecord {
  qId: string;
  type: QType;
  prompt: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

// ── helpers ──────────────────────────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function getMeaning(w: any): string {
  return typeof w.meaning === 'object' ? w.meaning.vi : (w.meaning || '');
}

export const matchKey = (eKey: string, shortcut: string | string[]) => {
  const k = eKey.toLowerCase();
  const normalize = (val: string) => {
    const v = val.toLowerCase();
    if (v === 'space') return ' ';
    return v;
  };
  if (Array.isArray(shortcut)) {
    return shortcut.some(s => normalize(s) === k);
  }
  return normalize(shortcut) === k;
};

export const formatKeyForDisplay = (keyOrKeys: string | string[]) => {
  const normalizeDisplay = (k: string) => {
    if (k === ' ') return 'Space';
    if (k.toLowerCase() === 'space') return 'Space';
    if (k.toLowerCase() === 'arrowleft') return '←';
    if (k.toLowerCase() === 'arrowright') return '→';
    if (k.toLowerCase() === 'arrowup') return '↑';
    if (k.toLowerCase() === 'arrowdown') return '↓';
    return k.toUpperCase();
  };
  if (Array.isArray(keyOrKeys)) {
    return keyOrKeys.map(normalizeDisplay).join('/');
  }
  return normalizeDisplay(keyOrKeys);
};

export const TIME_LIMITS: Record<QType, number> = {
  flashcard: 5, quiz: 8, error: 8, typing: 15, matching: 45
};

export const BASE_SCORES: Record<QType, number> = {
  flashcard: 5, quiz: 10, error: 10, typing: 20, matching: 0
};

export function calcExp(baseScore: number, streak: number, timeLeft: number, level: Level, correct: number, total: number): number {
  let finalScore = baseScore;
  if (level === 'normal') {
    const accuracy = total > 0 ? (correct / total) : 0;
    finalScore += (timeLeft * 0.5) * accuracy;
  }
  if (level !== 'easy') finalScore += Math.min(10, streak * 0.5);
  return Math.round(finalScore);
}

// ── buildQuestions ───────────────────────────────────────────────
export function buildQuestions(pool: any[], opts: { totalQ: number }, course?: { template?: string }): UnifiedQ[] {
  const { totalQ } = opts;
  const sp = shuffle(pool);
  const qs: UnifiedQ[] = [];
  const types: QType[] = ['quiz', 'typing', 'flashcard', 'error', 'matching'];
  const perType = Math.floor(totalQ / types.length);

  const isEnglish = course?.template === 'english';

  // ── Japanese word helpers ─────────────────────────────────────────
  const hasKanji = (w: any) => w.kanji && w.kanji !== w.hiragana && !/^[\u30A0-\u30FF\u30FC\u30A1-\u30F6]+$/.test(w.kanji);
  const getJpLabel = (o: any) => o.kanji ? (o.alt_kanji ? `${o.kanji} (${o.alt_kanji})` : o.kanji) : (o.hiragana || '');
  const getJpSubLabel = (o: any): string | undefined => o.kanji ? o.hiragana : undefined;

  // ── English word helpers ──────────────────────────────────────────
  const getEnLabel = (o: any): string => o.word || '';
  const getEnSubLabel = (o: any): string | undefined => formatDualIpa(o) || undefined;

  types.forEach((type, ti) => {
    const slice = sp.slice(ti * perType, (ti + 1) * perType + 2);
    for (let i = 0; i < perType && i < slice.length; i++) {
      const w = slice[i];
      const id = `${type}-${ti}-${i}`;

      const meaning = getMeaning(w);

      if (isEnglish) {
        // ── English branch ─────────────────────────────────────────────
        const label = getEnLabel(w);
        const sub = getEnSubLabel(w);

        if (type === 'quiz') {
          const distractors = shuffle(pool.filter((p: any) => p.id !== w.id)).slice(0, 3);
          const dir = Math.random() > 0.5 ? 'w2m' : 'm2w';
          const expWord = sub ? `${label} (${sub})` : label;
          let exp = `Đáp án đúng:\n• ${expWord}: ${meaning}`;
          if (distractors.length > 0) {
            exp += `\n\nCác từ khác:\n` + distractors.map((d: any) => {
              const dSub = getEnSubLabel(d);
              return `• ${getEnLabel(d)}${dSub ? ` (${dSub})` : ''}: ${getMeaning(d)}`;
            }).join('\n');
          }
          if (dir === 'w2m') {
            const opts = shuffle([w, ...distractors]).map((o: any) => ({ id: o.id, label: getMeaning(o) }));
            qs.push({ id, type: 'quiz', prompt: label, promptSub: sub, options: opts, correctId: w.id, explanation: exp });
          } else {
            const opts = shuffle([w, ...distractors]).map((o: any) => ({ id: o.id, label: getEnLabel(o), subLabel: getEnSubLabel(o) }));
            qs.push({ id, type: 'quiz', prompt: meaning, options: opts, correctId: w.id, explanation: exp });
          }
        } else if (type === 'typing') {
          // Show meaning → type the English word
          const exp = `${label}${sub ? ` (${sub})` : ''} — Nghĩa: ${meaning}`;
          qs.push({ id, type: 'typing', prompt: meaning, answer: label, answerDisplay: label, hintText: sub, explanation: exp });
        } else if (type === 'flashcard') {
          const dir = Math.random() > 0.5 ? 'w2m' : 'm2w';
          const exp = `${label}${sub ? ` (${sub})` : ''} — Nghĩa: ${meaning}`;
          if (dir === 'm2w') {
            qs.push({ id, type: 'flashcard', front: meaning, back: label, backSub: sub, explanation: exp });
          } else {
            qs.push({ id, type: 'flashcard', front: label, frontSub: sub, back: meaning, explanation: exp });
          }
        } else if (type === 'error') {
          const isCorrect = Math.random() > 0.5;
          const distractorWord = shuffle(pool.filter((p: any) => p.id !== w.id))[0];
          const displayed = isCorrect ? meaning : getMeaning(distractorWord || w);
          let exp = `${label}${sub ? ` (${sub})` : ''} — Nghĩa đúng: ${meaning}`;
          if (!isCorrect && distractorWord) {
            exp += `\n\nNghĩa được hiển thị "${displayed}" là của từ:\n• ${getEnLabel(distractorWord)}: ${displayed}`;
          }
          qs.push({ id, type: 'error', word: label, hiragana: sub || '', displayedMeaning: displayed, isCorrect, actualMeaning: meaning, explanation: exp } as ErrorQ);
        } else if (type === 'matching') {
          if (i === 0) {
            const mws = shuffle(pool).slice(0, 8);
            const exp = mws.map((mw: any) => `${getEnLabel(mw)}${getEnSubLabel(mw) ? ` (${getEnSubLabel(mw)})` : ''} = ${getMeaning(mw)}`).join('\n');
            qs.push({
              id, type: 'matching',
              pairs: mws.map((mw: any) => ({ jp: getEnLabel(mw), vi: getMeaning(mw), jpSub: getEnSubLabel(mw), pairId: mw.id })),
              explanation: exp
            } as MatchQ);
          }
        }
      } else {
        // ── Japanese branch (original) ──────────────────────────────────
        const label = getJpLabel(w);

        if (type === 'quiz') {
          const distractors = shuffle(pool.filter((p: any) => p.id !== w.id)).slice(0, 3);
          const dirs = ['w2m', 'm2w'];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          let exp = `Đáp án đúng:\n• ${w.kanji ? `${w.kanji} (${w.hiragana})` : w.hiragana}: ${meaning}`;
          if (distractors.length > 0) {
            exp += `\n\nChi tiết các phương án khác:\n` + distractors.map((d: any) => `• ${d.kanji ? `${d.kanji} (${d.hiragana})` : d.hiragana}: ${getMeaning(d)}`).join('\n');
          }
          if (dir === 'w2m') {
            const opts = shuffle([w, ...distractors]).map((o: any) => ({ id: o.id, label: getMeaning(o) }));
            qs.push({ id, type: 'quiz', prompt: label, promptSub: w.hiragana, options: opts, correctId: w.id, explanation: exp });
          } else {
            const opts = shuffle([w, ...distractors]).map((o: any) => ({ id: o.id, label: getJpLabel(o), subLabel: getJpSubLabel(o) }));
            qs.push({ id, type: 'quiz', prompt: meaning, options: opts, correctId: w.id, explanation: exp });
          }
        } else if (type === 'typing') {
          const dir = (Math.random() > 0.5 && hasKanji(w)) ? 'w2h' : 'm2h';
          const exp = `${w.kanji ? `${w.kanji} (${w.hiragana})` : w.hiragana} — Nghĩa: ${meaning}`;
          const isKatakanaWord = w.kanji && /^[\u30A0-\u30FF\u30FC]+$/.test(w.kanji);
          const expectedAnswer = isKatakanaWord ? w.kanji : w.hiragana;
          if (dir === 'm2h') {
            qs.push({ id, type: 'typing', prompt: meaning, answer: expectedAnswer, answerDisplay: `${label} (${expectedAnswer})`, hintText: label, explanation: exp });
          } else {
            qs.push({ id, type: 'typing', prompt: label, answer: expectedAnswer, answerDisplay: expectedAnswer, hintText: meaning, explanation: exp });
          }
        } else if (type === 'flashcard') {
          const dir = Math.random() > 0.5 ? 'w2m' : 'm2w';
          const exp = `${w.kanji ? `${w.kanji} (${w.hiragana})` : w.hiragana} — Nghĩa: ${meaning}`;
          if (dir === 'm2w') {
            qs.push({ id, type: 'flashcard', front: meaning, back: label, backSub: w.hiragana, explanation: exp });
          } else {
            qs.push({ id, type: 'flashcard', front: label, frontSub: w.hiragana, back: meaning, explanation: exp });
          }
        } else if (type === 'error') {
          const isCorrect = Math.random() > 0.5;
          const distractorWord = shuffle(pool.filter((p: any) => p.id !== w.id))[0];
          const displayed = isCorrect ? meaning : getMeaning(distractorWord || w);
          let exp = `${w.kanji ? `${w.kanji} (${w.hiragana})` : w.hiragana} — Nghĩa đúng: ${meaning}`;
          if (!isCorrect && distractorWord) {
            exp += `\n\nNghĩa được hiển thị "${displayed}" là của từ:\n• ${distractorWord.kanji ? `${distractorWord.kanji} (${distractorWord.hiragana})` : distractorWord.hiragana}: ${displayed}`;
          }
          qs.push({ id, type: 'error', word: label, hiragana: w.hiragana, displayedMeaning: displayed, isCorrect, actualMeaning: meaning, explanation: exp } as ErrorQ);
        } else if (type === 'matching') {
          if (i === 0) {
            const mws = shuffle(pool).slice(0, 8);
            const exp = mws.map((mw: any) => `${mw.kanji ? `${mw.kanji} (${mw.hiragana})` : mw.hiragana} = ${getMeaning(mw)}`).join('\n');
            qs.push({
              id, type: 'matching',
              pairs: mws.map((mw: any) => ({ jp: getJpLabel(mw), vi: getMeaning(mw), jpSub: getJpSubLabel(mw), pairId: mw.id })),
              explanation: exp
            } as MatchQ);
          }
        }
      }
    }
  });
  return shuffle(qs);
}

// ── RankTooltip ──────────────────────────────────────────────────
export function RankTooltip({ level }: { level: Level }) {
  const [open, setOpen] = useState(false);
  const thresholds = LEVEL_EXP_THRESHOLDS[level];

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
        <Info size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute right-0 top-7 z-50 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-700 dark:text-white text-sm">🏅 Bảng cấp độ</h4>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
              </div>
              <div className="space-y-1.5">
                {RANKS.map(r => (
                  <div key={r.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${r.bgColor}`}>
                    <span className="text-lg">{r.emoji}</span>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div>
                        <div className={`text-xs font-bold ${r.color}`}>{r.kanji} — {r.nameVi}</div>
                        <div className="text-xs text-slate-500">{thresholds[r.badge]} EXP+</div>
                      </div>
                      <div className={`text-xs font-black opacity-60 ${r.color}`}>
                        {r.badge}- / {r.badge} / {r.badge}+
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── KbHints ──────────────────────────────────────────────────────
export function KbHints({ type }: { type: QType }) {
  const hints = useMemo(() => {
    const nextKey = formatKeyForDisplay(shortcuts.general.next);
    if (type === 'quiz') {
      const firstQuiz = shortcuts.quiz[0]?.toUpperCase() || '1';
      const lastQuiz = shortcuts.quiz[shortcuts.quiz.length - 1]?.toUpperCase() || '4';
      return [
        { key: `${firstQuiz}-${lastQuiz}`, desc: 'Chọn đáp án' },
        { key: nextKey, desc: 'Tiếp theo' }
      ];
    }
    if (type === 'typing') {
      return [
        { key: nextKey, desc: 'Kiểm tra/Tiếp tục' }
      ];
    }
    if (type === 'flashcard') {
      return [
        { key: formatKeyForDisplay(shortcuts.flashcard.flip), desc: 'Lật thẻ' },
        { key: formatKeyForDisplay(shortcuts.flashcard.notRemembered), desc: 'Chưa nhớ' },
        { key: formatKeyForDisplay(shortcuts.flashcard.remembered), desc: 'Nhớ rồi' }
      ];
    }
    if (type === 'error') {
      return [
        { key: formatKeyForDisplay(shortcuts.error.wrong), desc: 'Sai' },
        { key: formatKeyForDisplay(shortcuts.error.correct), desc: 'Đúng' }
      ];
    }
    if (type === 'matching') {
      const firstMatch = shortcuts.matching[0]?.toUpperCase() || '1';
      const lastMatch = shortcuts.matching[shortcuts.matching.length - 1]?.toUpperCase() || 'V';
      return [
        { key: `${firstMatch}-${lastMatch}`, desc: 'Chọn thẻ' }
      ];
    }
    return [];
  }, [type]);

  if (!hints.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mt-1 mb-2">
      {hints.map(h => (
        <span key={h.key} className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 font-mono text-xs">{h.key}</kbd>
          {h.desc}
        </span>
      ))}
    </div>
  );
}
