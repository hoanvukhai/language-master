import { effectiveNow, type Attempt } from "./examCore.ts";

export type AttemptKind = "pool" | "day" | "retry";

export const MONDAI_NAMES: Record<number, string> = {
  1: "Cách đọc Kanji",
  2: "Cách viết Kanji",
  3: "Cấu tạo từ",
  4: "Ngữ cảnh câu",
  5: "Từ đồng nghĩa",
  6: "Cách dùng từ",
  7: "Ngữ pháp câu",
  8: "Sắp xếp câu ★",
  9: "Điền đoạn văn",
};

/** Tên thống nhất cho ba hành động trên một đề (C-3, KS-2) */
export const ACTION_LABELS = {
  drill: "Luyện theo dạng",
  mock: "Làm bài có giờ",
  review: "Làm bài",
} as const;

/** Tên ngày hiển thị một kiểu: "Ngày 01" (bỏ "第1日 (Day 1)" lặp) */
export function dayName(exam: { day?: number; title: string; isPracticePool?: boolean }): string {
  return exam.day && !exam.isPracticePool
    ? `Ngày ${String(exam.day).padStart(2, "0")}`
    : exam.title;
}

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

/** Thời gian còn lại của bài có giờ (null với bài luyện không giờ). */
export function remainingMs(attempt: Attempt, now = Date.now()): number | null {
  if (attempt.mode !== "mock" || attempt.deadlineAt === undefined) return null;
  return Math.max(0, attempt.deadlineAt - effectiveNow(attempt, now));
}

/** Giờ còn lại làm tròn lên theo giây; dùng chung cho mọi nơi hiển thị để không lệch nhau 1 giây. */
export function formatRemaining(ms: number): string {
  return formatDuration(Math.ceil(Math.max(0, ms) / 1000) * 1000);
}

/** Nhãn nút làm tiếp: "Làm tiếp · còn 43:46", "Làm tiếp · tạm dừng 43:46" hoặc "Làm tiếp". */
export function resumeButtonLabel(attempt: Attempt, now = Date.now()): string {
  const rem = remainingMs(attempt, now);
  if (rem === null) return "Làm tiếp";
  return attempt.pausedAt !== undefined
    ? `Làm tiếp · tạm dừng ${formatRemaining(rem)}`
    : `Làm tiếp · còn ${formatRemaining(rem)}`;
}

/** Thời gian làm bài có giờ: min(endedAt, deadlineAt) − createdAt − pausedMs, không âm (mục 8.5). */
export function attemptDurationMs(attempt: Attempt, now = Date.now()): number {
  const curNow = effectiveNow(attempt, now);
  const end = Math.min(
    attempt.endedAt ?? curNow,
    attempt.deadlineAt ?? Number.POSITIVE_INFINITY,
  );
  return Math.max(0, end - attempt.createdAt - (attempt.pausedMs ?? 0));
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
  if (kind === "retry") {
    const label =
      attempt.retryKind === "wrong"
        ? "Ôn câu sai"
        : attempt.retryKind === "blank"
          ? "Ôn câu bỏ trống"
          : attempt.retryKind === "flags"
            ? "Ôn câu chưa chắc"
            : "Luyện lại";
    title = `${label} · ${total} câu`;
  } else if (attempt.mode === "mock")
    title =
      kind === "pool"
        ? `Bài có giờ · Đề trộn ${total} câu`
        : `${dayName(attempt.exam)} · Bài có giờ`;
  else
    title =
      kind === "pool"
        ? `Luyện theo dạng · ${mondaiSummary(attempt)} · ${total} câu`
        : `${dayName(attempt.exam)} · Luyện theo dạng`;

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
    const rem = formatRemaining(attempt.deadlineAt - effectiveNow(attempt, now));
    status =
      attempt.pausedAt !== undefined
        ? `Tạm dừng · Còn ${rem} · ${answered}/${total} câu`
        : `Còn ${rem} · ${answered}/${total} câu`;
  } else {
    status = `Đang luyện · ${answered}/${total} câu`;
  }
  return { title, status };
}
