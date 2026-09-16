import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function useMyCourses() {
  const { user } = useAuth();
  
  const getStorageKey = () => `nihongo_my_courses_${user?.uid || 'guest'}`;

  const [myCourseIds, setMyCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Guest mode: load from localStorage
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        try {
          let parsed = JSON.parse(saved);
          let migrated = false;
          if (parsed.includes('n3-kanji-core')) {
            parsed = parsed.filter((id: string) => id !== 'n3-kanji-core');
            parsed.push('n3-kanji-single', 'n3-kanji-words');
            migrated = true;
          }
          if (parsed.includes('n2-kanji-core')) {
            parsed = parsed.filter((id: string) => id !== 'n2-kanji-core');
            parsed.push('n2-kanji-single', 'n2-kanji-words');
            migrated = true;
          }
          parsed = Array.from(new Set(parsed));
          setMyCourseIds(parsed);
          if (migrated) localStorage.setItem(getStorageKey(), JSON.stringify(parsed));
        } catch (e) {
          console.error('Failed to parse my courses', e);
        }
      } else {
        setMyCourseIds([]);
      }
      setLoading(false);
      return;
    }

    // Authenticated user: listen from Firestore
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.myCourseIds && Array.isArray(data.myCourseIds)) {
          let ids = [...data.myCourseIds];
          let migrated = false;
          // Migration from old kanji-core to kanji-single & kanji-words
          if (ids.includes('n3-kanji-core')) {
            ids = ids.filter(id => id !== 'n3-kanji-core');
            ids.push('n3-kanji-single', 'n3-kanji-words');
            migrated = true;
          }
          if (ids.includes('n2-kanji-core')) {
            ids = ids.filter(id => id !== 'n2-kanji-core');
            ids.push('n2-kanji-single', 'n2-kanji-words');
            migrated = true;
          }
          setMyCourseIds(ids);
          if (migrated) {
            setDoc(userRef, { myCourseIds: Array.from(new Set(ids)) }, { merge: true });
          }
        } else {
          setMyCourseIds([]);
        }
      } else {
        setMyCourseIds([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching myCourseIds from firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addCourse = async (courseId: string) => {
    // Optimistic update
    const next = Array.from(new Set([...myCourseIds, courseId]));
    setMyCourseIds(next);

    if (!user) {
      localStorage.setItem(getStorageKey(), JSON.stringify(next));
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { myCourseIds: next }, { merge: true });
    } catch (error) {
      console.error('Error adding course to firestore:', error);
      // Revert optimistic update if needed, but for now just log
    }
  };

  const removeCourse = async (courseId: string) => {
    const next = myCourseIds.filter(id => id !== courseId);
    setMyCourseIds(next);

    if (!user) {
      localStorage.setItem(getStorageKey(), JSON.stringify(next));
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { myCourseIds: next }, { merge: true });
    } catch (error) {
      console.error('Error removing course from firestore:', error);
    }
  };

  return {
    myCourseIds,
    addCourse,
    removeCourse,
    loading
  };
}

