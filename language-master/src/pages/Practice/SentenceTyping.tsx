// src/pages/Practice/SentenceTyping.tsx
// Chế độ Luyện Gõ Câu (Sentence Typing & Dictation):
// Thiết kế chuẩn hóa đồng bộ 100% với các chế độ Luyện tập khác trong dự án (VocabTyping, VocabQuiz):
// - 3 Màn hình chuẩn: Cài đặt (Setup) -> Luyện tập (Play) -> Kết quả (Done).
// - Chọn bài học qua VocabLessonChips.
// - 2 Chế độ: Dịch (Nghĩa VI -> Gõ câu) & Nghe (Nghe câu -> Gõ lại câu).
// - Chip từ che dấu sao (*****), phím tắt Ctrl + Space mở gợi ý từ tiếp theo.
// - Random toàn bộ câu ví dụ của khóa học, hỗ trợ nhiều ví dụ trên 1 từ.
// - KHÔNG CÓ timer đếm ngược, KHÔNG CÓ coins (luyện tập thảnh thơi tự do theo chuẩn hệ thống).

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  Volume2,
  Eye,
  EyeOff,
  Languages,
  Headphones,
} from 'lucide-react';
import * as wanakana from 'wanakana';
import { usePracticeContext } from './PracticeContext';
import { speakWithVoiceEngine } from '../../lib/audio/voiceEngine';
import VocabLessonChips from '../../components/vocabulary/VocabLessonChips';

interface SentenceItem {
  id: string;
  targetSentence: string;      // Câu tiếng Anh hoặc tiếng Nhật
  translation: string;         // Nghĩa tiếng Việt
  sourceWord: string;          // Từ vựng gốc liên quan
  lesson?: string;
}

