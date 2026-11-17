// src/lib/jlpt/historySummary.ts
// Tóm tắt một lượt đã nộp để lưu lịch sử điểm (mục 10.2). Hàm thuần, không phụ thuộc Firebase.
import {
  TTL,
  createAttempt,
  effectiveNow,
  questions,
  score,
  units,
  type Attempt,
  type AttemptRoundConfig,
} from "./examCore.ts";
import {
  attemptDurationMs,
  attemptKind,
  describeAttempt,
  type AttemptKind,
} from "./attemptLabels.ts";
import {
  computeStandardJLPTScore,
  isEstimateEligible,
  practiceSnapshot,
} from "./practicePool.ts";
import type { JLPTExam } from "../../data/exams/jlpt/types";

export const HISTORY_MAX_ATTEMPTS = 20;
/** Số lượt làm theo ngày tối đa được giữ để tính tiến độ lộ trình (R8). */
export const HISTORY_MAX_DAY_ATTEMPTS = 60;
/** Số bản ghi hub tải về: 20 bài thi thử/luyện + lượt theo ngày. */
export const HISTORY_LOAD_LIMIT = 100;
export const HISTORY_RETENTION_DAYS = 90;
export const HISTORY_DEFAULT_VISIBLE = 5;

export type RadarAxisDef = {
  id: "kanji" | "context" | "usage" | "grammar" | "reading";
  label: string;
  shortLabel: string;
  mondais: number[];
};

export const RADAR_AXES: RadarAxisDef[] = [
  { id: "kanji", label: "Kanji", shortLabel: "Kanji (M1–2)", mondais: [1, 2] },
  {
    id: "context",
    label: "Cấu tạo & Ngữ cảnh",
    shortLabel: "Ngữ cảnh (M3–4)",
    mondais: [3, 4],
  },
  {
    id: "usage",
    label: "Đồng nghĩa & Dùng từ",
    shortLabel: "Dùng từ (M5–6)",
    mondais: [5, 6],
  },
  {
    id: "grammar",
    label: "Ngữ pháp & ★",
    shortLabel: "Ngữ pháp (M7–8)",
    mondais: [7, 8],
  },
  {
    id: "reading",
    label: "Điền đoạn văn",
    shortLabel: "Đoạn văn (M9)",
    mondais: [9],
  },
];

export type AttemptSummary = {
  v: 1;
  examId: string;
  bookId: string;
  level: string;
  mode: "drill" | "mock";
  kind: AttemptKind;
  title: string;
  config: AttemptRoundConfig | null;
  strict: boolean | null;
  assistedCount: number;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  byMondai: Record<string, { total: number; correct: number }>;
  wrongIds: string[];
  questionIds?: string[];
  answeredWrongIds?: string[];
  blankIds?: string[];
  flagIds?: string[];
  choices?: Record<string, number>;
  retry?: boolean;
  retryKind?: "wrong" | "blank" | "flags";
  /** Số thứ tự thi thử cố định (đếm trọn đời tài khoản, không đổi khi xóa/cắt bớt bài cũ); chỉ có với bài thi thử đã lưu */
  seq?: number;
  pausedMs?: number;
  durationSec: number | null;
  estimate60: number | null;
  contentRevision: number;
  /** ms kể từ epoch; chuyển thành Timestamp khi ghi Firestore */
  startedAt: number;
  endedAt: number;
};

