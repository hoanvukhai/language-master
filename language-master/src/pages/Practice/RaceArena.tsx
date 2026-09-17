// src/pages/Practice/RaceArena.tsx
// Trận Đấu Đua Top Nitro (Engine 3 Mạng ❤️, Speed Bonus ⚡, Combo Multiplier 🔥)
// Hỗ trợ 100% Light Mode / Dark Mode & Tiếng Việt / English & Question Engines Integration

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Heart, Flame } from 'lucide-react';
import { useAuth } from '../../context/auth/useAuth';
import { useSettings } from '../../context/global/useSettings';
import { useAudio } from '../../context/audio/useAudio';

import { recordArenaRace } from '../../lib/srs/pointsEngine';
import { romajiToHiragana } from '../../lib/romajiConverter';
import { buildVocabQuestions, buildKanjiWordQuestions, buildHanjtQuestions, buildGrammarQuestions, buildEnglishVocabQuestions, shuffleArray as qbShuffle, getMeaning } from '../../lib/race/questionBuilder';
import type { RaceQuestionItem } from '../../lib/race/questionBuilder';
import { checkEnglishWordMatch } from '../../lib/english/ipaHelper';



// Sub-components
import RaceQuizView from '../Race/components/RaceQuizView';
import RaceMatchingView from '../Race/components/RaceMatchingView';
import RaceTypingView from '../Race/components/RaceTypingView';
import RaceTrueFalseView from '../Race/components/RaceTrueFalseView';
import { stripParentheses } from '../../lib/race/questionBuilder';
import { usePracticeContext } from './PracticeContext';
import type { Kanji } from '../../types';

export type GameType = 'quiz' | 'matching' | 'typing' | 'truefalse';



