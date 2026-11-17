import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  Play,
  Trash2,
} from "lucide-react";
import type { UnfinishedItem } from "../../../lib/jlpt/attemptSlots";
import {
  HISTORY_DEFAULT_VISIBLE,
} from "../../../lib/jlpt/historySummary";
import type { StoredAttemptSummary } from "../../../lib/jlpt/historyService";
import { displayAttemptTitle } from "../../../lib/jlpt/historySummary";

type TabFilter = "all" | "drafts" | "submitted";

type Props = {
  /** Bài đã lưu trên tài khoản */
  summaries: StoredAttemptSummary[];
  /** Bài đang làm dở: bài trong tab + bản nháp, đã bỏ trùng */
  unfinished?: UnfinishedItem[];
  /** Bài vừa nộp trong tab chưa có trong lịch sử tải về (đang lưu, lưu lỗi, hoặc khách chưa đăng nhập) */
  recent?: {
    record: StoredAttemptSummary;
    label: string;
    tone: "ok" | "info" | "warn";
  } | null;
  /** Khách: chỉ có bài trong tab này, không có lịch sử tài khoản */
  guest?: boolean;
  loading?: boolean;
  /** Không vẽ tiêu đề riêng (đã nằm trong khối có tiêu đề) */
  bare?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onResumeUnfinished?: (item: UnfinishedItem) => void;
  onDeleteUnfinished?: (item: UnfinishedItem) => void;
  onOpenRecent?: () => void;
  onRetrySaves?: () => void;
  /** Bỏ kết quả vừa nộp chưa lưu (xóa khỏi trang) */
  onDiscardRecent?: () => void;
  onReplayHistory?: (record: StoredAttemptSummary) => void;
  onDeleteHistory?: (attemptId: string) => void;
  onClearAll?: () => void;
};

function formatDateTimeVi(ms: number): string {
  if (!ms) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(ms);
  } catch {
    return "";
  }
}

const noop = () => undefined;

