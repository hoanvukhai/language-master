import { useState, useMemo } from 'react';
import type { Kanji, KanjiWord } from '../../types';
import { useSettings } from '../../context/global/useSettings';
import Pagination from '../ui/Pagination';
import { Search, X } from 'lucide-react';

interface Props {
  data: Kanji[]; // Chú ý: data gốc là Kanji[], ta phải flatten ra KanjiWord[]
}

export default function KanjiWordsDictionary({ data }: Props) {
  const { language } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<KanjiWord | null>(null);
  
  const pageSize = 20;

  const filtersList = [
    { id: 'onyomi', labelEn: 'Onyomi (Chinese)', labelVi: 'Âm On (Âm Hán)' },
    { id: 'kunyomi', labelEn: 'Kunyomi (Japanese)', labelVi: 'Âm Kun (Âm Nhật)' },
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
    setCurrentPage(1);
  };

  // Flatten Kanji[] -> KanjiWord[]
  const allWords = useMemo(() => {
    return data.flatMap(k => k.words.map(w => ({
      ...w,
      // Thêm thông tin gốc để hiển thị nếu cần
      _parentKanji: k.character, 
      _parentLesson: k.lesson,
      _parentLevel: k.level
    })));
  }, [data]);

  const filteredData = useMemo(() => {
    return allWords.filter((w) => {
      const meaningText = w.meaning.vi || '';
      const meaningEn = w.meaning.en || '';
      const matchesSearch = 
        w.word.includes(searchTerm) || 
        w.hiragana.includes(searchTerm) || 
        (w.hanVietWord || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        meaningText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meaningEn.toLowerCase().includes(searchTerm.toLowerCase());
      
      const wordReading = w.readingType === '音' ? 'onyomi' : (w.readingType === '訓' ? 'kunyomi' : 'other');
      const matchesFilter = activeFilters.length === 0 || activeFilters.includes(wordReading);

      return matchesSearch && matchesFilter;
    });
  }, [allWords, searchTerm, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getMeaning = (w: KanjiWord) => {
    return language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi;
  };

  return (
    <div>
      {/* TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6 flex flex-col gap-4 transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder={language === 'en' ? "Search by Word, Reading or Meaning..." : "Tìm theo Từ, Cách đọc hoặc Nghĩa..."}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>
        
        {/* Chips Filter */}
        <div className="flex flex-wrap gap-2">
          {filtersList.map(f => {
            const isActive = activeFilters.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  isActive 
                    ? 'bg-blue-500 border-blue-500 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-500'
                }`}
              >
                {language === 'en' ? f.labelEn : f.labelVi}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button 
              onClick={() => { setActiveFilters([]); setCurrentPage(1); }}
              className="px-3 py-1.5 text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors"
            >
              {language === 'en' ? 'Clear all' : 'Xóa lọc'}
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <th className="py-4 px-6 font-semibold whitespace-nowrap">{language === 'en' ? 'Word' : 'Từ vựng'}</th>
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Reading' : 'Cách đọc'}</th>
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Meaning' : 'Ý nghĩa'}</th>
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Han-Viet' : 'Hán Việt'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((w) => (
                <tr 
                  key={w.id} 
                  onClick={() => setSelectedItem(w)}
                  className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-6 font-bold text-xl text-slate-800 dark:text-white whitespace-nowrap">
                    {w.word}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap">{w.hiragana}</td>
                  <td className="py-4 px-6 text-slate-700 dark:text-slate-200">
                    {getMeaning(w)}
                  </td>
                  <td className="py-4 px-6 font-medium text-amber-600 dark:text-amber-500 whitespace-nowrap">
                    {w.hanVietWord}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400 dark:text-gray-500">
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
            paginatedData.map((w) => (
              <div 
                key={w.id} 
                onClick={() => setSelectedItem(w)}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl text-slate-800 dark:text-white">{w.word}</h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{w.hiragana}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-1">{getMeaning(w)}</p>
                {w.hanVietWord && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">{w.hanVietWord}</p>
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
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
          >
            {/* Header Modal */}
            <div className="relative p-6 border-b border-slate-100 dark:border-slate-700 text-center px-14">
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-2">{selectedItem.word}</h2>
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-2">{selectedItem.hiragana}</p>
              {selectedItem.hanVietWord && (
                <p className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">{selectedItem.hanVietWord}</p>
              )}
            </div>
            
            {/* Body Modal */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="mb-6 text-center">
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">{getMeaning(selectedItem)}</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {(selectedItem as any)._parentLevel && (
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium">
                    {(selectedItem as any)._parentLevel}
                  </span>
                )}
                {(selectedItem as any)._parentLesson && (
                  <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg text-sm font-medium">
                    {(selectedItem as any)._parentLesson}
                  </span>
                )}
                {(selectedItem as any)._parentKanji && (
                  <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium font-bold">
                    {(selectedItem as any)._parentKanji}
                  </span>
                )}
                
                {selectedItem.readingType && (
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wider ${
                    selectedItem.readingType === '音' 
                      ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                      : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {selectedItem.readingType === '音' ? 'ON' : 'KUN'}
                  </span>
                )}
                {selectedItem.type && (
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium">
                    {selectedItem.type === 'verb' ? `Verb ${selectedItem.group ? `G${selectedItem.group}` : ''}` : selectedItem.type}
                  </span>
                )}
              </div>

              {selectedItem.examples && selectedItem.examples.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 text-center">{language === 'en' ? 'Examples' : 'Ví dụ'}</h4>
                  <div className="space-y-4">
                    {selectedItem.examples.map((ex, i) => (
                      <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="font-medium text-slate-800 dark:text-white mb-1">{ex.jp}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'en' && (ex as any).en ? (ex as any).en : ex.vi}</p>
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
