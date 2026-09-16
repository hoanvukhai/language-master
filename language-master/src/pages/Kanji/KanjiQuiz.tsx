// src/pages/Kanji/KanjiQuiz.tsx
import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';
import KanjiLessonChips from '../../components/kanji/KanjiLessonChips';
import {
  generateKanjiCharacterQuestion,
  generateKanjiCompoundQuestion,
  generateKanjiWordHanVietQuestion,
  type GeneratedQuestion
} from '../../lib/questions/questionEngines';
import type { Kanji, KanjiWord } from '../../types';

export default function KanjiQuiz() {
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') === 'words' ? 'word-meaning' : 'kanji-hanviet') as 'kanji-hanviet' | 'word-meaning';
  const { course } = usePracticeContext();
  const data = course.data as Kanji[];

  const lessons = useMemo(() => {
    return Array.from(new Set(data.map(k => k.lesson))).filter(Boolean) as string[];
  }, [data]);

  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [mode, setMode] = useState<'kanji-hanviet' | 'word-meaning'>(initialMode);
  const [showFurigana, setShowFurigana] = useState(false);
  const [started, setStarted] = useState(false);

  const pool = useMemo(() => {
    const baseKanji = selectedLessons.length === 0
      ? data
      : data.filter(k => selectedLessons.includes(k.lesson || ''));

    const list: GeneratedQuestion[] = [];

    if (mode === 'kanji-hanviet') {
      const allWords: KanjiWord[] = [];
      baseKanji.forEach(k => {
        if (k.words) allWords.push(...k.words);
      });
      baseKanji.forEach(k => {
        list.push(generateKanjiCharacterQuestion(k, data));
        if (k.words && k.words.length > 0) {
          k.words.filter(w => w.hanVietWord).forEach(w => {
            list.push(generateKanjiWordHanVietQuestion(k.character, w, allWords));
          });
        }
      });
    } else {
      const allWords: KanjiWord[] = [];
      baseKanji.forEach(k => {
        if (k.words) allWords.push(...k.words);
      });
      baseKanji.forEach(k => {
        if (k.words && k.words.length > 0) {
          k.words.forEach(w => {
            list.push(generateKanjiCompoundQuestion(k.character, w, allWords));
          });
        }
      });
    }

    return [...list].sort(() => Math.random() - 0.5);
  }, [selectedLessons, mode, data]);

  const [queue, setQueue] = useState<GeneratedQuestion[]>([]);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const current = queue[0];

  useEffect(() => { if (started) window.scrollTo(0, 0); }, [started]);

  const handleStart = () => {
    setQueue(pool);
    setScore(0);
    setSelectedAnswer(null);
    setStarted(true);
  };

  const handleAnswer = (ans: string) => {
    if (selectedAnswer !== null || !current) return;

    setSelectedAnswer(ans);
    const correct = ans === current.correctAnswer;

    if (correct) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      setQueue(q => q.slice(1));
      setSelectedAnswer(null);
    }, 1200);
  };

  const getOptionSize = (text: string) => {
    if (text.length <= 8) return 'text-lg font-bold';
    if (text.length <= 16) return 'text-base font-semibold';
    return 'text-xs md:text-sm font-medium';
  };

  const getTargetSize = (text: string) => {
    if (text.length <= 2) return 'text-6xl font-black';
    if (text.length <= 6) return 'text-4xl font-extrabold';
    return 'text-2xl font-bold px-4';
  };

  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại Kanji Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
            🎯 Trắc Nghiệm Kanji {course.name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Kiểm tra phản xạ Hán Việt (Chữ gốc) hoặc Từ ghép Kanji.</p>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
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
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">⚙️ Chế độ trắc nghiệm</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('kanji-hanviet')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                      mode === 'kanji-hanviet'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>🔷 Phản Xạ Hán Việt (Chữ Gốc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('word-meaning')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                      mode === 'word-meaning'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>🔶 Phản Xạ Từ Ghép Kanji</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">👁️ Hiển thị Kana</label>
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
                    {showFurigana ? 'Đang bật Kana' : 'Đang ẩn Kana'}
                  </div>
                  <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors" style={{ backgroundColor: showFurigana ? '#f59e0b' : '' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showFurigana ? 'left-5' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-md"
            >
              Bắt đầu trắc nghiệm ({pool.length} câu)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center"
        >
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Hoàn thành!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Điểm của bạn: {score} / {pool.length}</p>

          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-amber-400 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Làm lại
            </button>
            <Link to={`/course/${course.id}/practice`} className="block w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all text-center">
              Về Kanji Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((pool.length - queue.length) / pool.length) * 100;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 transition-colors font-medium">
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
              Kana
            </button>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {score} điểm
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {pool.length - queue.length + 1} / {pool.length}
            </div>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-amber-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700 mb-3"
          >
            <div className="text-center mb-3">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">
                {current.type.includes('char') ? '🔷 Trắc Nghiệm Chữ Hán Gốc' : '🔶 Trắc Nghiệm Từ Ghép Kanji'}
              </div>
              <div className={`text-slate-800 dark:text-white mb-2 ${getTargetSize(current.prompt)}`}>
                {current.prompt}
              </div>
              {showFurigana && current.hiraganaAnswer && (
                <div className="text-xl text-indigo-600 dark:text-indigo-400 mb-2 font-bold">{current.hiraganaAnswer}</div>
              )}
              {current.subPrompt && <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">{current.subPrompt}</div>}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {current.options.map((optText, i) => {
                let btnClass = "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30";

                if (selectedAnswer !== null) {
                  if (optText === current.correctAnswer) {
                    btnClass = "bg-emerald-500 border-emerald-500 text-white font-bold";
                  } else if (optText === selectedAnswer) {
                    btnClass = "bg-red-500 border-red-500 text-white font-bold";
                  } else {
                    btnClass = "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-400 opacity-50";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(optText)}
                    disabled={selectedAnswer !== null}
                    className={`p-4 rounded-2xl border-2 transition-all min-h-[4rem] flex items-center justify-center text-center ${btnClass} ${getOptionSize(optText)}`}
                  >
                    <span>{optText}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
