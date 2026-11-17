import type { ReactNode } from "react";
import {
  ChevronRight,
  Infinity as InfinityIcon,
  Play,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import type { JLPTLevel } from "../../../data/exams/jlpt/types";
import type { FreeScopeBookOption } from "./FreeScopeModal";
import FreeMondaiSelector from "./FreeMondaiSelector";

type Props = {
  level: JLPTLevel;
  books: FreeScopeBookOption[];
  selectedExamIds: string[];
  selectedMondais: number[];
  totalQuestionsInScope: number;
  onChangeMondais: (nextMondais: number[]) => void;
  onStartFree: () => void;
  onOpenScopeModal: () => void;
  /** Phần chân thẻ Mondai (ví dụ nhãn kỹ năng) */
  footer?: ReactNode;
};

function formatExamScopeSummary(
  books: FreeScopeBookOption[],
  selectedExamIds: string[],
): { headline: string; detail: string } {
  const allExams = books.flatMap((b) => b.exams);
  if (allExams.length === 0) {
    return { headline: "Chưa có bộ đề", detail: "Không tìm thấy bài nguồn" };
  }
  const pickedSet = new Set(selectedExamIds);
  const pickedExams = allExams.filter((e) => pickedSet.has(e.id));

  if (pickedExams.length === 0 || pickedExams.length >= allExams.length) {
    return {
      headline: `Tất cả ${allExams.length} bài`,
      detail:
        books.length === 1
          ? books[0].title
          : `${books.length} bộ sách/nguồn đề`,
    };
  }

  const labels = pickedExams
    .slice(0, 3)
    .map((e) => (e.day !== undefined ? `Ngày ${e.day}` : e.title));
  const extra = pickedExams.length - labels.length;
  const preview = extra > 0 ? `${labels.join(", ")}, +${extra}` : labels.join(", ");
  const activeBooks = books.filter((b) =>
    b.exams.some((e) => pickedSet.has(e.id)),
  ).length;

  return {
    headline: `${pickedExams.length}/${allExams.length} bài đã chọn`,
    detail:
      books.length > 1 ? `${activeBooks}/${books.length} bộ · ${preview}` : preview,
  };
}

export default function FreePracticeCard({
  level,
  books,
  selectedExamIds,
  selectedMondais,
  totalQuestionsInScope,
  onChangeMondais,
  onStartFree,
  onOpenScopeModal,
  footer,
}: Props) {
  const scopeSummary = formatExamScopeSummary(books, selectedExamIds);
  const pickedSet = new Set(selectedExamIds);
  const availableMondais = new Set(
    books
      .flatMap((b) => b.exams)
      .filter((e) => pickedSet.has(e.id))
      .flatMap((e) => e.availableMondais),
  );
  const canStart = totalQuestionsInScope > 0;

  return (
    <section aria-label="Luyện nhanh" className="space-y-3">
      {/* Hàng đầu giống Tổng quan: nút bắt đầu lớn + thẻ phụ (ở đây là Phạm vi bài nguồn) */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-2">
          <button
            type="button"
            disabled={!canStart}
            onClick={onStartFree}
            className="w-full min-h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold inline-flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            <span>Bắt đầu luyện nhanh</span>
          </button>
          {!canStart ? (
            <p className="text-center text-xs font-semibold text-amber-700 dark:text-amber-300">
              Hãy chọn ít nhất 1 dạng Mondai để bắt đầu.
            </p>
          ) : (
            <p className="text-center text-xs text-slate-600 dark:text-slate-300">
              {totalQuestionsInScope.toLocaleString()} câu hỏi sẵn sàng · không bấm giờ · không lưu lịch sử
            </p>
          )}
        </div>

        {/* Phạm vi bài nguồn: bấm cả khối để chỉnh sửa phạm vi */}
        <button
          type="button"
          onClick={onOpenScopeModal}
          className="w-full min-h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
        >
          <span className="shrink-0 size-9 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
            <SlidersHorizontal size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Phạm vi bài nguồn</span>
            <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
              {scopeSummary.headline} · {scopeSummary.detail}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        </button>
      </div>

      <div className="exam-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0 space-y-0.5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Zap size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
              Luyện nhanh · {level}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Trộn ngẫu nhiên đề, câu hỏi &amp; 4 đáp án — bấm chọn xem ngay lời giải.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            <InfinityIcon size={12} />
            <span>Không giới hạn</span>
          </span>
        </div>

        {/* Chọn nhanh Mondai 1-9 ngay ngoài màn hình chính */}
        <FreeMondaiSelector
          compact
          selectedMondais={selectedMondais}
          availableMondais={selectedExamIds.length > 0 ? availableMondais : undefined}
          onChange={onChangeMondais}
        />

        {footer && <div className="pt-3 border-t border-slate-100 dark:border-slate-800">{footer}</div>}
      </div>
    </section>
  );
}
