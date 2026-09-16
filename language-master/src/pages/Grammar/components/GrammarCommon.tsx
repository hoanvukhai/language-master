import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { grammarN3Clean as grammarN3 } from '../../../data/jlpt/n3/grammarN3';
import {
  RANKS,
  LEVEL_EXP_THRESHOLDS,
} from '../../../lib/rankSystem';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

// ── types ────────────────────────────────────────────────────────
export type Level = 'easy' | 'normal' | 'hard';

export const LEVEL_CONFIG: Record<Level, { label: string; kanji: string; questions: number; blitzSecs: number; hintPenalty: number; freeHint: boolean }> = {
  easy: { label: 'Dễ', kanji: '入門', questions: 15, blitzSecs: 9999, hintPenalty: 0, freeHint: true },
  normal: { label: 'Vừa', kanji: '普通', questions: 25, blitzSecs: 300, hintPenalty: 2, freeHint: false },
  hard: { label: 'Khó', kanji: '上級', questions: 35, blitzSecs: 180, hintPenalty: 0, freeHint: false },
};

export type QType = 'quiz' | 'flashcard' | 'error' | 'matching' | 'fill_blank';

export interface BaseQ { id: string; type: QType; explanation?: string; }
export interface QuizOption { id: string; label: string; subLabel?: string }

export interface QuizQ extends BaseQ {
  type: 'quiz';
  prompt: string; promptSub?: string;
  options: QuizOption[];
  correctId: string;
}
export interface FlashQ extends BaseQ {
  type: 'flashcard';
  front: string; frontSub?: string; back: string; backSub?: string;
}
export interface ErrorQ extends BaseQ {
  type: 'error';
  correctSentence: string; wrongSentence: string;
  isCorrect: boolean;
  kana?: string; translation: string;
  structure: string; wrongStructure: string;
  caution: string;
}
export interface FillBlankQ extends BaseQ {
  type: 'fill_blank';
  blankedSentence: string; fullSentence: string;
  kana?: string; translation: string;
  options: QuizOption[];
  correctId: string;
  caution: string;
}
export interface MatchQ extends BaseQ {
  type: 'matching';
  pairs: { jp: string; vi: string; jpSub?: string; pairId: string }[];
}

export type UnifiedQ = QuizQ | FlashQ | ErrorQ | MatchQ | FillBlankQ;

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

export function makeWrongSentence(g: typeof grammarN3[0], ex: typeof grammarN3[0]['examples'][0]) {
  const bracketMatch = ex.jp.match(/\[([^\]]+)\]/);
  if (!bracketMatch) return null;
  const correctAnswer = bracketMatch[1];
  const blanked = ex.jp.replace(/\[[^\]]+\]/, '___');
  const correctHighlighted = blanked.replace('___', `<${correctAnswer}>`);

  let wrongStructure = '';
  const sameGroup = grammarN3.filter(x => x.group === g.group && x.id !== g.id);

  if (sameGroup.length > 0) {
    const randItem = sameGroup[Math.floor(Math.random() * sameGroup.length)];
    const exMatch = randItem.examples[0]?.jp.match(/\[([^\]]+)\]/);
    wrongStructure = exMatch ? exMatch[1] : randItem.structure.replace(/〜/g, '').split('/')[0];
  } else {
    const randItem = grammarN3[Math.floor(Math.random() * grammarN3.length)];
    wrongStructure = randItem.structure.replace(/〜/g, '').split('/')[0];
  }

  if (!wrongStructure) wrongStructure = 'こと';
  const wrongHighlighted = blanked.replace('___', `<${wrongStructure}>`);

  return {
    correctSentence: correctHighlighted,
    wrongSentence: wrongHighlighted,
    wrongStructure
  };
}

