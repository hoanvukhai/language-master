// src/pages/Grammar/GrammarErrorDetect.tsx
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Eye, EyeOff, Shuffle, MousePointerClick } from 'lucide-react';
import { grammarN3Clean as grammarN3, getN3GrammarLessons } from '../../data/jlpt/n3/grammarN3';
import { useSettings } from '../../context/global/useSettings';
import GrammarLessonChips, { getGroupLabel } from '../../components/grammar/GrammarLessonChips';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// HÃ m táº¡o cÃ¢u sai cÃ³ bÃ´i Ä‘áº­m
function makeWrongSentence(g: typeof grammarN3[0], ex: typeof grammarN3[0]['examples'][0]) {
  const bracketMatch = ex.jp.match(/\[([^\]]+)\]/);
  if (!bracketMatch) return null;
  const correctAnswer = bracketMatch[1];
  const blanked = ex.jp.replace(/\[[^\]]+\]/, '___');
  const correctHighlighted = blanked.replace('___', `<${correctAnswer}>`);

  let wrongStructure = '';
  const sameGroup = grammarN3.filter(x => x.group === g.group && x.id !== g.id);

  if (sameGroup.length > 0) {
    const randItem = sameGroup[Math.floor(Math.random() * sameGroup.length)];
    const exMatch = randItem.examples[0]?.jp.match(/\[([^\]]+)\]/);
    wrongStructure = exMatch ? exMatch[1] : randItem.structure.replace(/ã€œ/g, '').split('/')[0];
  } else {
    const randItem = grammarN3[Math.floor(Math.random() * grammarN3.length)];
    wrongStructure = randItem.structure.replace(/ã€œ/g, '').split('/')[0];
  }

  if (!wrongStructure) wrongStructure = 'ã“ã¨';
  const wrongHighlighted = blanked.replace('___', `<${wrongStructure}>`);

  return {
    correctSentence: correctHighlighted,
    wrongSentence: wrongHighlighted,
    wrongStructure
  };
}

interface ErrorItem {
  id: string;
  isCorrect: boolean; // DÃ¹ng cho cháº¿ Ä‘á»™ truefalse
  correctSentence: string;
  wrongSentence: string;
  kana?: string;
  translation: string;
  structure: string;
  wrongStructure: string;
  caution: string;
  lesson: string;
  group: string;
}

type GameMode = 'truefalse' | 'pickwrong';

