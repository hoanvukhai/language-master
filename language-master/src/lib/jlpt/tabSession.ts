import { useSyncExternalStore } from "react";
import {
  decodeSession,
  reconcile,
  SESSION_CONTENT_KEY,
  SESSION_KEY,
  SESSION_STATE_KEY,
  type Attempt,
} from "./examCore.ts";
/** ID lượt đã ghi bản chụp đề; khác ID hiện tại thì mới ghi lại content (JL-20) */
let writtenContentId: string | null = null;
let current: Attempt | null = null;
let notice = "";
let noticeKind: "info" | "warning" = "info";
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
/** Chỉ báo lỗi/cảnh báo lâu dài; thông báo thông tin tự ẩn sau 4 giây (JL-27). */
function setNotice(text: string, kind: "info" | "warning") {
  notice = text;
  noticeKind = kind;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = undefined;
  if (text && kind === "info") {
    noticeTimer = setTimeout(() => {
      notice = "";
      noticeTimer = undefined;
      emit();
    }, 4000);
  }
}
let initialized = false;
let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version++;
  listeners.forEach((fn) => fn());
}
function removeStored() {
  writtenContentId = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_CONTENT_KEY);
    sessionStorage.removeItem(SESSION_STATE_KEY);
    return true;
  } catch {
    return false;
  }
}
/** Ghi phiên v2: bản chụp đề chỉ ghi khi đổi lượt, trạng thái ghi mỗi lần (JL-20). */
function persist() {
  if (!current) return;
  try {
    if (writtenContentId !== current.id) {
      sessionStorage.setItem(
        SESSION_CONTENT_KEY,
        JSON.stringify({ v: 2, attemptId: current.id, exam: current.exam }),
      );
      writtenContentId = current.id;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exam: _exam, ...state } = current;
    sessionStorage.setItem(
      SESSION_STATE_KEY,
      JSON.stringify({ v: 2, attempt: state }),
    );
    if (noticeKind === "warning" && notice.startsWith("Đang giữ bài"))
      setNotice("", "info");
  } catch {
    const removed = removeStored();
    setNotice(
      "Đang giữ bài trong bộ nhớ. Tải lại có thể mất bài" +
        (removed ? "." : " hoặc khôi phục bản đã lưu trước đó."),
      "warning",
    );
  }
}
/** Đọc phiên đã lưu: ưu tiên v2 (hai khóa), sau đó v1 (một khóa). Trả về chuỗi JSON dạng v1/v2 cho decodeSession. */
function readStored(): { raw: string; legacy: boolean } | null {
  const content = sessionStorage.getItem(SESSION_CONTENT_KEY);
  const state = sessionStorage.getItem(SESSION_STATE_KEY);
  if (content && state) {
    const c = JSON.parse(content) as { v: number; attemptId: string; exam: Attempt["exam"] };
    const st = JSON.parse(state) as { v: number; attempt: Omit<Attempt, "exam"> };
    if (c.v !== 2 || st.v !== 2 || c.attemptId !== st.attempt?.id)
      throw new Error("Phiên v2 không khớp");
    return {
      raw: JSON.stringify({ version: 2, attempt: { ...st.attempt, exam: c.exam } }),
      legacy: false,
    };
  }
  const legacy = sessionStorage.getItem(SESSION_KEY);
  return legacy ? { raw: legacy, legacy: true } : null;
}
export function loadSession() {
  if (initialized) return;
  initialized = true;
  try {
    const stored = readStored();
    if (stored) {
      current = decodeSession(stored.raw);
      if (current) {
        if (!stored.legacy) writtenContentId = current.id;
        persist();
        // Đã chuyển sang v2 thì bỏ khóa v1 (không xóa phiên hợp lệ)
        if (stored.legacy && writtenContentId === current.id) {
          try {
            sessionStorage.removeItem(SESSION_KEY);
          } catch {
            /* giữ nguyên nếu không xóa được */
          }
        }
      }
      else {
        removeStored();
        setNotice("Phiên tạm đã hết hạn.", "warning");
      }
    }
  } catch {
    removeStored();
    setNotice(
      "Không khôi phục được phiên. Bạn vẫn có thể làm bài bằng bộ nhớ.",
      "warning",
    );
  }
}
export function getSession() {
  loadSession();
  return current;
}
export function setSession(next: Attempt | null) {
  current = next;
  if (next) persist();
  else if (removeStored()) setNotice("Đã xóa phiên tạm.", "info");
  else
    setNotice(
      "Đã bỏ phiên khỏi bộ nhớ; chưa xóa được bản lưu. Thử xóa lại.",
      "warning",
    );
  emit();
}
export function refreshSession() {
  loadSession();
  const next = reconcile(current);
  if (next !== current) {
    setSession(next);
    if (!next) {
      setNotice("Phiên tạm đã hết hạn.", "warning");
      emit();
    }
  }
}
export function useTabSession() {
  loadSession();
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => version,
  );
  return { attempt: current, notice, noticeKind };
}
