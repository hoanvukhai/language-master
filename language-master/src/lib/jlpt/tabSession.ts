import { useSyncExternalStore } from "react";
import {
  decodeSession,
  reconcile,
  SESSION_KEY,
  type Attempt,
} from "./examCore.ts";
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
  try {
    sessionStorage.removeItem(SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}
function persist() {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ version: 1, attempt: current }),
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
export function loadSession() {
  if (initialized) return;
  initialized = true;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      current = decodeSession(raw);
      if (current) persist();
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
