import { useMemo, useState, useEffect, useRef } from 'react';
import type { LearningItem } from '../types';
import { getCourseById } from '../data/courses/registry';
import { getOfflineCourseData, saveCourseOffline } from '../lib/offline/offlineStorage';
import { useNetworkStatus } from './useNetworkStatus';

export function useCourseData(courseId: string | undefined) {
  const { isOnline } = useNetworkStatus();
  const [offlineData, setOfflineData] = useState<any[] | null>(null);
  const syncedRef = useRef<string | null>(null);

  const course = useMemo(() => {
    return getCourseById(courseId || '');
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;

    // Đọc dữ liệu từ IndexedDB nếu có
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

  // Tự động đồng bộ bản offline trong IndexedDB khi ONLINE và có bản cập nhật mới từ hệ thống
  useEffect(() => {
    if (isOnline && course && offlineData && syncedRef.current !== course.id) {
      syncedRef.current = course.id;
      const liveCount = course.data?.length || 0;
      const offlineCount = offlineData.length;
      // Nếu số lượng khác nhau hoặc có dữ liệu mới, cập nhật lại IndexedDB ngầm
      if (liveCount > 0 && liveCount !== offlineCount) {
        console.log(`[useCourseData] Auto-syncing updated course data for ${course.id} (${liveCount} items vs ${offlineCount} offline)...`);
        saveCourseOffline(course).catch(err => console.warn('[useCourseData] Auto-sync failed:', err));
      }
    }
  }, [isOnline, course, offlineData]);

  // Xác định nguồn dữ liệu thông minh theo trạng thái mạng:
  // - Nếu Online: Ưu tiên dùng `course?.data` bản mới nhất từ website.
  // - Nếu Offline: Lấy từ `offlineData` đã lưu trong IndexedDB.
  const isUsingOfflineSource = !isOnline && !!offlineData;
  const isDownloadedOffline = !!offlineData;

  const rawDataset: LearningItem[] = useMemo(() => {
    // Khi Offline -> ưu tiên offlineData. Khi Online -> ưu tiên course.data (bản mới nhất)
    const activeData = !isOnline
      ? (offlineData || course?.data)
      : (course?.data || offlineData);

    if (!course || !activeData) return [];

    // Áp dụng bộ trích xuất extractType nếu có
    let processedData = activeData;

    if (course.extractType === 'vocabulary_only') {
      processedData = processedData.flatMap((item: any) => item.words || []);
    } else if (course.extractType === 'kanji_only') {
      processedData = processedData.map((item: any) => {
        const { words, ...kanjiOnly } = item;
        return kanjiOnly;
      });
    }

    // Gắn template ngôn ngữ
    return processedData.map((item: any) => ({
      ...item,
      template: course.template || 'japanese',
    }));
  }, [course, offlineData, isOnline]);

  return {
    course,
    rawDataset,
    isOfflineData: isUsingOfflineSource,
    isDownloadedOffline,
    isOnline
  };
}
