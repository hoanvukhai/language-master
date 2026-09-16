// src/pages/Grammar/GrammarFlashcard.tsx
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown,
  CheckCircle2, AlertTriangle, Volume2, Eye, EyeOff, Repeat2,
} from 'lucide-react';
import { grammarN3Clean as grammarN3, getN3GrammarLessons } from '../../data/jlpt/n3/grammarN3';
import { useSettings } from '../../context/global/useSettings';
import GrammarLessonChips, { getGroupLabel } from '../../components/grammar/GrammarLessonChips';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type CardMode = 'normal' | 'reverse'; // normal: cáº¥u trÃºcâ†’nghÄ©a | reverse: nghÄ©aâ†’cáº¥u trÃºc

export default function GrammarFlashcard() {
  const { language } = useSettings();
  const lessons = getN3GrammarLessons();
  const groups = useMemo(() => [...new Set(grammarN3.map(g => g.group))], []);

  // Setup state
  const [filterType, setFilterType] = useState<'lesson' | 'group'>('lesson');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);  // [] = all
  const [cardMode, setCardMode] = useState<CardMode>('normal');
  const [started, setStarted] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);

  // Game state
  const [queue, setQueue] = useState<typeof grammarN3>([]);
  const [known, setKnown] = useState<typeof grammarN3>([]);
  const [learning, setLearning] = useState<typeof grammarN3>([]);
  const [isFlipped, setIsFlipped] = useState(false);

  const current = queue[0];

  const pool = useMemo(() => {
    if (selectedItems.length === 0) return shuffle(grammarN3);
    if (filterType === 'lesson') {
      return shuffle(grammarN3.filter(g => selectedItems.includes(g.lesson)));
    } else {
      return shuffle(grammarN3.filter(g => selectedItems.includes(g.group)));
    }
  }, [selectedItems, filterType]);

  const handleToggle = (val: string) => {
    setSelectedItems(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  };

  const playAudio = (text: string) => {
    const clean = text.replace(/\[([^\]]+)\]/g, '$1');
    const u = new SpeechSynthesisUtterance(clean.replace(/ã€œ|[/ï¼ˆï¼‰()]/g, ' ').trim());
    u.lang = 'ja-JP';
    window.speechSynthesis.speak(u);
  };

  const renderJpExample = (jp: string) => {
    const parts = jp.split(/\[([^\]]+)\]/);
    return (
      <span>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className="font-bold underline decoration-teal-300 decoration-2">{part}</span>
          ) : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

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

  // â”€â”€ SETUP SCREEN â”€â”€
  if (!started) {
    const options = filterType === 'lesson' ? lessons : groups;
    const totalCount = pool.length;

    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to="/practice/grammar" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay láº¡i
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">ðŸƒ Láº­t tháº» Ngá»¯ PhÃ¡p</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Ã”n cáº¥u trÃºc vÃ  nghÄ©a qua tháº» ghi nhá»› hai máº·t.</p>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Mode: normal / reverse */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Cháº¿ Ä‘á»™ tháº»
              </label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'normal',  label: 'ðŸ“– Cáº¥u trÃºc â†’ NghÄ©a',  desc: 'Xem cáº¥u trÃºc, Ä‘oÃ¡n nghÄ©a' },
                  { id: 'reverse', label: 'ðŸ”„ NghÄ©a â†’ Cáº¥u trÃºc', desc: 'Xem nghÄ©a, Ä‘oÃ¡n cáº¥u trÃºc' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setCardMode(m.id)}
                    className={`py-3 px-4 rounded-xl border-2 text-left transition-all ${
                      cardMode === m.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-bold">{m.label}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chip selector */}
            <GrammarLessonChips
              filterType={filterType}
              onFilterTypeChange={(t) => { setFilterType(t); setSelectedItems([]); }}
              options={options}
              selected={selectedItems}
              onToggle={handleToggle}
              onSelectAll={() => setSelectedItems([])}
              getLabel={filterType === 'group' ? getGroupLabel : undefined}
              getCount={val =>
                filterType === 'lesson'
                  ? grammarN3.filter(g => g.lesson === val).length
                  : grammarN3.filter(g => g.group === val).length
              }
              totalCount={grammarN3.length}
            />

            <button
              onClick={handleStart}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20"
            >
              Báº¯t Ä‘áº§u Ã´n táº­p ({totalCount} tháº»)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€ RESULT SCREEN â”€â”€
  if (queue.length === 0) {
    const total = known.length + learning.length;
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center"
        >
          <div className="text-5xl mb-3">ðŸŽ‰</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">HoÃ n thÃ nh!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Báº¡n Ä‘Ã£ Ã´n xong {total} tháº».</p>

          <div className="flex gap-3 mb-3">
            <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{known.length}</div>
              <div className="text-xs text-green-600 dark:text-green-400">ÄÃ£ nhá»›</div>
            </div>
            <div className="flex-1 bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{learning.length}</div>
              <div className="text-xs text-amber-600 dark:text-amber-400">Cáº§n Ã´n</div>
            </div>
          </div>

          <div className="space-y-3">
            {learning.length > 0 && (
              <button
                onClick={handleRestartLearning}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all"
              >
                Ã”n láº¡i {learning.length} tháº» chÆ°a nhá»›
              </button>
            )}
            <button
              onClick={handleRestart}
              className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-teal-400 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Ã”n láº¡i táº¥t cáº£
            </button>
            <Link to="/practice/grammar" className="block w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-center">
              Vá» dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((known.length + learning.length) / (known.length + learning.length + queue.length)) * 100;
  const meaning = typeof current.meaning === 'object' ? (current.meaning as any)[language as 'vi' | 'en'] || (current.meaning as any).vi : current.meaning;
  const caution = current.caution ? (typeof current.caution === 'object' ? (current.caution as any)[language as 'vi' | 'en'] || (current.caution as any).vi : current.caution) : '';

  // Máº·t trÆ°á»›c thay Ä‘á»•i tuá»³ mode
  const frontContent = cardMode === 'normal' ? current.structure : meaning;
  const frontKana = cardMode === 'normal'
    ? (current.structureKana !== current.structure ? current.structureKana : null)
    : null;
  const frontLabel = cardMode === 'normal' ? 'Cáº¥u trÃºc' : 'NghÄ©a';

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 gap-3">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>

          {/* Mode badge */}
          <span className="text-xs font-bold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Repeat2 size={11} /> {cardMode === 'reverse' ? 'Äáº£o ngÆ°á»£c' : 'BÃ¬nh thÆ°á»ng'}
          </span>

          <div className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
            {known.length + learning.length} / {known.length + learning.length + queue.length}
          </div>

          {/* Furigana toggle */}
          <button
            onClick={() => setShowFurigana(v => !v)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all flex-shrink-0 ${
              showFurigana
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-teal-300'
            }`}
          >
            {showFurigana ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Kana</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Tags */}
        <div className="flex justify-center gap-2 mb-3">
          <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full font-medium">
            {current.lesson}
          </span>
          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full font-medium">
            {current.group}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + isFlipped + cardMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="relative cursor-pointer select-none"
              onClick={() => setIsFlipped(f => !f)}
            >
              <div className={`min-h-[22rem] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl border-2 transition-colors duration-300 ${
                isFlipped
                  ? 'bg-gradient-to-br from-teal-600 to-cyan-600 border-teal-500 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white'
              }`}>

                {!isFlipped ? (
                  <>
                    {/* Front */}
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">{frontLabel}</div>
                    <div className="text-2xl md:text-3xl font-bold text-center leading-snug">
                      {frontContent}
                    </div>
                    {showFurigana && frontKana && (
                      <div className="text-sm text-slate-400 dark:text-slate-500 font-mono mt-1">{frontKana}</div>
                    )}
                    <div className="mt-4 text-sm text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <RotateCcw size={14} /> Cháº¡m Ä‘á»ƒ láº­t
                    </div>
                  </>
                ) : (
                  <div className="w-full space-y-4">
                    {/* Back â€” náº¿u mode=normal: hiá»‡n nghÄ©a; náº¿u mode=reverse: hiá»‡n cáº¥u trÃºc */}
                    {cardMode === 'normal' ? (
                      <>
                        <div>
                          <div className="text-teal-200 text-xs font-bold uppercase tracking-widest mb-1">NghÄ©a</div>
                          <div className="text-2xl font-extrabold text-white">{meaning}</div>
                        </div>
                        <div className="border-t border-teal-500/40 pt-4 text-left">
                          <div className="text-teal-200 text-xs font-bold uppercase tracking-widest mb-2">CÃ¡ch thÃ nh láº­p</div>
                          <div className="space-y-1">
                            {current.formation.map((f: string, i: number) => (
                              <div key={i} className="text-sm text-teal-100 bg-white/10 rounded-lg px-3 py-1.5 font-mono">{f}</div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="text-teal-200 text-xs font-bold uppercase tracking-widest mb-1">Cáº¥u trÃºc</div>
                          <div className="text-2xl font-extrabold text-white">{current.structure}</div>
                          {showFurigana && current.structureKana !== current.structure && (
                            <div className="text-sm text-teal-200 font-mono mt-1">{current.structureKana}</div>
                          )}
                        </div>
                        <div className="border-t border-teal-500/40 pt-4 text-left">
                          <div className="text-teal-200 text-xs font-bold uppercase tracking-widest mb-2">CÃ¡ch thÃ nh láº­p</div>
                          <div className="space-y-1">
                            {current.formation.map((f: string, i: number) => (
                              <div key={i} className="text-sm text-teal-100 bg-white/10 rounded-lg px-3 py-1.5 font-mono">{f}</div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Caution */}
                    <div className="flex items-start gap-2 bg-white/10 rounded-xl p-3 text-left">
                      <AlertTriangle size={14} className="flex-shrink-0 text-amber-300 mt-0.5" />
                      <p className="text-xs text-teal-100 leading-relaxed">{caution}</p>
                    </div>

                    {/* First example */}
                    {current.examples[0] && (
                      <div className="border-t border-teal-500/40 pt-4 text-left">
                        <button
                          onClick={(e) => { e.stopPropagation(); playAudio(current.examples[0].kana || current.examples[0].jp); }}
                          className="flex items-center gap-1 text-xs text-teal-200 mb-2 hover:text-white transition-colors"
                        >
                          <Volume2 size={12} /> VÃ­ dá»¥
                        </button>
                        <div className="text-sm text-white font-medium">{renderJpExample(current.examples[0].jp)}</div>
                        {showFurigana && current.examples[0].kana && (
                          <div className="text-xs text-teal-200 font-mono mt-0.5">
                            {current.examples[0].kana.replace(/\[([^\]]+)\]/g, '$1')}
                          </div>
                        )}
                        <div className="text-xs text-teal-200 mt-1">{current.examples[0].vi}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Action buttons */}
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
                <ThumbsDown size={20} /> ChÆ°a nhá»›
              </button>
              <button
                onClick={() => handleResult(true)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 font-bold rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all active:scale-95"
              >
                <ThumbsUp size={20} /> ÄÃ£ nhá»›
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle2 size={14} /> {known.length} nhá»›
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <RotateCcw size={14} /> {learning.length} cáº§n Ã´n
          </span>
        </div>
      </div>
    </div>
  );
}
