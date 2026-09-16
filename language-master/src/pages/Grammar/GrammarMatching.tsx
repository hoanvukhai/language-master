// src/pages/Grammar/GrammarMatching.tsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { grammarN3Clean as grammarN3, getN3GrammarLessons } from '../../data/jlpt/n3/grammarN3';
import { useSettings } from '../../context/global/useSettings';
import GrammarLessonChips, { getGroupLabel } from '../../components/grammar/GrammarLessonChips';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type MatchMode = 'structure-meaning' | 'structure-formation' | 'structure-example';

export default function GrammarMatching() {
  const { language } = useSettings();
  const lessons = getN3GrammarLessons();
  const groups = useMemo(() => [...new Set(grammarN3.map(g => g.group))], []);
  const [started, setStarted] = useState(false);

  // Chip selector state
  const [filterType, setFilterType] = useState<'lesson' | 'group'>('lesson');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [mode, setMode] = useState<MatchMode>('structure-meaning');
  const [showFurigana, setShowFurigana] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // Game state
  const [lefts, setLefts] = useState<{ id: string; text: string; kana?: string; matched: boolean; selected: boolean }[]>([]);
  const [rights, setRights] = useState<{ id: string; text: string; kana?: string; translation?: string; matched: boolean; selected: boolean }[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [errorPair, setErrorPair] = useState<{ l: string; r: string } | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);

  const options = filterType === 'lesson' ? lessons : groups;

  const basePool = useMemo(() => {
    if (selectedItems.length === 0) return grammarN3;
    return filterType === 'lesson'
      ? grammarN3.filter(g => selectedItems.includes(g.lesson))
      : grammarN3.filter(g => selectedItems.includes(g.group));
  }, [selectedItems, filterType]);

  const initRound = () => {
    const uniquePool: typeof basePool = [];
    const seenStr = new Set<string>();
    const shuffled = shuffle(basePool);
    for (const g of shuffled) {
      if (!seenStr.has(g.structure)) {
        seenStr.add(g.structure);
        uniquePool.push(g);
        if (uniquePool.length === 6) break;
      }
    }
    const pool = uniquePool.length >= Math.min(6, basePool.length) ? uniquePool : shuffled.slice(0, 6);
    if (mode === 'structure-meaning') {
      // LEFT: cáº¥u trÃºc (kana = structureKana)
      setLefts(shuffle(pool.map(g => ({
        id: g.id,
        text: g.structure,
        kana: g.structureKana !== g.structure ? g.structureKana : undefined,
        matched: false,
        selected: false,
      }))));
      setRights(shuffle(pool.map(g => ({
        id: g.id,
        text: typeof g.meaning === 'object' ? (g.meaning as any)[language as 'vi' | 'en'] || (g.meaning as any).vi : g.meaning,
        matched: false,
        selected: false,
      }))));
    } else if (mode === 'structure-example') {
      // LEFT: cáº¥u trÃºc (kana = structureKana)
      setLefts(shuffle(pool.map(g => ({
        id: g.id,
        text: g.structure,
        kana: g.structureKana !== g.structure ? g.structureKana : undefined,
        matched: false,
        selected: false,
      }))));
      // RIGHT: cÃ¢u vÃ­ dá»¥ + kana + translation
      setRights(shuffle(pool.map(g => {
        const cleanEx = g.examples[0]?.jp.replace(/\[([^\]]+)\]/g, '$1') || g.structure;
        const kana = g.examples[0]?.kana ? g.examples[0].kana.replace(/\[([^\]]+)\]/g, '$1') : undefined;
        const translation = g.examples[0]?.vi;
        return { id: g.id, text: cleanEx, kana, translation, matched: false, selected: false };
      })));
    } else {
      // structure â†” first formation rule
      // LEFT: cáº¥u trÃºc (kana = structureKana)
      setLefts(shuffle(pool.map(g => ({
        id: g.id,
        text: g.structure,
        kana: g.structureKana !== g.structure ? g.structureKana : undefined,
        matched: false,
        selected: false,
      }))));
      setRights(shuffle(pool.map(g => ({
        id: g.id,
        text: g.formation[0],
        matched: false,
        selected: false,
      }))));
    }
    setSelectedLeft(null);
    setSelectedRight(null);
    setErrorPair(null);
    setRoundScore(0);
    setTotalRounds(t => t + 1);
    setStarted(true);
  };

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      if (selectedLeft === selectedRight) {
        // Correct match
        setLefts(prev => prev.map(l => l.id === selectedLeft ? { ...l, matched: true, selected: false } : l));
        setRights(prev => prev.map(r => r.id === selectedRight ? { ...r, matched: true, selected: false } : r));
        setSelectedLeft(null);
        setSelectedRight(null);
        setRoundScore(s => s + 1);
      } else {
        // Mismatch
        setErrorPair({ l: selectedLeft, r: selectedRight });
        setTimeout(() => {
          setLefts(prev => prev.map(l => ({ ...l, selected: false })));
          setRights(prev => prev.map(r => ({ ...r, selected: false })));
          setSelectedLeft(null);
          setSelectedRight(null);
          setErrorPair(null);
        }, 800);
      }
    }
  }, [selectedLeft, selectedRight]);

  const handleLeft = (id: string) => {
    if (errorPair || lefts.find(l => l.id === id)?.matched) return;
    setSelectedLeft(id);
    setLefts(prev => prev.map(l => ({ ...l, selected: l.id === id })));
  };

  const handleRight = (id: string) => {
    if (errorPair || rights.find(r => r.id === id)?.matched) return;
    setSelectedRight(id);
    setRights(prev => prev.map(r => ({ ...r, selected: r.id === id })));
  };

  const isWin = lefts.length > 0 && lefts.every(l => l.matched);

  const getTextSize = (text: string) => {
    if (text.length <= 12) return 'text-base font-bold';
    if (text.length <= 25) return 'text-sm font-semibold';
    return 'text-xs font-medium';
  };

  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to="/practice/grammar" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay láº¡i
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">ðŸ”— Ná»‘i Ngá»¯ PhÃ¡p</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">GhÃ©p cáº¥u trÃºc vá»›i nghÄ©a tiáº¿ng Viá»‡t â€” pháº£n xáº¡ siÃªu tá»‘c.</p>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Mode */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">âš™ï¸ Cháº¿ Ä‘á»™ ná»‘i</label>
              <div className="grid grid-cols-1 gap-2">
                {([
                  { val: 'structure-meaning', label: 'Cáº¥u trÃºc â†” NghÄ©a tiáº¿ng Viá»‡t', hint: 'ã€œãŒã‚‹ â†” Cáº£m tháº¥y...' },
                  { val: 'structure-example', label: 'Cáº¥u trÃºc â†” CÃ¢u vÃ­ dá»¥', hint: 'ã€œãŒã‚‹ â†” æ€–ãŒã£ã¦ã„ã‚‹...' },
                  { val: 'structure-formation', label: 'Cáº¥u trÃºc â†” CÃ¡ch thÃ nh láº­p', hint: 'ã€œãŒã‚‹ â†” A(bá» i) + ãŒã‚‹' },
                ] as const).map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setMode(opt.val)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                      mode === opt.val
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-xs font-normal opacity-70">{opt.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Display options */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Hiá»ƒn thá»‹
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
                {mode === 'structure-example' && (
                  <button
                    onClick={() => setShowTranslation(v => !v)}
                    className={`flex-1 py-2 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      showTranslation
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {showTranslation ? <Eye size={12} /> : <EyeOff size={12} />} Dá»‹ch vÃ­ dá»¥
                  </button>
                )}
              </div>
            </div>

            {/* Chip selector */}
            <GrammarLessonChips
              filterType={filterType}
              onFilterTypeChange={t => { setFilterType(t); setSelectedItems([]); }}
              options={options}
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
            />

            <button
              onClick={initRound}
              disabled={basePool.length < 6}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {basePool.length < 6
                ? `Cáº§n Ã­t nháº¥t 6 máº«u (hiá»‡n cÃ³ ${basePool.length})`
                : 'Báº¯t Ä‘áº§u trÃ² chÆ¡i'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors font-medium">
            <ArrowLeft size={18} /> Quay láº¡i
          </button>
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {mode === 'structure-meaning' ? 'Ná»‘i Cáº¥u trÃºc â†” NghÄ©a'
              : mode === 'structure-example' ? 'Ná»‘i Cáº¥u trÃºc â†” VÃ­ dá»¥'
              : 'Ná»‘i Cáº¥u trÃºc â†” ThÃ nh láº­p'}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-teal-600 dark:text-teal-400">{roundScore} âœ“</div>
            {/* Kana toggle â€” available in all modes */}
            <button
              onClick={() => setShowFurigana(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                showFurigana
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-600'
                  : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-teal-300'
              }`}
            >
              {showFurigana ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Kana</span>
            </button>
            {/* Translation toggle â€” only in example mode */}
            {mode === 'structure-example' && (
              <button
                onClick={() => setShowTranslation(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                  showTranslation
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600'
                    : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-amber-300'
                }`}
              >
                {showTranslation ? <Eye size={13} /> : <EyeOff size={13} />}
                <span>Dá»‹ch</span>
              </button>
            )}
          </div>
        </div>

        {isWin ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-xl text-center max-w-sm mx-auto"
          >
            <div className="text-5xl mb-3">ðŸŽ‰</div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Xuáº¥t sáº¯c!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-3">ÄÃ£ ná»‘i Ä‘Ãºng {roundScore} cáº·p Â· VÃ²ng {totalRounds}</p>
            <button
              onClick={initRound}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mb-3 shadow-md"
            >
              <RotateCcw size={18} /> ChÆ¡i tiáº¿p (bá»™ má»›i)
            </button>
            <Link to="/practice/grammar" className="block w-full py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-slate-300 transition-all text-center">
              Vá» dashboard
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            {/* Cá»™t TrÃ¡i â€” Cáº¥u trÃºc */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center mb-2">Cáº¥u trÃºc</div>
              {lefts.map(l => {
                let cls = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:border-teal-400';
                if (l.matched) cls = 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-800 text-green-600 dark:text-green-400 opacity-50 cursor-default';
                else if (errorPair?.l === l.id) cls = 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-600';
                else if (l.selected) cls = 'bg-teal-50 dark:bg-teal-900/30 border-teal-400 dark:border-teal-600 text-teal-700 dark:text-teal-300';
                return (
                  <button
                    key={l.id}
                    onClick={() => handleLeft(l.id)}
                    disabled={l.matched}
                    className={`w-full min-h-[5rem] p-3 flex flex-col items-center justify-center rounded-2xl border-2 transition-all shadow-sm ${cls} text-center`}
                  >
                    <span className={getTextSize(l.text)}>{l.text}</span>
                    {/* Kana dÆ°á»›i cáº¥u trÃºc â€” hiá»‡n á»Ÿ cáº£ 3 cháº¿ Ä‘á»™ khi báº­t */}
                    {showFurigana && l.kana && (
                      <span className="text-[10px] text-teal-500 dark:text-teal-400 font-mono mt-0.5 leading-tight">{l.kana}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cá»™t Pháº£i */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center mb-2">
                {mode === 'structure-meaning' ? 'NghÄ©a'
                  : mode === 'structure-example' ? 'CÃ¢u vÃ­ dá»¥'
                  : 'CÃ¡ch thÃ nh láº­p'}
              </div>
              {rights.map(r => {
                let cls = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:border-teal-400';
                if (r.matched) cls = 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-800 text-green-600 dark:text-green-400 opacity-50 cursor-default';
                else if (errorPair?.r === r.id) cls = 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-600';
                else if (r.selected) cls = 'bg-teal-50 dark:bg-teal-900/30 border-teal-400 dark:border-teal-600 text-teal-700 dark:text-teal-300';
                return (
                  <button
                    key={r.id}
                    onClick={() => handleRight(r.id)}
                    disabled={r.matched}
                    className={`w-full min-h-[5rem] p-3 flex flex-col items-center justify-center rounded-2xl border-2 transition-all shadow-sm ${cls} text-center`}
                  >
                    <span className={getTextSize(r.text)}>{r.text}</span>
                    {/* Furigana kana dÆ°á»›i cÃ¢u vÃ­ dá»¥ trong mode structure-example */}
                    {showFurigana && r.kana && (
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">{r.kana}</span>
                    )}
                    {/* Dá»‹ch vÃ­ dá»¥ â€” chá»‰ trong mode structure-example */}
                    {showTranslation && mode === 'structure-example' && r.translation && (
                      <span className="text-[10px] text-amber-500 dark:text-amber-400 italic mt-0.5 leading-tight">{r.translation}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
