import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  id?: string;
};

/**
 * Bottom sheet cho màn hình nhỏ: nền mờ, khóa cuộn trang, Esc để đóng,
 * đưa focus vào sheet khi mở và trả focus về chỗ cũ khi đóng.
 */
export default function BottomSheet({ open, title, onClose, children, id }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 100000 }}
      data-no-selection-lookup="true"
    >
      <div
        className="absolute inset-0 bg-slate-950/50 animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        id={id}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] outline-none animate-in slide-in-from-bottom duration-200 text-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-base font-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
