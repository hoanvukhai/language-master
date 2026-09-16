// src/components/grammar/GrammarLessonChips.tsx
// Shared multi-select chip component cho tất cả Grammar games
import type { ReactNode } from 'react';

interface Props {
  filterType: 'lesson' | 'group';
  onFilterTypeChange: (t: 'lesson' | 'group') => void;
  options: string[];             // list bài hoặc nhóm
  selected: string[];            // các bài/nhóm đang chọn ([] = "Tất cả")
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  getLabel?: (value: string) => string;
  getCount?: (value: string) => number;
  totalCount: number;
  accentClass?: string;          // màu accent (border/bg khi active)
}

const GROUP_LABELS: Record<string, string> = {
  Emotion_Desire: '🎭 Cảm xúc & Mong muốn',
  Request_Advice: '🙏 Yêu cầu & Lời khuyên',
  Hearsay_Quotation: '💬 Truyền đạt & Nghe nói',
  Negative_Condition: '🚫 Phủ định & Điều kiện',
  Habit_Rule: '📋 Thói quen & Quy tắc',
  Addition_Emphasis: '➕ Bổ sung & Nhấn mạnh',
  Effort_Intention: '💪 Nỗ lực & Ý định',
  CompoundVerbs: '⚔️ Ghép động từ',
  TimeSequence: '⏱️ Thời gian & Thứ tự',
  Cause_Reason: '🔗 Nguyên nhân & Kết quả',
  CauseReason: '🔗 Nguyên nhân & Kết quả',
  StateTendency: '🎯 Tình trạng & Xu hướng',
  Inference: '🕵️ Phán đoán & Suy luận',
  Contrast: '⚖️ Đối lập & So sánh',
  Particles: '📌 Hạt từ nâng cao',
  AdvancedParticles: '📌 Giới từ nâng cao',
  SpokenAdvice: '🗣️ Văn nói & Lời khuyên',
  SpokenLanguage: '🗣️ Văn nói',
  Condition_Hypothesis: '🔀 Điều kiện & Giả định',
  Condition_Negative: '🚫 Phủ định & Điều kiện',
  Keigo: '🎓 Kính ngữ',
  Comparison_Degree: '📊 So sánh & Mức độ',
};

export function getGroupLabel(g: string) {
  return GROUP_LABELS[g] ?? g;
}

export default function GrammarLessonChips({
  filterType, onFilterTypeChange,
  options, selected, onToggle, onSelectAll,
  getLabel, getCount, totalCount,
  accentClass = 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
}: Props): ReactNode {
  const isAll = selected.length === 0;

  return (
    <div className="space-y-4">
      {/* Filter type toggle */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Lọc theo
        </label>
        <div className="flex gap-2">
          {(['lesson', 'group'] as const).map(type => (
            <button
              key={type}
              onClick={() => onFilterTypeChange(type)}
              className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                filterType === type
                  ? accentClass
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {type === 'lesson' ? '📚 Theo Bài' : '🎭 Theo Nhóm'}
            </button>
          ))}
        </div>
      </div>

      {/* Chip selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {filterType === 'lesson' ? 'Chọn bài' : 'Chọn nhóm'}
          </label>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {isAll ? `Tất cả (${totalCount})` : `${selected.length} đã chọn`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* "Tất cả" chip */}
          <button
            onClick={onSelectAll}
            className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${
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
                className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${
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
