// Khối "Từ cần ôn" ở màn kết quả (mục 9.6): từ trọng tâm của câu Mondai 1–6 làm sai hoặc bỏ trống.
import { useMemo, useState } from "react";
import type { Attempt } from "../../../lib/jlpt/examCore";
import { reviewWordInputs } from "./reviewWordInputs";
import { useOptionalAuth } from "../../../context/auth/useOptionalAuth";
import { SaveStateButton } from "../components/TargetWordSave";
import {
  saveTargetWord,
  type TargetWordSaveInput,
  type TargetWordSaveState,
} from "../components/saveTargetWord";

export default function ReviewWords({
  attempt,
  onOpenLookup,
}: {
  attempt: Attempt;
  onOpenLookup?: (term: string) => void;
}) {
  const user = useOptionalAuth()?.user ?? null;
  const items = useMemo(() => reviewWordInputs(attempt), [attempt]);
  const [states, setStates] = useState<Record<string, TargetWordSaveState>>({});
  const [savingAll, setSavingAll] = useState(false);
  if (!items.length) return null;

  const saveOne = async (id: string, input: TargetWordSaveInput) => {
    setStates((prev) => ({ ...prev, [id]: { status: "saving" } }));
    const res = await saveTargetWord(input, user);
    setStates((prev) => ({ ...prev, [id]: res }));
  };
  const saveAll = async () => {
    setSavingAll(true);
    // Lưu lần lượt; multiBookLookup đã tuần tự hóa các lần ghi
    for (const it of items) {
      const st = states[it.id]?.status;
      if (st === "added" || st === "already_exists") continue;
      await saveOne(it.id, it.input);
    }
    setSavingAll(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Từ cần ôn ({items.length})
        </h3>
        <button
          type="button"
          className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
          disabled={savingAll}
          onClick={() => void saveAll()}
        >
          {savingAll ? "Đang lưu…" : "Lưu tất cả"}
        </button>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map(({ id, input }) => (
          <li
            key={id}
            className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60"
          >
            <span className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 min-w-0">
              <span lang="ja" className="font-bold">{input.word.term}</span>
              {input.word.reading && input.word.reading !== input.word.term && (
                <span lang="ja"> ({input.word.reading})</span>
              )}
              <span className="text-slate-600 dark:text-slate-300"> · {input.word.meaningVi}</span>
            </span>
            <SaveStateButton
              compact
              state={states[id] || { status: "idle" }}
              onSave={() => void saveOne(id, input)}
              onOpenLookup={onOpenLookup ? () => onOpenLookup(input.word.term) : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
