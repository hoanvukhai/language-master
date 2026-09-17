// src/context/customCourses/useCustomCourses.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { 
  getUserCustomCourses, 
  createCustomCourse, 
  updateCustomCourse, 
  deleteCustomCourse, 
  togglePublishCustomCourse,
  sanitizeCourseDoc,
  type CustomCourseDoc, 
  type CreateCustomCourseInput 
} from '../../lib/customCourses/customCourseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function useCustomCourses() {
  const { user, userProfile } = useAuth();
  const [customCourses, setCustomCourses] = useState<CustomCourseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getUserCustomCourses(user?.uid);
      setCustomCourses(list);
    } catch (e) {
      console.error('Error in useCustomCourses fetchCourses:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // 1. Luôn tải danh sách ban đầu và lắng nghe event cục bộ
    fetchCourses();
    const handler = () => fetchCourses();
    window.addEventListener('custom_courses_changed', handler);

    // 2. Nếu đã đăng nhập -> Lắng nghe realtime từ tài liệu người dùng (có sẵn quyền 100%)
    let unsubscribe = () => {};
    if (user?.uid) {
      const userRef = doc(db, 'users', user.uid);
      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.customCourses)) {
            const list: CustomCourseDoc[] = data.customCourses.map(sanitizeCourseDoc);
            setCustomCourses(list);
          }
        }
        setLoading(false);
      }, (err) => {
        console.warn('useCustomCourses listener fallback to local:', err);
        fetchCourses();
      });
    }

    return () => {
      unsubscribe();
      window.removeEventListener('custom_courses_changed', handler);
    };
  }, [user, fetchCourses]);

  const createCourse = async (input: CreateCustomCourseInput) => {
    const created = await createCustomCourse(user?.uid, userProfile || user, input);
    await fetchCourses();
    return created;
  };

  const updateCourse = async (courseId: string, updates: Partial<CreateCustomCourseInput> & { isPublished?: boolean }) => {
    await updateCustomCourse(courseId, user?.uid, updates);
    await fetchCourses();
  };

  const deleteCourse = async (courseId: string) => {
    await deleteCustomCourse(courseId, user?.uid);
    await fetchCourses();
  };

  const togglePublish = async (courseId: string, currentStatus: boolean) => {
    const res = await togglePublishCustomCourse(courseId, user?.uid, currentStatus);
    await fetchCourses();
    return res;
  };

  return {
    customCourses,
    myCourses: customCourses,
    loading,
    refresh: fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    togglePublish,
  };
}
