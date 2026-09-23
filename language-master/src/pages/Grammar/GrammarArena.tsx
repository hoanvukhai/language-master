// src/pages/Grammar/GrammarArena.tsx
// ⚔️ Bẫy đối kháng — Chế độ TIMED: 8 giây/câu, chỉ dùng confusedWith distractors
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Timer, Flame, Zap, Trophy, XCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { grammarN3Clean as grammarN3, getN3GrammarLessons } from '../../data/jlpt/n3/grammarN3';
import { useSettings } from '../../context/global/useSettings';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const TIME_PER_Q = 8; // giây mỗi câu

interface ArenaItem {
  id: string;
  structure: string;
  meaning: string;
  correctAnswer: string;
  distractors: string[];       // từ confusedWith (đúng nghĩa JLPT)
  lesson: string;
  group: string;
}

export default function GrammarArena() {
  const { language } = useSettings();
  const lessons = getN3GrammarLessons();
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [direction, setDirection] = useState<'structure-meaning' | 'meaning-structure'>('structure-meaning');
  const [started, setStarted] = useState(false);

  // Chỉ lấy các mẫu có distractors từ cùng nhóm
  const pool = useMemo<ArenaItem[]>(() => {
    const base = selectedLesson === 'all'
      ? grammarN3
      : grammarN3.filter(g => g.lesson === selectedLesson);

    return shuffle(
      base
        .map(g => {
          const correctAnswer = direction === 'structure-meaning'
            ? (g.meaning[language as 'vi' | 'en'] || g.meaning.vi)
            : g.structure;

          const distractors: string[] = [];
          
          // Lấy từ cùng nhóm
          grammarN3
            .filter(other => other.group === g.group && other.id !== g.id)
            .forEach(other => {
              const d = direction === 'structure-meaning'
                ? (other.meaning[language as 'vi' | 'en'] || other.meaning.vi)
                : other.structure;
              if (!distractors.includes(d) && d !== correctAnswer) {
                distractors.push(d);
              }
            });

          // Nếu không đủ 3 nhiễu, lấy thêm từ toàn bộ data
          if (distractors.length < 3) {
            grammarN3.forEach(other => {
              if (distractors.length >= 3) return;
              if (other.id !== g.id) {
                const d = direction === 'structure-meaning'
                  ? (other.meaning[language as 'vi' | 'en'] || other.meaning.vi)
                  : other.structure;
                if (!distractors.includes(d) && d !== correctAnswer) {
                  distractors.push(d);
                }
              }
            });
          }

          return {
            id: g.id,
            structure: g.structure,
            meaning: g.meaning[language as 'vi' | 'en'] || g.meaning.vi,
            correctAnswer,
            distractors: shuffle(distractors).slice(0, 3),
            lesson: g.lesson,
            group: g.group,
          };
        })
    );
  }, [selectedLesson, direction, language]);

  // Game state
  const [queue, setQueue] = useState<ArenaItem[]>([]);
  const [score, setScore] = useState(0);
  const [showFurigana, setShowFurigana] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = queue[0];
  const options = useMemo(() => {
    if (!current) return [];
    return shuffle([current.correctAnswer, ...current.distractors]).slice(0, 4);
  }, [current]);

  // Timer
  useEffect(() => {
    if (!started || !current || showResult || selectedAnswer !== null) return;
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimedOut(true);
          setShowResult(true);
          setStreak(0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current?.id, started, showResult, selectedAnswer]);

  const handleAnswer = (ans: string) => {
    if (selectedAnswer !== null || timedOut) return;
    clearInterval(timerRef.current!);
    setSelectedAnswer(ans);
    const isCorrect = ans === current.correctAnswer;
    if (isCorrect) {
      setScore(s => s + 1);
      setStreak(s => {
        const next = s + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    setShowResult(true);
  };

  const handleNext = () => {
    setQueue(q => q.slice(1));
    setSelectedAnswer(null);
    setTimedOut(false);
    setShowResult(false);
    setTimeLeft(TIME_PER_Q);
  };

  useEffect(() => { if (started) window.scrollTo(0, 0); }, [started]);

  const handleStart = () => {
    setQueue(pool);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSelectedAnswer(null);
    setTimedOut(false);
    setShowResult(false);
    setTimeLeft(TIME_PER_Q);
    setStarted(true);
  };

  // ── Setup screen ──
  if (!started) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to="/course/n3-grammar-core/practice" className="inline-flex items-center gap-2 text-slate-500 hover:text-red-500 mb-8 transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⚔️</span>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">Bẫy đối kháng</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Đáp án nhiễu là các mẫu thường bị nhầm lẫn nhất. Trả lời trong <strong className="text-red-500">8 giây</strong> — tự fail nếu hết giờ!
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: '⏱️', label: '8 giây/câu', sub: 'Tự fail hết giờ' },
                { icon: '🔥', label: 'Streak', sub: 'Đúng liên tiếp' },
                { icon: '🎯', label: 'Cùng nhóm', sub: 'Bẫy cực khó' },
              ].map(f => (
                <div key={f.label} className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-100 dark:border-red-900/40">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="text-xs font-bold text-red-600 dark:text-red-400">{f.label}</div>
                  <div className="text-[10px] text-slate-400">{f.sub}</div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">📚 Phạm vi ôn tập</label>
              <select
                value={selectedLesson}
                onChange={e => setSelectedLesson(e.target.value)}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none focus:border-red-500 transition-colors cursor-pointer"
              >
                <option value="all">Tất cả ({pool.length} câu có bẫy)</option>
                {lessons.map(l => {
                  const cnt = pool.filter(p => p.lesson === l).length;
                  return cnt > 0 ? <option key={l} value={l}>{l} ({cnt} câu)</option> : null;
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">🎛️ Hướng kiểm tra</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { val: 'structure-meaning' as const, label: 'Cấu trúc → Nghĩa' },
                  { val: 'meaning-structure' as const, label: 'Nghĩa → Cấu trúc' },
                ]).map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setDirection(opt.val)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      direction === opt.val
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={pool.length === 0}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Zap size={18} /> Bắt đầu ({pool.length} câu)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── End screen ──
  if (queue.length === 0) {
    const total = pool.length;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-xl max-w-sm w-full text-center"
        >
          <div className="text-6xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '⚔️' : '💀'}</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-1">Kết thúc Arena!</h2>

          <div className="grid grid-cols-3 gap-3 my-6">
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
              <div className="text-2xl font-black text-red-600 dark:text-red-400">{score}</div>
              <div className="text-xs text-slate-400">Đúng / {total}</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-3">
              <div className="text-2xl font-black text-orange-500">{bestStreak}</div>
              <div className="text-xs text-slate-400">Streak cao</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
              <div className="text-2xl font-black text-blue-500">{pct}%</div>
              <div className="text-xs text-slate-400">Chính xác</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Chơi lại
            </button>
            <Link to="/course/n3-grammar-core/practice" className="block w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-red-400 transition-all text-center">
              Về dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((pool.length - queue.length) / pool.length) * 100;
  const timerPct = (timeLeft / TIME_PER_Q) * 100;
  const isCorrect = selectedAnswer === current.correctAnswer;
  const question = direction === 'structure-meaning' ? current.structure : current.meaning;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors font-medium">
            <ArrowLeft size={18} /> Thoát
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFurigana(v => !v)}
              title={showFurigana ? 'Tắt Furigana' : 'Bật Furigana'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 text-xs font-bold transition-all ${
                showFurigana
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-teal-300'
              }`}
            >
              {showFurigana ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>Kana</span>
            </button>
            <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
              <Flame size={16} />
              <span>{streak}</span>
            </div>
            <div className="text-sm font-bold text-red-600 dark:text-red-400">{score} đúng</div>
            <div className="text-sm text-slate-400">{pool.length - queue.length + 1}/{pool.length}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Timer bar */}
        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full mb-6 overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-colors ${
              timerPct > 50 ? 'bg-green-500' : timerPct > 25 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Question */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-7 shadow-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-1 rounded-full font-bold">
                  ⚔️ {current.group}
                </span>
                <div className="flex items-center gap-1 text-slate-400 text-xs ml-auto">
                  <Timer size={12} />
                  <span className={`font-bold ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : ''}`}>{timeLeft}s</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-800 dark:text-white leading-snug mb-1">{question}</div>
                {direction === 'structure-meaning' && showFurigana && (() => {
                  const found = grammarN3.find(g => g.id === current.id);
                  return found && found.structureKana !== found.structure ? (
                    <div className="text-sm font-medium text-teal-600 dark:text-teal-400 mb-1">
                      {found.structureKana}
                    </div>
                  ) : null;
                })()}
                <div className="text-xs text-slate-400">{direction === 'structure-meaning' ? '→ Chọn nghĩa đúng' : '→ Chọn cấu trúc đúng'}</div>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {options.map(opt => {
                let cls = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-red-400 hover:shadow-md active:scale-[0.98]';
                if (showResult || timedOut) {
                  if (opt === current.correctAnswer) {
                    cls = 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300';
                  } else if (opt === selectedAnswer) {
                    cls = 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300';
                  } else {
                    cls = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60';
                  }
                }

                const optionKana = direction === 'meaning-structure' && (() => {
                  const found = grammarN3.find(g => g.structure === opt);
                  return found && found.structureKana !== opt ? found.structureKana : null;
                })();

                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={showResult || timedOut}
                    className={`w-full p-4 rounded-2xl border-2 font-semibold text-sm text-left transition-all ${cls}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        {(showResult || timedOut) && opt === current.correctAnswer && <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />}
                        {showResult && opt === selectedAnswer && opt !== current.correctAnswer && <XCircle size={16} className="text-red-500 flex-shrink-0" />}
                        <span>{opt}</span>
                      </div>
                      {showFurigana && optionKana && (
                        <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                          {optionKana}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Result feedback */}
            <AnimatePresence>
              {(showResult || timedOut) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={`rounded-2xl p-4 text-center mb-3 ${
                    timedOut ? 'bg-slate-100 dark:bg-slate-700'
                    : isCorrect
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="text-2xl mb-1">
                      {timedOut ? '⏰' : isCorrect ? (streak > 2 ? '🔥' : '✅') : '❌'}
                    </div>
                    <div className={`text-sm font-bold ${
                      timedOut ? 'text-slate-600 dark:text-slate-300'
                      : isCorrect ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                    }`}>
                      {timedOut ? 'Hết giờ!' : isCorrect
                        ? (streak > 1 ? `🔥 ${streak} đúng liên tiếp!` : 'Chính xác!')
                        : `Sai rồi — đáp án đúng: ${current.correctAnswer}`}
                    </div>
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
                  >
                    Câu tiếp theo →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Stats footer */}
        <div className="flex justify-center gap-6 mt-6 text-sm">
          <span className="flex items-center gap-1 text-red-500"><Trophy size={14} /> {score} đúng</span>
          <span className="flex items-center gap-1 text-orange-500"><Flame size={14} /> streak: {streak}</span>
        </div>

      </div>
    </div>
  );
}
