import { motion } from 'framer-motion';
import {  } from 'lucide-react';
import { formatKeyForDisplay } from './KanjiCommon';
import type { ErrorQ } from './KanjiCommon';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

interface KanjiErrorProps {
  q: ErrorQ;
  showKana: boolean;
  errorSelected: boolean | null;
  errorCorrect: boolean | null;
  onSelect: (choice: boolean, isCorrect: boolean) => void;
  countdown: number | null;
  onNext: () => void;
  resultSecs: number;
}

export default function KanjiError({
  q,
  showKana,
  errorSelected,
  errorCorrect,
  onSelect,
  countdown,
  onNext,
  resultSecs,
}: KanjiErrorProps) {
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 text-center shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="text-4xl font-black text-slate-800 dark:text-white">{q.word}</div>
        {showKana && <div className="text-amber-500">{q.hiragana}</div>}
        <div className="mt-3 text-lg text-slate-600 dark:text-slate-300 font-medium">→ {q.displayedMeaning}</div>
      </div>
      <div className="text-center text-sm text-slate-500">
        Cặp từ này đúng hay sai?{' '}
        <span className="ml-1 text-xs text-slate-400">
          <kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded font-mono">1</kbd> Đúng
          <span className="mx-1">·</span>
          <kbd className="px-1 bg-slate-100 dark:bg-slate-700 rounded font-mono">2</kbd> Sai
        </span>
      </div>
      {errorSelected === null && (
        <div className="flex gap-3">
          <button
            onClick={() => {
              const ok = !q.isCorrect;
              onSelect(false, ok);
            }}
            className="flex-1 py-3.5 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-700 font-bold border-2 border-red-200 text-sm flex items-center justify-center gap-1.5"
          >
            <kbd className="px-1.5 py-0.5 bg-red-200/50 dark:bg-red-800/50 rounded text-xs font-mono">
              {formatKeyForDisplay(shortcuts.error.wrong)}
            </kbd>{' '}
            ❌ Sai
          </button>
          <button
            onClick={() => {
              const ok = q.isCorrect;
              onSelect(true, ok);
            }}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 font-bold border-2 border-emerald-200 text-sm flex items-center justify-center gap-1.5"
          >
            ✅ Đúng{' '}
            <kbd className="px-1.5 py-0.5 bg-emerald-200/50 dark:bg-emerald-800/50 rounded text-xs font-mono">
              {formatKeyForDisplay(shortcuts.error.correct)}
            </kbd>
          </button>
        </div>
      )}
      {errorSelected !== null && countdown !== null && (
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-3 rounded-xl text-center font-bold text-sm ${
              errorCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {errorCorrect ? '🎉 Chính xác!' : `❌ Sai! Nghĩa đúng: ${q.actualMeaning}`}
          </motion.div>
          
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onNext}
            className={`w-full py-3 rounded-2xl font-bold text-white relative overflow-hidden flex items-center justify-center gap-2 ${
              errorCorrect ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            <motion.div
              className="absolute left-0 inset-y-0 bg-black/10"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: resultSecs, ease: 'linear' }}
            />
            Tiếp theo ({countdown}s) · <kbd className="px-1 bg-white/20 rounded text-xs">Enter</kbd>
          </motion.button>
        </div>
      )}
    </div>
  );
}
