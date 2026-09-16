// src/pages/Grammar/GrammarFillBlank.tsx
// Dáº¡ng bÃ i JLPT Part 5: Äiá»n vÃ o chá»— trá»‘ng â€” chá»n cáº¥u trÃºc ngá»¯ phÃ¡p Ä‘Ãºng hoÃ n thÃ nh cÃ¢u
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { grammarN3Clean as grammarN3, getN3GrammarLessons } from '../../data/jlpt/n3/grammarN3';
import { useSettings } from '../../context/global/useSettings';
import GrammarLessonChips, { getGroupLabel } from '../../components/grammar/GrammarLessonChips';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Táº¡o cÃ¢u cÃ³ chá»— trá»‘ng: Æ°u tiÃªn dÃ¹ng dáº¥u [...] tá»« schema má»›i, fallback sang regex cÅ© */
function makeBlankSentence(jp: string, structure: string): { blanked: string; answer: string; found: boolean } {
  // Schema má»›i: cÃ¢u cÃ³ dáº¡ng "ã€œãŒ[ã ã‚‰ã‘]ã«ãªã£ãŸ" â†’ tÃ¡ch [...] ra lÃ m Ä‘Ã¡p Ã¡n
  const bracketMatch = jp.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const answer = bracketMatch[1];
    const blanked = jp.replace(/\[[^\]]+\]/, 'ï¼¿ï¼¿ï¼¿');
    return { blanked, answer, found: true };
  }

  // Fallback schema cÅ©: tÃ¬m structure trong cÃ¢u
  const variants = structure
    .replace(/ã€œ/g, '')
    .split(/[/ï¼]/)
    .map(v => v.trim())
    .filter(v => v.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const v of variants) {
    if (jp.includes(v)) {
      return { blanked: jp.replace(v, 'ï¼¿ï¼¿ï¼¿'), answer: v, found: true };
    }
  }
  // Fallback: che pháº§n cuá»‘i cÃ¢u
  return { blanked: jp.slice(0, Math.ceil(jp.length * 0.6)) + 'ï¼¿ï¼¿ï¼¿', answer: structure, found: false };
}

interface FillItem {
  id: string;
  blankedSentence: string;
  fullSentence: string;       // cÃ¢u gá»‘c (khÃ´ng cÃ³ [...] markup)
  kana: string;               // phiÃªn Ã¢m kana cá»§a cÃ¢u (cÅ©ng strip markup)
  translation: string;
  correctAnswer: string;      // text bá»‹ che (láº¥y tá»« [...]) â€” Ä‘Ã¡p Ã¡n Ä‘Ãºng
  correctStructure: string;   // structure Ä‘áº§y Ä‘á»§ (ã€œã ã‚‰ã‘)
  caution: string;
  group: string;
  lesson: string;
}

