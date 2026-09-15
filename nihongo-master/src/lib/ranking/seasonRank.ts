// src/lib/ranking/seasonRank.ts
// Thuật toán tính toán Xếp Hạng Mùa (Season Rank) & Bậc Rank

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';

export interface RankTierInfo {
  tier: RankTier;
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  badgeBg: string;
  borderClass: string;
  textClass: string;
  description: string;
}

export interface SeasonInfo {
  seasonIndex: number; // 0: Xuân, 1: Hạ, 2: Thu, 3: Đông
  seasonName: string;
  seasonIcon: string;
  year: number;
  startDate: Date;
  endDate: Date;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  daysRemaining: number;
  totalDays: number;
  isCurrentSeason: boolean;
}

export interface UserSeasonStats {
  season: SeasonInfo;
  studyMinutes: number;
  studyHoursText: string;
  seasonExp: number;
  seasonScore: number;
  currentTier: RankTierInfo;
  nextTier: RankTierInfo | null;
  progressPercent: number;
  pointsToNextTier: number;
}

// Bảng cấu hình 7 bậc rank chuẩn hóa theo mốc học thực tế (trần 3h/ngày cho Thách Đấu)
export const RANK_TIERS: RankTierInfo[] = [
  {
    tier: 'bronze',
    name: 'Đồng',
    minPoints: 0,
    maxPoints: 2999,
    color: '#cd7f32',
    badgeBg: 'bg-amber-700/10 dark:bg-amber-900/20',
    borderClass: 'border-amber-700/40 dark:border-amber-700/50',
    textClass: 'text-amber-700 dark:text-amber-500',
    description: 'Người mới khởi động hành trình học tập.'
  },
  {
    tier: 'silver',
    name: 'Bạc',
    minPoints: 3000,
    maxPoints: 9999,
    color: '#94a3b8',
    badgeBg: 'bg-slate-500/10 dark:bg-slate-700/20',
    borderClass: 'border-slate-400/40 dark:border-slate-500/50',
    textClass: 'text-slate-600 dark:text-slate-300',
    description: 'Bắt đầu tạo dựng thói quen học tập đều đặn.'
  },
  {
    tier: 'gold',
    name: 'Vàng',
    minPoints: 10000,
    maxPoints: 24999,
    color: '#eab308',
    badgeBg: 'bg-yellow-500/10 dark:bg-yellow-900/20',
    borderClass: 'border-yellow-500/40 dark:border-yellow-500/50',
    textClass: 'text-yellow-600 dark:text-yellow-400',
    description: 'Học viên kiên trì, duy trì phong độ xuất sắc.'
  },
  {
    tier: 'platinum',
    name: 'Bạch Kim',
    minPoints: 25000,
    maxPoints: 49999,
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-900/20',
    borderClass: 'border-cyan-500/40 dark:border-cyan-500/50',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    description: 'Nỗ lực bền bỉ, làm chủ kiến thức nền tảng vững chắc.'
  },
  {
    tier: 'diamond',
    name: 'Kim Cương',
    minPoints: 50000,
    maxPoints: 79999,
    color: '#3b82f6',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-900/20',
    borderClass: 'border-blue-500/40 dark:border-blue-500/50',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Học viên ưu tú, đam mê chinh phục ngôn ngữ hàng ngày.'
  },
  {
    tier: 'master',
    name: 'Cao Thủ',
    minPoints: 80000,
    maxPoints: 119999,
    color: '#a855f7',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-900/20',
    borderClass: 'border-purple-500/40 dark:border-purple-500/50',
    textClass: 'text-purple-600 dark:text-purple-400',
    description: 'Top tinh anh với sự kiên cường và thời lượng học vượt trội.'
  },
  {
    tier: 'grandmaster',
    name: 'Thách Đấu',
    minPoints: 120000,
    maxPoints: Infinity,
    color: '#ef4444',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-900/20',
    borderClass: 'border-rose-500/40 dark:border-rose-500/50',
    textClass: 'text-rose-600 dark:text-rose-400',
    description: 'Đỉnh cao kiên trì tối thượng: Học viên huyền thoại của mùa giải!'
  }
];

export const SEASON_CONFIGS = [
  { index: 0, name: 'Mùa Xuân', icon: '🌸', startMonth: 0, endMonth: 2 }, // Jan - Mar
  { index: 1, name: 'Mùa Hạ', icon: '☀️', startMonth: 3, endMonth: 5 },   // Apr - Jun
  { index: 2, name: 'Mùa Thu', icon: '🍁', startMonth: 6, endMonth: 8 },   // Jul - Sep
  { index: 3, name: 'Mùa Đông', icon: '❄️', startMonth: 9, endMonth: 11 }, // Oct - Dec
];

/**
 * Tính toán thông tin mùa giải dựa trên ngày bất kỳ
 */
