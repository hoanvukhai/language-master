import { useState } from "react";
import type { Attempt, Unit } from "../../../lib/jlpt/examCore";

type PaletteFilter = "all" | "unanswered" | "flagged";

type Props = {
  attempt: Attempt;
  groups: Unit[];
  seqMap: Map<string, number>;
  stats: { right: number; wrong: number };
  onJump: (unitIndex: number, questionId: string) => void;
  /** Dòng gợi ý phím tắt chỉ có ý nghĩa trên máy có bàn phím */
  showShortcutHint?: boolean;
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
  showShortcutHint,
  gridClassName = "max-h-[46vh] overflow-y-auto",
}: Props) {
  const [filter, setFilter] = useState<PaletteFilter>("all");
  const answeredCount = Object.keys(attempt.answers).length;
  const total = attempt.questionIds.length;
  const flags = new Set(attempt.flags);
  const committed = new Set(attempt.committed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/70">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {attempt.mode === "mock" ? "Phiếu trả lời bài thi" : "Tiến độ luyện tập"}
          </p>
          <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            Đã chọn {answeredCount} / {total} câu
          </p>
        </div>
        {attempt.mode === "drill" && (
          <div className="flex items-center gap-1.5 text-xs font-black">
            <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
              ✓ {stats.right}
            </span>
            <span className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
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
            ["flagged", `Chưa chắc ⚑ (${attempt.flags.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
              filter === key
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 pr-1 ${gridClassName}`}>
        {groups.map((g, unitIdx) =>
          g.questions.map((q) => {
            const isAnswered = !!attempt.answers[q.id];
            const isFlagged = flags.has(q.id);
            const isCommitted = committed.has(q.id);
            const isRight = attempt.answers[q.id] === q.answer;
            const isCurrent = attempt.position === unitIdx;
            const seqNum = seqMap.get(q.id) ?? q.number;
            if (filter === "unanswered" && isAnswered) return null;
            if (filter === "flagged" && !isFlagged) return null;
            let style =
              "bg-slate-100 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
            if (isCommitted && attempt.mode === "drill") {
              style = isRight
                ? "bg-emerald-700 text-white border-emerald-700"
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
                aria-label={`Câu ${seqNum}${isAnswered ? ", đã chọn" : ", chưa chọn"}${isFlagged ? ", chưa chắc" : ""}`}
                title={
                  q.origin
                    ? `Câu ${seqNum} · Nguồn: Ngày ${q.origin.day} · Câu ${q.origin.number}`
                    : `Câu ${seqNum}`
                }
                className={`relative h-10 rounded-xl border text-xs font-black flex items-center justify-center transition-all ${style} ${
                  isCurrent
                    ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800"
                    : ""
                }`}
              >
                <span>{seqNum}</span>
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 text-[9px] flex items-center justify-center font-black shadow-2xs">
                    ⚑
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/70 flex flex-wrap gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
          Đã chọn
        </span>
        {attempt.mode === "drill" && (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700 inline-block" />
              Đúng
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
              Sai
            </span>
          </>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          Chưa chắc
        </span>
      </div>
      {showShortcutHint && (
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Phím tắt: <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">1–4</kbd> chọn đáp án ·{" "}
          <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">←/→</kbd> chuyển câu ·{" "}
          <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">F</kbd> đánh dấu
        </p>
      )}
    </div>
  );
}