export function buildAttemptSummary(attempt: Attempt): AttemptSummary {
  const s = score(attempt);
  const selected = new Set(attempt.questionIds);
  const byMondai: AttemptSummary["byMondai"] = {};
  for (const m of attempt.exam.mondais) {
    const qs = m.questions.filter((q) => selected.has(q.id));
    if (!qs.length) continue;
    byMondai[String(m.number)] = {
      total: qs.length,
      correct: qs.filter((q) => attempt.answers[q.id] === q.answer).length,
    };
  }
  const qs = questions(attempt);
  const wrongIds = qs
    .filter((q) => attempt.answers[q.id] !== q.answer)
    .map((q) => q.id)
    .slice(0, 1080);
  const answeredWrongIds = qs
    .filter((q) => attempt.answers[q.id] && attempt.answers[q.id] !== q.answer)
    .map((q) => q.id)
    .slice(0, 1080);
  const blankIds = qs
    .filter((q) => !attempt.answers[q.id])
    .map((q) => q.id)
    .slice(0, 1080);
  const flagIds = attempt.flags
    .filter((id) => selected.has(id))
    .slice(0, 1080);
  const endedAt = attempt.endedAt ?? attempt.createdAt;
  return {
    v: 1,
    examId: attempt.exam.id,
    bookId: attempt.exam.bookId || attempt.exam.id,
    level: attempt.exam.level,
    mode: attempt.mode,
    kind: attemptKind(attempt),
    title: describeAttempt(attempt, endedAt).title,
    config: attempt.config ?? null,
    strict: attempt.mode === "mock" ? attempt.strict === true : null,
    assistedCount: attempt.assisted.length,
    total: s.total,
    correct: s.correct,
    wrong: s.wrong,
    blank: s.blank,
    byMondai,
    wrongIds,
    questionIds: [...attempt.questionIds].slice(0, 1080),
    answeredWrongIds,
    blankIds,
    flagIds,
    ...(attempt.retry !== undefined ? { retry: attempt.retry } : {}),
    ...(attempt.retryKind ? { retryKind: attempt.retryKind } : {}),
    ...(attempt.pausedMs !== undefined ? { pausedMs: attempt.pausedMs } : {}),
    durationSec:
      attempt.mode === "mock"
        ? Math.round(attemptDurationMs(attempt, endedAt) / 1000)
        : null,
    estimate60: isEstimateEligible(attempt)
      ? computeStandardJLPTScore(attempt).scaledScore
      : null,
    contentRevision: attempt.exam.contentRevision ?? 0,
    startedAt: attempt.createdAt,
    endedAt,
  };
}

/** Bản ghi gọn nhẹ lưu Firestore kèm map đáp án đã chọn để xem lại/tái tạo bài làm. */
export function buildAttemptHistoryRecord(attempt: Attempt): AttemptSummary {
  const base = buildAttemptSummary(attempt);
  const selected = new Set(attempt.questionIds);
  const choices: Record<string, number> = {};
  for (const [qId, opt] of Object.entries(attempt.answers || {})) {
    if (selected.has(qId) && [1, 2, 3, 4].includes(opt)) {
      choices[qId] = opt;
    }
  }
  return {
    ...base,
    choices,
  };
}

/** Lượt trước cùng loại: cùng examId, mode và cùng config nếu có (mục 10.4). */
export function sameAttemptKind(
  a: Pick<AttemptSummary, "examId" | "mode" | "config">,
  b: Pick<AttemptSummary, "examId" | "mode" | "config">,
): boolean {
  if (a.examId !== b.examId || a.mode !== b.mode) return false;
  if (!a.config && !b.config) return true;
  return JSON.stringify(a.config) === JSON.stringify(b.config);
}

/** Độ chính xác theo Mondai từ nhiều lượt (mục 10.4). */
export function accuracyByMondai(
  summaries: Pick<AttemptSummary, "byMondai">[],
): { mondai: number; correct: number; total: number; percent: number }[] {
  const acc = new Map<number, { correct: number; total: number }>();
  for (const s of summaries)
    for (const [k, v] of Object.entries(s.byMondai || {})) {
      const n = Number(k);
      const cur = acc.get(n) || { correct: 0, total: 0 };
      cur.correct += v.correct;
      cur.total += v.total;
      acc.set(n, cur);
    }
  return [...acc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([mondai, v]) => ({
      mondai,
      ...v,
      percent: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    }));
}

