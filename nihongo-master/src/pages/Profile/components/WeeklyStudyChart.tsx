// src/pages/Profile/components/WeeklyStudyChart.tsx
// Biểu đồ cột thời gian học 7 ngày trong tuần (Thứ 2 -> Chủ Nhật)

import { useMemo } from 'react';
import { Calendar, Target } from 'lucide-react';

interface WeeklyStudyChartProps {
  dailyStudyTime: Record<string, number>; // Seconds per date (YYYY-MM-DD)
  dailyGoalMinutes?: number; // Mục tiêu học hàng ngày, mặc định 30 phút
}

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const SHORT_DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function WeeklyStudyChart({
  dailyStudyTime = {},
  dailyGoalMinutes = 30
}: WeeklyStudyChartProps) {
  // Lấy 7 ngày của tuần hiện tại (bắt đầu từ Thứ 2)
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7; // 0: Thứ 2, ..., 6: CN
    const todayStr = now.toLocaleDateString('en-CA');

    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDay);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toLocaleDateString('en-CA');
      const seconds = dailyStudyTime[dateStr] || 0;
      const minutes = Math.floor(seconds / 60);
      const isToday = dateStr === todayStr;
      const isFuture = d > now && !isToday;

      days.push({
        name: DAY_NAMES[i],
        shortName: SHORT_DAY_NAMES[i],
        dateStr,
        minutes,
        isToday,
        isFuture,
        reachedGoal: minutes >= dailyGoalMinutes
      });
    }
    return days;
  }, [dailyStudyTime, dailyGoalMinutes]);

  const totalWeeklyMinutes = useMemo(() => {
    return weekDays.reduce((sum, d) => sum + d.minutes, 0);
  }, [weekDays]);

  const maxMinutesInWeek = useMemo(() => {
    const maxDay = Math.max(...weekDays.map(d => d.minutes), 0);
    // Để biểu đồ thoáng, lấy max ít nhất là mục tiêu + 15 phút
    return Math.max(maxDay, dailyGoalMinutes + 15);
  }, [weekDays, dailyGoalMinutes]);

  const goalPercent = Math.min(100, Math.round((dailyGoalMinutes / maxMinutesInWeek) * 100));

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} phút`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-800 dark:text-white">
              Thời Gian Học Trong Tuần
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng cộng: <strong className="text-indigo-600 dark:text-indigo-400">{formatHours(totalWeeklyMinutes)}</strong> tuần này
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
          <span className="flex items-center gap-1 font-medium">
            <Target size={14} className="text-amber-500" />
            Mục tiêu: {dailyGoalMinutes}p/ngày
          </span>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="relative pt-6 pb-2">
        {/* Đường vạch mục tiêu (Goal line) */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-amber-400/60 dark:border-amber-500/40 z-0 flex items-center justify-end pointer-events-none"
          style={{ bottom: `calc(${goalPercent}% + 28px)` }}
        >
          <span className="text-[10px] font-bold text-amber-500 bg-white/80 dark:bg-slate-800/80 px-1 rounded -translate-y-2">
            Mục tiêu {dailyGoalMinutes}p
          </span>
        </div>

        {/* 7 Cột ngày */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 h-48 items-end relative z-10">
          {weekDays.map((day) => {
            const barHeightPercent = maxMinutesInWeek > 0
              ? Math.min(100, Math.max(day.minutes > 0 ? 8 : 2, Math.round((day.minutes / maxMinutesInWeek) * 100)))
              : 2;

            return (
              <div key={day.dateStr} className="flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip khi hover */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-800 text-white text-[11px] font-semibold py-1 px-2 rounded-lg shadow-lg whitespace-nowrap z-20">
                  {day.name}: {day.minutes} phút
                  {day.reachedGoal && ' ⭐ Đạt chỉ tiêu'}
                </div>

                {/* Cột Bar */}
                <div className="w-full max-w-[36px] bg-slate-100 dark:bg-slate-700/50 rounded-xl h-full flex items-end p-1 overflow-hidden">
                  <div
                    style={{ height: `${barHeightPercent}%` }}
                    className={`w-full rounded-lg transition-all duration-700 relative ${
                      day.reachedGoal
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : day.isToday
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                        : day.minutes > 0
                        ? 'bg-gradient-to-t from-slate-400 to-indigo-400 dark:from-slate-500 dark:to-indigo-500'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Hiệu ứng bóng sáng */}
                    {day.minutes > 0 && (
                      <div className="absolute inset-0 bg-white/20 rounded-lg" />
                    )}
                  </div>
                </div>

                {/* Nhãn Thứ & Ngày */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-[11px] font-bold block ${
                      day.isToday
                        ? 'text-indigo-600 dark:text-indigo-400 font-black'
                        : day.isFuture
                        ? 'text-slate-300 dark:text-slate-600'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {day.shortName}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {day.minutes > 0 ? `${day.minutes}p` : '-'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
