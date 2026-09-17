// src/pages/Dictionary.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useCourseData } from '../hooks/useCourseData';
import { useAudio } from '../context/audio/useAudio';
import { useCustomCourses } from '../context/customCourses/useCustomCourses';
import {
  searchGlobalDictionary,
  type DictionaryEntry,
} from '../lib/dictionary/localDictionaryIndex';
import AddToDeckModal from '../components/dictionary/AddToDeckModal';
import Pagination from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';

import {
  ArrowLeft,
  BookOpen,
  Search,
  X,
  Volume2,
  FolderPlus,
  Filter,
  Globe,
  Sparkles,
  CheckCircle2,
  BookMarked,
  RotateCcw,
  ExternalLink,
  Loader2,
} from 'lucide-react';

import VocabDictionary from '../components/dictionary/VocabDictionary';
import GrammarDictionary from '../components/dictionary/GrammarDictionary';
import KanjiSingleDictionary from '../components/dictionary/KanjiSingleDictionary';
import KanjiWordsDictionary from '../components/dictionary/KanjiWordsDictionary';
import KeigoDictionary from '../components/dictionary/KeigoDictionary';
import ConjugationDictionary from '../components/dictionary/ConjugationDictionary';

export default function Dictionary() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const navigate = useNavigate();
  const location = useLocation();
  const { playText } = useAudio();
  const { customCourses = [], myCourses: hookCourses } = useCustomCourses();
  const myCourses = hookCourses || customCourses || [];

  // Scoped course data (khi truy cập kèm ?courseId=...)
  const { course, loading: courseLoading } = useCourseData(courseId || undefined);

  // ─── GLOBAL DICTIONARY STATES ──────────────────────────────────────────
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const isTyping = query !== debouncedQuery;

  const [activeLangTab, setActiveLangTab] = useState<'all' | 'japanese' | 'english' | 'custom'>('all');
  const [activeSubject, setActiveSubject] = useState<'all' | 'vocab' | 'kanji' | 'grammar'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Modal thêm từ vào bộ thẻ
  const [deckModalEntry, setDeckModalEntry] = useState<DictionaryEntry | null>(null);

  // Modal chi tiết từ
  const [detailEntry, setDetailEntry] = useState<DictionaryEntry | null>(null);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Lắng nghe phím tắt "/" để focus nhanh vào ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Kiểm tra người dùng có đang thực hiện tìm kiếm không (Chỉ cần có từ khóa tìm kiếm)
  const isSearching = debouncedQuery.trim().length > 0;

  // Kết quả tìm kiếm toàn cục: Chỉ thực hiện tra cứu với debouncedQuery để chống giật lag
  const searchResult = useMemo(() => {
    if (courseId || !isSearching) return { total: 0, results: [] };

    return searchGlobalDictionary(
      {
        query: debouncedQuery.trim(),
        language: activeLangTab,
        subject: activeSubject,
        limit: 200,
      },
      myCourses
    );
  }, [debouncedQuery, isSearching, activeLangTab, activeSubject, courseId, myCourses]);

  // Phân trang
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return searchResult.results.slice(start, start + pageSize);
  }, [searchResult.results, currentPage, pageSize]);

  const totalPages = Math.ceil(searchResult.results.length / pageSize);

  const handleSpeak = (text: string, template: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const lang = template === 'english' ? 'en-US' : (template === 'generic' ? 'vi-VN' : 'ja-JP');
    playText(text, lang);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ─── TRƯỜNG HỢP 1: CÓ COURSE ID (Scoped Course Dictionary) ─────────────
  if (courseId) {
    if (courseLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Đang tải từ điển khóa học...</p>
        </div>
      );
    }

    if (!course) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Không tìm thấy Từ điển</h2>
          <p className="text-slate-500 mt-2 text-center">Khóa học này không tồn tại hoặc đã bị xóa.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate('/dictionary')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Tra Từ điển Toàn diện
            </button>
            <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-300 transition-colors">
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }

    const renderCourseDictionary = () => {
      if (course.subject === 'vocab') return <VocabDictionary data={course.data} template={course.template} />;
      if (course.subject === 'grammar') return <GrammarDictionary data={course.data} />;
      if (course.subject === 'kanji_single') return <KanjiSingleDictionary data={course.data} />;
      if (course.subject === 'kanji_words') return <KanjiWordsDictionary data={course.data} />;
      if (course.subject === 'special') {
        if (course.id === 'keigo-master') return <KeigoDictionary data={course.data} />;
        if (course.id === 'verb-conjugation') return <ConjugationDictionary data={course.data} />;
      }
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-3xl mt-8 border border-slate-200 dark:border-slate-700">
          <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Từ điển trống</h3>
          <p className="text-slate-500 mt-2">Khóa học này hiện không có dữ liệu từ điển.</p>
        </div>
      );
    };

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-24">
        {/* HEADER & SWITCHER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/course/${course.id}`, { state: { from: location.state?.from } })}
              className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shrink-0"
              title="Quay lại khóa học"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {course.template === 'english' ? 'Tiếng Anh' : course.template === 'generic' ? 'Thuật ngữ' : 'Tiếng Nhật'}
                </span>
                <span className="text-xs text-slate-400">Từ điển khóa học</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mt-0.5">
                {course.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dictionary')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5"
            >
              <Globe size={14} /> Mở Từ điển Toàn diện
            </button>
          </div>
        </div>

        {renderCourseDictionary()}
      </div>
    );
  }

  // ─── TRƯỜNG HỢP 2: TỪ ĐIỂN TOÀN DIỆN (Global Dictionary Hub) ───────────
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-24 font-sans space-y-6">
      
      {/* HERO BANNER & SEARCH BAR */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 rounded-3xl p-6 md:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold tracking-wider text-blue-100 mb-1 border border-white/10">
            <Sparkles size={14} className="text-amber-300" /> Tra cứu hơn 10,000+ từ vựng & cấu trúc
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Từ Điển Đa Năng
          </h1>
          <p className="text-blue-100/80 text-sm md:text-base max-w-xl mx-auto">
            Tra cứu tức thì Tiếng Nhật, Tiếng Anh và Bộ từ cá nhân. Thêm nhanh từ mới vào bộ thẻ SRS chỉ với 1 click.
          </p>

          {/* Ô tìm kiếm trung tâm */}
          <div className="relative mt-6 max-w-2xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4.5 text-slate-400 dark:text-slate-500 w-5 h-5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Nhập từ vựng, Kanji, Romaji, IPA hoặc nghĩa tiếng Việt... (Nhấn / để tìm)"
                className="w-full pl-12 pr-12 py-4 bg-white text-slate-800 placeholder:text-slate-400 rounded-2xl shadow-2xl font-medium text-base md:text-lg focus:outline-none focus:ring-4 focus:ring-blue-400/40 transition-all"
                autoComplete="off"
              />
              {isTyping ? (
                <div className="absolute right-4 text-indigo-400 animate-spin pointer-events-none">
                  <Loader2 size={18} />
                </div>
              ) : query ? (
                <button
                  onClick={() => { setQuery(''); setCurrentPage(1); }}
                  className="absolute right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Trang trí background */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* BỘ LỌC TÌM KIẾM (Tabs + Selectors) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        
        {/* ROW 1: Tabs chọn ngôn ngữ */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'Tất cả ngôn ngữ', icon: Globe },
              { id: 'japanese', label: '🇯🇵 Tiếng Nhật', icon: null },
              { id: 'english', label: '🇬🇧 Tiếng Anh', icon: null },
              { id: 'custom', label: '📁 Bộ từ của tôi', icon: BookMarked },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeLangTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveLangTab(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {Icon && <Icon size={14} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {isSearching ? (
              <>Tìm thấy: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{searchResult.results.length}</span> kết quả</>
            ) : (
              <span>Sẵn sàng tra cứu</span>
            )}
          </div>
        </div>

        {/* ROW 2: Bộ lọc phân loại nội dung */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={12} /> Phân loại:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'vocab', label: 'Từ vựng' },
            { id: 'kanji', label: 'Chữ Hán' },
            { id: 'grammar', label: 'Ngữ pháp' },
          ].map((sub) => {
            const isActive = activeSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setActiveSubject(sub.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* KHU VỰC KẾT QUẢ TÌM KIẾM HOẶC MÀN HÌNH CHỜ */}
      {!isSearching ? (
        /* MÀN HÌNH CHỜ KHI CHƯA NHẬP TỪ KHÓA */
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
            <Search size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">
              Sẵn sàng tra cứu
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Nhập từ vựng, chữ Hán, Romaji, IPA hoặc nghĩa tiếng Việt vào ô trên để bắt đầu tra cứu (nhấn phím <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono font-bold">/</kbd> để tìm nhanh).
            </p>
          </div>

          {/* Gợi ý từ khóa hot */}
          <div className="pt-2 max-w-lg mx-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Từ khóa gợi ý tìm nhanh:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['勉強', 'ありがとう', '猫', 'resilient', 'ubiquitous', 'API', 'Photosynthesis', 'Học tập'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setQuery(tag);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition-all border border-slate-200/60 dark:border-slate-700 shadow-xs active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : paginatedResults.length > 0 ? (
        /* DANH SÁCH KẾT QUẢ TÌM KIẾM */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedResults.map((item) => {
            const isEnglish = item.template === 'english';
            return (
              <div
                key={item.id}
                onClick={() => setDetailEntry(item)}
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top bar: Source badge & Type */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md truncate max-w-[170px] ${
                      item.isCustom
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                        : isEnglish
                          ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40'
                          : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40'
                    }`} title={item.courseName}>
                      {item.isCustom ? `📁 ${item.courseName}` : item.courseName}
                    </span>

                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {item.subject === 'kanji' ? 'Chữ Hán' : item.subject === 'grammar' ? 'Ngữ pháp' : 'Từ vựng'}
                    </span>
                  </div>

                  {/* Primary text & pronunciation */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.term}
                      </h3>
                      {item.reading && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                          {isEnglish ? `/${item.reading}/` : item.reading}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleSpeak(item.term, item.template, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all shrink-0"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>

                  {/* Meaning */}
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-2 line-clamp-2 leading-relaxed">
                    {item.meaning}
                  </p>

                  {/* Example */}
                  {item.example && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      <p className="italic line-clamp-1 text-slate-600 dark:text-slate-300 font-serif">
                        {item.example}
                      </p>
                      {item.exampleMeaning && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {item.exampleMeaning}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action: "+ Thêm vào bộ từ" */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {item.lesson ? item.lesson : (item.level ? `Trình độ: ${item.level}` : '')}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeckModalEntry(item);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-blue-900/40 text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400 transition-all active:scale-95"
                    title="Lưu từ vào bộ từ cá nhân của bạn"
                  >
                    <FolderPlus size={13} />
                    <span>Lưu vào bộ từ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
          <BookOpen className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
            Không tìm thấy từ vựng phù hợp
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            {activeLangTab === 'custom' && (activeSubject === 'kanji' || activeSubject === 'grammar')
              ? 'Bộ từ cá nhân của bạn hiện tập trung vào từ vựng & thuật ngữ. Để tra cứu Chữ Hán hoặc Ngữ pháp, bạn hãy chọn tab Tiếng Nhật hoặc Tất cả ngôn ngữ.'
              : 'Hãy thử tìm bằng từ khóa khác hoặc chuyển tab sang "Tất cả ngôn ngữ".'}
          </p>
          {(query || activeLangTab !== 'all' || activeSubject !== 'all') && (
            <button
              onClick={() => {
                setQuery('');
                setActiveLangTab('all');
                setActiveSubject('all');
                setCurrentPage(1);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 transition-colors"
            >
              <RotateCcw size={14} /> Xóa toàn bộ bộ lọc
            </button>
          )}
        </div>
      )}

      {/* PHÂN TRANG (Pagination) */}
      {isSearching && totalPages > 1 && (
        <div className="pt-4 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={searchResult.results.length}
            itemsPerPage={pageSize}
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* MODAL THÊM TỪ VÀO BỘ THẺ */}
      <AddToDeckModal
        isOpen={!!deckModalEntry}
        onClose={() => setDeckModalEntry(null)}
        entry={deckModalEntry}
        onSuccess={(courseName) => {
          showToast(`Đã thêm từ "${deckModalEntry?.term}" vào bộ từ "${courseName}"!`);
        }}
      />

      {/* MODAL CHI TIẾT TỪ VỰNG KHI CLICK VÀO CARD */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {detailEntry.courseName}
                </span>
                <span className="text-xs text-slate-400">
                  {detailEntry.subject === 'kanji' ? 'Chữ Hán' : detailEntry.subject === 'grammar' ? 'Ngữ pháp' : 'Từ vựng'}
                </span>
              </div>
              <button
                onClick={() => setDetailEntry(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">
                    {detailEntry.term}
                  </h2>
                  {detailEntry.reading && (
                    <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
                      {detailEntry.template === 'english' ? `/${detailEntry.reading}/` : detailEntry.reading}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSpeak(detailEntry.term, detailEntry.template)}
                  className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex items-center gap-2 font-bold text-sm"
                >
                  <Volume2 size={20} />
                  <span>Phát âm</span>
                </button>
              </div>

              {/* Nghĩa */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Ý nghĩa</p>
                <p className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {detailEntry.meaning}
                </p>
              </div>

              {/* Ví dụ minh họa */}
              {detailEntry.example && (
                <div className="space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Ví dụ câu</p>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {detailEntry.example}
                    </p>
                    {detailEntry.exampleMeaning && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {detailEntry.exampleMeaning}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {detailEntry.lesson ? `Bài học: ${detailEntry.lesson}` : ''}
              </span>

              <div className="flex items-center gap-2">
                {detailEntry.courseId && (
                  <button
                    onClick={() => {
                      setDetailEntry(null);
                      navigate(`/course/${detailEntry.courseId}`);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Vào xem và học cả khóa học này"
                  >
                    <ExternalLink size={14} />
                    <span>Đến khóa học</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const target = detailEntry;
                    setDetailEntry(null);
                    setDeckModalEntry(target);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <FolderPlus size={16} />
                  <span>Thêm vào bộ từ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO THÀNH CÔNG */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl border border-slate-700 dark:border-slate-200 text-xs font-bold">
            <CheckCircle2 size={18} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
}