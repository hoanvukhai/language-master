import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/auth/useAuth';
import { recordStudyTime } from '../../lib/srs/pointsEngine';

const AFK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_INTERVAL_MS = 60 * 1000;   // 1 minute

export function TimeTracker() {
  const { user } = useAuth();
  const lastActiveTime = useRef<number>(Date.now());
  const accumulatedSeconds = useRef<number>(0);
  const syncInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    // --- Activity Listeners ---
    const handleActivity = () => {
      lastActiveTime.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    // --- Sync Logic ---
    const syncTime = () => {
      const now = Date.now();
      
      // If user hasn't interacted for 5 minutes, they are AFK
      if (now - lastActiveTime.current > AFK_TIMEOUT_MS) {
        // Do not accumulate time if AFK
      } else {
        // Active in the last 5 mins -> add 60 seconds (since interval is 1 min)
        accumulatedSeconds.current += 60;
      }

      if (accumulatedSeconds.current >= 60) {
        // Push to Firebase
        const secondsToPush = accumulatedSeconds.current;
        accumulatedSeconds.current = 0; // reset early to prevent double-push
        
        recordStudyTime(user.uid, secondsToPush).catch(err => {
          // If fails, put it back
          console.error("Time sync failed:", err);
          accumulatedSeconds.current += secondsToPush;
        });
      }
    };

    // Run sync every minute
    syncInterval.current = setInterval(syncTime, SYNC_INTERVAL_MS);

    // --- Cleanup & Before Unload ---
    const handleBeforeUnload = () => {
      // Push any remaining seconds immediately before closing
      const now = Date.now();
      if (now - lastActiveTime.current <= AFK_TIMEOUT_MS) {
        // Add the partial minute since last sync
        const remainder = Math.floor((now % SYNC_INTERVAL_MS) / 1000);
        if (remainder > 0) {
          recordStudyTime(user.uid, accumulatedSeconds.current + remainder);
          accumulatedSeconds.current = 0;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (syncInterval.current) clearInterval(syncInterval.current);
      handleBeforeUnload(); // run once on component unmount
    };
  }, [user]);

  return null; // This is a headless component
}
