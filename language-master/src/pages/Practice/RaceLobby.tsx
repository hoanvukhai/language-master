// src/pages/Practice/RaceLobby.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth/useAuth';
import { useSettings } from '../../context/global/useSettings';
import { useAudio } from '../../context/audio/useAudio';
import { Trophy, ArrowLeft, Play, Clock, Heart, Zap, RotateCcw, Search, X, ArrowUp, ArrowDown } from 'lucide-react';
import { LeaderboardWidget } from '../../components/shared/LeaderboardWidget';
import confetti from 'canvas-confetti';
import { fetchRaceLeaderboard, type LeaderboardUser } from '../../lib/srs/firestoreSync';
import { usePracticeContext } from './PracticeContext';

export default function RaceLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { course } = usePracticeContext();
  const { language } = useSettings();
  const { playBgm, stopBgm } = useAudio();

  const queryParams = new URLSearchParams(location.search);
  const gameId = queryParams.get('game') || 'quiz';
  const subject = queryParams.get('subject') || 'vocab';
  const level = queryParams.get('level') || 'N3';
  const modeKey = `${level}_${subject}_${gameId}`;

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMistakes, setShowMistakes] = useState(false);

  const locState = location.state as any;
  const recentScore = locState?.recentScore;
  const historyList = locState?.historyList || [];
  const livesCount = locState?.livesCount || 0;
  const correctCount = locState?.correctCount || 0;
  const mistakesCount = historyList.filter((x: any) => !x.isCorrect && !x.isUnanswered).length;
  const maxStreak = locState?.maxStreak || 0;
  const totalQuestionsCount = locState?.totalQuestionsCount || 0;
  const unansweredCount = totalQuestionsCount > 0 ? Math.max(0, totalQuestionsCount - (correctCount + mistakesCount)) : 0;
  const raceResult = locState?.raceResult; // { expGained, isPersonalRecord, isServerRecord }

  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (Date.now() - mountTimeRef.current < 500) return; // Prevent accidental spam from previous screen
      if ((e.key === 'Enter' || e.key === ' ') && !showMistakes) {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameId, subject, level, showMistakes]);

  // Start Lobby BGM
  useEffect(() => {
    playBgm('lobby');
    return () => stopBgm();
  }, []);

  useEffect(() => {
    if (showMistakes) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMistakes]);

  useEffect(() => {
    loadBoard();
  }, [modeKey, user]);

  // Confetti Effect for finishing the game
  useEffect(() => {
    if (recentScore !== undefined && livesCount > 0) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        zIndex: 100,
      });
    }
  }, [recentScore, livesCount]);

  const loadBoard = async () => {
    setLoading(true);
    try {
      const data = await fetchRaceLeaderboard(modeKey);
      setLeaderboard(data);
    } catch (err) {
      console.error('Lobby leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };


  // Game Meta Data
  const gameMeta = useMemo(() => {
    switch (gameId) {
      case 'quiz': return { title: 'Đua Trắc Nghiệm', icon: '📝', color: 'amber', desc: '20 câu / 10s mỗi câu. 3 mạng.', perks: [<Clock size={14} />, <Heart size={14} />, <Zap size={14} />] };
      case 'matching': return { title: 'Đua Nối Từ', icon: '🔗', color: 'amber', desc: '4 vòng ghép cặp 6x6. 3 mạng.', perks: [<Clock size={14} />, <Heart size={14} />] };
      case 'typing': return { title: 'Đua Gõ Phím', icon: '⌨️', color: 'amber', desc: '15 câu gõ nhanh. 3 mạng.', perks: [<Clock size={14} />, <Heart size={14} />, <Zap size={14} />] };
      case 'truefalse': return { title: 'Đua Phản Xạ', icon: '⚡', color: 'amber', desc: '20 câu đếm ngược 7s siêu tốc.', perks: [<Clock size={14} />, <Heart size={14} />, <Zap size={14} />] };
      default: return { title: 'Đua', icon: '🏆', color: 'amber', desc: '', perks: [] };
    }
  }, [gameId]);

  const subjectMeta = useMemo(() => {
    switch (subject) {
      case 'vocab': return 'Từ Vựng';
      case 'kanji': return 'Chữ Hán';
      case 'hanjt': return 'Hán Tự';
      case 'grammar': return 'Ngữ Pháp';
      default: return 'Tổng Hợp';
    }
  }, [subject]);

  // Current User Scored Item
  const currentUserItem = useMemo(() => {
    if (!user) return null;
    const item = leaderboard.find(u => u.uid === user.uid);
    if (!item) return null;
    const rank = leaderboard.findIndex(u => u.uid === user.uid) + 1;
    return { ...item, rankPosition: rank };
  }, [user, leaderboard]);


  const userScore = currentUserItem?.raceScores?.[modeKey] || 0;
  const prevBest = locState?.prevHighScore !== undefined ? locState.prevHighScore : userScore;

  const handleStart = () => {
    const startId = Date.now().toString();
    navigate(`/course/${course.id}/race/play?game=${gameId}`, { state: { fromLobby: true, startId, prevHighScore: userScore } });
  };

  const getColorClass = (type: 'bg' | 'text' | 'border') => {
    switch (gameMeta.color) {
      case 'amber': return type === 'bg' ? 'bg-amber-500' : type === 'text' ? 'text-amber-500' : 'border-amber-500';
      case 'indigo': return type === 'bg' ? 'bg-indigo-600' : type === 'text' ? 'text-indigo-600' : 'border-indigo-600';
      case 'emerald': return type === 'bg' ? 'bg-emerald-600' : type === 'text' ? 'text-emerald-600' : 'border-emerald-600';
      case 'rose': return type === 'bg' ? 'bg-rose-600' : type === 'text' ? 'text-rose-600' : 'border-rose-600';
      default: return type === 'bg' ? 'bg-indigo-600' : type === 'text' ? 'text-indigo-600' : 'border-indigo-600';
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-white font-sans transition-colors pb-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/course/${course.id}/race`)}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <span className={getColorClass('text')}>{gameMeta.icon} {gameMeta.title}</span>
            </h1>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
              Chủ đề: <span className="text-indigo-600 dark:text-indigo-400">{subjectMeta}</span> — Trình độ: <span className="text-amber-500">{level}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* LOBBY LEFT COLUMN (Play Button & Personal Stats) */}
          <div className="md:col-span-2 space-y-6">
            <div className={`bg-white dark:bg-slate-800 rounded-3xl p-6 border-b-4 shadow-xl text-center space-y-6 ${getColorClass('border')}`}>
              <div className="text-6xl animate-bounce mt-4">
                {gameMeta.icon}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {gameMeta.desc}
              </p>

              <button
                onClick={handleStart}
                className={`relative w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all ${getColorClass('bg')}`}
              >
                <span className="absolute top-0 left-3 text-[7px] font-bold opacity-60">[Enter / Space]</span>
                {recentScore !== undefined ? <RotateCcw size={20} /> : <Play className="fill-white" size={20} />}
                {recentScore !== undefined ? 'ĐUA LẠI' : 'BẮT ĐẦU ĐUA'}
              </button>

              <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-amber-500 w-5 h-5" />
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Kỷ Lục Cá Nhân</span>
                  </div>
                  {user ? (
                    <span className={`text-2xl font-black ${getColorClass('text')}`}>{userScore}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Chưa Đăng Nhập</span>
                  )}
                </div>
              </div>

            </div>

            {/* RECENT RESULT BLOCK */}
            {recentScore !== undefined && (
              <div 
                onClick={() => setShowMistakes(true)}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 shadow-lg text-white space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 cursor-pointer hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-95 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Kết quả vừa rồi</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-4xl font-black">{recentScore}</p>
                      <div className={`flex items-center gap-1 text-sm font-black px-2.5 py-1 rounded-full shadow-sm ${recentScore > prevBest ? 'bg-emerald-500 text-white animate-bounce' : recentScore < prevBest ? 'bg-rose-500 text-white' : 'bg-slate-500 text-white'}`}>
                        {recentScore > prevBest ? (
                          <>
                            <ArrowUp size={16} strokeWidth={3} />
                            +{recentScore - prevBest} (KỶ LỤC MỚI)
                          </>
                        ) : recentScore < prevBest ? (
                          <>
                            <ArrowDown size={16} strokeWidth={3} />
                            {recentScore - prevBest}
                          </>
                        ) : (
                          <>= Kỷ lục cũ</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-indigo-100">
                  <span className="bg-white/10 px-2 py-1 rounded-lg">✅ {correctCount} ĐÚNG</span>
                  <span className="bg-white/10 px-2 py-1 rounded-lg">❌ {mistakesCount} SAI</span>
                  <span className="bg-white/10 px-2 py-1 rounded-lg">❤️ {livesCount} MẠNG</span>
                  {unansweredCount > 0 && <span className="bg-white/10 px-2 py-1 rounded-lg opacity-80">👻 {unansweredCount} CHƯA LÀM</span>}
                  {maxStreak > 1 && <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-lg">🔥 CHUỖI {maxStreak}</span>}
                </div>

                {raceResult && (
                  <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-white/20">
                    {raceResult.expGained > 0 ? (
                      <div className="flex items-center gap-2 text-yellow-300 font-black">
                        <span>✨ +{raceResult.expGained} EXP</span>
                        {raceResult.isServerRecord && <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded text-[10px] uppercase">Kỷ lục Server (+500)</span>}
                        {raceResult.isPersonalRecord && !raceResult.isServerRecord && <span className="bg-emerald-400 text-emerald-900 px-2 py-0.5 rounded text-[10px] uppercase">Kỷ lục cá nhân (+300)</span>}
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-white/70">
                        Đã đạt giới hạn đua hôm nay (Không cộng EXP)
                      </div>
                    )}
                  </div>
                )}

                {!user && (
                  <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-white/20">
                    <div className="p-3 bg-rose-500/30 border border-rose-400/50 rounded-xl text-center">
                      <p className="text-sm font-bold text-white mb-2">Bạn đang chơi với tư cách Khách</p>
                      <button onClick={(e) => { e.stopPropagation(); navigate('/login'); }} className="px-4 py-2 bg-white text-rose-600 hover:bg-rose-50 font-bold rounded-lg text-xs transition-colors w-full shadow-sm">Đăng nhập để lưu điểm & nhận EXP</button>
                    </div>
                  </div>
                )}

                {historyList.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMistakes(true); }}
                    className="w-full py-2.5 bg-white/20 group-hover:bg-white/30 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Search size={16} /> Xem Lịch Sử Đấu
                  </button>
                )}
              </div>
            )}


          </div>

          {/* LOBBY RIGHT COLUMN (Specific Leaderboard) */}
          <div className="md:col-span-3">
            <LeaderboardWidget 
              title="Top 10 Chế Độ Này"
              icon={<Trophy className="w-6 h-6 text-amber-500" />}
              leaderboard={leaderboard}
              loading={loading}
              currentUserId={user?.uid}
              getScore={(u) => u.raceScores?.[modeKey] || 0}
              size="md"
            />
          </div>
        </div>
      </div>

      {/* MISTAKES MODAL */}
      {showMistakes && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMistakes(false); }}
        >
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-indigo-600 flex justify-between items-center text-white">
              <h3 className="font-black text-xl flex items-center gap-2"><Search size={24}/> Lịch Sử Đấu</h3>
              <button onClick={() => setShowMistakes(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50 dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 items-start content-start">
              {historyList.map((item: any, i: number) => {
                const m = item.q;
                const isOk = item.isCorrect;
                const isUnanswered = item.isUnanswered;
                // Use sourceItem to accurately display the full dictionary entry
                const src = m.sourceItem || {};
                let word = '';
                let read = '';
                let mean: any = '';

                if (src.character) { // Kanji (Hanjt)
                  word = src.character;
                  read = (src.onyomi ? src.onyomi + ' ' : '') + (src.kunyomi || '');
                  mean = `[${src.hanViet || ''}] ${src.vietnamese || ''}`;
                } else if (src.structure) { // Grammar
                  word = src.structure;
                  mean = src.meaning || '';
                } else if (src.kanji !== undefined || src.word !== undefined) { // Vocab or KanjiWord
                  word = src.kanji || src.word || src.hiragana || '';
                  read = src.hiragana || '';
                  mean = src.meaning || '';
                  if (src.hanVietWord) { // Hanjt Word
                    let originalMean = typeof mean === 'object' && mean !== null ? (mean[language] || mean.vi || mean.en || '') : mean;
                    mean = `[${src.hanVietWord}] ${originalMean}`;
                  }
                } else {
                  // Fallback
                  const isKanji = m.character;
                  word = m.kanji || m.prompt || m.word || m.structure || (isKanji ? m.character : '');
                  read = m.hiragana || (isKanji ? m.onyomi + ' ' + m.kunyomi : m.subPrompt || '');
                  mean = m.meaning || (m.options ? m.correctAnswer : '');
                  if (!mean && m.vietnamese) mean = m.vietnamese;
                }

                if (typeof mean === 'object' && mean !== null) {
                  mean = mean[language] || mean.vi || mean.en || JSON.stringify(mean);
                }

                return (
                  <div key={i} className={`p-5 h-full rounded-2xl border-2 shadow-sm flex flex-col ${isOk ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : isUnanswered ? 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-80' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-2xl font-black text-slate-800 dark:text-white">{word}</p>
                      <span className="text-2xl">{isOk ? '✅' : isUnanswered ? '⏭️' : '❌'}</span>
                    </div>
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">{read}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{mean}</p>

                    {m.optionsData && m.optionsData.length > 0 ? (
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Các đáp án trong câu hỏi</p>
                        <div className="grid grid-cols-2 gap-2">
                          {m.optionsData.map((opt: any, idx: number) => {
                            const isCorrectOpt =
                              opt.meaning === m.correctAnswer ||
                              opt.kanji === m.correctAnswer ||
                              opt.hiragana === m.correctAnswer ||
                              (opt.kanji || opt.hiragana) === m.correctAnswer;

                            return (
                              <div key={idx} className={`p-2.5 rounded-xl text-xs border shadow-sm ${isCorrectOpt ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-black text-sm ${isCorrectOpt ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.kanji || opt.hiragana}</span>
                                  {isCorrectOpt && <span className="text-xs">✅</span>}
                                </div>
                                {opt.kanji && <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-1">{opt.hiragana}</div>}
                                <div className={`font-medium ${isCorrectOpt ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {typeof opt.meaning === 'object' && opt.meaning !== null 
                                    ? (opt.meaning[language] || opt.meaning.vi || opt.meaning.en || JSON.stringify(opt.meaning)) 
                                    : opt.meaning}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      m.options && m.options.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-slate-500 flex flex-wrap gap-2">
                          {m.options.map((opt: string, idx: number) => (
                            <span key={idx} className={`px-2 py-1 rounded-lg border ${opt === m.correctAnswer ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                              {opt}
                            </span>
                          ))}
                        </div>
                      )
                    )}
                    {!m.options && m.correctAnswer && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        ✅ Đáp án đúng: {m.correctAnswer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setShowMistakes(false)} className="w-full py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-black text-lg rounded-xl transition-colors">
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
