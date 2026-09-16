// src/pages/Race/components/RaceTrueFalseView.tsx
// Sub-component cho Game 4: Phản Xạ Đúng / Sai 4s (Light/Dark mode & Vi/En)

import { motion } from 'framer-motion';

interface RaceTrueFalseViewProps {
  question: {
    id: string;
    prompt: string;
    subPrompt?: string;
    isTrue?: boolean;
  };
  onSelectTrueFalse: (choice: boolean) => void;
  disabled?: boolean;
  language?: string;
}

export default function RaceTrueFalseView({
  question,
  onSelectTrueFalse,
  disabled = false,
  language = 'vi',
}: RaceTrueFalseViewProps) {
  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 my-auto text-center font-sans transition-colors"
    >
      <div className="py-4">
        <p className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-2 leading-relaxed">
          {question.prompt}
        </p>
        {question.subPrompt && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-100 dark:border-indigo-800/50 mx-auto max-w-sm">
            <p className="text-xl md:text-2xl font-black text-indigo-700 dark:text-indigo-300">
              {question.subPrompt}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelectTrueFalse(false)}
          disabled={disabled}
          className="relative py-5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 text-red-600 dark:text-red-300 border-2 border-red-500/30 font-black rounded-2xl text-xl transition-all"
        >
          <span className="absolute top-2 left-3 text-[10px] font-bold opacity-50">[1 / F / ◀]</span>
          ❌ {language === 'en' ? 'FALSE' : 'SAI'}
        </button>
        <button
          onClick={() => onSelectTrueFalse(true)}
          disabled={disabled}
          className="relative py-5 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-600 dark:text-emerald-300 border-2 border-emerald-500/30 font-black rounded-2xl text-xl transition-all"
        >
          <span className="absolute top-2 right-3 text-[10px] font-bold opacity-50">[2 / T / ▶]</span>
          ✅ {language === 'en' ? 'TRUE' : 'ĐÚNG'}
        </button>
      </div>
    </motion.div>
  );
}