type ModeType = 'translate' | 'listen'; // Chế độ 1: Dịch, Chế độ 2: Nghe

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Tách từ và dấu câu để che dấu sao */
function tokenizeSentence(sentence: string): { word: string; punctuation: string; full: string }[] {
  if (!sentence) return [];
  const parts = sentence.trim().split(/\s+/);
  return parts.map(part => {
    const match = part.match(/^(.*?)([.,!?;:"'”…)\]}]+)?$/);
    if (match) {
      return {
        word: match[1] || '',
        punctuation: match[2] || '',
        full: part,
      };
    }
    return { word: part, punctuation: '', full: part };
  });
}

/** Chuẩn hóa chuỗi so sánh */
function cleanTextForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'”…)\]}\-_/\\~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trích xuất toàn bộ câu ví dụ từ dữ liệu khóa học */
function extractSentencesFromData(data: any[], selectedLessons: string[], isEnglish: boolean): SentenceItem[] {
  const filteredWords = selectedLessons.length === 0
    ? data
    : data.filter(w => selectedLessons.includes(w.lesson || ''));

  const items: SentenceItem[] = [];

  filteredWords.forEach((w: any, wIdx: number) => {
    const rawEx = w.examples || w.originalData?.examples;
    const lesson = w.lesson;
    const sourceWord = isEnglish ? (w.word || '') : (w.kanji || w.hiragana || '');
    let addedCount = 0;

    // 1. Kiểm tra mảng examples (nếu từ có nhiều ví dụ thì lấy TẤT CẢ)
    if (Array.isArray(rawEx) && rawEx.length > 0) {
      rawEx.forEach((ex: any, exIdx: number) => {
        const sentence = isEnglish
          ? (ex.en || ex.sentence)
          : (ex.jp || ex.sentence || ex.en);
        const translation = ex.vi || ex.meaning || '';
        if (sentence && typeof sentence === 'string' && sentence.trim()) {
          items.push({
            id: `${w.id || wIdx}-${exIdx}`,
            targetSentence: sentence.trim(),
            translation: translation ? translation.trim() : '',
            sourceWord,
            lesson,
          });
          addedCount++;
        }
      });
    }

    // 2. Kiểm tra ví dụ đơn
    if (addedCount === 0) {
      if (w.exampleKanji && typeof w.exampleKanji === 'string' && w.exampleKanji.trim()) {
        items.push({
          id: `${w.id || wIdx}-exK`,
          targetSentence: w.exampleKanji.trim(),
          translation: (w.exampleMeaning || '').trim(),
          sourceWord,
          lesson,
        });
        addedCount++;
      } else if (w.example && typeof w.example === 'string' && w.example.trim()) {
        items.push({
          id: `${w.id || wIdx}-exStr`,
          targetSentence: w.example.trim(),
          translation: (typeof w.meaning === 'string' ? w.meaning : w.meaning?.vi || '').trim(),
          sourceWord,
          lesson,
        });
        addedCount++;
      } else if (w.example && typeof w.example === 'object') {
        const sentence = isEnglish ? (w.example.en || w.example.sentence) : (w.example.jp || w.example.sentence);
        if (sentence && typeof sentence === 'string' && sentence.trim()) {
          items.push({
            id: `${w.id || wIdx}-exObj`,
            targetSentence: sentence.trim(),
            translation: (w.example.vi || w.example.meaning || '').trim(),
            sourceWord,
            lesson,
          });
          addedCount++;
        }
      }
    }

    // 3. Fallback: Nếu không có ví dụ (trường hợp người dùng tự tạo chưa thêm ví dụ)
    if (addedCount === 0 && sourceWord) {
      const meaningStr = typeof w.meaning === 'string'
        ? w.meaning
        : (w.meaning?.vi || w.meaning?.en || '');
      if (meaningStr) {
        items.push({
          id: `${w.id || wIdx}-fallback`,
          targetSentence: sourceWord,
          translation: meaningStr,
          sourceWord,
          lesson,
        });
      }
    }
  });

  return shuffle(items);
}

export default function SentenceTyping() {
  const { course } = usePracticeContext();
  const data = useMemo(() => (course?.data || []) as any[], [course]);
  const isEnglish = course?.template === 'english';
  const isJapanese = !isEnglish;

  // Danh sách bài học
  const lessons = useMemo(() => {
    return Array.from(new Set(data.map((w: any) => w.lesson).filter(Boolean))) as string[];
  }, [data]);

  // Cài đặt setup
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<ModeType>('translate');
  const [showMaskChips, setShowMaskChips] = useState<boolean>(true);
  const [started, setStarted] = useState<boolean>(false);

  // Pool câu hỏi đã lọc theo bài học
  const pool = useMemo(() => {
    return extractSentencesFromData(data, selectedLessons, isEnglish);
  }, [data, selectedLessons, isEnglish]);

  // Trạng thái phiên luyện tập
  const [queue, setQueue] = useState<SentenceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);

  // Gợi ý và mở từ che dấu sao
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [showListenHint, setShowListenHint] = useState<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const current = queue[currentIndex] || null;

  // Phát âm thanh câu
  const playAudio = useCallback((text?: string) => {
    const sentenceToSpeak = text || current?.targetSentence;
    if (!sentenceToSpeak) return;
    speakWithVoiceEngine(sentenceToSpeak, {
      lang: isJapanese ? 'ja-JP' : 'en-US',
      rate: 0.95,
      pitch: 1.0,
      volume: 1.0,
    });
  }, [current, isJapanese]);

  // Focus ô nhập khi sang câu mới
  useEffect(() => {
    if (started && !submitted) {
      inputRef.current?.focus();
    }
  }, [currentIndex, started, submitted]);

  // Tự động phát âm thanh ở chế độ nghe khi chuyển câu
  useEffect(() => {
    if (started && activeMode === 'listen' && current && !submitted) {
      const timer = setTimeout(() => {
        playAudio(current.targetSentence);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [started, activeMode, current, currentIndex, submitted, playAudio]);

  // Tokens của câu hiện tại
  const tokens = useMemo(() => {
    if (!current?.targetSentence) return [];
    return tokenizeSentence(current.targetSentence);
  }, [current]);

  // Tự động reveal từ che dấu sao khi người dùng gõ đúng từ đó
  useEffect(() => {
    if (!tokens || tokens.length === 0) return;
    const typedWords = cleanTextForCompare(input).split(/\s+/).filter(Boolean);
    const newRevealed = new Set(revealedIndices);
    let changed = false;

    tokens.forEach((tok, idx) => {
      const targetClean = cleanTextForCompare(tok.word);
      if (typedWords.includes(targetClean)) {
        if (!newRevealed.has(idx)) {
          newRevealed.add(idx);
          changed = changed || true;
        }
      }
    });

    if (changed) {
      setRevealedIndices(newRevealed);
    }
  }, [input, tokens, revealedIndices]);

  // Phím tắt Ctrl + Space: Mở từ tiếp theo
  const revealNextWord = useCallback(() => {
    if (!tokens || tokens.length === 0) return;
    for (let i = 0; i < tokens.length; i++) {
      if (!revealedIndices.has(i)) {
        setRevealedIndices(prev => new Set([...prev, i]));
        break;
      }
    }
  }, [tokens, revealedIndices]);

  // Xử lý phím tắt
  useEffect(() => {
    if (!started || done) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space: mở từ tiếp theo
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        revealNextWord();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, done, revealNextWord]);

  // Kiểm tra câu trả lời
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || submitted || !current) return;

    const userClean = cleanTextForCompare(input);
    const targetClean = cleanTextForCompare(current.targetSentence);

    const check = userClean === targetClean;
    setIsCorrect(check);
    setSubmitted(true);

    if (check) {
      setScore(s => s + 1);
      playAudio(current.targetSentence);
    } else {
      setWrong(s => s + 1);
    }
  };

  // Chuyển sang câu tiếp theo (kèm cơ chế đẩy câu sai xuống cuối queue như ở Test)
  const handleNext = () => {
    if (!current) return;

    // Nếu trả lời sai: Đẩy câu sai này xuống cuối hàng đợi để luyện lại cho đến khi gõ đúng
    if (!isCorrect) {
      setQueue(prev => [...prev, current]);
    }

    const totalInQueue = queue.length + (!isCorrect ? 1 : 0);
    if (currentIndex + 1 >= totalInQueue) {
      setDone(true);
    } else {
      setCurrentIndex(i => i + 1);
      setInput('');
      setSubmitted(false);
      setIsCorrect(false);
      setRevealedIndices(new Set());
      setShowListenHint(false);
    }
  };

  // Làm lại từ đầu
  const handleRestart = () => {
    setQueue(shuffle(pool));
    setCurrentIndex(0);
    setInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setScore(0);
    setWrong(0);
    setDone(false);
    setRevealedIndices(new Set());
    setShowListenHint(false);
  };

  // Bắt đầu phiên luyện tập
  const handleStart = () => {
    setQueue(shuffle(pool));
    setCurrentIndex(0);
    setInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setScore(0);
    setWrong(0);
    setDone(false);
    setRevealedIndices(new Set());
    setShowListenHint(false);
    setStarted(true);
  };

  // ──────────────────────────────────────────────
  // 1. MÀN HÌNH CÀI ĐẶT (SETUP)
  // ──────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link
            to={`/course/${course.id}/practice`}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-3 transition-colors"
          >
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
            💬 Luyện Gõ Câu
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">
            {isEnglish
              ? 'Luyện gõ cả câu tiếng Anh hoàn chỉnh qua dịch câu hoặc nghe chép chính tả.'
              : 'Luyện gõ cả câu tiếng Nhật hoàn chỉnh qua dịch câu hoặc nghe chép chính tả.'}
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
            {/* Bộ lọc bài học */}
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
              accentClass="border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
            />

            {/* Các tùy chọn luyện tập */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chọn chế độ 1 (Dịch) hoặc 2 (Nghe) */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  🔄 Chế độ luyện tập
                </label>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveMode('translate')}
                    className={`py-3 px-4 rounded-xl border-2 font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                      activeMode === 'translate'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Languages size={18} />
                      <span>Dịch: Nghĩa VI ➔ Gõ câu</span>
                    </div>
                    {activeMode === 'translate' && <CheckCircle2 size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMode('listen')}
                    className={`py-3 px-4 rounded-xl border-2 font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                      activeMode === 'listen'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Headphones size={18} />
                      <span>Nghe: Nghe câu ➔ Gõ lại</span>
                    </div>
                    {activeMode === 'listen' && <CheckCircle2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Tùy chọn gợi ý che dấu sao ***** */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  👁️ Gợi ý chip từ che dấu sao (*****)
                </label>
                <button
                  type="button"
                  onClick={() => setShowMaskChips(prev => !prev)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                    showMaskChips
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold">
                    {showMaskChips ? <Eye size={20} /> : <EyeOff size={20} />}
                    <span>{showMaskChips ? 'Bật gợi ý dấu sao' : 'Ẩn gợi ý (Thử thách cao)'}</span>
                  </div>
                  <div
                    className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors"
                    style={{ backgroundColor: showMaskChips ? '#0d9488' : '' }}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        showMaskChips ? 'left-5' : 'left-1'
                      }`}
                    />
                  </div>
                </button>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  💡 Khi bật, câu sẽ được che bằng các ký tự dấu sao (*). Bạn có thể nhấn <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono">Ctrl + Space</kbd> trong lúc gõ để mở gợi ý từ tiếp theo.
                </p>
              </div>
            </div>

            {/* Thông báo số lượng câu khả dụng */}
            {pool.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-sm">
                ⚠️ Khóa học này chưa có câu ví dụ nào. Vui lòng bổ sung câu ví dụ cho các từ vựng để sử dụng chế độ Luyện Gõ Câu!
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tìm thấy <strong className="text-teal-600 dark:text-teal-400">{pool.length}</strong> câu ví dụ sẵn sàng luyện tập.
              </div>
            )}

            {/* Nút Bắt đầu */}
            <button
              type="button"
              onClick={handleStart}
              disabled={pool.length === 0}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Bắt đầu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // 2. MÀN HÌNH KẾT QUẢ (DONE)
  // ──────────────────────────────────────────────
  if (done) {
    const total = score + wrong;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center"
        >
          <Trophy className="mx-auto mb-3 text-amber-400" size={56} />
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-1">Kết quả</h2>
          <div className="text-6xl font-black text-teal-600 my-4">{pct}%</div>
          <div className="flex gap-3 mb-4">
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
            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              Làm lại
            </button>
            <Link
              to={`/course/${course.id}/practice`}
              className="block w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-teal-400 transition-all text-center"
            >
              Về dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // 3. MÀN HÌNH LUYỆN TẬP (PLAYING)
  // ──────────────────────────────────────────────
  const progress = queue.length > 0 ? ((currentIndex + 1) / queue.length) * 100 : 0;
  const userWordsClean = cleanTextForCompare(input).split(/\s+/).filter(Boolean);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Header trên cùng */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors font-medium cursor-pointer"
          >
            <ArrowLeft size={18} /> Cài đặt
          </button>
          <div className="flex items-center gap-3">
            {/* Chuyển đổi nhanh 2 chế độ ngay trong ván */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('translate');
                  setSubmitted(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeMode === 'translate'
                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Chế độ Dịch"
              >
                <Languages size={13} />
                <span>Dịch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('listen');
                  setSubmitted(false);
                  if (current) playAudio(current.targetSentence);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeMode === 'listen'
                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Chế độ Nghe"
              >
                <Headphones size={13} />
                <span>Nghe</span>
              </button>
            </div>

            {/* Chỉ số tiến độ chuẩn: 1 / 20 */}
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {currentIndex + 1} / {queue.length}
            </span>
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-teal-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Thẻ câu hỏi chính */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${current?.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 mb-4 text-center space-y-4">
              {/* Badge bài học */}
              {current?.lesson && (
                <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full font-medium inline-block">
                  {current.lesson}
                </span>
              )}

              {/* Nội dung câu hỏi theo chế độ */}
              {activeMode === 'translate' ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Nghĩa tiếng Việt
                  </p>
                  <div className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white leading-relaxed">
                    {current?.translation || '(Dịch sang câu tương ứng)'}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {isEnglish ? 'Gõ cả câu tiếng Anh hoàn chỉnh' : 'Gõ cả câu tiếng Nhật hoàn chỉnh'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Nghe câu và gõ lại
                  </p>
                  <button
                    type="button"
                    onClick={() => playAudio(current?.targetSentence)}
                    className="mx-auto w-16 h-16 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-teal-200 dark:shadow-teal-950/50 cursor-pointer"
                    title="Nghe lại phát âm"
                  >
                    <Volume2 size={32} />
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowListenHint(s => !s)}
                      className="text-xs text-slate-400 hover:text-teal-600 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showListenHint ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showListenHint ? 'Ẩn nghĩa tiếng Việt' : 'Hiện gợi ý nghĩa tiếng Việt'}</span>
                    </button>
                    {showListenHint && current?.translation && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic pt-1">
                        {current.translation}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Khung chip từ che dấu sao (*****) */}
              {showMaskChips && tokens.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-center">
                  {tokens.map((tok, idx) => {
                    const isRevealed = revealedIndices.has(idx) || submitted;
                    const displayMask = '*'.repeat(Math.max(tok.word.length, 1)) + tok.punctuation;
                    return (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full border text-xs md:text-sm font-mono transition-all select-none ${
                          isRevealed
                            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {isRevealed ? tok.full : displayMask}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Ô gõ câu & form submit */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={input}
                  onChange={e => {
                    if (submitted) return;
                    if (isJapanese) {
                      setInput(wanakana.toHiragana(e.target.value, { IMEMode: true }));
                    } else {
                      setInput(e.target.value);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (submitted) {
                        handleNext();
                      } else {
                        handleSubmit();
                      }
                    }
                  }}
                  disabled={submitted && isCorrect}
                  placeholder={isJapanese ? 'Nhập câu tiếng Nhật...' : 'Nhập câu tiếng Anh...'}
                  className={`w-full text-center text-lg md:text-xl font-medium p-4 rounded-2xl border-2 outline-none transition-all dark:bg-slate-700 dark:text-white ${
                    submitted
                      ? isCorrect
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'border-slate-200 dark:border-slate-600 focus:border-teal-500'
                  }`}
                />

                {!submitted ? (
                  <div className="space-y-2">
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Kiểm tra (Enter)
                    </button>
                    {showMaskChips && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">
                          Ctrl
                        </kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">
                          Space
                        </kbd>
                        <span>để mở từ tiếp theo</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Kết quả đúng */}
                    {isCorrect && (
                      <div className="p-4 rounded-2xl flex items-center justify-center gap-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-bold text-lg">
                        <CheckCircle2 size={22} />
                        <span>Chính xác! 🎉</span>
                      </div>
                    )}

                    {/* Kết quả sai kèm diff highlight */}
                    {!isCorrect && (
                      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-left space-y-2">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                          <XCircle size={18} />
                          <span>Chưa chính xác (câu này sẽ được đưa xuống cuối để luyện lại):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 font-mono text-sm pt-1">
                          {tokens.map((tok, tIdx) => {
                            const uWord = userWordsClean[tIdx];
                            const tWordClean = cleanTextForCompare(tok.word);
                            const isMatch = uWord === tWordClean;
                            return (
                              <span
                                key={tIdx}
                                className={`px-2 py-0.5 rounded border ${
                                  isMatch
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300'
                                    : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300'
                                }`}
                              >
                                {tok.full}
                              </span>
                            );
                          })}
                        </div>
                        <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                          Đáp án đúng:{' '}
                          <span className="font-bold text-slate-800 dark:text-white">
                            {current?.targetSentence}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Nút Tiếp theo */}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full py-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span>{currentIndex + 1 >= queue.length + (!isCorrect ? 1 : 0) ? '🏁 Xem kết quả' : 'Tiếp theo (Enter)'}</span>
                      <ArrowRight size={18} />
                    </button>
                  </motion.div>
                )}
              </form>
            </div>

            {/* Thống kê Đúng / Sai mini bên dưới chuẩn của Luyện tập */}
            <div className="flex justify-center gap-6 mt-4 text-sm font-bold">
              <span className="text-green-500 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Đúng: {score}
              </span>
              <span className="text-red-500 flex items-center gap-1.5">
                <XCircle size={16} /> Sai: {wrong}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
