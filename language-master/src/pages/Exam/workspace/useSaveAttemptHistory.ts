// Lưu lượt đã nộp vào lịch sử của tài khoản (mục 10.1). Khách không lưu gì.
import { useCallback, useEffect, useState } from "react";
import type { Attempt } from "../../../lib/jlpt/examCore";
import { useOptionalAuth } from "../../../context/auth/useOptionalAuth";

export type HistorySaveState =
  | { status: "guest" }
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; previous?: { correct: number; total: number } }
  | { status: "error" };

export function useSaveAttemptHistory(attempt: Attempt | null): {
  state: HistorySaveState;
  retry: () => void;
} {
  const user = useOptionalAuth()?.user ?? null;
  const uid = user?.uid ?? null;
  const [state, setState] = useState<HistorySaveState>({ status: "idle" });
  const [tick, setTick] = useState(0);
  const submittedId =
    attempt && attempt.status === "submitted" ? attempt.id : null;

  useEffect(() => {
    if (!submittedId || !attempt) return;
    if (!uid) {
      setState({ status: "guest" });
      return;
    }
    let cancelled = false;
    setState({ status: "saving" });
    (async () => {
      const svc = await import("../../../lib/jlpt/historyService");
      const summary = svc.buildAttemptSummary(attempt);
      if (!svc.readSavedIds().has(submittedId)) {
        await svc.saveAttemptSummary(uid, submittedId, summary);
        svc.markSaved(submittedId);
      }
      let previous: { correct: number; total: number } | undefined;
      try {
        const recent = await svc.listRecentAttempts(uid, { max: 30 });
        const prev = recent.find(
          (r) =>
            r.id !== submittedId &&
            r.endedAt < summary.endedAt &&
            svc.sameAttemptKind(r, summary),
        );
        if (prev) previous = { correct: prev.correct, total: prev.total };
      } catch {
        // So sánh lượt trước là phụ; lỗi đọc không ảnh hưởng trạng thái đã lưu
      }
      if (!cancelled) setState({ status: "saved", previous });
    })().catch(() => {
      if (!cancelled) setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
    // attempt đã nộp là bất biến; chỉ chạy lại theo id, tài khoản hoặc khi bấm Thử lại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedId, uid, tick]);

  const retry = useCallback(() => setTick((n) => n + 1), []);
  return { state, retry };
}