/** Lọc các bài hợp lệ để phân tích năng lực theo số bài gần nhất (thống nhất tối đa 20 bài; chỉ tính đề trộn thuộc ngân hàng, bỏ qua bài ôn lại hẹp). */
export function filterAnalyticsAttempts<T extends AttemptSummary>(
  summaries: T[],
  maxAttempts = HISTORY_MAX_ATTEMPTS,
): T[] {
  return summaries
    .filter((s) => s.kind === "pool" && s.retry !== true)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, maxAttempts);
}

/** Bài thi thử đề trộn (không tính bài ôn lại): đối tượng của bộ đếm "Thi thử lần N". */
export function isMockAttempt(s: Pick<AttemptSummary, "kind" | "mode" | "retry">): boolean {
  return s.kind === "pool" && s.mode === "mock" && s.retry !== true;
}

/** Tên hiển thị: "Thi thử lần N" khi đã có số thứ tự cố định, còn lại dùng tên đã lưu. */
export function displayAttemptTitle(
  s: Pick<AttemptSummary, "kind" | "mode" | "retry" | "seq" | "title">,
): string {
  return isMockAttempt(s) && typeof s.seq === "number" && s.seq > 0
    ? `Thi thử lần ${s.seq}`
    : s.title;
}

export type TrendPoint = {
  id: string;
  index: number;
  title: string;
  seq?: number;
  mode: "drill" | "mock";
  percent: number;
  estimate60: number | null;
  endedAt: number;
};

/** Chuỗi xu hướng theo thứ tự thời gian (cũ -> mới) từ các bài đã lọc để vẽ biểu đồ đường. */
export function computeTrendSeries(
  summaries: (AttemptSummary & { id?: string })[],
): TrendPoint[] {
  return [...summaries]
    .sort((a, b) => a.endedAt - b.endedAt)
    .map((s, idx) => ({
      id: s.id ?? `${s.endedAt}-${idx}`,
      index: idx + 1,
      title: displayAttemptTitle(s),
      ...(typeof s.seq === "number" ? { seq: s.seq } : {}),
      mode: s.mode,
      percent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      estimate60: s.estimate60 ?? null,
      endedAt: s.endedAt,
    }));
}

export type SkillRadarPoint = RadarAxisDef & {
  correct: number;
  total: number;
  percent: number | null;
};

/** Tổng hợp 5 trục kỹ năng cho biểu đồ Radar từ các bài đã lọc. */
export function computeSkillRadarAxes(
  summaries: Pick<AttemptSummary, "byMondai">[],
): SkillRadarPoint[] {
  const mondaiMap = new Map(
    accuracyByMondai(summaries).map((m) => [m.mondai, m]),
  );
  return RADAR_AXES.map((axis) => {
    let correct = 0;
    let total = 0;
    for (const mNum of axis.mondais) {
      const item = mondaiMap.get(mNum);
      if (item) {
        correct += item.correct;
        total += item.total;
      }
    }
    return {
      ...axis,
      correct,
      total,
      percent: total > 0 ? Math.round((correct / total) * 100) : null,
    };
  });
}

/** Xác định tối đa 2 Mondai cần ưu tiên ôn (tỷ lệ đúng thấp nhất, ưu tiên dữ liệu đủ >= 2 câu). */
export function detectWeakMondais(
  stats: { mondai: number; correct: number; total: number; percent: number }[],
  limit = 2,
): { mondai: number; correct: number; total: number; percent: number }[] {
  const reliable = stats.filter((s) => s.total >= 2);
  const pool = reliable.length > 0 ? reliable : stats.filter((s) => s.total > 0);
  return [...pool]
    .filter((s) => s.percent < 75)
    .sort((a, b) => a.percent - b.percent || b.total - a.total || a.mondai - b.mondai)
    .slice(0, limit);
}

/**
 * Tổng hợp kho câu sai / bỏ trống / chưa chắc / toàn bộ câu từ các bài thi thử đã nộp.
 * Câu sai và bỏ trống KHÔNG tự hết: đã sai ở bài nào còn trong danh sách bài thì giữ nguyên,
 * dù sau đó làm đúng ở bài khác hay ôn lại. Chỉ mất khi bài chứa nó bị xóa hoặc bị đẩy ra
 * khỏi cửa sổ 20 bài gần nhất (do người gọi cắt danh sách trước khi truyền vào).
 */
