import { doc, getDoc, updateDoc, increment, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Lấy và reset dailyStats nếu sang ngày mới
 */
async function getDailyStats(userId: string) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};
  
  // YYYY-MM-DD theo giờ local
  const today = new Date().toLocaleDateString('en-CA');
  
  let dailyStats = data.dailyStats || { dailyPracticeExp: 0, dailyRaceCounts: {} };
  
  if (data.lastActivityDate !== today) {
    dailyStats = { dailyPracticeExp: 0, dailyRaceCounts: {} };
  }
  
  return { userRef, data, dailyStats, today };
}

/**
 * Ghi nhận 1 ván Luyện tập tự do (Practice)
 * Trả về số EXP nhận được (10 hoặc 0 nếu đạt giới hạn)
 */
export async function recordPracticePlay(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const { userRef, dailyStats, today } = await getDailyStats(userId);
    
    // Giới hạn 1000 EXP / ngày (100 ván)
    if (dailyStats.dailyPracticeExp >= 1000) {
      await updateDoc(userRef, { lastActivityDate: today, dailyStats });
      return 0;
    }
    
    const awardedExp = 10;
    dailyStats.dailyPracticeExp += awardedExp;
    
    await updateDoc(userRef, {
      lastActivityDate: today,
      dailyStats,
      totalStudyScore: increment(awardedExp),
      [`activityHistory.${today}`]: increment(awardedExp)
    });
    
    return awardedExp;
  } catch (err) {
    console.error('Error recording practice play:', err);
    return 0;
  }
}

/**
 * Ghi nhận 1 ván Đua (Arena)
 * Tính điểm dựa trên % so với MaxScore của Game và thưởng phá kỷ lục (150/300)
 */
export async function recordArenaRace(
  userId: string, 
  courseId: string, 
  gameMode: string, 
  score: number, 
  maxPossibleScore: number
): Promise<{ expGained: number, isPersonalRecord: boolean, isServerRecord: boolean }> {
  if (!userId || score <= 0) return { expGained: 0, isPersonalRecord: false, isServerRecord: false };
  
  try {
    const { userRef, data, dailyStats, today } = await getDailyStats(userId);
    
    const gameKey = `${courseId}_${gameMode}`;
    const raceCount = dailyStats.dailyRaceCounts[gameKey] || 0;
    
    // 1. Kiểm tra Giới hạn 10 lượt đua / 1 trò / ngày
    if (raceCount >= 10) {
      await updateDoc(userRef, { lastActivityDate: today, dailyStats });
      // Vẫn lưu High Score nếu nhỡ chơi tốt, nhưng không cộng EXP
      await _checkAndSaveHighScoreWithoutExp(userId, gameKey, score, userRef, data);
      return { expGained: 0, isPersonalRecord: false, isServerRecord: false };
    }
    
    // Tăng lượt đua
    dailyStats.dailyRaceCounts[gameKey] = raceCount + 1;

    // 2. Tính Điểm Cơ Bản (Dựa trên MaxPossibleScore của Server)
    let baseExp = 0;
    const percent = score / maxPossibleScore;
    
    if (percent >= 0.9) baseExp = 100;
    else if (percent >= 0.7) baseExp = 60;
    else if (percent >= 0.5) baseExp = 40;
    else if (percent >= 0.3) baseExp = 20;
    else baseExp = 0; // Dưới 30% -> 0 EXP

    // 3. Xử lý Thưởng Phá Kỷ Lục
    let isPersonalRecord = false;
    let isServerRecord = false;
    let bonusExp = 0;

    // Lấy kỷ lục cá nhân cũ
    const prevBest = data.raceScores?.[gameKey] || 0;
    
    // Kiểm tra kỷ lục cá nhân
    if (score > prevBest) {
      if (prevBest === 0) {
        // Lần đầu chơi
        bonusExp = 100; 
      } else {
        // Phá kỷ lục cá nhân
        isPersonalRecord = true;
        bonusExp += 300;
        
        // Kiểm tra kỷ lục Server
        // Query Top 1 người dùng có raceScores[gameKey] cao nhất
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy(`raceScores.${gameKey}`, 'desc'), limit(1));
        const snap = await getDocs(q);
        
        let serverBest = 0;
        if (!snap.empty) {
          serverBest = snap.docs[0].data().raceScores?.[gameKey] || 0;
        }

        if (score > serverBest && serverBest > 0) {
          isServerRecord = true;
          bonusExp += 500;
        }
      }
    }

    const totalExp = baseExp + bonusExp;

    // 4. Cập nhật Database
    const updates: any = {
      lastActivityDate: today,
      dailyStats
    };

    if (score > prevBest) {
      const diff = score - prevBest;
      updates['totalRaceScore'] = increment(diff);
      updates[`courseRaceScores.${courseId}`] = increment(diff);
      updates[`raceScores.${gameKey}`] = score;
    }

    // Đua KHÔNG cộng vào totalExp (EXP học) — chỉ cập nhật điểm đua riêng
    await updateDoc(userRef, updates);

    // Cập nhật collection riêng cho HighScore (giữ tương thích cũ)
    if (score > prevBest) {
      const scoreRef = doc(db, 'users', userId, 'gameScores', gameKey);
      await updateDoc(scoreRef, { highScore: score }).catch(async () => {
        // Document có thể chưa tồn tại
        const { setDoc } = await import('firebase/firestore');
        await setDoc(scoreRef, { gameKey, highScore: score });
      });
    }

    return { expGained: totalExp, isPersonalRecord, isServerRecord };
    
  } catch (err) {
    console.error('Error recording arena race:', err);
    return { expGained: 0, isPersonalRecord: false, isServerRecord: false };
  }
}

