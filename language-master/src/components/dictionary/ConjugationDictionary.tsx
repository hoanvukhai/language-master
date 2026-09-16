import { useState, useMemo } from 'react';
import type { Word } from '../../types';
import { useSettings } from '../../context/global/useSettings';
import Pagination from '../ui/Pagination';
import { Search, X } from 'lucide-react';
import {
  getMasuForm, getTeForm, getNaiForm, getTaForm, getNakattaForm,
  getPotentialForm, getVolitionalForm, getImperativeForm, getProhibitiveForm,
  getConditionalForm, getConditionalNegativeForm, getPassiveForm,
  getCausativeForm, getCausativePassiveForm, getPresumptiveForm, getPresumptiveNegativeForm
} from '../../lib/conjugator';

interface Props {
  data: Word[]; // Từ verbs.json
}

export default function ConjugationDictionary({ data }: Props) {
  const { language } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<Word | null>(null);
  
  const pageSize = 20;

  const filtersList = [
    { id: 'verb1', labelEn: 'Group 1', labelVi: 'Nhóm 1' },
    { id: 'verb2', labelEn: 'Group 2', labelVi: 'Nhóm 2' },
    { id: 'verb3', labelEn: 'Group 3', labelVi: 'Nhóm 3' },
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev => 
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return data.filter((word) => {
      const meaningText = typeof word.meaning === 'object' ? word.meaning[language as 'vi' | 'en'] : word.meaning;
      const matchesSearch = 
        word.kanji.includes(searchTerm) || 
        word.hiragana.includes(searchTerm) || 
        (meaningText || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const wordGroup = `verb${word.group}`;
      const matchesFilter = activeFilters.length === 0 || activeFilters.includes(wordGroup);

      return matchesSearch && matchesFilter;
    });
  }, [data, searchTerm, activeFilters, language]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getMeaning = (word: Word) => {
    return typeof word.meaning === 'object' ? word.meaning[language as 'vi' | 'en'] : word.meaning;
  };

  const getConjugations = (word: Word) => [
    { name: 'Từ điển (Ru)', value: word.kanji || word.hiragana },
    { name: 'Lịch sự (Masu)', value: getMasuForm(word) },
    { name: 'Thể Te', value: getTeForm(word) },
    { name: 'Phủ định (Nai)', value: getNaiForm(word) },
    { name: 'Quá khứ (Ta)', value: getTaForm(word) },
    { name: 'Quá khứ Phủ định (Nakatta)', value: getNakattaForm(word) },
    { name: 'Khả năng', value: getPotentialForm(word) },
    { name: 'Ý chí (Yoo)', value: getVolitionalForm(word) },
    { name: 'Mệnh lệnh', value: getImperativeForm(word) },
    { name: 'Cấm chỉ', value: getProhibitiveForm(word) },
    { name: 'Điều kiện (Ba)', value: getConditionalForm(word) },
    { name: 'Đ.kiện Phủ định (Nakereba)', value: getConditionalNegativeForm(word) },
    { name: 'Bị động (Rareru)', value: getPassiveForm(word) },
    { name: 'Sai khiến (Saseru)', value: getCausativeForm(word) },
    { name: 'SK Bị động (Saserareru)', value: getCausativePassiveForm(word) },
    { name: 'Giả định (Tara)', value: getPresumptiveForm(word) },
    { name: 'Giả định Phủ định', value: getPresumptiveNegativeForm(word) },
  ];

  return (
    <div>
      {/* TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6 flex flex-col gap-4 transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder={language === 'en' ? "Search by Verb, Kana or Meaning..." : "Tìm theo Động từ, Hiragana hoặc Nghĩa..."}
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
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-orange-300 hover:text-orange-500'
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
              <th className="py-4 px-6 font-semibold whitespace-nowrap">{language === 'en' ? 'Verb (Dict Form)' : 'Động từ (Thể từ điển)'}</th>
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Meaning' : 'Ý nghĩa'}</th>
              <th className="py-4 px-6 font-semibold text-center">{language === 'en' ? 'Group' : 'Nhóm'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((word) => (
                <tr 
                  key={word.id} 
                  onClick={() => setSelectedItem(word)}
                  className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-6 font-bold text-xl text-orange-600 dark:text-orange-500 whitespace-nowrap">
                    {word.kanji} <span className="text-sm font-normal text-slate-500 ml-2">({word.hiragana})</span>
                  </td>
                  <td className="py-4 px-6 text-slate-700 dark:text-slate-200">
                    {getMeaning(word)}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold inline-block">
                      {language === 'en' ? `Group ${word.group}` : `Nhóm ${word.group}`}
                    </span>
                    {word.isSpecial && (
                      <span className="ml-2 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded text-[10px] font-bold uppercase tracking-wide">
                        {language === 'en' ? 'Trap' : 'Bẫy'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-12 text-center text-gray-400 dark:text-gray-500">
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
            paginatedData.map((word) => (
              <div 
                key={word.id} 
                onClick={() => setSelectedItem(word)}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-xl text-orange-600 dark:text-orange-500">{word.kanji}</h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{word.hiragana}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-bold">
                      G{word.group}
                    </span>
                    {word.isSpecial && (
                      <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded text-[10px] font-bold uppercase tracking-wide">
                        {language === 'en' ? 'Trap' : 'Bẫy'}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-medium">{getMeaning(word)}</p>
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

      {/* MODAL 15 THỂ */}
      {selectedItem && (
        <div 
          onClick={() => setSelectedItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
          >
            {/* Header Modal */}
            <div className="relative p-6 border-b border-slate-100 dark:border-slate-700 bg-orange-50/50 dark:bg-orange-900/10 text-center flex-shrink-0 px-14">
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full shadow-sm transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-4xl font-black text-orange-600 dark:text-orange-500 mb-2">{selectedItem.kanji}</h2>
              <p className="text-xl font-bold text-slate-600 dark:text-slate-300">{selectedItem.hiragana} - {getMeaning(selectedItem)}</p>
              
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400 rounded-lg text-sm font-bold shadow-sm">
                  {language === 'en' ? `Group ${selectedItem.group}` : `Nhóm ${selectedItem.group}`}
                </span>
                {selectedItem.isSpecial && (
                  <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-sm font-bold uppercase tracking-wider shadow-sm">
                    {language === 'en' ? 'JLPT Trap / Irregular' : 'Bẫy JLPT / Ngoại lệ'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Body Modal - Bảng Chia Thể */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {getConjugations(selectedItem).map((conj, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{conj.name}</span>
                    <span className="font-bold text-lg text-slate-800 dark:text-white">{conj.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
