import { useState } from 'react';
import { Volume2, ChevronDown, ChevronUp, AlertTriangle, Construction, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GrammarItem } from '../../types';
import { useAudio } from '../../context/audio/useAudio';

export default function JapaneseGrammarCard({ item, showFurigana, language, index }: { item: GrammarItem; showFurigana: boolean; language: string; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { playText } = useAudio();

  const renderJpExample = (jp: string) => {
    const parts = jp.split(/\[([^\]]+)\]/);
    return (
      <span>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 mx-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const meaningText = typeof item.meaning === 'object' ? item.meaning[language as 'vi' | 'en'] || item.meaning.vi : item.meaning;
  const cautionText = item.caution ? (typeof item.caution === 'object' ? item.caution[language as 'vi' | 'en'] || item.caution.vi : item.caution) : null;

  return (
    <motion.div
      layout
      className={`bg-white dark:bg-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
        expanded 
          ? 'shadow-lg border border-blue-200 dark:border-blue-800/50 scale-[1.01] z-10 relative my-3' 
          : 'border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md my-0'
      }`}
    >
      <div 
        className="p-4 md:p-5 flex flex-col md:flex-row md:items-start gap-4 cursor-pointer group"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center text-sm mt-1">
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {item.structure}
              </h3>
              {showFurigana && item.structureKana && item.structureKana !== item.structure && (
                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 inline-block px-2 py-0.5 rounded-md mb-2">
                  {item.structureKana}
                </div>
              )}
              <p className="text-lg text-blue-700 dark:text-blue-400 font-bold">
                {meaningText}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-full">
                {item.group}
              </span>
              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); playText(item.structureKana || item.structure.replace(/〜|[（）()]/g, ' ').trim()); }}
                  className="p-1.5 text-blue-500 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-all"
                  title="Phát âm"
                >
                  <Volume2 size={16} />
                </button>
                <div className="p-1.5 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/50 group-hover:text-blue-500 transition-colors">
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-8 pb-6 space-y-5 border-t border-slate-100 dark:border-slate-700/60 pt-5 bg-slate-50/50 dark:bg-slate-900/20 pl-16">
              
              {/* Formation */}
              {item.formation && item.formation.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Construction size={14} className="text-slate-400" />
                    {language === 'en' ? 'Formation' : 'Cách thành lập'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {item.formation.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm px-3 py-1.5 rounded-xl">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <code className="text-sm font-medium text-slate-700 dark:text-slate-200 font-mono">
                          {f}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caution */}
              {cautionText && (
                <div className="flex items-start gap-3 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 shadow-sm">
                  <AlertTriangle size={18} className="flex-shrink-0 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">
                      {language === 'en' ? 'Caution / Trap' : 'Chú ý / Bẫy'}
                    </h4>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      {cautionText}
                    </p>
                  </div>
                </div>
              )}

              {/* Examples */}
              {item.examples && item.examples.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-blue-400" />
                    {language === 'en' ? 'Examples in Context' : 'Ví dụ minh họa'}
                  </h4>
                  <div className="space-y-3">
                    {item.examples.map((ex, i) => (
                      <div key={i} className="group relative bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="text-base font-medium text-slate-800 dark:text-white mb-1.5 leading-relaxed">
                              {renderJpExample(ex.jp)}
                            </div>
                            
                            {showFurigana && ex.kana && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/50 inline-block px-2 py-0.5 rounded-md mb-2 border border-slate-100 dark:border-slate-700">
                                {ex.kana.replace(/\[([^\]]+)\]/g, '$1')}
                              </div>
                            )}
                            
                            <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                              {ex.vi}
                            </div>
                            
                            {language === 'en' && ex.en && (
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic font-medium">
                                {ex.en}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); playText(ex.kana || ex.jp); }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900/50 dark:hover:bg-blue-900/50 transition-all rounded-full shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Phát âm"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