export function aggregateMistakeBuckets(summaries: AttemptSummary[]): {
  wrongIds: string[];
  blankIds: string[];
  flagIds: string[];
  allQuestionIds: string[];
} {
  const wrongSet = new Set<string>();
  const blankSet = new Set<string>();
  const flagSet = new Set<string>();
  const allQuestionSet = new Set<string>();

  const pooled = summaries
    .filter((s) => s.kind === "pool")
    .sort((a, b) => a.endedAt - b.endedAt);

  for (const s of pooled) {
    const hasDetailedBuckets =
      Array.isArray(s.answeredWrongIds) || Array.isArray(s.blankIds);
    const answeredWrong = new Set(
      hasDetailedBuckets ? s.answeredWrongIds || [] : s.wrongIds || [],
    );
    const blank = new Set(hasDetailedBuckets ? s.blankIds || [] : []);
    const flagged = new Set(s.flagIds || []);
    const touched = new Set<string>([
      ...(s.questionIds || []),
      ...answeredWrong,
      ...blank,
      ...flagged,
    ]);

    for (const qId of touched) {
      allQuestionSet.add(qId);
      if (answeredWrong.has(qId)) wrongSet.add(qId);
      if (blank.has(qId)) blankSet.add(qId);
      // "Chưa chắc" vẫn lấy theo lần làm gần nhất
      if (flagged.has(qId)) flagSet.add(qId);
      else flagSet.delete(qId);
    }
  }

  return {
    wrongIds: [...wrongSet],
    blankIds: [...blankSet],
    flagIds: [...flagSet],
    allQuestionIds: [...allQuestionSet],
  };
}

/** Tái tạo lại đối tượng Attempt đã nộp để xem lại đề & lời giải từ bản ghi lịch sử. */
export function reconstructAttemptFromHistory(
  record: AttemptSummary & { id?: string },
  catalogExam: JLPTExam | undefined,
  now = Date.now(),
): Attempt | null {
  if (!catalogExam || !Array.isArray(record.questionIds) || !record.questionIds.length) {
    return null;
  }
  const availableIds = new Set(
    catalogExam.mondais.flatMap((m) => m.questions.map((q) => q.id)),
  );
  const validIds = record.questionIds.filter((id) => availableIds.has(id));
  if (!validIds.length) return null;

  const snapshot = catalogExam.isPracticePool
    ? practiceSnapshot(catalogExam, validIds)
    : catalogExam;

  const limitMs =
    record.mode === "mock" && snapshot.timeLimitMinutes
      ? snapshot.timeLimitMinutes * 60000
      : Number.POSITIVE_INFINITY;
  const rawPausedMs = Math.max(0, record.pausedMs ?? 0);
  const rawCreated = Math.min(record.startedAt, now);
  const rawEnded = Math.max(rawCreated, Math.min(record.endedAt, now));
  const rawDeadline = Number.isFinite(limitMs)
    ? rawCreated + limitMs + rawPausedMs
    : Number.POSITIVE_INFINITY;

  // Giữ hợp lệ theo validate(): createdAt + TTL > now và endedAt <= deadlineAt
  const fitsWindow =
    rawCreated + TTL > now &&
    rawEnded <= rawDeadline;

  let startTs = rawCreated;
  let endTs = rawEnded;
  let pausedMs: number | undefined = record.pausedMs;

  if (!fitsWindow) {
    const activeMs =
      record.durationSec !== null
        ? Math.max(0, Math.min(record.durationSec * 1000, limitMs))
        : Math.max(0, Math.min(rawEnded - rawCreated - rawPausedMs, limitMs));
    const boundedSpan = Math.min(activeMs, 12 * 3600000);
    startTs = now - boundedSpan;
    endTs = now;
    pausedMs = undefined;
  }

  const created = createAttempt(snapshot, record.mode, validIds, startTs);
  const deadlineAt =
    created.deadlineAt !== undefined
      ? created.deadlineAt + (pausedMs ?? 0)
      : undefined;

  const answers: Record<string, number> = {};
  for (const [qId, opt] of Object.entries(record.choices || {})) {
    if (validIds.includes(qId) && [1, 2, 3, 4].includes(opt)) {
      answers[qId] = opt;
    }
  }
  const flags = (record.flagIds || []).filter((id) => validIds.includes(id));
  return {
    ...created,
    ...(record.id ? { id: record.id } : {}),
    status: "submitted",
    answers,
    committed: [...validIds],
    flags,
    expiresAt: startTs + TTL,
    ...(deadlineAt !== undefined ? { deadlineAt } : {}),
    ...(pausedMs !== undefined ? { pausedMs } : {}),
    endedAt: deadlineAt !== undefined ? Math.min(endTs, deadlineAt) : endTs,
    ...(record.strict !== null ? { strict: record.strict } : {}),
    ...(record.retry !== undefined ? { retry: record.retry } : {}),
    ...(record.retryKind ? { retryKind: record.retryKind } : {}),
    ...(record.config ? { config: record.config } : {}),
    reason:
      record.durationSec &&
      snapshot.timeLimitMinutes &&
      record.durationSec >= snapshot.timeLimitMinutes * 60
        ? "timeout"
        : "manual",
  };
}

