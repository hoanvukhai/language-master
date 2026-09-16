// src/pages/Kanji/KanjiTyping.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';
import KanjiLessonChips from '../../components/kanji/KanjiLessonChips';
import { romajiToHiragana } from '../../lib/romajiConverter';
import * as wanakana from 'wanakana';
import type { Kanji } from '../../types';

interface TypingQuestionItem {
  id: string;
  questionText: string;
  target: string;
  answer: string;
  hint?: string;
  isSingleChar: boolean;
}

export default function KanjiTyping() {
  const [searchParams] = useSearchParams();

  const initialMode = searchParams.get('mode') === 'words' ? 'word-hiragana' : 'kanji-hanviet';

  const { course } = usePracticeContext();
  const data = course.data as Kanji[];

  const lessons = useMemo(() => {
    return Array.from(new Set(data.map(k => k.lesson))).filter(Boolean) as string[];
  }, [data]);

  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [mode, setMode] = useState<'kanji-hanviet' | 'word-hiragana'>(initialMode);
  const [showFurigana, setShowFurigana] = useState(true);
  const [started, setStarted] = useState(false);

  const pool = useMemo(() => {
    const baseKanji = selectedLessons.length === 0
      ? data
      : data.filter(k => selectedLessons.includes(k.lesson || ''));

    const list: TypingQuestionItem[] = [];

    if (mode === 'kanji-hanviet') {
      baseKanji.forEach(k => {
        list.push({
          id: `kt_char_${k.id}`,
          questionText: 'Gõ Âm Hán Việt tương ứng với Chữ Hán gốc này',
          target: k.character,
          answer: k.hanViet,
          hint: `Chữ Hán: ${k.character} · Bài: ${k.lesson}`,
          isSingleChar: true,
        });
        if (k.words && k.words.length > 0) {
          k.words.filter(w => w.hanVietWord).forEach((w, idx) => {
            list.push({
              id: `kt_wordhv_${k.id}_${idx}`,
              questionText: 'Gõ Âm Hán Việt tương ứng với Từ ghép này',
              target: w.word,
              answer: w.hanVietWord as string,
              hint: `Từ ghép: ${w.word} · Bài: ${k.lesson}`,
              isSingleChar: true,
            });
          });
        }
      });
    } else {
      baseKanji.forEach(k => {
        if (k.words && k.words.length > 0) {
          k.words.forEach((w, idx) => {
            const meaningText = typeof w.meaning === 'object' ? w.meaning.vi : w.meaning;
            list.push({
              id: `kt_word_${k.id}_${idx}`,
              questionText: 'Gõ cách đọc Hiragana của từ ghép Kanji này',
              target: w.word,
              answer: w.hiragana,
              hint: w.hanVietWord ? `Hán Việt: ${w.hanVietWord} · Nghĩa: ${meaningText}` : `Nghĩa: ${meaningText}`,
              isSingleChar: false,
            });
          });
        }
      });
    }

    return [...list].sort(() => Math.random() - 0.5);
  }, [selectedLessons, mode, data]);

  const [queue, setQueue] = useState<TypingQuestionItem[]>([]);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [showError, setShowError] = useState(false);
  const [isCorrectAnimation, setIsCorrectAnimation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = queue[0];

  useEffect(() => {
    if (started && inputRef.current) {
      inputRef.current.focus();
    }
  }, [started, queue]);

  useEffect(() => { if (started) window.scrollTo(0, 0); }, [started]);

  const handleStart = () => {
    setQueue(pool);
    setScore(0);
    setInput('');
    setShowError(false);
    setIsCorrectAnimation(false);
    setStarted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !input.trim()) return;

    let isCorrect = false;
    if (current.isSingleChar) {
      // Hán Việt text matching (e.g. 'TẠO')
      isCorrect = input.trim().toUpperCase() === current.answer.trim().toUpperCase();
    } else {
      // Kana matching via Romaji converter
      const convertedInput = romajiToHiragana(input).trim();
      isCorrect = wanakana.toHiragana(convertedInput) === wanakana.toHiragana(current.answer.trim()) || input.trim() === current.answer.trim();
    }

    if (isCorrect) {
      setIsCorrectAnimation(true);
      setScore(s => s + 1);
      setTimeout(() => {
        setQueue(q => q.slice(1));
        setInput('');
        setIsCorrectAnimation(false);
      }, 500);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 500);
    }
  };

  const handleSkip = () => {
    setShowError(true);
    setInput(current.answer);
    setTimeout(() => {
      setQueue(q => q.slice(1));
      setInput('');
      setShowError(false);
    }, 1500);
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
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại Kanji Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">⌨️ Gõ Phím Phản Xạ Kanji {course.name}</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Luyện gõ Hán Việt cho Chữ Hán gốc hoặc Gõ Hiragana cho Từ ghép Kanji.</p>

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
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">⚙️ Chế độ gõ phím</label>
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
                    <span>🔷 Gõ Âm Hán Việt (Chữ Gốc)</span>
                    <span className="text-xs font-normal opacity-70">造 ➔ TẠO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('word-hiragana')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                      mode === 'word-hiragana'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>🔶 Gõ Hiragana Từ Ghép</span>
                    <span className="text-xs font-normal opacity-70">製造 ➔ せきぞう</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  👁️ Hiển thị Gợi ý
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
                    {showFurigana ? 'Đang bật gợi ý' : 'Đang ẩn gợi ý'}
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
              Bắt đầu gõ ({pool.length} câu)
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
          <div className="text-5xl mb-3">⌨️</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Hoàn thành!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Điểm của bạn: {score} / {pool.length}</p>

          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-amber-400 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Gõ lại
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
            <ArrowLeft size={18} /> Cài đặt
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
              Gợi ý
            </button>
            <div className="text-sm font-bold text-amber-500">
              {score} điểm
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {pool.length - queue.length + 1} / {pool.length}
            </div>
          </div>
        </div>

        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-amber-400 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className={`bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border-2 transition-colors duration-300 ${
              isCorrectAnimation ? 'border-green-400 bg-green-50 dark:bg-green-900/20' :
              showError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-100 dark:border-slate-700'
            } mb-3`}
          >
            <div className="text-center mb-3">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">
                {current.isSingleChar ? '🔷 Gõ Âm Hán Việt (Chữ Gốc)' : '🔶 Gõ Hiragana Từ Ghép'}
              </div>
              <div className={`text-slate-800 dark:text-white mb-3 ${getTargetSize(current.target)}`}>
                {current.target}
              </div>
              <div className="text-slate-500 dark:text-slate-400 min-h-[1.5rem] font-medium text-sm">
                {showFurigana && current.hint}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={current.isSingleChar ? 'Gõ Âm Hán Việt...' : 'Gõ Romaji ở đây...'}
                className={`w-full px-4 py-3.5 rounded-xl border-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-lg font-bold outline-none transition-colors text-center ${
                  showError ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-600 focus:border-amber-400'
                }`}
                autoFocus
                disabled={isCorrectAnimation}
              />
              {!current.isSingleChar && (
                <div className="text-xs text-indigo-600 dark:text-indigo-300 font-mono text-center">
                  Tự động chuyển Kana: <span className="font-bold text-slate-800 dark:text-white">{romajiToHiragana(input)}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isCorrectAnimation || !input.trim()}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors active:scale-95 shadow-md"
              >
                Gửi câu trả lời
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={handleSkip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                Không biết? Xem đáp án
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
