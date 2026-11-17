// src/pages/Exam/components/SentenceBreakdownPanel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Sparkles, Volume2 } from "lucide-react";
import type { JLPTSentencePart } from "../../../data/exams/jlpt/types";
import {
  analyzeSentenceComponents,
  cleanJapaneseWord,
} from "../../../lib/jlpt/sentenceAnalyzer";
import { speakWithVoiceEngine } from "../../../lib/audio/voiceEngine";
import {
  loadLexicon,
  useDictionaryLevel,
} from "../../../lib/dictionary/dictionaryLoader";

/** true khi phần tử đã ở gần khung nhìn (cách 600px) — chỉ phân tích câu khi cần. */
function useNearViewport<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

interface Props {
  stem: string;
  sentenceBreakdown?: JLPTSentencePart[];
  explanationVi?: string;
  onWordClick?: (word: string) => void;
  /** Hiện thẳng danh sách (không thu gọn), dùng cho câu hỏi lẻ trong lời giải */
  inline?: boolean;
}

export default function SentenceBreakdownPanel({
  stem,
  sentenceBreakdown,
  explanationVi,
  onWordClick,
  inline = false,
}: Props) {
  const [anchorRef, near] = useNearViewport<HTMLDivElement>();
  const level = useDictionaryLevel();
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!near || level !== "none") return;
    let cancelled = false;
    loadLexicon().catch(() => {
      if (!cancelled) setLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [near, level]);

  // Phân tích tự động kết hợp từ lời giải + kho từ điển (loại bỏ 100% ô rỗng).
  // Chỉ chạy khi panel gần khung nhìn và từ điển (lexicon) đã sẵn sàng.
  const ready = near && (level !== "none" || loadFailed);
  const parts = useMemo(() => {
    if (!ready) return [];
    return analyzeSentenceComponents(stem, sentenceBreakdown, explanationVi);
    // level: phân tích lại khi từ điển nâng cấp lên bản đầy đủ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, level, stem, sentenceBreakdown, explanationVi]);

  if (!near) return <div ref={anchorRef} aria-hidden="true" className="h-px" />;
  if (!ready)
    return (
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Đang phân tích từ vựng…
      </p>
    );
  if (parts.length === 0) return null;

  const handleSpeak = (text: string) => {
    const clean = text.replace(/\s*\([^)]*\)\s*/g, "").trim();
    speakWithVoiceEngine(clean, { lang: "ja-JP" });
  };

  const handleLookup = (text: string) => {
    const baseMatch = text.match(/\(([^)]+)\)/);
    const target = baseMatch ? baseMatch[1] : cleanJapaneseWord(text);
    if (target) onWordClick?.(target);
  };

  const grid = (
    <>
      {/* Grid danh sách các từ/thành phần (chỉ hiện các thẻ đã có nghĩa đầy đủ) */}
      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {parts.map((part, idx) => {
          const isGrammar = part.type === "grammar";
          const isAdverb = part.type === "adverb";
          return (
            <div
              key={`${part.text}-${idx}`}
              className={`px-3 py-2 rounded-xl border transition-all ${
                isGrammar
                  ? "bg-purple-50/50 dark:bg-purple-950/25 border-purple-200/60 dark:border-purple-900/40"
                  : isAdverb
                    ? "bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-900/40"
                    : "bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleLookup(part.text)}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors min-h-7 inline-flex items-center"
                      title="Bấm để mở từ điển đa sách"
                    >
                      {part.text}
                    </button>
                    {part.reading && part.reading !== part.text && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        {part.reading}
                      </span>
                    )}
                    {part.hanViet && (
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        · {part.hanViet}
                      </span>
                    )}
                    {isGrammar && (
                      <span className="text-xs font-semibold px-1.5 py-px rounded bg-purple-100/80 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        Ngữ pháp
                      </span>
                    )}
                  </div>
                  {part.meaning && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                      {part.meaning}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeak(part.reading || part.text)}
                  className="p-2 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition-colors shrink-0"
                  title="Phát âm từ này"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (inline) {
    return (
      <section className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2">
        <h4 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          <Sparkles size={13} className="shrink-0" />
          <span>Mở rộng · từ vựng &amp; ngữ pháp trong câu ({parts.length})</span>
        </h4>
        {grid}
      </section>
    );
  }

  return (
    <details className="group pt-3 border-t border-slate-200/70 dark:border-slate-800/80 text-left">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 select-none">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={13} className="shrink-0" />
          <span>Từ vựng &amp; ngữ pháp mở rộng ({parts.length})</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Bấm vào từ để tra · loa để nghe</span>
          <ChevronDown
            size={14}
            className="transition-transform group-open:rotate-180 shrink-0"
          />
        </span>
      </summary>

      {/* Grid danh sách các từ/thành phần (chỉ hiện các thẻ đã có nghĩa đầy đủ) */}
      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {parts.map((part, idx) => {
          const isGrammar = part.type === "grammar";
          const isAdverb = part.type === "adverb";
          return (
            <div
              key={`${part.text}-${idx}`}
              className={`px-3 py-2 rounded-xl border transition-all ${
                isGrammar
                  ? "bg-purple-50/50 dark:bg-purple-950/25 border-purple-200/60 dark:border-purple-900/40"
                  : isAdverb
                    ? "bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-900/40"
                    : "bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleLookup(part.text)}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors min-h-7 inline-flex items-center"
                      title="Bấm để mở từ điển đa sách"
                    >
                      {part.text}
                    </button>
                    {part.reading && part.reading !== part.text && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        {part.reading}
                      </span>
                    )}
                    {part.hanViet && (
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        · {part.hanViet}
                      </span>
                    )}
                    {isGrammar && (
                      <span className="text-xs font-semibold px-1.5 py-px rounded bg-purple-100/80 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        Ngữ pháp
                      </span>
                    )}
                  </div>
                  {part.meaning && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                      {part.meaning}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeak(part.reading || part.text)}
                  className="p-2 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 transition-colors shrink-0"
                  title="Phát âm từ này"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
