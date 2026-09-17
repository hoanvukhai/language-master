// src/context/auth/AuthProvider.tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot, increment } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { AuthContext, type UserProfile } from './AuthContext';




function getLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Lắng nghe trạng thái đăng nhập và dữ liệu Profile realtime
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeSnapshot = onSnapshot(userRef, async (snap) => {
          if (!snap.exists()) {
            // Khởi tạo profile mặc định
            const defaultData = {
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || null,
              email: firebaseUser.email,
              role: 'user',
              createdAt: serverTimestamp(),
              totalExp: 0,
              totalStudyScore: 0,
              totalRaceScore: 0,
              currentStreak: 0,
              lastLoginDate: getLocalISODate(new Date()),
              myCourseIds: [],
              dailyStudyTime: {},
              activityHistory: {},
              learnSettings: {
                dailyNewWordLimit: 15,
                maxPendingWords: 50,
                sessionSize: 15,
                autoPlayAudio: false,
                showKana: true,
              },
            };
            await setDoc(userRef, defaultData, { merge: true });
          } else {
            const data = snap.data();
            setRole(data?.role === 'admin' ? 'admin' : 'user');
            
            // Tự động bổ sung các trường thiếu cho tài khoản cũ
            const missingUpdates: Record<string, any> = {};
            if (data?.totalStudyScore === undefined) missingUpdates.totalStudyScore = 0;
            if (data?.totalRaceScore === undefined) missingUpdates.totalRaceScore = 0;
            if (data?.myCourseIds === undefined) missingUpdates.myCourseIds = [];
            if (data?.dailyStudyTime === undefined) missingUpdates.dailyStudyTime = {};
            if (data?.activityHistory === undefined) missingUpdates.activityHistory = {};
            if (Object.keys(missingUpdates).length > 0) {
              await updateDoc(userRef, missingUpdates);
              return;
            }
            
            const now = new Date();
            const today = getLocalISODate(now);
            const lastLoginDate = data?.lastLoginDate;
            let currentStreak = Number(data?.currentStreak) || 0;
            let totalExp = Number(data?.totalExp) || 0;

            const yestDate = new Date(now);
            yestDate.setDate(yestDate.getDate() - 1);
            const yesterday = getLocalISODate(yestDate);

            const lastStreakDate = data?.lastStreakDate;
            const todayExp = (data?.activityHistory || {})[today] || 0;
            const todaySeconds = (data?.dailyStudyTime || {})[today] || 0;
            const isGoalMetToday = todayExp >= 10 || todaySeconds >= 180;

            // 1. Khi HỌC ĐỦ mục tiêu hôm nay (10 EXP hoặc 3 phút học) -> MỚI TĂNG chuỗi
            if (isGoalMetToday && lastStreakDate !== today) {
              let bonusExp = 0;

              if (lastStreakDate === yesterday) {
                // Đã hoàn thành hôm qua và hôm nay học đủ -> Tăng chuỗi tiếp nối
                currentStreak = currentStreak + 1;
                if (currentStreak >= 30) bonusExp = 100;
                else if (currentStreak >= 14) bonusExp = 50;
                else if (currentStreak >= 7) bonusExp = 20;
                else if (currentStreak >= 3) bonusExp = 10;
              } else {
                // Ngày đầu tiên đạt mục tiêu hoặc bắt đầu lại sau khi đứt chuỗi -> Chuỗi bắt đầu từ 1
                currentStreak = 1;
              }

              const streakExp = 10 + bonusExp;

              await updateDoc(userRef, {
                currentStreak,
                lastStreakDate: today,
                lastLoginDate: today,
                totalExp: increment(streakExp)
              });
              return;
            }

            // 2. Khi CHƯA học đủ hôm nay:
            // Chỉ bảo toàn chuỗi nếu hôm qua đã hoàn thành (chờ người dùng học nốt trong ngày)
            // hoặc nếu hôm nay đã nhận streak rồi.
            // Nếu không đạt (ví dụ: chưa học hôm qua, người dùng mới, hoặc dữ liệu cũ chưa có streak) -> Chuỗi phải là 0!
            if (!isGoalMetToday && lastStreakDate !== today && lastStreakDate !== yesterday) {
              if (currentStreak > 0) {
                currentStreak = 0;
                await updateDoc(userRef, {
                  currentStreak: 0,
                  lastLoginDate: today
                });
                return;
              }
            }

            // 3. Cập nhật lastLoginDate thông thường nếu sang ngày mới
            if (lastLoginDate !== today) {
              await updateDoc(userRef, { lastLoginDate: today });
              return;
            }

            // Tính Level
            const level = 1 + Math.floor(Math.sqrt(totalExp / 100));
            const nextLevelExp = Math.pow(level, 2) * 100;
            
            setUserProfile({
              totalExp,
              currentStreak,
              level,
              nextLevelExp,
            });
            setLoading(false);
          }
        });
      } else {
        setRole('user');
        setUserProfile(null);
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Đăng nhập Email
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  // Đăng xuất
  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        userProfile,
        signInWithEmail,
        signOut: signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
