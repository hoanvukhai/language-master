import { Trophy, User } from 'lucide-react';
import { type LeaderboardUser } from '../../lib/srs/firestoreSync';

interface LeaderboardWidgetProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  leaderboard: LeaderboardUser[];
  loading: boolean;
  currentUserId?: string;
  getScore: (u: LeaderboardUser) => number;
  size?: 'sm' | 'md';
  hideTitle?: boolean;
  maxItems?: number;
  footer?: React.ReactNode;
}

export function LeaderboardWidget({
  title,
  subtitle,
  icon = <Trophy className="w-5 h-5 text-amber-500" />,
  leaderboard,
  loading,
  currentUserId,
  getScore,
  size = 'sm',
  hideTitle = false,
  maxItems = 10,
  footer
}: LeaderboardWidgetProps) {
  const getRankLabel = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return (idx + 1) + '.';
  };

  const topSlots = Array.from({ length: maxItems }).map((_, i) => leaderboard[i] || null);
  const currentUserItem = currentUserId ? leaderboard.find(u => u.uid === currentUserId) : null;
  const isUserInTop10 = currentUserItem ? leaderboard.findIndex(u => u.uid === currentUserId) < maxItems : false;
  const userScore = currentUserItem ? getScore(currentUserItem) : 0;
  const currentUserRank = currentUserItem ? leaderboard.findIndex(u => u.uid === currentUserId) + 1 : 0;

  // Styling maps based on size
  const s = {
    titleSize: size === 'md' ? 'text-lg' : 'text-base',
    py: size === 'md' ? 'py-3' : 'py-2.5',
    px: size === 'md' ? 'px-2' : 'px-1',
    rankW: size === 'md' ? 'w-8' : 'w-6',
    rankText0: size === 'md' ? 'text-lg' : 'text-sm',
    rankText: size === 'md' ? 'text-sm' : 'text-xs',
    avaSize: size === 'md' ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-[10px]',
    nameSize: size === 'md' ? 'text-sm' : 'text-xs',
    scoreSize: size === 'md' ? 'text-base' : 'text-xs',
    dotSpace: size === 'md' ? 'py-2' : 'py-1',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
      {/* Header */}
      {!hideTitle && (
        <div className="flex flex-col border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <h2 className={`font-black ${s.titleSize} text-slate-800 dark:text-white uppercase tracking-wider`}>
              {title}
            </h2>
          </div>
          {subtitle && <div className="mt-2 text-slate-500 dark:text-slate-400 text-sm">{subtitle}</div>}
        </div>
      )}

      {/* List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {topSlots.map((item, idx) => {
              if (!item) {
                return (
                  <div key={`empty-${idx}`} className={`flex items-center justify-between ${s.py} ${s.px} text-slate-300 dark:text-slate-600 font-medium ${s.nameSize}`}>
                    <div className="flex items-center gap-3">
                      <span className={`${s.rankW} text-center font-bold ${s.rankText}`}>{idx + 1}.</span>
                      <div className={`${s.avaSize} rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300`}>
                        <User className="w-1/2 h-1/2" />
                      </div>
                      <span>Trống</span>
                    </div>
                    <span>---</span>
                  </div>
                );
              }

              const isMe = currentUserId === item.uid;
              const modeScore = getScore(item);

              return (
                <div key={item.uid} className={`flex items-center justify-between ${s.py} ${s.px} rounded-2xl transition-colors ${isMe ? 'bg-amber-500/10 font-bold border border-amber-500/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`${s.rankW} text-center font-black shrink-0 ${idx === 0 ? `text-amber-500 ${s.rankText0}` : idx === 1 ? `text-slate-400 ${s.rankText0}` : idx === 2 ? `text-amber-700 ${s.rankText0}` : `text-slate-400 ${s.rankText}`}`}>
                      {getRankLabel(idx)}
                    </span>
                    <div className={`${s.avaSize} rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
                      {item.photoURL ? (
                        <img src={item.photoURL} alt={item.displayName} className="w-full h-full object-cover" />
                      ) : (
                        item.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="truncate">
                      <p className={`${s.nameSize} font-extrabold text-slate-800 dark:text-white truncate flex items-center gap-1`}>
                        {item.displayName}
                        {isMe && <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">BẠN</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`${s.scoreSize} font-black text-slate-800 dark:text-white`}>{modeScore.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}

            {!isUserInTop10 && currentUserItem && userScore > 0 && (
              <>
                <div className={`${s.dotSpace} text-center text-slate-400 font-black ${s.nameSize} tracking-widest`}>. . .</div>
                <div className={`flex items-center justify-between ${s.py} ${s.px} rounded-2xl bg-indigo-600/10 border-2 border-indigo-500/40 font-bold shadow-sm mt-2`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`${s.rankW} text-center font-black ${s.rankText} text-indigo-600 shrink-0`}>#{currentUserRank}</span>
                    <div className={`${s.avaSize} rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
                      {currentUserItem.photoURL ? (
                        <img src={currentUserItem.photoURL} alt={currentUserItem.displayName} className="w-full h-full object-cover" />
                      ) : (
                        currentUserItem.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="truncate">
                      <p className={`${s.nameSize} font-extrabold text-slate-800 dark:text-white truncate flex items-center gap-1`}>
                        {currentUserItem.displayName}
                        <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">BẠN</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`${s.scoreSize} font-black text-indigo-600`}>{userScore.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {footer && (
        <div className="pt-2">
          {footer}
        </div>
      )}
    </div>
  );
}
