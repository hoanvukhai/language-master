// src/pages/Exam/components/SentenceBreakdownPanel.tsx
import { useMemo } from "react";
import { Sparkles, Volume2, Search } from "lucide-react";
import type { JLPTSentencePart } from "../../../data/exams/jlpt/types";
import {
  analyzeSentenceComponents,
  cleanJapaneseWord,
} from "../../../lib/jlpt/sentenceAnalyzer";
import { speakWithVoiceEngine } from "../../../lib/audio/voiceEngine";

interface Props {
  stem: string;
  sentenceBreakdown?: JLPTSentencePart[];
  explanationVi?: string;
  onWordClick?: (word: string) => void;
}

export default function SentenceBreakdownPanel({
  stem,
  sentenceBreakdown,
  explanationVi,
  onWordClick,
}: Props) {
  // Phân tích tự động kết hợp từ lời giải + kho từ điển (loại bỏ 100% ô rỗng)
  const parts = useMemo(() => {
    return analyzeSentenceComponents(stem, sentenceBreakdown, explanationVi);
  }, [stem, sentenceBreakdown, explanationVi]);

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

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100/90 dark:border-indigo-900/40 text-left space-y-2.5">
      {/* Title */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles size={13} />
          </div>
          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
            Từ vựng mở rộng trong câu ({parts.length})
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Search size={11} />
          <span>Bấm vào từ để tra sâu · Bấm loa để nghe</span>
        </span>
      </div>

      {/* Grid danh sách các từ/thành phần (chỉ hiện các thẻ đã có nghĩa đầy đủ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {parts.map((part, idx) => {
          const isGrammar = part.type === "grammar";
          const isAdverb = part.type === "adverb";
          return (
            <div
              key={`${part.text}-${idx}`}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                isGrammar
                  ? "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/70 dark:border-purple-900/40"
                  : isAdverb
                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900/40"
                    : "bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/70 shadow-2xs"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleLookup(part.text)}
                      className="font-black text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors"
                      title="Bấm để mở từ điển đa sách"
                    >
                      {part.text}
                    </button>
                    {part.reading && part.reading !== part.text && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                        [{part.reading}]
                      </span>
                    )}
                    {part.hanViet && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60">
                        {part.hanViet}
                      </span>
                    )}
                    {isGrammar && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
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
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                  title="Phát âm từ này"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