export default function GrammarFillBlank() {
  const { language } = useSettings();
  const lessons = getN3GrammarLessons();
  const groups = useMemo(() => [...new Set(grammarN3.map(g => g.group))], []);

  // Filter state â€” chip multi-select
  const [filterType, setFilterType] = useState<'lesson' | 'group'>('lesson');
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // [] = all
  const [started, setStarted] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);

  const chipOptions = filterType === 'lesson' ? lessons : groups;

  const pool = useMemo<FillItem[]>(() => {
    let base = grammarN3;
    if (selectedItems.length > 0) {
      base = filterType === 'lesson'
        ? grammarN3.filter(g => selectedItems.includes(g.lesson))
        : grammarN3.filter(g => selectedItems.includes(g.group));
    }

    const items: FillItem[] = [];
    base.forEach(g => {
      g.examples.forEach((ex: any, i: number) => {
        const { blanked, answer, found } = makeBlankSentence(ex.jp, g.structure);
        if (found && blanked.includes('＿＿＿')) {
          // fullSentence: loại bỏ markup [...] → câu sạch để hiển thị sau khi trả lời
          const fullSentence = ex.jp.replace(/\[([^\]]+)\]/g, '$1');
          // Kana: dùng ex.kana nếu có, strip markup
          const kana = ex.kana ? ex.kana.replace(/\[([^\]]+)\]/g, '$1') : '';
          items.push({
            id: `${g.id}_ex${i}`,
            blankedSentence: blanked,
            fullSentence,
            kana,
            translation: ex.vi,
            correctAnswer: answer,     // text ngáº¯n gá»n bá»‹ che (vÃ­ dá»¥: "ã ã‚‰ã‘")
            correctStructure: g.structure,
            caution: g.caution ? (typeof g.caution === 'object' ? (g.caution as any)[language as 'vi' | 'en'] || (g.caution as any).vi : g.caution) : '',
            group: g.group,
            lesson: g.lesson,
          });
        }
      });
    });
    return shuffle(items);
  }, [selectedItems, filterType]);

  const [queue, setQueue] = useState<FillItem[]>([]);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCaution, setShowCaution] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // BUG-04 fix: thay tháº¿ auto-advance
  const [showFurigana, setShowFurigana] = useState(false);

  const current = queue[0];

  // 4 Ä‘Ã¡p Ã¡n: 1 Ä‘Ãºng + 3 nhiá»…u tá»« cÃ¹ng group
  // Distractors: láº¥y text [...] tá»« example Ä‘áº§u tiÃªn cá»§a cÃ¡c grammar item khÃ¡c cÃ¹ng group
  const options = useMemo(() => {
    if (!current) return [];

    // HÃ m láº¥y answer text tá»« example Ä‘áº§u tiÃªn (pháº§n [...]) cá»§a má»™t GrammarItem
    const getAnswerText = (g: (typeof grammarN3)[0]): string => {
      for (const ex of g.examples) {
        const m = ex.jp.match(/\[([^\]]+)\]/);
        if (m) return m[1];
      }
      return g.structure.replace(/ã€œ/g, '').split('/')[0].trim();
    };

    const sameGroup = grammarN3
      .filter(g => g.group === current.group && getAnswerText(g) !== current.correctAnswer)
      .map(getAnswerText);
    const others = grammarN3
      .filter(g => getAnswerText(g) !== current.correctAnswer)
      .map(getAnswerText);
    const distractors = shuffle([...new Set([...sameGroup, ...others])])
      .filter(s => s !== current.correctAnswer)
      .slice(0, 3);
    return shuffle([current.correctAnswer, ...distractors]);
  }, [current]);

  useEffect(() => { if (started) window.scrollTo(0, 0); }, [started]);

  const handleStart = () => {
    setQueue(pool);
    setScore(0);
    setSelectedAnswer(null);
    setShowCaution(false);
    setShowSuccess(false);
    setStarted(true);
  };

  const handleAnswer = (ans: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(ans);
    if (ans === current.correctAnswer) {
      setScore(s => s + 1);
      // BUG-04 fix: KhÃ´ng auto-advance, hiá»ƒn thá»‹ banner chÃ­nh xÃ¡c vÃ  chá» ngÆ°á»i dÃ¹ng báº¥m tiáº¿p
      setShowSuccess(true);
    } else {
      setShowCaution(true);
    }
  };

  const handleNext = () => {
    setQueue(q => q.slice(1));
    setSelectedAnswer(null);
    setShowCaution(false);
    setShowSuccess(false);
  };

  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to="/practice/grammar" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay láº¡i
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">ðŸ“ Äiá»n vÃ o chá»— trá»‘ng</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">
            ÄÃºng dáº¡ng bÃ i <strong className="text-teal-600 dark:text-teal-400">JLPT Part 5</strong>: Ä‘á»c cÃ¢u, chá»n cáº¥u trÃºc ngá»¯ phÃ¡p phÃ¹ há»£p.
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Display options */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Hiá»ƒn thá»‹</label>
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
            />

            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 rounded-xl p-4">
              <p className="text-sm text-teal-700 dark:text-teal-300">
                ðŸ’¡ CÃ¢u vÃ­ dá»¥ sáº½ bá»‹ che pháº§n cáº¥u trÃºc ngá»¯ phÃ¡p. HÃ£y chá»n máº«u Ä‘Ãºng trong 4 Ä‘Ã¡p Ã¡n â€” Ä‘Ãºng dáº¡ng Ä‘á» thi JLPT thá»±c táº¿!
              </p>
            </div>

            <button
              onClick={handleStart}
              disabled={pool.length === 0}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Báº¯t Ä‘áº§u ({pool.length} cÃ¢u)
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
          <div className="text-5xl mb-3">{pct >= 80 ? 'ðŸ†' : pct >= 50 ? 'ðŸ’ª' : 'ðŸ“š'}</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Káº¿t quáº£</h2>
          <div className="text-5xl font-black text-teal-600 dark:text-teal-400 mb-1">
            {score}<span className="text-2xl text-slate-400">/{pool.length}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-3">{pct}% chÃ­nh xÃ¡c</p>
          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-teal-400 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> LÃ m láº¡i
            </button>
            <Link to="/practice/grammar" className="block w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-center">
              Vá» dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((pool.length - queue.length) / pool.length) * 100;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors">
            <ArrowLeft size={18} /> ThoÃ¡t
          </button>
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-teal-600 dark:text-teal-400">{score} Ä‘iá»ƒm</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{pool.length - queue.length + 1}/{pool.length}</div>
            {/* Kana toggle */}
            <button
              onClick={() => setShowFurigana(v => !v)}
              title={showFurigana ? 'Táº¯t Furigana' : 'Báº­t Furigana'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                showFurigana
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-teal-300'
              }`}
            >
              {showFurigana ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Kana</span>
            </button>
            {/* Translation toggle */}
            <button
              onClick={() => setShowTranslation(v => !v)}
              title={showTranslation ? 'áº¨n dá»‹ch' : 'Hiá»‡n dá»‹ch'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                showTranslation
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-amber-300'
              }`}
            >
              {showTranslation ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Dá»‹ch</span>
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Question card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-7 shadow-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full font-medium">
                  {current.lesson}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Chá»n cáº¥u trÃºc phÃ¹ há»£p</span>
              </div>

              {/* CÃ¢u cÃ³ chá»— trá»‘ng */}
              <div className="text-center mb-3">
                <p className="text-xl font-bold text-slate-800 dark:text-white leading-relaxed mb-2">
                  {current.blankedSentence}
                </p>
                {/* Furigana â€” kana cá»§a cÃ¢u gá»‘c khi báº­t */}
                {showFurigana && current.kana && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-2">
                    {current.kana}
                  </p>
                )}
                {/* Translation toggle */}
                {showTranslation && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    ðŸ’¬ {current.translation}
                  </p>
                )}
              </div>

              {/* ÄÃ¡p Ã¡n */}
              <div className="grid grid-cols-1 gap-3">
                {options.map((opt, i) => {
                  let cls = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20';
                  if (selectedAnswer !== null) {
                    if (opt === current.correctAnswer) cls = 'bg-green-500 border-green-500 text-white';
                    else if (opt === selectedAnswer) cls = 'bg-red-500 border-red-500 text-white';
                    else cls = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-400 opacity-40';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={selectedAnswer !== null}
                      className={`p-4 rounded-2xl border-2 transition-all text-base font-semibold flex items-center justify-center gap-2 ${cls}`}
                    >
                      {selectedAnswer !== null && opt === current.correctAnswer && <CheckCircle2 size={16} />}
                      {selectedAnswer !== null && opt === selectedAnswer && opt !== current.correctAnswer && <XCircle size={16} />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BUG-04 fix: Banner ch\u00ednh x\u00e1c v\u1edbi n\u00fat ti\u1ebfp theo th\u1ee7 c\u00f4ng */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} className="text-green-500" />
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">ChÃ­nh xÃ¡c!</span>
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400 mb-3 font-mono bg-green-100 dark:bg-green-900/40 rounded-lg px-3 py-2">
                    {current.fullSentence}
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
                  >
                    CÃ¢u tiáº¿p theo â†’
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Caution after wrong answer */}
            <AnimatePresence>
              {showCaution && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle size={18} className="flex-shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                        CÃ¢u Ä‘Ãºng: <span className="font-mono">{current.fullSentence}</span>
                      </div>
                      <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                        {current.caution}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all"
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
  );
}
