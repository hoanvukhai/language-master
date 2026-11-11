import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export type AttemptMenuItem = {
  key: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

/** Menu ⋯ trên thanh công cụ của lượt đang làm (JL-14). */
export default function AttemptMenu({ items }: { items: AttemptMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (!items.length) return null;
  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="exam-secondary !px-3"
        aria-label="Tùy chọn lượt làm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Tùy chọn lượt làm"
          className="absolute right-0 top-full mt-2 z-40 min-w-56 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl"
          onKeyDown={(e) => {
            const list = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
            const idx = list.indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              list[(idx + 1) % list.length]?.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              list[(idx - 1 + list.length) % list.length]?.focus();
            }
          }}
        >
          {items.map((item, i) => (
            <button
              key={item.key}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 ${
                item.danger
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-slate-700 dark:text-slate-200"
              }`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
