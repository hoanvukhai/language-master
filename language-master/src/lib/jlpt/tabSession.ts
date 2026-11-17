import { useSyncExternalStore } from "react";
import {
  decodeSession,
  LAST_RESULT_KEY,
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
/** Chủ của phiên trong tab: mã tài khoản hoặc "guest" (JL: tách dữ liệu theo tài khoản). */
const OWNER_KEY = "language-master:jlpt:v2:owner";
export const GUEST_OWNER = "guest";
let activeOwner: string | null = null;
/**
 * Người đã đăng nhập: bài trong tab chỉ giữ trong RAM của trang (dữ liệu lâu dài nằm trên Firebase),
 * không ghi vào bộ nhớ trình duyệt. Khách: lưu sessionStorage như trước.
 */
let memoryOnly = false;
/** Bản sao kết quả để quay lại sau khi ôn câu sai (người đăng nhập: chỉ trong RAM) */
let memoryBackup: Attempt | null = null;
function readOwner(): string | null {
  try {
    return sessionStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}
function writeOwner(owner: string | null) {
  try {
    if (owner) sessionStorage.setItem(OWNER_KEY, owner);
    else sessionStorage.removeItem(OWNER_KEY);
  } catch {
    /* bỏ qua nếu storage bị chặn */
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
  if (memoryOnly) return;
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
        setNotice("Bài đang làm đã hết hạn.", "warning");
      }
    }
  } catch {
    removeStored();
    setNotice(
      "Không khôi phục được bài đang làm. Bạn vẫn có thể làm bài tiếp.",
      "warning",
    );
  }
}
export function getSession() {
  loadSession();
  return current;
}
export function setSession(next: Attempt | null, opts: { silent?: boolean } = {}) {
  current = next;
  if (next) {
    persist();
    if (activeOwner && !memoryOnly) writeOwner(activeOwner);
  } else if (removeStored()) {
    if (!opts.silent) setNotice("Đã xóa bài đang làm.", "info");
  }
  else
    setNotice(
      "Đã bỏ bài đang làm; chưa xóa được bản lưu. Thử xóa lại.",
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
      setNotice("Bài đang làm đã hết hạn.", "warning");
      emit();
    }
  }
}
/**
 * Gắn phiên trong tab với tài khoản đang dùng.
 * - Khách vừa đăng nhập: bài trong tab được nhận vào tài khoản (bài đã nộp sẽ được lưu).
 * - Đăng xuất hoặc đổi tài khoản: bài của tài khoản cũ bị bỏ khỏi tab (bản nháp của tài khoản đó vẫn còn).
 */
export function claimSession(uid: string | null) {
  const next = uid ?? GUEST_OWNER;
  loadSession();
  activeOwner = next;
  const signedIn = next !== GUEST_OWNER;
  const stored = readOwner() ?? GUEST_OWNER;
  if (current && stored !== next && stored !== GUEST_OWNER) {
    // Bài của tài khoản khác (hoặc của lúc trước khi đăng xuất): bỏ khỏi tab, báo ngắn (LS-4)
    const hadInProgress = current.status === "in_progress";
    current = null;
    memoryBackup = null;
    removeStored();
    try {
      sessionStorage.removeItem(LAST_RESULT_KEY);
    } catch {
      /* bỏ qua */
    }
    if (hadInProgress) {
      setNotice("Tài khoản đã thay đổi hoặc đăng xuất. Bài đang làm vẫn nằm trong tài khoản cũ.", "info");
    }
    emit();
  }
  if (signedIn) {
    // Đăng nhập: chuyển bài trong tab (của khách hoặc bản cũ) vào RAM, xóa khỏi bộ nhớ trình duyệt
    if (!memoryBackup) memoryBackup = getLastResultBackup();
    memoryOnly = true;
    removeStored();
    try {
      sessionStorage.removeItem(LAST_RESULT_KEY);
    } catch {
      /* bỏ qua */
    }
    writeOwner(null);
  } else {
    if (memoryOnly && current) {
      // Vừa đăng xuất mà bài trong RAM là của tài khoản: không để lại cho khách
      current = null;
      emit();
    }
    memoryOnly = false;
    memoryBackup = null;
    writeOwner(GUEST_OWNER);
  }
}

/** Xóa dữ liệu luyện đề cũ của tài khoản còn sót trong bộ nhớ trình duyệt (bản nháp, hàng chờ lưu, dấu đã lưu). */
export function purgeAccountLocalData(uid: string) {
  try {
    for (const key of [
      `language-master:jlpt:v1:drafts:${uid}`,
      `language-master:jlpt:v2:drafts:${uid}`,
      `language-master:jlpt:v2:drafts-migrated:${uid}`,
      `language-master:jlpt:v1:pending-saves:${uid}`,
    ])
      localStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
  try {
    sessionStorage.removeItem(`language-master:jlpt:v1:history-saved:${uid}`);
    sessionStorage.removeItem("language-master:jlpt:v1:history-saved");
  } catch {
    /* bỏ qua */
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

/** Lưu bản sao kết quả trước khi chuyển sang Ôn câu sai để quay lại bảng kết quả được */
export function saveLastResultBackup(attempt: Attempt | null) {
  if (!attempt || attempt.status !== "submitted") return;
  if (memoryOnly) {
    memoryBackup = attempt;
    return;
  }
  try {
    sessionStorage.setItem(
      LAST_RESULT_KEY,
      JSON.stringify({ version: 2, attempt }),
    );
  } catch {
    /* bỏ qua nếu hết dung lượng sessionStorage */
  }
}

export function getLastResultBackup(): Attempt | null {
  if (memoryOnly) return memoryBackup;
  try {
    const raw = sessionStorage.getItem(LAST_RESULT_KEY);
    if (!raw) return null;
    return decodeSession(raw);
  } catch {
    return null;
  }
}

export function clearLastResultBackup() {
  memoryBackup = null;
  try {
    sessionStorage.removeItem(LAST_RESULT_KEY);
  } catch {
    /* bỏ qua */
  }
}
