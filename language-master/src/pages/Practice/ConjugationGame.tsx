// src/pages/Practice.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { vocabulary } from '../../data';
import type { Word } from '../../types';
import type { FormType } from '../../context/features/flashcard/FlashcardSettingsContext';
import { FORM_REGISTRY } from '../../lib/formRegistry';
import FlipCard from '../../components/FlashcardModule/FlipCard';
import SwipeableCard from '../../components/FlashcardModule/SwipeableCard';
import TypingChallenge from '../../components/FlashcardModule/TypingChallenge';
import EndlessControls from '../../components/FlashcardModule/EndlessControls';
import SettingsModal from '../../components/FlashcardModule/Settings/SettingsModal';
import { useFlashcardSettings } from '../../context/features/flashcard/useFlashcardSettings';
import { useSettings } from '../../context/global/useSettings';
import { BookOpen, Keyboard, AlertTriangle, CheckCircle, RotateCcw, Undo2, Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ──────────────────────────────────────────────────────────────
// CẤU TRÚC THẺ – hỗ trợ nhân chéo thể
// ──────────────────────────────────────────────────────────────
export interface QueueCard {
  uniqueId: string;
  word: Word;
  targetForms: FormType[];
  /** seed ổn định cho random-form, tạo lúc build queue – tránh double-random */
  randomSeed: number;
}

// ──────────────────────────────────────────────────────────────
// HELPER: random seed không trùng theo thẻ + offset
// ──────────────────────────────────────────────────────────────
const makeRandomSeed = (): number => Math.floor(Math.random() * 100000);

export default function Practice() {
  const { settings } = useFlashcardSettings();
  const { language } = useSettings();
  const isQuizMode = settings.playMode === 'quiz';

  const limit = settings.limit || 'all';
  const levels = settings.levels?.length ? settings.levels : ['N5'];
  const displayLogic = settings.displayLogic || 'mixed';
  const insertRange = settings.quizInsertRange ?? 3;

  const { handsFree, handsFreeFlipDelay, handsFreeNextDelay } = settings;

  const [mode, setMode] = useState<'flashcard' | 'typing'>('flashcard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Endless pool
  const [endlessPool, setEndlessPool] = useState<QueueCard[]>([]);
  const [endlessIndex, setEndlessIndex] = useState(0);

  // Quiz queue
  const [quizQueue, setQuizQueue] = useState<QueueCard[]>([]);
  const [quizTotal, setQuizTotal] = useState(0);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [lastAction, setLastAction] = useState<{ card: QueueCard; status: 'remember' | 'forget' } | null>(null);

  const navigate = useNavigate();

  // Chống double-click / lỗi nhảy điểm
  const isProcessingRef = useRef(false);

  // ── REF MIRROR QUEUE – dùng để đọc state đồng bộ trong handler ──
  // Tránh React Strict Mode double-invoke setState callbacks
  const quizQueueRef = useRef<QueueCard[]>([]);
  useEffect(() => { quizQueueRef.current = quizQueue; }, [quizQueue]);

  // ── BƯỚC 1: XÂY HÀNG ĐỢI ─────────────────────────────────
  const initData = useCallback(() => {
    let pool = vocabulary.filter(w => levels.includes(w.level));
    if (pool.length === 0) pool = vocabulary;

    // --- LỌC THEO LOẠI TỪ BẬT TRONG CÀI ĐẶT ---
    pool = pool.filter(w => (settings.wordTypes || ['verb', 'adj_i', 'adj_na', 'noun']).includes(w.type));

    // --- LỌC TỪ HỢP LỆ VỚI CÁC THỂ ĐÃ CHỌN ---
    const srcFd = FORM_REGISTRY.find(f => f.id === settings.sourceForm);
    pool = pool.filter(w => {
      // 1. Kiểm tra sourceForm
      if (srcFd && srcFd.validTypes && !srcFd.validTypes.includes(w.type)) return false;

      // 2. Kiểm tra targetForms
      if (settings.targetForms.length === 0) return true;
      const hasValidTarget = settings.targetForms.some(fId => {
        if (fId === 'random') return true;
        const fDef = FORM_REGISTRY.find(f => f.id === fId);
        if (!fDef || !fDef.validTypes) return true;
        return fDef.validTypes.includes(w.type);
      });
      return hasValidTarget;
    });

    if (pool.length === 0) {
      console.warn("Không có từ nào hợp lệ với các thể đã chọn!");
    }

    // Xáo trộn nguồn
    pool = [...pool].sort(() => Math.random() - 0.5);

    // Cắt giới hạn
    if (limit !== 'all') pool = pool.slice(0, Number(limit));

    // Nhân chéo thể
    let finalQueue: QueueCard[] = [];
    if (displayLogic === 'focused' && settings.targetForms.length > 0) {
      pool.forEach(word => {
        settings.targetForms.forEach(form => {
          if (form !== 'random') {
            const fDef = FORM_REGISTRY.find(f => f.id === form);
            if (fDef && fDef.validTypes && !fDef.validTypes.includes(word.type)) return; // Bỏ qua card này
          }

          finalQueue.push({
            uniqueId: `${word.id}-${form}-${Date.now()}-${Math.random()}`,
            word,
            targetForms: [form],
            randomSeed: makeRandomSeed(),
          });
        });
      });
    } else {
      finalQueue = pool.map(word => ({
        uniqueId: `${word.id}-mixed-${Date.now()}-${Math.random()}`,
        word,
        targetForms: settings.targetForms,
        randomSeed: makeRandomSeed(),
      }));
    }

    // Xáo trộn lại lần cuối
    finalQueue = finalQueue.sort(() => Math.random() - 0.5);

    if (isQuizMode) {
      setQuizQueue(finalQueue);
      setQuizTotal(finalQueue.length);
      setRememberedCount(0);
      setLastAction(null);
      setIsFinished(false);
    } else {
      setEndlessPool(finalQueue);
      setEndlessIndex(0);
    }
    setIsFlipped(false);
  }, [isQuizMode, levels, limit, settings.targetForms, displayLogic, insertRange]);

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCard = isQuizMode ? quizQueue[0] : endlessPool[endlessIndex];

  // ── LOGIC ENDLESS ─────────────────────────────────────────
  const handleEndlessNext = useCallback(() => {
    setIsFlipped(false);
    setEndlessPool(prev => {
      if (prev.length === 0) return prev;
      return prev; // pool không đổi, chỉ đổi index
    });
    setEndlessIndex(prev => {
      const len = endlessPool.length;
      if (len <= 1) return 0;
      // tạo index mới, khác index hiện tại
      let next: number;
      let tries = 0;
      do {
        next = Math.floor(Math.random() * len);
        tries++;
      } while (next === prev && tries < 20);
      return next;
    });
  }, [endlessPool.length]);

  // ── LOGIC HANDS-FREE (ENDLESS) ────────────────────────────
  useEffect(() => {
    if (isQuizMode || !handsFree || isSettingsOpen || mode !== 'flashcard' || !currentCard)
      return;

    let timer: ReturnType<typeof setTimeout>;

    if (!isFlipped) {
      // Chờ flip
      timer = setTimeout(() => {
        setIsFlipped(true);
      }, (handsFreeFlipDelay || 3) * 1000);
    } else {
      // Chờ sang thẻ
      timer = setTimeout(() => {
        handleEndlessNext();
      }, (handsFreeNextDelay || 4) * 1000);
    }

    return () => clearTimeout(timer);
  }, [
    isQuizMode, handsFree, isSettingsOpen, mode,
    currentCard, isFlipped, handsFreeFlipDelay, handsFreeNextDelay,
    handleEndlessNext
  ]);

  // ── LOGIC QUIZ ────────────────────────────────────────────
  // QUAN TRỌNG: Không đặt BẤT KỲ side effect nào (setState khác)
  // bên trong callback của setQuizQueue. React Strict Mode double-invoke
  // callback đó → mọi setState lồng bên trong sẽ chạy 2 lần.
  // Giải pháp: đọc state qua quizQueueRef (đồng bộ), tính hết, rồi
  // gọi từng setState riêng lẻ bên ngoài.
  const handleQuizSwipe = useCallback((isRemembered: boolean) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsFlipped(false);

    // Đọc queue hiện tại qua ref (không bị double-invoke)
    const prev = quizQueueRef.current;
    if (prev.length === 0) {
      isProcessingRef.current = false;
      return;
    }

    const card = prev[0];
    const rest = prev.slice(1);

    // Cập nhật lastAction (side effect – gọi ngoài setter)
    setLastAction({ card, status: isRemembered ? 'remember' : 'forget' });

    if (isRemembered) {
      // Tính count MỚI ngay tại đây, gọi trực tiếp
      setRememberedCount(c => c + 1);
      setQuizQueue(rest);
      if (rest.length === 0) setIsFinished(true);
    } else {
      if (rest.length === 0) {
        setQuizQueue([card]);
      } else {
        const maxInsert = Math.min(insertRange, rest.length);
        const insertIdx = Math.floor(Math.random() * maxInsert) + 1;
        const newQueue = [...rest];
        newQueue.splice(insertIdx, 0, card);
        setQuizQueue(newQueue);
      }
    }

    // Mở khóa sau 300ms
    setTimeout(() => { isProcessingRef.current = false; }, 300);
  }, [insertRange]);

  const handleUndo = () => {
    if (!lastAction) return;
    setIsFlipped(false);
    setQuizQueue(prev => {
      let restoredQueue = [...prev];
      if (lastAction.status === 'remember') {
        setRememberedCount(c => Math.max(0, c - 1));
        setIsFinished(false);
      } else {
        restoredQueue = restoredQueue.filter(c => c.uniqueId !== lastAction.card.uniqueId);
      }
      return [lastAction.card, ...restoredQueue];
    });
    setLastAction(null);
  };

  // ── PHÍM TẮT TÁCH BIỆT THEO MODE ─────────────────────────
  useEffect(() => {
    if (!settings.keybindsEnabled || isSettingsOpen || mode !== 'flashcard') return;
    if (!isQuizMode && !currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Chặn input / textarea
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
        return;
      }

      if (isQuizMode && !isFinished) {
        // Quiz: 1 = Quên, 2 = Nhớ, Z = Undo
        if (e.code === 'Digit1' || e.code === 'Numpad1') { e.preventDefault(); handleQuizSwipe(false); }
        else if (e.code === 'Digit2' || e.code === 'Numpad2') { e.preventDefault(); handleQuizSwipe(true); }
        else if (e.code === 'KeyZ') { e.preventDefault(); handleUndo(); }
      } else if (!isQuizMode) {
        // Random: → hoặc Enter = thẻ mới
        if (e.code === 'ArrowRight' || e.code === 'Enter') { e.preventDefault(); handleEndlessNext(); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    settings.keybindsEnabled, isSettingsOpen, isQuizMode,
    isFinished, mode, currentCard, handleQuizSwipe, handleEndlessNext, lastAction,
  ]);

  // ── LABELS tuỳ ngôn ngữ ───────────────────────────────────
  const t = language === 'en'
    ? { flip: 'Flashcard', type: 'Typing', forget: 'Forgot', remember: 'Knew it', newRound: 'New Round', done: 'Done!', doneDesc: 'Memorized 100%', modeLabel: (m: string) => m === 'quiz' ? '🎯 Quiz' : '🎲 Random' }
    : { flip: 'Lật thẻ', type: 'Nhập liệu', forget: 'Quên', remember: 'Nhớ', newRound: 'Vòng mới', done: 'Hoàn thành!', doneDesc: 'Đã nhớ 100%', modeLabel: (m: string) => m === 'quiz' ? '🎯 Quiz' : '🎲 Random' };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center py-4 px-4 transition-colors">
      {/* HEADER */}
      <div className="w-full max-w-md mb-3 space-y-4">
        <button 
          onClick={() => navigate('/course/verb-conjugation/practice')} 
          className="group flex items-center text-slate-500 hover:text-indigo-600 font-semibold mb-2 transition-colors"
        >
          <ArrowLeft className="mr-2 h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Quay lại Dashboard
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            {language === 'en' ? 'Practice' : 'Ôn Tập Phản Xạ'}
          </h1>
          {/* Mode badge */}
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isQuizMode
            ? 'bg-orange-50 border-orange-300 text-orange-600 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400'
            : 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400'
            }`}>
            {t.modeLabel(settings.playMode)}
          </span>
        </div>

        {/* Tab lật thẻ / nhập liệu */}
        <div className="flex bg-gray-200 dark:bg-slate-700 p-1 rounded-xl">
          <button
            onClick={() => setMode('flashcard')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${mode === 'flashcard' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <BookOpen size={18} /> {t.flip}
          </button>
          <button
            onClick={() => setMode('typing')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${mode === 'typing' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Keyboard size={18} /> {t.type}
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[400px] px-3">
        {mode === 'flashcard' ? (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">

            {/* QUIZ – Màn hoàn thành */}
            {isQuizMode && isFinished ? (
              <div className="w-80 h-96 sm:w-96 sm:h-[26rem] bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 text-center border-2 border-green-200 dark:border-green-800">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.done}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  {t.doneDesc} ({quizTotal}/{quizTotal})
                </p>
                <div className="flex gap-4">
                  {lastAction && (
                    <button onClick={handleUndo} className="p-4 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 shadow-md transition-colors">
                      <Undo2 size={20} />
                    </button>
                  )}
                  <button onClick={initData} className="flex items-center gap-2 px-8 py-4 bg-slate-800 dark:bg-slate-600 text-white font-bold rounded-full hover:bg-slate-700 shadow-lg transition-colors">
                    <RotateCcw size={20} /> {t.newRound}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {currentCard && (
                  <SwipeableCard
                    key={`swipe-${currentCard.uniqueId}`}
                    dragEnabled={isQuizMode}
                    onSwipeLeft={() => handleQuizSwipe(false)}
                    onSwipeRight={() => handleQuizSwipe(true)}
                    onFlip={() => setIsFlipped(!isFlipped)}
                  >
                    <div className="w-full">
                      <FlipCard
                        word={currentCard.word}
                        isFlipped={isFlipped}
                        targetFormsOverride={currentCard.targetForms}
                        cardSeed={currentCard.randomSeed}
                      />
                    </div>
                  </SwipeableCard>
                )}

                {/* QUIZ CONTROLS */}
                {isQuizMode ? (
                  <div className="w-full flex flex-col items-center mt-4">
                    {/* Thanh tiến độ */}
                    <div className="w-full max-w-sm flex items-center gap-3 mb-3">
                      <div className="text-xs font-bold text-slate-400 w-8">{rememberedCount}</div>
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-500 ease-out"
                          style={{ width: quizTotal > 0 ? `${(rememberedCount / quizTotal) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-400 w-8 text-right">{quizTotal}</div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleUndo}
                        disabled={!lastAction}
                        title="Undo (Z)"
                        className={`p-3 rounded-xl shadow-md border transition-all ${lastAction ? 'bg-white dark:bg-slate-700 text-orange-500 border-orange-200 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed'}`}
                      >
                        <Undo2 size={20} />
                      </button>
                      <button
                        onClick={() => handleQuizSwipe(false)}
                        title="Quên (1)"
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 text-red-600 px-6 py-3 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 shadow-md border border-red-100 dark:border-red-900 transition-colors"
                      >
                        <AlertTriangle size={18} /> {t.forget} <span className="text-xs opacity-50 ml-1">[1]</span>
                      </button>
                      <button
                        onClick={() => handleQuizSwipe(true)}
                        title="Nhớ (2)"
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 text-green-700 dark:text-green-400 px-6 py-3 rounded-xl font-medium hover:bg-green-50 dark:hover:bg-green-900/20 shadow-md border border-green-100 dark:border-green-900 transition-colors"
                      >
                        <CheckCircle size={18} /> {t.remember} <span className="text-xs opacity-50 ml-1">[2]</span>
                      </button>
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md border border-slate-200 dark:border-slate-700 transition-colors"
                        title={language === 'en' ? 'Settings' : 'Cài đặt'}
                      >
                        <Settings size={18} />
                      </button>
                    </div>

                    {/* Hint phím tắt Quiz */}
                    {settings.keybindsEnabled && (
                      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">Space</kbd> Lật &nbsp;
                        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">1</kbd> Quên &nbsp;
                        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">2</kbd> Nhớ &nbsp;
                        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">Z</kbd> Undo
                      </p>
                    )}
                  </div>
                ) : (
                  // ENDLESS CONTROLS
                  <div className="flex flex-col items-center mt-4 gap-3">
                    <EndlessControls onNext={handleEndlessNext} onOpenSettings={() => setIsSettingsOpen(true)} />
                    {/* Hint phím tắt Random */}
                    {settings.keybindsEnabled && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">Space</kbd> Lật &nbsp;
                        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">→</kbd>/<kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-xs">Enter</kbd> Thẻ mới
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            {isQuizMode && isFinished ? (
              <div className="w-80 h-96 sm:w-96 sm:h-[26rem] bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 text-center border-2 border-green-200 dark:border-green-800">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.done}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  {t.doneDesc} ({quizTotal}/{quizTotal})
                </p>
                <div className="flex gap-4">
                  {lastAction && (
                    <button onClick={handleUndo} className="p-4 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 shadow-md transition-colors">
                      <Undo2 size={20} />
                    </button>
                  )}
                  <button onClick={initData} className="flex items-center gap-2 px-8 py-4 bg-slate-800 dark:bg-slate-600 text-white font-bold rounded-full hover:bg-slate-700 shadow-lg transition-colors">
                    <RotateCcw size={20} /> {t.newRound}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {currentCard && (
                  <TypingChallenge
                    word={currentCard.word}
                    targetFormsOverride={currentCard.targetForms}
                    cardSeed={currentCard.randomSeed}
                    onCorrect={() => handleQuizSwipe(true)}
                    onWrong={() => handleQuizSwipe(false)}
                    onNextEndless={handleEndlessNext}
                    isQuizMode={isQuizMode}
                  />
                )}
                {isQuizMode ? (
                  <div className="w-full flex flex-col items-center mt-4">
                    <div className="w-full max-w-sm flex items-center gap-3 mb-3">
                      <div className="text-xs font-bold text-slate-400 w-8">{rememberedCount}</div>
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-500 ease-out"
                          style={{ width: quizTotal > 0 ? `${(rememberedCount / quizTotal) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-400 w-8 text-right">{quizTotal}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center mt-4 gap-3">
                    <EndlessControls onNext={handleEndlessNext} onOpenSettings={() => setIsSettingsOpen(true)} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false); initData(); }}
      />
    </div>
  );
}