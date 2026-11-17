import { Check } from "lucide-react";
import { MONDAI_NAMES } from "../../../lib/jlpt/attemptLabels";
import {
  FREE_MONDAI_QUICK_GROUPS,
  FREE_PRACTICE_ALL_MONDAIS,
} from "../../../lib/jlpt/freePractice";

type Props = {
  selectedMondais: number[];
  availableMondais?: ReadonlySet<number>;
  onChange: (nextMondais: number[]) => void;
  compact?: boolean;
};

/** Lưới chọn nhanh Mondai 1–9 dùng chung giữa thẻ Luyện tự do ngoài Hub và hộp thoại trong phòng luyện. */
export default function FreeMondaiSelector({
  selectedMondais,
  availableMondais,
  onChange,
  compact = false,
}: Props) {
  const toggleMondai = (m: number) => {
    const next = selectedMondais.includes(m)
      ? selectedMondais.filter((item) => item !== m)
      : [...selectedMondais, m].sort((a, b) => a - b);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Dạng bài ({selectedMondais.length}/9 Mondai)
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {FREE_MONDAI_QUICK_GROUPS.map((g) => {
            const isExact =
              selectedMondais.length === g.mondais.length &&
              g.mondais.every((m) => selectedMondais.includes(m));
            return (
              <button
                key={g.label}
                type="button"
                aria-pressed={isExact}
                onClick={() => onChange([...g.mondais])}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  isExact
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {g.label}
              </button>
            );
          })}
          {selectedMondais.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 transition-colors cursor-pointer"
            >
              Bỏ hết
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {FREE_PRACTICE_ALL_MONDAIS.map((m) => {
          const checked = selectedMondais.includes(m);
          const existsInScope = !availableMondais || availableMondais.has(m);
          return (
            <label
              key={m}
              className={`flex items-center gap-2 rounded-xl border transition-colors ${
                compact ? "px-3.5 py-3.5 text-sm" : "px-3.5 py-3 text-sm"
              } ${
                !existsInScope
                  ? "opacity-45 bg-slate-50 dark:bg-slate-900 border-transparent cursor-not-allowed"
                  : checked
                    ? "bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-900 dark:text-slate-100 cursor-pointer"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!existsInScope}
                onChange={() => toggleMondai(m)}
                className="sr-only"
                aria-label={`Mondai ${m} ${MONDAI_NAMES[m] || ""}`}
              />
              <span
                aria-hidden="true"
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                  checked
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600"
                }`}
              >
                {checked && <Check size={13} />}
              </span>
              <span className="truncate font-semibold">
                <strong className="font-bold">M{m}</strong>: {MONDAI_NAMES[m]}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

