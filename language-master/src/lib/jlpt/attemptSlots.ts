// Một "ô" chỉ giữ tối đa một bài làm dở: thi thử, luyện theo dạng, ôn lại (theo ngân hàng câu) và từng bài theo ngày.
// Danh sách "Đang làm" gộp bài trong tab và các bản nháp thành một nguồn duy nhất.
import type { Attempt } from "./examCore.ts";
import type { CompactDraft } from "./historySummary.ts";
import {
  describeAttempt,
  formatRemaining,
  resumeButtonLabel,
} from "./attemptLabels.ts";

export type SlotInput = {
  examId: string;
  isPool: boolean;
  mode: "drill" | "mock";
  retry?: boolean;
};

export function slotOf({ examId, isPool, mode, retry }: SlotInput): string {
  if (!isPool) return `day:${examId}`;
  if (retry) return `retry:${examId}`;
  return `${mode}:${examId}`;
}

export function attemptSlot(a: Attempt): string {
  return slotOf({
    examId: a.exam.id,
    isPool: Boolean(a.exam.isPracticePool),
    mode: a.mode,
    retry: a.retry === true,
  });
}

/** Bản nháp cũ chưa có cờ pool: mã đề ngân hàng luôn bắt đầu bằng "pool-". */
export function draftIsPool(d: CompactDraft): boolean {
  return d.pool ?? d.examId.startsWith("pool-");
}

export function draftSlot(d: CompactDraft): string {
  return slotOf({
    examId: d.examId,
    isPool: draftIsPool(d),
    mode: d.mode,
    retry: d.retry === true,
  });
}

export function slotLabel(slot: string): string {
  if (slot.startsWith("mock:")) return "Thi thử";
  if (slot.startsWith("drill:")) return "Luyện theo dạng";
  if (slot.startsWith("retry:")) return "Ôn lại";
  return "Theo ngày";
}

/** Trạng thái hiển thị của một bản nháp, tính lại từ dữ liệu (không dùng nhãn chụp lúc lưu). */
export function draftStatus(d: CompactDraft): string {
  const answered = Object.keys(d.answers || {}).length;
  const total = d.questionIds.length;
  if (d.mode === "mock" && d.remainingMs !== undefined)
    return `Tạm dừng · Còn ${formatRemaining(d.remainingMs)} · ${answered}/${total} câu`;
  return `Đang luyện · ${answered}/${total} câu`;
}

export function draftResumeLabel(d: CompactDraft): string {
  return d.mode === "mock" && d.remainingMs !== undefined
    ? `Làm tiếp · tạm dừng ${formatRemaining(d.remainingMs)}`
    : "Làm tiếp";
}

export type UnfinishedItem = {
  id: string;
  slot: string;
  examId: string;
  mode: "drill" | "mock";
  title: string;
  status: string;
  kindLabel: string;
  resumeLabel: string;
  ts: number;
  /** Bài đang nằm trong tab này (bản sống); false là bản nháp đã lưu */
  live: boolean;
  draft?: CompactDraft;
};

/**
 * Gộp bài đang làm trong tab với các bản nháp (bỏ trùng theo mã bài, bản trong tab ưu tiên)
 * thành danh sách "Đang làm" duy nhất. Bài trong tab đứng đầu, còn lại theo lần lưu gần nhất.
 */
export function buildUnfinishedList(
  session: Attempt | null,
  drafts: CompactDraft[],
  now = Date.now(),
): UnfinishedItem[] {
  const items: UnfinishedItem[] = [];
  const live = session && session.status === "in_progress" ? session : null;
  if (live) {
    const slot = attemptSlot(live);
    const d = describeAttempt(live, now);
    items.push({
      id: live.id,
      slot,
      examId: live.exam.id,
      mode: live.mode,
      title: d.title,
      status: d.status,
      kindLabel: slotLabel(slot),
      resumeLabel: resumeButtonLabel(live, now),
      ts: now,
      live: true,
    });
  }
  const rest = drafts
    .filter((d) => d.id !== live?.id)
    .map((d): UnfinishedItem => {
      const slot = draftSlot(d);
      return {
        id: d.id,
        slot,
        examId: d.examId,
        mode: d.mode,
        title: d.title,
        status: draftStatus(d),
        kindLabel: slotLabel(slot),
        resumeLabel: draftResumeLabel(d),
        ts: d.savedAt || d.createdAt,
        live: false,
        draft: d,
      };
    })
    .sort((a, b) => b.ts - a.ts);
  return [...items, ...rest];
}

export type StartGuardInput = {
  /** Bài trong tab lúc bấm (đã refreshSession) */
  current: Attempt | null;
  /** Ô của bài sắp tạo */
  slot: string;
  /** Có tài khoản thì bài dở khác ô được giữ lại thành bản nháp; khách thì sẽ mất */
  signedIn: boolean;
  drafts: CompactDraft[];
  /** Kết quả đã nộp trong tab nhưng chưa lưu được lên tài khoản (thay bài khác là mất) */
  unsavedResult?: boolean;
  now?: number;
};

export type StartGuardPlan = {
  /** Câu hỏi xác nhận (null nếu vào thẳng được) */
  question: string | null;
  /** Bài dở cùng ô sẽ bị xóa (cả trong tab lẫn bản nháp) */
  dropIds: string[];
  /** Bài trong tab khác ô cần giữ lại thành bản nháp trước khi thay */
  keepLive: Attempt | null;
};

/**
 * Quy tắc bắt đầu bài mới (dùng chung cho Tổng quan, Kho sách đề và phòng thi):
 * mỗi ô tối đa một bài dở; trùng ô thì hỏi rồi xóa bài cũ; bài khác ô được giữ (có tài khoản).
 */
export function planNewAttempt({
  current,
  slot,
  signedIn,
  drafts,
  unsavedResult = false,
  now = Date.now(),
}: StartGuardInput): StartGuardPlan {
  const live = current && current.status === "in_progress" ? current : null;
  const same: { id: string; title: string; status: string }[] = [];
  let keepLive: Attempt | null = null;
  let lostLive: Attempt | null = null;
  if (live) {
    if (attemptSlot(live) === slot) {
      const d = describeAttempt(live, now);
      same.push({ id: live.id, title: d.title, status: d.status });
    } else if (signedIn) keepLive = live;
    else lostLive = live;
  }
  for (const d of drafts) {
    if (d.id === live?.id || same.some((x) => x.id === d.id)) continue;
    if (draftSlot(d) === slot)
      same.push({ id: d.id, title: d.title, status: draftStatus(d) });
  }
  const parts: string[] = [];
  if (same.length === 1)
    parts.push(
      `Bài “${same[0].title}” đang dở (${same[0].status}) sẽ bị xóa và không tính điểm.`,
    );
  else if (same.length > 1)
    parts.push(`${same.length} bài cùng loại đang dở sẽ bị xóa và không tính điểm.`);
  if (current && current.status === "submitted" && unsavedResult)
    parts.push(
      `Kết quả “${describeAttempt(current, now).title}” chưa lưu được lên tài khoản sẽ mất.`,
    );
  if (lostLive)
    parts.push(
      `Bài đang làm trong tab (“${describeAttempt(lostLive, now).title}”) sẽ mất vì bạn chưa đăng nhập.`,
    );
  return {
    question: parts.length ? `${parts.join(" ")} Làm bài mới?` : null,
    dropIds: same.map((x) => x.id),
    keepLive,
  };
}
