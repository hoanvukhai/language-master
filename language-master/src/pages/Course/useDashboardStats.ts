import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { fetchUserSRSProgress } from '../../lib/srs/firestoreSync';

export interface CourseStats {
  dueCount: number;
  progressPercent: number; // this is actually learnedCount
  highScore: number;
  masteryCounts: number[];
}

export function useDashboardStats(userId: string | undefined, courseIds: string[]) {
  const [stats, setStats] = useState<Record<string, CourseStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || courseIds.length === 0) {
      setStats({});
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadStats() {
      setLoading(true);
      try {
        // Fetch user doc to get raceScores
        const userRef = doc(db, 'users', userId!);
        const userSnap = await getDoc(userRef);
        // courseRaceScores[courseId] = tổng điểm đua của khóa học đó (ghi bởi recordArenaRace)
        // raceScores[courseId_gameMode] = kỷ lục từng trò riêng lẻ
        const courseRaceScores = userSnap.exists() ? (userSnap.data()?.courseRaceScores || {}) : {};

        const newStats: Record<string, CourseStats> = {};
        const now = new Date();

        // Fetch SRS progress for each course
        // Using Promise.all to fetch them concurrently
        await Promise.all(
          courseIds.map(async (courseId) => {
            const progressRecord = await fetchUserSRSProgress(userId!, courseId);
            const progressList = Object.values(progressRecord);
            
            let dueCount = 0;
            let learnedCount = 0;
            let masteryCounts = [0, 0, 0, 0, 0, 0, 0, 0];
            
            progressList.forEach((p) => {
              if (p.status !== 'new') {
                const level = Math.min(7, Math.max(0, p.masteryLevel || 0));
                masteryCounts[level]++;
                
                // Count any studied item (even Level 0 seed) as learned for progress %
                learnedCount++;
                
                if (p.nextReviewDate <= now) {
                  dueCount++;
                }
              }
            });

            newStats[courseId] = {
              dueCount,
              progressPercent: learnedCount,
              highScore: courseRaceScores[courseId] || 0,
              masteryCounts
            };
          })
        );

        if (isMounted) {
          setStats(newStats);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [userId, courseIds.join(',')]);

  return { stats, loading };
}
