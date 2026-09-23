// src/pages/Grammar/GrammarFillBlank.tsx
// Dạng bài JLPT Part 5: Điền vào chỗ trống — chọn cấu trúc ngữ pháp đúng hoàn thành câu
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

/** Tạo câu có chỗ trống: ưu tiên dùng dấu [...] từ schema mới, fallback sang regex cũ */
function makeBlankSentence(jp: string, structure: string): { blanked: string; answer: string; found: boolean } {
  // Schema mới: câu có dạng "〜が[だらけ]になった" → tách [...] ra làm đáp án
  const bracketMatch = jp.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const answer = bracketMatch[1];
    const blanked = jp.replace(/\[[^\]]+\]/, '＿＿＿');
    return { blanked, answer, found: true };
  }

  // Fallback schema cũ: tìm structure trong câu
  const variants = structure
    .replace(/〜/g, '')
    .split(/[/／]/)
    .map(v => v.trim())
    .filter(v => v.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const v of variants) {
    if (jp.includes(v)) {
      return { blanked: jp.replace(v, '＿＿＿'), answer: v, found: true };
    }
  }
  // Fallback: che phần cuối câu
  return { blanked: jp.slice(0, Math.ceil(jp.length * 0.6)) + '＿＿＿', answer: structure, found: false };
}

interface FillItem {
  id: string;
  blankedSentence: string;
  fullSentence: string;       // câu gốc (không có [...] markup)
  kana: string;               // phiên âm kana của câu (cũng strip markup)
  translation: string;
  correctAnswer: string;      // text bị che (lấy từ [...]) — đáp án đúng
  correctStructure: string;   // structure đầy đủ (〜だらけ)
  caution: string;
  group: string;
  lesson: string;
}

export default function GrammarFillBlank() {
  const { language } = useSettings();
  const lessons = getN3GrammarLessons();
  const groups = useMemo(() => [...new Set(grammarN3.map(g => g.group))], []);

  // Filter state — chip multi-select
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
      g.examples.forEach((ex, i) => {
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
            correctAnswer: answer,     // text ngắn gọn bị che (ví dụ: "だらけ")
            correctStructure: g.structure,
            caution: typeof g.caution === 'string' ? g.caution : ((g.caution as any)[language] || g.caution.vi),
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
  const [showSuccess, setShowSuccess] = useState(false); // BUG-04 fix: thay thế auto-advance
  const [showFurigana, setShowFurigana] = useState(false);

  const current = queue[0];

  // 4 đáp án: 1 đúng + 3 nhiễu từ cùng group
  // Distractors: lấy text [...] từ example đầu tiên của các grammar item khác cùng group
  const options = useMemo(() => {
    if (!current) return [];

    // Hàm lấy answer text từ example đầu tiên (phần [...]) của một GrammarItem
    const getAnswerText = (g: (typeof grammarN3)[0]): string => {
      for (const ex of g.examples) {
        const m = ex.jp.match(/\[([^\]]+)\]/);
        if (m) return m[1];
      }
      return g.structure.replace(/〜/g, '').split('/')[0].trim();
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
      // BUG-04 fix: Không auto-advance, hiển thị banner chính xác và chờ người dùng bấm tiếp
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
          <Link to="/course/n3-grammar-core/practice" className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">📝 Điền vào chỗ trống</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">
            Đúng dạng bài <strong className="text-teal-600 dark:text-teal-400">JLPT Part 5</strong>: đọc câu, chọn cấu trúc ngữ pháp phù hợp.
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Display options */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Hiển thị</label>
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
                  {showTranslation ? <Eye size={12} /> : <EyeOff size={12} />} Dịch
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
                💡 Câu ví dụ sẽ bị che phần cấu trúc ngữ pháp. Hãy chọn mẫu đúng trong 4 đáp án — đúng dạng đề thi JLPT thực tế!
              </p>
            </div>

            <button
              onClick={handleStart}
              disabled={pool.length === 0}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Bắt đầu ({pool.length} câu)
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
          <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'}</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Kết quả</h2>
          <div className="text-5xl font-black text-teal-600 dark:text-teal-400 mb-1">
            {score}<span className="text-2xl text-slate-400">/{pool.length}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-3">{pct}% chính xác</p>
          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-teal-400 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Làm lại
            </button>
            <Link to="/course/n3-grammar-core/practice" className="block w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-center">
              Về dashboard
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
            <ArrowLeft size={18} /> Thoát
          </button>
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-teal-600 dark:text-teal-400">{score} điểm</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{pool.length - queue.length + 1}/{pool.length}</div>
            {/* Kana toggle */}
            <button
              onClick={() => setShowFurigana(v => !v)}
              title={showFurigana ? 'Tắt Furigana' : 'Bật Furigana'}
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
              title={showTranslation ? 'Ẩn dịch' : 'Hiện dịch'}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                showTranslation
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-amber-300'
              }`}
            >
              {showTranslation ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>Dịch</span>
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
                <span className="text-xs text-slate-400 dark:text-slate-500">Chọn cấu trúc phù hợp</span>
              </div>

              {/* Câu có chỗ trống */}
              <div className="text-center mb-3">
                <p className="text-xl font-bold text-slate-800 dark:text-white leading-relaxed mb-2">
                  {current.blankedSentence}
                </p>
                {/* Furigana — kana của câu gốc khi bật */}
                {showFurigana && current.kana && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-2">
                    {current.kana}
                  </p>
                )}
                {/* Translation toggle */}
                {showTranslation && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    💬 {current.translation}
                  </p>
                )}
              </div>

              {/* Đáp án */}
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
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">Chính xác!</span>
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400 mb-3 font-mono bg-green-100 dark:bg-green-900/40 rounded-lg px-3 py-2">
                    {current.fullSentence}
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
                  >
                    Câu tiếp theo →
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
                        Câu đúng: <span className="font-mono">{current.fullSentence}</span>
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
                    Câu tiếp theo →
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
