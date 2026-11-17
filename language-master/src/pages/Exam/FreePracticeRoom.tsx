import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JLPTPageHeader from "./hub/JLPTPageHeader";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Infinity as InfinityIcon,
  Pencil,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { JLPTQuestion } from "../../data/exams/jlpt/types";
import ExamQuestionCard from "./components/ExamQuestionCard";
import ExamText from "./components/ExamText";
import PassageViewSwitch from "./components/PassageViewSwitch";
import SelectionLookup from "./components/SelectionLookup";
import SourceImage from "./components/SourceImage";
import WordLookupModal from "./components/WordLookupModal";
import { usePassageViewSwitch } from "./workspace/usePassageViewSwitch";
import {
  collectFixedPracticeSeeds,
  collectFreePracticeSeeds,
  collectUpcomingImageUrls,
  createEndlessQueue,
  fillLookaheadBuffer,
  fisherYatesShuffle,
  getFreeScopeBookOptions,
  seededRandom,
  FREE_PRACTICE_ALL_MONDAIS,
  LOOKAHEAD_BUFFER_SIZE,
  materializeFreeUnit,
  MAX_FREE_HISTORY,
  parseFreeScopeSearchParams,
  readFreePracticeHandoff,
  saveFreePracticeHandoff,
  type EndlessQueueState,
  type FreePracticeConfig,
  type FreePracticeFixedKind,
  type FreePracticeUnit,
} from "../../lib/jlpt/freePractice";

type LocationState = {
  freeConfig?: FreePracticeConfig;
} | null;

type QuestionAnswerState = {
  selected?: number;
  revealed: boolean;
};

