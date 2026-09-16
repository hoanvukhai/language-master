// src/lib/srs/firestoreSync.ts
// Đồng bộ dữ liệu SRS & Bảng Xếp Hạng với Firestore + Local Storage Fallback

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  increment,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

import type {
  WordProgress,
  WordProgressFirestore,
  SRSSubject,
} from './srsTypes';

// ── Helpers: Convert giữa App ↔ Firestore ───────────────────────────────

function toFirestore(progress: WordProgress): WordProgressFirestore {
  return {
    courseId: progress.courseId,
    status: progress.status,
    masteryLevel: progress.masteryLevel,
    waterDrops: progress.waterDrops ?? 0,
    subStep: progress.subStep ?? 0,
    isMasteredUserMarked: progress.isMasteredUserMarked ?? false,
    pendingVerification3h: progress.pendingVerification3h ? Timestamp.fromDate(progress.pendingVerification3h) : null,
    interval: progress.interval,
    nextReviewDate: Timestamp.fromDate(progress.nextReviewDate),
    lastStudiedDate: Timestamp.fromDate(progress.lastStudiedDate),
    streak: progress.streak,
    totalCorrect: progress.totalCorrect,
    totalWrong: progress.totalWrong,
    subject: progress.subject,
  };
}

function fromFirestore(id: string, data: WordProgressFirestore): WordProgress {
  return {
    itemId: id,
    courseId: data.courseId || 'legacy',
    subject: data.subject,
    status: data.status,
    masteryLevel: data.masteryLevel,
    waterDrops: data.waterDrops ?? 0,
    subStep: data.subStep ?? 0,
    isMasteredUserMarked: data.isMasteredUserMarked ?? false,
    pendingVerification3h: data.pendingVerification3h ? data.pendingVerification3h.toDate() : null,
    interval: data.interval,
    nextReviewDate: data.nextReviewDate.toDate(),
    lastStudiedDate: data.lastStudiedDate.toDate(),
    streak: data.streak,
    totalCorrect: data.totalCorrect,
    totalWrong: data.totalWrong,
  };
}

// ── 1. Fetch toàn bộ tiến trình SRS của User ──────────────────────────────

export async function fetchUserSRSProgress(
  userId: string,
  courseId: string
): Promise<Record<string, WordProgress>> {
  try {
    const colRef = collection(db, 'users', userId, 'srs_progress');
    const q = query(colRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);

    const result: Record<string, WordProgress> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as WordProgressFirestore;
      const prefix = `${courseId}_`;
      const itemId = docSnap.id.startsWith(prefix) ? docSnap.id.slice(prefix.length) : docSnap.id;
      result[itemId] = fromFirestore(itemId, data);
    });

    return result;
  } catch (err) {
    console.error('Error fetching SRS progress:', err);
    return {};
  }
}

// ── 2. Đẩy 1 từ mới lên Firestore ────────────────────────────────────────

export async function syncWordToFirestore(
  userId: string,
  progress: WordProgress
): Promise<void> {
  try {
    const docRef = doc(
      db,
      'users',
      userId,
      'srs_progress',
      `${progress.courseId}_${progress.itemId}`
    );
    await setDoc(docRef, toFirestore(progress), { merge: true });
  } catch (err) {
    console.error('Error syncing word to Firestore:', err);
  }
}

// ── 3. Batch Update nhiều từ cùng lúc (dùng khi Ôn tập xong) ──────────────

export async function batchSyncProgressToFirestore(
  userId: string,
  progressList: WordProgress[]
): Promise<void> {
  if (progressList.length === 0) return;

  try {
    const batch = writeBatch(db);
    progressList.forEach((p) => {
      const docRef = doc(
        db,
        'users',
        userId,
        'srs_progress',
        `${p.courseId}_${p.itemId}`
      );
      batch.set(docRef, toFirestore(p), { merge: true });
    });

    await batch.commit();
  } catch (err) {
    console.error('Error batch syncing to Firestore:', err);
  }
}

