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
import { calculateUserStreak, getLocalISODate } from '../../lib/srs/streakCalculator';


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
        
        unsubscribeSnapshot = onSnapshot(userRef, (snap) => {
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
            setDoc(userRef, defaultData, { merge: true }).catch((err) => {
              console.warn('[AuthProvider] Failed to save default user profile:', err);
            });
            setUserProfile({
              totalExp: 0,
              currentStreak: 0,
              level: 1,
              nextLevelExp: 100,
            });
            setLoading(false);
          } else {
            const data = snap.data();
            setRole(data?.role === 'admin' ? 'admin' : 'user');
            
            // Tự động bổ sung các trường thiếu cho tài khoản cũ (chạy ngầm, không block UI)
            const missingUpdates: Record<string, any> = {};
            if (data?.totalStudyScore === undefined) missingUpdates.totalStudyScore = 0;
            if (data?.totalRaceScore === undefined) missingUpdates.totalRaceScore = 0;
            if (data?.myCourseIds === undefined) missingUpdates.myCourseIds = [];
            if (data?.dailyStudyTime === undefined) missingUpdates.dailyStudyTime = {};
            if (data?.activityHistory === undefined) missingUpdates.activityHistory = {};
            if (Object.keys(missingUpdates).length > 0) {
              updateDoc(userRef, missingUpdates).catch((err) => {
                console.warn('[AuthProvider] Failed to auto-fill missing profile fields:', err);
              });
            }
            
            const now = new Date();
            const today = getLocalISODate(now);
            const lastLoginDate = data?.lastLoginDate;
            const lastStreakAwardedDate = data?.lastStreakDate;
            const totalExp = Number(data?.totalExp) || 0;
            const dailyStudyTime = (data?.dailyStudyTime || {}) as Record<string, number>;
            const activityHistory = (data?.activityHistory || {}) as Record<string, number>;

            // Tính toán chuỗi streak thực tế chuẩn xác dựa trên nhật ký học tập (dailyStudyTime & activityHistory)
            const { currentStreak, isGoalMetToday } = calculateUserStreak(
              dailyStudyTime,
              activityHistory,
              now
            );

            const updatesToDoc: Record<string, any> = {};

            // 1. Thưởng EXP cho streak ngày hôm nay nếu học đủ mục tiêu và chưa nhận thưởng
            if (isGoalMetToday && lastStreakAwardedDate !== today) {
              let bonusExp = 0;
              if (currentStreak >= 30) bonusExp = 100;
              else if (currentStreak >= 14) bonusExp = 50;
              else if (currentStreak >= 7) bonusExp = 20;
              else if (currentStreak >= 3) bonusExp = 10;

              const streakExp = 10 + bonusExp;
              updatesToDoc.lastStreakDate = today;
              updatesToDoc.totalExp = increment(streakExp);
            }

            // 2. Tự động đồng bộ chuỗi streak thực tế vào Firestore nếu khác với dữ liệu cũ
            if (data?.currentStreak !== currentStreak) {
              updatesToDoc.currentStreak = currentStreak;
            }

            // 3. Cập nhật lastLoginDate thông thường nếu sang ngày mới
            if (lastLoginDate !== today) {
              updatesToDoc.lastLoginDate = today;
            }

            if (Object.keys(updatesToDoc).length > 0) {
              updateDoc(userRef, updatesToDoc).catch((err) => {
                console.warn('[AuthProvider] Failed to update streak/login metadata:', err);
              });
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
        }, (err) => {
          console.warn('[AuthProvider] Error in userRef snapshot listener:', err);
          // Fallback an toàn: vẫn tắt loading để không làm kẹt app
          setUserProfile((prev) => prev || {
            totalExp: 0,
            currentStreak: 0,
            level: 1,
            nextLevelExp: 100,
          });
          setLoading(false);
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
