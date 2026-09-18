import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function useMyCourses() {
  const { user } = useAuth();
  
  const getStorageKey = () => `nihongo_my_courses_${user?.uid || 'guest'}`;
  const getWorkspaceStorageKey = () => `nihongo_workspace_courses_${user?.uid || 'guest'}`;

  const [myCourseIds, setMyCourseIds] = useState<string[]>([]);
  const [workspaceCourseIds, setWorkspaceCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Guest mode: load from localStorage
      const saved = localStorage.getItem(getStorageKey());
      let parsedMyCourses: string[] = [];
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
          parsed = Array.from(new Set(parsed)) as string[];
          parsedMyCourses = parsed;
          setMyCourseIds(parsed);
          if (migrated) localStorage.setItem(getStorageKey(), JSON.stringify(parsed));
        } catch (e) {
          console.error('Failed to parse my courses', e);
        }
      } else {
        setMyCourseIds([]);
      }

      // Load workspace courses
      const savedWorkspace = localStorage.getItem(getWorkspaceStorageKey());
      if (savedWorkspace) {
        try {
          const parsedWp: string[] = JSON.parse(savedWorkspace);
          // Only keep courses that exist in myCourseIds
          const validWp = parsedWp.filter(id => parsedMyCourses.includes(id));
          setWorkspaceCourseIds(validWp);
        } catch (e) {
          console.error('Failed to parse workspace courses', e);
          setWorkspaceCourseIds(parsedMyCourses.slice(0, 4));
        }
      } else {
        // Default: pin the first up to 4 courses
        const defaultWp = parsedMyCourses.slice(0, 4);
        setWorkspaceCourseIds(defaultWp);
        if (defaultWp.length > 0) {
          localStorage.setItem(getWorkspaceStorageKey(), JSON.stringify(defaultWp));
        }
      }

      setLoading(false);
      return;
    }

    // Authenticated user: listen from Firestore
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let ids: string[] = [];
        if (data.myCourseIds && Array.isArray(data.myCourseIds)) {
          ids = [...data.myCourseIds];
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

        // Workspace courses
        if (data.workspaceCourseIds && Array.isArray(data.workspaceCourseIds)) {
          const validWp = data.workspaceCourseIds.filter((id: string) => ids.includes(id));
          setWorkspaceCourseIds(validWp);
        } else if (ids.length > 0) {
          // Initialize workspace with up to 4 courses if never initialized
          const initialWp = ids.slice(0, 4);
          setWorkspaceCourseIds(initialWp);
          setDoc(userRef, { workspaceCourseIds: initialWp }, { merge: true }).catch(console.error);
        } else {
          setWorkspaceCourseIds([]);
        }
      } else {
        setMyCourseIds([]);
        setWorkspaceCourseIds([]);
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
    const nextMyCourses = Array.from(new Set([...myCourseIds, courseId]));
    const nextWorkspace = Array.from(new Set([courseId, ...workspaceCourseIds]));
    
    setMyCourseIds(nextMyCourses);
    setWorkspaceCourseIds(nextWorkspace);

    if (!user) {
      localStorage.setItem(getStorageKey(), JSON.stringify(nextMyCourses));
      localStorage.setItem(getWorkspaceStorageKey(), JSON.stringify(nextWorkspace));
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        myCourseIds: nextMyCourses,
        workspaceCourseIds: nextWorkspace
      }, { merge: true });
    } catch (error) {
      console.error('Error adding course to firestore:', error);
    }
  };

  const removeCourse = async (courseId: string) => {
    const nextMyCourses = myCourseIds.filter(id => id !== courseId);
    const nextWorkspace = workspaceCourseIds.filter(id => id !== courseId);

    setMyCourseIds(nextMyCourses);
    setWorkspaceCourseIds(nextWorkspace);

    if (!user) {
      localStorage.setItem(getStorageKey(), JSON.stringify(nextMyCourses));
      localStorage.setItem(getWorkspaceStorageKey(), JSON.stringify(nextWorkspace));
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        myCourseIds: nextMyCourses,
        workspaceCourseIds: nextWorkspace
      }, { merge: true });
    } catch (error) {
      console.error('Error removing course from firestore:', error);
    }
  };

  const togglePinCourse = async (courseId: string) => {
    const isPinned = workspaceCourseIds.includes(courseId);
    const nextWorkspace = isPinned
      ? workspaceCourseIds.filter(id => id !== courseId)
      : [courseId, ...workspaceCourseIds];

    setWorkspaceCourseIds(nextWorkspace);

    if (!user) {
      localStorage.setItem(getWorkspaceStorageKey(), JSON.stringify(nextWorkspace));
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { workspaceCourseIds: nextWorkspace }, { merge: true });
    } catch (error) {
      console.error('Error toggling pin in firestore:', error);
    }
  };

  const reorderWorkspace = async (newOrderIds: string[]) => {
    setWorkspaceCourseIds(newOrderIds);

    if (!user) {
      localStorage.setItem(getWorkspaceStorageKey(), JSON.stringify(newOrderIds));
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { workspaceCourseIds: newOrderIds }, { merge: true });
    } catch (error) {
      console.error('Error saving reordered workspace to firestore:', error);
    }
  };

  return {
    myCourseIds,
    workspaceCourseIds,
    addCourse,
    removeCourse,
    togglePinCourse,
    reorderWorkspace,
    loading
  };
}

