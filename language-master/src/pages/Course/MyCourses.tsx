import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCourses } from '../../data/courses/registry';
import { useMyCourses } from '../../context/global/useMyCourses';
import { useCustomCourses } from '../../context/customCourses/useCustomCourses';
import { customDocToCourse, type CustomCourseDoc } from '../../lib/customCourses/customCourseService';
import { CourseEditorModal } from '../../components/course/CourseEditorModal';
import { 
  Library, 
  Flame, 
  Loader2, 
  Sparkles, 
  Trophy, 
  BadgeCheck, 
  MoreVertical, 
  HardDrive,
  Plus,
  BookOpen,
  Globe,
  Lock,
  Edit3,
  Trash2,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../context/auth/useAuth';
import { useDashboardStats } from './useDashboardStats';
import { CourseManageModal } from '../../components/course/CourseManageModal';
import { getAllOfflineMeta } from '../../lib/offline/offlineStorage';
import { useAuthGate } from '../../hooks/useAuthGate';

export default function MyCourses() {
  const { myCourseIds, addCourse } = useMyCourses();
  const { customCourses, loading: customLoading, createCourse, updateCourse, deleteCourse, togglePublish } = useCustomCourses();
  const { user } = useAuth();
  const { executeWithGate, GateComponent } = useAuthGate();
  const staticCourses = getAllCourses();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'enrolled' | 'created'>('enrolled');
  const [selectedCourseForManage, setSelectedCourseForManage] = useState<string | null>(null);
  const [offlineCourseIds, setOfflineCourseIds] = useState<Set<string>>(new Set());

  // Modal Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CustomCourseDoc | null>(null);

  useEffect(() => {
    const loadOffline = () => {
      getAllOfflineMeta().then(list => {
        setOfflineCourseIds(new Set(list.map(item => item.id)));
      });
    };
    loadOffline();
    window.addEventListener('offline_course_changed', loadOffline);
    return () => window.removeEventListener('offline_course_changed', loadOffline);
  }, []);

  // Tổng hợp tất cả khóa học (bao gồm cả các khóa do người dùng tạo)
  const allCourses = useMemo(() => {
    const customAsCourses = customCourses.map(customDocToCourse);
    return [...staticCourses, ...customAsCourses];
  }, [staticCourses, customCourses]);

  const myCourses = useMemo(() => {
    return allCourses.filter(c => myCourseIds.includes(c.id));
  }, [allCourses, myCourseIds]);

  // Lấy data dashboard thực tế cho user hiện tại và các khóa đã add
  const { stats, loading } = useDashboardStats(user?.uid, myCourseIds);

  const handleSaveCourse = async (data: any, courseId?: string) => {
    if (courseId) {
      await updateCourse(courseId, data);
    } else {
      const created = await createCourse(data);
      // Tự động thêm vào danh sách khóa học đang theo học
      await addCourse(created.id);
    }
  };

  const handleOpenCreateModal = () => {
    executeWithGate(() => {
      setEditingCourse(null);
      setIsEditorOpen(true);
    });
  };

  const handleDeleteCustomCourse = async (courseId: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ từ vựng "${title}" không? Hành động này không thể hoàn tác.`)) {
      await deleteCourse(courseId);
    }
  };

  const getColorBg = (color: string) => {
    const map: Record<string, string> = {
      emerald: '#10b981',
      orange: '#f97316',
      blue: '#3b82f6',
      violet: '#8b5cf6',
      fuchsia: '#d946ef',
      sky: '#0284c7',
      indigo: '#6366f1',
      amber: '#f59e0b',
      rose: '#f43f5e',
    };
    return map[color] || '#6366f1';
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-1.5 flex items-center gap-3">
              <Library className="text-indigo-500" size={32} />
              Khóa Học Của Tôi
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {user ? `Chào mừng trở lại, ${user.displayName || user.email?.split('@')[0]}!` : 'Hãy đăng nhập để đồng bộ tiến độ học tập của bạn trên mọi thiết bị.'}
            </p>
          </div>

          {/* Quick Create Button on top right */}
          {user ? (
            <button
              onClick={handleOpenCreateModal}
              className="self-start sm:self-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-500/25 flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Tạo bộ từ mới</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="self-start sm:self-auto px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs sm:text-sm rounded-xl transition-all border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-2"
            >
              <LogIn size={16} />
              <span>Đăng nhập để tạo bộ từ</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'enrolled'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen size={16} />
            <span>Đang học</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'enrolled' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {myCourses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('created')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'created'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles size={16} />
            <span>Tự tạo của tôi</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'created' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {customCourses.length}
            </span>
          </button>
        </div>

        {/* TAB 1: ENROLLED COURSES (ĐANG HỌC) */}
        {activeTab === 'enrolled' && (
          <div>
            {myCourses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Library size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bạn chưa có khóa học nào</h2>
                <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
                  Hãy sang trang Khám phá để chọn các giáo trình N5-N1/TOEIC, hoặc tự tạo bộ từ vựng cá nhân để bắt đầu ôn tập.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => navigate('/explore')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-500/20"
                  >
                    Khám phá ngay
                  </button>
                  {user ? (
                    <button
                      onClick={handleOpenCreateModal}
                      className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                    >
                      + Tạo bộ từ mới
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/login')}
                      className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
                    >
                      <LogIn size={16} />
                      <span>Đăng nhập tài khoản</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCourses.map(c => {
                  const courseStat = stats[c.id];
                  const learnedCount = courseStat?.progressPercent || 0;
                  let totalItems = c.data.length || 1;
                  if (c.subject === 'kanji_single') {
                    totalItems = c.data.reduce((acc: number, k: any) => acc + 1 + (k.words?.length || 0), 0);
                  } else if (c.subject === 'kanji_words') {
                    totalItems = c.data.reduce((acc: number, k: any) => acc + (k.words?.length || 0), 0);
                  }
                  const percent = Math.min(100, Math.round((learnedCount / totalItems) * 100));

                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/course/${c.id}`, { state: { from: '/' } })}
                      className="group flex flex-col p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:-translate-y-1 shadow-sm hover:shadow-xl cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-lg"
                          style={{ backgroundColor: getColorBg(c.color) }}
                        >
                          {c.template === 'english' ? 'EN' : c.template === 'generic' ? '📋' : c.subject === 'vocab' ? 'Aa' : (c.subject === 'kanji_single' || c.subject === 'kanji_words') ? '漢' : c.subject === 'grammar' ? '📝' : '🌟'}
                        </div>

                        <div className="flex items-center gap-2">
                          {offlineCourseIds.has(c.id) && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/50" title="Khóa học đã tải về thiết bị để học ngoại tuyến">
                              <HardDrive size={13} />
                              <span>Offline</span>
                            </div>
                          )}
                          {(courseStat?.highScore || 0) > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800/50">
                              <Trophy size={14} />
                              <span>{courseStat.highScore}đ</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourseForManage(c.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                            title="Quản lý khóa học"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </div>

                      <h2 className="text-xl font-black text-slate-800 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {c.name}
                      </h2>

                      {/* Author */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span>Tác giả:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{c.author?.name || 'Hệ thống'}</span>
                        {c.author?.isOfficial && (
                          <BadgeCheck size={13} className="fill-blue-500 text-white dark:text-slate-900" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded">
                          {c.template === 'english' ? '🇬🇧 Tiếng Anh' : c.template === 'generic' ? '🌐 Thuật ngữ' : '🇯🇵 Tiếng Nhật'}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded">
                          {c.level}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-medium rounded border border-slate-200 dark:border-slate-700">
                          {c.data.length} từ
                        </span>
                      </div>

                      {/* Progress / Actions */}
                      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        {loading ? (
                          <div className="flex items-center justify-center py-4 text-slate-400">
                            <Loader2 className="animate-spin w-5 h-5" />
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                              <span>Tiến độ ({learnedCount}/{totalItems})</span>
                              <span className="text-indigo-600 dark:text-indigo-400">{percent}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                              <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between mt-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 flex-wrap">
                                {learnedCount === 0 ? (
                                  <button
                                    onClick={() => navigate(`/learn/session?courseId=${c.id}&mode=new`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
                                  >
                                    <Sparkles size={14} /> Bắt đầu học
                                  </button>
                                ) : (
                                  <>
                                    {courseStat?.dueCount ? (
                                      <button
                                        onClick={() => navigate(`/learn/session?courseId=${c.id}&mode=review`)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20"
                                      >
                                        <Flame size={14} /> Ôn tập ({courseStat.dueCount})
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-1 py-1.5">
                                        ✓ Đã ôn hết
                                      </div>
                                    )}
                                    <button
                                      onClick={() => navigate(`/learn/session?courseId=${c.id}&mode=new`)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                    >
                                      <Sparkles size={14} /> Học mới
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: USER'S CREATED COURSES (TỰ TẠO CỦA TÔI) */}
        {activeTab === 'created' && (
          <div className="space-y-6">
            {!user ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  Vui lòng đăng nhập tài khoản
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
                  Bạn cần đăng nhập để tự biên soạn bộ thẻ từ vựng cá nhân, đồng bộ tiến độ học tập trên đám mây và chia sẻ cùng cộng đồng.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/25 inline-flex items-center gap-2"
                >
                  <LogIn size={18} />
                  <span>Đăng nhập ngay</span>
                </button>
              </div>
            ) : customLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin w-8 h-8" />
              </div>
            ) : customCourses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  Bạn chưa tạo bộ từ vựng nào
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
                  Tự tạo bộ thẻ học riêng biệt theo sở thích, ngành nghề hoặc xuất bản chia sẻ lên cộng đồng cho mọi người cùng học.
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/25 inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  <span>Tạo bộ từ vựng đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customCourses.map(c => (
                  <div
                    key={c.id}
                    className="flex flex-col p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-xl transition-all relative group"
                  >
                    {/* Top Row: Icon + Publish Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-lg"
                        style={{ backgroundColor: getColorBg(c.color) }}
                      >
                        {c.template === 'english' ? 'EN' : c.template === 'generic' ? '📋' : 'Aa'}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => togglePublish(c.id, c.isPublished)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                            c.isPublished
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
                          }`}
                          title={c.isPublished ? 'Bấm để chuyển về Riêng tư' : 'Bấm để Xuất bản lên Khám phá'}
                        >
                          {c.isPublished ? <Globe size={13} /> : <Lock size={13} />}
                          <span>{c.isPublished ? 'Đã xuất bản' : 'Riêng tư'}</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1.5 line-clamp-1">
                      {c.title}
                    </h3>

                    {c.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {c.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-6 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded">
                        {c.template === 'english' ? '🇬🇧 Tiếng Anh' : c.template === 'generic' ? '🌐 Thuật ngữ' : '🇯🇵 Tiếng Nhật'}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded">
                        {c.words.length} từ vựng
                      </span>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => navigate(`/course/${c.id}`)}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <BookOpen size={14} /> Vào học
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingCourse(c); setIsEditorOpen(true); }}
                          className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                          title="Sửa từ vựng"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomCourse(c.id, c.title)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                          title="Xóa bộ từ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Quản Lý Khóa Học Toàn Diện */}
      <CourseManageModal
        isOpen={!!selectedCourseForManage}
        onClose={() => setSelectedCourseForManage(null)}
        courseId={selectedCourseForManage}
      />

      {/* Modal Tạo / Sửa Bộ Từ Vựng Cá Nhân */}
      <CourseEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setEditingCourse(null); }}
        onSave={handleSaveCourse}
        editingCourse={editingCourse}
      />
      {/* Auth Gate Component nếu kích hoạt */}
      <GateComponent />
    </div>
  );
}
