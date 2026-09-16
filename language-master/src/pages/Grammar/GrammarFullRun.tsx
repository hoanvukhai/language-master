// src/pages/Grammar/GrammarFullRun.tsx — Toàn Diện (v3)
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Flame, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '../../context/global/useSettings';
import {
  calculateMaxPossibleExp
} from '../../lib/rankSystem';
import { useAuth } from '../../context/auth/useAuth';
import { syncPersonalHighScore } from '../../lib/srs/firestoreSync';
import shortcuts from '../../data/jlpt/core/shortcuts.json';

// Import local components and types
import {
  LEVEL_CONFIG,
  TIME_LIMITS,
  BASE_SCORES,
  buildQuestions,
  matchKey,
  KbHints,
} from './components/GrammarCommon';
import type {
  Level,
  AttemptRecord,
  QuizQ,
  FillBlankQ,
  FlashQ,
  ErrorQ,
  MatchQ
} from './components/GrammarCommon';

import GrammarSetup from './components/GrammarSetup';
import GrammarResult from './components/GrammarResult';
import GrammarQuiz from './components/GrammarQuiz';
import GrammarFlashcard from './components/GrammarFlashcard';
import GrammarError from './components/GrammarError';
import GrammarMatching from './components/GrammarMatching';

const BACK_PATH = '/practice/grammar';
const RESULT_SECS = 5;

