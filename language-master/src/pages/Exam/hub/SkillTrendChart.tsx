import { useId } from "react";
import { TrendingUp } from "lucide-react";
import type { TrendPoint } from "../../../lib/jlpt/historySummary";

type Props = {
  points: TrendPoint[];
};

/** Biểu đồ đường xu hướng % đúng (và mốc /60 với Thi thử) qua các lượt làm gần nhất. */
function formatDay(ms: number): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(ms);
  } catch {
    return "";
  }
}

function formatTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(ms);
  } catch {
    return "";
  }
}

/** Nhãn trục: "lần 12 · 17/11" khi có số thứ tự cố định, còn lại chỉ ngày. */
function tickLabel(c: { seq?: number; endedAt: number }): string {
  return typeof c.seq === "number" ? `L${c.seq} · ${formatDay(c.endedAt)}` : formatDay(c.endedAt);
}

export default function SkillTrendChart({ points }: Props) {
  const gradientId = useId();

  const width = 340;
  const height = 112;
  const padL = 36;
  const padR = 14;
  const padT = 14;
  const padB = 8;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xAt = (idx: number) =>
    points.length <= 1
      ? padL + plotW / 2
      : Number((padL + (idx / (points.length - 1)) * plotW).toFixed(1));
  const yAt = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return Number((padT + (1 - clamped / 100) * plotH).toFixed(1));
  };

  const coords = points.map((p, idx) => ({
    ...p,
    x: xAt(idx),
    y: yAt(p.percent),
  }));

  const latest = points[points.length - 1] ?? null;
  const first = points[0] ?? null;
  const delta =
    points.length >= 2 && first && latest ? latest.percent - first.percent : null;

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const baselineY = yAt(0);
  const areaPolygon =
    coords.length >= 2
      ? `${coords[0].x},${baselineY} ${linePoints} ${coords[coords.length - 1].x},${baselineY}`
      : "";

  const xTickIndices =
    coords.length <= 6
      ? coords.map((_, i) => i)
      : [0, Math.floor((coords.length - 1) / 2), coords.length - 1];

  return (
    <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp
            size={15}
            className="text-indigo-600 dark:text-indigo-400 shrink-0"
          />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Biểu đồ xu hướng tiến bộ
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold tabular-nums">
          {delta !== null && (
            <span
              className={`px-2 py-0.5 rounded-md ${
                delta > 0
                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                  : delta < 0
                    ? "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300"
                    : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            >
              {delta > 0 ? `+${delta}` : `${delta}`} điểm % so với lượt đầu
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            {latest
              ? `Mới nhất: ${latest.percent}%${
                  latest.estimate60 !== null ? ` (~${latest.estimate60}/60)` : ""
                }`
              : "Chưa có lượt nào"}
          </span>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Chưa có bài thi thử nào. Làm xong một đề để vẽ đường xu hướng.
        </p>
      ) : (
      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Biểu đồ xu hướng độ chính xác JLPT"
          className="w-full h-auto max-h-[150px] overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 60, 100].map((tick) => {
            const y = yAt(tick);
            const isTarget = tick === 60;
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  className={
                    isTarget
                      ? "stroke-indigo-300 dark:stroke-indigo-700"
                      : "stroke-slate-200 dark:stroke-slate-700/80"
                  }
                  strokeWidth={1}
                  strokeDasharray={isTarget ? "4 3" : undefined}
                />
                <text
                  x={padL - 5}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[11px] font-medium tabular-nums"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {areaPolygon && (
            <polygon points={areaPolygon} fill={`url(#${gradientId})`} />
          )}

          {coords.length >= 2 && (
            <polyline
              fill="none"
              points={linePoints}
              className="stroke-indigo-600 dark:stroke-indigo-400"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {coords.map((c, idx) => {
            const isLatest = idx === coords.length - 1;
            const tooltip = `${c.title} · ${formatDay(c.endedAt)} ${formatTime(c.endedAt)}: ${c.percent}%${
              c.estimate60 !== null ? ` · ~${c.estimate60}/60` : ""
            }`;
            return (
              <g key={c.id}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isLatest ? 4.5 : 4}
                  className="fill-indigo-600 dark:fill-indigo-400 stroke-white dark:stroke-slate-900"
                  strokeWidth={1.5}
                >
                  <title>{tooltip}</title>
                </circle>
              </g>
            );
          })}

        </svg>
        {coords.length > 0 && (
          <div
            className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums"
            style={{ paddingLeft: `${(padL / width) * 100}%`, paddingRight: `${(padR / width) * 100}%` }}
          >
            {xTickIndices.map((idx) => (
              <span key={`x-${coords[idx].id}`}>{tickLabel(coords[idx])}</span>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <span>
          {points.length === 0
            ? null
            : points.length === 1
              ? "Hoàn thành thêm 1 bài nữa để nối đường xu hướng."
              : `${points.length} lượt gần nhất · đường nét đứt là mốc 60%.`}
        </span>
      </div>
    </div>
  );
}
