import type { Attempt } from "./examCore";

export type AttemptKind = "pool" | "day" | "retry";

/** Loại lượt suy ra từ dữ liệu sẵn có trong Attempt. */
export function attemptKind(attempt: Attempt): AttemptKind {
  if (attempt.retry !== undefined) {
    if (attempt.retry) return "retry";
  } else if (
    // Phiên cũ chưa có cờ retry: chỉ coi là luyện lại khi là một phần của đề theo ngày
    attempt.targetQuestionIds.length > 0 &&
    !attempt.exam.isPracticePool &&
    attempt.targetQuestionIds.length < attempt.exam.mondais.reduce((n, m) => n + m.questions.length, 0)
  )
    return "retry";
  return attempt.exam.isPracticePool ? "pool" : "day";
}

/** mm:ss (hoặc h:mm:ss nếu từ 1 giờ trở lên). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Thời gian làm bài có giờ: min(endedAt, deadlineAt) − createdAt, không âm (mục 8.5). */
export function attemptDurationMs(attempt: Attempt, now = Date.now()): number {
  const end = Math.min(
    attempt.endedAt ?? now,
    attempt.deadlineAt ?? Number.POSITIVE_INFINITY,
  );
  return Math.max(0, end - attempt.createdAt);
}

/** "mm:ss", hoặc "50:00 (hết giờ)" khi hết giờ. */
export function formatAttemptDuration(attempt: Attempt, now = Date.now()): string {
  const text = formatDuration(attemptDurationMs(attempt, now));
  return attempt.reason === "timeout" ? `${text} (hết giờ)` : text;
}

function mondaiSummary(attempt: Attempt): string {
  const ids = new Set(attempt.questionIds);
  const present = attempt.exam.mondais
    .filter((m) => m.questions.some((q) => ids.has(q.id)))
    .map((m) => m.number);
  if (present.length === 1) return `Mondai ${present[0]}`;
  if (present.length === 9) return "9 dạng";
  return `${present.length} dạng`;
}

/** Tiêu đề và trạng thái dùng chung cho banner kho, thanh phiên, lịch sử (JL-10). */
export function describeAttempt(
  attempt: Attempt,
  now = Date.now(),
): { title: string; status: string } {
  const kind = attemptKind(attempt);
  const total = attempt.questionIds.length;
  const answered = Object.keys(attempt.answers).length;
  let title: string;
  if (kind === "retry") title = `Luyện lại · ${total} câu`;
  else if (attempt.mode === "mock")
    title =
      kind === "pool"
        ? `Bài có giờ · Đề trộn ${total} câu`
        : `${attempt.exam.title} · Bài có giờ`;
  else
    title =
      kind === "pool"
        ? `Luyện theo dạng · ${mondaiSummary(attempt)} · ${total} câu`
        : `${attempt.exam.title} · Luyện theo dạng`;

  let status: string;
  if (attempt.status === "submitted") {
    const correct = attempt.questionIds.filter((id) => {
      for (const m of attempt.exam.mondais)
        for (const q of m.questions)
          if (q.id === id) return attempt.answers[id] === q.answer;
      return false;
    }).length;
    status = `Đã nộp · ${correct}/${total} đúng`;
  } else if (attempt.mode === "mock" && attempt.deadlineAt) {
    status = `Còn ${formatDuration(attempt.deadlineAt - now)} · ${answered}/${total} câu`;
  } else {
    status = `Đang luyện · ${answered}/${total} câu`;
  }
  return { title, status };
}
