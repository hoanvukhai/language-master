// src/lib/jlpt/historyService.ts
// Lịch sử điểm Luyện đề cho người đăng nhập (mục 10): users/{uid}/jlpt_attempts/{attemptId}.
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  HISTORY_MAX_ATTEMPTS,
  HISTORY_MAX_DAY_ATTEMPTS,
  HISTORY_RETENTION_DAYS,
  isMockAttempt,
  type AttemptSummary,
} from "./historySummary";

export {
  HISTORY_DEFAULT_VISIBLE,
  HISTORY_LOAD_LIMIT,
  HISTORY_MAX_ATTEMPTS,
  HISTORY_MAX_DAY_ATTEMPTS,
  HISTORY_RETENTION_DAYS,
  RADAR_AXES,
  accuracyByMondai,
  aggregateMistakeBuckets,
  buildAttemptHistoryRecord,
  buildAttemptSummary,
  computeSkillRadarAxes,
  displayAttemptTitle,
  isMockAttempt,
  computeTrendSeries,
  detectWeakMondais,
  filterAnalyticsAttempts,
  reconstructAttemptFromHistory,
  sameAttemptKind,
} from "./historySummary";
export type {
  AttemptSummary,
  SkillRadarPoint,
  TrendPoint,
} from "./historySummary";

export const HISTORY_SAVED_KEY = "language-master:jlpt:v1:history-saved";

export type StoredAttemptSummary = AttemptSummary & { id: string };

const attemptsCol = (uid: string) => collection(db, "users", uid, "jlpt_attempts");

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/** Tăng mỗi khi dữ liệu lịch sử trên tài khoản đổi, để bản lưu tạm ở trang tổng quan biết đã cũ (BE-6) */
let historyVersion = 0;
export function getHistoryVersion(): number {
  return historyVersion;
}

const statsRef = (uid: string) => doc(db, "users", uid, "jlpt_stats", "summary");

/** Tổng số lần thi thử đã lưu từ trước đến nay (không giảm khi xóa/cắt bớt lịch sử); null nếu chưa có bộ đếm. */
export async function getMockCount(uid: string): Promise<number | null> {
  const snap = await getDoc(statsRef(uid));
  const n = snap.exists() ? (snap.data() as { mockCount?: unknown }).mockCount : null;
  return typeof n === "number" && n >= 0 ? n : null;
}

/** Lần đầu có bộ đếm: khởi tạo bằng số bài thi thử đang còn trong lịch sử để số cũ không bị đặt lại về 0. */
async function seedMockCount(uid: string): Promise<number> {
  const snap = await getDocs(
    query(attemptsCol(uid), orderBy("endedAt", "desc"), limitTo(200)),
  );
  return snap.docs.filter((d) =>
    isMockAttempt(d.data() as Pick<AttemptSummary, "kind" | "mode" | "retry">),
  ).length;
}

export async function saveAttemptSummary(
  uid: string,
  attemptId: string,
  summary: AttemptSummary,
): Promise<void> {
  // Lịch sử chỉ giữ bài Thi thử
  if (!isMockAttempt(summary)) return;
  historyVersion++;
  const payload = {
    ...summary,
    startedAt: Timestamp.fromMillis(summary.startedAt),
    endedAt: Timestamp.fromMillis(summary.endedAt),
    savedAt: serverTimestamp(),
  };
  if (isMockAttempt(summary)) {
    // Thi thử: gắn số thứ tự cố định "lần N" và tăng bộ đếm trong cùng một giao dịch.
    // Lưu lại cùng một bài (thử lại sau lỗi) giữ nguyên số cũ, không đếm hai lần.
    const seed = (await getMockCount(uid)) ?? (await seedMockCount(uid));
    const attemptRef = doc(attemptsCol(uid), attemptId);
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(attemptRef);
      const prevSeq = existing.exists() ? (existing.data() as { seq?: unknown }).seq : undefined;
      if (typeof prevSeq === "number" && prevSeq > 0) {
        tx.set(attemptRef, stripUndefined({ ...payload, seq: prevSeq }));
        return;
      }
      const stats = await tx.get(statsRef(uid));
      const cur = stats.exists() ? (stats.data() as { mockCount?: unknown }).mockCount : undefined;
      const next = (typeof cur === "number" ? cur : seed) + 1;
      tx.set(statsRef(uid), { mockCount: next, updatedAt: serverTimestamp() });
      tx.set(attemptRef, stripUndefined({ ...payload, seq: next }));
    });
  } else {
    // Mất mạng thì setDoc không báo lỗi mà chờ mãi: quá 12 giây coi như chưa lưu được, giống Thi thử (BE-3)
    await Promise.race([
      setDoc(doc(attemptsCol(uid), attemptId), stripUndefined(payload)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error("save timeout"), { code: "unavailable" })), 12000),
      ),
    ]);
  }
  // Tự động cắt gọn lịch sử cũ (mỗi loại giữ riêng: 20 thi thử, 20 luyện, 60 theo ngày) ngầm
  await pruneAttemptHistory(uid).catch(() => undefined);
}

