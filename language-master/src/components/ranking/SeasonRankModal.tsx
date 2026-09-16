// src/components/ranking/SeasonRankModal.tsx
// Modal hiển thị chi tiết 7 Bậc Rank Mùa Giải kèm biểu tượng SVG

import { X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { RANK_TIERS, type RankTier } from '../../lib/ranking/seasonRank';
import { RankBadge } from '../shared/RankBadge';

interface SeasonRankModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: RankTier;
  userScore: number;
}

export function SeasonRankModal({
  isOpen,
  onClose,
  currentTier,
  userScore
}: SeasonRankModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-amber-50/50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              🏆 Bảng Hệ Thống 7 Bậc Rank
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Xếp hạng mùa tính theo tổng EXP và thời lượng học tập kiên trì
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Rank List Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
          {RANK_TIERS.map((tierInfo) => {
            const isCurrent = tierInfo.tier === currentTier;
            const isUnlocked = userScore >= tierInfo.minPoints;

            return (
              <div
                key={tierInfo.tier}
                className={`pt-3.5 first:pt-0 flex items-center justify-between gap-4 p-3.5 rounded-2xl transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-2 border-amber-500/40 shadow-md ring-1 ring-amber-500/20'
                    : isUnlocked
                    ? 'bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40'
                    : 'bg-transparent border border-transparent opacity-60'
                }`}
              >
                {/* Left: SVG Badge & Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <RankBadge tier={tierInfo.tier} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {tierInfo.name}
                      </h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white rounded-md shadow-sm">
                          Hiện tại
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-medium line-clamp-2">
                      {tierInfo.description}
                    </p>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 mt-1 inline-block">
                      Yêu cầu:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {tierInfo.minPoints.toLocaleString()}
                        {tierInfo.maxPoints !== Infinity
                          ? ` - ${tierInfo.maxPoints.toLocaleString()}`
                          : '+'}
                      </strong>{' '}
                      điểm
                    </span>
                  </div>
                </div>

                {/* Right: Status Tag */}
                <div className="shrink-0 text-right">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-white shadow-sm">
                      <CheckCircle2 size={14} />
                      Đang giữ
                    </span>
                  ) : isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 size={13} />
                      Đã đạt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                      <ShieldAlert size={13} />
                      Chưa đạt
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Điểm rank của bạn: <strong className="text-amber-600 dark:text-amber-400 font-bold">{userScore.toLocaleString()}</strong> điểm
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
