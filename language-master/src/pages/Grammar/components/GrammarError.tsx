import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { formatKeyForDisplay } from './GrammarCommon';
import type { ErrorQ } from './GrammarCommon';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

interface GrammarErrorProps {
  q: ErrorQ;
  showKana: boolean;
  showTranslation: boolean;
  errorCorrect: boolean | null;
  onSelect: (choice: boolean, isCorrect: boolean) => void;
  blitzPaused: boolean;
}

export default function GrammarError({
  q,
  showKana,
  showTranslation,
  errorCorrect,
  onSelect,
  blitzPaused,
}: GrammarErrorProps) {
  const renderHighlightedSentence = (text: string, status: 'idle' | 'success' | 'fail') => {
    const parts = text.split(/<([^>]+)>/);
    return (
      <span>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span
              key={i}
              className={`font-bold border-b-4 pb-0.5 px-1 ${
                status === 'idle'
                  ? 'border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : status === 'success'
                  ? 'border-green-400 text-green-600 dark:text-green-400'
                  : 'border-red-400 text-red-600 dark:text-red-400'
              }`}
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 text-center relative">
        {blitzPaused && <div className="absolute inset-0 z-20 pointer-events-none" />}
        <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">
          Câu này sai ngữ pháp hay đúng?
        </div>
        <div className="text-xl leading-loose text-slate-800 dark:text-white font-medium">
          {blitzPaused
            ? renderHighlightedSentence(q.correctSentence, errorCorrect ? 'success' : 'fail')
            : renderHighlightedSentence(
                q.isCorrect ? q.correctSentence : q.wrongSentence,
                'idle'
              )
          }
        </div>
        {showKana && q.kana && (
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-mono">
            {q.kana}
          </div>
        )}
        {showTranslation && q.translation && (
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2.5 italic">
            💬 {q.translation}
          </div>
        )}
      </div>

      {!blitzPaused ? (
        <div className="flex gap-4">
          <button
            onClick={() => onSelect(false, !q.isCorrect)}
            className="flex-1 py-5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border-2 border-red-350 dark:border-red-700 text-red-600 font-bold rounded-2xl flex items-center justify-center gap-2 text-lg active:scale-95 border-red-300"
          >
            <kbd className="px-1.5 py-0.5 bg-red-200/50 dark:bg-red-800/50 rounded text-xs font-mono">
              {formatKeyForDisplay(shortcuts.error.wrong)}
            </kbd>{' '}
            ❌ SAI
          </button>
          <button
            onClick={() => onSelect(true, q.isCorrect)}
            className="flex-1 py-5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 border-2 border-emerald-350 dark:border-emerald-700 text-emerald-600 font-bold rounded-2xl flex items-center justify-center gap-2 text-lg active:scale-95 border-emerald-300"
          >
            ✅ ĐÚNG{' '}
            <kbd className="ml-1.5 px-1.5 py-0.5 bg-emerald-200/50 dark:bg-emerald-800/50 rounded text-xs font-mono">
              {formatKeyForDisplay(shortcuts.error.correct)}
            </kbd>
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`space-y-3 rounded-2xl p-5 border-2 ${
            errorCorrect
              ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-900/20'
              : 'bg-red-50 border-red-400 dark:bg-red-900/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {errorCorrect ? (
              <>
                <CheckCircle2 className="text-emerald-500" />
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  Phán đoán chuẩn xác!
                </span>
              </>
            ) : (
              <>
                <XCircle className="text-red-500" />
                <span className="font-bold text-red-700 dark:text-red-400">
                  Rất tiếc, bạn đã nhầm!
                </span>
              </>
            )}
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded-xl p-3">
            <div className="text-xs font-bold text-slate-500 mb-1 uppercase">Câu đúng phải là:</div>
            <div className="text-base">{renderHighlightedSentence(q.correctSentence, 'idle')}</div>
          </div>
          
          <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">{q.structure}:</span> {q.caution}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
