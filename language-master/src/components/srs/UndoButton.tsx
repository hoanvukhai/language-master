// src/components/srs/UndoButton.tsx
// Nút hoàn tác — hiện 3 giây sau mỗi câu trả lời

import { useState, useEffect } from 'react';
import { Undo2 } from 'lucide-react';

interface UndoButtonProps {
  canUndo: boolean;
  onUndo: () => void;
  triggerKey: number; // Tăng mỗi khi trả lời → reset timer
}

const UNDO_TIMEOUT = 3000;

export default function UndoButton({ canUndo, onUndo, triggerKey }: UndoButtonProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!canUndo || triggerKey === 0) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setProgress(100);

    // Animation cho thanh progress
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / UNDO_TIMEOUT) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setVisible(false);
      }
    }, 50);

    // Auto-hide sau 3s
    const timeout = setTimeout(() => {
      setVisible(false);
    }, UNDO_TIMEOUT);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [triggerKey, canUndo]);

  if (!visible) return null;

  return (
    <button
      onClick={() => {
        onUndo();
        setVisible(false);
      }}
      className="relative flex items-center gap-1.5 px-3 py-2 bg-amber-500/90 hover:bg-amber-500 text-white text-sm font-medium rounded-xl shadow-lg transition-all overflow-hidden"
    >
      <Undo2 className="w-4 h-4" />
      Hoàn tác
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-white/50 transition-all"
        style={{ width: `${progress}%` }}
      />
    </button>
  );
}
