import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { shuffle } from './GrammarCommon';
import type { MatchQ, Level } from './GrammarCommon';
import shortcuts from '../../../data/jlpt/core/shortcuts.json';

interface MatchTile { uid: string; pairId: string; label: string; sub?: string; side: 'jp' | 'vi'; origIdx: number }

interface GrammarMatchingProps {
  q: MatchQ;
  showKana: boolean;
  level: Level;
  onStateChange?: (c: number, w: number) => void;
  onDone: (c: number, w: number) => void;
}

export default function GrammarMatching({ q, showKana, level, onStateChange, onDone }: GrammarMatchingProps) {
  const tiles = useMemo<MatchTile[]>(() => {
    const t: MatchTile[] = [];
    q.pairs.forEach(p => {
      t.push({ uid: `jp_${p.pairId}`, pairId: p.pairId, label: p.jp, sub: p.jpSub, side: 'jp', origIdx: 0 });
      t.push({ uid: `vi_${p.pairId}`, pairId: p.pairId, label: p.vi, side: 'vi', origIdx: 0 });
    });
    return shuffle(t).map((tile, idx) => ({ ...tile, origIdx: idx }));
  }, [q]);

  const [selected, setSelected] = useState<MatchTile | null>(null);
  const selectedRef = useRef<MatchTile | null>(null);
  selectedRef.current = selected;

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongUids, setWrongUids] = useState<[string, string] | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [focusIdx, setFocusIdx] = useState(0);
  const total = q.pairs.length;
  const COLS = 4; // 8 pairs = 16 tiles in 4x4 grid

  const handleTile = useCallback((tile: MatchTile) => {
    if (matched.has(tile.pairId) || wrongUids) return;
    
    const currSel = selectedRef.current;
    if (currSel?.uid === tile.uid) {
      setSelected(null);
      selectedRef.current = null;
      return;
    }
    if (!currSel) {
      setSelected(tile);
      selectedRef.current = tile;
      return;
    }
    if (currSel.pairId === tile.pairId && currSel.side !== tile.side) {
      const newMatched = new Set([...matched, tile.pairId]);
      setMatched(newMatched);
      setSelected(null);
      selectedRef.current = null;
      onStateChange?.(newMatched.size, wrongCount);
      if (newMatched.size === total) {
        setTimeout(() => onDone(newMatched.size, wrongCount), 500);
      }
    } else {
      setWrongUids([currSel.uid, tile.uid]);
      setSelected(null);
      selectedRef.current = null;
      const newWrongCount = wrongCount + 1;
      setWrongCount(newWrongCount);
      onStateChange?.(matched.size, newWrongCount);
      
      const maxWrong = level === 'hard' ? 3 : level === 'normal' ? 5 : 999;
      setTimeout(() => {
        setWrongUids(null);
        if (newWrongCount >= maxWrong) {
          onDone(matched.size, newWrongCount);
        }
      }, 600);
    }
  }, [matched, wrongUids, wrongCount, total, onStateChange, onDone, level]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Check matching shortcut
      const pressedKey = e.key.toLowerCase();
      const shortcutIdx = shortcuts.matching.findIndex((key: string) => key.toLowerCase() === pressedKey);
      if (shortcutIdx !== -1 && shortcutIdx < tiles.length) {
        e.preventDefault();
        const tile = tiles[shortcutIdx];
        if (!matched.has(tile.pairId)) {
          setFocusIdx(shortcutIdx);
          handleTile(tile);
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
      }
      setFocusIdx(prev => {
        let next = prev;
        const r = Math.floor(prev / COLS);
        const c = prev % COLS;
        const ROWS = Math.ceil(tiles.length / COLS);
        if (e.key === 'ArrowRight') {
          next = r * COLS + ((c + 1) % COLS);
        } else if (e.key === 'ArrowLeft') {
          next = r * COLS + ((c - 1 + COLS) % COLS);
        } else if (e.key === 'ArrowDown') {
          next = ((r + 1) % ROWS) * COLS + c;
        } else if (e.key === 'ArrowUp') {
          next = ((r - 1 + ROWS) % ROWS) * COLS + c;
        }
        return next;
      });

      if (e.key === 'Enter' || e.key === ' ') {
        handleTile(tiles[focusIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tiles, handleTile, focusIdx, matched]);

  return (
    <div className="space-y-3">
      <div className="text-center text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">
        🔗 Nối cặp — <span className="text-indigo-500">{matched.size}</span>/{total} <span className="mx-1.5 text-slate-300">|</span> Sai: <span className="text-red-500">{wrongCount}</span>
        <span className="ml-2 text-xs text-slate-400">Gõ phím tương ứng hoặc dùng phím mũi tên di chuyển</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tiles.map((tile, idx) => {
          const isMatched = matched.has(tile.pairId);
          const isSel = selected?.uid === tile.uid;
          const isWrong = wrongUids?.includes(tile.uid);
          const isFocused = focusIdx === idx;

          let stateClass = 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white cursor-pointer';
          if (isMatched) stateClass = 'bg-emerald-50 border-emerald-300 text-emerald-600 dark:bg-emerald-900/30 opacity-40 cursor-default';
          else if (isWrong) stateClass = 'bg-red-50 border-red-400 text-red-600 dark:bg-red-900/30';
          else if (isSel) stateClass = 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 shadow-md ring-2 ring-indigo-300';
          else stateClass += ' hover:border-indigo-400';

          if (isFocused) {
            stateClass += ' scale-105 z-10';
            if (isMatched) stateClass += ' ring-2 ring-emerald-500 border-emerald-500 opacity-100';
            else if (isWrong) stateClass += ' ring-2 ring-red-500 border-red-500';
            else if (!isSel) stateClass += ' ring-2 ring-indigo-400 dark:ring-indigo-500 border-indigo-400';
          }

          return (
            <motion.button
              key={tile.uid}
              onClick={() => { setFocusIdx(idx); handleTile(tile); }}
              disabled={isMatched}
              animate={isWrong ? { x: [0, -5, 5, -3, 3, 0] } : {}}
              transition={{ duration: 0.25 }}
              className={`relative group p-2.5 rounded-xl text-sm font-bold border-2 transition-all text-center min-h-[64px] flex flex-col items-center justify-center ${stateClass}`}
            >
              {shortcuts.matching[idx] && !isMatched && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity z-20">
                  {shortcuts.matching[idx].toUpperCase()}
                </span>
              )}
              <div className={`${tile.side === 'jp' ? 'text-base' : 'text-xs leading-snug'}`}>{tile.label}</div>
              {showKana && tile.sub && <div className="text-xs font-normal text-slate-400 mt-0.5">{tile.sub}</div>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