export default function GrammarFullRun() {
  const navigate = useNavigate();
  const { language } = useSettings();
  const { user } = useAuth();

  // Setup state
  const [level, setLevel] = useState<Level>('normal');
  const [showKana, setShowKana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [started, setStarted] = useState(false);
  const [seed, setSeed] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);

  const lvl = LEVEL_CONFIG[level];

  // Game state
  const questions = useMemo(() => buildQuestions({ totalQ: lvl.questions, language }), [lvl.questions, seed, language]);
  const maxExp = useMemo(() => calculateMaxPossibleExp(questions, level, lvl.blitzSecs, 'grammar'), [questions, level, lvl.blitzSecs]);
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

  // Sync high score to Firestore when done
  useEffect(() => {
    if (done && user && score > 0) {
      syncPersonalHighScore(user.uid, 'grammar_fullrun', score);
    }
  }, [done, user, score]);

  // Per-question state
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

  // Initialize settings on start based on level
  useEffect(() => {
    if (started) {
      setShowKana(level === 'easy');
      setShowTranslation(level === 'easy');
    }
  }, [started, level]);

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
    setQuizSelected(null); setQuizCorrect(null);
    setFlashFlipped(false);
    setErrorSelected(null); setErrorCorrect(null);
    setMatchCorrectCount(0); setMatchWrongCount(0);
    setCountdown(null); setBlitzPaused(false); pendingAdvanceRef.current = null;
    forceTimeoutRef.current = false;
    setQTimeLeft(null);
    setHintUsed(false);
  }, []);

  const advance = useCallback((wasCorrect: boolean, addedCorrect = 1, customBaseScore?: number) => {
    // Collect Attempt record
    let userAnswer = '';
    let correctAnswer = '';
    let promptText = '';

    if (currentQ) {
      if (currentQ.type === 'quiz' || currentQ.type === 'fill_blank') {
        const q = currentQ as QuizQ | FillBlankQ;
        const userOpt = q.options.find(o => o.id === quizSelected);
        userAnswer = userOpt ? userOpt.label : (quizSelected === 'timeout' ? 'Hết giờ' : 'Chưa chọn');
        const correctOpt = q.options.find(o => o.id === q.correctId);
        correctAnswer = correctOpt ? correctOpt.label : '';
        promptText = q.type === 'fill_blank' ? (q as FillBlankQ).blankedSentence : (q as QuizQ).prompt;
      } else if (currentQ.type === 'flashcard') {
        const q = currentQ as FlashQ;
        userAnswer = wasCorrect ? 'Nhớ rồi' : 'Chưa nhớ';
        correctAnswer = q.back;
        promptText = q.front;
      } else if (currentQ.type === 'error') {
        const q = currentQ as ErrorQ;
        userAnswer = errorSelected === null ? 'Chưa chọn (Hết giờ)' : (errorSelected ? 'Đúng' : 'Sai');
        correctAnswer = q.isCorrect ? 'Đúng' : 'Sai';
        promptText = q.isCorrect ? q.correctSentence.replace(/[<>]/g, '') : q.wrongSentence.replace(/[<>]/g, '');
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
  }, [level, currentQ, qTimeLeft, hintUsed, totalQ, lvl.questions, quizSelected, errorSelected, matchCorrectCount, matchWrongCount, resetQ]);

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
      if (currentQ.type === 'quiz' || currentQ.type === 'fill_blank') { setQuizSelected('timeout'); setQuizCorrect(false); triggerResult(false, 0, 0); }
      else if (currentQ.type === 'error') { setErrorSelected(false); setErrorCorrect(false); triggerResult(false, 0, 0); }
      else if (currentQ.type === 'flashcard') { setFlashFlipped(true); triggerResult(false, 0, 0); }
      else if (currentQ.type === 'matching') {
        const isPass = matchCorrectCount >= 4;
        const baseScore = Math.max(0, matchCorrectCount * 5 - matchWrongCount * 3);
        advance(isPass, isPass ? 1 : 0, baseScore);
      }
    }
  }, [qTimeLeft, level, blitzPaused, currentQ, matchCorrectCount, matchWrongCount, advance]);

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

      const isQuizType = currentQ.type === 'quiz' || currentQ.type === 'fill_blank';
      if (isQuizType && !quizSelected) {
        const q = currentQ as QuizQ | FillBlankQ;
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [started, done, currentQ, quizSelected, flashFlipped, errorSelected, countdown, advance]);

  function startGame() {
    setSeed(s => s + 1);
    setStarted(true); setQIdx(0); setCorrect(0); setScore(0); setMaxStreak(0); setCurrentStreak(0);
    setTimeLeft(lvl.blitzSecs); setHintCount(0); setLives(3); setDone(false);
    setAttempts([]);
    setShowKana(level === 'easy');
    setShowTranslation(level === 'easy');
    resetQ();
  }

  if (!started) {
    return (
      <GrammarSetup
        level={level}
        setLevel={setLevel}
        startGame={startGame}
        onBack={() => navigate(BACK_PATH)}
      />
    );
  }

  if (done) {
    return (
      <GrammarResult
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
      />
    );
  }

  const progress = (qIdx / totalQ) * 100;
  const isQuizType = currentQ.type === 'quiz' || currentQ.type === 'fill_blank';
  const isLivesCritical = level === 'hard' && lives === 1;


  return (
    <div className={`min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-500 ${isLivesCritical ? 'ring-[4px] ring-red-500/50 ring-inset' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <button onClick={() => { if(window.confirm('Thoát bài học? Kết quả chưa hoàn thành sẽ không được lưu.')) navigate(BACK_PATH) }} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
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
          {level === 'hard' && (
            <div className="flex items-center gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i < lives ? 'bg-red-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
          )}
          {level !== 'easy' && (
            <div className="flex items-center gap-1 font-bold text-orange-500">
              <Flame size={14} className={currentStreak > 2 ? 'animate-pulse' : ''} />
              {currentStreak}
            </div>
          )}
          {level !== 'hard' && (
            <>
              <button onClick={() => setShowKana(k => !k)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-bold transition-colors ${showKana ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                {showKana ? <Eye size={11} /> : <EyeOff size={11} />} かな
              </button>
              <button onClick={() => setShowTranslation(t => !t)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-bold transition-colors ${showTranslation ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                {showTranslation ? <Eye size={11} /> : <EyeOff size={11} />} Dịch
              </button>
            </>
          )}
          <div className="font-black text-indigo-600 dark:text-indigo-400">{score} pt</div>
          <div className="text-slate-500 dark:text-slate-400 font-medium">{qIdx + 1}/{totalQ}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-200 dark:bg-slate-700">
        <motion.div className="h-full bg-indigo-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
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

      {/* Question area */}
      <div className="flex-1 overflow-auto p-4 flex flex-col max-w-3xl w-full mx-auto justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={currentQ.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }} className="w-full">

            {isQuizType && (
              <GrammarQuiz
                q={currentQ as QuizQ | FillBlankQ}
                showKana={showKana}
                showTranslation={showTranslation}
                quizSelected={quizSelected}
                quizCorrect={quizCorrect}
                onSelect={(optId, ok) => {
                  setQuizSelected(optId);
                  setQuizCorrect(ok);
                  triggerResult(ok);
                }}
                countdown={countdown}
                onNext={commitAdvance}
                blitzPaused={blitzPaused}
              />
            )}

            {currentQ.type === 'flashcard' && (
              <GrammarFlashcard
                q={currentQ as FlashQ}
                showKana={showKana}
                flashFlipped={flashFlipped}
                setFlashFlipped={setFlashFlipped}
                onAnswer={ok => advance(ok)}
                blitzPaused={blitzPaused}
              />
            )}

            {currentQ.type === 'error' && (
              <GrammarError
                q={currentQ as ErrorQ}
                showKana={showKana}
                showTranslation={showTranslation}
                errorCorrect={errorCorrect}
                onSelect={(choice, ok) => {
                  setErrorSelected(choice);
                  setErrorCorrect(ok);
                  triggerResult(ok);
                }}
                blitzPaused={blitzPaused}
              />
            )}

            {currentQ.type === 'matching' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <GrammarMatching
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
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer bar */}
      <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between min-h-[64px]">
        {!blitzPaused ? (
          <KbHints type={currentQ.type} />
        ) : (
          <div className="text-slate-500 text-sm font-medium flex items-center gap-2">
            Tự động chuyển sau <span className="font-black text-indigo-500">{countdown}s</span>...
          </div>
        )}
        <AnimatePresence>
          {blitzPaused && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={commitAdvance} className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center gap-1 shadow-md">
              Tiếp tục <ArrowLeft size={14} className="rotate-180" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
