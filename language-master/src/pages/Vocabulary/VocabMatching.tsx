// src/pages/Vocabulary/VocabMatching.tsx
// Nối từ: bên trái là từ Nhật, bên phải là nghĩa tiếng Việt
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, RotateCcw, Trophy, Eye, EyeOff } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';

import VocabLessonChips from '../../components/vocabulary/VocabLessonChips';

const PAIR_COUNT = 6; // Số cặp mỗi vòng

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Tile {
  id: string;
  pairId: string;
  type: 'A' | 'B'; // A = Nhật, B = Việt
  label: string;
  sub?: string | null;
}

export default function VocabMatching() {
  const { course } = usePracticeContext();
  const data = course.data as any[];
  const isEnglish = course.template === 'english';
  const lessons = Array.from(new Set(data.map((w: any) => w.lesson).filter(Boolean))) as string[];
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [showFurigana, setShowFurigana] = useState(false);
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const fullPool = useMemo(() => {
    return selectedLessons.length === 0
      ? data
      : data.filter(w => selectedLessons.includes(w.lesson || ''));
  }, [selectedLessons, data]);

  // Mỗi round lấy PAIR_COUNT từ pool (xoay vòng)
  const tiles: Tile[] = useMemo(() => {
    const shuffled = shuffle(fullPool).slice(0, PAIR_COUNT);
    const generatedTiles: Tile[] = [];
    shuffled.forEach((word: any) => {
      // Template-aware label: English uses 'word', Japanese uses 'kanji || hiragana'
      const tileLabel = isEnglish
        ? (word.word || '')
        : (word.alt_kanji ? `${word.kanji || word.hiragana} (${word.alt_kanji})` : (word.kanji || word.hiragana || ''));
      const tileSub = isEnglish ? (word.ipa || null) : (word.hiragana || null);

      generatedTiles.push({
        id: `A_${word.id}`,
        pairId: word.id,
        type: 'A',
        label: tileLabel,
        sub: tileSub,
      });
      generatedTiles.push({
        id: `B_${word.id}`,
        pairId: word.id,
        type: 'B',
        label: typeof word.meaning === 'object' ? word.meaning.vi : word.meaning,
      });
    });
    return shuffle(generatedTiles);
  }, [fullPool, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set()); // pairId
  const [errorPair, setErrorPair] = useState<[string, string] | null>(null); // ids

  const isComplete = matched.size > 0 && matched.size === (tiles.length / 2);

  useEffect(() => {
    if (selectedTiles.length === 2) {
      const [t1, t2] = selectedTiles;
      if (t1.pairId === t2.pairId && t1.type !== t2.type) {
        // Đúng
        setTimeout(() => {
          setMatched(prev => new Set([...prev, t1.pairId]));
          setTotalCorrect(c => c + 1);
          setSelectedTiles([]);
        }, 200);
      } else {
        // Sai
        setErrorPair([t1.id, t2.id]);
        setTimeout(() => {
          setSelectedTiles([]);
          setErrorPair(null);
        }, 800);
      }
    }
  }, [selectedTiles]);

  const handleTileClick = (tile: Tile) => {
    if (errorPair || matched.has(tile.pairId) || selectedTiles.length === 2) return;
    
    // Bỏ chọn nếu click lại
    if (selectedTiles.find(t => t.id === tile.id)) {
      setSelectedTiles(selectedTiles.filter(t => t.id !== tile.id));
      return;
    }
    
    setSelectedTiles([...selectedTiles, tile]);
  };

  const handleNextRound = () => {
    setRound(r => r + 1);
    setMatched(new Set());
    setSelectedTiles([]);
    setErrorPair(null);
  };

  // ──────────── SETUP ────────────
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2 font-display">🧩 Nối từ</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Trò chơi ghép nối phản xạ siêu tốc.</p>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
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
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  {isEnglish ? '👁️ Hiển thị IPA (Thẻ từ)' : '👁️ Hiển thị Kana (Cột Trái)'}
                </label>
                <button
                  onClick={() => setShowFurigana(!showFurigana)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    showFurigana
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold">
                    {showFurigana ? <Eye size={20} /> : <EyeOff size={20} />}
                    {showFurigana ? 'Đang bật' : 'Đang ẩn'}
                  </div>
                  <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors" style={{ backgroundColor: showFurigana ? '#10b981' : '' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showFurigana ? 'left-5' : 'left-1'}`} />
                  </div>
                </button>
              </div>

              <div>
                {/* Có thể thêm các option khác nếu có */}
              </div>
            </div>

            <button
              onClick={() => setStarted(true)}
              disabled={fullPool.length < PAIR_COUNT}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              {fullPool.length < PAIR_COUNT
                ? `Cần ít nhất ${PAIR_COUNT} từ (hiện có ${fullPool.length})`
                : 'Bắt đầu'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────── GAME ────────────

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-medium">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFurigana(!showFurigana)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                showFurigana 
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {showFurigana ? <Eye size={16} /> : <EyeOff size={16} />}
              {isEnglish ? 'IPA' : 'Kana'}
            </button>
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="text-slate-500 dark:text-slate-400">Vòng {round + 1}</span>
              <span className="text-blue-500 dark:text-blue-400">Điểm: {totalCorrect}</span>
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={14} /> {matched.size}/{(tiles.length / 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Grid nối từ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {tiles.map(tile => {
            const isMatched = matched.has(tile.pairId);
            const isSelected = selectedTiles.some(t => t.id === tile.id);
            const isWrong = errorPair?.includes(tile.id);
            
            let btnClass = "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:border-blue-400 hover:shadow-sm cursor-pointer";
            if (isMatched) btnClass = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 opacity-70 cursor-default";
            else if (isWrong) btnClass = "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 cursor-default";
            else if (isSelected) btnClass = "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-md cursor-pointer";

            return (
              <motion.button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                disabled={isMatched}
                whileTap={{ scale: isMatched ? 1 : 0.95 }}
                animate={isWrong ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`w-full h-24 flex flex-col items-center justify-center p-3 rounded-2xl border-2 font-bold text-center transition-all select-none ${btnClass}`}
              >
                <div className={tile.type === 'A' ? 'text-xl' : 'text-sm font-medium leading-snug'}>{tile.label}</div>
                {showFurigana && tile.sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{tile.sub}</div>}
              </motion.button>
            );
          })}
        </div>

        {/* Complete overlay */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center">
                <Trophy className="mx-auto mb-3 text-amber-400" size={48} />
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Xuất sắc!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-3">
                  Bạn đã nối đúng tất cả {tiles.length / 2} cặp từ!
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleNextRound}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <RotateCcw size={16} /> Vòng mới
                  </button>
                  <Link to={`/course/${course.id}/practice`} className="block w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-emerald-400 transition-all text-center">
                    Về dashboard
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
