import { motion, AnimatePresence } from 'framer-motion';
import { formatKeyForDisplay } from './KanjiCommon';
import type { FlashQ } from './KanjiCommon';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

interface KanjiFlashcardProps {
  q: FlashQ;
  showKana: boolean;
  flashFlipped: boolean;
  setFlashFlipped: (b: boolean | ((f: boolean) => boolean)) => void;
  onAnswer: (wasCorrect: boolean) => void;
  urgent?: boolean;
}

export default function KanjiFlashcard({
  q,
  showKana,
  flashFlipped,
  setFlashFlipped,
  onAnswer,
  urgent = false,
}: KanjiFlashcardProps) {
  return (
    <div className="space-y-3 max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {!flashFlipped ? (
          <motion.div
            key="front"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            onClick={() => setFlashFlipped(true)}
            className={`cursor-pointer bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-8 text-white text-center shadow-lg select-none transition-all ${
              urgent ? 'ring-4 ring-red-500 ring-offset-2 animate-pulse' : ''
            }`}
          >
            <div className="text-4xl font-black mb-2">{q.front}</div>
            {showKana && q.frontSub && <div className="text-amber-100 text-lg">{q.frontSub}</div>}
            <div className="mt-5 flex items-center justify-center gap-2 text-amber-100 text-sm">
              <span className="animate-bounce">▼</span> Ấn hoặc <kbd className="px-1.5 py-0.5 bg-amber-400/50 rounded text-xs font-mono">Space</kbd> để lật
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            onClick={() => setFlashFlipped(false)}
            className="cursor-pointer bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-lg border-2 border-amber-200 dark:border-amber-800 select-none"
          >
            <div className="text-xs text-amber-500 font-bold uppercase tracking-wide mb-3">Đáp án</div>
            <div className="text-3xl font-black text-slate-800 dark:text-white">{q.back}</div>
            {showKana && q.backSub && <div className="text-amber-500 text-lg mt-1">{q.backSub}</div>}
            <div className="mt-4 text-xs text-slate-400">Ấn lại để xem mặt trước</div>
          </motion.div>
        )}
      </AnimatePresence>
      {flashFlipped && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
          <button
            onClick={() => onAnswer(false)}
            className="flex-1 py-3 rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/20 font-bold border-2 border-red-200 dark:border-red-800 text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <kbd className="px-1.5 py-0.5 bg-red-200 dark:bg-red-800/50 rounded text-xs font-mono">
              {formatKeyForDisplay(shortcuts.flashcard.notRemembered)}
            </kbd>{' '}
            ❌ Chưa nhớ
          </button>
          <button
            onClick={() => onAnswer(true)}
            className="flex-1 py-3 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 font-bold border-2 border-emerald-200 dark:border-emerald-800 text-sm hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1.5"
          >
            ✅ Nhớ rồi{' '}
            <kbd className="px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-800/50 rounded text-xs font-mono">
              {formatKeyForDisplay(shortcuts.flashcard.remembered)}
            </kbd>
          </button>
        </motion.div>
      )}
    </div>
  );
}
