import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { QuizQ, FillBlankQ } from './GrammarCommon';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

interface GrammarQuizProps {
  q: QuizQ | FillBlankQ;
  showKana: boolean;
  showTranslation: boolean;
  quizSelected: string | null;
  quizCorrect: boolean | null;
  onSelect: (optId: string, isCorrect: boolean) => void;
  countdown: number | null;
  onNext: () => void;
  blitzPaused: boolean;
}

export default function GrammarQuiz({
  q,
  showKana,
  showTranslation,
  quizSelected,
  quizCorrect,
  onSelect,
  blitzPaused,
}: GrammarQuizProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden">
        {blitzPaused && <div className="absolute inset-0 z-20 pointer-events-none" />}
        {q.type === 'fill_blank' ? (
          <>
            <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">Điền vào chỗ trống</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white leading-relaxed mb-2">
              {(q as FillBlankQ).blankedSentence}
            </div>
            {(showKana || showTranslation) && ((q as FillBlankQ).kana || (q as FillBlankQ).translation) && (
              <div className="text-sm font-medium text-slate-500 font-mono mb-2">
                {showKana && (q as FillBlankQ).kana}
                {showKana && showTranslation && ' — '}
                {showTranslation && (q as FillBlankQ).translation}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">Chọn đáp án đúng</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{(q as QuizQ).prompt}</div>
            {showKana && (q as QuizQ).promptSub && (
              <div className="text-sm font-medium text-slate-500 font-mono mt-1">
                {(q as QuizQ).promptSub}
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const isSel = quizSelected === opt.id;
          const isCorrect = opt.id === q.correctId;
          let stateClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400';
          if (blitzPaused) {
            if (isCorrect) stateClass = 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300';
            else if (isSel) stateClass = 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300';
            else stateClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-50';
          }
          return (
            <button
              key={opt.id}
              disabled={blitzPaused}
              onClick={() => {
                onSelect(opt.id, isCorrect);
              }}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${stateClass}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {blitzPaused && isCorrect ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : blitzPaused && isSel ? (
                    <XCircle size={20} className="text-red-500" />
                  ) : (
                    <span className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-400">
                      {shortcuts.quiz[i] ? shortcuts.quiz[i].toUpperCase() : i + 1}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-base leading-snug">{opt.label}</div>
                  {showKana && opt.subLabel && <div className="text-xs font-medium opacity-70 mt-0.5">{opt.subLabel}</div>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {blitzPaused && (
        <div className="space-y-2">
          
          {quizCorrect === false && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl text-sm text-amber-800 dark:text-amber-300"
            >
              <div className="flex gap-2 font-bold mb-1"><AlertTriangle size={16} /> Lưu ý:</div>
              {q.type === 'fill_blank' && (
                <>
                  <div className="mb-2 italic">{(q as FillBlankQ).fullSentence}</div>
                  {(q as FillBlankQ).caution && <div>{(q as FillBlankQ).caution}</div>}
                </>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
