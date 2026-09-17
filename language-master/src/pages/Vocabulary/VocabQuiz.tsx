// src/pages/Vocabulary/VocabQuiz.tsx
// Trắc nghiệm 4 đáp án — 2 chế độ: JP→VI hoặc VI→JP
import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, ArrowRight, Trophy, Eye, EyeOff } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';
import { useSettings } from '../../context/global/useSettings';
import VocabLessonChips from '../../components/vocabulary/VocabLessonChips';
import { formatDualIpa } from '../../lib/english/ipaHelper';



function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildOptions(correct: any, pool: any[]): any[] {
  const distractors = shuffle(pool.filter(w => w.id !== correct.id)).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

export default function VocabQuiz() {
  const { course } = usePracticeContext();
  const { language } = useSettings();
  const data = course.data as any[];
  const isEnglish = course.template === 'english';
  const lessons = Array.from(new Set(data.map((w: any) => w.lesson).filter(Boolean))) as string[];
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [showFurigana, setShowFurigana] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [started, setStarted] = useState(false);

  const pool = useMemo(() => {
    const base = selectedLessons.length === 0
      ? data
      : data.filter(w => selectedLessons.includes(w.lesson || ''));
    return shuffle(base);
  }, [selectedLessons, data]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);

  const current = pool[index];

  const options = useMemo(() => {
    if (!current) return [];
    return buildOptions(current, pool);
  }, [current, pool]);

  const getMeaning = (w: any) =>
    typeof w.meaning === 'object' 
      ? (language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi)
      : w.meaning;

  const getWordDisplay = (w: any): string =>
    isEnglish
      ? (w.word || '')
      : w.alt_kanji ? `${w.kanji || w.hiragana} (${w.alt_kanji})` : (w.kanji || w.hiragana || '');

  // Legacy alias
  const getKanjiDisplay = getWordDisplay;

  const handleSelect = useCallback((opt: any) => {
    if (selected !== null) return;
    setSelected(opt);
    if (opt.id === current.id) setScore(s => s + 1);
    else setWrong(s => s + 1);
  }, [selected, current]);

  const handleNext = () => {
    if (index + 1 >= pool.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
    }
  };

  const handleRestart = () => {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setWrong(0);
    setDone(false);
  };

  // ──────────── SETUP ────────────
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">📝 Trắc nghiệm</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">4 đáp án — chọn đáp án đúng.</p>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
            <VocabLessonChips
              options={lessons}
              selected={selectedLessons}
              onToggle={(val) => {
                setSelectedLessons(prev =>
                  prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                );
              }}
              onSelectAll={() => setSelectedLessons([])}
              totalCount={data.length}
              getCount={(l) => data.filter(w => w.lesson === l).length}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">🔄 Hướng câu hỏi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirection('forward')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      direction === 'forward'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    Thuận
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('backward')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      direction === 'backward'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    Đảo ngược
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  {isEnglish ? '👁️ Hiển thị IPA (Gợi ý)' : '👁️ Hiển thị Kana (Gợi ý)'}
                </label>
                <button
                  onClick={() => setShowFurigana(!showFurigana)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    showFurigana
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold">
                    {showFurigana ? <Eye size={20} /> : <EyeOff size={20} />}
                    {showFurigana ? 'Đang bật' : 'Đang ẩn'}
                  </div>
                  <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors" style={{ backgroundColor: showFurigana ? '#3b82f6' : '' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showFurigana ? 'left-5' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => setStarted(true)}
              disabled={pool.length < 4}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              {pool.length < 4 ? `Cần ít nhất 4 từ (hiện có ${pool.length})` : 'Bắt đầu'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────── DONE ────────────
  if (done) {
    const total = score + wrong;
    const pct = Math.round((score / total) * 100);
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center"
        >
          <Trophy className="mx-auto mb-3 text-amber-400" size={56} />
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-1">Kết quả</h2>
          <div className="text-6xl font-black text-blue-600 dark:text-blue-400 my-4">{pct}%</div>
          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-xl p-3">
              <div className="text-xl font-bold text-green-600">{score}</div>
              <div className="text-xs text-green-600">Đúng</div>
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-900/30 rounded-xl p-3">
              <div className="text-xl font-bold text-red-500">{wrong}</div>
              <div className="text-xs text-red-500">Sai</div>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={handleRestart} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
              Làm lại
            </button>
            <Link to={`/course/${course.id}/practice`} className="block w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-blue-400 transition-all text-center">
              Về dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ──────────── QUIZ ────────────
  const progress = (index / pool.length) * 100;
  const questionText = direction === 'forward' ? getWordDisplay(current) : getMeaning(current);
  const questionSub = direction === 'forward' && showFurigana
    ? (isEnglish ? formatDualIpa(current) : (current as any).hiragana)
    : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
            <ArrowLeft size={18} /> Cài đặt
          </button>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFurigana(!showFurigana)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                showFurigana 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {showFurigana ? <Eye size={16} /> : <EyeOff size={16} />}
              {isEnglish ? 'IPA' : 'Kana'}
            </button>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{index + 1} / {pool.length}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 mb-3 text-center">
              {current.lesson && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-medium mb-3 inline-block">
                  {current.lesson}
                </span>
              )}
              <div className="text-5xl font-bold text-slate-800 dark:text-white mt-3">{questionText}</div>
              {questionSub && (
                <div className="text-lg text-slate-400 dark:text-slate-500 mt-2">{questionSub}</div>
              )}
              <div className="text-sm text-slate-400 mt-3">
                {direction === 'forward'
                  ? (isEnglish ? 'Chọn nghĩa tiếng Việt đúng' : 'Chọn nghĩa tiếng Việt đúng')
                  : (isEnglish ? 'Chọn từ tiếng Anh đúng' : 'Chọn Kanji đúng')}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {options.map((opt, i) => {
                const isCorrect = opt.id === current.id;
                const isSelected = selected !== null && opt.id === selected.id;
                let btnClass = 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20';
                if (selected !== null) {
                  if (isCorrect) btnClass = 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300';
                  else if (isSelected) btnClass = 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';
                  else btnClass = 'border-slate-200 dark:border-slate-700 opacity-50 bg-white dark:bg-slate-800 text-slate-500';
                }

                const optLabel = direction === 'forward' ? getMeaning(opt) : getKanjiDisplay(opt);

                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(opt)}
                    disabled={selected !== null}
                    className={`w-full p-4 rounded-2xl border-2 font-bold text-lg transition-all ${btnClass} flex items-center justify-between`}
                  >
                    <div className="flex-1 flex flex-col items-start">
                      <span>{optLabel}</span>
                      {direction === 'backward' && showFurigana && (
                        <span className="text-sm opacity-70 font-medium mt-1">
                          {isEnglish ? formatDualIpa(opt as any) : (opt as any).hiragana}
                        </span>
                      )}
                    </div>
                    {selected !== null && isCorrect && <CheckCircle2 size={24} className="text-green-500 flex-shrink-0" />}
                    {selected !== null && isSelected && !isCorrect && <XCircle size={24} className="text-red-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            {selected !== null && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNext}
                className="w-full mt-5 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {index + 1 >= pool.length ? '🏁 Xem kết quả' : 'Tiếp theo'} <ArrowRight size={18} />
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Score mini */}
        <div className="flex justify-center gap-6 mt-5 text-sm">
          <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={14} /> {score}</span>
          <span className="text-red-500 flex items-center gap-1"><XCircle size={14} /> {wrong}</span>
        </div>
      </div>
    </div>
  );
}