// ── 4. Đánh dấu 1 từ thuộc Trạng Thái Chọn Thủ Công ──────────────────────────────

export async function syncMasteredStatusToFirestore(
  userId: string,
  courseId: string,
  subject: SRSSubject,
  itemId: string,
  isMastered: boolean
): Promise<void> {
  try {
    const docRef = doc(
      db,
      'users',
      userId,
      'srs_progress',
      `${courseId}_${itemId}`
    );

    const now = new Date();
    if (isMastered) {
      await setDoc(
        docRef,
        {
          status: 'reviewing',
          masteryLevel: 2,
          waterDrops: 3,
          subStep: 6,
          isMasteredUserMarked: true,
          interval: 8 / 24,
          nextReviewDate: Timestamp.fromDate(
            new Date(now.getTime() + 8 * 60 * 60 * 1000)
          ),
          lastStudiedDate: Timestamp.fromDate(now),
          streak: 1,
          totalCorrect: 1,
          totalWrong: 0,
          courseId,
          subject,
        },
        { merge: true }
      );
    } else {
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.error('Error updating mastered status in Firestore:', err);
  }
}

// ── 5. BẢNG XẾP HẠNG (LEADERBOARD) & CLOUD / LOCAL STORAGE FALLBACK ───────

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalExp: number;
  totalStudyScore?: number;
  totalRaceScore?: number;
  raceExp?: number; // legacy
  raceScores?: Record<string, number>;
  courseRaceScores?: Record<string, number>;
  courseStudyScores?: Record<string, number>;
  dailyStudyTime?: Record<string, number>;
  activityHistory?: Record<string, number>;
  role?: string;
  rankPosition?: number;
}



export async function updateUserTotalExp(userId: string, addedExp: number): Promise<void> {
  if (addedExp <= 0) return;

  const currentUser = auth.currentUser;
  const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Học viên';
  const photo = currentUser?.photoURL || null;

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      uid: userId,
      displayName: name,
      email: currentUser?.email || '',
      photoURL: photo,
      totalStudyScore: increment(addedExp),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore write permission restricted:', err);
  }
}