/**
 * Hàm nội bộ: Chỉ lưu kỷ lục nếu vượt nhưng không cộng EXP (vì hết lượt)
 */
async function _checkAndSaveHighScoreWithoutExp(userId: string, gameKey: string, score: number, userRef: any, data: any) {
  const prevBest = data.raceScores?.[gameKey] || 0;
  if (score > prevBest) {
    const courseId = gameKey.split('_')[0];
    const diff = score - prevBest;
    
    await updateDoc(userRef, {
      [`raceScores.${gameKey}`]: score,
      [`courseRaceScores.${courseId}`]: increment(diff),
      totalRaceScore: increment(diff)
    });

    const scoreRef = doc(db, 'users', userId, 'gameScores', gameKey);
    const { setDoc } = await import('firebase/firestore');
    await setDoc(scoreRef, { gameKey, highScore: score }, { merge: true }).catch(() => {});
  }
}

/**
 * Ghi nhận tiến độ học thuật (SRS)
 * type = 'new' (Học mới lên lv1) | 'review_up' (Ôn tập thăng cấp) | 'review' (Ôn tập bình thường) | 'maintain_max' (Duy trì mốc cao nhất)
 */
export async function recordSrsExp(
  userId: string,
  type: 'new' | 'review_up' | 'review' | 'maintain_max' | 'skip_to_lv2',
  courseId?: string,
  level?: number
): Promise<number> {
  if (!userId) return 0;
  try {
    const { userRef, dailyStats, today } = await getDailyStats(userId);
    
    let awardedExp = 0;
    if (type === 'new' || type === 'skip_to_lv2') awardedExp = 5;
    else if (type === 'review_up') awardedExp = level || 1;
    else if (type === 'maintain_max') awardedExp = 7;
    else awardedExp = 1;

    const updates: any = {
      lastActivityDate: today,
      dailyStats,
      totalStudyScore: increment(awardedExp),
      [`activityHistory.${today}`]: increment(awardedExp),
      [`activityReviews.${today}`]: increment(1)
    };

    // Dùng increment() (atomic) thay vì đọc-ghi thủ công để tránh race condition
    if (courseId) {
      updates[`courseStudyScores.${courseId}`] = increment(awardedExp);
    }

    await updateDoc(userRef, updates);
    
    return awardedExp;
  } catch (err) {
    console.error('Error recording SRS exp:', err);
    return 0;
  }
}

/**
 * Ghi nhận thời gian học (tính bằng giây)
 */
export async function recordStudyTime(userId: string, seconds: number): Promise<void> {
  if (!userId || seconds <= 0) return;
  try {
    const today = new Date().toLocaleDateString('en-CA');
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      [`dailyStudyTime.${today}`]: increment(seconds),
      lastActivityDate: today
    });
  } catch (err) {
    console.error('Error recording study time:', err);
  }
}
