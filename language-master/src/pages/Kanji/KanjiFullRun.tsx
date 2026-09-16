// src/pages/Kanji/KanjiFullRun.tsx — Toàn Diện (v3)
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Flame, Heart } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';
import type { Kanji } from '../../types';
import {
  calculateMaxPossibleExp,
} from '../../lib/rankSystem';
import shortcuts from '../../data/jlpt/core/shortcuts.json';
import * as wanakana from 'wanakana';

// Import local components and types
import {
  LEVEL_CONFIG,
  TIME_LIMITS,
  BASE_SCORES,
  buildQuestions,
  matchKey,
  KbHints,
} from './components/KanjiCommon';
import type {
  Level,
  AttemptRecord,
  FlatWord,
  QuizQ,
  HanVietQ,
  TypingQ,
  FlashQ,
  ErrorQ,
  MatchQ
} from './components/KanjiCommon';

import KanjiSetup from './components/KanjiSetup';
import KanjiResult from './components/KanjiResult';
import KanjiQuiz from './components/KanjiQuiz';
import KanjiTyping from './components/KanjiTyping';
import KanjiFlashcard from './components/KanjiFlashcard';
import KanjiError from './components/KanjiError';
import KanjiMatching from './components/KanjiMatching';

const RESULT_SECS = 5;

function buildFlatWords(data: Kanji[]): FlatWord[] {
  const flat: FlatWord[] = [];
  data.forEach(k => k.words.forEach(w => flat.push({ kanji: k, word: w })));
  return flat;
}

