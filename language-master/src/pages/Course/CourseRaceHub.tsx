import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth/useAuth';
import { CheckSquare, GitMerge, Keyboard, Zap, ArrowLeft, Trophy, Flame, Crown, Activity } from 'lucide-react';
import { fetchRaceLeaderboard, type LeaderboardUser } from '../../lib/srs/firestoreSync';

import RaceLobby from '../Practice/RaceLobby';
import { LeaderboardWidget } from '../../components/shared/LeaderboardWidget';
import { PersonalScoreWidget } from '../../components/shared/PersonalScoreWidget';
import RaceArena from '../Practice/RaceArena';
import { usePracticeContext } from '../Practice/PracticeContext';

export default function CourseRaceHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { course } = usePracticeContext();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500">Không tìm thấy khóa học!</h2>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-slate-200 rounded-xl">Quay lại</button>
      </div>
    );
  }

  // Dashboard View (if not in lobby or play)
  const isDashboard = location.pathname.endsWith('/race') || location.pathname.endsWith('/race/');

  useEffect(() => {
    if (course && isDashboard && course.id !== 'keigo-master' && course.id !== 'verb-conjugation') {
      loadBoard();
    }
  }, [course?.id, user, location.pathname]);

  // If this is a Keigo or Conjugation course, Race mode is not yet available at all
  if (course.id === 'keigo-master' || course.id === 'verb-conjugation') {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans flex flex-col items-center justify-center min-h-[60vh] text-center">
        {course.id === 'keigo-master' ? (
          <Crown className="w-24 h-24 text-slate-300 dark:text-slate-600 mb-6" />
        ) : (
          <Activity className="w-24 h-24 text-slate-300 dark:text-slate-600 mb-6" />
        )}
        <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-4">
          Đua Top: {course.name}
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-lg mb-8">
          Tính năng đua top và xếp hạng dành riêng cho {course.id === 'keigo-master' ? 'Kính Ngữ' : 'Chia Thể'} đang được phát triển. Vui lòng quay lại sau!
        </p>
        <button onClick={() => navigate(`/course/${course.id}`, { state: { from: location.state?.from } })} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex items-center gap-2 transition-all">
          <ArrowLeft size={20} /> Quay lại Khóa học
        </button>
      </div>
    );
  }

  const loadBoard = async () => {
    if (!course) return;
    setLoadingLeaderboard(true);
    try {
      // Pass courseId to get the Total Course Score leaderboard
      const data = await fetchRaceLeaderboard(course.id);
      setLeaderboard(data);
    } catch (err) {
      console.error('Lobby leaderboard error:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const modes = [
    {
      id: 'quiz', name: 'Đua Trắc Nghiệm', game: 'quiz', icon: CheckSquare,
      desc: '20 câu / 10s mỗi câu. 3 mạng.', color: 'text-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-900/30', border: 'hover:border-amber-500',
    },
    {
      id: 'matching', name: 'Đua Nối Từ', game: 'matching', icon: GitMerge,
      desc: '4 vòng ghép cặp 6x6. 3 mạng.', color: 'text-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-900/30', border: 'hover:border-amber-500',
    },
    {
      id: 'typing', name: 'Đua Gõ Phím', game: 'typing', icon: Keyboard,
      desc: '15 câu gõ nhanh. 3 mạng.', color: 'text-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-900/30', border: 'hover:border-amber-500',
      hiddenFor: ['grammar']
    },
    {
      id: 'truefalse', name: 'Đua Phản Xạ', game: 'truefalse', icon: Zap,
      desc: '20 câu đếm ngược 7s siêu tốc.', color: 'text-amber-500', bgLight: 'bg-amber-100 dark:bg-amber-900/30', border: 'hover:border-amber-500',
    }
  ];

  const filteredModes = modes.filter(m => {
    if (m.hiddenFor && m.hiddenFor.includes(course.subject)) return false;
    return true;
  });

  const currentUserItem = user ? leaderboard.find(u => u.uid === user?.uid) : null;
  const userScore = currentUserItem?.courseRaceScores?.[course.id] || 0;

  return (
    <>
      {isDashboard ? (
        <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate(`/course/${course.id}`, { state: { from: location.state?.from } })}
              className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Flame className="text-amber-500 w-8 h-8" />
                Đua Top: {course.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
                Chọn chế độ Đua để thử thách phản xạ và đua top trên bảng xếp hạng.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LOBBY LEFT COLUMN (Games) */}
            <div className="lg:col-span-2 space-y-10">
              {filteredModes.length > 0 && (
                <section>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredModes.map(mod => (
                      <Link
                        key={mod.id}
                        to={`lobby?game=${mod.game}`}
                        className={`group flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 ${mod.border} hover:shadow-lg active:scale-[0.98] transition-all`}
                      >
                        <div className={`p-3 rounded-xl ${mod.bgLight} ${mod.color} group-hover:scale-110 transition-transform shrink-0`}>
                          <mod.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white">{mod.name}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{mod.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* LOBBY RIGHT COLUMN (Course Leaderboard) */}
            <div className="lg:col-span-1 space-y-4">
              {/* Kỷ lục cá nhân (Personal Record) */}
              {user && (
                <PersonalScoreWidget
                  title="Thành Tích Cá Nhân"
                  subtitle="Tổng điểm Đua Top"
                  icon={<Trophy size={20} />}
                  score={userScore}
                />
              )}

              {/* Bảng Xếp Hạng Tổng Khóa Học */}
              <LeaderboardWidget 
                title="Bảng Xếp Hạng"
                subtitle="Điểm tổng từ các chế độ Đua"
                icon={<Trophy className="w-5 h-5 text-amber-500" />}
                leaderboard={leaderboard}
                loading={loadingLeaderboard}
                currentUserId={user?.uid}
                getScore={(u) => u.courseRaceScores?.[course.id] || 0}
                size="sm"
              />
            </div>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="lobby" element={<RaceLobby />} />
          <Route path="play" element={<RaceArena />} />
        </Routes>
      )}
    </>
  );
}