/** Danh sách lịch sử làm bài: chưa lưu, đang làm, đã nộp. */
export default function HistoryPanel({
  summaries,
  unfinished = [],
  recent = null,
  guest = false,
  loading = false,
  bare = false,
  error = null,
  onRetry,
  onResumeUnfinished = noop,
  onDeleteUnfinished = noop,
  onOpenRecent = noop,
  onRetrySaves = noop,
  onDiscardRecent = noop,
  onReplayHistory = noop,
  onDeleteHistory = noop,
  onClearAll = noop,
}: Props) {
  const [tab, setTab] = useState<TabFilter>("all");
  const [showAll, setShowAll] = useState(false);

  type DoneRow =
    | { kind: "saved"; ts: number; record: StoredAttemptSummary }
    | { kind: "recent"; ts: number; record: StoredAttemptSummary };

  const doneRows: DoneRow[] = [
    ...(recent ? [{ kind: "recent" as const, ts: Number.MAX_SAFE_INTEGER, record: recent.record }] : []),
    ...(guest
      ? []
      : summaries
          .filter((record) => record.id !== recent?.record.id)
          .map((record) => ({ kind: "saved" as const, ts: record.endedAt, record }))
          .sort((a, b) => b.ts - a.ts)),
  ];
  const totalItems = unfinished.length + doneRows.length;

  const showDrafts = tab === "all" || tab === "drafts";
  const showSubmitted = tab === "all" || tab === "submitted";
  const unfinishedRows = showDrafts ? unfinished : [];
  const submittedRows = showSubmitted ? doneRows : [];
  const hasMoreRows = submittedRows.length > HISTORY_DEFAULT_VISIBLE;
  const visibleDone = showAll
    ? submittedRows
    : submittedRows.slice(0, HISTORY_DEFAULT_VISIBLE);
  const nothing = unfinishedRows.length === 0 && submittedRows.length === 0;

  // Lịch sử chỉ có Thi thử
  const kindChip = (_r: StoredAttemptSummary) => "Thi thử";

  const iconBtn =
    "shrink-0 size-11 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer";
  const outlineBtn =
    "shrink-0 min-h-11 px-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 text-[13px] font-bold cursor-pointer";
  const kicker = "text-[11px] font-bold uppercase tracking-wide";

  return (
    <section
      aria-label="Lịch sử làm bài"
      className={bare ? "flex-1 min-h-0 flex flex-col gap-3" : "exam-card !p-4 sm:!p-5 space-y-4"}
    >
      {!bare && (
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History size={17} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Lịch sử làm bài</span>
        </h2>
      )}
      {guest && (
        <p className="shrink-0 text-xs text-slate-600 dark:text-slate-300">
          Bài trong tab này. Đăng nhập để lưu lịch sử lâu dài và làm tiếp trên thiết bị khác.
        </p>
      )}

      <div
        role="tablist"
        aria-label="Lọc lịch sử bài làm"
        className="shrink-0 grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800"
      >
        {(
          [
            { id: "all", label: `Tất cả (${totalItems})` },
            { id: "drafts", label: `Đang làm (${unfinished.length})` },
            { id: "submitted", label: `Đã nộp (${doneRows.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setShowAll(false);
            }}
            className={`min-h-10 rounded-lg text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              tab === t.id
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lịch sử tài khoản tải lỗi: báo ngay cả khi vẫn còn bài đang làm để hiện */}
      {error && (
        <div role="alert" className="shrink-0 px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex flex-wrap items-center justify-between gap-2">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* Danh sách cuộn riêng: khung popup giữ cố định, đổi tab hay ít bài không làm co giãn */}
      <div
        className={
          bare
            ? "flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-1 [scrollbar-gutter:stable]"
            : "space-y-4"
        }
      >
      {loading && nothing ? (
        <p className="py-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Đang tải lịch sử bài làm…
        </p>
      ) : nothing ? (
        error ? null : (
        <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {guest
            ? "Bài bạn làm trong tab này sẽ hiện ở đây."
            : "Chưa có bài làm nào trong mục này. Khi bạn làm bài, bài đang dở và bài đã nộp sẽ hiện ở đây."}
        </div>
        )
      ) : (
        <>
        {/* 1. Vừa nộp (kể cả chưa lưu được): nổi bật nhất */}
        {submittedRows
          .filter((row) => row.kind === "recent")
          .slice(0, 1)
          .map((row) => {
            const r = row.record;
            const warn = recent?.tone === "warn";
            return (
              <div
                key={`recent-${r.id}`}
                className={`rounded-2xl border p-3 space-y-2.5 ${
                  warn
                    ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <p
                    className={`${kicker} ${
                      warn ? "text-amber-800 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Vừa nộp · {warn ? "chưa lưu" : recent?.label}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {kindChip(r)} · {r.correct}/{r.total}
                    {r.estimate60 != null && ` (≈ ${r.estimate60}/60)`}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{displayAttemptTitle(r)}</p>
                  {warn && (
                    <p className="text-xs leading-snug text-amber-800 dark:text-amber-300">
                      {recent?.label}
                      {guest ? "" : ". Kết quả chỉ còn trong trang này."}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {warn && !guest && (
                    <button
                      type="button"
                      onClick={onRetrySaves}
                      className="flex-1 min-h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold cursor-pointer"
                    >
                      Lưu lại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenRecent}
                    className={`${outlineBtn} ${warn && !guest ? "" : "flex-1"}`}
                  >
                    <Eye size={15} aria-hidden="true" />
                    <span>Xem lại</span>
                  </button>
                  {warn || !(recent?.tone === "ok") ? (
                    <button
                      type="button"
                      aria-label={`Bỏ kết quả chưa lưu ${displayAttemptTitle(r)}`}
                      onClick={onDiscardRecent}
                      className="shrink-0 min-h-11 px-3.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 text-sm font-semibold cursor-pointer"
                    >
                      Bỏ
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Xóa lịch sử ${displayAttemptTitle(r)}`}
                      onClick={() => onDeleteHistory(r.id)}
                      className={iconBtn}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        {/* 2. Đang làm */}
        {unfinishedRows.map((u) => (
          <div
            key={`unfinished-${u.id}`}
            className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 p-3 space-y-2.5"
          >
            <div className="space-y-0.5 min-w-0">
              <p className={`${kicker} text-indigo-700 dark:text-indigo-300`}>
                Đang làm · {u.kindLabel}
                {u.live ? " · trong tab này" : ""}
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{u.title}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {u.status}
                {!u.live && formatDateTimeVi(u.ts) ? ` · ${formatDateTimeVi(u.ts)}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onResumeUnfinished(u)}
                className="flex-1 min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play size={14} fill="currentColor" aria-hidden="true" />
                <span>{u.resumeLabel}</span>
              </button>
              <button
                type="button"
                aria-label={`Xóa bài đang làm ${u.title}`}
                title="Xóa bài đang làm dở"
                onClick={() => onDeleteUnfinished(u)}
                className={iconBtn}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        {/* 3. Đã nộp */}
        {tab === "all" && visibleDone.some((row) => row.kind === "saved") && (
          <h3 className="pt-1 text-xs font-bold text-slate-600 dark:text-slate-300">Đã nộp</h3>
        )}
        {visibleDone
          .filter((row) => row.kind === "saved")
          .map((row) => {
            const r = row.record;
            const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
            const canReplay = Array.isArray(r.questionIds) && r.questionIds.length > 0;
            return (
              <div
                key={`saved-${r.id}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className={`${kicker} text-slate-600 dark:text-slate-300`}>
                    {kindChip(r)}
                    {r.durationSec != null ? ` · làm ${Math.max(1, Math.round(r.durationSec / 60))} phút` : ""}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    <span
                      className={
                        pct >= 75
                          ? "text-emerald-700 dark:text-emerald-300"
                          : pct >= 50
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-rose-700 dark:text-rose-300"
                      }
                    >
                      {r.correct}/{r.total} ({pct}%)
                    </span>
                    {r.estimate60 != null && (
                      <span className="text-slate-700 dark:text-slate-200"> · ≈ {r.estimate60}/60</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    <span>{displayAttemptTitle(r)}</span>
                    {formatDateTimeVi(r.endedAt) ? <span> · nộp {formatDateTimeVi(r.endedAt)}</span> : null}
                  </p>
                </div>
                {canReplay && (
                  <button type="button" onClick={() => onReplayHistory(r)} className={outlineBtn}>
                    <Eye size={15} aria-hidden="true" />
                    <span>Xem lại</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Xóa lịch sử ${displayAttemptTitle(r)}`}
                  onClick={() => onDeleteHistory(r.id)}
                  className={iconBtn}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            );
          })}

        {hasMoreRows && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
            >
              {showAll ? (
                <>
                  <ChevronUp size={15} />
                  <span>Thu gọn danh sách</span>
                </>
              ) : (
                <>
                  <ChevronDown size={15} />
                  <span>
                    Xem thêm (còn {submittedRows.length - HISTORY_DEFAULT_VISIBLE} bài)
                  </span>
                </>
              )}
            </button>
          </div>
        )}
        </>
      )}
      </div>

      {!guest && (
        <p className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
          Chỉ lưu bài Thi thử, giữ 20 bài gần nhất; bài cũ hơn tự xóa.
        </p>
      )}
      {!guest && (summaries.length > 0 || unfinished.length > 0) && (
        <div className={`flex justify-center ${bare ? "shrink-0" : "pt-2"}`}>
          <button
            type="button"
            onClick={onClearAll}
            className="min-h-9 px-3 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
          >
            Xóa tất cả lịch sử
          </button>
        </div>
      )}
    </section>
  );
}
