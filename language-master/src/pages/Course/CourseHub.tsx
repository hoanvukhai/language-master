import { useParams, Routes, Route, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCourseData } from '../../hooks/useCourseData';
import CoursePracticeHub from './CoursePracticeHub';
import CourseRaceHub from './CourseRaceHub';
import CourseSettings from './CourseSettings';
import CourseTheory from './CourseTheory';
import KeigoStudy from '../Practice/KeigoStudy';
import ConjugationStudy from '../Practice/ConjugationStudy';
import LearnCourseDetail from '../Learn/LearnCourseDetail';
import { PracticeProvider } from '../Practice/PracticeContext';
import OfflineGuard from '../../components/shared/OfflineGuard';
import { ArrowLeft, Gamepad2, Trophy, Settings, Sparkles, Flame, Plus, Book, FileText, Crown } from 'lucide-react';
import { useAuth } from '../../context/auth/useAuth';
import { useMyCourses } from '../../context/global/useMyCourses';
import { useDashboardStats } from './useDashboardStats';
import { CourseSettingsModal } from './components/CourseSettingsModal';
import { useState, useEffect } from 'react';
import MasteryIcon from '../../components/srs/MasteryIcon';
import { LeaderboardWidget } from '../../components/shared/LeaderboardWidget';
import { PersonalScoreWidget } from '../../components/shared/PersonalScoreWidget';
import { fetchStudyLeaderboard, type LeaderboardUser } from '../../lib/srs/firestoreSync';
import { useAuthGate } from '../../hooks/useAuthGate';