export async function syncPersonalHighScore(userId: string, gameKey: string, score: number): Promise<void> {
  if (score <= 0) return;

  try {
    const scoreRef = doc(db, 'users', userId, 'gameScores', gameKey);
    const snap = await getDoc(scoreRef);
    const prevBest = snap.exists() ? (snap.data()?.highScore ?? 0) : 0;

    const userRef = doc(db, 'users', userId);
    const uSnap = await getDoc(userRef);
    const currentRaceScores = uSnap.exists() ? (uSnap.data().raceScores || {}) : {};
    let newRaceScores = currentRaceScores;

    if (score > prevBest) {
      await setDoc(scoreRef, {
        gameKey,
        highScore: score,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      newRaceScores = { ...currentRaceScores, [gameKey]: score };
    }

    // Luôn luôn tính và cập nhật totalRaceScore để migrate người chơi cũ
    const totalRaceScore = Object.values(newRaceScores).reduce((acc: number, val: any) => acc + (val as number), 0);

    // Tính courseRaceScore (Tổng điểm các game trong cùng 1 khóa học)
    const courseId = gameKey.split('_')[0];
    const courseRaceScore = Object.entries(newRaceScores)
      .filter(([key]) => key.startsWith(`${courseId}_`))
      .reduce((acc: number, [_, val]) => acc + (val as number), 0);
      
    // Lấy object courseRaceScores hiện tại từ user
    const currentCourseScores = uSnap.exists() ? (uSnap.data().courseRaceScores || {}) : {};
    const newCourseScores = { ...currentCourseScores, [courseId]: courseRaceScore };

    await setDoc(userRef, {
      raceScores: newRaceScores,
      totalRaceScore,
      courseRaceScores: newCourseScores,
    }, { merge: true });

  } catch (err) {
    console.warn('Firestore highscore permission restricted:', err);
  }
}






export async function fetchRaceLeaderboard(modeKey?: string): Promise<LeaderboardUser[]> {
  let cloudList: LeaderboardUser[] = [];

  try {
    const usersRef = collection(db, 'users');
    // Determine the sorting field based on modeKey
    let sortField = 'totalRaceScore';
    if (modeKey) {
      if (modeKey.includes('_')) {
        // Specific Game in a Course
        sortField = `raceScores.${modeKey}`;
      } else {
        // Entire Course Total
        sortField = `courseRaceScores.${modeKey}`;
      }
    }
    
    // Create query
    const q = query(usersRef, orderBy(sortField, 'desc'), limit(modeKey ? 100 : 50));
    const snapshot = await getDocs(q);

    cloudList = snapshot.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || data.email?.split('@')[0] || 'Học viên',
        photoURL: data.photoURL || null,
        totalExp: data.totalExp || 0,
        totalRaceScore: data.totalRaceScore || 0,
        raceExp: data.raceExp || 0,
        raceScores: data.raceScores || {},
        courseRaceScores: data.courseRaceScores || {},
        courseStudyScores: data.courseStudyScores || {},
        role: data.role || 'user',
      };
    });
  } catch (err) {
    console.warn('Firestore fetch permission error. Falling back to local storage leaderboard:', err);
  }

  // Ensure current user is in the cloudList so their personal score is always shown
  const currentUser = auth.currentUser;
  if (currentUser) {
    const isPresent = cloudList.some(u => u.uid === currentUser.uid);
    let uData: any = null;
    try {
      const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (uSnap.exists()) uData = uSnap.data();
    } catch (e) {}

    if (uData) {
      // Migrate old subcollection score or old raceScores (without level prefix)
      if (modeKey && (!uData.raceScores || uData.raceScores[modeKey] === undefined)) {
        try {
          const oldModeKey = modeKey.replace(/^N[1-5]_/, '');
          let oldScore = uData.raceScores?.[oldModeKey] || 0;

          if (oldScore === 0) {
            const oldScoreSnap = await getDoc(doc(db, 'users', currentUser.uid, 'gameScores', oldModeKey));
            if (oldScoreSnap.exists()) {
              oldScore = oldScoreSnap.data().highScore || 0;
            }
          }

          if (oldScore > 0) {
            if (!uData.raceScores) uData.raceScores = {};
            uData.raceScores[modeKey] = oldScore;
            // Background migration save — dùng updateDoc để dot-notation tạo đúng nested field
            // setDoc với { 'raceScores.key': val } sẽ tạo field chứa dấu chấm, không phải nested
            updateDoc(doc(db, 'users', currentUser.uid), { [`raceScores.${modeKey}`]: oldScore });
          }
        } catch (e) {}
      }

      if (!isPresent) {
        cloudList.push({
          uid: currentUser.uid,
          displayName: uData.displayName || uData.email?.split('@')[0] || 'Học viên',
          photoURL: uData.photoURL || null,
          totalExp: uData.totalExp || 0,
          totalRaceScore: uData.totalRaceScore || 0,
          raceExp: uData.raceExp || 0,
          raceScores: uData.raceScores || {},
          courseRaceScores: uData.courseRaceScores || {},
          courseStudyScores: uData.courseStudyScores || {},
          role: uData.role || 'user',
        });
      } else {
        // Update the existing item with the potentially migrated raceScores
        const idx = cloudList.findIndex(u => u.uid === currentUser.uid);
        if (idx !== -1) {
          cloudList[idx].raceScores = uData.raceScores || {};
          cloudList[idx].courseRaceScores = uData.courseRaceScores || {};
          cloudList[idx].totalRaceScore = uData.totalRaceScore || 0;
          cloudList[idx].courseStudyScores = uData.courseStudyScores || {};
        }
      }
    }
  }

  let finalSortedList = [...cloudList];
  if (modeKey) {
    if (modeKey.includes('_')) {
      finalSortedList = finalSortedList
        .filter(u => (u.raceScores?.[modeKey] || 0) > 0)
        .sort((a, b) => (b.raceScores?.[modeKey] || 0) - (a.raceScores?.[modeKey] || 0));
    } else {
      finalSortedList = finalSortedList
        .filter(u => (u.courseRaceScores?.[modeKey] || 0) > 0)
        .sort((a, b) => (b.courseRaceScores?.[modeKey] || 0) - (a.courseRaceScores?.[modeKey] || 0));
    }
  } else {
    // Sort globally by totalRaceScore
    finalSortedList = finalSortedList
      .filter(u => (u.totalRaceScore || 0) > 0)
      .sort((a, b) => (b.totalRaceScore || 0) - (a.totalRaceScore || 0));
  }

  return finalSortedList.slice(0, 50).map((u, i) => ({ ...u, rankPosition: i + 1 }));
}

