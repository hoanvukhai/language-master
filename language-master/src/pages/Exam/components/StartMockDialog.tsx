// src/pages/Exam/components/StartMockDialog.tsx
// Hộp xác nhận chung cho mọi lối bắt đầu bài có giờ (mục 8.2, JL-22), có ô "Thi nghiêm túc" (JL-05).
import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

export type StartMockRequest = {
  questionCount: number;
  minutes: number;
  replacing: boolean;
};

export default function StartMockDialog({
  request,
  onAnswer,
}: {
  request: StartMockRequest;
  onAnswer: (result: { strict: boolean } | null) => void;
}) {
  const [strict, setStrict] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const startBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    startBtn.current?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => onAnswer(null)}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-mock-title"
        aria-describedby="start-mock-desc"
        className="exam-card w-full max-w-md space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onAnswer(null);
          }
          if (e.key === "Tab") {
            const items = box.current?.querySelectorAll<HTMLElement>("input, button");
            if (!items?.length) return;
            const first = items[0];
            const last = items[items.length - 1];
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
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Timer size={22} />
          </div>
          <h2 id="start-mock-title" className="text-xl font-black">
            Bắt đầu bài có giờ
          </h2>
        </div>
        <div id="start-mock-desc" className="space-y-2 leading-7 text-slate-700 dark:text-slate-300">
          <p>
            {request.questionCount} câu · {request.minutes} phút. Đồng hồ chạy liên tục, kể cả
            khi bạn rời trang.
          </p>
          {request.replacing && (
            <p className="text-amber-800 dark:text-amber-300 font-semibold">
              Bài đang làm hoặc kết quả hiện tại trong tab sẽ bị thay.
            </p>
          )}
        </div>
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 accent-indigo-600"
            checked={strict}
            onChange={(e) => setStrict(e.target.checked)}
          />
          <span className="text-sm font-semibold">Thi nghiêm túc (tắt tra từ, dịch, nghe)</span>
        </label>
        <div className="flex gap-3 justify-end pt-1">
          <button type="button" className="exam-secondary" onClick={() => onAnswer(null)}>
            Hủy
          </button>
          <button
            ref={startBtn}
            type="button"
            className="exam-primary"
            onClick={() => onAnswer({ strict })}
          >
            Bắt đầu
          </button>
        </div>
      </div>
    </div>
  );
}