/** Xóa một bản ghi lịch sử làm bài khỏi Firestore. */
export async function deleteAttemptById(
  uid: string,
  attemptId: string,
): Promise<void> {
  historyVersion++;
  await deleteDoc(doc(attemptsCol(uid), attemptId));
}

/**
 * Dọn lịch sử, mỗi loại giữ riêng để loại này không xóa loại kia:
 * 20 bài Thi thử, 20 bài luyện (kể cả ôn lại), 60 lượt theo ngày (luôn giữ lượt mới nhất của mỗi ngày).
 * Chỉ bài luyện quá 90 ngày mới bị xóa theo tuổi; Thi thử giữ theo số lượng để Năng lực không tự trống.
 */
export async function pruneAttemptHistory(
  uid: string,
  now = Date.now(),
): Promise<number> {
  const cutoffMs = now - HISTORY_RETENTION_DAYS * 86400000;
  const snap = await getDocs(
    query(attemptsCol(uid), orderBy("endedAt", "desc"), limitTo(200)),
  );
  let mockSeen = 0;
  let drillSeen = 0;
  let daySeen = 0;
  const daysKept = new Set<string>();
  const toDelete = snap.docs.filter((d) => {
    const data = d.data() as Record<string, unknown>;
    if (data.kind === "day") {
      const key = String(data.examId ?? "");
      const newestOfDay = !daysKept.has(key);
      daysKept.add(key);
      daySeen += 1;
      return daySeen > HISTORY_MAX_DAY_ATTEMPTS && !newestOfDay;
    }
    if (isMockAttempt(data as Pick<AttemptSummary, "kind" | "mode" | "retry">)) {
      mockSeen += 1;
      return mockSeen > HISTORY_MAX_ATTEMPTS;
    }
    drillSeen += 1;
    if (drillSeen > HISTORY_MAX_ATTEMPTS) return true;
    const endedAtMs = toMillis(data.endedAt);
    return endedAtMs > 0 && endedAtMs < cutoffMs;
  });
  if (!toDelete.length) return 0;
  const batch = writeBatch(db);
  toDelete.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return toDelete.length;
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
  // Bản ghi cũ không phải Thi thử (lưu trước khi chốt chỉ giữ Thi thử) không hiện nữa
  return snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        ...(data as unknown as AttemptSummary),
        id: d.id,
        startedAt: toMillis(data.startedAt),
        endedAt: toMillis(data.endedAt),
      };
    })
    .filter((r) => isMockAttempt(r));
}

/** Một lượt theo mã (địa chỉ kết quả riêng của từng lượt); null nếu không có hoặc đã bị xóa. */
export async function getAttemptById(
  uid: string,
  attemptId: string,
): Promise<StoredAttemptSummary | null> {
  const snap = await getDoc(doc(attemptsCol(uid), attemptId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    ...(data as unknown as AttemptSummary),
    id: snap.id,
    startedAt: toMillis(data.startedAt),
    endedAt: toMillis(data.endedAt),
  };
}

/** Xóa toàn bộ lịch sử theo lô tối đa 400 document. */
export async function deleteAllAttempts(uid: string): Promise<number> {
  historyVersion++;
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

/** Mã các bài đã lưu lên tài khoản trong trang này (chỉ trong RAM, theo từng tài khoản). */
const savedByUser = new Map<string, Set<string>>();

export function readSavedIds(uid: string | null = null): Set<string> {
  return new Set(savedByUser.get(uid ?? "guest") ?? []);
}

export function markSaved(uid: string | null, id: string) {
  const key = uid ?? "guest";
  const set = savedByUser.get(key) ?? new Set<string>();
  set.add(id);
  savedByUser.set(key, set);
}
