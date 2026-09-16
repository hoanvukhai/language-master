import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronDown, Flame, Sparkles } from 'lucide-react';
import { getAllCourses } from '../../../data/courses/registry';

interface ContributionTimelineProps {
  dailyStudyTime: Record<string, number>; // Seconds per date
  activityHistory?: Record<string, number>; // EXP per date
  courseStudyScores?: Record<string, number>; // Score per course
  selectedYear?: number;
}

interface MonthActivity {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "September 2026" / "Tháng 9 2026"
  totalMinutes: number;
  totalExp: number;
  activeDays: number;
  learnedWordsCount: number;
  courses: {
    id: string;
    name: string;
    color: string;
    reviewsCount: number;
    percent: number;
  }[];
}

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export function ContributionTimeline({
  dailyStudyTime = {},
  activityHistory = {},
  courseStudyScores = {},
  selectedYear
}: ContributionTimelineProps) {
  const allCourses = useMemo(() => getAllCourses(), []);
  const [visibleCount, setVisibleCount] = useState<number>(3); // Hiển thị 3 tháng gần nhất, có nút xem thêm

  // Reset pagination khi đổi năm
  useEffect(() => {
    setVisibleCount(3);
  }, [selectedYear]);

  // Nhóm hoạt động theo từng tháng (YYYY-MM) thuộc selectedYear
  const monthlyData: MonthActivity[] = useMemo(() => {
    const targetYear = selectedYear ?? new Date().getFullYear();
    const yearPrefix = `${targetYear}-`;
    const monthsMap: Record<string, { seconds: number; exp: number; activeDays: Set<string> }> = {};

    // Gộp từ dailyStudyTime
    Object.entries(dailyStudyTime).forEach(([dateStr, seconds]) => {
      if (!seconds || seconds <= 0) return;
      if (!dateStr.startsWith(yearPrefix)) return;
      const monthKey = dateStr.slice(0, 7); // YYYY-MM
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { seconds: 0, exp: 0, activeDays: new Set() };
      }
      monthsMap[monthKey].seconds += seconds;
      monthsMap[monthKey].activeDays.add(dateStr);
    });

    // Gộp từ activityHistory (EXP)
    Object.entries(activityHistory).forEach(([dateStr, exp]) => {
      if (!exp || exp <= 0) return;
      if (!dateStr.startsWith(yearPrefix)) return;
      const monthKey = dateStr.slice(0, 7);
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { seconds: 0, exp: 0, activeDays: new Set() };
      }
      monthsMap[monthKey].exp += exp;
      monthsMap[monthKey].activeDays.add(dateStr);
    });

    // Đảm bảo tháng hiện tại có mặt nếu là năm hiện tại và chưa có data
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    if (targetYear === now.getFullYear() && !monthsMap[currentMonthKey]) {
      monthsMap[currentMonthKey] = { seconds: 0, exp: 0, activeDays: new Set() };
    }

    const sortedMonthKeys = Object.keys(monthsMap).sort().reverse();

    // Tính tỷ lệ đóng góp khóa học dựa trên courseStudyScores

    return sortedMonthKeys.map(monthKey => {
      const [yearStr, mStr] = monthKey.split('-');
      const monthIndex = parseInt(mStr, 10) - 1;
      const year = parseInt(yearStr, 10);
      const data = monthsMap[monthKey];
      const totalMinutes = Math.floor(data.seconds / 60);

      // Phân bổ danh sách khóa học hoạt động
      const activeCoursesList = allCourses
        .map(c => {
          const score = courseStudyScores[c.id] || 0;
          return {
            id: c.id,
            name: c.name,
            color: c.color,
            score
          };
        })
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

      // Nếu người dùng mới chưa có nhiều khóa hoặc điểm, hiển thị các khóa đang thêm
      const maxScore = Math.max(...activeCoursesList.map(c => c.score), 1);

      const courses = activeCoursesList.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        reviewsCount: Math.round(c.score / 3) || 1, // ước tính lượt ôn
        percent: Math.min(100, Math.max(15, Math.round((c.score / maxScore) * 100)))
      }));

      const totalWords = Math.round(data.exp / 4) || (totalMinutes > 0 ? Math.max(1, Math.round(totalMinutes / 2)) : 0);

      return {
        monthKey,
        monthName: `${MONTH_NAMES[monthIndex]} ${year}`,
        totalMinutes,
        totalExp: data.exp,
        activeDays: data.activeDays.size,
        learnedWordsCount: totalWords,
        courses: courses.length > 0 ? courses : [
          {
            id: allCourses[0]?.id || 'essential-1',
            name: allCourses[0]?.name || '4000 Essential English Words - Book 1',
            color: 'sky',
            reviewsCount: Math.max(1, Math.round(data.exp / 3)),
            percent: 65
          }
        ]
      };
    });
  }, [dailyStudyTime, activityHistory, courseStudyScores, allCourses, selectedYear]);

  const displayedMonths = monthlyData.slice(0, visibleCount);
  const targetYear = selectedYear ?? new Date().getFullYear();

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h} giờ ${m > 0 ? `${m} phút` : ''}`;
    return `${m} phút`;
  };

  return (
    <div className="w-full text-slate-800 dark:text-slate-200 font-sans space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-500" />
          Contribution activity ({targetYear})
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Dòng thời gian hoạt động theo năm
        </span>
      </div>

      {displayedMonths.length === 0 ? (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
          Chưa có hoạt động học tập nào được ghi nhận trong năm {targetYear}.
        </div>
      ) : (
        /* Timeline Container */
        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
          {displayedMonths.map((m) => {
            const totalReviews = m.courses.reduce((sum, c) => sum + c.reviewsCount, 0);

            return (
              <div key={m.monthKey} className="relative space-y-3">
                {/* Timeline Dot / Icon */}
                <div className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                {/* Month Header with Line */}
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {m.monthName}
                  </h4>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                </div>

                {/* Monthly Stats Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                    <Clock size={13} />
                    {formatHours(m.totalMinutes)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                    <Flame size={13} />
                    {m.activeDays} ngày học tập
                  </span>
                  {m.learnedWordsCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                      <BookOpen size={13} />
                      {m.learnedWordsCount} từ đã thuộc
                    </span>
                  )}
                  {m.totalExp > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      <Sparkles size={13} />
                      +{m.totalExp} EXP
                    </span>
                  )}
                </div>

                {/* Summary Statement like GitHub: "Created 15 commits in 2 repositories" */}
                <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  Đã hoàn thành <strong className="text-slate-800 dark:text-white font-bold">{totalReviews} lượt ôn tập</strong>
                  {m.learnedWordsCount > 0 && <> và ghi nhớ <strong className="text-slate-800 dark:text-white font-bold">{m.learnedWordsCount} từ vựng</strong></>} trong {m.courses.length} khóa học
                </div>

                {/* Course Progress Bars (Exact GitHub Commit Bar Style) */}
                <div className="space-y-2 bg-slate-50/50 dark:bg-slate-850/40 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-700/40">
                  {m.courses.map((c) => (
                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 text-xs py-1">
                      {/* Course Link */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          to={`/course/${c.id}`}
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[280px] sm:max-w-[360px]"
                          title={c.name}
                        >
                          {c.name}
                        </Link>
                        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          {c.reviewsCount} lượt
                        </span>
                      </div>

                      {/* Progress Bar (Green GitHub Style) */}
                      <div className="w-full sm:w-48 flex items-center">
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2da44e] dark:bg-[#39d353] rounded-full transition-all duration-700"
                            style={{ width: `${c.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Show more activity button */}
      {visibleCount < monthlyData.length && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 3)}
            className="w-full py-2.5 px-4 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <ChevronDown size={16} />
            Show more activity (Xem thêm hoạt động)
          </button>
        </div>
      )}

      {/* Footer text */}
      <div className="pt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
        Seeing something unexpected? Nhật ký hoạt động ghi nhận lượt ôn tập, học mới và thời gian học tập theo chuẩn đóng góp GitHub.
      </div>
    </div>
  );
}
