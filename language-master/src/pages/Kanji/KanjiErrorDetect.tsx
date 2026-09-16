import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Eye, EyeOff, Shuffle, MousePointerClick, ShieldAlert } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';
import type { Kanji } from '../../types';
import KanjiLessonChips from '../../components/kanji/KanjiLessonChips';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface ErrorItem {
  id: string;
  isCorrect: boolean;
  word: string;        // Chữ Kanji hoặc Từ ghép
  hiragana?: string;
  displayedMeaning: string; // Nghĩa hoặc Hán Việt đang hiển thị
  actualMeaning: string;    // Nghĩa thật
  wrongMeaningSourceWord?: string; // Nếu sai thì lấy nghĩa của từ nào
  lesson: string;
}

type GameMode = 'truefalse' | 'pickwrong';

export default function KanjiErrorDetect() {
  const { course } = usePracticeContext();
  const data = course.data as Kanji[];
  const lessons = Array.from(new Set(data.map(k => k.lesson))).filter(Boolean) as string[];
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('truefalse');
  const [mode, setMode] = useState<'kanji-hanviet' | 'word-meaning'>('kanji-hanviet');
  // Chế độ data cho KanjiErrorDetect: word-meaning (Từ ghép - nghĩa) hoặc kanji-hanviet (Kanji - Hán Việt)
  
  const pool = useMemo<ErrorItem[]>(() => {
    let base = selectedLessons.length > 0
      ? data.filter(w => selectedLessons.includes(w.lesson || ''))
      : data;

    if (base.length === 0) return [];

    if (mode === 'kanji-hanviet') {
      const items: ErrorItem[] = [];
      const mixed: { char: string, hv: string, id: string, lesson: string }[] = [];
      base.forEach(k => {
        mixed.push({ char: k.character, hv: k.hanViet, id: k.id, lesson: k.lesson || '' });
        if (k.words) {
          k.words.filter(w => w.hanVietWord).forEach((w, idx) => {
            mixed.push({ char: w.word, hv: w.hanVietWord as string, id: `${k.id}_whv_${idx}`, lesson: k.lesson || '' });
          });
        }
      });

      mixed.forEach(k => {
        const isCorrect = Math.random() > 0.5;
        let displayedMeaning = k.hv;
        let wrongMeaningSourceWord = undefined;

        if (!isCorrect) {
          const others = mixed.filter(ow => ow.id !== k.id);
          if (others.length > 0) {
            const rand = others[Math.floor(Math.random() * others.length)];
            displayedMeaning = rand.hv;
            wrongMeaningSourceWord = rand.char;
          }
        }

        items.push({
          id: k.id,
          isCorrect,
          word: k.char,
          hiragana: undefined,
          displayedMeaning,
          actualMeaning: k.hv,
          wrongMeaningSourceWord,
          lesson: k.lesson,
        });
      });
      return shuffle(items);
    } else {
      const words: any[] = [];
      base.forEach(k => {
        k.words.forEach((w, idx) => {
          words.push({
            id: `${k.id}_w_${idx}`,
            word: w.word,
            hiragana: w.hiragana,
            meaning: typeof w.meaning === 'object' ? w.meaning.vi : w.meaning,
            lesson: k.lesson
          });
        });
      });

      if (words.length < 4) return [];

      const items: ErrorItem[] = [];
      words.forEach(w => {
        const isCorrect = Math.random() > 0.5;
        let displayedMeaning = w.meaning;
        let wrongMeaningSourceWord = undefined;

        if (!isCorrect) {
          const others = words.filter(ow => ow.id !== w.id);
          if (others.length > 0) {
            const rand = others[Math.floor(Math.random() * others.length)];
            displayedMeaning = rand.meaning;
            wrongMeaningSourceWord = rand.word;
          }
        }

        items.push({
          id: w.id,
          isCorrect,
          word: w.word,
          hiragana: w.hiragana,
          displayedMeaning,
          actualMeaning: w.meaning,
          wrongMeaningSourceWord,
          lesson: w.lesson || '',
        });
      });

      return shuffle(items);
    }
  }, [selectedLessons, mode]);

  const [queue, setQueue] = useState<ErrorItem[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [selectedAnswerTF, setSelectedAnswerTF] = useState<boolean | null>(null);
  const [selectedAnswerPW, setSelectedAnswerPW] = useState<string | null>(null);

  const current = queue[0];

  const pwOptions = useMemo(() => {
    if (!current || gameMode !== 'pickwrong') return [];
    
    const otherItemsPool = pool.filter(p => p.id !== current.id);
    const shuffledOthers = shuffle(otherItemsPool).slice(0, 3);
    
    const correctOptions = shuffledOthers.map(p => ({
      id: p.id,
      word: p.word,
      hiragana: p.hiragana,
      meaning: p.actualMeaning,
      isWrongPairing: false
    }));

    const wrongOption = {
      id: current.id,
      word: current.word,
      hiragana: current.hiragana,
      meaning: current.isCorrect ? current.actualMeaning : current.displayedMeaning,
      isWrongPairing: true
    };
    
    if (current.isCorrect) {
      const randOther = shuffledOthers[0];
      if (randOther) wrongOption.meaning = randOther.actualMeaning;
    }

    return shuffle([...correctOptions, wrongOption]);
  }, [current, pool, gameMode]);

  useEffect(() => { if (started) window.scrollTo(0, 0); }, [started]);

  const handleStart = () => {
    setQueue(pool);
    setScore(0);
    setStatus('idle');
    setSelectedAnswerTF(null);
    setSelectedAnswerPW(null);
    setStarted(true);
  };

  const handleAnswerTF = (answer: boolean) => {
    if (status !== 'idle') return;
    setSelectedAnswerTF(answer);
    
    if (answer === current.isCorrect) {
      setStatus('success');
      setScore(s => s + 1);
    } else {
      setStatus('fail');
    }
  };

  const handleAnswerPW = (opt: typeof pwOptions[0]) => {
    if (status !== 'idle') return;
    setSelectedAnswerPW(opt.id);
    
    if (opt.isWrongPairing) {
      setStatus('success');
      setScore(s => s + 1);
    } else {
      setStatus('fail');
    }
  };

  const handleNext = () => {
    setQueue(q => q.slice(1));
    setStatus('idle');
    setSelectedAnswerTF(null);
    setSelectedAnswerPW(null);
  };

  // ──────────── SETUP SCREEN ────────────
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </Link>

          <div className="mb-3 text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center justify-center gap-3">
              <ShieldAlert className="text-amber-500" size={36} /> Tìm lỗi sai (Chữ Hán)
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Kiểm tra khả năng phản xạ với cách đọc sai của Kanji.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
            <KanjiLessonChips
              options={lessons}
              selected={selectedLessons}
              onToggle={(val) => {
                setSelectedLessons(prev =>
                  prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                );
              }}
              onSelectAll={() => setSelectedLessons([])}
              totalCount={data.length}
              getCount={(l) => {
                if (mode === 'kanji-hanviet') {
                  return data.filter(k => k.lesson === l).reduce((acc, k) => acc + 1 + (k.words?.filter(w => w.hanVietWord).length || 0), 0);
                }
                return data.filter(k => k.lesson === l).reduce((acc, k) => acc + (k.words?.length || 0), 0);
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Chế độ dữ liệu
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setMode('kanji-hanviet')}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      mode === 'kanji-hanviet'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${mode === 'kanji-hanviet' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Shuffle size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Kanji → Hán Việt</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode('word-meaning')}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      mode === 'word-meaning'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${mode === 'word-meaning' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <MousePointerClick size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Từ ghép → Nghĩa</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Game Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Kiểu chơi
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setGameMode('truefalse')}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      gameMode === 'truefalse'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${gameMode === 'truefalse' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Shuffle size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Đúng hay Sai</div>
                      <div className="text-xs text-slate-500 opacity-80">Phán đoán nghĩa</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setGameMode('pickwrong')}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      gameMode === 'pickwrong'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${gameMode === 'pickwrong' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <MousePointerClick size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">Tìm cặp sai</div>
                      <div className="text-xs text-slate-500 opacity-80">Chọn 1 từ bị sai nghĩa</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Hiển thị Kana (Gợi ý)
                </label>
                <button
                  onClick={() => setShowFurigana(!showFurigana)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    showFurigana
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold">
                    {showFurigana ? <Eye size={20} /> : <EyeOff size={20} />}
                    {showFurigana ? 'Đang bật' : 'Đang ẩn'}
                  </div>
                  <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors" style={{ backgroundColor: showFurigana ? '#f59e0b' : '' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showFurigana ? 'left-5' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={pool.length < 4}
              className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-all shadow-md active:scale-95 text-lg"
            >
              {pool.length < 4 ? 'Cần chọn ít nhất 4 từ' : `Bắt đầu (${pool.length} câu)`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    const total = pool.length;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center">
          <div className="text-5xl mb-3">🏁</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Hoàn thành!</h2>
          <div className="text-6xl font-black text-amber-500 my-3">{pct}%</div>
          <p className="text-slate-500 mb-3">Bạn đã trả lời đúng {score}/{total} câu.</p>
          <div className="space-y-3">
            <button onClick={handleStart} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all">
              Chơi lại
            </button>
            <Link to={`/course/${course.id}/practice`} className="block w-full py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-slate-300 transition-all text-center">
              Về Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((pool.length - queue.length) / pool.length) * 100;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-100 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 transition-colors font-bold">
            <ArrowLeft size={18} /> Thoát
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFurigana(!showFurigana)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                showFurigana 
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {showFurigana ? <Eye size={16} /> : <EyeOff size={16} />}
              Nghĩa
            </button>
            <div className="text-sm font-bold bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
              Điểm: <span className="text-amber-500">{score}</span>
            </div>
            <div className="text-sm font-medium text-slate-500">
              {pool.length - queue.length + 1} / {pool.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div className="h-full bg-amber-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.id}_${gameMode}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {gameMode === 'truefalse' ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col mb-3">
                <div className="p-5 md:p-8 text-center flex-1 flex flex-col justify-center items-center">
                  <div className="text-sm font-bold text-slate-400 mb-3 tracking-widest uppercase">Nghĩa của từ này là:</div>
                  
                  <div className="text-5xl md:text-7xl font-black mb-3">
                    {current.word}
                  </div>
                  {showFurigana && current.hiragana && (
                    <div className="text-lg text-blue-500 font-bold mb-3">{current.hiragana}</div>
                  )}

                  <div className="text-3xl md:text-5xl font-bold text-amber-600 dark:text-amber-400 mt-4 px-4 text-center">
                    "{current.displayedMeaning}"
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAnswerTF(false)}
                    disabled={status !== 'idle'}
                    className={`py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-all ${
                      selectedAnswerTF === false
                        ? (!current.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')
                        : status !== 'idle' && !current.isCorrect
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-200 dark:ring-emerald-900'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-white border-2 border-slate-200 dark:border-slate-600 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                    }`}
                  >
                    SAI
                  </button>
                  <button
                    onClick={() => handleAnswerTF(true)}
                    disabled={status !== 'idle'}
                    className={`py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-all ${
                      selectedAnswerTF === true
                        ? (current.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')
                        : status !== 'idle' && current.isCorrect
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-200 dark:ring-emerald-900'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-white border-2 border-slate-200 dark:border-slate-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                    }`}
                  >
                    ĐÚNG
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="text-center mb-3">
                  <h2 className="text-xl font-bold">Tìm cặp từ sai Nghĩa</h2>
                  <p className="text-sm text-slate-500">Chỉ có 1 từ bị ghép sai Nghĩa / Hán Việt.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3 flex-1">
                  {pwOptions.map((opt, idx) => {
                    let btnClass = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20';
                    
                    if (status !== 'idle') {
                      if (opt.isWrongPairing) {
                        btnClass = 'bg-emerald-500 border-emerald-500 text-white ring-4 ring-emerald-200 dark:ring-emerald-900';
                      } else if (selectedAnswerPW === opt.id) {
                        btnClass = 'bg-red-500 border-red-500 text-white';
                      } else {
                        btnClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-50';
                      }
                    }

                    return (
                      <button
                        key={opt.id + idx}
                        onClick={() => handleAnswerPW(opt)}
                        disabled={status !== 'idle'}
                        className={`w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${btnClass}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="min-w-[4rem] text-center flex flex-col items-center">
                            <span className="text-4xl font-black">{opt.word}</span>
                            {showFurigana && opt.hiragana && <span className="text-sm text-blue-500 font-bold mt-1">{opt.hiragana}</span>}
                          </div>
                          <div className="font-semibold text-xl">{opt.meaning}</div>
                        </div>
                        {status !== 'idle' && opt.isWrongPairing && <CheckCircle2 className="text-white" />}
                        {status !== 'idle' && selectedAnswerPW === opt.id && !opt.isWrongPairing && <XCircle className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                  status === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/30' 
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30'
                }`}
              >
                <div className="flex-1 text-center md:text-left">
                  <div className={`font-black text-xl mb-1 ${status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {status === 'success' ? 'Chính xác! 🎉' : 'Sai rồi!'}
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    Nghĩa đúng của <span className="font-bold text-amber-600 text-xl">[{current.word}]</span> là "{current.actualMeaning}".
                  </div>
                  {gameMode === 'truefalse' && !current.isCorrect && (
                    <div className="text-sm text-slate-500 mt-1">
                      "{current.displayedMeaning}" là nghĩa của "{current.wrongMeaningSourceWord}".
                    </div>
                  )}
                </div>
                <button
                  onClick={handleNext}
                  className="w-full md:w-auto py-3 px-8 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  Tiếp tục
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
