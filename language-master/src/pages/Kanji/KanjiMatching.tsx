import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { usePracticeContext } from '../Practice/PracticeContext';
import type { Kanji } from '../../types';
import KanjiLessonChips from '../../components/kanji/KanjiLessonChips';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Tile {
  id: string;
  pairId: string;
  type: 'A' | 'B';
  label: string;
  sub?: string | null;
}

export default function KanjiMatching() {
  const [started, setStarted] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [mode, setMode] = useState<'kanji-hanviet' | 'word-meaning'>('kanji-hanviet');
  const [showFurigana, setShowFurigana] = useState(false);
  const { course } = usePracticeContext();
  const data = course.data as Kanji[];

  // States cho game
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [errorPair, setErrorPair] = useState<[string, string] | null>(null);

  const lessons = Array.from(new Set(data.map(k => k.lesson))).filter(Boolean) as string[];

  const initGame = () => {
    let basePool = selectedLessons.length === 0 ? data : data.filter(k => selectedLessons.includes(k.lesson || ''));
    let generatedTiles: Tile[] = [];

    if (mode === 'kanji-hanviet') {
      const mixed: { char: string, hv: string, id: string }[] = [];
      basePool.forEach(k => {
        mixed.push({ char: k.character, hv: k.hanViet, id: k.id });
        if (k.words) {
          k.words.filter(w => w.hanVietWord).forEach((w, idx) => {
            mixed.push({ char: w.word, hv: w.hanVietWord as string, id: `${k.id}_whv_${idx}` });
          });
        }
      });
      let pool = shuffle(mixed).slice(0, 6);
      pool.forEach(item => {
        generatedTiles.push({ id: `A_${item.id}`, pairId: item.id, type: 'A', label: item.char });
        generatedTiles.push({ id: `B_${item.id}`, pairId: item.id, type: 'B', label: item.hv });
      });
    } else { // word-meaning
      const wordsList: { id: string; word: string; value: string; hiragana: string }[] = [];
      basePool.forEach(k => {
        k.words.forEach((w, idx) => {
          wordsList.push({
            id: `${k.id}_w_${idx}`,
            word: w.word,
            value: typeof w.meaning === 'object' ? w.meaning.vi : w.meaning,
            hiragana: w.hiragana,
          });
        });
      });

      let pool = shuffle(wordsList).slice(0, 6);
      pool.forEach(w => {
        generatedTiles.push({ id: `A_${w.id}`, pairId: w.id, type: 'A', label: w.word, sub: w.hiragana });
        generatedTiles.push({ id: `B_${w.id}`, pairId: w.id, type: 'B', label: w.value });
      });
    }

    setTiles(shuffle(generatedTiles));
    setSelectedTiles([]);
    setMatched(new Set());
    setErrorPair(null);
    setStarted(true);
  };

  useEffect(() => {
    if (selectedTiles.length === 2) {
      const [t1, t2] = selectedTiles;
      if (t1.pairId === t2.pairId && t1.type !== t2.type) {
        // Match!
        setTimeout(() => {
          setMatched(prev => new Set([...prev, t1.pairId]));
          setSelectedTiles([]);
        }, 200);
      } else {
        // Mismatch!
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
    
    if (selectedTiles.find(t => t.id === tile.id)) {
      setSelectedTiles(selectedTiles.filter(t => t.id !== tile.id));
      return;
    }
    
    setSelectedTiles([...selectedTiles, tile]);
  };

  const isWin = matched.size > 0 && matched.size === (tiles.length / 2);

  // Dynamic text size to prevent overflow for longer words/meanings/hiragana
  const getTextSize = (text: string) => {
    if (text.length <= 2) return 'text-3xl md:text-4xl font-bold';
    if (text.length <= 5) return 'text-xl md:text-2xl font-bold';
    if (text.length <= 10) return 'text-base md:text-lg font-bold';
    return 'text-xs md:text-sm font-semibold px-2 text-center';
  };


  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link to={`/course/${course.id}/practice`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-3 transition-colors">
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2 font-display">🧩 Nối Kanji</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-3">Trò chơi ghép nối phản xạ siêu tốc.</p>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
            <KanjiLessonChips
              options={lessons}
              selected={selectedLessons}
              onToggle={(val) => {
                setSelectedLessons(prev =>
                  prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                );
              }}
              onSelectAll={() => setSelectedLessons([])}
              totalCount={data.length}
              getCount={(l) => {
                if (mode === 'kanji-hanviet') {
                  return data.filter(k => k.lesson === l).reduce((acc, k) => acc + 1 + (k.words?.filter(w => w.hanVietWord).length || 0), 0);
                }
                return data.filter(k => k.lesson === l).reduce((acc, k) => acc + (k.words?.length || 0), 0);
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">⚙️ Chế độ nối</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('kanji-hanviet')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                      mode === 'kanji-hanviet'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>Chữ Kanji & Hán Việt</span>
                    <span className="text-xs font-normal opacity-70">共 ⇄ CỘNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('word-meaning')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex justify-between items-center ${
                      mode === 'word-meaning'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>Từ ghép & Nghĩa tiếng Việt</span>
                    <span className="text-xs font-normal opacity-70">共通点 ⇄ Điểm chung</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">👁️ Hiển thị Kana (Khi ghép từ)</label>
                <button
                  onClick={() => setShowFurigana(!showFurigana)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                    showFurigana
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold">
                    {showFurigana ? <Eye size={20} /> : <EyeOff size={20} />}
                    {showFurigana ? 'Đang bật' : 'Đang ẩn'}
                  </div>
                  <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors" style={{ backgroundColor: showFurigana ? '#3b82f6' : '' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showFurigana ? 'left-5' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={initGame}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Bắt đầu trò chơi ({(() => {
                let basePool = selectedLessons.length === 0 ? data : data.filter(k => selectedLessons.includes(k.lesson || ''));
                if (mode === 'kanji-hanviet') {
                  return basePool.reduce((acc, k) => acc + 1 + (k.words?.filter(w => w.hanVietWord).length || 0), 0);
                } else {
                  return basePool.reduce((acc, k) => acc + (k.words?.length || 0), 0);
                }
              })()} thẻ)
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
          <button onClick={() => setStarted(false)} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium">
            <ArrowLeft size={18} /> Cài đặt
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFurigana(!showFurigana)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                showFurigana 
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {showFurigana ? <Eye size={16} /> : <EyeOff size={16} />}
              Kana
            </button>
            <div className="flex items-center gap-4 text-sm font-bold text-slate-500 dark:text-slate-400">
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={16} /> {matched.size}/{(tiles.length / 2)}
              </span>
            </div>
          </div>
        </div>

        {isWin ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 shadow-xl text-center max-w-sm mx-auto">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-3">Xuất sắc!</h2>
            <button
              onClick={initGame}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mb-3 shadow-md"
            >
              <RotateCcw size={18} /> Chơi tiếp
            </button>
            <Link to={`/course/${course.id}/practice`} className="block w-full py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all text-center">
              Về dashboard
            </Link>
          </div>
        ) : (
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
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  disabled={isMatched}
                  className={`w-full min-h-[5.5rem] p-3 flex flex-col items-center justify-center rounded-2xl border-2 transition-all shadow-sm select-none ${btnClass}`}
                >
                  <span className={`pointer-events-none ${getTextSize(tile.label)}`}>{tile.label}</span>
                  {showFurigana && tile.sub && <span className="pointer-events-none text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{tile.sub}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
