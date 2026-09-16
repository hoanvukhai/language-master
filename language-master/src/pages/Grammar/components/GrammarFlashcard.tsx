import { motion } from 'framer-motion';
import { formatKeyForDisplay } from './GrammarCommon';
import type { FlashQ } from './GrammarCommon';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

interface GrammarFlashcardProps {
  q: FlashQ;
  showKana: boolean;
  flashFlipped: boolean;
  setFlashFlipped: (b: boolean | ((f: boolean) => boolean)) => void;
  onAnswer: (wasCorrect: boolean) => void;
  blitzPaused: boolean;
}

export default function GrammarFlashcard({
  q,
  showKana,
  flashFlipped,
  setFlashFlipped,
  onAnswer,
  blitzPaused,
}: GrammarFlashcardProps) {
  return (
    <div className="flex flex-col h-full max-w-sm mx-auto items-center justify-center w-full">
      <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Lật thẻ ghi nhớ</div>
      <div
        className="w-full aspect-[4/3] perspective-1000 relative cursor-pointer"
        onClick={() => {
          if (!blitzPaused) setFlashFlipped(!flashFlipped);
        }}
      >
        {/* Front */}
        <motion.div
          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
          animate={{ rotateY: flashFlipped ? -180 : 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{q.front}</div>
          {showKana && q.frontSub && <div className="text-base text-slate-500 mt-2 font-mono">{q.frontSub}</div>}
          <div className="absolute bottom-4 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
            BẤM ĐỂ LẬT
          </div>
        </motion.div>
        
        {/* Back */}
        <motion.div
          className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl p-6 shadow-xl border border-indigo-200 dark:border-indigo-800/50 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
          initial={{ rotateY: 180 }}
          animate={{ rotateY: flashFlipped ? 0 : 180 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <div className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
            {q.back}
          </div>
          {showKana && q.backSub && <div className="text-sm text-indigo-500 mt-2 font-mono">{q.backSub}</div>}
        </motion.div>
      </div>

      <div
        className={`flex gap-3 w-full mt-6 transition-opacity ${
          flashFlipped && !blitzPaused ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={() => onAnswer(false)}
          className="flex-1 py-4 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-600 dark:text-red-400 font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 text-sm"
        >
          <kbd className="px-1.5 py-0.5 bg-red-200 dark:bg-red-800/50 rounded text-xs font-mono">
            {formatKeyForDisplay(shortcuts.flashcard.notRemembered)}
          </kbd>{' '}
          ❌ Chưa nhớ
        </button>
        <button
          onClick={() => onAnswer(true)}
          className="flex-1 py-4 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 text-sm"
        >
          ✅ Nhớ rồi{' '}
          <kbd className="px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-800/50 rounded text-xs font-mono">
            {formatKeyForDisplay(shortcuts.flashcard.remembered)}
          </kbd>
        </button>
      </div>
    </div>
  );
}
