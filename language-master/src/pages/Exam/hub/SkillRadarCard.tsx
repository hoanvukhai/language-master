import { AlertTriangle, BarChart3, Target } from "lucide-react";
import {
  HISTORY_MAX_ATTEMPTS,
  accuracyByMondai,
  computeSkillRadarAxes,
  computeTrendSeries,
  detectWeakMondais,
  filterAnalyticsAttempts,
  isMockAttempt,
} from "../../../lib/jlpt/historySummary";
import type { StoredAttemptSummary } from "../../../lib/jlpt/historyService";
import { MONDAI_NAMES } from "../../../lib/jlpt/attemptLabels";
import SkillTrendChart from "./SkillTrendChart";
import ReviewPanel, { type RetryKind } from "./ReviewPanel";

type Props = {
  summaries: StoredAttemptSummary[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Tổng số lần thi thử từ trước đến nay (không giảm khi xóa lịch sử); null = chưa có bộ đếm */
  mockTotal?: number | null;
  onPracticeWeak: (mondais: number[]) => void;
  /** Bắt đầu ôn tập các câu sai từ khối Ôn tập */
  onStartRetry: (kind: RetryKind, ids: string[], title?: string) => void;
};

/** Năng lực: hình (Radar + xu hướng) bên trái; số liệu, 9 Mondai, gợi ý củng cố và Ôn tập bên phải, thống nhất trong 20 bài gần nhất. */
export default function SkillRadarCard({
  summaries,
  loading = false,
  error = null,
  onRetry,
  mockTotal = null,
  onPracticeWeak,
  onStartRetry,
}: Props) {
  // Trang Tổng quan chỉ xử lý bài Thi thử (đề trộn có giờ); các loại khác tính ở trang riêng của chúng
  const windowed = filterAnalyticsAttempts(summaries.filter(isMockAttempt), HISTORY_MAX_ATTEMPTS);
  const axes = computeSkillRadarAxes(windowed);
  const trendPoints = computeTrendSeries(windowed);
  const rawStats = accuracyByMondai(windowed);
  const statMap = new Map(rawStats.map((s) => [s.mondai, s]));
  const allMondais = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (m) => statMap.get(m) ?? { mondai: m, correct: 0, total: 0, percent: -1 },
  );
  const weakMondais = detectWeakMondais(rawStats, 2);

  // Trung bình theo từng bài (mỗi bài một phiếu như nhau); điểm thi chỉ tính bài đủ điều kiện quy đổi
  const pcts = windowed.filter((r) => r.total > 0).map((r) => (r.correct / r.total) * 100);
  const avgPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const estimates = windowed.map((r) => r.estimate60).filter((v): v is number => typeof v === "number");
  const avgEstimate = estimates.length
    ? Math.round(estimates.reduce((a, b) => a + b, 0) / estimates.length)
    : null;

  // Tọa độ đa giác 5 đỉnh cho SVG Radar
  const cx = 160;
  const cy = 128;
  const radius = 78;
  const angleFor = (idx: number) => (idx * 2 * Math.PI) / axes.length - Math.PI / 2;
  const pointAt = (idx: number, r: number) => {
    const angle = angleFor(idx);
    return {
      x: Number((cx + r * Math.cos(angle)).toFixed(1)),
      y: Number((cy + r * Math.sin(angle)).toFixed(1)),
    };
  };

  const rings = [20, 40, 60, 80, 100].map((pct) =>
    axes
      .map((_, i) => {
        const p = pointAt(i, (pct / 100) * radius);
        return `${p.x},${p.y}`;
      })
      .join(" "),
  );

  const dataCoords = axes.map((a, i) => {
    const r = a.percent === null ? 0 : Math.max(6, (a.percent / 100) * radius);
    return pointAt(i, r);
  });
  const hasAnyRadarData = axes.some((a) => a.percent !== null);
  const dataPolygon = dataCoords.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <section
      aria-label="Phân tích năng lực JLPT"
      className="exam-card !p-4 sm:!p-5 space-y-4 overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <BarChart3 size={17} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Năng lực theo dạng (Mondai 1–9)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tính trên tối đa {HISTORY_MAX_ATTEMPTS} bài thi thử gần nhất.
          </p>
        </div>

      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
          {onRetry && (
            <button type="button" onClick={onRetry} className="ml-2 inline-flex min-h-9 items-center px-2 underline underline-offset-2 cursor-pointer">
              Thử lại
            </button>
          )}
        </p>
      )}

      {loading && summaries.length === 0 ? (
        <div className="py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Đang tải thống kê năng lực…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Cột trái (hình): Biểu đồ mạng nhện 5 trục + Biểu đồ xu hướng */}
          <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col items-center space-y-3">
            <div className="w-full max-w-[310px] mx-auto">
              <svg
                viewBox="0 0 320 262"
                role="img"
                aria-label="Biểu đồ năng lực 5 nhóm kỹ năng JLPT"
                className="w-full h-auto overflow-visible"
              >
                {rings.map((pts, idx) => (
                  <polygon
                    key={idx}
                    points={pts}
                    fill="none"
                    className="stroke-slate-200 dark:stroke-slate-700/80"
                    strokeWidth={idx === rings.length - 1 ? 1.25 : 0.85}
                    strokeDasharray={idx < rings.length - 1 ? "2 2" : undefined}
                  />
                ))}
                {axes.map((_, i) => {
                  const outer = pointAt(i, radius);
                  return (
                    <line
                      key={i}
                      x1={cx}
                      y1={cy}
                      x2={outer.x}
                      y2={outer.y}
                      className="stroke-slate-200 dark:stroke-slate-700/80"
                      strokeWidth={1}
                    />
                  );
                })}
                {hasAnyRadarData && (
                  <>
                    <polygon
                      points={dataPolygon}
                      className="fill-indigo-500/20 dark:fill-indigo-400/25 stroke-indigo-600 dark:stroke-indigo-400"
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                    {axes.map((a, i) =>
                      a.percent !== null ? (
                        <circle
                          key={a.id}
                          cx={dataCoords[i].x}
                          cy={dataCoords[i].y}
                          r={3.5}
                          className="fill-indigo-600 dark:fill-indigo-300 stroke-white dark:stroke-slate-900"
                          strokeWidth={1.5}
                        />
                      ) : null,
                    )}
                  </>
                )}
                {axes.map((a, i) => {
                  const lp = pointAt(i, radius + 22);
                  const anchor =
                    i === 0 ? "middle" : lp.x > cx + 8 ? "start" : lp.x < cx - 8 ? "end" : "middle";
                  const dy = i === 0 ? -4 : lp.y > cy + 35 ? 10 : 0;
                  return (
                    <g key={a.id}>
                      <text
                        x={lp.x}
                        y={lp.y + dy}
                        textAnchor={anchor}
                        className="fill-slate-700 dark:fill-slate-200 text-xs font-semibold"
                      >
                        {a.shortLabel.split(" (")[0]}
                      </text>
                      <text
                        x={lp.x}
                        y={lp.y + dy + 13}
                        textAnchor={anchor}
                        className={`text-xs font-bold ${
                          a.percent === null
                            ? "fill-slate-400 dark:fill-slate-500"
                            : a.percent >= 75
                              ? "fill-emerald-600 dark:fill-emerald-400"
                              : a.percent >= 50
                                ? "fill-amber-600 dark:fill-amber-400"
                                : "fill-rose-600 dark:fill-rose-400"
                        }`}
                      >
                        {a.percent !== null ? `${a.percent}%` : "—"}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="w-full">
              <SkillTrendChart points={trendPoints} />
            </div>
          </div>

          {/* Cột phải (thông tin): KPI nhanh + Chi tiết 9 Mondai + Gợi ý luyện dạng yếu + Ôn tập */}
          <div className="order-1 lg:order-2 lg:col-span-7 flex flex-col gap-3.5 min-w-0">
            <div className="order-1 grid grid-cols-3 gap-2 w-full">
              <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                  {mockTotal ?? windowed.filter(isMockAttempt).length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Lần thi thử</p>
              </div>
              <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {avgPct !== null ? `${avgPct}%` : "—"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Chính xác TB</p>
              </div>
              <div className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {avgEstimate !== null ? `${avgEstimate}/60` : "—"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Điểm thi TB</p>
              </div>
            </div>

            {windowed.length === 0 && error ? (
              <div className="order-2 p-3.5 sm:p-4 rounded-xl border border-dashed border-rose-200 dark:border-rose-900 space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Chưa tải được dữ liệu năng lực
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Dữ liệu của bạn vẫn còn, chỉ là chưa tải về được. Bấm Thử lại ở dòng cảnh báo phía trên.
                </p>
              </div>
            ) : windowed.length === 0 ? (
              <div className="order-2 p-3.5 sm:p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Chưa có dữ liệu chi tiết từng Mondai
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Hoàn thành một đề thi thử 54 câu để cả 2 biểu đồ tự động cập nhật điểm mạnh / yếu từng Mondai (luyện tập tự do không ghi vào thống kê này).
                </p>
              </div>
            ) : (
              <>
                <div className="order-4 lg:order-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {allMondais.map((item) => {
                    const hasData = item.total > 0;
                    const barColor = !hasData
                      ? "bg-slate-200 dark:bg-slate-700"
                      : item.percent >= 75
                        ? "bg-emerald-500"
                        : item.percent >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500";
                    return (
                      <div key={item.mondai} className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                            M{item.mondai} · {MONDAI_NAMES[item.mondai]}
                          </span>
                          <span className="font-bold tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                            {hasData ? `${item.percent}%` : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: hasData ? `${item.percent}%` : "0%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {weakMondais.length > 0 ? (
                  <button
                    type="button"
                    aria-label={`Luyện ngay ${weakMondais.map((w) => `M${w.mondai}`).join(", ")}`}
                    onClick={() => onPracticeWeak(weakMondais.map((w) => w.mondai))}
                    className="order-2 lg:order-3 w-full text-left p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/25 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <span className="flex items-start gap-2.5 min-w-0">
                      <AlertTriangle
                        size={16}
                        className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span className="text-xs space-y-0.5 min-w-0 block">
                        <span className="block font-bold text-slate-900 dark:text-white">
                          Cần củng cố:{" "}
                          {weakMondais.map((w) => `M${w.mondai} · ${w.percent}%`).join(" · ")}
                        </span>
                        <span className="block text-slate-600 dark:text-slate-300">
                          Luyện đúng các Mondai đang yếu.
                        </span>
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-1.5 min-h-9 px-3.5 rounded-xl bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-xs"
                    >
                      <Target size={14} />
                      <span>
                        Luyện ngay {weakMondais.map((w) => `M${w.mondai}`).join(", ")}
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="order-2 lg:order-3 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                    Các Mondai đã làm đều đang giữ mức khá tốt (≥ 75%). Tiếp tục duy trì bằng đề trộn 54 câu nhé!
                  </div>
                )}
                <div className="order-3 lg:order-4">
                  <ReviewPanel summaries={windowed} onStartRetry={onStartRetry} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

