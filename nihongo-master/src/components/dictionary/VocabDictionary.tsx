import { useState, useMemo } from 'react';
import type { Word } from '../../types';
import { useSettings } from '../../context/global/useSettings';
import { useAudio } from '../../context/audio/useAudio';
import Pagination from '../ui/Pagination';
import { Search, X, Volume2 } from 'lucide-react';
import { formatDualIpa } from '../../lib/english/ipaHelper';

interface Props {
  data: (Word | any)[];
  template?: string;
}

const POS_LABELS: Record<string, { vi: string; en: string }> = {
  noun: { vi: 'Danh từ', en: 'Noun' },
  verb: { vi: 'Động từ', en: 'Verb' },
  adjective: { vi: 'Tính từ', en: 'Adjective' },
  adj: { vi: 'Tính từ', en: 'Adjective' },
  adverb: { vi: 'Trạng từ', en: 'Adverb' },
  adv: { vi: 'Trạng từ', en: 'Adverb' },
  preposition: { vi: 'Giới từ', en: 'Preposition' },
  prep: { vi: 'Giới từ', en: 'Preposition' },
  conjunction: { vi: 'Liên từ', en: 'Conjunction' },
  conj: { vi: 'Liên từ', en: 'Conjunction' },
  pronoun: { vi: 'Đại từ', en: 'Pronoun' },
  interjection: { vi: 'Thán từ', en: 'Interjection' },
  phrase: { vi: 'Cụm từ', en: 'Phrase' },
  idiom: { vi: 'Thành ngữ', en: 'Idiom' },
  phrasal_verb: { vi: 'Cụm động từ', en: 'Phrasal Verb' },
};

const JP_TYPE_LABELS: Record<string, { vi: string; en: string }> = {
  verb1: { vi: 'Động từ N1', en: 'Verb G1' },
  verb2: { vi: 'Động từ N2', en: 'Verb G2' },
  verb3: { vi: 'Động từ N3', en: 'Verb G3' },
  adj_i: { vi: 'Tính từ I', en: 'I-Adj' },
  adj_na: { vi: 'Tính từ NA', en: 'Na-Adj' },
  noun: { vi: 'Danh từ', en: 'Noun' },
  adv: { vi: 'Trạng từ', en: 'Adverb' },
  expression: { vi: 'Cụm từ', en: 'Expression' },
};

