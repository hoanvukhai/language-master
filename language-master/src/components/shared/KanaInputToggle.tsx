// src/components/shared/KanaInputToggle.tsx
import React from 'react';
import { type KanaInputMode } from '../../lib/romajiConverter';

interface KanaInputToggleProps {
  mode: KanaInputMode;
  onToggle: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const KanaInputToggle: React.FC<KanaInputToggleProps> = ({
  mode,
  onToggle,
  className = '',
  size = 'md',
}) => {
  const isHira = mode === 'hiragana';

  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer select-none active:scale-95 shadow-2xs border ${
        isHira
          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
          : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60'
      } ${
        size === 'sm'
          ? 'px-2 py-1 text-xs'
          : 'px-2.5 py-1.5 text-xs md:text-sm'
      } ${className}`}
      title={`Đang gõ: ${isHira ? 'Hiragana (chữ mềm)' : 'Katakana (chữ cứng)'}. Bấm hoặc ấn Tab để đổi! (Giữ Shift gõ chữ cứng)`}
    >
      <span className="w-5 h-5 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-2xs text-xs font-black shrink-0 border border-slate-200/60 dark:border-slate-700/60">
        {isHira ? 'あ' : 'ア'}
      </span>
      <span className="hidden sm:inline">
        {isHira ? 'Hiragana' : 'Katakana'}
      </span>
      <kbd className="hidden md:inline-block px-1 py-0.2 text-[9px] font-mono rounded bg-black/5 dark:bg-white/10 opacity-70">
        Tab
      </kbd>
    </button>
  );
};

export default KanaInputToggle;
