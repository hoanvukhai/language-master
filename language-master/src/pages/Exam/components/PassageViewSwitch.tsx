import { BookOpen, Pencil } from "lucide-react";
import type { PassagePanelView } from "../workspace/usePassageViewSwitch";

type Props = {
  view: PassagePanelView;
  onChange: (next: PassagePanelView) => void;
  shortcutHint?: string;
};

/** Nút gạt dạng icon gọn để đổi giữa Đoạn văn và Câu hỏi (không popup). */
export default function PassageViewSwitch({
  view,
  onChange,
  shortcutHint,
}: Props) {
  const hint = shortcutHint ? ` (${shortcutHint})` : "";

  return (
    <div
      role="group"
      aria-label="Chuyển đổi đoạn văn và câu hỏi"
      className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0"
    >
      <button
        type="button"
        aria-label="Xem đoạn văn"
        aria-pressed={view === "passage"}
        title={`Đoạn văn${hint}`}
        onClick={() => onChange("passage")}
        className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-all cursor-pointer ${
          view === "passage"
            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <BookOpen size={15} />
      </button>
      <button
        type="button"
        aria-label="Xem câu hỏi"
        aria-pressed={view === "question"}
        title={`Câu hỏi${hint}`}
        onClick={() => onChange("question")}
        className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-all cursor-pointer ${
          view === "question"
            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <Pencil size={15} />
      </button>
    </div>
  );
}

