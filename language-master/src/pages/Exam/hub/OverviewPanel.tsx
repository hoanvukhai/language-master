import { ChevronRight, Clock, Play, RotateCcw } from "lucide-react";
import type { UnfinishedItem } from "../../../lib/jlpt/attemptSlots";

type Props = {
  level: string;
  canStartMock: boolean;
  /** Bài thi thử đang dở (trong tab hoặc bản nháp): chỉ có tối đa một */
  unfinishedMock: UnfinishedItem | null;
  /** Dòng phụ dưới nút Thi thử, ví dụ "Lần gần nhất: 41/54 · 38/60" */
  mockNote: string | null;
  historySub: string;
  historyWarn: boolean;
  onStartMock: () => void;
  onResumeMock: (item: UnfinishedItem) => void;
  onOpenHistory: () => void;
};

/**
 * Đầu trang Tổng quan: Thi thử chỉ là một nút ("Bắt đầu" hoặc "Làm tiếp" + "Đề mới"),
 * kèm nút Lịch sử (mở popup). Ôn tập nằm trong khối Năng lực.
 */
export default function OverviewPanel({
  level,
  canStartMock,
  unfinishedMock,
  mockNote,
  historySub,
  historyWarn,
  onStartMock,
  onResumeMock,
  onOpenHistory,
}: Props) {
  return (
    <section
      aria-label={`Thi thử ${level}`}
      className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start"
    >
      <div className="space-y-2">
        {unfinishedMock ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button
              type="button"
              onClick={() => onResumeMock(unfinishedMock)}
              className="min-h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold inline-flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/25 cursor-pointer"
            >
              <Play size={18} fill="currentColor" aria-hidden="true" />
              <span>{unfinishedMock.resumeLabel}</span>
            </button>
            <button
              type="button"
              disabled={!canStartMock}
              onClick={onStartMock}
              className="min-h-14 px-5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Đề mới</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!canStartMock}
            onClick={onStartMock}
            className="w-full min-h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold inline-flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} fill="currentColor" aria-hidden="true" />
            <span>Bắt đầu thi thử</span>
          </button>
        )}
        <p className="text-center text-xs text-slate-600 dark:text-slate-300">
          {unfinishedMock
            ? `Thi thử đang dở: ${unfinishedMock.status}`
            : canStartMock
              ? mockNote ?? "54 câu · 50 phút · đồng hồ chỉ chạy khi bạn ở trong phòng thi"
              : "Nguồn hiện tại chưa đủ câu để tạo bài 54 câu."}
        </p>
      </div>

        <button
          type="button"
          aria-haspopup="dialog"
          onClick={onOpenHistory}
          className={`w-full min-h-16 rounded-2xl border px-3 py-2 flex items-center gap-2.5 text-left cursor-pointer ${
            historyWarn
              ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          }`}
        >
          <span
            className={`shrink-0 size-9 rounded-xl flex items-center justify-center ${
              historyWarn
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
            }`}
          >
            <Clock size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 flex flex-col">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Lịch sử</span>
            <span
              className={`text-xs ${
                historyWarn
                  ? "font-semibold text-amber-800 dark:text-amber-300"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {historySub}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
        </button>
    </section>
  );
}
