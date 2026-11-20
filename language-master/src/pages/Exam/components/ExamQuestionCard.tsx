import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Languages,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import type {
  JLPTExam,
  JLPTPassage,
  JLPTQuestion,
  ExamPracticeMode,
} from "../../../data/exams/jlpt/types";
import BottomSheet from "../workspace/BottomSheet";
import SourceImage from "./SourceImage";
import ExamText from "./ExamText";
import { speakWithVoiceEngine } from "../../../lib/audio/voiceEngine";
import {
  buildCompletedSentence,
  examPlainText,
  extractBlankSentence,
} from "../../../lib/jlpt/examText";
import { DRILL_COMMIT_DELAY_MS } from "../../../lib/jlpt/examCore";

/** Điện thoại (dưới 640px): dùng cho lời giải dạng bottom sheet */
function useIsPhone(): boolean {
  const query = "(max-width: 639px)";
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setIsPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return isPhone;
}

const readingCache = new Map<string, string>();
let readingsPromise: Promise<Record<string, string>> | null = null;
/** Cách đọc hiragana của câu hoàn chỉnh (bảng tạo sẵn bằng scripts/jlpt/build-readings.mjs) */
function useSentenceReading(id?: string): string {
  const [, force] = useState(0);
  useEffect(() => {
    if (!id || readingCache.has(id)) return;
    let alive = true;
    readingsPromise ??= import("../../../data/exams/jlpt/readings.json").then(
      (m) => m.default as Record<string, string>,
    );
    readingsPromise
      .then((all) => {
        readingCache.set(id, all[id] ?? "");
        if (alive) force((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return (id && readingCache.get(id)) || "";
}

/** Trường dịch dùng TRƯỚC khi trả lời theo dạng Mondai (mục 12.1). null = không có nút. */
const PRE_ANSWER_TRANSLATION: Record<string, "translationVi" | "stemTranslationVi" | null> = {
  kanji_reading: "translationVi",
  kanji_writing: "translationVi",
  word_formation: "stemTranslationVi",
  context: "stemTranslationVi",
  synonym: "translationVi",
  usage: null,
  grammar_form: "stemTranslationVi",
  sentence_order: null,
  text_grammar: "stemTranslationVi",
};
/** Dạng không cho nghe trước khi trả lời (lộ cách đọc hoặc thứ tự) — mục 12.2 */
/** Dạng có từ trọng tâm (Mondai 1–6) */
const TARGET_WORD_TYPES = new Set([
  "kanji_reading",
  "kanji_writing",
  "word_formation",
  "context",
  "synonym",
  "usage",
]);

// Phần phân tích từ vựng nặng: tách gói, chỉ tải khi lời giải được mở (JL-04, 9.4)
const SentenceBreakdownPanel = lazy(() => import("./SentenceBreakdownPanel"));

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
  /** Cho phép mở xem đáp án & lời giải ngay mà không cần chọn phương án (chế độ tự do) */
  onRevealAnswer?: () => void;
  /** Ẩn nút "Dịch câu" trước khi trả lời (phòng Luyện nhanh) */
  hideTranslateButton?: boolean;
  /** Điện thoại: lời giải mở bằng bảng trượt; máy tính: dropdown trong thẻ */
  explanationSheetOnPhone?: boolean;
  /** Điều khiển mở/đóng bảng lời giải từ ngoài (phím tắt) */
  explanationOpen?: boolean;
  onExplanationOpenChange?: (open: boolean) => void;
  onSelectOption: (option: number) => void;
  onWordLookup?: (word: string) => void;
  onAssist?: (
    questionId: string,
    source: "translate" | "speak" | "lookup",
  ) => void;
  onNextQuestion?: () => void;
  contextRole?: "matched" | "context_only";
  /** JLPTMondai.type của đơn vị (JL-30) */
  mondaiType?: string;
  enrichmentStatus?: JLPTExam["enrichmentStatus"];
  /** Thi nghiêm túc đang làm: ẩn Nghe câu, Dịch câu (JL-05) */
  strict?: boolean;
  /** Lựa chọn đang chờ chốt trong lượt luyện (mục 7.1) */
  pendingOption?: number | null;
  onUndoPending?: () => void;
  /** Mondai 9: đoạn văn chứa ô trống của câu */
  passage?: JLPTPassage;
  onShowInPassage?: () => void;
  onOpenPassage?: () => void;
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
  onRevealAnswer,
  hideTranslateButton,
  explanationSheetOnPhone,
  explanationOpen,
  onExplanationOpenChange,
  onSelectOption,
  onWordLookup,
  onAssist,
  onNextQuestion,
  contextRole = "matched",
  mondaiType,
  enrichmentStatus,
  strict = false,
  pendingOption = null,
  onUndoPending,
  passage,
  onShowInPassage,
  onOpenPassage,
}: Props) {
  const [showInlineTranslation, setShowInlineTranslation] = useState(false);
  const isPhone = useIsPhone();
  const sheetMode = Boolean(explanationSheetOnPhone && isPhone);
  const [sheetOpenLocal, setSheetOpenLocal] = useState(false);
  const sheetOpen = explanationOpen ?? sheetOpenLocal;
  const setSheetOpen = (v: boolean) => {
    setSheetOpenLocal(v);
    onExplanationOpenChange?.(v);
  };
  const reading = useSentenceReading(mondaiType === "text_grammar" ? undefined : q.id);
  const onAssistRef = useRef(onAssist);
  useEffect(() => {
    onAssistRef.current = onAssist;
  }, [onAssist]);

  const feedback = Boolean(showFeedback && (mode !== "review" || expanded));
  /** Đã trả lời hoặc đang xem đề: dùng bản dịch câu hoàn chỉnh */
  const answeredView = feedback || mode === "review";
  const textReady = q.transcriptionStatus === "verified" || !q.sourceImage;
  const isShortOptions = q.options.every((opt) => opt.length <= 22);
  const helpBlocked = strict && !feedback;

  // Mondai 9: câu chứa ô trống tách từ đoạn văn (JL-13)
  const blankId = q.blankIds?.[0] || q.blankLabel;
  const blankIdsKey = (q.blankIds?.length ? q.blankIds : blankId ? [blankId] : []).join(",");
  const blankSentence = useMemo(
    () =>
      mondaiType === "text_grammar" && passage && blankIdsKey
        ? extractBlankSentence(passage.text, blankIdsKey.split(","))
        : null,
    [mondaiType, passage, blankIdsKey],
  );
  // Câu hoàn chỉnh sau khi điền đáp án đúng (CHỈ dùng khi answeredView)
  const completedSentence = useMemo(
    () => buildCompletedSentence(q, mondaiType, passage?.text),
    [q, mondaiType, passage?.text],
  );

  // Bản dịch soạn sẵn theo dạng (mục 12.1); chỉ dùng khi nội dung đã ở trạng thái ai/reviewed
  const translationsReady =
    enrichmentStatus === "ai" || enrichmentStatus === "reviewed";
  const preField = mondaiType ? PRE_ANSWER_TRANSLATION[mondaiType] : undefined;
  const preTranslation = preField ? q[preField]?.trim() || null : null;
  const postTranslation = q.translationVi?.trim() || null;
  const displayedTranslation = translationsReady
    ? answeredView
      ? postTranslation
      : preTranslation
    : null;
  const isAiTranslation = enrichmentStatus === "ai";

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

  // Nghe câu (mục 12.2)
  const speechText = (
    answeredView
      ? completedSentence || examPlainText(blankSentence || q.stem)
      : examPlainText(q.stem)
  ).trim();
  const canSpeak =
    textReady &&
    !helpBlocked &&
    !!speechText &&
    !/^\s*$/.test(speechText) &&
    answeredView;
  const canTranslate = textReady && !helpBlocked && !!displayedTranslation;

  const notes = q.explanation?.optionNotes;
  const hasOptionNotes =
    Array.isArray(notes) &&
    notes.length === 4 &&
    notes.every((n) => typeof n === "string" && n.trim());
  const showTargetWord =
    !!q.targetWord?.term &&
    !!q.targetWord.meaningVi &&
    (!mondaiType || TARGET_WORD_TYPES.has(mondaiType));
  const shownAnswer = pendingOption ?? userAnswer;

  const correctOptionText = examPlainText(q.options[q.answer - 1] || "");
  const userOptionText = userAnswer
    ? examPlainText(q.options[userAnswer - 1] || "")
    : "";
  const translationLabel = (
    <span className="font-bold text-emerald-800 dark:text-emerald-300 mr-1.5">
      Dịch câu
      {isAiTranslation && (
        <span className="ml-1 align-middle px-1.5 py-px rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          AI dịch
        </span>
      )}
      :
    </span>
  );

  const explanationBlock = (
        <div className="pt-3.5 border-t border-slate-200/80 dark:border-slate-800 space-y-3 text-sm leading-relaxed">
          {/* Cách đọc câu (hiragana) */}
          {reading && (
            <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/70 flex items-start gap-2">
              <Volume2 size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" />
              <div>
                <span className="font-bold text-indigo-800 dark:text-indigo-300 mr-1.5 text-xs sm:text-sm">Cách đọc</span>
                <span lang="ja" className="text-sm sm:text-base text-slate-800 dark:text-slate-100">{reading}</span>
              </div>
            </div>
          )}

          {/* Sentence Translation Row (Shown automatically when available) */}
          {translationsReady && postTranslation && (
            <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/70 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200 flex items-start gap-2">
              <Languages
                size={15}
                className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-1"
              />
              <div>
                {translationLabel}
                <span>{postTranslation}</span>
              </div>
            </div>
          )}

          {/* Tier 1: Answer Verdict & User Choice Comparison */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
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
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-semibold text-sm border border-emerald-200/70 dark:border-emerald-800/60"
                >
                  {correctOptionText}
                </span>
              )}
              {userAnswer && userAnswer !== q.answer && (
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-medium text-xs border border-rose-200/70 dark:border-rose-800/60">
                  Bạn chọn: {userAnswer}. {userOptionText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onNextQuestion && (
                <button
                  type="button"
                  onClick={onNextQuestion}
                  className="exam-primary !py-1.5 !px-3 !min-h-8 text-xs"
                >
                  <span>Câu tiếp</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Tier 2: Core Explanation & Option Notes */}
          <div className="space-y-2.5">
            <p className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
              {q.explanation?.vi ||
                q.explanation?.summary ||
                "Chưa có lời giải."}
            </p>

            {/* Lời giải từng phương án (mục 9.5) */}
            {hasOptionNotes && (
              <ol className="space-y-2 pt-1" aria-label="Lời giải từng phương án">
                {notes!.map((n, i) => {
                  const isAnswer = q.answer === i + 1;
                  const isUserWrong =
                    !!userAnswer && userAnswer === i + 1 && !isAnswer;
                  return (
                    <li
                      key={i}
                      className={`text-xs sm:text-sm leading-relaxed pl-3 border-l-2 ${
                        isAnswer
                          ? "border-emerald-500 text-slate-800 dark:text-slate-100"
                          : isUserWrong
                            ? "border-rose-500 text-slate-800 dark:text-slate-100"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <span className="font-semibold">{i + 1}. </span>
                      <span lang="ja" className="font-semibold text-slate-900 dark:text-slate-100">
                        {examPlainText(q.options[i] || "")}
                      </span>
                      <span> — {n}</span>
                      {isAnswer && (
                        <span className="ml-1.5 px-1.5 py-px rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          Đúng
                        </span>
                      )}
                      {isUserWrong && (
                        <span className="ml-1.5 px-1.5 py-px rounded-md bg-rose-100 dark:bg-rose-900/60 text-xs font-bold text-rose-800 dark:text-rose-200">
                          Bạn chọn
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Từ trọng tâm: khối nhấn mạnh */}
          {showTargetWord && (
            <div className="rounded-2xl border-2 border-amber-300/80 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Từ trọng tâm</p>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <button
                  type="button"
                  lang="ja"
                  onClick={() => onWordLookup?.(q.targetWord!.term)}
                  className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300"
                  title="Bấm để tra từ điển"
                >
                  {q.targetWord!.term}
                </button>
                {q.targetWord!.reading && (
                  <span lang="ja" className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{q.targetWord!.reading}</span>
                )}
                {q.targetWord!.hanViet && (
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">· {q.targetWord!.hanViet}</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{q.targetWord!.meaningVi}</p>
            </div>
          )}

          {/* Star Question Order Assembly (Mondai 8) */}
          {q.order && (
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/70 text-xs sm:text-sm space-y-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Thứ tự ghép câu: {q.order.join(" → ")} (Ô ★ là đáp án {q.answer})
              </p>
              <p
                lang="ja"
                className="text-slate-900 dark:text-slate-100 font-medium"
              >
                {completedSentence ||
                  q.order.map((i) => examPlainText(q.options[i - 1] || "")).join("")}
              </p>
            </div>
          )}

          {/* Tier 3: Smart Vocabulary & Grammar Breakdown (Zero Empty Cards) */}
          {textReady && (
            <Suspense
              fallback={
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Đang phân tích từ vựng…
                </p>
              }
            >
              <SentenceBreakdownPanel
                stem={q.stem}
                sentenceBreakdown={q.sentenceBreakdown}
                explanationVi={q.explanation?.vi}
                onWordClick={onWordLookup}
                inline={!passage}
              />
            </Suspense>
          )}

          {/* Subtle Source & AI Reference Footer */}
          {q.explanationStatus === "authored" && (
            <p className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles size={11} className="shrink-0" />
              <span>
                Đáp án đối chiếu cuối sách · Lời giải tham khảo do AI.
              </span>
            </p>
          )}
        </div>
  );

  return (
    <article
      className="exam-card !p-4 sm:!p-6 scroll-mt-28 space-y-3.5 sm:space-y-4 border border-slate-200/90 dark:border-slate-700/80"
      id={`q-${q.id}`}
    >
      {/* Question Header */}
      <div className="flex items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <strong className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm border border-indigo-200/60 dark:border-indigo-800/50">
            {sequenceNumber
              ? `Câu ${sequenceNumber}${totalQuestions ? ` / ${totalQuestions}` : ""}`
              : `Câu ${q.number}`}
          </strong>
          {/* Đề thi thử ẩn nguồn "Ngày X · Câu Y" để không lộ nơi câu đến từ đâu (R10) */}
          {q.origin && mode !== "mock" && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {`Ngày ${q.origin.day ?? q.origin.title} · Câu ${q.origin.number}`}
            </span>
          )}
          {contextRole === "context_only" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-medium text-xs border border-amber-200/70 dark:border-amber-800/50">
              Giữ ngữ cảnh đoạn văn
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {passage && onOpenPassage && (
            <button
              type="button"
              onClick={onOpenPassage}
              className="exam-secondary !py-1 !px-2 sm:!px-2.5 !min-h-8 text-xs sm:text-xs font-semibold"
              title="Mở đoạn văn (R)"
            >
              <BookOpen size={12} className="text-indigo-600 dark:text-indigo-400" />
              <span>Đoạn văn</span>
            </button>
          )}
          {feedback && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                mode === "review"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50"
                  : !userAnswer
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                    : userAnswer === q.answer
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50"
                      : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/50"
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
        <div className="space-y-1.5">
          <p
            lang="ja"
            data-exam-selectable
            className="select-text text-lg sm:text-xl leading-[1.9] font-medium text-slate-900 dark:text-slate-100 py-1"
          >
            <ExamText text={blankSentence || q.stem} />
          </p>
          {passage && blankId && onShowInPassage && (
            <button
              type="button"
              className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline underline-offset-2"
              onClick={onShowInPassage}
            >
              Xem trong đoạn văn ↑
            </button>
          )}
        </div>
      )}

      {/* 4 Options Grid */}
      <div
        className={`grid gap-2.5 ${
          isShortOptions ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
        role="group"
        aria-label={`Phương án câu ${q.number}`}
      >
        {q.options.map((o, i) => {
          const isCorrectOption = feedback && q.answer === i + 1;
          const isWrongOption =
            feedback && userAnswer === i + 1 && q.answer !== i + 1;
          const isSelectedOption = shownAnswer === i + 1;

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
              <span className="relative w-7 h-7 shrink-0 mt-0.5 flex items-center justify-center">
                <input
                  type="radio"
                  className={`peer appearance-none w-7 h-7 rounded-lg border transition-colors ${
                    locked || mode === "review" ? "" : "cursor-pointer"
                  } ${
                    isCorrectOption
                      ? "bg-emerald-600 border-emerald-600"
                      : isWrongOption
                        ? "bg-rose-600 border-rose-600"
                        : isSelectedOption
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-slate-100/90 dark:bg-slate-800 border-slate-200/90 dark:border-slate-700"
                  }`}
                  name={`answer-${q.id}`}
                  aria-label={`Phương án ${i + 1}, câu ${sequenceNumber ?? q.number}`}
                  aria-describedby={`opt-text-${q.id}-${i}`}
                  disabled={locked || mode === "review"}
                  checked={shownAnswer === i + 1}
                  onChange={() => onSelectOption(i + 1)}
                />
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-extrabold ${
                    isCorrectOption || isWrongOption || isSelectedOption
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {i + 1}
                </span>
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

      {/* Unified Study Footer & 1.5s Pending Bar (Zero Layout Shift) */}
      {(canSpeak ||
        canTranslate ||
        showFeedback ||
        (!showFeedback && !!onRevealAnswer) ||
        (textReady && q.sourceImage) ||
        pendingOption != null ||
        (mode === "drill" && !locked && !feedback && !!onUndoPending)) && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 min-h-[44px] flex flex-wrap items-center justify-between gap-2">
          {pendingOption != null ? (
            <div
              role="status"
              className="relative overflow-hidden w-full flex items-center justify-between gap-2 px-3 py-1.5 min-h-[38px] rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-100"
            >
              <span>Đã chọn {pendingOption} · đang chốt…</span>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                onClick={onUndoPending}
              >
                Hoàn tác
              </button>
              <span
                key={`${q.id}-${pendingOption}`}
                aria-hidden="true"
                className="absolute left-0 bottom-0 h-0.5 w-full bg-indigo-500 origin-left exam-commit-progress"
                style={{ animationDuration: `${DRILL_COMMIT_DELAY_MS}ms` }}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {canSpeak && (
                  <button
                    type="button"
                    className="exam-secondary !py-1.5 !px-2.5 sm:!px-3 !min-h-9 text-xs"
                    onClick={() => {
                      const started = speakWithVoiceEngine(speechText, {
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

                {canTranslate && !hideTranslateButton && !(showFeedback && expanded) && (
                  <button
                    type="button"
                    className="exam-secondary !py-1.5 !px-2.5 sm:!px-3 !min-h-9 text-xs"
                    aria-expanded={showInlineTranslation}
                    onClick={() => setShowInlineTranslation((v) => !v)}
                  >
                    <Languages size={14} className="text-emerald-600" />
                    <span>{showInlineTranslation ? "Ẩn bản dịch" : "Dịch câu"}</span>
                  </button>
                )}

                {!showFeedback && onRevealAnswer && (
                  <button
                    type="button"
                    className="exam-secondary !py-1.5 !px-2.5 sm:!px-3 !min-h-9 text-xs"
                    onClick={onRevealAnswer}
                  >
                    <ChevronDown size={14} />
                    <span>Xem đáp án luôn</span>
                  </button>
                )}

                {showFeedback && onExpand && !sheetMode && (
                  <button
                    type="button"
                    className="exam-secondary !py-1.5 !px-2.5 sm:!px-3 !min-h-9 text-xs"
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

              {/* Quiet Collapsible Source Scan Verification */}
              {textReady && q.sourceImage && (
                <details className="open:w-full text-xs text-slate-500 dark:text-slate-400">
                  <summary className="cursor-pointer font-medium hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1 py-1">
                    <BookOpen size={12} />
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
            </>
          )}
        </div>
      )}

      {/* Inline Translation when Explanation is collapsed */}
      {showInlineTranslation && canTranslate && !(showFeedback && expanded) && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 flex items-start gap-2.5">
          <Languages
            size={15}
            className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
          />
          <div>
            {translationLabel}
            <span>{displayedTranslation}</span>
          </div>
        </div>
      )}

      {/* Lời giải: trong thẻ (máy tính) hoặc bottom sheet (điện thoại) */}
      {showFeedback && sheetMode && (
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="min-w-0 text-sm font-bold flex items-center gap-1.5">
            {userAnswer && userAnswer !== q.answer ? (
              <XCircle size={18} className="text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            )}
            <span className="truncate text-slate-800 dark:text-slate-100">
              {userAnswer && userAnswer !== q.answer ? "Chưa đúng" : "Đúng rồi"} · Đáp án {q.answer}
            </span>
          </p>
          <button
            type="button"
            className="exam-primary !py-1.5 !px-3 !min-h-10 text-xs shrink-0"
            onClick={() => setSheetOpen(true)}
          >
            Xem lời giải
          </button>
        </div>
      )}
      {showFeedback && !sheetMode && expanded && explanationBlock}
      {sheetMode && showFeedback && (
        <BottomSheet open={sheetOpen} title="Lời giải" onClose={() => setSheetOpen(false)} maxHeightClass="max-h-[58dvh]">
          {explanationBlock}
        </BottomSheet>
      )}
    </article>
  );
}
