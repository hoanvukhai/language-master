// src/components/srs/WaterDrops.tsx
// Hiển thị 3 giọt nước (RAM score) — trạng thái học trong phiên

import { RAM_REQUIRED_SCORE } from '../../lib/srs/srsTypes';

interface WaterDropsProps {
  score?: number;  // 0 đến RAM_REQUIRED_SCORE
  drops?: number;
  size?: 'sm' | 'md';
}

export default function WaterDrops({ score, drops, size = 'md' }: WaterDropsProps) {
  const currentScore = drops ?? score ?? 0;
  const dropSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-1" title={`${currentScore}/${RAM_REQUIRED_SCORE} lần đúng`}>
      {Array.from({ length: RAM_REQUIRED_SCORE }, (_, i) => (
        <span
          key={i}
          className={`${dropSize} rounded-full transition-all duration-300 ${
            i < currentScore
              ? 'bg-gradient-to-b from-cyan-400 to-blue-500 shadow-sm shadow-blue-400/50 scale-100'
              : 'bg-slate-200 dark:bg-slate-600 scale-90'
          }`}
        />
      ))}
    </div>
  );
}