export function makeBlankSentence(jp: string, structure: string): { blanked: string; answer: string; found: boolean } {
  const bracketMatch = jp.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const answer = bracketMatch[1];
    const blanked = jp.replace(/\[[^\]]+\]/, '＿＿＿');
    return { blanked, answer, found: true };
  }

  const variants = structure
    .replace(/〜/g, '')
    .split(/[/／]/)
    .map(v => v.trim())
    .filter(v => v.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const v of variants) {
    if (jp.includes(v)) {
      return { blanked: jp.replace(v, '＿＿＿'), answer: v, found: true };
    }
  }
  return { blanked: jp.slice(0, Math.ceil(jp.length * 0.6)) + '＿＿＿', answer: structure, found: false };
}

export const TIME_LIMITS: Record<QType, number> = {
  flashcard: 5, quiz: 10, error: 12, fill_blank: 15, matching: 45
};

export const BASE_SCORES: Record<QType, number> = {
  flashcard: 5, quiz: 10, error: 15, fill_blank: 15, matching: 0
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
export function buildQuestions(opts: { totalQ: number; language: string }): UnifiedQ[] {
  const { totalQ, language } = opts;
  const flatG = shuffle([...grammarN3]);
  const qs: UnifiedQ[] = [];

  const ratio = totalQ / 25;
  const dist = {
    quiz: Math.round(6 * ratio),
    fill_blank: Math.round(6 * ratio),
    error: Math.round(6 * ratio),
    flashcard: Math.round(6 * ratio),
    matching: 1,
  };

  const getMeaning = (g: typeof grammarN3[0]) => typeof g.meaning === 'object' ? (g.meaning as any)[language as 'vi' | 'en'] || g.meaning.vi : g.meaning;
  const getCaution = (g: typeof grammarN3[0]) => g.caution ? (typeof g.caution === 'object' ? (g.caution as any)[language as 'vi' | 'en'] || g.caution.vi : g.caution) : '';

  // Quiz
  for (let i = 0; i < dist.quiz && i < flatG.length; i++) {
    const g = flatG[i];
    const meaning = getMeaning(g);

    const sameGroup = grammarN3.filter(x => x.group === g.group && x.id !== g.id).map(getMeaning);
    const others = grammarN3.filter(x => x.id !== g.id).map(getMeaning);
    const distractorsMeaning = shuffle([...new Set([...sameGroup, ...others])]).filter(m => m !== meaning).slice(0, 3);

    const sameGroupStr = grammarN3.filter(x => x.group === g.group && x.id !== g.id).map(x => x.structure);
    const othersStr = grammarN3.filter(x => x.id !== g.id).map(x => x.structure);
    const distractorsStr = shuffle([...new Set([...sameGroupStr, ...othersStr])]).filter(s => s !== g.structure).slice(0, 3);

    const dir = Math.random() > 0.5 ? 's2m' : 'm2s';
    
    let exp = `Đáp án đúng:\n• ${g.structure}: ${meaning}`;
    if (getCaution(g)) exp += `\n  Lưu ý: ${getCaution(g)}`;

    if (dir === 's2m') {
      const otherInfos: string[] = [];
      distractorsMeaning.forEach(m => {
        const found = grammarN3.find(x => getMeaning(x) === m);
        if (found) {
          otherInfos.push(`• ${found.structure}: ${m}`);
        }
      });
      if (otherInfos.length > 0) {
        exp += `\n\nChi tiết các phương án khác:\n` + otherInfos.join('\n');
      }

      const optsList = shuffle([meaning, ...distractorsMeaning]).map((m, idx) => ({ id: `opt_${i}_${idx}`, label: m }));
      const correctOpt = optsList.find(o => o.label === meaning)!;
      qs.push({ id: `quiz-${i}`, type: 'quiz', prompt: g.structure, promptSub: g.structureKana !== g.structure ? g.structureKana : undefined, options: optsList, correctId: correctOpt.id, explanation: exp });
    } else {
      const otherInfos: string[] = [];
      distractorsStr.forEach(s => {
        const found = grammarN3.find(x => x.structure === s);
        if (found) {
          otherInfos.push(`• ${s}: ${getMeaning(found)}`);
        }
      });
      if (otherInfos.length > 0) {
        exp += `\n\nChi tiết các phương án khác:\n` + otherInfos.join('\n');
      }

      const optsList = shuffle([g.structure, ...distractorsStr]).map((s, idx) => {
        const found = grammarN3.find(x => x.structure === s);
        return { id: `opt_${i}_${idx}`, label: s, subLabel: found && found.structureKana !== s ? found.structureKana : undefined };
      });
      const correctOpt = optsList.find(o => o.label === g.structure)!;
      qs.push({ id: `quiz-${i}`, type: 'quiz', prompt: meaning, options: optsList, correctId: correctOpt.id, explanation: exp });
    }
  }

  // Flashcard
  for (let i = 0; i < dist.flashcard && i < flatG.length; i++) {
    const g = flatG[(i + dist.quiz) % flatG.length];
    const meaning = getMeaning(g);
    const dir = 's2m';
    const exp = `Cấu trúc: ${g.structure}\nÝ nghĩa: ${getMeaning(g)}` + (getCaution(g) ? `\nLưu ý: ${getCaution(g)}` : '');
    if (dir === 's2m') {
      qs.push({ id: `flash-${i}`, type: 'flashcard', front: g.structure, frontSub: g.structureKana !== g.structure ? g.structureKana : undefined, back: meaning, explanation: exp });
    } else {
      qs.push({ id: `flash-${i}`, type: 'flashcard', front: meaning, back: g.structure, backSub: g.structureKana !== g.structure ? g.structureKana : undefined, explanation: exp });
    }
  }

  // Error Detect
  for (let i = 0; i < dist.error && i < flatG.length; i++) {
    const g = flatG[(i + dist.quiz + dist.flashcard) % flatG.length];
    const ex = shuffle([...g.examples])[0];
    const sentenceData = makeWrongSentence(g, ex);
    if (sentenceData) {
      const cleanKana = ex.kana ? ex.kana.replace(/\[([^\]]+)\]/g, '$1') : undefined;
      let exp = `Cấu trúc đúng:\n• ${g.structure}: ${getMeaning(g)}\nDịch câu đúng: ${ex.vi}`;
      if (getCaution(g)) exp += `\n  Lưu ý: ${getCaution(g)}`;
      if (Math.random() > 0.5) {
        // isCorrect = true
        qs.push({
          id: `error-${i}`, type: 'error',
          isCorrect: true,
          correctSentence: sentenceData.correctSentence,
          wrongSentence: sentenceData.wrongSentence,
          kana: cleanKana,
          translation: ex.vi,
          structure: g.structure,
          wrongStructure: sentenceData.wrongStructure,
          caution: getCaution(g),
          explanation: exp
        });
      } else {
        // isCorrect = false
        const foundWrong = grammarN3.find(x => x.structure.includes(sentenceData.wrongStructure) || x.structure === sentenceData.wrongStructure);
        if (foundWrong) {
          exp += `\n\nCấu trúc sai được dùng:\n• ${foundWrong.structure}: ${getMeaning(foundWrong)}`;
        } else {
          exp += `\n\nCấu trúc sai được dùng: "${sentenceData.wrongStructure}"`;
        }
        qs.push({
          id: `error-${i}`, type: 'error',
          isCorrect: false,
          correctSentence: sentenceData.correctSentence,
          wrongSentence: sentenceData.wrongSentence,
          kana: cleanKana,
          translation: ex.vi,
          structure: g.structure,
          wrongStructure: sentenceData.wrongStructure,
          caution: getCaution(g),
          explanation: exp
        });
      }
    }
  }

  // Fill Blank
  for (let i = 0; i < dist.fill_blank && i < flatG.length; i++) {
    const g = flatG[(i + dist.quiz + dist.flashcard + dist.error) % flatG.length];
    const ex = shuffle([...g.examples])[0];
    const { blanked, answer, found } = makeBlankSentence(ex.jp, g.structure);
    if (found && blanked.includes('＿＿＿')) {
      const fullSentence = ex.jp.replace(/\[([^\]]+)\]/g, '$1');
      const cleanKana = ex.kana ? ex.kana.replace(/\[([^\]]+)\]/g, '$1') : undefined;

      const getAnswerText = (x: typeof grammarN3[0]) => {
        for (const e of x.examples) {
          const m = e.jp.match(/\[([^\]]+)\]/);
          if (m) return m[1];
        }
        return x.structure.replace(/〜/g, '').split('/')[0].trim();
      };

      const sameGroup = grammarN3.filter(x => x.group === g.group && getAnswerText(x) !== answer).map(getAnswerText);
      const others = grammarN3.filter(x => getAnswerText(x) !== answer).map(getAnswerText);
      const distractors = shuffle([...new Set([...sameGroup, ...others])]).filter(s => s !== answer).slice(0, 3);
      const optsList = shuffle([answer, ...distractors]).map((s, idx) => ({ id: `opt_${i}_${idx}`, label: s }));
      const correctOpt = optsList.find(o => o.label === answer)!;
      
      let exp = `Đáp án đúng:\n• ${g.structure}: ${getMeaning(g)}\nDịch câu: ${ex.vi}`;
      if (getCaution(g)) exp += `\n  Lưu ý: ${getCaution(g)}`;

      const otherInfos: string[] = [];
      distractors.forEach(distAnswer => {
        const foundDist = grammarN3.find(x => x.structure.includes(distAnswer) || getAnswerText(x) === distAnswer);
        if (foundDist) {
          otherInfos.push(`• ${foundDist.structure}: ${getMeaning(foundDist)}`);
        }
      });
      if (otherInfos.length > 0) {
        exp += `\n\nChi tiết các phương án khác:\n` + otherInfos.join('\n');
      }

      qs.push({
        id: `fill-${i}`, type: 'fill_blank',
        blankedSentence: blanked, fullSentence,
        kana: cleanKana, translation: ex.vi,
        options: optsList, correctId: correctOpt.id,
        caution: getCaution(g),
        explanation: exp
      });
    }
  }

  // Matching
  {
    if (flatG.length >= 8) {
      const uniqueMws: typeof flatG = [];
      const seenStr = new Set<string>();
      const shuffledG = shuffle(flatG);
      for (const g of shuffledG) {
        if (!seenStr.has(g.structure)) {
          seenStr.add(g.structure);
          uniqueMws.push(g);
          if (uniqueMws.length === 8) break;
        }
      }
      const mws = uniqueMws.length >= 8 ? uniqueMws : shuffledG.slice(0, 8);
      const pairs = mws.map(g => ({
        jp: g.structure,
        vi: getMeaning(g),
        jpSub: g.structureKana !== g.structure ? g.structureKana : undefined,
        pairId: g.id
      }));
      const exp = mws.map(g => `${g.structure} = ${getMeaning(g)}`).join('\n');
      qs.push({ id: 'matching-0', type: 'matching', pairs, explanation: exp });
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
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 italic leading-normal">
                (*) Điểm số trên là điểm quy đổi (thang 300 điểm) dựa trên tỷ lệ EXP đạt được trên EXP tối đa, không phải điểm EXP thô từ game.
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
    if (type === 'quiz' || type === 'fill_blank') {
      const firstQuiz = shortcuts.quiz[0]?.toUpperCase() || '1';
      const lastQuiz = shortcuts.quiz[shortcuts.quiz.length - 1]?.toUpperCase() || '4';
      return [
        { key: `${firstQuiz}-${lastQuiz}`, desc: 'Chọn' },
        { key: nextKey, desc: 'Tiếp' }
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