export function getSeasonInfo(date: Date = new Date()): SeasonInfo {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 to 11
  const seasonIndex = Math.floor(month / 3);
  const config = SEASON_CONFIGS[seasonIndex];

  const startDate = new Date(year, config.startMonth, 1);
  // Ngày cuối cùng của tháng kết thúc
  const endDate = new Date(year, config.endMonth + 1, 0, 23, 59, 59, 999);

  const now = new Date();
  const isCurrentSeason = date.getFullYear() === now.getFullYear() && seasonIndex === Math.floor(now.getMonth() / 3);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = isCurrentSeason
    ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / msPerDay))
    : 0;
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);

  const pad = (n: number) => String(n).padStart(2, '0');
  const startDateStr = `${year}-${pad(config.startMonth + 1)}-01`;
  const endDateStr = `${year}-${pad(config.endMonth + 1)}-${pad(endDate.getDate())}`;

  return {
    seasonIndex,
    seasonName: config.name,
    seasonIcon: config.icon,
    year,
    startDate,
    endDate,
    startDateStr,
    endDateStr,
    daysRemaining,
    totalDays,
    isCurrentSeason
  };
}

/**
 * Lấy danh sách các mùa có sẵn (mùa hiện tại và các mùa đã qua trong năm và năm trước)
 */
export function getAvailableSeasons(currentDate: Date = new Date()): SeasonInfo[] {
  const current = getSeasonInfo(currentDate);
  const seasons: SeasonInfo[] = [];

  // Thêm các mùa của năm hiện tại (từ mùa hiện tại lùi về mùa Xuân)
  for (let s = current.seasonIndex; s >= 0; s--) {
    const config = SEASON_CONFIGS[s];
    const d = new Date(current.year, config.startMonth, 15);
    seasons.push(getSeasonInfo(d));
  }

  // Thêm cả 4 mùa của năm trước (để xem lại lịch sử)
  for (let s = 3; s >= 0; s--) {
    const config = SEASON_CONFIGS[s];
    const d = new Date(current.year - 1, config.startMonth, 15);
    seasons.push(getSeasonInfo(d));
  }

  return seasons;
}

/**
 * Tính toán Season Rank cho người dùng từ dữ liệu thực tế
 * @param activityHistory: Record<dateStr, exp> (Điểm SRS 1-7 EXP mỗi từ)
 * @param dailyStudyTime: Record<dateStr, seconds> (Số giây học mỗi ngày)
 * @param season: Mùa cần tính toán
 */
export function calculateSeasonRank(
  activityHistory: Record<string, number> = {},
  dailyStudyTime: Record<string, number> = {},
  season: SeasonInfo
): UserSeasonStats {
  const { startDateStr, endDateStr } = season;

  let totalSeasonSeconds = 0;
  let totalSeasonExp = 0;

  // Lọc và cộng dồn số giây học trong khoảng ngày của mùa
  Object.entries(dailyStudyTime).forEach(([dateStr, seconds]) => {
    if (dateStr >= startDateStr && dateStr <= endDateStr) {
      totalSeasonSeconds += seconds;
    }
  });

  // Lọc và cộng dồn EXP trong khoảng ngày của mùa
  Object.entries(activityHistory).forEach(([dateStr, exp]) => {
    if (dateStr >= startDateStr && dateStr <= endDateStr) {
      totalSeasonExp += exp;
    }
  });

  const studyMinutes = Math.floor(totalSeasonSeconds / 60);

  // Quy đổi thời gian sang điểm: 1 phút học = 1 điểm (minh bạch, không ảo số)
  const timePoints = studyMinutes * 1;
  const seasonScore = totalSeasonExp + timePoints;

  // Xác định Bậc Rank
  let currentTier = RANK_TIERS[0];
  let nextTier: RankTierInfo | null = RANK_TIERS[1];

  for (let i = 0; i < RANK_TIERS.length; i++) {
    const tier = RANK_TIERS[i];
    if (seasonScore >= tier.minPoints) {
      currentTier = tier;
      nextTier = i < RANK_TIERS.length - 1 ? RANK_TIERS[i + 1] : null;
    }
  }

  // Tính phần trăm tiến độ đến rank tiếp theo
  let progressPercent = 100;
  let pointsToNextTier = 0;

  if (nextTier) {
    const range = nextTier.minPoints - currentTier.minPoints;
    const gained = seasonScore - currentTier.minPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
    pointsToNextTier = Math.max(0, nextTier.minPoints - seasonScore);
  }

  const hours = Math.floor(studyMinutes / 60);
  const mins = studyMinutes % 60;
  const studyHoursText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return {
    season,
    studyMinutes,
    studyHoursText,
    seasonExp: totalSeasonExp,
    seasonScore,
    currentTier,
    nextTier,
    progressPercent,
    pointsToNextTier
  };
}