const FIXED_PROGRESS_KEY = "language-master:jlpt:v1:free-fixed-progress";
type FixedProgress = {
  sig: string;
  seed: number;
  answers: Record<string, QuestionAnswerState>;
  stats: { answered: number; correct: number };
  cursor: number;
  qIndex: number;
};
function hashString(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function readFixedProgress(sig: string): FixedProgress | null {
  try {
    const raw = sessionStorage.getItem(FIXED_PROGRESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as FixedProgress;
    return p && p.sig === sig && typeof p.seed === "number" ? p : null;
  } catch {
    return null;
  }
}
function writeFixedProgress(p: FixedProgress) {
  try {
    sessionStorage.setItem(FIXED_PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // Bỏ qua nếu trình duyệt chặn storage
  }
}
function clearFixedProgress() {
  try {
    sessionStorage.removeItem(FIXED_PROGRESS_KEY);
  } catch {
    // Bỏ qua
  }
}

const FIXED_BADGE_MAP: Record<
  FreePracticeFixedKind,
  { label: string; tone: string }
> = {
  wrong: {
    label: "Ôn câu sai · Luyện nhanh",
    tone: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
  },
  blank: {
    label: "Ôn bỏ trống · Luyện nhanh",
    tone: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  },
  flags: {
    label: "Ôn chưa chắc · Luyện nhanh",
    tone: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
  },
  full: {
    label: "Làm lại cả bài · Luyện nhanh",
    tone: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
  },
};

function instanceQuestionKey(instanceId: string, questionId: string): string {
  return `${instanceId}::${questionId}`;
}

export default function FreePracticeRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  useDocumentTitle("Luyện nhanh");

  const resolvedConfig = useMemo<FreePracticeConfig>(() => {
    const stateConfig = (location.state as LocationState)?.freeConfig;
    if (stateConfig) return stateConfig;

    const searchRaw = new URLSearchParams(location.search);
    if (searchRaw.get("mode") === "fixed") {
      const handoff = readFreePracticeHandoff();
      if (handoff?.kind === "fixed") return handoff;
    }

    if (
      searchRaw.has("level") ||
      searchRaw.has("books") ||
      searchRaw.has("exams") ||
      searchRaw.has("mondais")
    ) {
      const parsed = parseFreeScopeSearchParams(location.search, "N2");
      const books = getFreeScopeBookOptions(parsed.level);
      const allExamIds = books.flatMap((b) => b.exams.map((e) => e.id));
      let examIds: string[];
      if (parsed.examIds && parsed.examIds.length > 0) {
        const examSet = new Set(allExamIds);
        const valid = parsed.examIds.filter((id) => examSet.has(id));
        examIds = valid.length > 0 ? valid : allExamIds;
      } else if (parsed.bookIds && parsed.bookIds.length > 0) {
        const bookSet = new Set(parsed.bookIds);
        const fromBooks = books
          .filter((b) => bookSet.has(b.id))
          .flatMap((b) => b.exams.map((e) => e.id));
        examIds = fromBooks.length > 0 ? fromBooks : allExamIds;
      } else {
        examIds = allExamIds;
      }
      const examIdSet = new Set(examIds);
      const bookIds = books
        .filter((b) => b.exams.some((e) => examIdSet.has(e.id)))
        .map((b) => b.id);
      return {
        kind: "endless",
        level: parsed.level,
        bookIds: bookIds.length > 0 ? bookIds : books.map((b) => b.id),
        examIds,
        mondais:
          parsed.mondais && parsed.mondais.length > 0
            ? parsed.mondais
            : [...FREE_PRACTICE_ALL_MONDAIS],
      };
    }

    const handoff = readFreePracticeHandoff();
    if (handoff) return handoff;

    const fallbackBooks = getFreeScopeBookOptions("N2");
    return {
      kind: "endless",
      level: "N2",
      bookIds: fallbackBooks.map((b) => b.id),
      examIds: fallbackBooks.flatMap((b) => b.exams.map((e) => e.id)),
      mondais: [...FREE_PRACTICE_ALL_MONDAIS],
    };
  }, [location.state, location.search]);

  const [config, setConfig] = useState<FreePracticeConfig>(resolvedConfig);

  // Ẩn nút hẹn giờ nổi trong phòng luyện nhanh để không che đáp án
  useEffect(() => {
    document.body.dataset.jlptAttemptActive = "true";
    window.dispatchEvent(
      new CustomEvent("app:jlpt-workspace", {
        detail: { attemptActive: true, strict: false },
      }),
    );
    return () => {
      document.body.dataset.jlptAttemptActive = "false";
      window.dispatchEvent(
        new CustomEvent("app:jlpt-workspace", {
          detail: { attemptActive: false, strict: false },
        }),
      );
    };
  }, []);

  useEffect(() => {
    setConfig(resolvedConfig);
    saveFreePracticeHandoff(resolvedConfig);
  }, [resolvedConfig]);

  // Lịch sử câu đang xem trong RAM (tối đa MAX_FREE_HISTORY) & lookahead buffer
  const [units, setUnits] = useState<FreePracticeUnit[]>([]);
  const [cursor, setCursor] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswerState>>(
    {},
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const [seenOffset, setSeenOffset] = useState(0);

  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);

  const queueRef = useRef<EndlessQueueState | null>(null);
  const aheadRef = useRef<FreePracticeUnit[]>([]);
  const countedRef = useRef<Set<string>>(new Set());
  const prefetchedUrlsRef = useRef<Set<string>>(new Set());

  const fixedSeedRef = useRef<number>(0);
  const fixedSigRef = useRef<string>("");

  const initSessionFromConfig = useCallback((nextCfg: FreePracticeConfig, fresh = true) => {
    setAnswers({});
    setCollapsed({});
    setStats({ answered: 0, correct: 0 });
    setSeenOffset(0);
    setCursor(0);
    setQIndex(0);
    countedRef.current = new Set();

    if (nextCfg.kind === "endless") {
      fixedSigRef.current = "";
      const seeds = collectFreePracticeSeeds({
        level: nextCfg.level,
        bookIds: nextCfg.bookIds,
        examIds: nextCfg.examIds,
        mondais: nextCfg.mondais,
      });
      const initialQueue = createEndlessQueue(seeds);
      const { buffer, nextQueue } = fillLookaheadBuffer(
        initialQueue,
        [],
        1 + LOOKAHEAD_BUFFER_SIZE,
      );
      queueRef.current = nextQueue;
      aheadRef.current = buffer.slice(1);
      setUnits(buffer.slice(0, 1));
    } else {
      const seeds = collectFixedPracticeSeeds({
        level: nextCfg.level,
        questionIds: nextCfg.questionIds,
      });
      // LT-3: cùng bộ câu thì khôi phục tiến độ cũ (cùng hạt giống nên thứ tự câu và đáp án trộn y như trước)
      const sig = `${nextCfg.level}:${nextCfg.questionIds.length}:${hashString(nextCfg.questionIds.join(","))}`;
      const saved = fresh ? null : readFixedProgress(sig);
      const seed = saved?.seed ?? (Date.now() % 2147483647);
      fixedSeedRef.current = seed;
      fixedSigRef.current = sig;
      const rng = seededRandom(seed);
      const shuffled = fisherYatesShuffle(seeds, rng).map((seed2) =>
        materializeFreeUnit(seed2, rng),
      );
      queueRef.current = null;
      aheadRef.current = [];
      setUnits(shuffled);
      if (saved) {
        const restored: Record<string, QuestionAnswerState> = {};
        for (const u of shuffled) {
          for (const q of u.questions) {
            const a = saved.answers[q.id];
            if (a) {
              const key = instanceQuestionKey(u.instanceId, q.id);
              restored[key] = a;
              countedRef.current.add(key);
            }
          }
        }
        setAnswers(restored);
        setStats(saved.stats);
        setCursor(Math.min(saved.cursor, Math.max(0, shuffled.length - 1)));
        setQIndex(saved.qIndex);
      } else {
        clearFixedProgress();
      }
    }
  }, []);

  useEffect(() => {
    initSessionFromConfig(config, false);
  }, [config, initSessionFromConfig]);

  // LT-3: lưu tiến độ lượt ôn cố định (theo tab) để tải lại không mất
  useEffect(() => {
    if (config.kind !== "fixed" || !fixedSigRef.current || units.length === 0) return;
    const byQid: Record<string, QuestionAnswerState> = {};
    for (const u of units) {
      for (const q of u.questions) {
        const a = answers[instanceQuestionKey(u.instanceId, q.id)];
        if (a) byQid[q.id] = a;
      }
    }
    writeFixedProgress({
      sig: fixedSigRef.current,
      seed: fixedSeedRef.current,
      answers: byQid,
      stats,
      cursor,
      qIndex,
    });
  }, [config.kind, units, answers, stats, cursor, qIndex]);

  const currentUnit = units[cursor];
  const currentQuestion: JLPTQuestion | undefined =
    currentUnit?.questions[qIndex] ?? currentUnit?.questions[0];
  const currentPassage = currentUnit?.passage;

  const {
    view: passageView,
    showPassage,
    showQuestion,
    toggleView,
  } = usePassageViewSwitch({
    passageId: currentPassage?.id,
    scopeKey:
      currentUnit && currentPassage
        ? `${currentUnit.instanceId}:${currentPassage.id}`
        : undefined,
  });

  // Prefetch ảnh quét (nếu có) cho các câu kế tiếp
  useEffect(() => {
    if (typeof Image === "undefined") return;
    const upcoming =
      config.kind === "endless"
        ? aheadRef.current
        : units.slice(cursor + 1, cursor + 1 + LOOKAHEAD_BUFFER_SIZE);
    const urls = collectUpcomingImageUrls(upcoming, LOOKAHEAD_BUFFER_SIZE);
    for (const url of urls) {
      if (prefetchedUrlsRef.current.has(url)) continue;
      prefetchedUrlsRef.current.add(url);
      const img = new Image();
      img.src = url;
    }
  }, [config.kind, cursor, units]);

  const totalFixedQuestions = useMemo(
    () =>
      config.kind === "fixed"
        ? units.reduce((sum, u) => sum + u.questions.length, 0)
        : 0,
    [config.kind, units],
  );

  const currentFixedSeq = useMemo(() => {
    if (config.kind !== "fixed") return seenOffset + cursor + 1;
    let seq = 1;
    for (let i = 0; i < cursor; i++) {
      seq += units[i]?.questions.length ?? 0;
    }
    return seq + qIndex;
  }, [config.kind, units, cursor, qIndex, seenOffset]);

  const selectOption = useCallback(
    (unit: FreePracticeUnit, q: JLPTQuestion, opt: number) => {
      const key = instanceQuestionKey(unit.instanceId, q.id);
      setAnswers((prev) => {
        if (prev[key]?.revealed) return prev;
        return {
          ...prev,
          [key]: { selected: opt, revealed: true },
        };
      });
      if (!countedRef.current.has(key)) {
        countedRef.current.add(key);
        setStats((prev) => ({
          answered: prev.answered + 1,
          correct: prev.correct + (opt === q.answer ? 1 : 0),
        }));
      }
    },
    [],
  );

  const canPrev = cursor > 0 || qIndex > 0;
  const isAtFixedEnd =
    config.kind === "fixed" &&
    units.length > 0 &&
    cursor === units.length - 1 &&
    qIndex >= (currentUnit?.questions.length ?? 1) - 1;
  const canNext =
    config.kind === "endless" ? units.length > 0 : !isAtFixedEnd && units.length > 0;

  const handlePrev = useCallback(() => {
    if (!currentUnit) return;
    showQuestion();
    if (qIndex > 0) {
      setQIndex((prev) => prev - 1);
      return;
    }
    if (cursor > 0) {
      const prevUnit = units[cursor - 1];
      setCursor((prev) => prev - 1);
      setQIndex(Math.max(0, (prevUnit?.questions.length ?? 1) - 1));
    }
  }, [currentUnit, qIndex, cursor, units, showQuestion]);

  const handleNext = useCallback(() => {
    if (!currentUnit) return;
    showQuestion();
    if (qIndex < currentUnit.questions.length - 1) {
      setQIndex((prev) => prev + 1);
      return;
    }

    if (cursor < units.length - 1) {
      setCursor((prev) => prev + 1);
      setQIndex(0);
      return;
    }

    if (config.kind !== "endless" || !queueRef.current) return;

    // Kéo 1 unit đã chuẩn bị sẵn từ lookahead buffer & nạp bù buffer
    const [nextUnit, ...restAhead] = aheadRef.current;
    const drawn =
      nextUnit ??
      fillLookaheadBuffer(queueRef.current, [], 1).buffer[0];
    if (!drawn) return;

    const refilled = fillLookaheadBuffer(
      queueRef.current,
      nextUnit ? restAhead : [],
      LOOKAHEAD_BUFFER_SIZE,
    );
    queueRef.current = refilled.nextQueue;
    aheadRef.current = refilled.buffer;

    const combined = [...units, drawn];
    if (combined.length > MAX_FREE_HISTORY) {
      const dropCount = combined.length - MAX_FREE_HISTORY;
      const dropped = combined.slice(0, dropCount);
      const droppedKeys = new Set(
        dropped.flatMap((u) =>
          u.questions.map((q) => instanceQuestionKey(u.instanceId, q.id)),
        ),
      );
      setAnswers((prev) => {
        const next: Record<string, QuestionAnswerState> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (!droppedKeys.has(k)) next[k] = v;
        }
        return next;
      });
      setCollapsed((prev) => {
        const next: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (!droppedKeys.has(k)) next[k] = v;
        }
        return next;
      });
      setSeenOffset((prev) => prev + dropCount);
      const trimmed = combined.slice(dropCount);
      setUnits(trimmed);
      setCursor(trimmed.length - 1);
    } else {
      setUnits(combined);
      setCursor(combined.length - 1);
    }
    setQIndex(0);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [currentUnit, qIndex, cursor, units, config.kind, showQuestion]);

  // Phím tắt: 1-4 chọn nhanh 1 chạm, ←/→ điều hướng câu, R đổi đoạn văn ⇄ câu hỏi
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (lookupWord) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!currentUnit || !currentQuestion) return;

      if ((e.key === "r" || e.key === "R") && currentUnit.passage) {
        e.preventDefault();
        toggleView();
      } else if (
        e.key === "Escape" &&
        currentUnit.passage &&
        passageView === "passage"
      ) {
        e.preventDefault();
        showQuestion();
      } else if (e.key >= "1" && e.key <= "4") {
        const key = instanceQuestionKey(
          currentUnit.instanceId,
          currentQuestion.id,
        );
        if (!answers[key]?.revealed) {
          e.preventDefault();
          selectOption(currentUnit, currentQuestion, Number(e.key));
        }
      } else if (
        (e.key === "l" || e.key === "L") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        currentQuestion &&
        currentUnit &&
        answers[instanceQuestionKey(currentUnit.instanceId, currentQuestion.id)]?.revealed
      ) {
        e.preventDefault();
        if (window.matchMedia("(max-width: 639px)").matches) {
          setExplanationOpen((v) => !v);
        } else {
          const k = instanceQuestionKey(currentUnit.instanceId, currentQuestion.id);
          setCollapsed((prev) => ({ ...prev, [k]: !prev[k] }));
        }
      } else if (e.key === "ArrowLeft" && canPrev) {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight" && canNext) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    lookupWord,
    currentUnit,
    currentQuestion,
    passageView,
    toggleView,
    showQuestion,
    answers,
    canPrev,
    canNext,
    selectOption,
    handlePrev,
    handleNext,
  ]);

  const activeKey =
    currentUnit && currentQuestion
      ? instanceQuestionKey(currentUnit.instanceId, currentQuestion.id)
      : "";
  useEffect(() => {
    setExplanationOpen(false);
  }, [activeKey]);
  const activeAnswerState = activeKey ? answers[activeKey] : undefined;
  const isRevealed = Boolean(activeAnswerState?.revealed);
  const allFixedRevealed =
    config.kind === "fixed" &&
    totalFixedQuestions > 0 &&
    units.every((u) =>
      u.questions.every(
        (q) => answers[instanceQuestionKey(u.instanceId, q.id)]?.revealed,
      ),
    );

  const blankToQuestionIndex = useMemo(() => {
    const map = new Map<string, number>();
    if (!currentUnit) return map;
    currentUnit.questions.forEach((q, idx) => {
      const blanks = q.blankIds?.length ? q.blankIds : q.blankLabel ? [q.blankLabel] : [];
      for (const b of blanks) {
        if (b) map.set(b, idx);
      }
    });
    return map;
  }, [currentUnit]);

  const backHref =
    config.kind === "fixed" && config.backTo ? config.backTo : "/exams/jlpt/practice";

  const renderPassagePanel = () => {
    if (!currentUnit?.passage) return null;
    const passage = currentUnit.passage;
    return (
      <div className="space-y-4">
        <div
          lang="ja"
          data-exam-selectable
          className="select-text text-base sm:text-lg leading-[1.9] font-medium text-slate-900 dark:text-slate-100"
        >
          <ExamText
            text={passage.text}
            blanks={{
              idPrefix: `free-blank-${passage.id}-`,
              active: (blank) => blankToQuestionIndex.get(blank) === qIndex,
              answered: (blank) => {
                const idx = blankToQuestionIndex.get(blank);
                if (idx === undefined) return false;
                const q = currentUnit.questions[idx];
                if (!q) return false;
                return Boolean(
                  answers[instanceQuestionKey(currentUnit.instanceId, q.id)]
                    ?.revealed,
                );
              },
              onClick: (blank) => {
                const idx = blankToQuestionIndex.get(blank);
                if (idx !== undefined) {
                  setQIndex(idx);
                  showQuestion();
                }
              },
            }}
          />
        </div>

        {passage.sourceImage && (
          <details className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer font-semibold hover:text-indigo-600">
              Đối chiếu đoạn văn gốc
            </summary>
            <SourceImage
              src={passage.sourceImage}
              alt="Đoạn văn và chú thích nguyên bản"
            />
          </details>
        )}

        {passage.notes?.map((n, i) => (
          <p
            key={i}
            lang="ja"
            data-exam-selectable
            className="select-text p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 text-sm leading-7"
          >
            {isRevealed ? n : n.replace(/\([^)]*[A-Za-zÀ-ỹ][^)]*\)/g, "")}
          </p>
        ))}

        {passage.translationVi && (
          <details className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-sm">
            <summary className="cursor-pointer font-bold text-emerald-800 dark:text-emerald-300">
              Bản dịch đoạn văn tham khảo
            </summary>
            <p className="whitespace-pre-wrap leading-7 mt-2">
              {passage.translationVi}
            </p>
          </details>
        )}
      </div>
    );
  };

  const badgeInfo =
    config.kind === "fixed"
      ? FIXED_BADGE_MAP[config.fixedKind]
      : {
          label: "Luyện nhanh · Không giới hạn",
          tone: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
        };

  const statsChip = (
            <span
              aria-live="polite"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums"
            >
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>
                {config.kind === "fixed"
                  ? `Câu ${currentFixedSeq}/${totalFixedQuestions} · Đúng ${stats.correct}/${stats.answered}`
                  : `Đã làm ${stats.answered} · Đúng ${stats.correct}`}
              </span>
            </span>
  );
  const passageSwitch = currentUnit?.passage ? (
    <PassageViewSwitch
      view={passageView}
      shortcutHint="R"
      onChange={(next) => (next === "passage" ? showPassage() : showQuestion())}
    />
  ) : null;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-24 sm:pb-12">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 space-y-4">
        <JLPTPageHeader
          root={{ label: "Luyện đề JLPT", to: backHref }}
          current={config.kind === "fixed" ? "Ôn câu sai" : "Luyện nhanh"}
          actions={
            config.kind === "endless" ? (
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {statsChip}
                {passageSwitch}
              </div>
            ) : undefined
          }
        />
        {/* Top Control Bar (chỉ phòng Ôn câu sai) */}
        {config.kind === "fixed" && (
        <header className={`exam-card sticky top-16 z-20 !p-2 sm:!p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2`}>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            {config.kind === "fixed" ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeInfo.tone}`}
              >
                <Zap size={13} />
                <span>{badgeInfo.label}</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <InfinityIcon size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>{badgeInfo.label}</span>
              </span>
            )}

            {config.kind === "fixed" && config.title && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[260px]">
                {config.title}
              </span>
            )}
          </div>

          {config.kind === "fixed" && totalFixedQuestions > 0 && (
            <div
              role="progressbar"
              aria-label="Tiến độ ôn tập"
              aria-valuemin={0}
              aria-valuemax={totalFixedQuestions}
              aria-valuenow={currentFixedSeq}
              className="basis-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
            >
              <div
                className="h-full bg-indigo-500 transition-[width]"
                style={{ width: `${Math.min(100, (currentFixedSeq / totalFixedQuestions) * 100)}%` }}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {statsChip}

            {currentUnit?.passage && (
              <PassageViewSwitch
                view={passageView}
                shortcutHint="R"
                onChange={(next) =>
                  next === "passage" ? showPassage() : showQuestion()
                }
              />
            )}

            {config.kind === "fixed" && (
              <button
                type="button"
                onClick={() => initSessionFromConfig(config, true)}
                className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs font-semibold"
              >
                <RotateCcw size={13} />
                <span>Trộn lại đề</span>
              </button>
            )}
          </div>
        </header>
        )}

        {!currentUnit || !currentQuestion ? (
          <section className="exam-card text-center py-12 space-y-4">
            <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
              Không tìm thấy câu hỏi phù hợp.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate(backHref)}
                className="exam-secondary"
              >
                <ArrowLeft size={15} />
                <span>Quay lại</span>
              </button>
            </div>
          </section>
        ) : (
          <main className="space-y-4">
            {/* Khối Mondai: nền trắng, kéo dài bằng thanh trên */}
            <div className="exam-card !p-3 sm:!p-5 space-y-1">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-bold text-base sm:text-xl text-slate-900 dark:text-white">
                  Mondai {currentUnit.mondai.number} · {currentUnit.mondai.titleVi}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {currentUnit.bookTitle}
                </span>
              </p>
              <p lang="ja" className="text-xs sm:text-base text-slate-700 dark:text-slate-200">
                <ExamText text={currentUnit.mondai.instruction} />
              </p>
            </div>

            {/* Khu làm bài chính: đổi giữa Đoạn văn (toàn khung thoáng) và Câu hỏi (giữ nguyên vị trí scroll) */}
            <div
              className="space-y-4"
            >
              {currentUnit.passage && passageView === "passage" ? (
                <article className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <span>
                        Đoạn văn · {currentUnit.questions.length} ô trống
                      </span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">
                        Bấm số ô trống để làm câu · bôi đen để tra từ
                      </span>
                      <button
                        type="button"
                        onClick={showQuestion}
                        title="Quay lại câu hỏi (R)"
                        className="exam-secondary !py-1 !px-2.5 !min-h-8 text-xs font-semibold"
                      >
                        <Pencil size={12} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Câu hỏi</span>
                      </button>
                    </div>
                  </div>
                  {renderPassagePanel()}
                </article>
              ) : (
                <div className="space-y-3 min-w-0">
                  <ExamQuestionCard
                    key={activeKey}
                    question={currentQuestion}
                    sequenceNumber={currentFixedSeq}
                    totalQuestions={
                      config.kind === "fixed" ? totalFixedQuestions : undefined
                    }
                    userAnswer={activeAnswerState?.selected}
                    mode="drill"
                    showFeedback={isRevealed}
                    locked={isRevealed}
                    expanded={isRevealed ? !collapsed[activeKey] : false}
                    onExpand={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [activeKey]: !prev[activeKey],
                      }))
                    }
                    hideTranslateButton
                    explanationSheetOnPhone
                    explanationOpen={explanationOpen}
                    onExplanationOpenChange={setExplanationOpen}
                    onSelectOption={(opt) =>
                      selectOption(currentUnit, currentQuestion, opt)
                    }
                    onWordLookup={(w) => setLookupWord(w)}
                    mondaiType={currentUnit.mondai.type}
                    enrichmentStatus={currentUnit.enrichmentStatus}
                    passage={currentUnit.passage}
                    onShowInPassage={
                      currentUnit.passage &&
                      (currentQuestion.blankIds?.[0] || currentQuestion.blankLabel)
                        ? () =>
                            showPassage(
                              `free-blank-${currentUnit.passage!.id}-${
                                currentQuestion.blankIds?.[0] ||
                                currentQuestion.blankLabel!
                              }`,
                            )
                        : undefined
                    }
                    onOpenPassage={
                      currentUnit.passage ? () => showPassage() : undefined
                    }
                  />

                  {/* Thanh chuyển câu Desktop & Footer */}
                  <div className="hidden sm:flex items-center justify-between gap-3 px-1">
                    <button
                      type="button"
                      disabled={!canPrev}
                      onClick={handlePrev}
                      className="exam-secondary !min-h-10 text-xs sm:text-sm"
                    >
                      ← Câu trước
                    </button>

                    <span className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400">
                      Phím tắt: 1–4 chọn đáp án · L mở/đóng lời giải · ←/→ chuyển câu
                      {currentUnit.passage ? " · R đoạn văn" : ""}
                    </span>

                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={handleNext}
                      className="exam-primary !min-h-10 text-xs sm:text-sm"
                    >
                      <span>Câu tiếp theo</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>

                  {/* Banner hoàn tất bộ ôn tập cố định */}
                  {config.kind === "fixed" &&
                    (allFixedRevealed || (isAtFixedEnd && isRevealed)) && (
                      <section
                        role="status"
                        className="rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/30 p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-extrabold text-indigo-900 dark:text-indigo-100">
                            Đã đi hết lượt ôn tập ({totalFixedQuestions} câu)
                          </p>
                          <p className="text-xs text-indigo-800 dark:text-indigo-200">
                            Bạn làm đúng {stats.correct} / {stats.answered} câu đã chọn. Câu làm đúng sẽ rời khối Ôn tập; câu làm sai vẫn ở lại để ôn tiếp.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => initSessionFromConfig(config, true)}
                            className="exam-primary !py-2 !px-3.5 !min-h-9 text-xs"
                          >
                            <RotateCcw size={13} />
                            <span>Trộn lại &amp; Làm tiếp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(backHref)}
                            className="exam-secondary !py-2 !px-3.5 !min-h-9 text-xs"
                          >
                            Quay lại
                          </button>
                        </div>
                      </section>
                    )}
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {/* Mobile sticky nav bar */}
      {currentUnit && currentQuestion && (
        <nav
          aria-label="Điều hướng câu tự do"
          className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
        >
          <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
            <button
              type="button"
              disabled={!canPrev}
              onClick={handlePrev}
              className="exam-secondary !min-h-11 text-xs font-bold"
            >
              ← Câu trước
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={handleNext}
              className="exam-primary !min-h-11 text-xs font-bold"
            >
              Câu tiếp →
            </button>
          </div>
        </nav>
      )}

      <WordLookupModal
        isOpen={!!lookupWord}
        word={lookupWord || ""}
        onClose={() => setLookupWord(null)}
      />

      <SelectionLookup
        key={`${activeKey}:${isRevealed}:${passageView}`}
        enabled
        onLookup={(text) => setLookupWord(text)}
      />
    </div>
  );
}
