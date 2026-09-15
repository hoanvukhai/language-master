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
              totalExp: 10,
              currentStreak: 1,
              lastLoginDate: getLocalISODate(new Date()),
              learnSettings: {
                dailyNewWordLimit: 15,
                maxPendingWords: 50,
                sessionSize: 15,
                autoPlayAudio: false,
                showKana: true,
              },
            };
            await setDoc(userRef, defaultData);
          } else {
            const data = snap.data();
            setRole(data?.role === 'admin' ? 'admin' : 'user');
            
            const now = new Date();
            const today = getLocalISODate(now);
            const lastLoginDate = data?.lastLoginDate;
            let currentStreak = data?.currentStreak || 0;
            let totalExp = data?.totalExp || 0;

            const yestDate = new Date(now);
            yestDate.setDate(yestDate.getDate() - 1);
            const yesterday = getLocalISODate(yestDate);

            const lastStreakDate = data?.lastStreakDate;
            const todayExp = (data?.activityHistory || {})[today] || 0;
            const todaySeconds = (data?.dailyStudyTime || {})[today] || 0;
            const isGoalMetToday = todayExp >= 10 || todaySeconds >= 180;

            // 1. Nếu hôm nay đã hoàn thành mục tiêu học (10 EXP hoặc 3 phút) mà chưa nhận streak hôm nay
            if (isGoalMetToday && lastStreakDate !== today) {
              if (lastStreakDate === yesterday) {
                currentStreak += 1;
              } else {
                currentStreak = 1;
              }

              // Thuật toán: Thưởng EXP theo chuỗi
              let bonusExp = 0;
              if (currentStreak >= 30) bonusExp = 100;
              else if (currentStreak >= 14) bonusExp = 50;
              else if (currentStreak >= 7) bonusExp = 20;
              else if (currentStreak >= 3) bonusExp = 10;
              
              const streakExp = 10 + bonusExp;

              await updateDoc(userRef, {
                currentStreak,
                lastStreakDate: today,
                lastLoginDate: today,
                totalExp: increment(streakExp)
              });
              return;
            }

            // 2. Nếu đã qua hơn 1 ngày không học mục tiêu -> Đứt chuỗi
            if (!isGoalMetToday && lastStreakDate && lastStreakDate !== today && lastStreakDate !== yesterday) {
              if (currentStreak > 0) {
                currentStreak = 0;
                await updateDoc(userRef, {
                  currentStreak: 0,
                  lastLoginDate: today
                });
                return;
              }
            }

            // 3. Cập nhật lastLoginDate thông thường nếu là ngày mới
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
