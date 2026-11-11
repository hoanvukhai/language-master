// src/lib/jlpt/historySummary.ts
// Tóm tắt một lượt đã nộp để lưu lịch sử điểm (mục 10.2). Hàm thuần, không phụ thuộc Firebase.
import { questions, score, type Attempt, type AttemptRoundConfig } from "./examCore.ts";
import { attemptDurationMs, attemptKind, describeAttempt, type AttemptKind } from "./attemptLabels.ts";
import { computeStandardJLPTScore, isEstimateEligible } from "./practicePool.ts";

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
  const wrongIds = questions(attempt)
    .filter((q) => attempt.answers[q.id] !== q.answer)
    .map((q) => q.id)
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
