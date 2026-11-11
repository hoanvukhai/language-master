import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  Languages,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import type {
  JLPTQuestion,
  ExamPracticeMode,
} from "../../../data/exams/jlpt/types";
import SourceImage from "./SourceImage";
import ExamText from "./ExamText";
import SentenceBreakdownPanel from "./SentenceBreakdownPanel";
import { speakWithVoiceEngine } from "../../../lib/audio/voiceEngine";
import {
  buildCompletedSentence,
  buildUnfilledStemForTranslation,
  examPlainText,
  sentenceTranslationCache,
} from "../../../lib/jlpt/examText";

type Props = {
  question: JLPTQuestion;
  sequenceNumber?: number;
  totalQuestions?: number;
  userAnswer?: number;
  mode: ExamPracticeMode;
  showFeedback: boolean;
  locked?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  onSelectOption: (option: number) => void;
  onWordLookup?: (word: string) => void;
  onAssist?: (
    questionId: string,
    source: "translate" | "speak" | "lookup",
  ) => void;
  onNextQuestion?: () => void;
  contextRole?: "matched" | "context_only";
};

export default function ExamQuestionCard({
  question: q,
  sequenceNumber,
  totalQuestions,
  userAnswer,
  mode,
  showFeedback,
  locked,
  expanded,
  onExpand,
  isFlagged,
  onToggleFlag,
  onSelectOption,
  onWordLookup,
  onAssist,
  onNextQuestion,
  contextRole = "matched",
}: Props) {
  const [preAnswerTranslation, setPreAnswerTranslation] = useState<
    string | null
  >(null);
  const [postAnswerTranslation, setPostAnswerTranslation] = useState<
    string | null
  >(() => q.translationVi || null);
  const [translating, setTranslating] = useState(false);
  const [showInlineTranslation, setShowInlineTranslation] = useState(false);
  const isMountedRef = useRef(true);
  const onAssistRef = useRef(onAssist);
  onAssistRef.current = onAssist;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const feedback = Boolean(showFeedback && (mode !== "review" || expanded));
  const help = true;
  const textReady = q.transcriptionStatus === "verified" || !q.sourceImage;
  const isShortOptions = q.options.every((opt) => opt.length <= 22);
  const qOriginNum = q.origin?.number ?? q.number;
  const isMondai1KanjiReading = qOriginNum <= 5;
  const isMondai6Usage = qOriginNum >= 28 && qOriginNum <= 32;
  const canSpeak =
    textReady && (feedback || (mode !== "mock" && !isMondai1KanjiReading));

  // Câu đề gốc chưa điền đáp án (an toàn khi dịch trước lúc trả lời)
  const unfilledStem = useMemo(() => buildUnfilledStemForTranslation(q), [q]);
  // Câu hoàn chỉnh sau khi điền đáp án đúng (CHỈ dùng sau khi đã mở đáp án feedback === true)
  const completedSentence = useMemo(() => buildCompletedSentence(q), [q]);

  const displayedTranslation = feedback
    ? q.translationVi ||
      postAnswerTranslation ||
      (completedSentence
        ? sentenceTranslationCache.get(completedSentence) || null
        : null) ||
      preAnswerTranslation
    : preAnswerTranslation ||
      (unfilledStem ? sentenceTranslationCache.get(unfilledStem) || null : null);

  // Chỉ ghi nhận hỗ trợ dịch câu khi bản dịch thực sự đang hiển thị và câu chưa chốt đáp án (FIX-04)
  useEffect(() => {
    if (
      !locked &&
      !feedback &&
      mode !== "review" &&
      showInlineTranslation &&
      Boolean(displayedTranslation)
    ) {
      onAssistRef.current?.(q.id, "translate");
    }
  }, [
    locked,
    feedback,
    mode,
    showInlineTranslation,
    displayedTranslation,
    q.id,
  ]);

  const fetchSentenceTranslation = async (
    textToTranslate: string,
    isCompletedTarget: boolean,
  ) => {
    const clean = textToTranslate.replace(/\[★\s*|\]|\[/g, "").trim();
    if (!clean || clean.length < 2) return;
    if (sentenceTranslationCache.has(clean)) {
      const cached = sentenceTranslationCache.get(clean)!;
      if (!isMountedRef.current) return;
      if (isCompletedTarget) setPostAnswerTranslation(cached);
      else setPreAnswerTranslation(cached);
      return;
    }
    try {
      if (isMountedRef.current) setTranslating(true);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(clean)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.[0])) {
        const translated = data[0]
          .map((part: unknown[]) => (typeof part?.[0] === "string" ? part[0] : ""))
          .join("")
          .trim();
        if (translated) {
          sentenceTranslationCache.set(clean, translated);
          sentenceTranslationCache.set(textToTranslate, translated);
          if (!isMountedRef.current) return;
          if (isCompletedTarget) setPostAnswerTranslation(translated);
          else setPreAnswerTranslation(translated);
        }
      }
    } catch {
      // Bỏ qua nếu offline hoặc môi trường test không có mạng
    } finally {
      if (isMountedRef.current) setTranslating(false);
    }
  };

  const correctOptionText = examPlainText(q.options[q.answer - 1] || "");
  const userOptionText = userAnswer
    ? examPlainText(q.options[userAnswer - 1] || "")
    : "";

  return (
    <article
      className="exam-card scroll-mt-28 space-y-4 border border-slate-200/90 dark:border-slate-700/80"
      id={`q-${q.id}`}
    >
      {/* Question Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-2 flex-wrap">
          <strong className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black text-sm border border-indigo-200/60 dark:border-indigo-800/60">
            {sequenceNumber
              ? `Câu ${sequenceNumber}${totalQuestions ? ` / ${totalQuestions}` : ""}`
              : `Câu ${q.number}`}
          </strong>
          {q.origin && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs border border-slate-200/80 dark:border-slate-700">
              {`Ngày ${q.origin.day ?? q.origin.title} · Câu ${q.origin.number}`}
            </span>
          )}
          {contextRole === "context_only" && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200/80 dark:border-amber-800/60">
              Giữ ngữ cảnh đoạn văn
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onToggleFlag && (
            <button
              type="button"
              className={`exam-secondary !py-1.5 !px-3 !min-h-9 text-xs ${
                isFlagged
                  ? "!border-amber-400 !bg-amber-50 dark:!bg-amber-950/60 !text-amber-700 dark:!text-amber-300"
                  : ""
              }`}
              aria-pressed={isFlagged}
              onClick={onToggleFlag}
            >
              <Flag size={13} className={isFlagged ? "fill-current" : ""} />
              <span>{isFlagged ? "Chưa chắc" : "Đánh dấu"}</span>
            </button>
          )}
          {feedback && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                mode === "review"
                  ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                  : !userAnswer
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    : userAnswer === q.answer
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
              }`}
            >
              {mode === "review"
                ? "Đáp án tham khảo"
                : !userAnswer
                  ? "Bỏ trống"
                  : userAnswer === q.answer
                    ? "✓ Đúng"
                    : "✗ Sai"}
            </span>
          )}
        </div>
      </div>

      {/* Question Stem */}
      {!textReady && q.sourceImage ? (
        <div className="mb-4">
          <SourceImage
            src={q.sourceImage}
            alt={`Bản gốc câu ${q.number}, gồm đề và bốn phương án`}
          />
          <details className="mt-3 text-sm text-slate-500">
            <summary className="cursor-pointer font-semibold">
              Văn bản nhận dạng — đang đối chiếu
            </summary>
            <pre className="whitespace-pre-wrap font-sans mt-2">
              {q.ocrText || q.stem}
            </pre>
          </details>
        </div>
      ) : (
        <p
          lang="ja"
          data-exam-selectable
          className="select-text text-lg sm:text-xl leading-[1.9] font-medium text-slate-900 dark:text-slate-100 py-1"
        >
          <ExamText text={q.stem} />
        </p>
      )}

      {/* 4 Options Grid */}
      <div
        className={`grid gap-2.5 ${isShortOptions ? "sm:grid-cols-2" : "grid-cols-1"}`}
        role="group"
        aria-label={`Phương án câu ${q.number}`}
      >
        {q.options.map((o, i) => {
          const isCorrectOption = feedback && q.answer === i + 1;
          const isWrongOption =
            feedback && userAnswer === i + 1 && q.answer !== i + 1;
          const isSelectedOption = userAnswer === i + 1;

          return (
            <label
              key={i}
              className={`exam-option flex gap-3 items-start ${
                locked || mode === "review" ? "" : "cursor-pointer"
              } ${
                isCorrectOption
                  ? "exam-correct"
                  : isWrongOption
                    ? "exam-wrong"
                    : isSelectedOption
                      ? "exam-selected"
                      : ""
              }`}
              onClick={(event) => {
                if (
                  event.target instanceof HTMLElement &&
                  event.target.tagName !== "INPUT" &&
                  window.getSelection()?.isCollapsed === false
                )
                  event.preventDefault();
              }}
            >
              <input
                type="radio"
                className="mt-2 shrink-0 accent-indigo-600"
                name={`answer-${q.id}`}
                aria-label={`Phương án ${i + 1}, câu ${q.number}`}
                aria-describedby={`opt-text-${q.id}-${i}`}
                disabled={locked || mode === "review"}
                checked={userAnswer === i + 1}
                onChange={() => onSelectOption(i + 1)}
              />
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black shrink-0 mt-0.5 ${
                  isCorrectOption
                    ? "bg-emerald-600 text-white"
                    : isWrongOption
                      ? "bg-rose-600 text-white"
                      : isSelectedOption
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                {i + 1}.
              </span>
              <span
                id={`opt-text-${q.id}-${i}`}
                lang="ja"
                data-exam-selectable
                className="select-text flex-1 font-medium text-slate-900 dark:text-slate-100"
              >
                {!textReady ? `Chọn phương án ${i + 1}` : <ExamText text={o} />}
              </span>
              {isCorrectOption && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-black">
                  ✓
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Compact Study & Action Bar (No repetitive text inputs) */}
      {help && (
        <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {canSpeak && (
              <button
                type="button"
                className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
                onClick={() => {
                  const speechTarget =
                    feedback && completedSentence
                      ? completedSentence.replace(/\[★\s*|\]|\[/g, "")
                      : examPlainText(q.stem);
                  const started = speakWithVoiceEngine(speechTarget, {
                    lang: "ja-JP",
                  });
                  if (started && !locked && !feedback && mode !== "review") {
                    onAssistRef.current?.(q.id, "speak");
                  }
                }}
              >
                <Volume2 size={14} className="text-indigo-500" />
                <span>Nghe câu</span>
              </button>
            )}

            {textReady &&
              !/^\[\[\d+\]\]$/.test(q.stem.trim()) &&
              (feedback || !isMondai6Usage) && (
                <button
                  type="button"
                  disabled={translating}
                  className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
                  onClick={() => {
                    const target = feedback
                      ? completedSentence || unfilledStem
                      : unfilledStem;
                    if (!displayedTranslation) {
                      setShowInlineTranslation(true);
                      void fetchSentenceTranslation(target, feedback);
                    } else {
                      setShowInlineTranslation((v) => !v);
                    }
                  }}
                >
                  <Languages size={14} className="text-emerald-600" />
                  <span>
                    {translating
                      ? "Đang dịch…"
                      : displayedTranslation &&
                          showInlineTranslation &&
                          !expanded
                        ? "Ẩn bản dịch"
                        : "Dịch câu"}
                  </span>
                </button>
              )}

            {showFeedback && (
              <button
                type="button"
                className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
                aria-expanded={!!expanded}
                onClick={onExpand}
              >
                {expanded ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                <span>
                  {expanded ? "Thu gọn lời giải" : "Xem đáp án & lời giải"}
                </span>
              </button>
            )}
          </div>

          {/* Collapsible Source Scan Verification */}
          {textReady && q.sourceImage && (
            <details className="text-xs text-slate-500 dark:text-slate-400">
              <summary className="cursor-pointer font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1.5 py-1">
                <BookOpen size={13} />
                <span>Đối chiếu bản quét gốc</span>
              </summary>
              <div className="mt-2">
                <SourceImage
                  src={q.sourceImage}
                  alt={`Bản gốc câu ${q.number}, gồm đề và bốn phương án`}
                />
              </div>
            </details>
          )}
        </div>
      )}

      {/* Inline Translation when Explanation is collapsed */}
      {showInlineTranslation && displayedTranslation && !(showFeedback && expanded) && (
        <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200/70 dark:border-emerald-800/50 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 flex items-start gap-2">
          <Languages
            size={15}
            className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-1"
          />
          <div>
            <span className="font-bold text-emerald-800 dark:text-emerald-300 mr-1.5">
              Dịch câu:
            </span>
            <span>{displayedTranslation}</span>
          </div>
        </div>
      )}

      {/* Detailed Explanation Callout (3-Tier Pedagogical Review Layout) */}
      {showFeedback && expanded && (
        <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-slate-50/95 dark:bg-slate-900/65 border border-slate-200/90 dark:border-slate-700/80 space-y-3.5 text-sm leading-7">
          {/* Tier 1: Answer Verdict & User Choice Comparison */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-200/70 dark:border-slate-700/60">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-base text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                {userAnswer && userAnswer !== q.answer ? (
                  <XCircle size={18} className="text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                )}
                <span>Đáp án: {q.answer}</span>
              </p>
              {correctOptionText && (
                <span
                  lang="ja"
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 font-bold text-sm border border-emerald-200/70 dark:border-emerald-800/60"
                >
                  {correctOptionText}
                </span>
              )}
              {userAnswer && userAnswer !== q.answer && (
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-semibold text-xs border border-rose-200/70 dark:border-rose-800/60">
                  Bạn chọn: {userAnswer}. {userOptionText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!displayedTranslation &&
                completedSentence &&
                !/^\[\[\d+\]\]$/.test(q.stem.trim()) && (
                  <button
                    type="button"
                    disabled={translating}
                    onClick={() =>
                      void fetchSentenceTranslation(completedSentence, true)
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:border-emerald-400 transition-colors"
                  >
                    <Languages size={13} />
                    <span>
                      {translating ? "Đang dịch câu…" : "Dịch nghĩa cả câu"}
                    </span>
                  </button>
                )}

              {onNextQuestion && (
                <button
                  type="button"
                  onClick={onNextQuestion}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs transition-colors"
                >
                  <span>Câu tiếp</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Sentence Translation Box (Shown automatically when available) */}
          {displayedTranslation && (
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200/70 dark:border-emerald-800/50 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 flex items-start gap-2">
              <Languages
                size={15}
                className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-1"
              />
              <div>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 mr-1.5">
                  Dịch câu:
                </span>
                <span>{displayedTranslation}</span>
              </div>
            </div>
          )}

          {/* Tier 2: Core Explanation & Option Notes */}
          <div className="space-y-2">
            <p className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
              {q.explanation?.vi ||
                q.explanation?.summary ||
                "Chưa có lời giải."}
            </p>

            {q.explanation?.optionNotes?.map((n, i) => (
              <p
                key={i}
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 pl-3 border-l-2 border-indigo-300 dark:border-indigo-700"
              >
                {n}
              </p>
            ))}
          </div>

          {/* Star Question Order Assembly (Mondai 8) */}
          {q.order && (
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 text-xs sm:text-sm space-y-1">
              <p className="font-bold text-amber-800 dark:text-amber-200">
                Thứ tự ghép câu: {q.order.join(" → ")} (Ô ★ là đáp án {q.answer})
              </p>
              <p
                lang="ja"
                className="text-slate-900 dark:text-slate-100 font-semibold"
              >
                {completedSentence ||
                  q.order.map((i) => q.options[i - 1]).join(" ")}
              </p>
            </div>
          )}

          {/* Tier 3: Smart Vocabulary & Grammar Breakdown (Zero Empty Cards) */}
          {textReady && (
            <SentenceBreakdownPanel
              stem={q.stem}
              sentenceBreakdown={q.sentenceBreakdown}
              explanationVi={q.explanation?.vi}
              onWordClick={onWordLookup}
            />
          )}

          {/* Subtle Source & AI Reference Footer */}
          {q.explanationStatus === "authored" && (
            <p className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles size={11} className="shrink-0" />
              <span>
                Đáp án đối chiếu bảng cuối sách · Lời giải tham khảo do AI biên
                soạn, không phải lời giải của nhà xuất bản.
              </span>
            </p>
          )}
        </div>
      )}
    </article>
  );
}
