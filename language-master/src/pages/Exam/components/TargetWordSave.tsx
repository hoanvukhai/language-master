// src/pages/Exam/components/TargetWordSave.tsx
// Lưu từ trọng tâm của câu Mondai 1–6 vào sổ tay (mục 9.6). Lưu sau khi đã chốt không tính là trợ giúp.
import { useState } from "react";
import { BookmarkPlus, Check, Loader2, RefreshCw } from "lucide-react";
import { useOptionalAuth } from "../../../context/auth/useOptionalAuth";
import {
  saveTargetWord,
  type TargetWordSaveInput,
  type TargetWordSaveState,
} from "./saveTargetWord";

export function SaveStateButton({
  state,
  onSave,
  onOpenLookup,
  compact,
}: {
  state: TargetWordSaveState;
  onSave: () => void;
  onOpenLookup?: () => void;
  compact?: boolean;
}) {
  const base = `inline-flex items-center gap-1.5 rounded-xl border font-bold ${
    compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs"
  }`;
  if (state.status === "saving")
    return (
      <span className={`${base} border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300`} role="status">
        <Loader2 size={12} className="animate-spin" /> Đang lưu…
      </span>
    );
  if (state.status === "added")
    return (
      <span className={`${base} border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300`} role="status">
        <Check size={12} /> Đã lưu vào {state.courseTitle}
      </span>
    );
  if (state.status === "already_exists")
    return (
      <span className={`${base} border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300`} role="status">
        <Check size={12} /> Đã có trong sổ tay
      </span>
    );
  if (state.status === "conflict")
    return (
      <span className={`${base} border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200`} role="status">
        Sổ tay đã có nghĩa khác
        {onOpenLookup && (
          <button type="button" className="underline underline-offset-2" onClick={onOpenLookup}>
            Mở tra từ
          </button>
        )}
      </span>
    );
  if (state.status === "failed")
    return (
      <button
        type="button"
        onClick={onSave}
        className={`${base} border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
      >
        <RefreshCw size={12} /> Không lưu được · Thử lại
      </button>
    );
  return (
    <button
      type="button"
      onClick={onSave}
      className={`${base} border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400`}
    >
      <BookmarkPlus size={12} /> Lưu vào sổ tay
    </button>
  );
}

/** Dòng "Từ trọng tâm" kèm nút lưu, dùng trong lời giải. */
export default function TargetWordSave({
  input,
  onOpenLookup,
}: {
  input: TargetWordSaveInput;
  onOpenLookup?: (term: string) => void;
}) {
  const user = useOptionalAuth()?.user ?? null;
  const [state, setState] = useState<TargetWordSaveState>({ status: "idle" });
  const save = async () => {
    setState({ status: "saving" });
    setState(await saveTargetWord(input, user));
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70">
      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100">
        <span className="font-bold text-slate-600 dark:text-slate-300 mr-1">Từ trọng tâm:</span>
        <span lang="ja" className="font-bold">{input.word.term}</span>
        {input.word.reading && input.word.reading !== input.word.term && (
          <span lang="ja"> ({input.word.reading})</span>
        )}
        {input.word.hanViet && <span> · {input.word.hanViet}</span>}
        <span> · {input.word.meaningVi}</span>
      </p>
      <SaveStateButton
        state={state}
        onSave={() => void save()}
        onOpenLookup={onOpenLookup ? () => onOpenLookup(input.word.term) : undefined}
      />
    </div>
  );
}
