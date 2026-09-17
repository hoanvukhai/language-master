import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCourses } from '../../data/courses/registry';
import { useMyCourses } from '../../context/global/useMyCourses';
import { Library, Flame, Loader2, Sparkles, Trophy, BadgeCheck, MoreVertical, HardDrive } from 'lucide-react';
import { useAuth } from '../../context/auth/useAuth';
import { useDashboardStats } from './useDashboardStats';
import { CourseManageModal } from '../../components/course/CourseManageModal';
import { getAllOfflineMeta } from '../../lib/offline/offlineStorage';

export default function MyCourses() {
  const { myCourseIds } = useMyCourses();
  const { user } = useAuth();
  const courses = getAllCourses();
  const navigate = useNavigate();
  const [selectedCourseForManage, setSelectedCourseForManage] = useState<string | null>(null);
  const [offlineCourseIds, setOfflineCourseIds] = useState<Set<string>>(new Set());

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

  const myCourses = courses.filter(c => myCourseIds.includes(c.id));

  // Lấy data dashboard thực tế cho user hiện tại và các khóa đã add
  const { stats, loading } = useDashboardStats(user?.uid, myCourseIds);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-3">
            <Library className="text-indigo-500" size={32} />
            Khóa Học Của Tôi
          </h1>
          <p className="text-slate-500">
            {user ? `Chào mừng trở lại, ${user.displayName || user.email?.split('@')[0]}!` : 'Hãy đăng nhập để đồng bộ tiến độ học tập của bạn trên mọi thiết bị.'}
          </p>
        </div>

        {/* My Courses Grid */}
        <div>
          {myCourses.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Library size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bạn chưa có khóa học nào</h2>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">Hãy sang trang Khám phá để tìm và thêm các khóa học phù hợp với trình độ của bạn nhé.</p>
              <button
                onClick={() => navigate('/explore')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                Khám phá ngay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCourses.map(c => {
                const courseStat = stats[c.id];
                // progressPercent hook đang tạm trả về số lượng item đã học
                // Cần tính %: learnedCount / totalItems
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
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-lg`} style={{ backgroundColor: c.color === 'emerald' ? '#10b981' : c.color === 'orange' ? '#f97316' : c.color === 'blue' ? '#3b82f6' : c.color === 'violet' ? '#8b5cf6' : c.color === 'fuchsia' ? '#d946ef' : c.color === 'sky' ? '#0284c7' : '#6366f1' }}>
                        {c.template === 'english' ? 'EN' : c.subject === 'vocab' ? 'Aa' : (c.subject === 'kanji_single' || c.subject === 'kanji_words') ? '漢' : c.subject === 'grammar' ? '📝' : '🌟'}
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
                            Top: {courseStat?.highScore}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourseForManage(c.id);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Tùy chọn & Quản lý khóa học"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors mb-1">{c.name}</h2>

                    {/* Author line */}
                    {c.author && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                        <span>Tác giả:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{c.author.name}</span>
                        {c.author.isOfficial && (
                          <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-bold text-[11px] bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.2 rounded-md border border-blue-200 dark:border-blue-800/40" title="Khóa học chính thức từ hệ thống">
                            <BadgeCheck size={13} className="fill-blue-500 text-white dark:text-slate-900" />
                            <span>Chính thức</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                        c.template === 'english'
                          ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                          : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                      }`}>
                        {c.template === 'english' ? '🇬🇧 Tiếng Anh' : '🇯🇵 Tiếng Nhật'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded">
                        {c.level}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded">
                        {c.subject.toUpperCase()}
                      </span>
                    </div>

                    {/* Dashboard Stats / Special Placeholder */}
                    {c.subject === 'special' ? (
                      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-col justify-end">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                          Khóa học đặc biệt: Học qua việc xem lý thuyết và rèn luyện kỹ năng qua phần Luyện tập.
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/course/${c.id}`, { state: { from: '/' } }); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 w-full"
                        >
                          Vào khóa học
                        </button>
                      </div>
                    ) : (
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Quản Lý Khóa Học Toàn Diện */}
      <CourseManageModal
        isOpen={!!selectedCourseForManage}
        onClose={() => setSelectedCourseForManage(null)}
        courseId={selectedCourseForManage}
      />
    </div>
  );
}

