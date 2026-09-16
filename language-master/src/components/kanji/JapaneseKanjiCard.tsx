import { Volume2, Sparkles } from 'lucide-react';
import type { Kanji } from '../../types';
import { useAudio } from '../../context/audio/useAudio';

export default function JapaneseKanjiCard({ item, language, index }: { item: Kanji; language: string; index: number }) {
  const { playText } = useAudio();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col md:flex-row relative">
      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold flex items-center justify-center text-sm z-10 shadow-sm border border-slate-200 dark:border-slate-600">
        {index}
      </div>
      
      {/* Cột Kanji (Trái) */}
      <div className="md:w-1/3 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <div className="text-9xl font-black">{item.character}</div>
        </div>
        
        <div className="text-8xl md:text-[140px] font-black text-slate-800 dark:text-white mb-4 z-10 leading-none">{item.character}</div>
        <div className="text-2xl font-bold tracking-[0.2em] uppercase text-blue-600 dark:text-blue-500 z-10">{item.hanViet}</div>
      </div>

      {/* Cột Từ Vựng Ghép (Phải) */}
      <div className="md:w-2/3 p-6 md:p-8">
        <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-blue-500" />
          {language === 'en' ? 'Derived Vocabulary' : 'Từ vựng cấu tạo'}
        </h3>
        
        {item.words && item.words.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {item.words.map((word: any, idx: number) => {
              const meaningText = typeof word.meaning === 'object' ? word.meaning[language as 'vi'|'en'] || word.meaning.vi : word.meaning;
              return (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{word.word}</span>
                      <span className="text-sm px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                        {word.hiragana}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider">
                        Âm {word.readingType}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 font-medium mt-1">{meaningText}</div>
                    
                    {word.examples && word.examples.length > 0 && (
                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 border-l-2 border-slate-200 dark:border-slate-700 pl-3 py-0.5">
                        <div className="font-medium text-slate-700 dark:text-slate-300">{word.examples[0].jp}</div>
                        <div>{language === 'en' && word.examples[0].en ? word.examples[0].en : word.examples[0].vi}</div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => playText(word.word)}
                    className="p-2 text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-blue-500 hover:border-blue-300 transition-all rounded-full shrink-0 shadow-sm"
                    title="Phát âm"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-sm font-medium italic border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            {language === 'en' ? 'No derived words available.' : 'Không có từ vựng đi kèm.'}
          </div>
        )}
      </div>
    </div>
  );
}
