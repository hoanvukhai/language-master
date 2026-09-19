// src/lib/srs/streakCalculator.ts

export function getLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Tính chuỗi học tập (streak) thực tế dựa trên lịch sử học tập (dailyStudyTime & activityHistory).
 * Mục tiêu đạt chuẩn ngày học: học từ 3 phút (180 giây) HOẶC đạt từ 10 EXP trở lên.
 */
export function calculateUserStreak(
  dailyStudyTime: Record<string, number> = {},
  activityHistory: Record<string, number> = {},
  baseDate: Date = new Date()
): { currentStreak: number; isGoalMetToday: boolean } {
  const isGoalMet = (dateStr: string): boolean => {
    const secs = dailyStudyTime[dateStr] || 0;
    const exp = activityHistory[dateStr] || 0;
    return secs >= 180 || exp >= 10;
  };

  const todayStr = getLocalISODate(baseDate);
  const isGoalMetToday = isGoalMet(todayStr);

  let streak = 0;
  const checkDate = new Date(baseDate);

  if (isGoalMetToday) {
    // Đã học đủ mục tiêu hôm nay: tính chuỗi từ hôm nay lùi về các ngày liên tiếp trước đó
    while (true) {
      const dStr = getLocalISODate(checkDate);
      if (isGoalMet(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    // Chưa học đủ mục tiêu hôm nay: kiểm tra hôm qua để bảo toàn ngọn lửa streak
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = getLocalISODate(checkDate);
    if (isGoalMet(yesterdayStr)) {
      while (true) {
        const dStr = getLocalISODate(checkDate);
        if (isGoalMet(dStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  return { currentStreak: streak, isGoalMetToday };
}
