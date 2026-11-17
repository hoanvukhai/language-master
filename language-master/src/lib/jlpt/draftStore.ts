// Bài JLPT làm dở của tài khoản đã đăng nhập: chỉ lưu trên Firebase, users/{uid}/jlpt_drafts/{mã bài}.
// Không lưu gì vào bộ nhớ trình duyệt; trong trang chỉ giữ một bản sao trong RAM để hiện danh sách ngay.
// Ghi lên Firebase được gom lại (sau khi ngừng thao tác ~0,3 giây) và ghi ngay khi rời phòng / ẩn tab.
// Xóa là xóa thẳng trên Firebase; lỗi (quyền, mạng) được báo ra màn hình qua draftSyncError().
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Attempt } from "./examCore";
import {
  MAX_DRAFTS,
  isValidDraft,
  restoreAttemptFromDraft,
  toCompactDraft,
  type CompactDraft,
} from "./historySummary";
import { classifyFirebaseError, type FirebaseErrorKind } from "./firebaseErrors";

export type { CompactDraft };
export { MAX_DRAFTS, restoreAttemptFromDraft, toCompactDraft };

export const DRAFTS_CHANGED_EVENT = "app:jlpt-drafts-changed";
const WRITE_DELAY_MS = 300;

const draftsCol = (uid: string) => collection(db, "users", uid, "jlpt_drafts");

/** Bản sao trong RAM của danh sách trên Firebase (theo tài khoản), mất khi tải lại trang. */
const cache = new Map<string, Map<string, CompactDraft>>();
/** Ghi đang chờ gom (mã tài khoản:mã bài) */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const queued = new Map<string, CompactDraft>();
/** Mỗi bài một chuỗi thao tác tuần tự, để lệnh xóa không bị lệnh ghi cũ đè lại */
const chains = new Map<string, Promise<void>>();
/** Bài vừa xóa trong trang này: bỏ qua nếu Firebase trả về bản cũ trước khi lệnh xóa xong */
const removed = new Map<string, Set<string>>();
const legacyChecked = new Set<string>();
/** Đã tải danh sách từ Firebase trong trang này (để không tải lại khi chỉ chuyển trang trong app) */
const loadedUsers = new Set<string>();

export function draftsLoaded(uid: string): boolean {
  return loadedUsers.has(uid);
}

let lastSyncError: FirebaseErrorKind | null = null;
/** Lỗi đồng bộ gần nhất với Firebase (null nếu lần gần nhất thành công). */
export function draftSyncError(): FirebaseErrorKind | null {
  return lastSyncError;
}

function notify(uid: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DRAFTS_CHANGED_EVENT, { detail: { uid } }));
}

function userCache(uid: string): Map<string, CompactDraft> {
  let m = cache.get(uid);
  if (!m) {
    m = new Map();
    cache.set(uid, m);
  }
  return m;
}

function removedSet(uid: string): Set<string> {
  let s = removed.get(uid);
  if (!s) {
    s = new Set();
    removed.set(uid, s);
  }
  return s;
}

function sorted(list: Iterable<CompactDraft>): CompactDraft[] {
  return [...list]
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, MAX_DRAFTS);
}

/** Firestore không nhận giá trị undefined: làm sạch qua JSON trước khi ghi. */
function plain(d: CompactDraft): CompactDraft {
  return JSON.parse(JSON.stringify(d)) as CompactDraft;
}

function chain(uid: string, id: string, op: () => Promise<void>): Promise<void> {
  const key = `${uid}:${id}`;
  const next = (chains.get(key) ?? Promise.resolve())
    .then(op)
    .then(
      () => {
        if (lastSyncError) {
          lastSyncError = null;
          notify(uid);
        }
      },
      (e: unknown) => {
        lastSyncError = classifyFirebaseError(e);
        console.error("[JLPT] Không đồng bộ được bài làm dở với Firebase:", e);
        notify(uid);
      },
    );
  chains.set(key, next);
  void next.finally(() => {
    if (chains.get(key) === next) chains.delete(key);
  });
  return next;
}

function writeNow(uid: string, id: string): Promise<void> {
  const key = `${uid}:${id}`;
  const t = timers.get(key);
  if (t) clearTimeout(t);
  timers.delete(key);
  const d = queued.get(key);
  queued.delete(key);
  if (!d) return chains.get(key) ?? Promise.resolve();
  return chain(uid, id, () => setDoc(doc(draftsCol(uid), id), plain(d)));
}

/** Bài dở đã biết trong trang (từ lần tải Firebase gần nhất và các thay đổi trong trang). */
export function readLocalDrafts(uid: string): CompactDraft[] {
  if (!uid) return [];
  return sorted(userCache(uid).values());
}