export default function CourseHub() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Leaderboard cho special courses
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { myCourseIds } = useMyCourses();
  const [searchParams] = useSearchParams();
  const selectedLesson = searchParams.get('lesson');
  const { executeWithGate, GateComponent } = useAuthGate();

  const { course, loading: courseLoading } = useCourseData(courseId);

  // Lấy data dashboard
  const { stats } = useDashboardStats(user?.uid, [course?.id || '']);
  const courseStat = stats[course?.id || ''];
  const learnedCount = courseStat?.progressPercent || 0;

  // Fetch race leaderboard cho các khóa học thường (không phải special)
  useEffect(() => {
    if (course && course.subject !== 'special') {
      setLoadingLeaderboard(true);
      fetchStudyLeaderboard(course.id).then(data => {
        setLeaderboard(data);
      }).catch(console.error).finally(() => setLoadingLeaderboard(false));
    }
  }, [course?.id, course?.subject]);
  let totalItems = course?.data?.length || 1;
  if (course?.subject === 'kanji_single') {
    totalItems = (course.data as any[]).length;
  } else if (course?.subject === 'kanji_words') {
    totalItems = (course.data as any[]).reduce((acc, k) => acc + (k.words?.length || 0), 0);
  }
  const percent = Math.min(100, Math.round((learnedCount / totalItems) * 100));

  if (courseLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Đang tải thông tin khóa học...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500">Không tìm thấy khóa học!</h2>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-slate-200 rounded-xl">Quay lại</button>
      </div>
    );
  }

  const isAdded = myCourseIds.includes(course.id);

  // Nếu đang ở màn hình phụ (theory, settings, practice, race) -> Render full màn hình
  const isSubRoute = location.pathname.replace(/\/$/, '').split('/').length > 3 && !location.pathname.endsWith('/learn');

  if (isSubRoute) {
    return (
      <PracticeProvider courseId={course.id} course={course}>
        <Routes>
          <Route path="theory" element={
            course.id === 'keigo-master' ? <KeigoStudy /> :
            course.id === 'verb-conjugation' ? <ConjugationStudy /> :
            <CourseTheory />
          } />
          <Route path="settings" element={<CourseSettings />} />
          <Route path="practice/*" element={<CoursePracticeHub />} />
          <Route
            path="race/*"
            element={
              <OfflineGuard featureName="Đua Top Nitro" backUrl={`/course/${course.id}`}>
                <CourseRaceHub />
              </OfflineGuard>
            }
          />
        </Routes>
      </PracticeProvider>
    );
  }

  return (
    <PracticeProvider courseId={course.id} course={course}>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 font-sans">
        {/* Chỉ hiển thị Header Khóa Học nếu CHƯA chọn bài học cụ thể */}
        {!selectedLesson && (
          <>
            {/* KHỐI CHÍNH: Tổng quan & Hành động */}
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
              
              {/* TOP ROW: Back, Badge, Icons */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4 w-full">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate(location.state?.from || (isAdded ? '/' : '/explore'))} className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg shrink-0">
                    <ArrowLeft size={16} />
                  </button>
                  <span className={`px-2 py-0.5 bg-${course.color}-100 text-${course.color}-600 rounded text-[10px] font-black uppercase tracking-wider`}>
                    {course.level} • {course.subject}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                  <Link to={`/study/dictionary?courseId=${course.id}`} state={{ from: location.state?.from }} className="p-2 md:p-2.5 text-blue-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/30 rounded-xl transition-all border border-slate-100 dark:border-slate-700" title="Từ điển">
                    <Book size={18} />
                  </Link>
                  <Link to="theory" state={{ from: location.state?.from }} className="p-2 md:p-2.5 text-emerald-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-900/30 rounded-xl transition-all border border-slate-100 dark:border-slate-700" title="Lý thuyết">
                    <FileText size={18} />
                  </Link>
                  <Link to="practice" state={{ from: location.state?.from }} className="p-2 md:p-2.5 text-violet-500 hover:text-violet-700 bg-slate-50 hover:bg-violet-100 dark:bg-slate-800 dark:hover:bg-violet-900/30 rounded-xl transition-all border border-slate-100 dark:border-slate-700" title="Luyện tập">
                    <Gamepad2 size={18} />
                  </Link>
                  <Link to="race" state={{ from: location.state?.from }} className="p-2 md:p-2.5 text-rose-500 hover:text-rose-700 bg-slate-50 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-900/30 rounded-xl transition-all border border-slate-100 dark:border-slate-700" title="Đấu trường">
                    <Trophy size={18} />
                  </Link>
                  {course.subject !== 'special' && isAdded && (
                    <>
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 md:p-2.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-100 dark:border-slate-700" 
                        title="Cài đặt khóa học"
                      >
                        <Settings size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Title & Start buttons */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex flex-wrap items-center gap-3">
                    {course.name}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{course.description}</p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {course.subject !== 'special' && isAdded && (
                    <>
                      {(courseStat?.dueCount || 0) > 0 && (
                        <button onClick={() => navigate(`/learn/session?courseId=${course.id}&mode=review`)} className="flex-1 md:flex-none px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2">
                          <Flame size={16} /> Ôn tập ({courseStat.dueCount})
                        </button>
                      )}
                      <button onClick={() => navigate(`/learn/session?courseId=${course.id}&mode=new`)} className={`flex-1 md:flex-none px-6 py-2.5 font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 ${(courseStat?.dueCount || 0) > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'}`}>
                        <Sparkles size={16} /> {learnedCount === 0 ? 'Bắt đầu học' : 'Học tiếp'}
                      </button>
                    </>
                  )}
                  {!isAdded && (
                    <button onClick={() => executeWithGate(() => navigate(`/learn/session?courseId=${course.id}&mode=new`), course.id)} className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                      <Plus size={18} /> Thêm vào Khóa Học
                    </button>
                  )}
                </div>
              </div>

              {course.subject !== 'special' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  {/* Vườn cây (Mastery Garden) */}
                  {isAdded && (
                    <div className="mb-4 flex flex-wrap items-center gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Vườn cây:</span>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        {/* Chưa học */}
                        <div className="flex items-center gap-2" title="Chưa học">
                          <MasteryIcon level="unlearned" size="sm" />
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {Math.max(0, totalItems - ((courseStat?.masteryCounts || []).reduce((a, b) => a + b, 0)))}
                          </span>
                        </div>
                        {[1, 2, 3, 4, 5, 6, 7].map((level) => (
                          <div key={level} className="flex items-center gap-2" title={`Level ${level}: ${(courseStat?.masteryCounts || [])[level] || 0} từ`}>
                            <MasteryIcon level={level} size="sm" />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {(courseStat?.masteryCounts || [])[level] || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>Tiến độ ({learnedCount}/{totalItems})</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {course.subject === 'special' ? (
          /* ── SPECIAL COURSES: Kính Ngữ, Chia Thể → Chưa hỗ trợ SRS ── */
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <Crown className="w-14 h-14 text-slate-300 dark:text-slate-600" />
            <h2 className="text-xl font-black text-slate-600 dark:text-slate-300">Chưa hỗ trợ học theo bài</h2>
            <p className="text-slate-400 dark:text-slate-500 max-w-sm text-sm">
              Khóa học này sử dụng hệ thống Luyện Tập và Đấu Trường riêng. Hãy dùng các nút bên trên.
            </p>
          </div>
        ) : (
          <>
            {!selectedLesson ? (
              /* Overview: Lesson grid (trái) + Widgets (phải) */
              <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] gap-6 pt-2 items-start">
                {/* LEFT: Lesson grid — chiếm phần còn lại (1fr) */}
                <div className="min-w-0">
                  <Routes>
                    <Route path="*" element={<LearnCourseDetail />} />
                  </Routes>
                </div>

                {/* RIGHT: PersonalScore + Leaderboard — Chiều rộng cố định */}
                <div className="space-y-4">
                  {user && (
                    <PersonalScoreWidget
                      title="Thành Tích Cá Nhân"
                      subtitle="Điểm Học Tập & Ôn Luyện"
                      icon={<Trophy size={20} />}
                      score={leaderboard.find(u => u.uid === user.uid)?.courseStudyScores?.[course.id] || 0}
                    />
                  )}
                  <LeaderboardWidget
                    title="Bảng Xếp Hạng"
                    subtitle="Điểm Học Tập của khóa"
                    icon={<Trophy className="w-5 h-5 text-amber-500" />}
                    leaderboard={leaderboard}
                    loading={loadingLeaderboard}
                    currentUserId={user?.uid}
                    getScore={(u) => u.courseStudyScores?.[course.id] || 0}
                    size="sm"
                  />
                </div>
              </div>
            ) : (
              /* Lesson detail: full width */
              <div className="pt-2">
                <Routes>
                  <Route path="*" element={<LearnCourseDetail />} />
                </Routes>
              </div>
            )}
          </>
        )}
      </div>

      <GateComponent />

      <CourseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        courseId={course?.id}
      />
    </PracticeProvider>
  );
}
