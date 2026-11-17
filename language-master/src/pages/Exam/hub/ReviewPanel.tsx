import { RotateCcw } from "lucide-react";
import { HISTORY_MAX_ATTEMPTS, aggregateMistakeBuckets } from "../../../lib/jlpt/historySummary";
import { getKnownQuestionIds } from "../../../lib/jlpt/freePractice";
import type { StoredAttemptSummary } from "../../../lib/jlpt/historyService";

export type RetryKind = "wrong";

type Props = {
  /** Các bài thi thử trong 20 bài gần nhất */
  summaries: StoredAttemptSummary[];
  onStartRetry: (kind: RetryKind, ids: string[], title?: string) => void;
};

/**
 * Khối Ôn tập (nằm sẵn trong Năng lực): bấm cả khối là vào làm ngay các câu sai.
 * Câu chưa làm (hết giờ) tính là sai. Ôn xong không bị trừ: câu sai chỉ mất khi bài chứa nó bị xóa
 * hoặc bị đẩy ra khỏi 20 bài gần nhất.
 */
export default function ReviewPanel({ summaries, onStartRetry }: Props) {
  const buckets = aggregateMistakeBuckets(summaries);
  // BE-10: bỏ mã câu đã không còn trong kho đề (đề được đánh lại mã) để số câu đếm khớp số câu làm được
  const known = getKnownQuestionIds();
  const ids = [...new Set([...buckets.wrongIds, ...buckets.blankIds])].filter((id) => known.has(id));
  const off = ids.length === 0;
  // Ôn câu sai thì ôn hết toàn bộ, không chia theo số câu mỗi lượt
  const take = ids.length;
  const picked = ids;

  return (
    <div className="space-y-2">
    <button
      type="button"
      disabled={off}
      aria-label={`Ôn câu sai (${take} câu)`}
      onClick={() => onStartRetry("wrong", picked)}
      className={`w-full text-left p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        off
          ? "bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed"
          : "bg-rose-50 dark:bg-rose-950/25 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 cursor-pointer"
      }`}
    >
      <span className="flex items-start gap-2.5 min-w-0">
        <RotateCcw
          size={16}
          aria-hidden="true"
          className={`shrink-0 mt-0.5 ${off ? "text-slate-400 dark:text-slate-500" : "text-rose-600 dark:text-rose-400"}`}
        />
        <span className="text-xs space-y-0.5 min-w-0 block">
          <span className={`block font-bold ${off ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
            Ôn tập
          </span>
          <span className="block text-slate-600 dark:text-slate-300">
            {off
              ? "Chưa có câu sai nào cần ôn."
              : `${ids.length} câu sai cần ôn (tính trên ${HISTORY_MAX_ATTEMPTS} bài thi thử gần nhất).`}
          </span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`shrink-0 whitespace-nowrap inline-flex items-center justify-center min-h-9 px-3.5 rounded-xl text-xs font-bold shadow-xs ${
          off
            ? "bg-white/70 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500"
            : "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300"
        }`}
      >
        Ôn {take} câu sai
      </span>
    </button>
    </div>
  );
}
