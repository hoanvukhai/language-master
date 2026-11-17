// Lưu bài đã nộp lên tài khoản (Firebase) từ một chỗ duy nhất, dù bài nộp ở phòng thi, hết giờ
// hay được phát hiện ở trang chính. Không có bản sao trên máy: lỗi thì báo lý do và cho "Thử lại".
import type { Attempt } from "./examCore";
import {
  buildAttemptHistoryRecord,
  markSaved,
  readSavedIds,
  saveAttemptSummary,
} from "./historyService";
import { removeUserDraft } from "./draftStore";
import { isMockAttempt } from "./historySummary";
import { classifyFirebaseError, type FirebaseErrorKind } from "./firebaseErrors";

export type PersistResult = { ok: true } | { ok: false; kind: FirebaseErrorKind };

const inflight = new Map<string, Promise<PersistResult>>();

export function persistSubmittedAttempt(uid: string, attempt: Attempt): Promise<PersistResult> {
  if (!uid || attempt.status !== "submitted") return Promise.resolve({ ok: true });
  const key = `${uid}:${attempt.id}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = (async (): Promise<PersistResult> => {
    // Chỉ Thi thử được ghi vào lịch sử; các loại khác chỉ xóa bản nháp
    if (!isMockAttempt(buildAttemptHistoryRecord(attempt))) {
      removeUserDraft(uid, attempt.id);
      return { ok: true };
    }
    if (readSavedIds(uid).has(attempt.id)) return { ok: true };
    try {
      await saveAttemptSummary(uid, attempt.id, buildAttemptHistoryRecord(attempt));
      markSaved(uid, attempt.id);
      // Chỉ bỏ bản nháp SAU khi kết quả đã lưu; lưu lỗi thì nháp còn để không mất bài (BE-2)
      removeUserDraft(uid, attempt.id);
      return { ok: true };
    } catch (e) {
      console.error("[JLPT] Chưa lưu được bài lên tài khoản:", e);
      return { ok: false, kind: classifyFirebaseError(e) };
    }
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Đã lưu thành công trong trang này chưa (để cảnh báo trước khi thay kết quả chưa lưu). */
export function isSavedInThisPage(uid: string, attemptId: string): boolean {
  return readSavedIds(uid).has(attemptId);
}
