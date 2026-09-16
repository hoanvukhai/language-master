// src/pages/Vocabulary/VocabFlashcard.tsx
// Tái sử dụng cơ chế lật thẻ, nhưng đơn giản hóa cho từ vựng (không chia thể)
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';
import type { Word } from '../../types';
import VocabLessonChips from '../../components/vocabulary/VocabLessonChips';
import { formatDualIpa } from '../../lib/english/ipaHelper';


function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function VocabFlashcard() {
  const { course } = usePracticeContext();
  const data = course.data as any[];
  const isEnglish = course.template === 'english';
  const lessons = Array.from(new Set(data.map((w: any) => w.lesson).filter(Boolean))) as string[];
  
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);

  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [showFurigana, setShowFurigana] = useState(false);
  const [started, setStarted] = useState(false);

  const pool = useMemo(() => {
    const base = selectedLessons.length === 0
      ? data
      : data.filter(w => selectedLessons.includes(w.lesson || ''));
    return shuffle(base);
  }, [selectedLessons, data]);

  const [queue, setQueue] = useState<Word[]>([]);
  const [known, setKnown] = useState<Word[]>([]);
  const [learning, setLearning] = useState<Word[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);

  const current = queue[0];

  useEffect(() => { if (started) window.scrollTo(0, 0); }, [started]);

  const handleStart = () => {
    setQueue(pool);
    setKnown([]);
    setLearning([]);
    setIsFlipped(false);
    setStarted(true);
  };

  const handleResult = (knew: boolean) => {
    if (!current) return;
    if (knew) setKnown(p => [...p, current]);
    else setLearning(p => [...p, current]);
    setQueue(q => q.slice(1));
    setIsFlipped(false);
  };

  const handleRestart = () => {
    setQueue(shuffle([...known, ...learning]));
    setKnown([]);
    setLearning([]);
    setIsFlipped(false);
  };

  const handleRestartLearning = () => {
    setQueue(shuffle(learning));
    setKnown([]);
    setLearning([]);
    setIsFlipped(false);
  };

  const getMeaning = (w: any) =>
    typeof w.meaning === 'object' ? w.meaning.vi : w.meaning;

  // Template-aware helpers
  const getWordDisplay = (w: any): string =>
    isEnglish ? (w.word || '') : (w.kanji || w.hiragana || '');
  const getSubDisplay = (w: any): string =>
    isEnglish ? formatDualIpa(w) : (w.hiragana || '');

  // ──────────── SETUP SCREEN ────────────
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-violet-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">🃏 Lật thẻ từ vựng</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Chọn bài học và chế độ hiển thị.</p>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
            {/* Chọn bài */}
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
              {/* Hướng & Furigana */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">🔄 Hướng thẻ</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDirection('forward')}
                      className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                        direction === 'forward'
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shadow-sm'
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
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      Đảo ngược
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                    {isEnglish ? 'Hiển thị IPA (Mặt có từ vựng)' : 'Hiển thị Kana (Mặt có Kanji)'}
                  </label>
                  <button
                    onClick={() => setShowFurigana(!showFurigana)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      showFurigana
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 font-bold">
                      {showFurigana ? <Eye size={20} /> : <EyeOff size={20} />}
                      {showFurigana ? 'Đang bật' : 'Đang ẩn'}
                    </div>
                    <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors" style={{ backgroundColor: showFurigana ? '#8b5cf6' : '' }}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showFurigana ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Bắt đầu luyện tập
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────── DONE SCREEN ────────────
  if (queue.length === 0) {
    const total = known.length + learning.length;
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center"
        >
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Hoàn thành!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Bạn đã học xong {total} từ.</p>

          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{known.length}</div>
              <div className="text-xs text-green-600 dark:text-green-400">Đã thuộc</div>
            </div>
            <div className="flex-1 bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{learning.length}</div>
              <div className="text-xs text-amber-600 dark:text-amber-400">Cần ôn</div>
            </div>
          </div>

          <div className="space-y-3">
            {learning.length > 0 && (
              <button
                onClick={handleRestartLearning}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all"
              >
                Ôn lại {learning.length} từ chưa thuộc
              </button>
            )}
            <button
              onClick={handleRestart}
              className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-violet-400 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Học lại tất cả
            </button>
            <Link to={`/course/${course.id}/practice`} className="block w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all text-center">
              Về dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }


  let frontContent = '';
  let backContent = '';
  let subFront = '';
  let subBack = '';

  if (direction === 'forward') {
    frontContent = getWordDisplay(current);
    if (showFurigana) subFront = getSubDisplay(current);
    backContent = getMeaning(current);
    subBack = getSubDisplay(current);
  } else {
    frontContent = getMeaning(current);
    backContent = getWordDisplay(current);
    if (!isEnglish && showFurigana) subBack = getSubDisplay(current);
    else if (isEnglish) subBack = getSubDisplay(current);
  }

  const progress = ((known.length + learning.length) / (known.length + learning.length + queue.length)) * 100;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors font-medium">
            <ArrowLeft size={18} /> Quay lại
          </button>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFurigana(!showFurigana)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                showFurigana 
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {showFurigana ? <Eye size={16} /> : <EyeOff size={16} />}
              {isEnglish ? 'IPA' : 'Kana'}
            </button>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {known.length + learning.length} / {known.length + learning.length + queue.length}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-violet-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Lesson tag */}
        {current.lesson && (
          <div className="text-center mb-3">
            <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full font-medium">
              {current.lesson}
            </span>
          </div>
        )}

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + isFlipped}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="relative cursor-pointer select-none"
              onClick={() => setIsFlipped(f => !f)}
            >
              <div className={`min-h-[12rem] rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl border-2 transition-colors ${
                isFlipped
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white'
              }`}>
                {!isFlipped ? (
                  <>
                    <div className="text-5xl font-bold mb-3">{frontContent}</div>
                    {subFront && (
                      <div className="text-lg text-slate-400 dark:text-slate-500">{subFront}</div>
                    )}
                    <div className="mt-4 text-sm text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <RotateCcw size={14} /> Chạm để lật
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-violet-200 text-sm mb-3 font-medium">Đáp án</div>
                    <div className="flex flex-col items-center gap-2">
                        {subBack && <div className="text-xl text-violet-100">{subBack}</div>}
                        <div className="text-4xl font-bold text-white">{backContent}</div>
                    </div>
                    {current.examples && current.examples[0] && (
                      <div className="mt-4 p-3 bg-white/10 rounded-xl text-left w-full">
                        <div className="text-sm text-violet-100">{(current.examples[0] as any).en || current.examples[0].jp}</div>
                        <div className="text-xs text-violet-200 mt-1">{current.examples[0].vi}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Action buttons — chỉ hiện sau khi lật */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex gap-4 mt-4"
            >
              <button
                onClick={() => handleResult(false)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 font-bold rounded-2xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95"
              >
                <ThumbsDown size={20} /> Chưa thuộc
              </button>
              <button
                onClick={() => handleResult(true)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 font-bold rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all active:scale-95"
              >
                <ThumbsUp size={20} /> Đã thuộc
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats mini */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle2 size={14} /> {known.length} thuộc
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <RotateCcw size={14} /> {learning.length} cần ôn
          </span>
        </div>
      </div>
    </div>
  );
}
