import React from 'react';

interface PersonalScoreWidgetProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  avatarUrl?: string | null;
  score: number | string;
  scoreColor?: string; // e.g. 'text-slate-800' or 'text-amber-500'
}

export function PersonalScoreWidget({
  title,
  subtitle,
  icon,
  avatarUrl,
  score,
  scoreColor = 'text-slate-800 dark:text-white',
}: PersonalScoreWidgetProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border-2 border-dashed border-amber-300 dark:border-amber-700/50 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        {avatarUrl !== undefined ? (
          <div className="w-10 h-10 rounded-full border border-amber-200 dark:border-amber-700/50 overflow-hidden shrink-0">
            <img src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg'} alt="avatar" className="w-full h-full object-cover bg-amber-50" />
          </div>
        ) : icon ? (
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-xl shrink-0">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white max-w-[120px] truncate">{title}</h3>
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className={`text-2xl font-black ${scoreColor}`}>
        {typeof score === 'number' ? score.toLocaleString() : score}
      </div>
    </div>
  );
}