export default function RaceArena() {
  const { user } = useAuth();
  const { language } = useSettings();
  const { playSfx, playBgm, stopBgm } = useAudio();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const game = (searchParams.get('game') || 'quiz') as GameType;
  const { course } = usePracticeContext();
  const subject = course.subject;
  const level = course.level;
  const data = course.data;

  // Match State
  const [loading, setLoading] = useState(true);
  const [isUnsupportedLevel, setIsUnsupportedLevel] = useState(false);
  const [questions, setQuestions] = useState<RaceQuestionItem[]>([]);
  const [qIdx, setQIdx] = useState(0);

  const prevHighScore = location.state?.prevHighScore || 0;

  // Stats
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [_correctCount, setCorrectCount] = useState(0);

  // Timer
  const timePerQ = game === 'truefalse' ? 7 : game === 'typing' ? 15 : game === 'matching' ? 30 : 10;
  const [timeLeft, setTimeLeft] = useState(timePerQ);
  const startTimeRef = useRef<number>(Date.now());

  // Answer State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userTyping, setUserTyping] = useState('');
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showSpeedToast, setShowSpeedToast] = useState(false);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackCorrectAnswer, setFeedbackCorrectAnswer] = useState('');
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeRef = useRef<number>(0);
  const livesRef = useRef(3); // Sync ref to avoid stale closure in advanceToNext

  // Matching Cards State
  const [matchingCards, setMatchingCards] = useState<{ id: string; text: string; pairId: string; type: 'prompt' | 'answer'; isMatched?: boolean; originalItem?: any }[]>([]);
  const [selectedMatchCard, setSelectedMatchCard] = useState<number | null>(null);
  const [matchingRound, setMatchingRound] = useState(1);
  const matchingRoundRef = useRef(1); // [BUG-M01 FIX] Ref để tránh stale closure trong setTimeout callback
  const [wrongMatchCards, setWrongMatchCards] = useState<[number, number] | null>(null);
  const [correctMatchCards, setCorrectMatchCards] = useState<[number, number] | null>(null);
  const [matchingFocusIdx, setMatchingFocusIdx] = useState<number>(0);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const [matchingMistakes, setMatchingMistakes] = useState(0);

  // Status: 'playing' | 'result'
  const [gameState, setGameState] = useState<'playing' | 'result'>('playing');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [_historyList, setHistoryList] = useState<{ q: any; isCorrect: boolean }[]>([]);
  const historyRef = useRef<{ q: any; isCorrect: boolean }[]>([]);

  const initGuardRef = useRef(false);

  // ── 1. Init Match ──────────────────────────────────────────────────────
  useEffect(() => {
    // F5 reload guard: Redirect to lobby to enforce AudioContext user-gesture requirement
    const stateStartId = location.state?.startId;
    if (!stateStartId) {
      // Truy cập trực tiếp qua URL hoặc không có startId
      navigate(`/course/${course.id}/race/lobby?game=${game}`, { replace: true });
      return;
    }

    if (!initGuardRef.current) {
      initGuardRef.current = true;
      const consumedId = sessionStorage.getItem('currentRaceId');
      if (consumedId === stateStartId) {
        // Đã tiêu thụ startId này -> Đây chắc chắn là hành động F5 tải lại trang!
        navigate(`/course/${course.id}/race/lobby?game=${game}`, { replace: true });
        return;
      }
      // Ghi nhận startId đã được tiêu thụ
      sessionStorage.setItem('currentRaceId', stateStartId);
    }

    initMatch();
  }, [game, subject, level]);

  const initMatch = () => {
    setLoading(true);
    
    const initialLives = 3;
    setLives(initialLives);
    livesRef.current = initialLives;
    
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setQIdx(0);
    setGameState('playing');
    setMatchingRound(1);
    matchingRoundRef.current = 1;
    setShowingFeedback(false);
    setSelectedOption(null);
    setIsAnswerCorrect(null);
    setUserTyping('');
    setMatchingMistakes(0);
    setWrongMatchCards(null);
    setCorrectMatchCards(null);
    setMatchingFocusIdx(0);
    setHistoryList([]);
    historyRef.current = [];

    // Check supported level datasets
    if (level === 'N5' || level === 'N4' || level === 'N1') {
      setIsUnsupportedLevel(true);
      setLoading(false);
      return;
    }
    setIsUnsupportedLevel(false);

    // Build Question Items cleanly based on subject using questionBuilder
    let pool: RaceQuestionItem[] = [];
    const count = game === 'typing' ? 15 : game === 'matching' ? 24 : 20;

    if (subject === 'kanji_words' || subject === 'kanji_single') {
      const kanjiDataset: Kanji[] = data as Kanji[];
      pool = buildKanjiWordQuestions(kanjiDataset, game, count, language);
    } else if ((subject as string) === 'hanjt') {
      const kanjiDataset: Kanji[] = data as Kanji[];
      pool = buildHanjtQuestions(kanjiDataset, game, count, language);
    } else if (subject === 'grammar') {
      const grammarDataset = data as any[];
      pool = buildGrammarQuestions(grammarDataset, game, count, language);
    } else if (course.template === 'english') {
      // ── English vocabulary course ────────────────────────────────────
      pool = buildEnglishVocabQuestions(data as any[], game, count, language);
    } else {
      const vocabDataset = data as any[];
      pool = buildVocabQuestions(vocabDataset, game, count, language);
    }

    if (game === 'matching') {
      setupMatchingRound(subject, level, 1);
    }

    setQuestions(pool);
    setLoading(false);
    // Bắt đầu đếm ngược thay vì resetTimer ngay
    setCountdown(3);
  };

  const setupMatchingRound = (sub: string, _lvl: string, roundNum: number) => {
    let rawData: any[];
    let getPrompt: (item: any) => string;
    let getMeaningStr: (item: any) => string;

    const useHiragana = (sub === 'kanji_words' || sub === 'kanji_single' || (sub !== 'hanjt' && sub !== 'grammar')) ? Math.random() > 0.5 : false;

    if (sub === 'kanji_words' || sub === 'kanji_single') {
      const kanjiDataset = data as Kanji[];
      const allWords: any[] = [];
      kanjiDataset.forEach(k => k.words?.forEach((w: any) => allWords.push(w)));
      rawData = allWords; 
      getPrompt = d => d.word; 
      getMeaningStr = useHiragana ? (d => d.hiragana || getMeaning(d, language)) : (d => getMeaning(d, language));
    } else if ((sub as string) === 'hanjt') {
      const kanjiDataset = data as Kanji[];
      const mixed: any[] = [];
      kanjiDataset.forEach(k => {
        if (roundNum === 1) {
          mixed.push({ isChar: true, text: k.character, meaning: k.hanViet, id: k.id });
        } else {
          k.words?.filter((w: any) => w.hanVietWord).forEach((w: any) => mixed.push({ isWord: true, text: w.word, meaning: w.hanVietWord, id: w.word }));
        }
      });
      rawData = mixed;
      getPrompt = d => d.text; getMeaningStr = d => d.meaning;
    } else if (course.template === 'english') {
      // ── English vocabulary matching ────────────────────────────────────
      rawData = data as any[];
      getPrompt = (d: any) => d.word || '';
      getMeaningStr = (d: any) => getMeaning(d, language);
    } else if (sub === 'grammar') {
      const gData = data as any[];
      rawData = gData;
      getPrompt = d => stripParentheses(d.structure);
      getMeaningStr = d => stripParentheses(getMeaning(d, language));
    } else {
      // Japanese vocab (default)
      rawData = data as any[];
      getPrompt = (d: any) => d.kanji || d.hiragana;
      getMeaningStr = useHiragana
        ? (d: any) => (d.kanji && d.hiragana && d.kanji !== d.hiragana) ? d.hiragana : getMeaning(d, language)
        : (d => getMeaning(d, language));
    }

    let pool = rawData;
    if (useHiragana) {
      const kanjiRegex = /[\u4E00-\u9FAF]/;
      const filtered = rawData.filter(d => {
        const textToCheck = d.kanji || d.word;
        return textToCheck && d.hiragana && textToCheck !== d.hiragana && kanjiRegex.test(textToCheck);
      });
      if (filtered.length >= 6) pool = filtered;
    }

    const getUniqueId = (item: any) => item.id || item.word || item.structure || item.character;
    const pickedIds = new Set(historyRef.current.map(h => getUniqueId(h.q)));
    let availablePool = pool.filter(d => !pickedIds.has(getUniqueId(d)));
    if (availablePool.length < 6) availablePool = pool;

    const shuffledPool = qbShuffle(availablePool);
    const roundItems: any[] = [];
    const usedPrompts = new Set<string>();
    const usedMeanings = new Set<string>();

    for (const item of shuffledPool) {
      if (roundItems.length >= 6) break;
      const p = getPrompt(item);
      const m = getMeaningStr(item);
      if (p && m && !usedPrompts.has(p) && !usedMeanings.has(m)) {
        usedPrompts.add(p);
        usedMeanings.add(m);
        roundItems.push(item);
      }
    }

    // Fallback if dataset is extremely small
    if (roundItems.length < 6) {
      for (const item of shuffledPool) {
        if (roundItems.length >= 6) break;
        if (!roundItems.includes(item)) roundItems.push(item);
      }
    }

    const cards: { id: string; text: string; pairId: string; type: 'prompt' | 'answer'; isMatched?: boolean; origIdx?: number; originalItem?: any }[] = [];

    roundItems.forEach((v: any, idx: number) => {
      const pairId = `pair-${idx}`;
      cards.push({ id: `p-${idx}`, text: getPrompt(v), pairId, type: 'prompt', originalItem: v });
      cards.push({ id: `a-${idx}`, text: getMeaningStr(v), pairId, type: 'answer', originalItem: v });
    });

    setMatchingCards(qbShuffle(cards));
    setSelectedMatchCard(null);
    resetTimer(timePerQ);
  };

  const resetTimer = (duration: number) => {
    setTimeLeft(duration);
    startTimeRef.current = Date.now();
  };

  // ── 1.5 Countdown Engine ─────────────────────────────────────────────
  useEffect(() => {
    // Stop BGM if user exits early
    return () => stopBgm();
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      playSfx('countdownTick');
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      playSfx('countdownGo');
      const timer = setTimeout(() => {
        setCountdown(null);
        // Bắt đầu nhạc nền Đua ngay lúc hiện xong GO!
        playBgm('racing');
        resetTimer(timePerQ);
        setGameState('playing');
        startTimeRef.current = Date.now();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown, game, timePerQ]);

  // ── 2. Timer Countdown Engine ───────────────────────────
  useEffect(() => {
    if (gameState !== 'playing' || loading || isUnsupportedLevel || showingFeedback || countdown !== null) return;
    
    if (timeLeft <= 0) {
      if (game === 'matching') {
        // Matching timeout: Lose a life, go to next round
        const newLives = livesRef.current - 1;
        setLives(newLives);
        livesRef.current = newLives;

        if (newLives <= 0) {
          stopBgm();
          playSfx('gameover');
          finishMatch(0, true);
        } else {
          playSfx('wrong');
          
          // Ghi nhận các thẻ chưa lật của vòng cũ vào lịch sử trước khi chuyển vòng
          const currentHistoryIds = new Set(historyRef.current.map(h => h.q.id));
          matchingCards.forEach(card => {
            if (card.type === 'prompt' && !card.isMatched && !currentHistoryIds.has(card.originalItem.id)) {
              currentHistoryIds.add(card.originalItem.id);
              historyRef.current.push({ q: card.originalItem, isCorrect: false, isUnanswered: true } as any);
            }
          });

          if (matchingRound < 4) {
            setMatchingRound(r => r + 1);
            setupMatchingRound(subject, level, matchingRound + 1);
          } else {
            finishMatch(livesRef.current);
          }
        }
      } else {
        handleAnswerSubmit(false, true);
      }
      return;
    }
    
    const warningThreshold = game === 'typing' || game === 'matching' ? 5 : 3;
    if (timeLeft > 0 && timeLeft <= warningThreshold) {
      playSfx('ticktock');
    }
    
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, timeLeft, loading, isUnsupportedLevel, showingFeedback, game, countdown]);

  // ── 3. Handle Answer & Scoring ─────────────────────────────────────────
  const handleAnswerSubmit = (isOk: boolean, isTimeOut = false) => {
    if (countdown !== null) return;
    
    // Guard: prevent double-submit during feedback overlay or if already answered
    if (showingFeedback && !isTimeOut) return;
    if (selectedOption !== null && !isTimeOut) return;

    const reactionSecs = (Date.now() - startTimeRef.current) / 1000;
    setIsAnswerCorrect(isOk);
    
    // Xóa focus khỏi tất cả phần tử đang focus (ví dụ: nút đáp án vừa bấm)
    // Để tránh trình duyệt nuốt mất sự kiện phím Enter khi nút chuyển sang trạng thái disabled
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setHistoryList(prev => {
      if (prev.find(item => item.q.id === questions[qIdx].id)) return prev;
      const next = [...prev, { q: questions[qIdx], isCorrect: isOk }];
      historyRef.current = next;
      return next;
    });


    if (isOk) {
      const newStreak = streak + 1;
      if (newStreak >= 3) {
        playSfx('combo');
      } else {
        playSfx('correct');
      }
      // 10000 MAX SCORE LOGIC: 9000 points spread across all questions
      const maxGameplayScore = 9000;
      const totalQs = game === 'typing' ? 15 : 20;
      const maxScorePerQ = maxGameplayScore / totalQs;
      
      const basePts = maxScorePerQ * 0.4;
      const speedPool = maxScorePerQ * 0.4;
      
      // Speed Bonus: Tỉ lệ liên tục (mili-giây) từ perfectWindow đến timePerQ
      let speedRatio = 0;
      const perfectWindow = game === 'truefalse' ? 1.0 : 1.5;
      if (reactionSecs <= perfectWindow) {
        speedRatio = 1.0;
      } else {
        speedRatio = 1.0 - ((reactionSecs - perfectWindow) / (timePerQ - perfectWindow));
      }
      speedRatio = Math.max(0, Math.min(1.0, speedRatio));
      
      const speedBonus = speedPool * speedRatio;
      
      if (reactionSecs <= perfectWindow + 0.5) {
        setShowSpeedToast(true);
        setTimeout(() => setShowSpeedToast(false), 1200);
      }

      // Combo Multiplier: +5% per streak, max +50% (1.5x) at 10 streak.
      const multiplier = Math.min(1.5, 1.0 + (newStreak * 0.05));

      const pts = Math.round((basePts * multiplier) + speedBonus);
      
      setScore(s => s + pts);
      setCorrectCount(c => c + 1);
      setStreak(newStreak);
      setMaxStreak(m => Math.max(m, newStreak));
    } else {
      setStreak(0);
      const newLives = lives - 1;
      setLives(newLives);
      livesRef.current = newLives;

      if (newLives <= 0) {
        stopBgm();
        playSfx('gameover');
        setShowingFeedback(true);
        const q = questions[qIdx];
        if (game === 'truefalse' && q) {
          const realMeaning = getMeaning(q.sourceItem);
          const realStr = subject === 'grammar' ? `${stripParentheses(q.sourceItem?.structure || '')} — ` : '';
          setFeedbackCorrectAnswer(`${q.correctAnswer === 'TRUE' ? 'ĐÚNG' : 'SAI'} (Thực tế: ${realStr}${realMeaning})`);
        } else {
          setFeedbackCorrectAnswer(q?.correctAnswer || '');
        }
        advanceTimeoutRef.current = setTimeout(() => {
          finishMatch(0, true);
        }, 1500);
        return;
      } else {
        playSfx('wrong');
      }
    }

    // Hiển thị feedback panel
    setShowingFeedback(true);
    feedbackTimeRef.current = Date.now();
    const q = questions[qIdx];
    if (game === 'truefalse' && q) {
      const realMeaning = getMeaning(q.sourceItem);
      const realStr = subject === 'grammar' ? `${stripParentheses(q.sourceItem?.structure || '')} — ` : '';
      setFeedbackCorrectAnswer(`${q.correctAnswer === 'TRUE' ? 'ĐÚNG' : 'SAI'} (Thực tế: ${realStr}${realMeaning})`);
    } else {
      setFeedbackCorrectAnswer(q.correctAnswer);
    }
    
    // Đặt hẹn giờ để đi tiếp sau 1.5s
    advanceTimeoutRef.current = setTimeout(() => {
      advanceToNext();
    }, 1500);
  };

  const advanceToNext = () => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    
    // Dùng livesRef để tránh stale closure
    if (livesRef.current <= 0) {
      finishMatch(0, true);
      return;
    } 
    
    if (qIdx + 1 < questions.length) {
      setShowingFeedback(false);
      setSelectedOption(null);
      setIsAnswerCorrect(null);
      setUserTyping('');
      
      setQIdx(i => i + 1);
      resetTimer(timePerQ);
    } else {
      finishMatch(livesRef.current);
    }
  };

  // ── 4. Handle Matching Card Click ─────────────────────────────────────
  const handleMatchingCardClick = (idx: number) => {
    // Không chặn click khi correctMatchCards đang tồn tại để người chơi có thể lật cực nhanh
    if (matchingCards[idx].isMatched || wrongMatchCards) return;

    if (selectedMatchCard === idx) {
      setSelectedMatchCard(null);
      return;
    }

    if (selectedMatchCard === null) {
      setSelectedMatchCard(idx);
    } else {
      const card1 = matchingCards[selectedMatchCard];
      const card2 = matchingCards[idx];

      if (card1.pairId === card2.pairId && card1.type !== card2.type) {
        const getUniqueId = (item: any) => item.id || item.word || item.structure || item.character;
        // --- GHI NHẬN LỊCH SỬ KHI ĐÚNG ---
        setHistoryList(prev => {
          if (prev.find(item => getUniqueId(item.q) === getUniqueId(card1.originalItem))) return prev;
          const next = [...prev, { q: card1.originalItem, isCorrect: true }];
          historyRef.current = next;
          return next;
        });

        const newStreak = streak + 1;
        if (newStreak >= 3) {
          playSfx('combo');
        } else {
          playSfx('correct');
        }

        // --- NEW PER-PAIR SCORING (Max 10000 limit) ---
        const reactionSecs = (Date.now() - startTimeRef.current) / 1000;
        const maxGameplayScore = 9000;
        const totalQs = 24; // 4 rounds * 6 pairs
        const maxScorePerQ = maxGameplayScore / totalQs;
        
        const basePts = maxScorePerQ * 0.4;
        const speedPool = maxScorePerQ * 0.4;
        
        let speedRatio = 0;
        const perfectWindow = 1.0; // Dưới 1 giây là tuyệt đối
        const maxTimeForBonus = 5.0; // Sau 5 giây là hết speed bonus
        
        if (reactionSecs <= perfectWindow) {
          speedRatio = 1.0;
        } else {
          speedRatio = 1.0 - ((reactionSecs - perfectWindow) / (maxTimeForBonus - perfectWindow));
        }
        speedRatio = Math.max(0, Math.min(1.0, speedRatio));
        
        const speedBonus = speedPool * speedRatio;
        
        if (reactionSecs <= perfectWindow + 0.5) {
          setShowSpeedToast(true);
          setTimeout(() => setShowSpeedToast(false), 1200);
        }

        const multiplier = Math.min(1.5, 1.0 + (newStreak * 0.05));

        const pts = Math.round((basePts * multiplier) + speedBonus);
        
        setScore(s => s + pts);
        setCorrectCount(c => c + 1);
        setStreak(newStreak);
        setMaxStreak(m => Math.max(m, newStreak));

        // Reset timer cho cặp tiếp theo
        startTimeRef.current = Date.now();

        // --- HIỆU ỨNG CHỚP XANH ---
        setCorrectMatchCards([selectedMatchCard, idx]);
        setSelectedMatchCard(null);

        // Kiểm tra xem đây có phải là cặp cuối cùng chưa bị lật hay không
        const isLastPair = matchingCards.filter(c => !c.isMatched && c.id !== card1.id && c.id !== card2.id).length === 0;

        setTimeout(() => {
          setCorrectMatchCards(null);
          // Luôn luôn lật mờ thẻ (kể cả cặp cuối cùng) để tạo hiệu ứng thị giác hoàn chỉnh
          setMatchingCards(cards => cards.map((c, i) => i === selectedMatchCard || i === idx ? { ...c, isMatched: true } : c));
          
          if (isLastPair) {
            // [BUG-M01 FIX] Đọc từ ref thay vì state để tránh stale closure trong setTimeout
            const currentRound = matchingRoundRef.current;
            if (currentRound < 4) {
              const nextRound = currentRound + 1;
              matchingRoundRef.current = nextRound;
              setMatchingRound(nextRound);
              setupMatchingRound(subject, level, nextRound);
            } else {
              finishMatch(livesRef.current);
            }
          }
        }, 500);
      } else {
        const getUniqueId = (item: any) => item.id || item.word || item.structure || item.character;
        // --- GHI NHẬN LỊCH SỬ KHI SAI ---
        setHistoryList(prev => {
          let newHistory = [...prev];
          if (!newHistory.find(item => getUniqueId(item.q) === getUniqueId(card1.originalItem))) {
            newHistory.push({ q: card1.originalItem, isCorrect: false });
          }
if (!newHistory.find(item => getUniqueId(item.q) === getUniqueId(card2.originalItem))) {
            newHistory.push({ q: card2.originalItem, isCorrect: false });
          }
          historyRef.current = newHistory;
          return newHistory;
        });

        setStreak(0);
        setWrongMatchCards([selectedMatchCard, idx]);
        setMatchingMistakes(m => m + 1);
        playSfx('wrong');

        // --- LẬT SAI = MẤT MẠNG ---
        const newLives = livesRef.current - 1;
        setLives(newLives);
        livesRef.current = newLives;

        setTimeout(() => {
          setWrongMatchCards(null);
          setSelectedMatchCard(null);

          if (newLives <= 0) {
            stopBgm();
            playSfx('gameover');
            finishMatch(0, true);
          }
        }, 500);
      }
    }
  };

  // ── Keyboard Shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const mouseHandler = () => setIsKeyboardNavigating(false);

    const handler = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setIsKeyboardNavigating(true);
      }

      if (gameState === 'result') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          navigate(`/course/${course.id}/race/lobby?game=${game}`);
          return;
        }
        return;
      }

      // Skip feedback - allow enter/space to next question EVEN if input is focused
      if (showingFeedback && (e.key === 'Enter' || e.key === ' ')) {
        // Chặn phím đúp (auto-repeat) và debounce ngắn
        if (e.repeat || Date.now() - feedbackTimeRef.current < 100) {
          e.preventDefault();
          return;
        }
        
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur(); // Remove focus from input if any
        }
        advanceToNext();
        return;
      }

      // Ignore other shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (gameState !== 'playing' || loading || showingFeedback || countdown !== null) return;

      // Quiz: 1-4
      if (game === 'quiz' && questions[qIdx]?.options) {
        const opts = questions[qIdx].options;
        const keyIdx = ['1', '2', '3', '4'].indexOf(e.key);
        if (keyIdx !== -1 && opts && keyIdx < opts.length) {
          e.preventDefault();
          const opt = opts[keyIdx];
          setSelectedOption(opt);
          handleAnswerSubmit(opt === questions[qIdx].correctAnswer);
        }
      }

      // TrueFalse: t/f, arrows, or 1/2
      if (game === 'truefalse' && questions[qIdx]) {
        if (e.key.toLowerCase() === 't' || e.key === 'ArrowRight' || e.key === '2') {
          e.preventDefault();
          handleAnswerSubmit(true === questions[qIdx].isTrue);
        } else if (e.key.toLowerCase() === 'f' || e.key === 'ArrowLeft' || e.key === '1') {
          e.preventDefault();
          handleAnswerSubmit(false === questions[qIdx].isTrue);
        }
      }

      // Matching: keys
      if (game === 'matching') {
        const MATCH_KEYS = ['q','w','e','r','a','s','d','f','z','x','c','v'];
        const keyIdx = MATCH_KEYS.indexOf(e.key.toLowerCase());
        
        if (keyIdx !== -1 && matchingCards[keyIdx] && !matchingCards[keyIdx].isMatched) {
          e.preventDefault();
          setMatchingFocusIdx(keyIdx);
          handleMatchingCardClick(keyIdx);
          return;
        }

        // Arrow navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          
          if (e.key === 'Enter' || e.key === ' ') {
            if (matchingCards[matchingFocusIdx] && !matchingCards[matchingFocusIdx].isMatched) {
              handleMatchingCardClick(matchingFocusIdx);
            }
            return;
          }

          setMatchingFocusIdx(prev => {
            let next = prev;
            const COLS = 4;
            const ROWS = Math.ceil(matchingCards.length / COLS);
            const r = Math.floor(prev / COLS);
            const c = prev % COLS;

            if (e.key === 'ArrowRight') next = r * COLS + ((c + 1) % COLS);
            else if (e.key === 'ArrowLeft') next = r * COLS + ((c - 1 + COLS) % COLS);
            else if (e.key === 'ArrowDown') next = ((r + 1) % ROWS) * COLS + c;
            else if (e.key === 'ArrowUp') next = ((r - 1 + ROWS) % ROWS) * COLS + c;
            
            if (next >= matchingCards.length) next = prev;
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('mousemove', mouseHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousemove', mouseHandler);
    };
  }, [gameState, loading, showingFeedback, game, qIdx, questions, matchingCards, selectedMatchCard, countdown, matchingFocusIdx, wrongMatchCards, correctMatchCards]);

  // ── 5. Finish Match & Sync Cloud ──────────────────────────────────────
  const finishMatch = async (finalLivesOverride?: number, skipSound = false) => {
    if (gameState === 'result') return; // Guard prevent double call
    setGameState('result');
    stopBgm();
    
    // Add all remaining unanswered cards to history for Matching
    if (game === 'matching') {
      const getUniqueId = (item: any) => item.id || item.word || item.structure || item.character;
      const currentHistoryIds = new Set(historyRef.current.map(h => getUniqueId(h.q)));
      matchingCards.forEach(card => {
        if (card.type === 'prompt' && !currentHistoryIds.has(getUniqueId(card.originalItem))) {
          currentHistoryIds.add(getUniqueId(card.originalItem));
          historyRef.current.push({ q: card.originalItem, isCorrect: false, isUnanswered: true } as any);
        }
      });
    }

    const livesCount = finalLivesOverride !== undefined ? finalLivesOverride : livesRef.current;
    
    if (!skipSound) {
      if (livesCount <= 0) {
        playSfx('gameover');
      } else {
        playSfx('victory');
      }
    }

    // 10000 MAX SCORE LOGIC: Lives Bonus (Max 1000)
    let livesBonus = 0;
    if (livesCount >= 3) livesBonus = 1000;
    else if (livesCount === 2) livesBonus = 600;
    else if (livesCount === 1) livesBonus = 300;

    let finalScore = Math.round(score + livesBonus);
    // Hard cap at 10000 just in case of float calculation artifacts
    finalScore = Math.min(10000, finalScore);
    
    setScore(finalScore);
    
    let raceResult = null;
    if (user && finalScore > 0) {
      const modeKey = `${game}`;
      // Max possible score for 20 questions = 20 * 450 = 9000 + 1000 lives = 10000. Matching is 24 * 375 = 9000.
      raceResult = await recordArenaRace(user.uid, course.id, modeKey, finalScore, 10000);
    }
    
    // Recalculate exactly from history to avoid stale closures
    const finalCorrectCount = historyRef.current.filter(h => h.isCorrect).length;

    navigate(`/course/${course.id}/race/lobby?game=${game}`, {
      state: {
        recentScore: finalScore,
        prevHighScore: prevHighScore,
        historyList: historyRef.current,
        livesCount,
        maxStreak,
        correctCount: finalCorrectCount,
        totalQuestionsCount: game === 'matching' ? 24 : questions.length,
        raceResult
      }
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (isUnsupportedLevel) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white flex items-center justify-center p-4 font-sans transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 text-center shadow-2xl space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30 mb-2 text-4xl">
            🚧
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            {language === 'en' ? 'Level In Development!' : 'Dữ Liệu Đang Phát Triển!'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {language === 'en'
              ? `Questions for level ${level} are being updated.`
              : `Dữ liệu thi đấu cho trình độ ${level} đang trong quá trình cập nhật và hoàn thiện.`}
          </p>
          <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600 text-xs text-indigo-600 dark:text-indigo-300">
            💡 {language === 'en' ? 'You can compete using N3 level questions!' : 'Bạn có thể tham gia thi đấu Đua Top với dữ liệu chính thức của N3!'}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate(`/course/${course.id}/race/lobby?game=${game}`)}
              className="flex-1 py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-2xl font-bold text-sm transition-colors"
            >
              {language === 'en' ? 'Back' : 'Quay Về'}
            </button>
            <button
              onClick={() => navigate(`/course/${course.id}/race/play?game=${game}`)}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              🏆 {language === 'en' ? 'Play N3' : 'Thử Sức N3'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentQ = questions[qIdx];
  const progressPct = ((timePerQ - timeLeft) / timePerQ) * 100;

  const isLivesCritical = lives === 1;

  return (
    <div className={`min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white flex flex-col items-center p-4 py-6 font-sans select-none transition-colors relative overflow-x-hidden ${isLivesCritical ? 'ring-[4px] ring-red-500/50 ring-inset transition-all duration-300' : ''}`}>
      
      {/* 💥 COUNTDOWN OVERLAY 💥 */}
      {countdown !== null && !loading && !isUnsupportedLevel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="animate-in zoom-in duration-200 text-9xl md:text-[12rem] font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        </div>
      )}

      {/* Race Header */}
      <div className="w-full max-w-xl flex items-center justify-between z-10">
        <button
          onClick={() => navigate(`/course/${course.id}/race/lobby?game=${game}`)}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <ArrowLeft size={14} /> {language === 'en' ? 'Exit' : 'Thoát'}
        </button>

        {/* Lives Hearts */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-6 h-6 transition-all ${
                i < lives ? 'text-red-500 fill-red-500 scale-110' : 'text-slate-300 dark:text-slate-700 fill-slate-200 dark:fill-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Combo Multiplier & Score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-black text-sm bg-orange-500/10 px-2.5 py-1 rounded-xl border border-orange-500/30">
            <Flame size={16} /> x{Math.min(1.5, 1.0 + (streak * 0.05)).toFixed(2).replace(/\.?0+$/, '')}
          </div>
          <div className="bg-indigo-600 text-white px-3.5 py-1 rounded-xl text-sm font-black shadow-md shadow-indigo-600/40">
            +{score} EXP
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 my-2 shadow-sm relative">
        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-bold">
          {game === 'matching' ? (
            <span>🎯 {language === 'en' ? 'Round' : 'Vòng'} {matchingRound}/4 <span className="ml-2 text-red-500">❌ {matchingMistakes}</span></span>
          ) : (
            <span>🎯 {language === 'en' ? 'Question' : 'Câu'} {qIdx + 1}/{questions.length || 18}</span>
          )}
          <span className={(game === 'matching' ? timeLeft <= 5 : timeLeft <= 3) ? 'text-red-500 animate-pulse font-black drop-shadow-md' : 'text-amber-500 font-bold'}>
            ⏱️ {timeLeft}s
          </span>
        </div>
        
        {game !== 'matching' && (
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Speed Toast Popup */}
        {showSpeedToast && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-amber-500 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-lg animate-bounce">
            ⚡ Speed Bonus!
          </div>
        )}
      </div>

      {/* RENDER GAME SUB-COMPONENT */}
      
      {/* FEEDBACK OVERLAY (Task 3) */}
      {showingFeedback && game !== 'matching' && (
        <div className="fixed inset-x-0 bottom-0 top-20 z-50 flex items-center justify-center p-4 bg-black/10 dark:bg-black/40 backdrop-blur-[2px]">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border-4 text-center transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200 ${isAnswerCorrect ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-900/90' : 'bg-red-50 border-red-400 dark:bg-red-900/90'}`}>
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner ${isAnswerCorrect ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300' : 'bg-red-200 dark:bg-red-800 text-red-600 dark:text-red-300'}`}>
              {isAnswerCorrect ? '✅' : '❌'}
            </div>
            <h3 className={`text-xl font-black mb-1 ${isAnswerCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {isAnswerCorrect ? (language === 'en' ? 'Correct!' : 'Chính xác!') : (language === 'en' ? 'Incorrect!' : 'Sai rồi!')}
            </h3>
            
            {!isAnswerCorrect && (
              <div className="mt-4 p-3 bg-white/60 dark:bg-black/20 rounded-2xl">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                  {language === 'en' ? 'Correct Answer' : 'Đáp án đúng'}
                </p>
                <p className="text-lg font-black text-slate-800 dark:text-white">
                  {feedbackCorrectAnswer}
                </p>
              </div>
            )}
            
            <button
              onClick={advanceToNext}
              className={`mt-6 w-full py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-transform active:scale-95 ${isAnswerCorrect ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'}`}
            >
              {language === 'en' ? 'Next (Space/Enter)' : 'Tiếp tục (Space/Enter)'}
            </button>
          </div>
        </div>
      )}

      {/* RENDER GAME SUB-COMPONENT */}
      <div className="w-full flex flex-col items-center mt-6">
        {game === 'quiz' && currentQ && (
          <RaceQuizView
            question={currentQ}
            selectedOption={selectedOption}
            isAnswerCorrect={isAnswerCorrect}
            onSelectOption={opt => {
              setSelectedOption(opt);
              handleAnswerSubmit(opt === currentQ.correctAnswer);
            }}
          />
        )}

        {game === 'matching' && (
          <RaceMatchingView
            round={matchingRound}
            cards={matchingCards}
            selectedCardIdx={selectedMatchCard}
            onCardClick={handleMatchingCardClick}
            language={language}
            isKeyboardNavigating={isKeyboardNavigating}
            focusIdx={matchingFocusIdx}
            wrongCards={wrongMatchCards}
            correctCards={correctMatchCards}
          />
        )}

        {game === 'typing' && currentQ && (
          <RaceTypingView
            subject={subject}
            question={currentQ}
            typingInput={userTyping}
            selectedOption={selectedOption}
            isAnswerCorrect={isAnswerCorrect}
            onChangeInput={val => {
              if (countdown === null) setUserTyping(val);
            }}
            onSubmitAnswer={ans => {
              if (course.template === 'english') {
                // English: support multi-word variants (e.g. "mother, mom")
                const isOk = checkEnglishWordMatch(ans, currentQ.correctAnswer);
                handleAnswerSubmit(isOk);
              } else if (currentQ.isSingleKanjiChar) {
                const isOk = (ans || '').trim().toUpperCase() === currentQ.correctAnswer.trim().toUpperCase();
                handleAnswerSubmit(isOk);
              } else {
                const convertedKana = romajiToHiragana(userTyping).trim();

                // normalize: strip punctuation, kanji, and convert Katakana to Hiragana
                const normalize = (s: string | undefined) => (s || '').trim()
                  .replace(/[〜~。、「」]/g, '')
                  .replace(/[\u4E00-\u9FFF]/g, '') // strip kanji chars
                  .replace(/[\u30A1-\u30F6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60)) // Kata to Hira
                  .replace(/\s+/g, '').toLowerCase();

                const correctAnswers = currentQ.correctAnswer.split(/[/、,]+/).map(s => normalize(s));
                
                const ansNorm = normalize(ans);
                const kanaNorm = normalize(convertedKana);
                const userNorm = normalize(userTyping);

                const isOk = correctAnswers.some(c => c === ansNorm || c === kanaNorm || c === userNorm);
                handleAnswerSubmit(isOk);
              }
            }}
            language={language}
            skipRomaji={course.template === 'english'}
          />
        )}

      {game === 'truefalse' && currentQ && (
        <RaceTrueFalseView
          question={currentQ}
          disabled={showingFeedback}
          onSelectTrueFalse={choice => {
            handleAnswerSubmit(choice === currentQ.isTrue);
          }}
          language={language}
        />
      )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-auto pt-8 pb-2 text-center w-full">
        {language === 'en' ? 'Lose all 3 ❤️ and the match ends. Stay sharp!' : 'Mất hết 3 ❤️ trận đấu sẽ dừng lại. Hãy giữ phong độ!'}
      </p>
    </div>
  );
}
