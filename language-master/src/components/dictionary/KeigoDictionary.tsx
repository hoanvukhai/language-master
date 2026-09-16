import { useState, useMemo } from 'react';
import type { KeigoVerb } from '../../types/keigo';
import { keigoVocabList } from '../../data/jlpt/keigo/keigoVocabDb';
import type { KeigoVocab } from '../../data/jlpt/keigo/keigoVocabDb';
import { useSettings } from '../../context/global/useSettings';
import Pagination from '../ui/Pagination';
import { Search, X } from 'lucide-react';
import { getKeigoResult } from '../../lib/keigoEngine';

interface Props {
  data: KeigoVerb[];
}

export default function KeigoDictionary({ data }: Props) {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState<'verbs' | 'bikago'>('verbs');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVerb, setSelectedVerb] = useState<KeigoVerb | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<KeigoVocab | null>(null);
  
  const pageSize = 20;

  const filteredVerbs = useMemo(() => {
    return data.filter((verb) => {
      const meaningText = verb.meaning[language as 'vi' | 'en'] || verb.meaning.vi || '';
      return verb.kanji.includes(searchTerm) || 
             verb.hiragana.includes(searchTerm) || 
             meaningText.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, language]);

  const filteredVocab = useMemo(() => {
    return keigoVocabList.filter((vocab) => {
      const meaningText = vocab.meaning[language as 'vi' | 'en'] || vocab.meaning.vi || '';
      return vocab.word.includes(searchTerm) || 
             vocab.hiragana.includes(searchTerm) || 
             meaningText.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [searchTerm, language]);

  const currentDataList = activeTab === 'verbs' ? filteredVerbs : filteredVocab;
  const totalPages = Math.max(1, Math.ceil(currentDataList.length / pageSize));
  const paginatedData = currentDataList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getMeaning = (m: { vi?: string, en?: string }) => {
    return language === 'en' && m.en ? m.en : (m.vi || '');
  };

  const renderKeigoCell = (verb: KeigoVerb, formType: 'sonkei' | 'kenjou' | 'teinei') => {
    const f = verb[formType];
    if (f.type === 'none') return <span className="text-slate-300 dark:text-slate-600">-</span>;
    const result = getKeigoResult(verb, formType);
    return (
      <div>
        <span className="font-bold text-slate-800 dark:text-white">{result}</span>
        {f.type === 'special' && (
          <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide inline-block">
            {language === 'en' ? 'Special' : 'Đặc biệt'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6 flex flex-col gap-4 transition-colors">
        
        {/* TABS */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
          <button
            onClick={() => { setActiveTab('verbs'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'verbs' 
                ? 'bg-fuchsia-600 text-white shadow-sm' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {language === 'en' ? 'Verbs' : 'Động từ'}
          </button>
          <button
            onClick={() => { setActiveTab('bikago'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'bikago' 
                ? 'bg-rose-500 text-white shadow-sm' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {language === 'en' ? 'Bikago (O/Go)' : 'Mỹ hóa ngữ (O/Go)'}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder={language === 'en' ? "Search by Keyword or Meaning..." : "Tìm theo Từ khóa hoặc Ý nghĩa..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <th className="py-4 px-6 font-semibold whitespace-nowrap">
                {activeTab === 'verbs' ? (language === 'en' ? 'Verb' : 'Động từ') : (language === 'en' ? 'Noun' : 'Danh từ')}
              </th>
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Meaning' : 'Ý nghĩa'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item: any) => {
                const isVerb = activeTab === 'verbs';
                const mainWord = isVerb ? item.kanji : item.word;
                const textColor = isVerb ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-rose-500 dark:text-rose-400';

                return (
                  <tr 
                    key={item.id} 
                    onClick={() => isVerb ? setSelectedVerb(item) : setSelectedVocab(item)}
                    className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <td className={`py-4 px-6 font-bold text-xl ${textColor} whitespace-nowrap`}>
                      {!isVerb && <span className="text-rose-400/80 mr-1">{item.prefix}</span>}
                      {mainWord} 
                      <span className="text-sm font-normal text-slate-500 ml-2">({item.hiragana})</span>
                    </td>
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-200">
                      {getMeaning(item.meaning)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  {language === 'en' ? 'No matching results found.' : 'Không tìm thấy kết quả nào phù hợp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE LIST */}
      <div className="block md:hidden">
        <div className="flex flex-col gap-3">
          {paginatedData.length > 0 ? (
            paginatedData.map((item: any) => {
              const isVerb = activeTab === 'verbs';
              const mainWord = isVerb ? item.kanji : item.word;
              const textColor = isVerb ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-rose-500 dark:text-rose-400';

              return (
                <div 
                  key={item.id} 
                  onClick={() => isVerb ? setSelectedVerb(item) : setSelectedVocab(item)}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold text-xl ${textColor}`}>
                      {!isVerb && <span className="text-rose-400/80 mr-1">{item.prefix}</span>}
                      {mainWord}
                    </h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.hiragana}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{getMeaning(item.meaning)}</p>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-800 rounded-xl">
              {language === 'en' ? 'No matching results found.' : 'Không tìm thấy kết quả nào phù hợp.'}
            </div>
          )}
        </div>
      </div>

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={currentDataList.length}
        itemsPerPage={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* MODAL VERBS */}
      {selectedVerb && (
        <div 
          onClick={() => setSelectedVerb(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
          >
            <div className="relative p-6 border-b border-slate-100 dark:border-slate-700 bg-fuchsia-50/50 dark:bg-fuchsia-900/10 text-center flex-shrink-0 px-14">
              <button 
                onClick={() => setSelectedVerb(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full shadow-sm transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-3xl font-black text-fuchsia-600 dark:text-fuchsia-400 mb-2">{selectedVerb.kanji}</h2>
              <p className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">{selectedVerb.hiragana} - {getMeaning(selectedVerb.meaning)}</p>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4">
                  <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3 text-center pb-2 border-b border-blue-100 dark:border-blue-900/30">
                    {language === 'en' ? 'Honorific (Sonkeigo)' : 'Tôn kính ngữ'}
                  </h4>
                  <div className="text-center min-h-[3rem] flex items-center justify-center">
                    {renderKeigoCell(selectedVerb, 'sonkei')}
                  </div>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 p-4">
                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3 text-center pb-2 border-b border-emerald-100 dark:border-emerald-900/30">
                    {language === 'en' ? 'Humble (Kenjougo)' : 'Khiêm nhường ngữ'}
                  </h4>
                  <div className="text-center min-h-[3rem] flex items-center justify-center">
                    {renderKeigoCell(selectedVerb, 'kenjou')}
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3 text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    {language === 'en' ? 'Polite (Teineigo)' : 'Lịch sự'}
                  </h4>
                  <div className="text-center min-h-[3rem] flex items-center justify-center">
                    {renderKeigoCell(selectedVerb, 'teinei')}
                  </div>
                </div>
              </div>

              {selectedVerb.note && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-500 mb-1 flex items-center gap-1">
                    💡 {language === 'en' ? 'Note' : 'Lưu ý'}
                  </h4>
                  <p className="text-sm text-amber-900 dark:text-amber-400 leading-relaxed">
                    {getMeaning(selectedVerb.note)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL VOCAB */}
      {selectedVocab && (
        <div 
          onClick={() => setSelectedVocab(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col"
          >
            <div className="relative p-6 border-b border-slate-100 dark:border-slate-700 bg-rose-50/50 dark:bg-rose-900/10 text-center flex-shrink-0 px-14">
              <button 
                onClick={() => setSelectedVocab(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full shadow-sm transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-4xl font-black text-rose-600 dark:text-rose-400 mb-2">
                <span className="text-rose-400/80 mr-1">{selectedVocab.prefix}</span>
                {selectedVocab.word}
              </h2>
              <p className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">{selectedVocab.hiragana} - {getMeaning(selectedVocab.meaning)}</p>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex gap-2 justify-center mb-6">
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  selectedVocab.type === 'wago' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {selectedVocab.type === 'wago' 
                    ? (language === 'en' ? 'Wago (Native)' : 'Thuần Nhật (Wago)')
                    : (language === 'en' ? 'Kango (Sino)' : 'Hán Nhật (Kango)')}
                </span>
                
                {selectedVocab.isException && (
                  <span className="px-3 py-1 rounded-lg text-sm font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    {language === 'en' ? 'Exception' : 'Ngoại lệ'}
                  </span>
                )}
              </div>

              {selectedVocab.note && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-500 mb-1 flex items-center gap-1">
                    💡 {language === 'en' ? 'Note' : 'Lưu ý'}
                  </h4>
                  <p className="text-sm text-amber-900 dark:text-amber-400 leading-relaxed">
                    {getMeaning(selectedVocab.note)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