/**
 * Ghi bài đang làm lên Firebase. Mặc định gom các thay đổi liên tiếp (ghi sau ~0,3 giây);
 * immediate = true khi rời phòng thi, ẩn tab, tạm dừng.
 */
export function saveUserDraft(
  uid: string,
  attempt: Attempt,
  opts: { immediate?: boolean; now?: number } = {},
): CompactDraft | null {
  if (!uid) return null;
  const draft = toCompactDraft(attempt, opts.now ?? Date.now());
  if (!draft) return null;
  removedSet(uid).delete(draft.id);
  userCache(uid).set(draft.id, draft);
  const key = `${uid}:${draft.id}`;
  queued.set(key, draft);
  const t = timers.get(key);
  if (t) clearTimeout(t);
  if (opts.immediate) void writeNow(uid, draft.id);
  else timers.set(key, setTimeout(() => void writeNow(uid, draft.id), WRITE_DELAY_MS));
  notify(uid);
  return draft;
}

/** Ghi ngay mọi thay đổi đang chờ gom của tài khoản. */
export async function flushUserDrafts(uid: string): Promise<void> {
  if (!uid) return;
  const ids = [...queued.keys()]
    .filter((k) => k.startsWith(`${uid}:`))
    .map((k) => k.slice(uid.length + 1));
  await Promise.all(ids.map((id) => writeNow(uid, id)));
}

/** Xóa bài dở trên Firebase (hủy cả lệnh ghi đang chờ). Trả về danh sách còn lại trong trang. */
export function removeUserDraft(uid: string, draftId: string): CompactDraft[] {
  if (!uid) return [];
  const key = `${uid}:${draftId}`;
  const t = timers.get(key);
  if (t) clearTimeout(t);
  timers.delete(key);
  queued.delete(key);
  removedSet(uid).add(draftId);
  userCache(uid).delete(draftId);
  void chain(uid, draftId, () => deleteDoc(doc(draftsCol(uid), draftId)));
  notify(uid);
  return readLocalDrafts(uid);
}

export function clearAllUserDrafts(uid: string): void {
  if (!uid) return;
  for (const d of readLocalDrafts(uid)) removeUserDraft(uid, d.id);
  void getDocs(draftsCol(uid))
    .then((snap) =>
      Promise.all(snap.docs.map((d) => removeUserDraft(uid, d.id))),
    )
    .catch((e: unknown) => {
      lastSyncError = classifyFirebaseError(e);
      notify(uid);
    });
}

/**
 * Tải danh sách bài dở từ Firebase.
 * dropIds: mã các bài đã nộp (có trong lịch sử) — bản nháp của chúng bị xóa.
 * Lần đầu trong trang: chuyển bản nháp cũ từ users/{uid}.jlptDrafts sang chỗ mới rồi xóa trường cũ.
 */
export async function loadUserDrafts(
  uid: string,
  opts: { dropIds?: Iterable<string> } = {},
): Promise<CompactDraft[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(draftsCol(uid));
    const remote = snap.docs.map((d) => d.data()).filter(isValidDraft);

    if (!legacyChecked.has(uid)) {
      const userSnap = await getDoc(doc(db, "users", uid));
      const raw = userSnap.exists()
        ? (userSnap.data() as { jlptDrafts?: unknown }).jlptDrafts
        : undefined;
      if (Array.isArray(raw)) {
        for (const d of raw.filter(isValidDraft)) {
          if (remote.some((r) => r.id === d.id)) continue;
          await setDoc(doc(draftsCol(uid), d.id), plain(d));
          remote.push(d);
        }
        await updateDoc(doc(db, "users", uid), { jlptDrafts: deleteField() });
      }
      legacyChecked.add(uid);
    }

    const drop = new Set(opts.dropIds ?? []);
    const gone = removedSet(uid);
    const next = new Map<string, CompactDraft>();
    for (const d of remote) {
      if (gone.has(d.id)) continue;
      if (drop.has(d.id)) {
        removeUserDraft(uid, d.id);
        continue;
      }
      next.set(d.id, d);
    }
    // Thay đổi trong trang chưa kịp ghi lên Firebase thì mới hơn bản vừa tải
    for (const [key, d] of queued) if (key.startsWith(`${uid}:`) && !drop.has(d.id)) next.set(d.id, d);
    cache.set(uid, next);
    loadedUsers.add(uid);
    lastSyncError = null;
    notify(uid);
    return readLocalDrafts(uid);
  } catch (e) {
    lastSyncError = classifyFirebaseError(e);
    console.error("[JLPT] Không tải được bài làm dở từ Firebase:", e);
    notify(uid);
    throw e;
  }
}
