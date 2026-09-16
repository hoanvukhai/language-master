// src/pages/Race/components/RaceQuizView.tsx
// Sub-component cho Game 1: Trắc Nghiệm 1/4 (Light/Dark mode & Vi/En)

import { motion } from 'framer-motion';

interface RaceQuizViewProps {
  question: {
    id: string;
    prompt: string;
    subPrompt?: string;
    correctAnswer: string;
    options?: string[];
  };
  selectedOption: string | null;
  isAnswerCorrect: boolean | null;
  onSelectOption: (opt: string) => void;
}

export default function RaceQuizView({
  question,
  selectedOption,
  isAnswerCorrect,
  onSelectOption,
}: RaceQuizViewProps) {
  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 my-auto text-center font-sans transition-colors"
    >
      <div>
        <p className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2 leading-relaxed">
          {question.prompt}
        </p>
        {question.subPrompt && (
          <p className="inline-block mt-1 text-xs font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">
            {question.subPrompt}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options?.map((opt, idx) => {
          let btnStyle = 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-white border-slate-200 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30';
          if (selectedOption === opt) {
            btnStyle = isAnswerCorrect
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/40'
              : 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/40';
          } else if (selectedOption !== null && !isAnswerCorrect && opt === question.correctAnswer) {
            btnStyle = 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/40 animate-pulse';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelectOption(opt)}
              disabled={selectedOption !== null}
              className={`relative py-4 px-4 rounded-2xl border-2 font-bold text-sm transition-all text-center ${btnStyle}`}
            >
              <span className="absolute top-2 left-3 text-[10px] font-bold opacity-40">[{idx + 1}]</span>
              {opt}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
