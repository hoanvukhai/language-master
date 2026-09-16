import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import type { Kanji, KanjiWord } from '../../../types';
import {
  RANKS,
  LEVEL_EXP_THRESHOLDS,
} from '../../../lib/rankSystem';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

// ── types ────────────────────────────────────────────────────────
export type Level = 'easy' | 'normal' | 'hard';

export const LEVEL_CONFIG: Record<Level, { label: string; kanji: string; questions: number; blitzSecs: number; hintPenalty: number; freeHint: boolean }> = {
  easy:   { label: 'Dễ',  kanji: '入門', questions: 18, blitzSecs: 9999, hintPenalty: 0, freeHint: true  },
  normal: { label: 'Vừa', kanji: '普通', questions: 30, blitzSecs: 300, hintPenalty: 2, freeHint: false },
  hard:   { label: 'Khó', kanji: '上級', questions: 42, blitzSecs: 180, hintPenalty: 0, freeHint: false },
};

export type QType = 'quiz' | 'hanviet_quiz' | 'typing' | 'flashcard' | 'error' | 'matching';

export interface BaseQ { id: string; type: QType; explanation?: string; }
export interface QuizOption { id: string; label: string; subLabel?: string }

export interface QuizQ extends BaseQ {
  type: 'quiz';
  prompt: string; promptSub?: string;
  options: QuizOption[];
  correctId: string;
}
export interface HanVietQ extends BaseQ {
  type: 'hanviet_quiz';
  prompt: string; promptSub?: string;
  options: QuizOption[];
  correctId: string;
  direction: 'kanji2hv' | 'hv2kanji';
}
export interface TypingQ extends BaseQ {
  type: 'typing';
  prompt: string; promptSub?: string;
  answer: string; answerDisplay: string; hintText?: string;
  inputMode: 'jp' | 'vi';
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

export type UnifiedQ = QuizQ | HanVietQ | TypingQ | FlashQ | ErrorQ | MatchQ;

export interface AttemptRecord {
  qId: string;
  type: QType;
  prompt: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface FlatWord { kanji: Kanji; word: KanjiWord }

// ── helpers ──────────────────────────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function getMeaning(w: KanjiWord): string {
  return typeof w.meaning === 'object' ? w.meaning.vi : w.meaning;
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
  flashcard: 5, quiz: 8, hanviet_quiz: 8, error: 8, typing: 15, matching: 45
};

export const BASE_SCORES: Record<QType, number> = {
  flashcard: 5, quiz: 10, hanviet_quiz: 10, error: 10, typing: 20, matching: 0
};

export function calcExp(baseScore: number, streak: number, timeLeft: number, level: Level, correct: number, total: number): number {
  let finalScore = baseScore;
  if (level === 'normal') {
    const accuracy = total > 0 ? (correct / total) : 0;
    finalScore += (timeLeft * 2) * accuracy;
  }
  if (level !== 'easy') finalScore += Math.min(10, streak * 0.5);
  return Math.round(finalScore);
}

// ── buildQuestions ───────────────────────────────────────────────
export function buildQuestions(flat: FlatWord[], allKanji: Kanji[], opts: { totalQ: number; runMode: 'vocab' | 'character' }): UnifiedQ[] {
  const { totalQ, runMode } = opts;
  const sp = shuffle(flat);
  const qs: UnifiedQ[] = [];

  const ratio = totalQ / 30; // normalised
  
  if (runMode === 'vocab') {
    const dist = {
      quiz:      Math.round(6 * ratio),
      typing:    Math.round(6 * ratio),
      flashcard: Math.round(6 * ratio),
      error:     Math.round(6 * ratio),
      matching:  1,
    };

    let spIdx = 0;
    
    // Quiz
    for (let i = 0; i < dist.quiz && spIdx < sp.length; i++) {
      const fw = sp[spIdx++];
      const { word } = fw;
      const meaning = getMeaning(word);
      const distractors = shuffle(flat.filter(f => f.word.id !== word.id)).slice(0, 3).map(f => f.word);

      const dirs = ['w2m', 'm2w'];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      let exp = `Đáp án đúng:\n• ${word.word} (${word.hiragana}): ${meaning}`;
      if (distractors.length > 0) {
        exp += `\n\nChi tiết các phương án khác:\n` + distractors.map(d => `• ${d.word} (${d.hiragana}): ${getMeaning(d)}`).join('\n');
      }

      if (dir === 'w2m') {
        const opts = shuffle([word, ...distractors]).map((o, idx) => ({ id: `opt_${i}_${idx}`, label: getMeaning(o) }));
        const correctOpt = opts.find(o => o.label === meaning)!;
        qs.push({ id: `quiz-${i}`, type: 'quiz', prompt: word.word, promptSub: word.hiragana, options: opts, correctId: correctOpt.id, explanation: exp });
      } else if (dir === 'm2w') {
        const opts = shuffle([word, ...distractors]).map((o, idx) => ({ id: `opt_${i}_${idx}`, label: o.word, subLabel: o.hiragana }));
        const correctOpt = opts.find(o => o.label === word.word)!;
        qs.push({ id: `quiz-${i}`, type: 'quiz', prompt: meaning, options: opts, correctId: correctOpt.id, explanation: exp });
      }
    }

    // Typing
    for (let i = 0; i < dist.typing && spIdx < sp.length; i++) {
      const { kanji, word } = sp[spIdx++];
      const meaning = getMeaning(word);
      const dir = Math.random() > 0.5 ? 'm2h' : 'w2h';
      const exp = `${word.word} (${word.hiragana}) — Nghĩa: ${meaning}`;
      if (dir === 'm2h') {
        qs.push({ id: `typing-v-${i}`, type: 'typing', prompt: meaning, promptSub: kanji.character + ' — ' + kanji.hanViet, answer: word.hiragana, answerDisplay: `${word.word} (${word.hiragana})`, hintText: word.word, inputMode: 'jp', explanation: exp });
      } else {
        qs.push({ id: `typing-v-${i}`, type: 'typing', prompt: word.word, promptSub: meaning, answer: word.hiragana, answerDisplay: word.hiragana, hintText: word.hiragana, inputMode: 'jp', explanation: exp });
      }
    }

    // Flashcard
    for (let i = 0; i < dist.flashcard && spIdx < sp.length; i++) {
      const { word } = sp[spIdx++];
      const meaning = getMeaning(word);
      const dir = Math.random() > 0.5 ? 'w2m' : 'm2w';
      const exp = `${word.word} (${word.hiragana}) — Nghĩa: ${meaning}`;
      if (dir === 'm2w') {
        qs.push({ id: `flash-v-${i}`, type: 'flashcard', front: meaning, back: word.word, backSub: word.hiragana, explanation: exp });
      } else {
        qs.push({ id: `flash-v-${i}`, type: 'flashcard', front: word.word, frontSub: word.hiragana, back: meaning, explanation: exp });
      }
    }

    // Error
    for (let i = 0; i < dist.error && spIdx < sp.length; i++) {
      const { word } = sp[spIdx++];
      const isCorrect = Math.random() > 0.5;
      const actualMeaning = getMeaning(word);
      const distractorFw = shuffle(flat.filter(f => f.word.id !== word.id))[0];
      const displayed = isCorrect ? actualMeaning : getMeaning(distractorFw?.word || word);
      let exp = `${word.word} (${word.hiragana}) — Nghĩa đúng: ${actualMeaning}`;
      if (!isCorrect && distractorFw) {
        exp += `\n\nNghĩa được hiển thị "${displayed}" là của từ:\n• ${distractorFw.word.word} (${distractorFw.word.hiragana}): ${displayed}`;
      }
      qs.push({ id: `error-${i}`, type: 'error', word: word.word, hiragana: word.hiragana, displayedMeaning: displayed, isCorrect, actualMeaning, explanation: exp });
    }

    // Matching
    if (flat.length >= 8) {
      const mws = shuffle(flat).slice(0, 8);
      const pairs = mws.map(fw => ({
        jp: fw.word.word,
        vi: getMeaning(fw.word),
        jpSub: fw.word.hiragana,
        pairId: fw.word.id
      }));
      const exp = mws.map(fw => `${fw.word.word} (${fw.word.hiragana}) = ${getMeaning(fw.word)}`).join('\n');
      qs.push({ id: `match-vocab`, type: 'matching', pairs, explanation: exp });
    }
  } else {
    // character mode
    const dist = {
      hanviet:   Math.round(10 * ratio),
      typing:    Math.round(10 * ratio),
      flashcard: Math.round(9 * ratio),
      matching:  1,
    };

    const makeKanjiExplanation = (k: Kanji) => {
      const wordsList = k.words.map(w => `• ${w.word} (${w.hiragana}): ${getMeaning(w)}`).join('\n');
      return `Chữ Hán: ${k.character} (Hán Việt: ${k.hanViet})\nBài học: ${k.lesson}\nTừ ghép đi kèm:\n${wordsList}`;
    };

    const mixedKanjiAndWords: { id: string, character: string, hanViet: string, lesson: string, explanation: string }[] = [];
    allKanji.forEach(k => {
      mixedKanjiAndWords.push({
        id: k.id,
        character: k.character,
        hanViet: k.hanViet,
        lesson: k.lesson || '',
        explanation: makeKanjiExplanation(k)
      });
      if (k.words) {
        k.words.filter(w => w.hanVietWord).forEach((w, idx) => {
          mixedKanjiAndWords.push({
            id: `${k.id}_w_${idx}`,
            character: w.word,
            hanViet: w.hanVietWord as string,
            lesson: k.lesson || '',
            explanation: `${w.word} (${w.hiragana}) = ${typeof w.meaning === 'object' ? w.meaning.vi : w.meaning}\nÂm Hán Việt: ${w.hanVietWord}`
          });
        });
      }
    });
    const shuffledMixed = shuffle(mixedKanjiAndWords);

    let skIdx = 0;

    // HanViet quiz
    for (let i = 0; i < dist.hanviet && skIdx < shuffledMixed.length; i++) {
      const k = shuffledMixed[skIdx++];
      const dir: 'kanji2hv' | 'hv2kanji' = Math.random() > 0.5 ? 'hv2kanji' : 'kanji2hv';
      const distractorKanji = shuffle(shuffledMixed.filter(kk => kk.id !== k.id)).slice(0, 3);
      let exp = k.explanation;
      if (distractorKanji.length > 0) {
        exp += `\n\nChi tiết các phương án khác:\n` + distractorKanji.map(dk => `• ${dk.character} (${dk.hanViet})`).join('\n');
      }
      if (dir === 'kanji2hv') {
        const allHV = [k.hanViet, ...distractorKanji.map(kk => kk.hanViet)];
        const opts = shuffle(allHV).map((l, idx) => ({ id: `hv_${i}_${idx}`, label: l }));
        const correctOpt = opts.find(o => o.label === k.hanViet)!;
        qs.push({ id: `hv-${i}`, type: 'hanviet_quiz', prompt: k.character, direction: dir, options: opts, correctId: correctOpt.id, explanation: exp });
      } else {
        const allChar = [k.character, ...distractorKanji.map(kk => kk.character)];
        const opts = shuffle(allChar).map((l, idx) => ({ id: `hv_${i}_${idx}`, label: l }));
        const correctOpt = opts.find(o => o.label === k.character)!;
        qs.push({ id: `hv-${i}`, type: 'hanviet_quiz', prompt: k.hanViet, promptSub: `Bài ${k.lesson}`, direction: dir, options: opts, correctId: correctOpt.id, explanation: exp });
      }
    }

    // Typing kanji
    for (let i = 0; i < dist.typing && skIdx < shuffledMixed.length; i++) {
      const k = shuffledMixed[skIdx++];
      const exp = k.explanation;
      qs.push({ id: `typing-r-${i}`, type: 'typing', prompt: k.character, answer: k.hanViet.toLowerCase(), answerDisplay: k.hanViet, hintText: `Bài ${k.lesson}`, inputMode: 'vi', explanation: exp });
    }

    // Flashcard kanji
    for (let i = 0; i < dist.flashcard && skIdx < shuffledMixed.length; i++) {
      const k = shuffledMixed[skIdx++];
      const dir = Math.random() > 0.5 ? 'k2hv' : 'hv2k';
      const exp = k.explanation;
      if (dir === 'hv2k') {
        qs.push({ id: `flash-r-${i}`, type: 'flashcard', front: k.hanViet, back: k.character, explanation: exp });
      } else {
        qs.push({ id: `flash-r-${i}`, type: 'flashcard', front: k.character, back: k.hanViet, explanation: exp });
      }
    }

    // Matching
    if (shuffledMixed.length >= 8) {
      const mks = shuffle(shuffledMixed).slice(0, 8);
      const exp = mks.map(k => `${k.character} = ${k.hanViet}`).join('\n');
      qs.push({ id: 'matching-0', type: 'matching', pairs: mks.map(k => ({ jp: k.character, vi: k.hanViet, pairId: k.id })), explanation: exp });
    }
  }

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
    if (type === 'quiz' || type === 'hanviet_quiz') {
      const firstQuiz = shortcuts.quiz[0]?.toUpperCase() || '1';
      const lastQuiz = shortcuts.quiz[shortcuts.quiz.length - 1]?.toUpperCase() || '4';
      return [
        { key: `${firstQuiz}-${lastQuiz}`, desc: 'Chọn' },
        { key: nextKey, desc: 'Tiếp' }
      ];
    }
    if (type === 'typing') {
      return [
        { key: nextKey, desc: 'Kiểm tra/Tiếp' }
      ];
    }
    if (type === 'flashcard') {
      return [
        { key: formatKeyForDisplay(shortcuts.flashcard.flip), desc: 'Lật' },
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
    <div className="flex items-center gap-2 flex-wrap mt-1 mb-1">
      {hints.map(h => (
        <span key={h.key} className="flex items-center gap-1 text-xs text-slate-400">
          <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 font-mono text-xs">{h.key}</kbd>
          {h.desc}
        </span>
      ))}
    </div>
  );
}
