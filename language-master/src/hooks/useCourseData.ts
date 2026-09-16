import { useMemo, useState, useEffect } from 'react';
import type { LearningItem } from '../types';
import { getCourseById } from '../data/courses/registry';
import { getOfflineCourseData } from '../lib/offline/offlineStorage';

export function useCourseData(courseId: string | undefined) {
  const [offlineData, setOfflineData] = useState<any[] | null>(null);

  const course = useMemo(() => {
    return getCourseById(courseId || '');
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    getOfflineCourseData(courseId).then((data) => {
      if (!cancelled && data && data.length > 0) {
        setOfflineData(data);
      }
    });

    const handler = (e: any) => {
      if (e.detail?.courseId === courseId) {
        getOfflineCourseData(courseId).then((data) => {
          if (!cancelled) setOfflineData(data);
        });
      }
    };
    window.addEventListener('offline_course_changed', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('offline_course_changed', handler);
    };
  }, [courseId]);

  const rawDataset: LearningItem[] = useMemo(() => {
    const activeData = offlineData || course?.data;
    if (!course || !activeData) return [];
    
    // Apply template and extractType filtering
    let processedData = activeData;

    // Apply specific extractType if needed
    if (course.extractType === 'vocabulary_only') {
      processedData = processedData.flatMap((item: any) => item.words || []);
    } else if (course.extractType === 'kanji_only') {
      processedData = processedData.map((item: any) => {
        const { words, ...kanjiOnly } = item;
        return kanjiOnly;
      });
    }

    // Map template
    return processedData.map((item: any) => ({
      ...item,
      template: course.template || 'japanese', // Default fallback
    }));
  }, [course, offlineData]);

  return { course, rawDataset, isOfflineData: !!offlineData };
}

