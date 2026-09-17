import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllCourses, type Course } from '../../data/courses/registry';
import { useMyCourses } from '../../context/global/useMyCourses';
import { Plus, Check, Compass, Search, BookOpen, BadgeCheck, Users } from 'lucide-react';
import { getPublishedCustomCourses, customDocToCourse } from '../../lib/customCourses/customCourseService';

type LangFilter = 'all' | 'ja' | 'en';
type SubjectFilter = 'all' | 'vocab' | 'kanji' | 'grammar' | 'special';
type SourceFilter = 'all' | 'official' | 'community';

export default function Explore() {
  const { myCourseIds, addCourse } = useMyCourses();
  const staticCourses = getAllCourses();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<LangFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [communityCourses, setCommunityCourses] = useState<Course[]>([]);

  useEffect(() => {
    const loadCommunity = async () => {
      const publishedDocs = await getPublishedCustomCourses();
      setCommunityCourses(publishedDocs.map(customDocToCourse));
    };
    loadCommunity();
    window.addEventListener('custom_courses_changed', loadCommunity);
    return () => window.removeEventListener('custom_courses_changed', loadCommunity);
  }, []);

  const allCourses = useMemo(() => {
    return [...staticCourses, ...communityCourses];
  }, [staticCourses, communityCourses]);

  const handleAddCourse = (courseId: string) => {
    addCourse(courseId);
  };

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCourses.filter((c: Course) => {
      // Source filter
      if (sourceFilter === 'official' && !c.author?.isOfficial) return false;
      if (sourceFilter === 'community' && c.author?.isOfficial) return false;

      // Language filter
      const isEnglish = c.template === 'english';
      const isGeneric = c.template === 'generic';
      if (langFilter === 'ja' && (isEnglish || isGeneric)) return false;
      if (langFilter === 'en' && (!isEnglish || isGeneric)) return false;

      // Subject filter
      if (subjectFilter !== 'all') {
        if (subjectFilter === 'kanji') {
          if (c.subject !== 'kanji_single' && c.subject !== 'kanji_words') return false;
        } else if (c.subject !== subjectFilter) {
          return false;
        }
      }

      // Search query
      if (q) {
        const matches =
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.level.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.author?.name && c.author.name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [allCourses, search, langFilter, subjectFilter, sourceFilter]);

  const getColorBg = (color: string) => {
    const map: Record<string, string> = {
      emerald: '#10b981',
      orange: '#f97316',
      blue: '#3b82f6',
      violet: '#8b5cf6',
      fuchsia: '#d946ef',
      sky: '#0284c7',
      indigo: '#6366f1',
      rose: '#f43f5e',
    };
    return map[color] || '#6366f1';
  };

  const getSubjectLabel = (subject: string) => {
    switch (subject) {
      case 'vocab': return 'Từ vựng';
      case 'kanji_single': return 'Hán tự đơn';
      case 'kanji_words': return 'Từ ghép Kanji';
      case 'grammar': return 'Ngữ pháp';
      case 'special': return 'Đặc biệt';
      default: return subject.toUpperCase();
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-3">
              <Compass className="text-indigo-500" size={32} />
              Khám Phá Khóa Học
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Khám phá toàn bộ kho tài nguyên tiếng Nhật & tiếng Anh, thêm vào lộ trình học của bạn.
            </p>
          </div>
        </div>

        {/* Search & Filters Toolbar */}
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm khóa học theo tên, mô tả hoặc cấp độ (VD: N3, B2, Mimikara)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:border-indigo-500 outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 flex-wrap">
            {/* Source Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Nguồn:</span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
                {(['all', 'official', 'community'] as const).map(src => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      sourceFilter === src
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-500'
                    }`}
                  >
                    {src === 'all' && 'Tất cả'}
                    {src === 'official' && '⭐ Chính thức'}
                    {src === 'community' && '👥 Cộng đồng'}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Ngôn ngữ:</span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
                {(['all', 'ja', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLangFilter(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      langFilter === lang
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-500'
                    }`}
                  >
                    {lang === 'all' && '🌐 Tất cả'}
                    {lang === 'ja' && '🇯🇵 Tiếng Nhật'}
                    {lang === 'en' && '🇬🇧 Tiếng Anh'}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Chủ đề:</span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl flex-wrap gap-1">
                {([
                  { id: 'all', label: 'Tất cả' },
                  { id: 'vocab', label: 'Từ vựng' },
                  { id: 'kanji', label: 'Hán tự' },
                  { id: 'grammar', label: 'Ngữ pháp' },
                  { id: 'special', label: 'Đặc biệt' },
                ] as const).map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSubjectFilter(sub.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      subjectFilter === sub.id
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-indigo-500'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 font-medium px-1">
          <span>
            Tìm thấy <strong className="text-slate-800 dark:text-white font-bold">{filteredCourses.length}</strong> khóa học
          </span>
          {(search || langFilter !== 'all' || subjectFilter !== 'all' || sourceFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setLangFilter('all'); setSubjectFilter('all'); setSourceFilter('all'); }}
              className="text-xs font-bold text-rose-500 hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* Explore Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(c => {
              const isAdded = myCourseIds.includes(c.id);
              const isEnglish = c.template === 'english';
              const itemCount = c.data?.length || 0;

              return (
                <div
                  key={c.id}
                  className="flex flex-col p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl shadow-sm hover:shadow-xl transition-all relative group"
                >
                  {/* Clicking on the card background previews course */}
                  <Link to={`/course/${c.id}`} state={{ from: '/explore' }} className="absolute inset-0 z-0 rounded-2xl" />

                  {/* Top Badges & Icon */}
                  <div className="flex items-start justify-between mb-4 z-10 pointer-events-none">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-lg"
                      style={{ backgroundColor: getColorBg(c.color) }}
                    >
                      {isEnglish ? 'EN' : c.template === 'generic' ? '📋' : c.subject === 'vocab' ? 'Aa' : (c.subject === 'kanji_single' || c.subject === 'kanji_words') ? '漢' : c.subject === 'grammar' ? '📖' : '🎓'}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg border ${
                        isEnglish
                          ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/50'
                          : c.template === 'generic'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
                      }`}>
                        {isEnglish ? '🇬🇧 Tiếng Anh' : c.template === 'generic' ? '🌐 Thuật ngữ' : '🇯🇵 Tiếng Nhật'}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1 z-10 pointer-events-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {c.name}
                  </h2>

                  {/* Author line */}
                  {c.author && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5 z-10 pointer-events-none">
                      <span>Tác giả:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{c.author.name}</span>
                      {c.author.isOfficial ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.2 rounded-md border border-blue-200 dark:border-blue-800/40" title="Khóa học chính thức từ hệ thống">
                          <BadgeCheck size={13} className="fill-blue-500 text-white dark:text-slate-900" />
                          <span>Chính thức</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold text-[11px] bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.2 rounded-md border border-purple-200 dark:border-purple-800/40" title="Khóa học do cộng đồng chia sẻ">
                          <Users size={12} />
                          <span>Cộng đồng</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3 z-10 pointer-events-none flex-wrap">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded">
                      {c.level}
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded">
                      {getSubjectLabel(c.subject)}
                    </span>
                    {itemCount > 0 && (
                      <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-medium rounded border border-slate-200 dark:border-slate-700">
                        {itemCount} mục
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-1 z-10 pointer-events-none leading-relaxed">
                    {c.description}
                  </p>

                  <div className="z-10 mt-auto">
                    {isAdded ? (
                      <button
                        onClick={(e) => { e.preventDefault(); navigate(`/course/${c.id}`, { state: { from: '/explore' } }); }}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        <Check size={18} className="text-green-500" />
                        Vào học ngay
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddCourse(c.id); }}
                        className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800/50 transition-colors"
                      >
                        <Plus size={18} />
                        Thêm vào của tôi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
              Không tìm thấy khóa học nào phù hợp
            </h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn lại bộ lọc ngôn ngữ, chủ đề.
            </p>
            <button
              onClick={() => { setSearch(''); setLangFilter('all'); setSubjectFilter('all'); }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-500/20"
            >
              Xem tất cả khóa học
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