export async function fetchStudyLeaderboard(courseId: string): Promise<LeaderboardUser[]> {
  let cloudList: LeaderboardUser[] = [];

  try {
    const usersRef = collection(db, 'users');
    const sortField = `courseStudyScores.${courseId}`;
    
    // Create query
    const q = query(usersRef, orderBy(sortField, 'desc'), limit(50));
    const snapshot = await getDocs(q);

    cloudList = snapshot.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || data.email?.split('@')[0] || 'Học viên',
        photoURL: data.photoURL || null,
        totalExp: data.totalExp || 0,
        totalStudyScore: data.totalStudyScore || 0,
        totalRaceScore: data.totalRaceScore || 0,
        raceExp: data.raceExp || 0,
        raceScores: data.raceScores || {},
        courseRaceScores: data.courseRaceScores || {},
        courseStudyScores: data.courseStudyScores || {},
        role: data.role || 'user',
      };
    });
  } catch (err) {
    console.warn('Firestore fetch permission error for study leaderboard:', err);
  }

  // Ensure current user is in the cloudList so their personal score is always shown
  const currentUser = auth.currentUser;
  if (currentUser) {
    const isPresent = cloudList.some(u => u.uid === currentUser.uid);
    let uData: any = null;
    try {
      const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (uSnap.exists()) uData = uSnap.data();
    } catch (e) {}

    if (uData) {
      if (!isPresent) {
        cloudList.push({
          uid: currentUser.uid,
          displayName: uData.displayName || uData.email?.split('@')[0] || 'Học viên',
          photoURL: uData.photoURL || null,
          totalExp: uData.totalExp || 0,
          totalStudyScore: uData.totalStudyScore || 0,
          totalRaceScore: uData.totalRaceScore || 0,
          raceExp: uData.raceExp || 0,
          raceScores: uData.raceScores || {},
          courseRaceScores: uData.courseRaceScores || {},
          courseStudyScores: uData.courseStudyScores || {},
          role: uData.role || 'user',
        });
      }
    }
  }

  let finalSortedList = [...cloudList];
  finalSortedList = finalSortedList
    .filter(u => (u.courseStudyScores?.[courseId] || 0) > 0)
    .sort((a, b) => (b.courseStudyScores?.[courseId] || 0) - (a.courseStudyScores?.[courseId] || 0));

  return finalSortedList.slice(0, 50).map((u, i) => ({ ...u, rankPosition: i + 1 }));
}


export async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  let cloudList: LeaderboardUser[] = [];

  // Try Cloud Firestore Query
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('totalStudyScore', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    cloudList = snapshot.docs.map((d, index) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || data.email?.split('@')[0] || 'Học viên',
        photoURL: data.photoURL || null,
        totalExp: data.totalExp || 0,
        totalStudyScore: data.totalStudyScore || 0,
        role: data.role || 'user',
        rankPosition: index + 1,
      };
    });
  } catch (err) {
    console.warn('Firestore fetch permission error. Falling back to local storage leaderboard:', err);
  }

  const finalSortedList = [...cloudList]
    .sort((a, b) => (b.totalStudyScore || 0) - (a.totalStudyScore || 0))
    .map((u, i) => ({ ...u, rankPosition: i + 1 }));

  return finalSortedList;
}