export default function KanjiFullRun() {
  const navigate = useNavigate();
  const { course } = usePracticeContext();
  const data = course.data as Kanji[];
  const flatWords = useMemo(() => buildFlatWords(data), [data]);
  const BACK_PATH = `/course/${course.id}/practice`;

  // Setup state
  const [level, setLevel] = useState<Level>('normal');
  const [runMode, setRunMode] = useState<'vocab' | 'character'>('vocab');
  const [showKana, setShowKana] = useState(false);
  const [started, setStarted] = useState(false);
  const [seed, setSeed] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [sessionHintsUsed, setSessionHintsUsed] = useState(0);

  const lvl = LEVEL_CONFIG[level];

  // Game state
  const questions = useMemo(() => buildQuestions(flatWords, data, { totalQ: lvl.questions, runMode }), [flatWords, data, lvl.questions, seed, runMode]);
  const maxExp = useMemo(() => calculateMaxPossibleExp(questions, level, lvl.blitzSecs, 'kanji'), [questions, level, lvl.blitzSecs]);
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(lvl.blitzSecs);
  const [hintCount, setHintCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [done, setDone] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);

  // Per-question state
  const [typingInput, setTypingInput] = useState('');
  const [typingSubmitted, setTypingSubmitted] = useState(false);
  const [typingCorrect, setTypingCorrect] = useState(false);
  const [typingHintShown, setTypingHintShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);

  const [flashFlipped, setFlashFlipped] = useState(false);

  const [errorSelected, setErrorSelected] = useState<boolean | null>(null);
  const [errorCorrect, setErrorCorrect] = useState<boolean | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [matchCorrectCount, setMatchCorrectCount] = useState(0);
  const [matchWrongCount, setMatchWrongCount] = useState(0);
  const [blitzPaused, setBlitzPaused] = useState(false);

  const pendingAdvanceRef = useRef<{ correct: boolean; added: number; baseScore?: number } | null>(null);
  const commitAdvanceRef = useRef<() => void>(() => {});
  const forceTimeoutRef = useRef(false);

  const currentQ = questions[qIdx];
  const totalQ = questions.length;
  const [qTimeLeft, setQTimeLeft] = useState<number | null>(null);

  // Timer (Global only ticks in Normal mode)
  useEffect(() => {
    if (!started || level !== 'normal' || done || blitzPaused) return;
    if (timeLeft <= 0) { setDone(true); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, level, timeLeft, done, blitzPaused]);

  // QTimer Setup
  useEffect(() => {
    if (level === 'hard' && started && currentQ && !done) {
      setQTimeLeft(TIME_LIMITS[currentQ.type]);
    } else {
      setQTimeLeft(null);
    }
  }, [qIdx, started, level, currentQ, done]);

  // QTimer Tick
  useEffect(() => {
    if (level !== 'hard' || !started || done || blitzPaused || qTimeLeft === null || qTimeLeft <= 0) return;
    const t = setTimeout(() => setQTimeLeft(s => s! - 1), 1000);
    return () => clearTimeout(t);
  }, [qTimeLeft, level, started, done, blitzPaused]);

  const resetQ = useCallback(() => {
    setTypingInput(''); setTypingSubmitted(false); setTypingCorrect(false); setTypingHintShown(false);
    setQuizSelected(null); setQuizCorrect(null);
    setFlashFlipped(false);
    setErrorSelected(null); setErrorCorrect(null);
    setMatchCorrectCount(0); setMatchWrongCount(0);
    setCountdown(null); setBlitzPaused(false); pendingAdvanceRef.current = null;
    forceTimeoutRef.current = false;
    setQTimeLeft(null);
    setShowKana(level === 'easy');
    setHintUsed(false);
  }, [level]);

  const advance = useCallback((wasCorrect: boolean, addedCorrect = 1, customBaseScore?: number) => {
    // Collect Attempt record
    let userAnswer = '';
    let correctAnswer = '';
    let promptText = '';

    if (currentQ) {
      if (currentQ.type === 'quiz' || currentQ.type === 'hanviet_quiz') {
        const q = currentQ as QuizQ | HanVietQ;
        const userOpt = q.options.find(o => o.id === quizSelected);
        userAnswer = userOpt ? userOpt.label : (quizSelected === 'timeout' ? 'Hết giờ' : 'Chưa chọn');
        const correctOpt = q.options.find(o => o.id === q.correctId);
        correctAnswer = correctOpt ? correctOpt.label : '';
        promptText = q.prompt + (q.promptSub ? ` (${q.promptSub})` : '');
      } else if (currentQ.type === 'typing') {
        const q = currentQ as TypingQ;
        userAnswer = typingInput.trim() || 'Chưa nhập (Hết giờ)';
        correctAnswer = q.answerDisplay;
        promptText = q.prompt;
      } else if (currentQ.type === 'flashcard') {
        const q = currentQ as FlashQ;
        userAnswer = wasCorrect ? 'Nhớ rồi' : 'Chưa nhớ';
        correctAnswer = q.back;
        promptText = q.front;
      } else if (currentQ.type === 'error') {
        const q = currentQ as ErrorQ;
        userAnswer = errorSelected === null ? 'Chưa chọn (Hết giờ)' : (errorSelected ? 'Đúng' : 'Sai');
        correctAnswer = q.isCorrect ? 'Đúng' : 'Sai';
        promptText = `${q.word} (${q.hiragana}) -> ${q.displayedMeaning}`;
      } else if (currentQ.type === 'matching') {
        userAnswer = `${matchWrongCount} lần sai`;
        correctAnswer = '0 lần sai';
        promptText = 'Nối cặp từ (8 cặp)';
      }

      const attempt: AttemptRecord = {
        qId: currentQ.id,
        type: currentQ.type,
        prompt: promptText,
        userAnswer,
        correctAnswer,
        isCorrect: wasCorrect,
        explanation: currentQ.explanation,
      };
      setAttempts(prev => [...prev, attempt]);
    }

    if (wasCorrect) {
      setCorrect(c => c + addedCorrect);
      const base = customBaseScore !== undefined ? customBaseScore : BASE_SCORES[currentQ.type];
      const multiplier = level === 'easy' ? 1.0 : level === 'normal' ? 1.5 : 2.5;
      let earned = base * multiplier;
      if (level === 'hard' && qTimeLeft !== null) {
        earned += (qTimeLeft * 3);
      }
      if (hintUsed) {
        const penalty = level === 'hard' ? 5 : 2;
        earned = earned * (1 - penalty / 100);
      }
      setScore(s => s + Math.round(earned));

      if (level !== 'easy') {
        setCurrentStreak(s => { const ns = s + 1; setMaxStreak(m => Math.max(m, ns)); return ns; });
      }
    } else {
      if (level !== 'easy') setCurrentStreak(0);
      if (level === 'hard') {
        setLives(l => {
          const nl = l - 1;
          if (nl <= 0) setDone(true);
          return nl;
        });
      }
    }

    setQIdx(prev => {
      const next = prev + 1;
      if (next >= totalQ || (level === 'easy' && next >= lvl.questions)) {
        setDone(true);
      }
      return next;
    });
    resetQ();
  }, [level, currentQ, qTimeLeft, hintUsed, totalQ, lvl.questions, quizSelected, typingInput, errorSelected, matchCorrectCount, matchWrongCount, resetQ]);

  const commitAdvance = useCallback(() => {
    const pa = pendingAdvanceRef.current;
    pendingAdvanceRef.current = null;
    setBlitzPaused(false);
    setCountdown(null);
    if (pa !== null) advance(pa.correct, pa.added, pa.baseScore);
  }, [advance]);

  commitAdvanceRef.current = commitAdvance;

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { commitAdvanceRef.current(); return; }
    const t = setTimeout(() => setCountdown(c => c !== null ? c - 1 : null), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function triggerResult(correct: boolean, added = 1, baseScore?: number) {
    pendingAdvanceRef.current = { correct, added, baseScore };
    setCountdown(RESULT_SECS);
    setBlitzPaused(true);
  }

  // Handle QTimer timeout
  useEffect(() => {
    if (level === 'hard' && qTimeLeft === 0 && !blitzPaused && !forceTimeoutRef.current && currentQ) {
      forceTimeoutRef.current = true;
      if (currentQ.type === 'typing') { setTypingSubmitted(true); setTypingCorrect(false); triggerResult(false, 0, 0); }
      else if (currentQ.type === 'quiz' || currentQ.type === 'hanviet_quiz') { setQuizSelected('timeout'); setQuizCorrect(false); triggerResult(false, 0, 0); }
      else if (currentQ.type === 'error') { setErrorSelected(false); setErrorCorrect(false); triggerResult(false, 0, 0); }
      else if (currentQ.type === 'flashcard') { setFlashFlipped(true); triggerResult(false, 0, 0); }
      else if (currentQ.type === 'matching') {
        const isPass = matchCorrectCount >= 4;
        const baseScore = Math.max(0, matchCorrectCount * 5 - matchWrongCount * 3);
        advance(isPass, isPass ? 1 : 0, baseScore);
      }
    }
  }, [qTimeLeft, level, blitzPaused, currentQ, matchCorrectCount, matchWrongCount, advance]);

  // Auto-focus typing
  useEffect(() => {
    if (started && currentQ?.type === 'typing') setTimeout(() => inputRef.current?.focus(), 250);
  }, [qIdx, started, currentQ?.type]);

  // Keyboard shortcuts coordinator
  useEffect(() => {
    if (!started || done || !currentQ) return;
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLInputElement;
      const isActiveInput = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.disabled;
      if (isActiveInput) return;

      if (matchKey(e.key, shortcuts.general.next) && countdown !== null) {
        e.preventDefault();
        commitAdvanceRef.current();
        return;
      }

      const isQuizType = currentQ.type === 'quiz' || currentQ.type === 'hanviet_quiz';
      if (isQuizType && !quizSelected) {
        const q = currentQ as QuizQ | HanVietQ;
        const keyIdx = shortcuts.quiz.findIndex(k => matchKey(e.key, k));
        if (keyIdx !== -1 && keyIdx < q.options.length) {
          const opt = q.options[keyIdx];
          const correct = opt.id === q.correctId;
          setQuizSelected(opt.id); setQuizCorrect(correct);
          triggerResult(correct);
        }
      }
      if (currentQ.type === 'flashcard') {
        if (matchKey(e.key, shortcuts.flashcard.flip)) { e.preventDefault(); setFlashFlipped(f => !f); }
        if (matchKey(e.key, shortcuts.flashcard.notRemembered) && flashFlipped) { e.preventDefault(); advance(false); }
        if (matchKey(e.key, shortcuts.flashcard.remembered) && flashFlipped) { e.preventDefault(); advance(true); }
      }
      if (currentQ.type === 'error' && errorSelected === null) {
        if (matchKey(e.key, shortcuts.error.wrong)) {
          const ok = !(currentQ as ErrorQ).isCorrect;
          setErrorSelected(false); setErrorCorrect(ok); triggerResult(ok);
        }
        if (matchKey(e.key, shortcuts.error.correct)) {
          const ok = (currentQ as ErrorQ).isCorrect;
          setErrorSelected(true); setErrorCorrect(ok); triggerResult(ok);
        }
      }
      if (currentQ.type === 'typing') {
        if (matchKey(e.key, shortcuts.general.next) && typingSubmitted) { e.preventDefault(); commitAdvanceRef.current(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, done, currentQ, quizSelected, flashFlipped, errorSelected, typingSubmitted, countdown, advance]);

  const startGame = useCallback(() => {
    setSeed(s => s + 1);
    setStarted(true); setQIdx(0); setCorrect(0); setScore(0); setMaxStreak(0); setCurrentStreak(0);
    setTimeLeft(lvl.blitzSecs); setHintCount(0); setLives(3); setDone(false);
    setSessionHintsUsed(0);
    setAttempts([]);
    setShowKana(level === 'easy');
    resetQ();
  }, [lvl.blitzSecs, level, resetQ]);

  if (!started) {
    return (
      <KanjiSetup
        level={level}
        setLevel={setLevel}
        runMode={runMode}
        setRunMode={setRunMode}
        startGame={startGame}
        onBack={() => navigate(BACK_PATH)}
      />
    );
  }

  if (done) {
    return (
      <KanjiResult
        score={score}
        correct={correct}
        total={totalQ}
        streak={maxStreak}
        timeLeft={level !== 'easy' ? timeLeft : undefined}
        level={level}
        hintCount={hintCount}
        maxExp={maxExp}
        attempts={attempts}
        onRetry={() => setStarted(false)}
        onBack={() => navigate(BACK_PATH)}
        runMode={runMode}
      />
    );
  }

  const progress = (qIdx / totalQ) * 100;
  const isQuizType = currentQ.type === 'quiz' || currentQ.type === 'hanviet_quiz';
  const isLivesCritical = level === 'hard' && lives === 1;
  const isAnswered =
    (currentQ.type === 'quiz' && !!quizSelected) ||
    (currentQ.type === 'hanviet_quiz' && !!quizSelected) ||
    (currentQ.type === 'typing' && typingSubmitted) ||
    (currentQ.type === 'flashcard' && flashFlipped) ||
    (currentQ.type === 'error' && errorSelected !== null);

  return (
    <div className={`min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-500 ${isLivesCritical ? 'ring-[4px] ring-red-500/50 ring-inset' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <button onClick={() => setDone(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 text-sm">
          {level === 'normal' && (
            <div className={`flex items-center gap-1 font-bold ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-300'}`}>
              <Clock size={13} /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          )}
          {level === 'hard' && qTimeLeft !== null && (
            <div className={`flex items-center gap-1 font-black ${qTimeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
              <Clock size={13} /> {qTimeLeft}s
            </div>
          )}
          {level !== 'easy' && (
            <div className="flex items-center gap-1 font-bold text-orange-500"><Flame size={13} /> {currentStreak}</div>
          )}
          {level === 'hard' && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map(i => (
                <motion.div key={i} animate={i <= lives ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.3 }}>
                  <Heart size={16} className={i <= lives ? "text-red-500 fill-red-500 drop-shadow-sm" : "text-slate-200 dark:text-slate-700"} />
                </motion.div>
              ))}
            </div>
          )}
          <div className="text-slate-500 dark:text-slate-400 font-medium">{qIdx + 1}/{totalQ}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-200 dark:bg-slate-700">
        <motion.div className="h-full bg-amber-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Per-Q Timer Bar (Hard mode only) */}
      {level === 'hard' && qTimeLeft !== null && (
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 relative">
          <motion.div
            className={`h-full absolute left-0 top-0 ${qTimeLeft <= 3 ? 'bg-red-500' : 'bg-orange-500'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${(qTimeLeft / TIME_LIMITS[currentQ.type]) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      )}

      {/* Type badge + kb hints */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
            {currentQ.type === 'quiz' ? '📝 Từ vựng' : currentQ.type === 'hanviet_quiz' ? '🈴 Hán Việt' : currentQ.type === 'typing' ? '⌨️ Nhập liệu' : currentQ.type === 'flashcard' ? '🃏 Lật thẻ' : currentQ.type === 'error' ? '🔍 Tìm lỗi sai' : '🔗 Nối từ'}
          </span>
          {level !== 'easy' && currentQ.type !== 'matching' && (
            <button
              type="button"
              disabled={showKana || typingHintShown || isAnswered || (level === 'hard' && sessionHintsUsed >= 2)}
              onClick={() => {
                setShowKana(true);
                setTypingHintShown(true);
                setHintUsed(true);
                setHintCount(c => c + 1);
                if (level === 'hard') {
                  setSessionHintsUsed(c => c + 1);
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                (showKana || typingHintShown)
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-default border border-slate-200 dark:border-slate-700'
                  : level === 'hard' && sessionHintsUsed >= 2
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100'
              }`}
            >
              {showKana || typingHintShown ? (
                '💡 Đã gợi ý'
              ) : level === 'hard' ? (
                `💡 Gợi ý (${2 - sessionHintsUsed} lượt -5%)`
              ) : (
                `💡 Gợi ý (-2%)`
              )}
            </button>
          )}
        </div>
        <KbHints type={currentQ.type} />
      </div>

      {/* Question rendering */}
      <div className="flex-1 px-4 py-2">
        <AnimatePresence mode="wait">
          <motion.div key={currentQ.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.18 }}>
            
            {isQuizType && (
              <KanjiQuiz
                q={currentQ as QuizQ | HanVietQ}
                showKana={showKana}
                quizSelected={quizSelected}
                quizCorrect={quizCorrect}
                onSelect={(optId, ok) => {
                  setQuizSelected(optId);
                  setQuizCorrect(ok);
                  triggerResult(ok);
                }}
                countdown={countdown}
                onNext={commitAdvance}
                resultSecs={RESULT_SECS}
              />
            )}

            {currentQ.type === 'typing' && (
              <KanjiTyping
                q={currentQ as TypingQ}
                typingInput={typingInput}
                setTypingInput={setTypingInput}
                typingSubmitted={typingSubmitted}
                typingCorrect={typingCorrect}
                typingHintShown={typingHintShown}
                inputRef={inputRef}
                onSubmit={e => {
                  e.preventDefault();
                  if (typingSubmitted) return;
                  const ans = (currentQ as TypingQ).answer.trim().toLowerCase();
                  const ok = typingInput.trim() !== '' && 
                    (typingInput.trim().toLowerCase() === ans || 
                     wanakana.toHiragana(typingInput.trim()) === wanakana.toHiragana(ans));
                  setTypingCorrect(ok);
                  setTypingSubmitted(true);
                  triggerResult(ok);
                }}
                countdown={countdown}
                onNext={commitAdvance}
                resultSecs={RESULT_SECS}
              />
            )}

            {currentQ.type === 'flashcard' && (
              <KanjiFlashcard
                q={currentQ as FlashQ}
                showKana={showKana}
                flashFlipped={flashFlipped}
                setFlashFlipped={setFlashFlipped}
                onAnswer={ok => advance(ok)}
                urgent={level === 'hard' && qTimeLeft !== null && qTimeLeft <= 2}
              />
            )}

            {currentQ.type === 'error' && (
              <KanjiError
                q={currentQ as ErrorQ}
                showKana={showKana}
                errorSelected={errorSelected}
                errorCorrect={errorCorrect}
                onSelect={(choice, ok) => {
                  setErrorSelected(choice);
                  setErrorCorrect(ok);
                  triggerResult(ok);
                }}
                countdown={countdown}
                onNext={commitAdvance}
                resultSecs={RESULT_SECS}
              />
            )}

            {currentQ.type === 'matching' && (
              <KanjiMatching
                q={currentQ as MatchQ}
                showKana={showKana}
                level={level}
                onStateChange={(c, w) => {
                  setMatchCorrectCount(c);
                  setMatchWrongCount(w);
                }}
                onDone={(c, w) => {
                  const isPass = level === 'hard' ? (c >= 4) : (c > 0);
                  const penalty = level === 'hard' ? 3 : level === 'normal' ? 2 : 1;
                  const baseScore = Math.max(0, c * 5 - w * penalty);
                  advance(isPass, isPass ? 1 : 0, baseScore);
                }}
              />
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
