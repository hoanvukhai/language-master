import { useEffect, useState } from "react";
import { Search } from "lucide-react";

type Selection = { text: string; top: number; left: number };
export default function SelectionLookup({
  enabled,
  onLookup,
}: {
  enabled: boolean;
  onLookup: (text: string) => void;
}) {
  const [selected, setSelected] = useState<Selection | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const read = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          setSelected(null);
          return;
        }
        const range = selection.getRangeAt(0);
        const element = (node: Node) =>
          node instanceof Element ? node : node.parentElement;
        const start = element(range.startContainer)?.closest(
          "[data-exam-selectable]",
        );
        const end = element(range.endContainer)?.closest(
          "[data-exam-selectable]",
        );
        if (!start || start !== end) {
          setSelected(null);
          return;
        }
        const fragment = range.cloneContents();
        fragment.querySelectorAll("rt, rp").forEach((node) => node.remove());
        const text = fragment.textContent?.trim() || "";
        if (
          !text ||
          text.length > 80 ||
          !/[\u3040-\u30ff\u3400-\u9fff]/.test(text)
        ) {
          setSelected(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        setSelected({
          text,
          top: Math.max(8, rect.top - 48),
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 180)),
        });
      }, 120);
    };
    const dismiss = () => {
      clearTimeout(timer);
      setSelected(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("selectionchange", read);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", read);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("keydown", key);
    };
  }, [enabled]);
  if (!enabled || !selected) return null;
  return (
    <button
      type="button"
      className="exam-primary fixed z-40 shadow-xl !py-2 !px-3.5 !min-h-9 text-xs rounded-full ring-2 ring-white dark:ring-slate-900"
      style={{ top: selected.top, left: selected.left }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        onLookup(selected.text);
        setSelected(null);
      }}
    >
      <Search size={14} />
      <span>Tra từ đã chọn</span>
    </button>
  );
}
