import { useSyncExternalStore } from "react";
import {
  decodeSession,
  reconcile,
  SESSION_KEY,
  type Attempt,
} from "./examCore.ts";
let current: Attempt | null = null;
let notice = "";
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
    notice = "Đã lưu tạm trong tab này";
  } catch {
    const removed = removeStored();
    notice =
      "Đang giữ bài trong bộ nhớ. Tải lại có thể mất bài" +
      (removed ? "." : " hoặc khôi phục bản đã lưu trước đó.");
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
        notice = "Phiên tạm đã hết hạn.";
      }
    }
  } catch {
    removeStored();
    notice = "Không khôi phục được phiên. Bạn vẫn có thể làm bài bằng bộ nhớ.";
  }
}
export function getSession() {
  loadSession();
  return current;
}
export function setSession(next: Attempt | null) {
  current = next;
  if (next) persist();
  else
    notice = removeStored()
      ? "Đã xóa phiên tạm."
      : "Đã bỏ phiên khỏi bộ nhớ; chưa xóa được bản lưu. Thử xóa lại.";
  emit();
}
export function refreshSession() {
  loadSession();
  const next = reconcile(current);
  if (next !== current) {
    setSession(next);
    if (!next) {
      notice = "Phiên tạm đã hết hạn.";
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
  return { attempt: current, notice };
}
