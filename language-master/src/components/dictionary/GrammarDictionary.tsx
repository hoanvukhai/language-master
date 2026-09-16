import { useState, useMemo } from 'react';
import type { GrammarItem } from '../../types';
import { useSettings } from '../../context/global/useSettings';
import Pagination from '../ui/Pagination';
import { Search, X } from 'lucide-react';

interface Props {
  data: GrammarItem[];
}

export default function GrammarDictionary({ data }: Props) {
  const { language } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<GrammarItem | null>(null);
  
  const pageSize = 20;

  const filteredData = useMemo(() => {
    return data.filter((g) => {
      const meaningText = typeof g.meaning === 'object' ? (g.meaning as any)[language as 'vi' | 'en'] || (g.meaning as any).vi || '' : g.meaning;
      const cautionText = g.caution ? (typeof g.caution === 'object' ? (g.caution as any)[language as 'vi' | 'en'] || (g.caution as any).vi || '' : g.caution) : '';
      return g.structure.includes(searchTerm) || 
             meaningText.toLowerCase().includes(searchTerm.toLowerCase()) || 
             cautionText.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, language]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getMeaning = (g: GrammarItem) => {
    return g.meaning[language as 'vi' | 'en'] || g.meaning.vi;
  };

  return (
    <div>
      {/* TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder={language === 'en' ? "Search by Structure, Meaning or Trap..." : "Tìm theo Cấu trúc, Ý nghĩa hoặc Bẫy JLPT..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <th className="py-4 px-6 font-semibold whitespace-nowrap">{language === 'en' ? 'Structure' : 'Cấu trúc'}</th>
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Meaning' : 'Ý nghĩa'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((g) => (
                <tr 
                  key={g.id} 
                  onClick={() => setSelectedItem(g)}
                  className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-6 font-bold text-xl text-teal-600 dark:text-teal-400 whitespace-nowrap">
                    {g.structure}
                  </td>
                  <td className="py-4 px-6 text-slate-700 dark:text-slate-200">
                    <div className="font-medium mb-1">
                      {g.meaning[language as 'vi' | 'en'] || g.meaning.vi}
                    </div>
                  </td>
                </tr>
              ))
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
            paginatedData.map((grammar) => (
              <div 
                key={grammar.id} 
                onClick={() => setSelectedItem(grammar)}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl text-indigo-600 dark:text-indigo-400">{grammar.structure}</h3>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold">{grammar.level}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-2 font-medium">{getMeaning(grammar)}</p>
                {grammar.caution && (
                  <span className="inline-block px-2 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-bold uppercase tracking-wide">
                    {language === 'en' ? 'Caution' : 'Chú ý'}
                  </span>
                )}
              </div>
            ))
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
        totalItems={filteredData.length}
        itemsPerPage={pageSize}
        onPageChange={setCurrentPage}
      />

      {/* MODAL */}
      {selectedItem && (
        <div 
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
          >
            {/* Header Modal */}
            <div className="relative p-6 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-900/10 text-center flex-shrink-0 px-14">
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full shadow-sm transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-3xl font-black text-teal-600 dark:text-teal-400 mb-2">{selectedItem.structure}</h2>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{typeof selectedItem.meaning === 'object' ? (selectedItem.meaning as any)[language as 'vi' | 'en'] || (selectedItem.meaning as any).vi : selectedItem.meaning}</p>
            </div>
            
            {/* Body Modal */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold uppercase tracking-wider">
                  {selectedItem.group}
                </span>
                {selectedItem.level && (
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium">
                    {selectedItem.level}
                  </span>
                )}
                {selectedItem.lesson && (
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium">
                    {selectedItem.lesson}
                  </span>
                )}
              </div>

              {/* Cấu trúc chia */}
              {selectedItem.formation && selectedItem.formation.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">{language === 'en' ? 'Formation' : 'Cách chia (Kết hợp)'}</h4>
                  <div className="space-y-2">
                    {selectedItem.formation.map((f, i) => (
                      <div key={i} className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg">
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bẫy JLPT / Caution */}
              {selectedItem.caution && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-500 mb-1 flex items-center gap-1">
                    ⚠️ {language === 'en' ? 'JLPT Trap / Caution' : 'Bẫy JLPT / Chú ý'}
                  </h4>
                  <p className="text-sm text-amber-900 dark:text-amber-400 leading-relaxed">
                    {(typeof selectedItem.caution === 'object' ? (selectedItem.caution as any)[language as 'vi' | 'en'] || (selectedItem.caution as any).vi : selectedItem.caution).replace(/⚠️ Bẫy JLPT: |⚠️ JLPT Trap: /g, '')}
                  </p>
                </div>
              )}

              {/* Ví dụ */}
              {selectedItem.examples && selectedItem.examples.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">{language === 'en' ? 'Examples' : 'Ví dụ'}</h4>
                  <div className="space-y-4">
                    {selectedItem.examples.map((ex, i) => (
                      <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="font-medium text-slate-800 dark:text-white mb-1">
                          {ex.jp}
                        </p>
                        {ex.kana && ex.kana !== ex.jp && (
                           <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{ex.kana}</p>
                        )}
                        <p className="text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                          {language === 'en' && ex.en ? ex.en : ex.vi}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