// ── Batch Chỉnh Sửa Trạng Thái 'Đã Thuộc' Cho Nhiều Từ ───────────────────
export async function batchUpdateWordMasteredStatus(
  userId: string,
  courseId: string,
  subject: SRSSubject,
  itemIds: string[],
  isMastered: boolean
): Promise<void> {
  if (itemIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    const now = new Date();
    for (const itemId of itemIds) {
      const docRef = doc(db, 'users', userId, 'srs_progress', `${courseId}_${itemId}`);
      if (isMastered) {
        batch.set(docRef, {
          status: 'reviewing',
          masteryLevel: 2,
          waterDrops: 3,
          subStep: 6,
          isMasteredUserMarked: true,
          interval: 8 / 24,
          nextReviewDate: Timestamp.fromDate(new Date(now.getTime() + 8 * 60 * 60 * 1000)),
          lastStudiedDate: Timestamp.fromDate(now),
          streak: 1,
          totalCorrect: 1,
          totalWrong: 0,
          courseId,
          subject,
        }, { merge: true });
      } else {
        batch.delete(docRef);
      }
    }
    
    if (isMastered && itemIds.length > 0) {
      // Thưởng +5 điểm / từ (chuẩn hóa đồng nhất với học từ mới)
      const awardedExp = itemIds.length * 5;
      const today = new Date().toLocaleDateString('en-CA');
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        totalStudyScore: increment(awardedExp),
        [`courseStudyScores.${courseId}`]: increment(awardedExp),
        [`activityHistory.${today}`]: increment(awardedExp),
        lastActivityDate: today,
      });
    }

    await batch.commit();
  } catch (err) {
    console.error('Error batch updating mastered status:', err);
  }
}

// ── Backwards Compatibility & Missing Export Helpers ────────────────────



export async function saveWordProgress(userId: string, progress: WordProgress): Promise<void> {
  await syncWordToFirestore(userId, progress);
}

export async function fetchAllProgress(
  userId: string,
  courseId: string
): Promise<Record<string, WordProgress>> {
  return fetchUserSRSProgress(userId, courseId);
}

export async function getLearnedItemIds(
  userId: string,
  courseId: string
): Promise<Set<string>> {
  const all = await fetchUserSRSProgress(userId, courseId);
  // 'learning', 'reviewing', 'mastered' đều coi là đã học
  const learnedList = Object.keys(all).filter((id) => all[id].status !== 'new' && all[id].masteryLevel >= 1);
  return new Set(learnedList);
}

export function getNewItemIds(
  allIds: string[],
  learnedSet: Set<string> | string[],
  limit: number = 15
): string[] {
  const set = learnedSet instanceof Set ? learnedSet : new Set(learnedSet);
  return allIds.filter((id) => !set.has(id)).slice(0, limit);
}

export async function fetchDueItems(
  userId: string,
  courseId: string
): Promise<WordProgress[]> {
  const all = await fetchUserSRSProgress(userId, courseId);
  const now = new Date();
  return Object.values(all).filter(
    (p) => p.status !== 'new' && p.nextReviewDate <= now
  );
}

export async function getMasteryStats(
  userId: string,
  courseId: string
): Promise<number[]> {
  const all = await fetchUserSRSProgress(userId, courseId);
  const stats: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

  Object.values(all).forEach((p) => {
    if (p.masteryLevel >= 0 && p.masteryLevel <= 7) {
      stats[p.masteryLevel]++;
    }
  });

  return stats;
}



