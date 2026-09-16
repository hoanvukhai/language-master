import { useState } from 'react';
import { Volume2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Word } from '../../types';
import { useAudio } from '../../context/audio/useAudio';

const TYPE_LABEL: Record<string, string> = {
  verb: 'Động từ',
  adj_i: 'Tính từ I',
  adj_na: 'Tính từ NA',
  noun: 'Danh từ',
  adv: 'Trạng từ',
  expression: 'Cụm từ',
};

const TYPE_COLOR: Record<string, string> = {
  verb: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  adj_i: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
  adj_na: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400',
  noun: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400',
  adv: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  expression: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
};

export default function JapaneseVocabCard({ item, language, index }: { item: Word; language: string; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { playText } = useAudio();

  const meaning = typeof item.meaning === 'object'
    ? (item.meaning as any)[language] || (item.meaning as any).vi
    : item.meaning;

  return (
    <motion.div
      layout
      className={`bg-white dark:bg-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
        expanded
          ? 'shadow-lg border border-blue-200 dark:border-blue-800/50 scale-[1.005] z-10 relative my-2'
          : 'border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md my-0'
      }`}
    >
      <div
        className="p-4 md:p-5 flex items-start gap-4 cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-sm mt-0.5">
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-1 flex-wrap">
            <span className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {item.kanji}
              {item.alt_kanji && (
                <span className="text-lg font-normal text-slate-400 dark:text-slate-500 ml-2">
                  ({item.alt_kanji})
                </span>
              )}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">{item.hiragana}</span>
          </div>
          <div className="text-blue-700 dark:text-blue-400 font-bold">{meaning}</div>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[item.type] || 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
            {TYPE_LABEL[item.type] || item.type}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); playText(item.hiragana || item.kanji); }}
              className="p-1.5 text-blue-500 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-all"
              title="Phát âm"
            >
              <Volume2 size={14} />
            </button>
            <div className="p-1.5 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/50 group-hover:text-blue-500 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && item.examples && item.examples.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 pl-16 space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={12} className="text-blue-400" /> Ví dụ minh họa
              </h4>
              {item.examples.map((ex, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-sm font-medium text-slate-800 dark:text-white mb-1">{ex.jp}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{ex.vi}</div>
                  {language === 'en' && ex.en && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">{ex.en}</div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
