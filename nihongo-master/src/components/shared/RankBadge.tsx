// src/components/shared/RankBadge.tsx
// Component hiển thị Huy Hiệu Bậc Rank (SVG-ready)

import React from 'react';
import { Shield, Award, Medal, Crown, Gem, Flame } from 'lucide-react';
import type { RankTier } from '../../lib/ranking/seasonRank';

interface RankBadgeProps {
  tier: RankTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
  // Cho phép truyền file SVG hoặc ReactNode tùy chỉnh trong tương lai
  customSvg?: React.ReactNode;
}

export function RankBadge({
  tier,
  size = 'md',
  showLabel = false,
  className = '',
  customSvg
}: RankBadgeProps) {
  // Cấu hình kích thước
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 14, text: 'text-[11px]' },
    md: { box: 'w-10 h-10', icon: 20, text: 'text-xs' },
    lg: { box: 'w-14 h-14', icon: 28, text: 'text-sm font-bold' },
    xl: { box: 'w-20 h-20', icon: 40, text: 'text-base font-black' }
  };

  // Cấu hình theme màu & icon theo từng bậc rank
  const tierConfig: Record<RankTier, {
    label: string;
    icon: React.ReactNode;
    bgGradient: string;
    borderGradient: string;
    textColor: string;
    glowColor: string;
  }> = {
    bronze: {
      label: 'Đồng',
      icon: <Shield size={sizeMap[size].icon} className="text-amber-600 dark:text-amber-400" />,
      bgGradient: 'from-amber-700/20 via-amber-800/10 to-amber-950/30',
      borderGradient: 'border-amber-700/60 dark:border-amber-600/60',
      textColor: 'text-amber-700 dark:text-amber-400',
      glowColor: 'shadow-amber-700/20'
    },
    silver: {
      label: 'Bạc',
      icon: <Medal size={sizeMap[size].icon} className="text-slate-400 dark:text-slate-300" />,
      bgGradient: 'from-slate-400/20 via-slate-500/10 to-slate-700/30',
      borderGradient: 'border-slate-400/60 dark:border-slate-400/60',
      textColor: 'text-slate-600 dark:text-slate-300',
      glowColor: 'shadow-slate-400/20'
    },
    gold: {
      label: 'Vàng',
      icon: <Award size={sizeMap[size].icon} className="text-amber-500" />,
      bgGradient: 'from-amber-400/30 via-yellow-500/15 to-amber-600/30',
      borderGradient: 'border-amber-400 dark:border-amber-400',
      textColor: 'text-amber-600 dark:text-amber-300 font-extrabold',
      glowColor: 'shadow-amber-500/30'
    },
    platinum: {
      label: 'Bạch Kim',
      icon: <Gem size={sizeMap[size].icon} className="text-cyan-400" />,
      bgGradient: 'from-cyan-400/30 via-teal-500/15 to-blue-600/30',
      borderGradient: 'border-cyan-400 dark:border-cyan-300',
      textColor: 'text-cyan-600 dark:text-cyan-300 font-extrabold',
      glowColor: 'shadow-cyan-500/30'
    },
    diamond: {
      label: 'Kim Cương',
      icon: <Gem size={sizeMap[size].icon} className="text-blue-500 fill-blue-500/20" />,
      bgGradient: 'from-blue-500/30 via-indigo-500/20 to-sky-600/30',
      borderGradient: 'border-blue-400 dark:border-blue-300',
      textColor: 'text-blue-600 dark:text-blue-300 font-extrabold',
      glowColor: 'shadow-blue-500/40'
    },
    master: {
      label: 'Cao Thủ',
      icon: <Flame size={sizeMap[size].icon} className="text-purple-500 fill-purple-500/20 animate-pulse" />,
      bgGradient: 'from-purple-600/35 via-fuchsia-500/20 to-violet-700/35',
      borderGradient: 'border-purple-400 dark:border-purple-300',
      textColor: 'text-purple-600 dark:text-purple-300 font-black',
      glowColor: 'shadow-purple-500/40'
    },
    grandmaster: {
      label: 'Thách Đấu',
      icon: <Crown size={sizeMap[size].icon} className="text-rose-500 fill-rose-500/30" />,
      bgGradient: 'from-rose-500/40 via-red-600/20 to-amber-500/40',
      borderGradient: 'border-rose-500 dark:border-rose-400 ring-2 ring-amber-400/50',
      textColor: 'text-rose-600 dark:text-rose-400 font-black',
      glowColor: 'shadow-rose-500/50'
    }
  };

  const current = tierConfig[tier] || tierConfig.bronze;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`relative ${sizeMap[size].box} rounded-2xl flex items-center justify-center bg-gradient-to-br ${current.bgGradient} border-2 ${current.borderGradient} shadow-md ${current.glowColor} transition-transform hover:scale-105 shrink-0 overflow-hidden`}
        title={`Bậc Rank: ${current.label}`}
      >
        {/* Lớp bóng nhẹ ánh kim */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
        
        {/* Nơi hiển thị SVG tự tạo trong tương lai, hoặc icon mặc định */}
        {customSvg ? (
          customSvg
        ) : (
          <div className="relative z-10 flex items-center justify-center">
            {current.icon}
          </div>
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