export async function fetchGlobalLeaderboard(type: 'study' | 'race'): Promise<LeaderboardUser[]> {
  let cloudList: LeaderboardUser[] = [];

  try {
    const usersRef = collection(db, 'users');
    const sortField = type === 'study' ? 'totalStudyScore' : 'totalRaceScore';
    
    // Create query
    const q = query(usersRef, orderBy(sortField, 'desc'), limit(50));
    const snapshot = await getDocs(q);

    cloudList = snapshot.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || data.email?.split('@')[0] || 'Học viên',
        photoURL: data.photoURL || null,
        totalExp: data.totalExp || 0,
        totalStudyScore: data.totalStudyScore || 0,
        totalRaceScore: data.totalRaceScore || 0,
        raceExp: data.raceExp || 0,
        raceScores: data.raceScores || {},
        courseRaceScores: data.courseRaceScores || {},
        courseStudyScores: data.courseStudyScores || {},
        dailyStudyTime: data.dailyStudyTime || {},
        activityHistory: data.activityHistory || {},
        role: data.role || 'user',
      };
    });
  } catch (err) {
    console.warn(`Firestore fetch permission error for global ${type} leaderboard:`, err);
  }

  // Ensure current user is in the cloudList so their personal score is always shown
  const currentUser = auth.currentUser;
  if (currentUser) {
    const isPresent = cloudList.some(u => u.uid === currentUser.uid);
    let uData: any = null;
    try {
      const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (uSnap.exists()) uData = uSnap.data();
    } catch (e) {}

    if (uData) {
      if (!isPresent) {
        cloudList.push({
          uid: currentUser.uid,
          displayName: uData.displayName || uData.email?.split('@')[0] || 'Học viên',
          photoURL: uData.photoURL || null,
          totalExp: uData.totalExp || 0,
          totalStudyScore: uData.totalStudyScore || 0,
          totalRaceScore: uData.totalRaceScore || 0,
          raceExp: uData.raceExp || 0,
          raceScores: uData.raceScores || {},
          courseRaceScores: uData.courseRaceScores || {},
          courseStudyScores: uData.courseStudyScores || {},
          dailyStudyTime: uData.dailyStudyTime || {},
          activityHistory: uData.activityHistory || {},
          role: uData.role || 'user',
        });
      } else {
        const idx = cloudList.findIndex(u => u.uid === currentUser.uid);
        if (idx !== -1) {
          cloudList[idx].dailyStudyTime = uData.dailyStudyTime || cloudList[idx].dailyStudyTime || {};
          cloudList[idx].activityHistory = uData.activityHistory || cloudList[idx].activityHistory || {};
          cloudList[idx].totalStudyScore = uData.totalStudyScore ?? cloudList[idx].totalStudyScore ?? 0;
          cloudList[idx].totalRaceScore = uData.totalRaceScore ?? cloudList[idx].totalRaceScore ?? 0;
        }
      }
    }
  }

  // Sort and filter: Include users who have study score, study time, race score, or is the current user
  const finalSortedList = cloudList
    .filter(u => {
      if (u.uid === currentUser?.uid) return true; // Always show current user on leaderboard
      if (type === 'study') {
        const hasScore = (u.totalStudyScore || 0) > 0;
        const totalSecs = Object.values((u as any).dailyStudyTime || {}).reduce((s: number, v: any) => s + (v || 0), 0);
        return hasScore || totalSecs > 0;
      }
      return (u.totalRaceScore || 0) > 0;
    })
    .sort((a, b) => type === 'study' 
      ? (b.totalStudyScore || 0) - (a.totalStudyScore || 0) 
      : (b.totalRaceScore || 0) - (a.totalRaceScore || 0));

  return finalSortedList.slice(0, 50).map((u, i) => ({ ...u, rankPosition: i + 1 }));
}

/**
 * Xóa toàn bộ tiến độ học (SRS) của một khóa học để học lại từ đầu
 */
export async function resetCourseProgress(userId: string, courseId: string): Promise<void> {
  try {
    const colRef = collection(db, 'users', userId, 'srs_progress');
    const q = query(colRef, where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }

    // Xóa cache localStorage nếu có
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`user_srs_${userId}_${courseId}`);
        localStorage.removeItem(`srs_progress_${courseId}`);
      } catch (e) {}
    }
  } catch (err) {
    console.error('Error resetting course progress:', err);
    throw err;
  }
}
