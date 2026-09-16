// src/components/shared/RankBadge.tsx
// Component hiển thị Huy Hiệu Bậc Rank với SVG Shield chuẩn

import React from 'react';
import type { RankTier } from '../../lib/ranking/seasonRank';

import bronzeSvg from '../../assets/svg/bronze.svg';
import silverSvg from '../../assets/svg/silver.svg';
import goldSvg from '../../assets/svg/gold.svg';
import platinumSvg from '../../assets/svg/platinum.svg';
import diamondSvg from '../../assets/svg/diamond.svg';
import masterSvg from '../../assets/svg/master.svg';
import grandmasterSvg from '../../assets/svg/grandmaster.svg';

export const RANK_SVGS: Record<RankTier, string> = {
  bronze: bronzeSvg,
  silver: silverSvg,
  gold: goldSvg,
  platinum: platinumSvg,
  diamond: diamondSvg,
  master: masterSvg,
  grandmaster: grandmasterSvg,
};

export const RANK_TIER_META: Record<RankTier, {
  label: string;
  textColor: string;
  glowColor: string;
  borderAccent: string;
}> = {
  bronze: {
    label: 'Đồng',
    textColor: 'text-amber-700 dark:text-amber-400',
    glowColor: 'drop-shadow-[0_4px_12px_rgba(205,127,50,0.35)]',
    borderAccent: 'border-amber-700/50'
  },
  silver: {
    label: 'Bạc',
    textColor: 'text-slate-600 dark:text-slate-300',
    glowColor: 'drop-shadow-[0_4px_12px_rgba(189,195,199,0.4)]',
    borderAccent: 'border-slate-400/50'
  },
  gold: {
    label: 'Vàng',
    textColor: 'text-yellow-600 dark:text-yellow-400 font-extrabold',
    glowColor: 'drop-shadow-[0_4px_14px_rgba(234,179,8,0.45)]',
    borderAccent: 'border-yellow-500/50'
  },
  platinum: {
    label: 'Bạch Kim',
    textColor: 'text-cyan-600 dark:text-cyan-300 font-extrabold',
    glowColor: 'drop-shadow-[0_4px_14px_rgba(43,209,167,0.45)]',
    borderAccent: 'border-cyan-400/50'
  },
  diamond: {
    label: 'Kim Cương',
    textColor: 'text-blue-600 dark:text-blue-300 font-extrabold',
    glowColor: 'drop-shadow-[0_4px_16px_rgba(42,117,211,0.5)]',
    borderAccent: 'border-blue-400/50'
  },
  master: {
    label: 'Cao Thủ',
    textColor: 'text-purple-600 dark:text-purple-300 font-black',
    glowColor: 'drop-shadow-[0_4px_18px_rgba(139,20,189,0.55)]',
    borderAccent: 'border-purple-400/50'
  },
  grandmaster: {
    label: 'Thách Đấu',
    textColor: 'text-rose-600 dark:text-rose-400 font-black',
    glowColor: 'drop-shadow-[0_4px_20px_rgba(255,26,64,0.65)]',
    borderAccent: 'border-rose-500/60'
  }
};

export interface RankBadgeProps {
  tier: RankTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
  customSvg?: React.ReactNode;
  onClick?: () => void;
}

export function RankBadge({
  tier,
  size = 'md',
  showLabel = false,
  className = '',
  customSvg,
  onClick
}: RankBadgeProps) {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-[11px]' },
    md: { box: 'w-10 h-10', text: 'text-xs font-semibold' },
    lg: { box: 'w-16 h-16', text: 'text-sm font-bold' },
    xl: { box: 'w-24 h-24 sm:w-28 sm:h-28', text: 'text-base font-black' }
  };

  const current = RANK_TIER_META[tier] || RANK_TIER_META.bronze;
  const svgUrl = RANK_SVGS[tier] || RANK_SVGS.bronze;

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div
        className={`relative ${sizeMap[size].box} flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-110 select-none group`}
        title={`Bậc Rank: ${current.label}`}
      >
        {customSvg ? (
          customSvg
        ) : (
          <img
            src={svgUrl}
            alt={`Rank ${current.label}`}
            className={`w-full h-full object-contain filter ${current.glowColor} transition-all duration-300 group-hover:brightness-110`}
            loading="lazy"
            draggable={false}
          />
        )}
      </div>

      {showLabel && (
        <span className={`${sizeMap[size].text} ${current.textColor}`}>
          {current.label}
        </span>
      )}
    </div>
  );
}
