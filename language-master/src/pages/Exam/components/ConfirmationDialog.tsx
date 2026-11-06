import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

export default function Confirmation({
  message,
  onAnswer,
}: {
  message: string;
  onAnswer: (answer: boolean) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => onAnswer(false)}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-confirm-title"
        aria-describedby="exam-confirm-message"
        className="exam-card w-full max-w-md space-y-5 shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onAnswer(false);
          if (e.key === "Tab") {
            const buttons = box.current?.querySelectorAll("button");
            if (!buttons) return;
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <h2 id="exam-confirm-title" className="text-xl font-black">
            Xác nhận thao tác
          </h2>
        </div>
        <p
          id="exam-confirm-message"
          className="leading-7 text-slate-600 dark:text-slate-300"
        >
          {message}
        </p>
        <div className="flex gap-3 justify-end pt-1">
          <button className="exam-secondary" onClick={() => onAnswer(false)}>
            Quay lại
          </button>
          <button className="exam-primary" onClick={() => onAnswer(true)}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
