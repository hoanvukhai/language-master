import type { ReactNode } from 'react';

interface Props {
  options: string[];             // list bài học
  selected: string[];            // các bài đang chọn ([] = "Tất cả")
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  getLabel?: (value: string) => string;
  getCount?: (value: string) => number;
  totalCount: number;
  accentClass?: string;          // màu accent (border/bg khi active)
}

export default function KanjiLessonChips({
  options, selected, onToggle, onSelectAll,
  getLabel, getCount, totalCount,
  accentClass = 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
}: Props): ReactNode {
  const isAll = selected.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Chọn bài học
          </label>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {isAll ? `Tất cả (${totalCount})` : `${selected.length} đã chọn`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* "Tất cả" chip */}
          <button
            onClick={onSelectAll}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border-2 text-xs md:text-sm font-bold transition-all ${
              isAll
                ? accentClass
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            Tất cả ({totalCount})
          </button>

          {/* Individual chips */}
          {options.map(opt => {
            const label = getLabel ? getLabel(opt) : opt;
            const count = getCount ? getCount(opt) : undefined;
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                onClick={() => onToggle(opt)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border-2 text-xs md:text-sm font-bold transition-all ${
                  active
                    ? accentClass
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {label}{count !== undefined ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
