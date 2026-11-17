import { useState } from "react";
import type { Attempt, Unit } from "../../../lib/jlpt/examCore";

type PaletteFilter = "all" | "unanswered";

type Props = {
  attempt: Attempt;
  groups: Unit[];
  seqMap: Map<string, number>;
  stats: { right: number; wrong: number };
  onJump: (unitIndex: number, questionId: string) => void;
  /** Câu hiện tại đang hiển thị (chỉ highlight đúng 1 câu, kể cả trong bài đọc nhiều câu) */
  currentQuestionId?: string;
  /** Dòng gợi ý phím tắt chỉ có ý nghĩa trên máy có bàn phím */
  showShortcutHint?: boolean;
  /** Bài thi có câu đoạn văn (hiện thêm gợi ý phím R) */
  hasPassage?: boolean;
  /** Lưới cao tối đa (aside cần giới hạn, sheet thì không) */
  gridClassName?: string;
};

/** Phiếu câu hỏi dùng chung cho cột phải (máy tính) và bottom sheet (điện thoại). */
export default function QuestionPalette({
  attempt,
  groups,
  seqMap,
  stats,
  onJump,
  currentQuestionId,
  showShortcutHint,
  hasPassage,
  gridClassName = "max-h-[50vh] overflow-y-auto",
}: Props) {
  const [filter, setFilter] = useState<PaletteFilter>("all");
  const answeredCount = Object.keys(attempt.answers).length;
  const total = attempt.questionIds.length;
  const committed = new Set(attempt.committed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {attempt.mode === "mock" ? "Phiếu trả lời bài thi" : "Tiến độ luyện tập"}
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
            Đã chọn {answeredCount} / {total} câu
          </p>
        </div>
        {attempt.mode === "drill" && (
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
              ✓ {stats.right}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/60">
              ✗ {stats.wrong}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["all", `Tất cả (${total})`],
            ["unanswered", `Chưa làm (${total - answeredCount})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`flex-1 min-w-fit px-2 py-1.5 rounded-lg text-xs font-semibold border text-center whitespace-nowrap transition-colors cursor-pointer ${
              filter === key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 p-1.5 pr-2 ${gridClassName}`}>
        {groups.map((g, unitIdx) =>
          g.questions.map((q) => {
            const isAnswered = !!attempt.answers[q.id];
            const isCommitted = committed.has(q.id);
            const isRight = attempt.answers[q.id] === q.answer;
            const isCurrent = currentQuestionId
              ? q.id === currentQuestionId
              : attempt.position === unitIdx;
            const seqNum = seqMap.get(q.id) ?? q.number;
            if (filter === "unanswered" && isAnswered) return null;
            let style =
              "bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300";
            if (isCommitted && attempt.mode === "drill") {
              style = isRight
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-rose-600 text-white border-rose-600";
            } else if (isAnswered) {
              style = "bg-indigo-600 text-white border-indigo-600";
            }
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onJump(unitIdx, q.id)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Câu ${seqNum}${isAnswered ? ", đã chọn" : ", chưa chọn"}`}
                title={
                  q.origin
                    ? `Câu ${seqNum} · Nguồn: Ngày ${q.origin.day} · Câu ${q.origin.number}`
                    : `Câu ${seqNum}`
                }
                className={`relative h-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all ${style} ${
                  isCurrent
                    ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900"
                    : ""
                }`}
              >
                <span>{seqNum}</span>
              </button>
            );
          }),
        )}
      </div>

      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
          Đã chọn
        </span>
        {attempt.mode === "drill" && (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
              Đúng
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
              Sai
            </span>
          </>
        )}
      </div>
      {showShortcutHint && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Phím tắt: <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">1–4</kbd> chọn đáp án ·{" "}
          <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">←/→</kbd> chuyển câu
          {hasPassage && (
            <>
              {" "}· <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">R</kbd> đoạn văn
            </>
          )}
        </p>
      )}
    </div>
  );
}
