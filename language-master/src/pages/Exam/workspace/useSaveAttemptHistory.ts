// Lưu lượt đã nộp vào lịch sử của tài khoản (mục 10.1), qua lớp lưu chung (hàng chờ + chống lưu trùng).
// Dùng ở phòng thi/kết quả và ở trang chính (lưu bài đã nộp còn sót, kể cả bài của khách vừa đăng nhập).
import { useCallback, useEffect, useState } from "react";
import type { Attempt } from "../../../lib/jlpt/examCore";
import type { FirebaseErrorKind } from "../../../lib/jlpt/firebaseErrors";
import { useOptionalAuth } from "../../../context/auth/useOptionalAuth";
import { buildAttemptHistoryRecord, isMockAttempt } from "../../../lib/jlpt/historySummary";

export type HistorySaveState =
  | { status: "guest" }
  | { status: "book_local" }
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; previous?: { correct: number; total: number } }
  | { status: "error"; kind: FirebaseErrorKind };

export function useSaveAttemptHistory(
  attempt: Attempt | null,
  opts: { comparePrevious?: boolean } = {},
): {
  state: HistorySaveState;
  retry: () => void;
} {
  const user = useOptionalAuth()?.user ?? null;
  const uid = user?.uid ?? null;
  const comparePrevious = opts.comparePrevious ?? true;
  const [state, setState] = useState<HistorySaveState>({ status: "idle" });
  const [tick, setTick] = useState(0);
  const submittedId =
    attempt && attempt.status === "submitted" ? attempt.id : null;

  useEffect(() => {
    if (!submittedId || !attempt) {
      setState({ status: "idle" });
      return;
    }
    // Lịch sử chỉ giữ bài Thi thử; luyện theo dạng, theo ngày, ôn lại không lưu
    if (!isMockAttempt(buildAttemptHistoryRecord(attempt))) {
      setState({ status: "idle" });
      return;
    }
    if (!uid) {
      setState({ status: "guest" });
      return;
    }
    let cancelled = false;
    setState({ status: "saving" });
    (async () => {
      const [persist, svc] = await Promise.all([
        import("../../../lib/jlpt/attemptPersistence"),
        import("../../../lib/jlpt/historyService"),
      ]);
      const res = await persist.persistSubmittedAttempt(uid, attempt);
      if (!res.ok) {
        if (!cancelled) setState({ status: "error", kind: res.kind });
        return;
      }
      let previous: { correct: number; total: number } | undefined;
      if (comparePrevious) {
        try {
          const summary = svc.buildAttemptHistoryRecord(attempt);
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
      }
      if (!cancelled) setState({ status: "saved", previous });
    })().catch(() => {
      if (!cancelled) setState({ status: "error", kind: "unknown" });
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
