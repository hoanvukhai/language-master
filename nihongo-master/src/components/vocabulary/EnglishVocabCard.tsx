// src/components/vocabulary/EnglishVocabCard.tsx
import { useState } from 'react';
import { Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EnglishWord } from '../../types';
import { useAudio } from '../../context/audio/useAudio';

const CEFR_COLOR: Record<string, string> = {
  A1: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  A2: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  B1: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
  B2: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
  C1: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400',
  C2: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400',
};

export default function EnglishVocabCard({
  item,
  language,
  index,
}: {
  item: EnglishWord;
  language: string;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [accent, setAccent] = useState<'en-US' | 'en-GB'>(() => {
    return (localStorage.getItem('english_accent') as 'en-US' | 'en-GB') || 'en-US';
  });
  const { playText } = useAudio();

  const toggleAccent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = accent === 'en-US' ? 'en-GB' : 'en-US';
    setAccent(next);
    localStorage.setItem('english_accent', next);
    playText(item.word, next);
  };

  const meaning =
    typeof item.meaning === 'object'
      ? (language === 'en' ? item.meaning.en : item.meaning.vi) ?? item.meaning.vi
      : item.meaning;

  return (
    <motion.div
      layout
      className={`bg-white dark:bg-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
        expanded
          ? 'shadow-lg border border-sky-200 dark:border-sky-800/50 scale-[1.005] z-10 relative my-2'
          : 'border border-slate-200 dark:border-slate-700 shadow-sm hover:border-sky-300 dark:hover:border-sky-600/50 hover:shadow-md my-0'
      }`}
    >
      <div
        className="p-4 md:p-5 flex items-start gap-4 cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Index badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-sm mt-0.5">
          {index}
        </div>

        {/* Word + IPA + meaning */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-1 flex-wrap">
            <span className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              {item.word}
            </span>
            {item.ipaBrE || item.ipaAmE ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.ipaBrE && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccent('en-GB');
                      localStorage.setItem('english_accent', 'en-GB');
                      playText(item.word, 'en-GB');
                    }}
                    className={`text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                      accent === 'en-GB'
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-400 dark:border-amber-600 font-bold'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100'
                    }`}
                    title="Nhấn để nghe phát âm Anh (UK)"
                  >
                    🇬🇧 UK: {item.ipaBrE}
                    <Volume2 size={11} className="opacity-70" />
                  </button>
                )}
                {item.ipaAmE && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccent('en-US');
                      localStorage.setItem('english_accent', 'en-US');
                      playText(item.word, 'en-US');
                    }}
                    className={`text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                      accent === 'en-US'
                        ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-400 dark:border-sky-600 font-bold'
                        : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40 hover:bg-sky-100'
                    }`}
                    title="Nhấn để nghe phát âm Mỹ (US)"
                  >
                    🇺🇸 US: {item.ipaAmE}
                    <Volume2 size={11} className="opacity-70" />
                  </button>
                )}
              </div>
            ) : item.ipa ? (
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500 font-mono">
                {item.ipa}
              </span>
            ) : null}
          </div>
          <div className="text-sky-700 dark:text-sky-400 font-bold">{meaning}</div>
          {typeof item.meaning === 'object' && item.meaning.en && language !== 'en' && (
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 italic">
              {item.meaning.en}
            </div>
          )}
        </div>

        {/* Tags + actions */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {(item.cefrLevel || item.partOfSpeech) && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                (item.cefrLevel && CEFR_COLOR[item.cefrLevel]) || 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {[item.cefrLevel, item.partOfSpeech].filter(Boolean).join(' · ')}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleAccent}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-slate-600 dark:text-slate-300 transition-colors"
              title="Nhấn để đổi giọng Anh (UK) / Mỹ (US)"
            >
              {accent === 'en-US' ? '🇺🇸 US' : '🇬🇧 UK'}
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                playText(item.word, accent);
              }}
              className="p-1.5 text-sky-500 bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-full transition-all"
              title={`Phát âm (${accent === 'en-US' ? 'Anh - Mỹ' : 'Anh - Anh'})`}
            >
              <Volume2 size={14} />
            </button>
            <div className="p-1.5 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-full group-hover:bg-sky-50 dark:group-hover:bg-sky-900/50 group-hover:text-sky-500 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded examples */}
      <AnimatePresence>
        {expanded && item.examples && item.examples.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 pl-16 space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Example sentences
              </h4>
              {item.examples.map((ex, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1"
                >
                  <div className="text-sm font-medium text-slate-800 dark:text-white">{ex.en}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{ex.vi}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
