import { useState, useMemo } from 'react';
import type { Kanji } from '../../types';
import { useSettings } from '../../context/global/useSettings';
import Pagination from '../ui/Pagination';
import { Search, X } from 'lucide-react';

interface Props {
  data: Kanji[];
}

export default function KanjiSingleDictionary({ data }: Props) {
  const { language } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<Kanji | null>(null);
  
  const pageSize = 20;

  const filteredData = useMemo(() => {
    return data.filter((k) => {
      return k.character.includes(searchTerm) || 
             k.hanViet.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      {/* TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4 transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder={language === 'en' ? "Search by Kanji or Han-Viet meaning..." : "Tìm theo Hán tự hoặc Âm Hán Việt..."}
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
              <th className="py-4 px-6 font-semibold whitespace-nowrap">{language === 'en' ? 'Kanji' : 'Chữ Hán'}</th>
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Han-Viet' : 'Hán Việt'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((k) => (
                <tr 
                  key={k.id} 
                  onClick={() => setSelectedItem(k)}
                  className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-6 font-bold text-4xl text-slate-800 dark:text-white whitespace-nowrap">
                    {k.character}
                  </td>
                  <td className="py-4 px-6 text-xl font-bold text-amber-600 dark:text-amber-500">
                    {k.hanViet}
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
            paginatedData.map((k) => (
              <div 
                key={k.id} 
                onClick={() => setSelectedItem(k)}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-3xl text-slate-800 dark:text-white">{k.character}</h3>
                  <span className="font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">{k.hanViet}</span>
                </div>
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
            <div className="relative p-8 border-b border-slate-100 dark:border-slate-700 text-center flex-shrink-0 px-14">
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-7xl font-black text-slate-800 dark:text-white mb-4">{selectedItem.character}</h2>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-500 tracking-widest uppercase">{selectedItem.hanViet}</p>
            </div>
            
            {/* Body Modal */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              
              <div className="flex justify-center gap-2 mb-6">
                {selectedItem.level && (
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium">
                    {selectedItem.level}
                  </span>
                )}
                {selectedItem.lesson && (
                  <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg text-sm font-medium">
                    {selectedItem.lesson}
                  </span>
                )}
              </div>

              {/* Danh sách từ vựng ghép */}
              {selectedItem.words && selectedItem.words.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 text-center">
                    {language === 'en' ? 'Derived Words' : 'Từ vựng cấu tạo'}
                  </h4>
                  <div className="space-y-3">
                    {selectedItem.words.map((w, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col">
                        <div className="flex items-baseline gap-2 mb-1">
                           <span className="font-bold text-lg text-slate-800 dark:text-white">{w.word}</span>
                           <span className="text-sm text-slate-500 dark:text-slate-400">{w.hiragana}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi}
                        </p>
                        {w.examples && w.examples.length > 0 && (
                          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400 border-l-2 border-blue-200 dark:border-blue-800/50 pl-3 py-0.5">
                            <div className="font-medium text-slate-700 dark:text-slate-300 mb-0.5">{w.examples[0].jp}</div>
                            <div>{language === 'en' && (w.examples[0] as any).en ? (w.examples[0] as any).en : w.examples[0].vi}</div>
                          </div>
                        )}
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