export default function GrammarErrorDetect() {
  const { language } = useSettings();
  const lessons = getN3GrammarLessons();
  const groups = useMemo(() => [...new Set(grammarN3.map(g => g.group))], []);

  const [filterType, setFilterType] = useState<'lesson' | 'group'>('lesson');
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // [] = all
  const [started, setStarted] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('truefalse');

  const chipOptions = filterType === 'lesson' ? lessons : groups;

  const pool = useMemo<ErrorItem[]>(() => {
    let base = grammarN3;
    if (selectedItems.length > 0) {
      base = filterType === 'lesson'
        ? grammarN3.filter(g => selectedItems.includes(g.lesson))
        : grammarN3.filter(g => selectedItems.includes(g.group));
    }

    const items: ErrorItem[] = [];
    base.forEach(g => {
      g.examples.forEach((ex, i) => {
        const sentenceData = makeWrongSentence(g, ex);
        if (sentenceData) {
          const cleanKana = ex.kana ? ex.kana.replace(/\[([^\]]+)\]/g, '$1') : undefined;
          
          items.push({
            id: `${g.id}_ex${i}`,
            isCorrect: false, // placeholder â€” will be randomized in handleStart()
            correctSentence: sentenceData.correctSentence,
            wrongSentence: sentenceData.wrongSentence,
            kana: cleanKana,
            translation: ex.vi,
            structure: g.structure,
            wrongStructure: sentenceData.wrongStructure,
            caution: g.caution ? (typeof g.caution === 'object' ? (g.caution as any)[language as 'vi' | 'en'] || (g.caution as any).vi : g.caution) : '',
            lesson: g.lesson,
            group: g.group,
          });
        }
      });
    });
    return shuffle(items);
  }, [selectedItems, filterType, language]);

  const [queue, setQueue] = useState<ErrorItem[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [, setSelectedAnswerTF] = useState<boolean | null>(null);
  const [selectedAnswerPW, setSelectedAnswerPW] = useState<string | null>(null); // LÆ°u id cá»§a cÃ¢u Ä‘Æ°á»£c chá»n

  const current = queue[0];

  // Táº¡o cÃ¡c options cho cháº¿ Ä‘á»™ Pick Wrong
  const pwOptions = useMemo(() => {
    if (!current || gameMode !== 'pickwrong') return [];
    const otherItems = shuffle(pool.filter(p => p.id !== current.id)).slice(0, 3);
    const correctOptions = otherItems.map(p => ({
      id: p.id,
      sentence: p.correctSentence,
      isWrong: false
    }));
    const wrongOption = {
      id: current.id,
      sentence: current.wrongSentence,
      isWrong: true
    };
    return shuffle([...correctOptions, wrongOption]);
  }, [current, pool, gameMode]);

  useEffect(() => { if (started) window.scrollTo(0, 0); }, [started]);

  const handleStart = () => {
    // [BUG-G01 FIX] Math.random() pháº£i cháº¡y Táº I ÄÃ‚Y (event handler), khÃ´ng trong useMemo
    // useMemo cÃ³ thá»ƒ bá»‹ tÃ¡i tÃ­nh nhiá»u láº§n (Ä‘áº·c biá»‡t React StrictMode), gÃ¢y isCorrect bá»‹ Ä‘á»•i ngáº«u nhiÃªn
    const randomizedPool = pool.map(item => ({ ...item, isCorrect: Math.random() > 0.5 }));
    setQueue(randomizedPool);
    setScore(0);
    setStatus('idle');
    setSelectedAnswerTF(null);
    setSelectedAnswerPW(null);
    setStarted(true);
  };

  const handleAnswerTF = (answerIsCorrect: boolean) => {
    if (status !== 'idle') return;
    setSelectedAnswerTF(answerIsCorrect);
    if (answerIsCorrect === current.isCorrect) {
      setScore(s => s + 1);
      setStatus('success');
    } else {
      setStatus('fail');
    }
  };

  const handleAnswerPW = (optionId: string, isWrong: boolean) => {
    if (status !== 'idle') return;
    setSelectedAnswerPW(optionId);
    if (isWrong) {
      setScore(s => s + 1);
      setStatus('success');
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

  const renderHighlightedSentence = (text: string) => {
    const parts = text.split(/<([^>]+)>/);
    return (
      <span>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className={`font-bold border-b-4 pb-0.5 px-1 ${
              status === 'idle' ? 'border-sky-400 text-sky-600 dark:text-sky-400'
              : status === 'success' ? 'border-green-400 text-green-600 dark:text-green-400'
              : 'border-red-400 text-red-600 dark:text-red-400'
            }`}>
              {part}
            </span>
          ) : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  // Render cÃ¢u gá»‘c ko cÃ³ bÃ´i Ä‘áº­m html Ä‘á»ƒ hiá»‡n thá»‹ cho cháº¿ Ä‘á»™ pick wrong náº¿u muá»‘n, nhÆ°ng prompt báº£o giá»¯ bÃ´i Ä‘áº­m
  const renderHighlightedSentencePW = (text: string, isSelected: boolean, isCorrectAnswer: boolean) => {
    const parts = text.split(/<([^>]+)>/);
    return (
      <span>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className={`font-bold border-b-2 pb-0.5 px-1 ${
              status === 'idle' ? 'border-slate-400 text-slate-700 dark:text-slate-300'
              : (isSelected || isCorrectAnswer) ? 'text-inherit border-current'
              : 'border-slate-300 text-slate-500'
            }`}>
              {part}
            </span>
          ) : <span key={i}>{part}</span>
        )}
      </span>
    );
  };


  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to="/practice/grammar" className="inline-flex items-center gap-2 text-slate-500 hover:text-red-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay láº¡i
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">ðŸ” TÃ¬m lá»—i sai</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">
            TÃ¬m vÃ  phÃ¡t hiá»‡n cÃ¡c lá»—i sai ngá»¯ phÃ¡p tinh vi Ä‘Æ°á»£c táº¡o tá»« cÃ¡c cáº¥u trÃºc dá»… gÃ¢y nháº§m láº«n.
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Cháº¿ Ä‘á»™ chÆ¡i */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">ðŸŽ® Cháº¿ Ä‘á»™ chÆ¡i</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setGameMode('truefalse')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                    gameMode === 'truefalse'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2"><Shuffle size={16} /> ÄÃºng / Sai</span>
                  <span className="text-xs font-normal opacity-70">PhÃ¡n Ä‘oÃ¡n 1 cÃ¢u</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('pickwrong')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                    gameMode === 'pickwrong'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2"><MousePointerClick size={16} /> Chá»n cÃ¢u sai</span>
                  <span className="text-xs font-normal opacity-70">TÃ¬m 1 cÃ¢u sai trong 4 cÃ¢u</span>
                </button>
              </div>
            </div>

            {/* Hiá»ƒn thá»‹ */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Hiá»ƒn thá»‹ bá»• sung
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFurigana(v => !v)}
                  className={`flex-1 py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    showFurigana
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {showFurigana ? <Eye size={12} /> : <EyeOff size={12} />} Kana
                </button>
                <button
                  onClick={() => setShowTranslation(v => !v)}
                  className={`flex-1 py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    showTranslation
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {showTranslation ? <Eye size={12} /> : <EyeOff size={12} />} Dá»‹ch
                </button>
              </div>
            </div>

            {/* Chip selector */}
            <GrammarLessonChips
              filterType={filterType}
              onFilterTypeChange={t => { setFilterType(t); setSelectedItems([]); }}
              options={chipOptions}
              selected={selectedItems}
              onToggle={val => setSelectedItems(prev =>
                prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
              )}
              onSelectAll={() => setSelectedItems([])}
              getLabel={filterType === 'group' ? getGroupLabel : undefined}
              getCount={val =>
                filterType === 'lesson'
                  ? grammarN3.filter(g => g.lesson === val).length
                  : grammarN3.filter(g => g.group === val).length
              }
              totalCount={grammarN3.length}
              accentClass="border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            />

            <button
              onClick={handleStart}
              disabled={pool.length === 0 || (gameMode === 'pickwrong' && pool.length < 4)}
              className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-red-500/20"
            >
              {(gameMode === 'pickwrong' && pool.length < 4)
                ? 'Cáº§n Ã­t nháº¥t 4 cÃ¢u cho cháº¿ Ä‘á»™ Chá»n cÃ¢u sai'
                : `Báº¯t Ä‘áº§u (${pool.length} cÃ¢u)`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    const pct = Math.round((score / pool.length) * 100);
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center"
        >
          <div className="text-5xl mb-3">{pct >= 80 ? 'ðŸŽ¯' : pct >= 50 ? 'ðŸ‘€' : 'ðŸ˜…'}</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">HoÃ n thÃ nh</h2>
          <div className="text-5xl font-black text-red-600 dark:text-red-400 mb-1">{score}<span className="text-2xl text-slate-400">/{pool.length}</span></div>
          <p className="text-slate-500 dark:text-slate-400 mb-3">{pct}% chÃ­nh xÃ¡c</p>

          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-red-400 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> LÃ m láº¡i
            </button>
            <Link to="/practice/grammar" className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all text-center">
              Vá» dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((pool.length - queue.length) / pool.length) * 100;
  const displaySentence = current.isCorrect ? current.correctSentence : current.wrongSentence;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans flex flex-col justify-center">
      <div className="max-w-3xl w-full mx-auto flex flex-col justify-between min-h-[500px]">

        <div className="w-full flex-shrink-0">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors font-medium">
            <ArrowLeft size={18} /> ThoÃ¡t
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFurigana(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 text-xs font-bold transition-all ${
                showFurigana
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-teal-300'
              }`}
            >
              {showFurigana ? <Eye size={12} /> : <EyeOff size={12} />} Kana
            </button>
            <button
              onClick={() => setShowTranslation(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border-2 text-xs font-bold transition-all ${
                showTranslation
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-amber-300'
              }`}
            >
              {showTranslation ? <Eye size={12} /> : <EyeOff size={12} />} Dá»‹ch
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-sm font-bold text-red-600 dark:text-red-400">{score} Ä‘iá»ƒm</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{pool.length - queue.length + 1} / {pool.length}</div>
        </div>
        
        {/* Progress */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.id}_${gameMode}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-4 w-full"
            >
            {/* Cháº¿ Ä‘á»™ True/False */}
            {gameMode === 'truefalse' && (
              <>
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-center gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 border px-2 py-1 rounded-full">
                      {current.lesson}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 border px-2 py-1 rounded-full">
                      {current.group}
                    </span>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl leading-loose text-slate-800 dark:text-white mb-2">
                      {renderHighlightedSentence(displaySentence)}
                    </div>
                    
                    {showFurigana && current.kana && (
                      <div className="text-sm text-slate-400 dark:text-slate-500 font-mono mt-2 mb-3">
                        {current.kana}
                      </div>
                    )}
                    
                    {showTranslation && (
                      <div className="text-sm text-amber-600 dark:text-amber-400 italic mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                        {current.translation}
                      </div>
                    )}
                  </div>
                </div>

                {status === 'idle' ? (
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => handleAnswerTF(false)}
                      className="flex-1 py-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2 text-lg active:scale-95 shadow-sm"
                    >
                      <XCircle size={22} /> SAI
                    </button>
                    <button
                      onClick={() => handleAnswerTF(true)}
                      className="flex-1 py-5 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 font-bold rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all flex items-center justify-center gap-2 text-lg active:scale-95 shadow-sm"
                    >
                      <CheckCircle2 size={22} /> ÄÃšNG
                    </button>
                  </div>
                ) : null}
              </>
            )}

            {/* Cháº¿ Ä‘á»™ Pick Wrong */}
            {gameMode === 'pickwrong' && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-700">
                <div className="text-center mb-3">
                  <div className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">HÃ£y chá»n cÃ¢u bá»‹ SAI ngá»¯ phÃ¡p</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Chá»‰ cÃ³ 1 cÃ¢u duy nháº¥t dÃ¹ng sai cáº¥u trÃºc</div>
                </div>

                <div className="space-y-3">
                  {pwOptions.map((opt) => {
                    const isSelected = selectedAnswerPW === opt.id;
                    const isCorrectAnswer = opt.isWrong; // Trong Pick Wrong, Ä‘Ã¡p Ã¡n Ä‘Ãºng cá»§a game lÃ  cÃ¢u sai ngá»¯ phÃ¡p
                    let btnCls = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20';
                    
                    if (status !== 'idle') {
                      if (isCorrectAnswer) btnCls = 'bg-green-500 border-green-500 text-white';
                      else if (isSelected && !isCorrectAnswer) btnCls = 'bg-red-500 border-red-500 text-white';
                      else btnCls = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-400 opacity-40';
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswerPW(opt.id, opt.isWrong)}
                        disabled={status !== 'idle'}
                        className={`w-full p-4 text-left rounded-2xl border-2 transition-all flex items-center gap-3 ${btnCls}`}
                      >
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                          {status !== 'idle' && isCorrectAnswer && <CheckCircle2 size={20} />}
                          {status !== 'idle' && isSelected && !isCorrectAnswer && <XCircle size={20} />}
                          {status === 'idle' && <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500" />}
                        </div>
                        <div className="text-base font-medium leading-relaxed">
                          {renderHighlightedSentencePW(opt.sentence, isSelected, isCorrectAnswer)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feedback & Caution (DÃ¹ng chung cho cáº£ 2 mode) */}
            <AnimatePresence>
              {status !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-5 shadow-sm mt-4 ${
                    status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {status === 'success' ? (
                      <><CheckCircle2 className="text-green-500" /><span className="font-bold text-green-700 dark:text-green-400">PhÃ¡n Ä‘oÃ¡n chuáº©n xÃ¡c!</span></>
                    ) : (
                      <><XCircle className="text-red-500" /><span className="font-bold text-red-700 dark:text-red-400">Ráº¥t tiáº¿c, báº¡n Ä‘Ã£ nháº§m!</span></>
                    )}
                  </div>

                  {/* Giáº£i thÃ­ch cÃ¢u sai cá»§a item hiá»‡n táº¡i */}
                  <div className="bg-white/50 dark:bg-black/20 rounded-xl p-3 mb-3">
                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">CÃ¢u Ä‘Ãºng pháº£i lÃ :</div>
                    <div className="text-lg mb-2">
                      {renderHighlightedSentence(current.correctSentence)}
                    </div>
                    {showTranslation && (
                      <div className="text-sm italic text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                        ðŸ’¬ {current.translation}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-start gap-2 mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                      <span className="font-bold">{current.structure}:</span> {current.caution}
                      <br/>
                      <span className="text-xs opacity-80 mt-1 block">LÆ°u Ã½: KhÃ´ng Ä‘Æ°á»£c nháº§m vá»›i cáº¥u trÃºc "{current.wrongStructure}"</span>
                    </div>
                  </div>

                  <button
                    onClick={handleNext}
                    className={`w-full py-3 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-md ${
                      status === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    CÃ¢u tiáº¿p theo â†’
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
