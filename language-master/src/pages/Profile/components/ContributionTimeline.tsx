import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, ChevronDown, Flame, Sparkles, RotateCcw } from 'lucide-react';
import { getAllCourses } from '../../../data/courses/registry';
import type { UserSRSOverview } from '../../../lib/srs/firestoreSync';

interface ContributionTimelineProps {
  dailyStudyTime: Record<string, number>; // Seconds per date
  activityHistory?: Record<string, number>; // EXP per date
  activityReviews?: Record<string, number>; // Reviews count per date
  courseStudyScores?: Record<string, number>; // Score per course
  myCourseIds?: string[]; // IDs of user's enrolled courses
  selectedYear?: number;
  srsOverview?: UserSRSOverview | null;
}

interface MonthActivity {
  monthKey: string; // YYYY-MM
  monthName: string; // e.g. "Tháng 9 2026"
  totalMinutes: number;
  totalExp: number;
  activeDays: number;
  learnedWordsCount: number;
  reviewsCount: number;
  courses: {
    id: string;
    name: string;
    template?: string;
    level?: string;
    color: string;
    score: number;
    learnedCount: number;
    totalWords: number;
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
  activityReviews = {},
  courseStudyScores = {},
  myCourseIds = [],
  selectedYear,
  srsOverview = null
}: ContributionTimelineProps) {
  const allCourses = useMemo(() => getAllCourses(), []);
  const [visibleCount, setVisibleCount] = useState<number>(3);

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

    // Đếm số lượt ôn của từng tháng từ activityReviews
    const monthlyReviewsMap: Record<string, number> = {};
    Object.entries(activityReviews).forEach(([dateStr, count]) => {
      if (!count || count <= 0) return;
      if (!dateStr.startsWith(yearPrefix)) return;
      const monthKey = dateStr.slice(0, 7);
      monthlyReviewsMap[monthKey] = (monthlyReviewsMap[monthKey] || 0) + count;
    });

    // Đảm bảo tháng hiện tại có mặt nếu là năm hiện tại và chưa có data
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    if (targetYear === now.getFullYear() && !monthsMap[currentMonthKey]) {
      monthsMap[currentMonthKey] = { seconds: 0, exp: 0, activeDays: new Set() };
    }

    const sortedMonthKeys = Object.keys(monthsMap).sort().reverse();

    // Xác định danh sách khóa học thực tế của người dùng:
    // 1. Các khóa có điểm học trong courseStudyScores
    // 2. Hoặc các khóa người dùng đã đăng ký (myCourseIds)
    const userRelevantCourses = allCourses.filter(c => {
      const hasScore = (courseStudyScores[c.id] || 0) > 0;
      const isEnrolled = myCourseIds.includes(c.id);
      return hasScore || isEnrolled;
    });

    // Nếu người dùng chưa thêm khóa nào, chỉ dùng khóa đầu tiên của họ hoặc khóa phổ biến
    const baseCourses = userRelevantCourses.length > 0 
      ? userRelevantCourses 
      : allCourses.filter(c => myCourseIds.length > 0 ? myCourseIds.includes(c.id) : c.id === 'essential-starter');

    return sortedMonthKeys.map(monthKey => {
      const [yearStr, mStr] = monthKey.split('-');
      const monthIndex = parseInt(mStr, 10) - 1;
      const year = parseInt(yearStr, 10);
      const data = monthsMap[monthKey];
      const totalMinutes = Math.floor(data.seconds / 60);
      const monthExp = data.exp;

      // 1. Số từ đã thuộc của tháng (Level >= 1 thực tế từ srs_progress)
      let monthLearnedWords = srsOverview?.monthlyLearnedWords?.[monthKey] || 0;
      if (monthLearnedWords === 0 && (srsOverview?.totalLearnedWords || 0) > 0) {
        if (monthKey === sortedMonthKeys[0]) {
          monthLearnedWords = srsOverview?.totalLearnedWords || 0;
        }
      }

      // 2. Số lượt ôn & học của tháng (lấy chuẩn xác từ activityReviews trong database)
      const monthReviews = monthlyReviewsMap[monthKey] || 0;

      // 3. Tiến độ thực tế của từng khóa học:
      // Tính theo: Số từ đã thuộc (Level >= 1) / Tổng số từ trong khóa học
      const coursesForMonth = baseCourses.slice(0, 3).map((c) => {
        const cScore = courseStudyScores[c.id] || 0;
        const learned = srsOverview?.courseLearnedCounts?.[c.id] || 0;
        const totalWords = c.data?.length || 100;

        let percent = 0;
        if (learned > 0) {
          percent = Math.min(100, Math.max(8, Math.round((learned / totalWords) * 100)));
        } else if (cScore > 0) {
          percent = 15;
        }

        return {
          id: c.id,
          name: c.name,
          template: c.template,
          level: c.level,
          color: c.color,
          score: cScore,
          learnedCount: learned,
          totalWords: totalWords,
          percent: percent
        };
      });

      return {
        monthKey,
        monthName: `${MONTH_NAMES[monthIndex]} ${year}`,
        totalMinutes,
        totalExp: monthExp,
        activeDays: data.activeDays.size,
        learnedWordsCount: monthLearnedWords,
        reviewsCount: monthReviews,
        courses: coursesForMonth
      };
    });
  }, [dailyStudyTime, activityHistory, activityReviews, courseStudyScores, myCourseIds, allCourses, selectedYear, srsOverview]);

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
            return (
              <div key={m.monthKey} className="relative space-y-3">
                {/* Timeline Dot / Icon */}
                <div className="absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
                    <Clock size={13} />
                    {formatHours(m.totalMinutes)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 shadow-xs">
                    <Flame size={13} />
                    {m.activeDays} ngày học tập
                  </span>
                  {m.learnedWordsCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 shadow-xs">
                      <BookOpen size={13} />
                      {m.learnedWordsCount} từ đã thuộc
                    </span>
                  )}
                  {m.reviewsCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 shadow-xs">
                      <RotateCcw size={13} />
                      {m.reviewsCount} lượt ôn & học
                    </span>
                  )}
                  {m.totalExp > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shadow-xs">
                      <Sparkles size={13} />
                      +{m.totalExp.toLocaleString()} EXP
                    </span>
                  )}
                </div>

                {/* Summary Statement */}
                <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {m.reviewsCount > 0 || m.learnedWordsCount > 0 ? (
                    <>
                      {m.reviewsCount > 0 && (
                        <>Đã hoàn thành <strong className="text-slate-900 dark:text-white font-bold">{m.reviewsCount} lượt ôn & học</strong></>
                      )}
                      {m.learnedWordsCount > 0 && (
                        <>{m.reviewsCount > 0 ? ' và ghi nhớ ' : 'Đã ghi nhớ '}<strong className="text-slate-900 dark:text-white font-bold">{m.learnedWordsCount} từ vựng</strong></>
                      )}
                      {m.courses.length > 0 && <> trong {m.courses.length} khóa học</>}
                    </>
                  ) : (m.totalExp > 0 || m.totalMinutes > 0 ? (
                    <>
                      Đã tích lũy <strong className="text-slate-900 dark:text-white font-bold">+{m.totalExp.toLocaleString()} EXP</strong>
                      {m.totalMinutes > 0 && <> qua <strong className="text-slate-900 dark:text-white font-bold">{formatHours(m.totalMinutes)}</strong> học tập</>}
                      {m.courses.length > 0 && <> trong {m.courses.length} khóa học</>}
                    </>
                  ) : (
                    <span className="text-slate-400">Chưa có hoạt động học tập nào trong tháng này.</span>
                  ))}
                </div>

                {/* Course Progress Bars (High Contrast, Crisp GitHub Style) */}
                {m.courses.length > 0 && (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                    {m.courses.map((c) => (
                      <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs">
                        {/* Course Link & Language Badge */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${
                            c.template === 'english'
                              ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                          }`}>
                            {c.template === 'english' ? 'EN' : 'JP'}
                          </span>
                          <Link
                            to={`/course/${c.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate max-w-[260px] sm:max-w-[340px] transition-colors"
                            title={c.name}
                          >
                            {c.name}
                          </Link>
                          {c.learnedCount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                              {c.learnedCount}/{c.totalWords} từ đã thuộc
                            </span>
                          ) : (c.score > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                              +{c.score.toLocaleString()} EXP
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-normal shrink-0">
                              Chưa học
                            </span>
                          ))}
                        </div>

                        {/* Progress Bar with Percentage (Green GitHub Style) */}
                        <div className="w-full sm:w-48 flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-700"
                              style={{ width: `${c.percent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-8 text-right shrink-0">
                            {c.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
        Seeing something unexpected? Nhật ký hoạt động ghi nhận điểm tích lũy (EXP), ngày hoạt động và thời gian học tập thực tế theo chuẩn đóng góp GitHub.
      </div>
    </div>
  );
}
