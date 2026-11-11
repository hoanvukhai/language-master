// src/lib/jlpt/historyService.ts
// Lịch sử điểm Luyện đề cho người đăng nhập (mục 10): users/{uid}/jlpt_attempts/{attemptId}.
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { AttemptSummary } from "./historySummary";

export { buildAttemptSummary, sameAttemptKind, accuracyByMondai } from "./historySummary";
export type { AttemptSummary } from "./historySummary";

export const HISTORY_SAVED_KEY = "language-master:jlpt:v1:history-saved";

export type StoredAttemptSummary = AttemptSummary & { id: string };

const attemptsCol = (uid: string) => collection(db, "users", uid, "jlpt_attempts");

export async function saveAttemptSummary(
  uid: string,
  attemptId: string,
  summary: AttemptSummary,
): Promise<void> {
  await setDoc(doc(attemptsCol(uid), attemptId), {
    ...summary,
    startedAt: Timestamp.fromMillis(summary.startedAt),
    endedAt: Timestamp.fromMillis(summary.endedAt),
    savedAt: serverTimestamp(),
  });
}

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "number") return v;
  if (v && typeof (v as { toMillis?: () => number }).toMillis === "function")
    return (v as { toMillis: () => number }).toMillis();
  return 0;
}

/** Tối đa 200 lượt gần nhất, có thể lọc từ một mốc thời gian (một trường, không cần index ghép). */
export async function listRecentAttempts(
  uid: string,
  options: { sinceMs?: number; max?: number } = {},
): Promise<StoredAttemptSummary[]> {
  const parts = [
    ...(options.sinceMs
      ? [where("endedAt", ">=", Timestamp.fromMillis(options.sinceMs))]
      : []),
    orderBy("endedAt", "desc"),
    limitTo(Math.min(options.max ?? 200, 200)),
  ];
  const snap = await getDocs(query(attemptsCol(uid), ...parts));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      ...(data as unknown as AttemptSummary),
      id: d.id,
      startedAt: toMillis(data.startedAt),
      endedAt: toMillis(data.endedAt),
    };
  });
}

/** Xóa toàn bộ lịch sử theo lô tối đa 400 document. */
export async function deleteAllAttempts(uid: string): Promise<number> {
  let removed = 0;
  for (;;) {
    const snap = await getDocs(query(attemptsCol(uid), limitTo(400)));
    if (snap.empty) return removed;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += snap.size;
    if (snap.size < 400) return removed;
  }
}

export function readSavedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(HISTORY_SAVED_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function markSaved(id: string) {
  try {
    const ids = readSavedIds();
    ids.add(id);
    sessionStorage.setItem(HISTORY_SAVED_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // Bỏ qua lỗi bộ nhớ tab
  }
}