/** Giới hạn an toàn cho số bài làm dở lưu lại; thực tế mỗi "ô" (thi thử, luyện theo dạng, từng ngày) chỉ giữ một bài. */
export const MAX_DRAFTS = 30;

export type CompactDraft = {
  id: string;
  examId: string;
  bookId: string;
  level: string;
  mode: "drill" | "mock";
  title: string;
  statusLabel: string;
  questionIds: string[];
  targetQuestionIds: string[];
  answers: Record<string, number>;
  committed: string[];
  flags: string[];
  assisted: string[];
  position: number;
  createdAt: number;
  savedAt: number;
  remainingMs?: number;
  pausedMs?: number;
  /** Bài từ ngân hàng câu (thi thử, luyện theo dạng); false với bài theo ngày */
  pool?: boolean;
  strict?: boolean;
  retry?: boolean;
  retryKind?: "wrong" | "blank" | "flags";
  config?: AttemptRoundConfig;
};

/** Kiểm tra dữ liệu bản nháp đọc từ Firebase (bỏ qua bản hỏng). */
export function isValidDraft(d: unknown): d is CompactDraft {
  return (
    !!d &&
    typeof d === "object" &&
    typeof (d as CompactDraft).id === "string" &&
    typeof (d as CompactDraft).examId === "string" &&
    ((d as CompactDraft).mode === "drill" || (d as CompactDraft).mode === "mock") &&
    Array.isArray((d as CompactDraft).questionIds) &&
    (d as CompactDraft).questionIds.length > 0
  );
}

