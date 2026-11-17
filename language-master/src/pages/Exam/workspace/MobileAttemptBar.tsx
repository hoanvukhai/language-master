import { LayoutGrid } from "lucide-react";

type Props = {
  canPrev: boolean;
  canNext: boolean;
  answered: number;
  total: number;
  sheetOpen: boolean;
  sheetId: string;
  emphasizeNext?: boolean;
  /** Đáp án đang chờ chốt (Luyện theo dạng); có giá trị thì thanh hiện nút Hoàn tác (R11). */
  pendingOption?: number | null;
  onUndoPending?: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPalette: () => void;
};

/** Thanh điều hướng cố định ở đáy màn hình, chỉ hiện dưới 1024 px (JL-02). */
export default function MobileAttemptBar({
  canPrev,
  canNext,
  answered,
  total,
  sheetOpen,
  sheetId,
  emphasizeNext,
  pendingOption = null,
  onUndoPending,
  onPrev,
  onNext,
  onPalette,
}: Props) {
  return (
    <nav
      aria-label="Điều hướng câu hỏi"
      data-testid="mobile-attempt-bar"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      {pendingOption != null && onUndoPending ? (
        // Bản sao cho ngón tay của dải trong thẻ câu hỏi (đã có role="status"): ẩn khỏi trình đọc màn hình
        <div
          aria-hidden="true"
          className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-3 py-2.5 min-h-[64px]"
        >
          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
            Đáp án {pendingOption} · đang chốt…
          </span>
          <button
            type="button"
            tabIndex={-1}
            className="exam-secondary !min-h-11 !px-4"
            onClick={onUndoPending}
          >
            Hoàn tác
          </button>
        </div>
      ) : (
      <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 px-3 py-2.5">
        <button
          type="button"
          className="exam-secondary !min-h-11"
          disabled={!canPrev}
          onClick={onPrev}
        >
          ← Trước
        </button>
        <button
          type="button"
          className="exam-secondary !min-h-11 !px-2 whitespace-nowrap"
          aria-expanded={sheetOpen}
          aria-controls={sheetId}
          onClick={onPalette}
        >
          <LayoutGrid size={15} />
          <span>
            Phiếu {answered}/{total}
          </span>
        </button>
        <button
          type="button"
          className={`${emphasizeNext ? "exam-primary" : "exam-secondary"} !min-h-11`}
          disabled={!canNext}
          onClick={onNext}
        >
          Tiếp →
        </button>
      </div>
      )}
    </nav>
  );
}