export default function VocabDictionary({ data, template }: Props) {
  const { language } = useSettings();
  const { playText } = useAudio();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const isEnglish = template === 'english' || data.some((d: any) => d.template === 'english' || (d.word && !d.kanji));

  const pageSize = 20;

  // ── Data-driven Dynamic Filters ──────────────────────────────────────
  // Chỉ hiển thị các bộ lọc thực sự tồn tại trong tập dữ liệu hiện tại
  const filtersList = useMemo(() => {
    if (isEnglish) {
      const posSet = new Set<string>();
      const cefrSet = new Set<string>();

      data.forEach((item: any) => {
        if (item.partOfSpeech) {
          posSet.add(item.partOfSpeech.trim().toLowerCase());
        }
        if (item.cefrLevel) {
          cefrSet.add(item.cefrLevel.trim().toUpperCase());
        }
      });

      const list: { id: string; labelEn: string; labelVi: string; category: 'pos' | 'cefr' }[] = [];

      // Add POS filters present in data
      Array.from(posSet).sort().forEach(pos => {
        const mapped = POS_LABELS[pos];
        list.push({
          id: `pos:${pos}`,
          labelEn: mapped?.en || pos.charAt(0).toUpperCase() + pos.slice(1),
          labelVi: mapped?.vi || pos,
          category: 'pos',
        });
      });

      // Add CEFR filters present in data (ordered)
      const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      CEFR_ORDER.filter(lvl => cefrSet.has(lvl)).forEach(lvl => {
        list.push({
          id: `cefr:${lvl}`,
          labelEn: lvl,
          labelVi: lvl,
          category: 'cefr',
        });
      });

      // Any other non-standard levels
      Array.from(cefrSet).filter(lvl => !CEFR_ORDER.includes(lvl)).sort().forEach(lvl => {
        list.push({
          id: `cefr:${lvl}`,
          labelEn: lvl,
          labelVi: lvl,
          category: 'cefr',
        });
      });

      return list;
    } else {
      // Japanese: only extract types that exist in current data
      const typeSet = new Set<string>();
      data.forEach((w: any) => {
        const t = w.type === 'verb' ? `verb${w.group}` : w.type;
        if (t) typeSet.add(t);
      });

      const list: { id: string; labelEn: string; labelVi: string; category: 'type' }[] = [];
      Object.entries(JP_TYPE_LABELS).forEach(([key, labels]) => {
        if (typeSet.has(key)) {
          list.push({
            id: key,
            labelEn: labels.en,
            labelVi: labels.vi,
            category: 'type',
          });
        }
      });
      return list;
    }
  }, [data, isEnglish]);

  const toggleFilter = (filterId: string) => {
    setActiveFilters(prev =>
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return data.filter((word: any) => {
      const meaningText = typeof word.meaning === 'object'
        ? (language === 'en' ? word.meaning.en : word.meaning.vi) ?? word.meaning.vi
        : word.meaning;

      let matchesSearch = true;
      if (term) {
        matchesSearch =
          (word.word?.toLowerCase().includes(term) ?? false) ||
          (word.ipa?.toLowerCase().includes(term) ?? false) ||
          (word.ipaBrE?.toLowerCase().includes(term) ?? false) ||
          (word.ipaAmE?.toLowerCase().includes(term) ?? false) ||
          (word.kanji?.toLowerCase().includes(term) ?? false) ||
          (word.alt_kanji?.toLowerCase().includes(term) ?? false) ||
          (word.hiragana?.toLowerCase().includes(term) ?? false) ||
          (meaningText || '').toLowerCase().includes(term) ||
          (word.lesson || '').toLowerCase().includes(term);
      }

      let matchesFilter = true;
      if (activeFilters.length > 0) {
        if (isEnglish) {
          const wPos = (word.partOfSpeech || '').trim().toLowerCase();
          const wCefr = (word.cefrLevel || '').trim().toUpperCase();

          matchesFilter = activeFilters.some(f => {
            if (f.startsWith('pos:')) {
              const target = f.slice(4);
              return wPos === target || (target === 'adjective' && wPos === 'adj') || (target === 'adverb' && wPos === 'adv');
            }
            if (f.startsWith('cefr:')) {
              const target = f.slice(5);
              return wCefr === target;
            }
            return false;
          });
        } else {
          const wordFilterType = word.type === 'verb' ? `verb${word.group}` : word.type;
          matchesFilter = activeFilters.includes(wordFilterType);
        }
      }

      return matchesSearch && matchesFilter;
    });
  }, [data, searchTerm, activeFilters, language, isEnglish]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getTypeLabel = (type: string, group?: number | null) => {
    if (type === 'verb') return language === 'en' ? `Verb G${group}` : `Động từ Nhóm ${group}`;
    if (type === 'adj_i') return language === 'en' ? 'I-Adj' : 'Tính từ đuôi I';
    if (type === 'adj_na') return language === 'en' ? 'Na-Adj' : 'Tính từ đuôi NA';
    if (type === 'adv') return language === 'en' ? 'Adverb' : 'Trạng từ';
    if (type === 'expression') return language === 'en' ? 'Expression' : 'Cụm từ';
    return language === 'en' ? 'Noun' : 'Danh từ';
  };

  const getPosDisplay = (pos?: string) => {
    if (!pos) return '';
    const p = pos.trim().toLowerCase();
    const mapped = POS_LABELS[p];
    return (language === 'en' ? mapped?.en : mapped?.vi) || pos;
  };

  const getMeaning = (word: any) => {
    if (!word) return '';
    if (typeof word.meaning === 'object') {
      return (language === 'en' ? word.meaning.en : word.meaning.vi) ?? word.meaning.vi ?? '';
    }
    return word.meaning || '';
  };

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    playText(text, isEnglish ? 'en-US' : 'ja-JP');
  };

  return (
    <div>
      {/* TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6 flex flex-col gap-4 transition-colors">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={
              isEnglish
                ? language === 'en' ? 'Search by word, IPA, or meaning...' : 'Tìm theo từ tiếng Anh, phiên âm, hoặc nghĩa...'
                : language === 'en' ? 'Search by Kanji, Hiragana or Meaning...' : 'Tìm theo Kanji, Hiragana hoặc Nghĩa...'
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
          />
        </div>

        {/* Dynamic Filter Chips */}
        {filtersList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mr-1 uppercase tracking-wider">
              {language === 'en' ? 'Filter:' : 'Lọc:'}
            </span>
            {filtersList.map(f => {
              const isActive = activeFilters.includes(f.id);
              const isCefr = 'category' in f && f.category === 'cefr';
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    isActive
                      ? isCefr
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-blue-500 border-blue-500 text-white shadow-sm'
                      : isCefr
                        ? 'bg-amber-50/50 dark:bg-slate-800 border-amber-200/80 dark:border-slate-600 text-amber-700 dark:text-amber-400 hover:border-amber-400'
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
        )}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">
              <th className="py-4 px-6 font-semibold whitespace-nowrap">{isEnglish ? 'Từ vựng (Word)' : 'Kanji'}</th>
              <th className="py-4 px-6 font-semibold">{isEnglish ? 'Phiên âm (IPA)' : 'Hiragana'}</th>
              {isEnglish && <th className="py-4 px-6 font-semibold whitespace-nowrap">Loại từ / Level</th>}
              <th className="py-4 px-6 font-semibold">{language === 'en' ? 'Meaning' : 'Ý nghĩa'}</th>
              <th className="py-4 px-6 font-semibold text-center w-20">Âm thanh</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((word) => {
                const primaryText = isEnglish ? word.word : word.kanji;
                const subText = isEnglish ? word.ipa : word.hiragana;
                return (
                  <tr
                    key={word.id}
                    onClick={() => setSelectedItem(word)}
                    className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-bold text-xl text-slate-800 dark:text-white whitespace-nowrap group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {primaryText}
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                      {isEnglish ? (
                        word.ipaBrE && word.ipaAmE && word.ipaBrE !== word.ipaAmE ? (
                          <div className="flex flex-col gap-0.5 text-xs font-mono">
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">🇬🇧 UK: {word.ipaBrE}</span>
                            <span className="text-sky-600 dark:text-sky-400 font-semibold">🇺🇸 US: {word.ipaAmE}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-sm">{formatDualIpa(word) || '-'}</span>
                        )
                      ) : (
                        subText || '-'
                      )}
                    </td>
                    {isEnglish && (
                      <td className="py-4 px-6 whitespace-nowrap">
                        {word.partOfSpeech && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 mr-2">
                            {getPosDisplay(word.partOfSpeech)}
                          </span>
                        )}
                        {word.cefrLevel && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            {word.cefrLevel}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-200">
                      {getMeaning(word)}
                    </td>
                    <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleSpeak(primaryText || subText, e)}
                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Phát âm"
                      >
                        <Volume2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isEnglish ? 5 : 4} className="py-12 text-center text-gray-400 dark:text-gray-500">
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
            paginatedData.map((word) => {
              const primaryText = isEnglish ? word.word : word.kanji;
              const subText = isEnglish ? word.ipa : word.hiragana;
              return (
                <div
                  key={word.id}
                  onClick={() => setSelectedItem(word)}
                  className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="font-bold text-xl text-slate-800 dark:text-white">{primaryText}</h3>
                      {isEnglish ? (
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {formatDualIpa(word)}
                        </span>
                      ) : (
                        subText && <span className="text-sm text-slate-400 dark:text-slate-500">{subText}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleSpeak(primaryText || subText, e)}
                      className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{getMeaning(word)}</p>
                  {isEnglish && (word.partOfSpeech || word.cefrLevel) && (
                    <div className="flex gap-2 mt-2">
                      {word.partOfSpeech && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                          {getPosDisplay(word.partOfSpeech)}
                        </span>
                      )}
                      {word.cefrLevel && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          {word.cefrLevel}
                        </span>
                      )}
                    </div>
                  )}
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
              <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-2 flex items-center justify-center gap-3">
                <span>{isEnglish ? selectedItem.word : selectedItem.kanji}</span>
                <button
                  onClick={(e) => handleSpeak(isEnglish ? selectedItem.word : (selectedItem.kanji || selectedItem.hiragana), e)}
                  className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 rounded-full transition-all"
                  title="Phát âm"
                >
                  <Volume2 size={20} />
                </button>
              </h2>
              {isEnglish ? (
                <div className="flex items-center justify-center gap-2.5 mt-2 flex-wrap">
                  {selectedItem.ipaBrE && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-mono">
                      <span>🇬🇧 UK: {selectedItem.ipaBrE}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); playText(selectedItem.word, 'en-GB'); }}
                        className="p-1 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
                        title="Nghe phát âm Anh (UK)"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  )}
                  {selectedItem.ipaAmE && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 text-sky-700 dark:text-sky-300 text-xs sm:text-sm font-mono">
                      <span>🇺🇸 US: {selectedItem.ipaAmE}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); playText(selectedItem.word, 'en-US'); }}
                        className="p-1 hover:text-sky-900 dark:hover:text-sky-100 transition-colors"
                        title="Nghe phát âm Mỹ (US)"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                  )}
                  {!selectedItem.ipaBrE && !selectedItem.ipaAmE && selectedItem.ipa && (
                    <p className="text-base font-medium text-slate-500 dark:text-slate-400 font-mono">
                      {selectedItem.ipa}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                  {selectedItem.hiragana}
                </p>
              )}
            </div>

            {/* Body Modal */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="mb-6">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
                  {language === 'en' ? 'Meaning' : 'Ý nghĩa'}
                </h4>
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                  {getMeaning(selectedItem)}
                </p>
                {isEnglish && typeof selectedItem.meaning === 'object' && selectedItem.meaning.en && language !== 'en' && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">
                    {selectedItem.meaning.en}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {isEnglish ? (
                  <>
                    {selectedItem.partOfSpeech && (
                      <span className="px-3 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg text-sm font-medium">
                        {getPosDisplay(selectedItem.partOfSpeech)}
                      </span>
                    )}
                    {selectedItem.cefrLevel && (
                      <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-bold">
                        CEFR: {selectedItem.cefrLevel}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium">
                      {getTypeLabel(selectedItem.type, selectedItem.group)}
                    </span>
                    {selectedItem.level && (
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium">
                        {selectedItem.level}
                      </span>
                    )}
                  </>
                )}
                {selectedItem.lesson && (
                  <span className="px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg text-sm font-medium">
                    {selectedItem.lesson}
                  </span>
                )}
              </div>

              {selectedItem.examples && selectedItem.examples.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
                    {language === 'en' ? 'Examples' : 'Ví dụ'}
                  </h4>
                  <div className="space-y-4">
                    {selectedItem.examples.map((ex: any, i: number) => {
                      const exText = isEnglish ? (ex.en || ex.jp) : ex.jp;
                      const exMeaning = isEnglish ? ex.vi : (language === 'en' && ex.en ? ex.en : ex.vi);
                      return (
                        <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-slate-800 dark:text-white mb-1">{exText}</p>
                            <button
                              onClick={(e) => handleSpeak(exText, e)}
                              className="text-slate-400 hover:text-blue-500 p-1 shrink-0"
                              title="Phát âm"
                            >
                              <Volume2 size={16} />
                            </button>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{exMeaning}</p>
                        </div>
                      );
                    })}
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