/** Mã hóa một lượt đang làm dở thành bản nháp gọn nhẹ (không chứa nội dung đề). */
export function toCompactDraft(
  attempt: Attempt,
  now = Date.now(),
): CompactDraft | null {
  // Cả bài từ ngân hàng lẫn bài theo ngày đều có bản nháp, để bài dở không mất khi đóng tab
  if (attempt.status !== "in_progress") {
    return null;
  }
  const selected = new Set(attempt.questionIds);
  const answers: Record<string, number> = {};
  for (const [qId, opt] of Object.entries(attempt.answers || {})) {
    if (selected.has(qId) && [1, 2, 3, 4].includes(opt)) {
      answers[qId] = opt;
    }
  }
  const desc = describeAttempt(attempt, now);
  const remainingMs =
    attempt.mode === "mock" && attempt.deadlineAt !== undefined
      ? Math.max(0, attempt.deadlineAt - effectiveNow(attempt, now))
      : undefined;
  return {
    id: attempt.id,
    examId: attempt.exam.id,
    bookId: attempt.exam.bookId || attempt.exam.id,
    level: attempt.exam.level,
    mode: attempt.mode,
    title: desc.title,
    statusLabel: desc.status,
    questionIds: [...attempt.questionIds],
    targetQuestionIds: attempt.targetQuestionIds.filter((id) => selected.has(id)),
    answers,
    committed: attempt.committed.filter((id) => selected.has(id)),
    flags: attempt.flags.filter((id) => selected.has(id)),
    assisted: attempt.assisted.filter((id) => selected.has(id)),
    position: attempt.position,
    createdAt: attempt.createdAt,
    savedAt: now,
    ...(remainingMs !== undefined ? { remainingMs } : {}),
    ...(attempt.pausedMs !== undefined ? { pausedMs: attempt.pausedMs } : {}),
    pool: Boolean(attempt.exam.isPracticePool),
    ...(attempt.strict !== undefined ? { strict: attempt.strict } : {}),
    ...(attempt.retry !== undefined ? { retry: attempt.retry } : {}),
    ...(attempt.retryKind ? { retryKind: attempt.retryKind } : {}),
    ...(attempt.config ? { config: attempt.config } : {}),
  };
}

/** Khôi phục lại Attempt đang làm từ bản nháp gọn nhẹ, bảo đảm vượt qua validate() của examCore. */
export function restoreAttemptFromDraft(
  draft: CompactDraft,
  catalogExam: JLPTExam | undefined,
  now = Date.now(),
): Attempt | null {
  if (!catalogExam || !Array.isArray(draft.questionIds) || !draft.questionIds.length) {
    return null;
  }
  const availableIds = new Set(
    catalogExam.mondais.flatMap((m) => m.questions.map((q) => q.id)),
  );
  const validIds = draft.questionIds.filter((id) => availableIds.has(id));
  if (!validIds.length) return null;

  const snapshot = catalogExam.isPracticePool
    ? practiceSnapshot(catalogExam, validIds)
    : catalogExam;
  const validSet = new Set(validIds);
  const maxPos = Math.max(0, units(snapshot, validIds).length - 1);
  const position = Math.min(Math.max(0, draft.position || 0), maxPos);

  const answers: Record<string, number> = {};
  for (const [qId, opt] of Object.entries(draft.answers || {})) {
    if (validSet.has(qId) && [1, 2, 3, 4].includes(opt)) {
      answers[qId] = opt;
    }
  }

  let createdAt =
    draft.createdAt <= now && draft.createdAt + TTL > now ? draft.createdAt : now;
  let pausedAt: number | undefined;
  let pausedMs: number | undefined;

  if (draft.mode === "mock" && snapshot.timeLimitMinutes) {
    const limitMs = snapshot.timeLimitMinutes * 60000;
    const remMs = Math.max(1000, Math.min(limitMs, draft.remainingMs ?? limitMs));
    const activeElapsedMs = Math.max(0, limitMs - remMs);
    createdAt = now - activeElapsedMs;
    pausedAt = now;
    pausedMs = undefined;
  }

  const base = createAttempt(snapshot, draft.mode, validIds, createdAt);
  return {
    ...base,
    id: draft.id,
    targetQuestionIds: (draft.targetQuestionIds || []).filter((id) =>
      validSet.has(id),
    ),
    answers,
    committed: (draft.committed || []).filter((id) => validSet.has(id)),
    flags: (draft.flags || []).filter((id) => validSet.has(id)),
    assisted: (draft.assisted || []).filter((id) => validSet.has(id)),
    position,
    expiresAt: createdAt + TTL,
    ...(pausedAt !== undefined ? { pausedAt } : {}),
    ...(pausedMs !== undefined ? { pausedMs } : {}),
    ...(draft.strict !== undefined && draft.mode === "mock"
      ? { strict: draft.strict }
      : {}),
    ...(draft.retry !== undefined ? { retry: draft.retry } : {}),
    ...(draft.retryKind ? { retryKind: draft.retryKind } : {}),
    ...(draft.config ? { config: draft.config } : {}),
  };
}
