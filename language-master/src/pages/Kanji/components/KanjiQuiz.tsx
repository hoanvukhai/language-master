import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { QuizQ, HanVietQ } from './KanjiCommon';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

interface KanjiQuizProps {
  q: QuizQ | HanVietQ;
  showKana: boolean;
  quizSelected: string | null;
  quizCorrect: boolean | null;
  onSelect: (optId: string, isCorrect: boolean) => void;
  countdown: number | null;
  onNext: () => void;
  resultSecs: number;
}

export default function KanjiQuiz({
  q,
  showKana,
  quizSelected,
  quizCorrect,
  onSelect,
  countdown,
  onNext,
  resultSecs,
}: KanjiQuizProps) {
  const isHV = q.type === 'hanviet_quiz';

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 text-center shadow-sm border border-slate-100 dark:border-slate-700">
        <div className={`font-black text-slate-800 dark:text-white ${isHV ? 'text-5xl' : 'text-3xl'}`}>
          {q.prompt}
        </div>
        {showKana && q.promptSub && <div className="text-slate-400 mt-1 text-sm">{q.promptSub}</div>}
        {isHV && <div className="text-xs text-amber-500 mt-2 font-semibold">&#x1F004; Hán Việt</div>}
      </div>
      
      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let cls = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:border-amber-300';
          if (quizSelected) {
            if (opt.id === q.correctId) cls = 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-900/30';
            else if (opt.id === quizSelected) cls = 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/30';
            else cls = 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-700/50';
          }
          return (
            <button
              key={opt.id}
              disabled={!!quizSelected}
              onClick={() => {
                const ok = opt.id === q.correctId;
                onSelect(opt.id, ok);
              }}
              className={`w-full p-3 rounded-xl border-2 text-left font-medium transition-all flex items-center gap-2 ${cls} ${isHV ? 'text-2xl font-black' : ''}`}
            >
              <span className="text-xs text-slate-400 font-bold w-5 shrink-0">
                {shortcuts.quiz[idx] ? shortcuts.quiz[idx].toUpperCase() : idx + 1}
              </span>
              <div>
                <div>{opt.label}</div>
                {showKana && opt.subLabel && <div className="text-xs text-amber-500 mt-0.5">{opt.subLabel}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {quizSelected && countdown !== null && (
        <div className="space-y-2">
          
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onNext}
            className={`w-full py-3.5 rounded-2xl font-bold text-white relative overflow-hidden flex items-center justify-center gap-2 ${
              quizCorrect ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            <motion.div
              className="absolute left-0 inset-y-0 bg-black/10"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: resultSecs, ease: 'linear' }}
            />
            {quizCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            Tiếp theo ({countdown}s) · <kbd className="px-1 bg-white/20 rounded text-xs">Enter</kbd>
          </motion.button>
        </div>
      )}
    </div>
  );
}
