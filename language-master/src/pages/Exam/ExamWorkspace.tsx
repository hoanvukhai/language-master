import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Award,
  BookOpen,
  Clock,
  Eye,
  Filter,
  Play,
  RotateCcw,
} from "lucide-react";
import { getExamById } from "../../data/exams/jlpt";
import type { JLPTQuestion } from "../../data/exams/jlpt/types";
import {
  answer,
  createAttempt,
  finish,
  questions,
  score,
  units,
  type Attempt,
} from "../../lib/jlpt/examCore";
import {
  getSession,
  refreshSession,
  setSession,
  useTabSession,
} from "../../lib/jlpt/tabSession";
import { useConfirmation } from "./components/useConfirmation";
import {
  type AllocationMode,
  type PlannedRound,
  STANDARD_MONDAI_QUOTAS,
  buildPlannedRoundKey,
  computeStandardJLPTScore,
  isStandardExamStructure,
  planPracticeRound,
  poolId,
  practiceSnapshot,
} from "../../lib/jlpt/practicePool";
import ExamQuestionCard from "./components/ExamQuestionCard";
import SourceImage from "./components/SourceImage";
import ExamText from "./components/ExamText";
import WordLookupModal from "./components/WordLookupModal";
import { prefetchLexicon } from "../../lib/dictionary/dictionaryLoader";
import SelectionLookup from "./components/SelectionLookup";
import { useAttemptKeyboard } from "./workspace/useAttemptKeyboard";
import { describeAttempt } from "../../lib/jlpt/attemptLabels";
import QuestionPalette from "./workspace/QuestionPalette";
import BottomSheet from "./workspace/BottomSheet";
import MobileAttemptBar from "./workspace/MobileAttemptBar";
import AttemptMenu, { type AttemptMenuItem } from "./workspace/AttemptMenu";

type Mode = "drill" | "mock" | "review" | "detail" | "result";

const labels = {
  drill: "Luyện theo dạng",
  mock: "Làm bài có giờ",
  review: "Xem đề & lời giải",
  detail: "Chi tiết bài",
  result: "Kết quả trong tab",
};

const ALL_MONDAI_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function ExamWorkspace({ mode }: { mode: Mode }) {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { ask, cancel, confirmation } = useConfirmation();
  const { attempt, notice, noticeKind } = useTabSession();

  // Classic states (kept in sync for backward compatibility & tests)
  const [selected, setSelected] = useState("all");
  const [roundSize, setRoundSize] = useState("20");

  // Enhanced Flexible Practice Setup states
  const [selectedMondais, setSelectedMondais] =
    useState<number[]>(ALL_MONDAI_NUMBERS);
  const [allocationMode, setAllocationMode] =
    useState<AllocationMode>("standard");
  const [perMondaiCount, setPerMondaiCount] = useState<number>(5);
  const [dayFilter, setDayFilter] = useState<number | "all">(() => {
    const d = Number(searchParams.get("day"));
    return Number.isInteger(d) && d >= 1 && d <= 20 ? d : "all";
  });
  const [showDayPicker, setShowDayPicker] = useState<boolean>(() => {
    const d = Number(searchParams.get("day"));
    return Number.isInteger(d) && d >= 1 && d <= 20;
  });

  const [configuring, setConfiguring] = useState<boolean>(() => {
    const requestedDay = Number(searchParams.get("day"));
    if (
      Number.isInteger(requestedDay) &&
      requestedDay >= 1 &&
      requestedDay <= 20 &&
      attempt &&
      attempt.exam.id === examId &&
      attempt.mode === "drill"
    ) {
      const attemptQuestions = attempt.exam.mondais.flatMap((m) => m.questions);
      const isDifferentDay = attemptQuestions.some(
        (q) => q.origin?.day !== undefined && q.origin.day !== requestedDay,
      );
      if (isDifferentDay) return true;
    }
    return false;
  });
  const [expanded, setExpanded] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showInfo, setShowInfo] = useState(false);
  // Khung Tùy chọn nâng cao: chỉ tính trạng thái mở lúc đầu, sau đó do người dùng điều khiển (JL-11)
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(
    () =>
      showDayPicker || dayFilter !== "all" || allocationMode !== "standard",
  );
  const [lookup, setLookup] = useState<string | null>(null);
  const lookupContextRef = useRef<{
    attemptId: string | null;
    questionIds: string[];
  } | null>(null);
  const plannedRoundRef = useRef<PlannedRound | null>(null);
  const startingRef = useRef(false);

  const [lookupEnabled, setLookupEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem("nihongo_selection_lookup_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [sheet, setSheet] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const active =
    !configuring &&
    attempt &&
    attempt.exam.id === examId &&
    (mode === attempt.mode || mode === "result")
      ? attempt
      : null;

  const catalogExam = useMemo(
    () => (examId ? getExamById(examId) : undefined),
    [examId],
  );
  const exam = active?.exam || catalogExam;
  const clockRunning = mode === "mock" && active?.status === "in_progress";
  /** Thi nghiêm túc đang diễn ra: chặn tra từ, dịch, nghe (JL-05) */
  const strictRunning = Boolean(
    active?.mode === "mock" && active.status === "in_progress" && active.strict,
  );
  const lookupAllowed = !strictRunning;

  // Báo cho FloatingStudyTimer: đang làm bài thì ẩn nút nổi; thi nghiêm túc thì chặn F9 (JL-08, JL-05)
  const attemptActive = Boolean(
    active?.status === "in_progress" &&
      (mode === "drill" || mode === "mock"),
  );
  useEffect(() => {
    const publish = (on: boolean, strict: boolean) => {
      document.body.dataset.jlptAttemptActive = on ? "true" : "false";
      document.body.dataset.jlptStrict = strict ? "true" : "false";
      window.dispatchEvent(
        new CustomEvent("app:jlpt-workspace", {
          detail: { attemptActive: on, strict },
        }),
      );
    };
    publish(attemptActive, strictRunning);
    return () => publish(false, false);
  }, [attemptActive, strictRunning]);

  useEffect(() => {
    const tick = () => {
      refreshSession();
      if (clockRunning) setNow(Date.now());
    };
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    tick();
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [clockRunning]);

  useEffect(() => {
    if (mode === "mock" && active?.status === "in_progress")
      window.speechSynthesis?.cancel();
  }, [mode, active?.status]);

  useEffect(() => {
    if (active?.status === "submitted") cancel();
  }, [active?.status, cancel]);

  const submitted = active?.status === "submitted";
  const result = active && submitted ? score(active) : null;

  // JL-04: nạp trước lexicon lúc rảnh cho luyện, xem đề, kết quả.
  // Bài có giờ đang chạy chỉ nạp khi dùng trợ giúp; thi nghiêm túc không nạp gì.
  const shouldPrefetchLexicon =
    !!exam && (mode === "drill" || mode === "review" || submitted);
  useEffect(() => {
    if (shouldPrefetchLexicon) prefetchLexicon();
  }, [shouldPrefetchLexicon]);

  const groups = useMemo(
    () => (exam ? units(exam, active?.questionIds) : []),
    [exam, active?.questionIds],
  );
  const current = active ? groups[active.position] : undefined;

  // Bản đồ đánh số thứ tự câu tuần tự (1..N) trong đề hiện tại
  const { questionSeqMap, totalQuestionsInView } = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    const sourceUnits = mode === "review" && exam ? units(exam) : groups;
    for (const g of sourceUnits) {
      for (const q of g.questions) {
        idx++;
        map.set(q.id, idx);
      }
    }
    return { questionSeqMap: map, totalQuestionsInView: idx };
  }, [groups, mode, exam]);

  // FIX-04: Chỉ ghi nhận assisted cho các câu chưa chốt đáp án trong phiên đang làm
  const recordAssistForQuestions = (
    attemptId: string | null | undefined,
    candidateQuestionIds: string[],
  ) => {
    if (!attemptId || candidateQuestionIds.length === 0) return;
    refreshSession();
    const a = getSession();
    if (!a || a.id !== attemptId || a.status !== "in_progress") return;
    const uncommittedIds = candidateQuestionIds.filter(
      (id) => !a.committed.includes(id),
    );
    if (uncommittedIds.length === 0) return;
    const nextAssisted = [...new Set([...a.assisted, ...uncommittedIds])];
    if (nextAssisted.length !== a.assisted.length) {
      setSession({
        ...a,
        assisted: nextAssisted,
      });
    }
  };

  const openLookupModal = useCallback(
    (word: string, unitQuestionIds?: string[]) => {
      const trimmed = word.trim();
      if (!trimmed) return;
      refreshSession();
      const a = getSession();
      let candidateIds = unitQuestionIds || [];
      if (
        candidateIds.length === 0 &&
        a &&
        a.id === active?.id &&
        a.status === "in_progress"
      ) {
        const unitGroups = units(a.exam, a.questionIds);
        const curUnit = unitGroups[a.position];
        if (curUnit) {
          candidateIds = curUnit.questions.map((q) => q.id);
        }
      }
      lookupContextRef.current = {
        attemptId:
          a && a.id === active?.id && a.status === "in_progress" ? a.id : null,
        questionIds: candidateIds,
      };
      setLookup(trimmed);
    },
    [active?.id],
  );

  // Đồng bộ trạng thái bật/tắt tra từ từ thanh tiện ích nổi toàn hệ thống
  useEffect(() => {
    const onToggle = (e: Event) => {
      const custom = e as CustomEvent<{ enabled?: boolean }>;
      if (typeof custom.detail?.enabled === "boolean") {
        setLookupEnabled(custom.detail.enabled);
      }
    };
    const onTriggerLookup = (e: Event) => {
      const custom = e as CustomEvent<{ text?: string }>;
      const text =
        custom.detail?.text?.trim() ||
        window.getSelection()?.toString().trim() ||
        "";
      if (text && text.length >= 1 && text.length <= 120) {
        openLookupModal(text);
      }
    };
    window.addEventListener("app:selection-lookup-toggle", onToggle);
    window.addEventListener("app:trigger-selection-lookup", onTriggerLookup);
    return () => {
      window.removeEventListener("app:selection-lookup-toggle", onToggle);
      window.removeEventListener(
        "app:trigger-selection-lookup",
        onTriggerLookup,
      );
    };
  }, [openLookupModal]);

  const update = (change: (a: Attempt) => Attempt) => {
    refreshSession();
    const a = getSession();
    if (a && a.id === active?.id && a.status === "in_progress")
      setSession(change(a));
  };

  // Chọn đáp án dùng chung cho chuột/chạm và phím 1–4
  const selectOption = (questionId: string, opt: number, singleUnit: boolean) => {
    if (active?.mode === "drill") {
      update((a) => {
        const next = answer(a, questionId, opt);
        return singleUnit
          ? { ...next, committed: [...new Set([...next.committed, questionId])] }
          : next;
      });
      if (singleUnit) {
        setExpanded((prev) =>
          prev.includes(questionId) ? prev : [...prev, questionId],
        );
      }
    } else {
      update((a) => answer(a, questionId, opt));
    }
  };

  const goToUnit = (index: number) => {
    update((a) => ({ ...a, position: index }));
    window.scrollTo({ top: 0 });
  };

  // Phím tắt trong lượt đang làm (JL-01): đăng ký một lần, không bỏ qua radio
  useAttemptKeyboard(
    Boolean(active && active.status === "in_progress" && current),
    (e) => {
      if (!active || active.status !== "in_progress" || !current || lookup)
        return false;
      if (["1", "2", "3", "4"].includes(e.key)) {
        if (current.questions.length !== 1) return false;
        const q = current.questions[0];
        if (active.committed.includes(q.id)) return false;
        selectOption(q.id, Number(e.key), true);
        return true;
      }
      if (e.key === "ArrowLeft") {
        if (active.position <= 0) return false;
        goToUnit(active.position - 1);
        return true;
      }
      if (
        e.key === "ArrowRight" ||
        (e.key === "Enter" &&
          active.mode === "drill" &&
          current.questions.every((q) => !!active.answers[q.id]))
      ) {
        if (active.position >= groups.length - 1) return false;
        goToUnit(active.position + 1);
        return true;
      }
      if ((e.key === "f" || e.key === "F") && current.questions.length === 1) {
        const q = current.questions[0];
        update((a) => ({
          ...a,
          flags: a.flags.includes(q.id)
            ? a.flags.filter((id) => id !== q.id)
            : [...a.flags, q.id],
        }));
        return true;
      }
      return false;
    },
  );

  if (!exam)
    return (
      <div className="exam-shell">
        <div className="exam-card space-y-3">
          <h1 className="text-xl font-black">Không tìm thấy bài</h1>
          <Link className="exam-primary" to="/exams/jlpt">
            Về kho JLPT
          </Link>
        </div>
      </div>
    );

  // Sync handlers for Mondai selection (FIX-02: Cho phép bỏ chọn hết về 0 câu)
  const handleSelectDropdownChange = (val: string) => {
    setSelected(val);
    if (val === "all") {
      setSelectedMondais(exam.mondais.map((m) => m.number));
    } else if (val === "none") {
      setSelectedMondais([]);
    } else {
      const num = Number(val);
      if (Number.isFinite(num)) {
        setSelectedMondais([num]);
      }
    }
  };

  const toggleMondaiNumber = (num: number) => {
    setSelectedMondais((prev) => {
      const exists = prev.includes(num);
      const next = exists
        ? prev.filter((x) => x !== num)
        : [...prev, num].sort((a, b) => a - b);

      if (next.length === exam.mondais.length) {
        setSelected("all");
      } else if (next.length === 1) {
        setSelected(String(next[0]));
      } else if (next.length === 0) {
        setSelected("none");
      } else {
        setSelected("custom");
      }
      return next;
    });
  };

  const selectMondaiGroup = (nums: number[]) => {
    setSelectedMondais(nums);
    if (nums.length === exam.mondais.length) {
      setSelected("all");
    } else if (nums.length === 1) {
      setSelected(String(nums[0]));
    } else if (nums.length === 0) {
      setSelected("none");
    } else {
      setSelected("custom");
    }
  };

  const activeMondaiNums = selectedMondais;
  const setupSourceExam = exam.isPracticePool ? catalogExam || exam : exam;

  // FIX-02 & FIX-03: PlannedRound duy nhất cho cả Preview và Bắt đầu (không bị đổi khi re-render hay timer tick)
  const plannedRound: PlannedRound = (() => {
    const planMode: "drill" | "mock" = mode === "mock" ? "mock" : "drill";
    const config = {
      mode: planMode,
      mondais: activeMondaiNums,
      allocationMode,
      totalCount:
        roundSize === "all" ? ("all" as const) : Number(roundSize) || 20,
      perMondaiCount,
      dayFilter,
    };
    const key = buildPlannedRoundKey(setupSourceExam, config);
    if (plannedRoundRef.current && plannedRoundRef.current.configKey === key) {
      return plannedRoundRef.current;
    }
    const nextPlan = planPracticeRound(setupSourceExam, config);
    plannedRoundRef.current = nextPlan;
    return nextPlan;
  })();

  const start = async (
    nextMode: "drill" | "mock",
    ids?: string[],
    promptText?: string,
    expectedConfigKey?: string,
  ) => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      const source = exam.isPracticePool ? catalogExam || exam : exam;
      const planAtClick =
        ids !== undefined
          ? null
          : nextMode === "mock" && mode !== "mock"
            ? planPracticeRound(source, { mode: "mock" })
            : plannedRound;

      if (planAtClick && !planAtClick.canStart) {
        return;
      }

      refreshSession();
      if (
        getSession() &&
        !(await ask(
          promptText ||
            "Bắt đầu lượt mới sẽ thay bài làm hoặc kết quả hiện tại trong tab này. Tiếp tục?",
        ))
      ) {
        return;
      }

      if (expectedConfigKey) {
        const currentKey = buildPlannedRoundKey(source, {
          mode: nextMode,
          mondais: activeMondaiNums,
          allocationMode,
          totalCount:
            roundSize === "all" ? ("all" as const) : Number(roundSize) || 20,
          perMondaiCount,
          dayFilter,
        });
        if (currentKey !== expectedConfigKey) {
          return;
        }
      }

      const picked =
        ids !== undefined
          ? ids
          : source.isPracticePool
            ? planAtClick?.questionIds
            : nextMode === "drill"
              ? planAtClick?.questionIds
              : undefined;

      const snapshot =
        source.isPracticePool && picked
          ? practiceSnapshot(source, picked)
          : source;
      setSession(createAttempt(snapshot, nextMode, picked));
      plannedRoundRef.current = null;
      setConfiguring(false);
      setReviewing(false);
      setFilter("all");
      setExpanded([]);
      navigate(`/exams/jlpt/${exam.id}/${nextMode}`);
    } finally {
      startingRef.current = false;
    }
  };

  const remove = async () => {
    const wasPoolMock = exam.isPracticePool && active?.mode === "mock";
    if (await ask("Kết thúc và xóa bài/kết quả tạm trong tab này?")) {
      setSession(null);
      navigate(
        wasPoolMock
          ? "/exams/jlpt"
          : `/exams/jlpt/${exam.id}${exam.isPracticePool ? "/drill" : ""}`,
      );
    }
  };

  const submit = async () => {
    const a = getSession();
    if (!a || a.id !== active?.id) return;
    const blank = questions(a).filter((q) => !a.answers[q.id]).length;
    if (
      await ask(
        `Nộp bài? ${blank} câu bỏ trống, ${a.flags.length} câu đánh dấu. Kết quả sẽ khóa sau nộp.`,
      )
    ) {
      refreshSession();
      const latest = getSession();
      if (latest?.id === a.id) setSession(finish(latest));
      setReviewing(false);
      navigate(`/exams/jlpt/${exam.id}/result`);
    }
  };

  const showGroup = (
    unit: (typeof groups)[number],
    reading = false,
    showMondaiHeader = true,
    mondaiQuestionCount?: number,
    matchedIds?: Set<string>,
  ) => {
    const passage = unit.mondai.passages?.find(
      (p) => p.id === unit.questions[0].passageId,
    );
    const unitQuestionIds = unit.questions.map((q) => q.id);
    return (
      <section key={unit.id} className="space-y-4">
        {/* Mondai Instruction Banner (B3: Chỉ hiển thị ở đầu mỗi Mondai khi xem danh sách dài) */}
        {showMondaiHeader && (
          <div className="exam-card bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/50 dark:from-indigo-950/40 dark:via-slate-800 dark:to-slate-800 border-l-4 border-l-indigo-600">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-black text-base sm:text-lg text-indigo-950 dark:text-indigo-200">
                Mondai {unit.mondai.number} · {unit.mondai.titleVi}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300">
                {mondaiQuestionCount ?? unit.questions.length} câu trong mục này
              </span>
            </div>
            <p
              lang="ja"
              className="mt-2 leading-7 text-slate-700 dark:text-slate-200 font-medium"
            >
              <ExamText text={unit.mondai.instruction} />
            </p>
          </div>
        )}

        {/* Reading / Text Grammar Passage */}
        {passage && (
          <article className="exam-card border-2 border-indigo-200/80 dark:border-indigo-800/60 bg-amber-50/20 dark:bg-slate-800/90 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-700">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-600" />
                <span>
                  Đoạn văn · câu{" "}
                  {unit.questions.map((q) => q.number).join(", ")}
                </span>
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Bôi đen chữ bất kỳ để tra từ
              </span>
            </div>

            {exam.delivery !== "text" && passage.sourceImage ? (
              <div>
                <SourceImage
                  src={passage.sourceImage}
                  alt="Đoạn văn và chú thích nguyên bản"
                />
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold">
                    Văn bản nhận dạng — đang đối chiếu
                  </summary>
                  <p className="whitespace-pre-wrap">{passage.text}</p>
                </details>
              </div>
            ) : (
              <div
                lang="ja"
                data-exam-selectable
                className="select-text text-lg leading-[1.95] font-medium text-slate-900 dark:text-slate-100"
              >
                <ExamText text={passage.text} />
              </div>
            )}

            {exam.delivery === "text" && passage.sourceImage && (
              <details className="mt-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
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
                className="select-text mt-3 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 text-sm leading-7"
              >
                {exam.enrichmentStatus !== "reviewed" ||
                (mode === "mock" && !reading)
                  ? n.replace(/\([^)]*[A-Za-zÀ-ỹ][^)]*\)/g, "")
                  : n}
              </p>
            ))}

            {reading && passage.translationVi && (
              <details className="mt-4 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-sm">
                <summary className="cursor-pointer font-bold text-emerald-800 dark:text-emerald-300">
                  Bản dịch tham khảo
                </summary>
                <p className="whitespace-pre-wrap leading-7 mt-2">
                  {passage.translationVi}
                </p>
              </details>
            )}
          </article>
        )}

        {/* Questions in Unit */}
        {unit.questions.map((q) => {
          const checked = !!active?.committed.includes(q.id);
          const isContextOnly = Boolean(matchedIds && !matchedIds.has(q.id));
          return (
            <ExamQuestionCard
              key={q.id}
              sequenceNumber={questionSeqMap.get(q.id)}
              totalQuestions={totalQuestionsInView}
              contextRole={isContextOnly ? "context_only" : "matched"}
              question={
                exam.enrichmentStatus === "reviewed"
                  ? q
                  : {
                      ...q,
                      translationVi: undefined,
                      explanation:
                        q.explanationStatus === "authored"
                          ? q.explanation
                          : undefined,
                      sentenceBreakdown: undefined,
                      order:
                        q.explanationStatus === "authored"
                          ? q.order
                          : undefined,
                    }
              }
              mode={mode === "review" ? "review" : active?.mode || "review"}
              userAnswer={active?.answers[q.id]}
              showFeedback={reading || checked}
              locked={reading || checked}
              expanded={expanded.includes(q.id)}
              onExpand={() =>
                setExpanded((v) =>
                  v.includes(q.id)
                    ? v.filter((id) => id !== q.id)
                    : [...v, q.id],
                )
              }
              isFlagged={active?.flags.includes(q.id)}
              onToggleFlag={
                active?.status === "in_progress"
                  ? () =>
                      update((a) => ({
                        ...a,
                        flags: a.flags.includes(q.id)
                          ? a.flags.filter((id) => id !== q.id)
                          : [...a.flags, q.id],
                      }))
                  : undefined
              }
              onSelectOption={(opt) =>
                selectOption(q.id, opt, unit.questions.length === 1)
              }
              onAssist={() => {
                if (!reading && active?.status === "in_progress") {
                  recordAssistForQuestions(active.id, unitQuestionIds);
                }
              }}
              onWordLookup={(word) => {
                openLookupModal(
                  word,
                  !reading && active?.status === "in_progress"
                    ? unitQuestionIds
                    : [],
                );
              }}
              onNextQuestion={
                !reading &&
                active?.mode === "drill" &&
                unit.questions.length === 1 &&
                active.position < groups.length - 1
                  ? () => {
                      update((a) => ({ ...a, position: a.position + 1 }));
                      window.scrollTo({ top: 0 });
                    }
                  : undefined
              }
            />
          );
        })}
      </section>
    );
  };

  const remaining = active?.deadlineAt
    ? Math.max(0, Math.ceil((active.deadlineAt - now) / 1000))
    : 0;

  // FIX-06: Đồng bộ danh sách câu hiển thị và mục lục chuyển nhanh (Quick-Jump TOC)
  const isDirectFilterMatch = (q: JLPTQuestion) =>
    filter === "all" ||
    (filter === "wrong" &&
      !!active?.answers[q.id] &&
      active.answers[q.id] !== q.answer) ||
    (filter === "blank" && !active?.answers[q.id]) ||
    (filter === "flags" && Boolean(active?.flags.includes(q.id)));

  const matchedQuestionIds = new Set(
    mode === "review"
      ? units(exam)
          .filter(
            (g) => selected === "all" || String(g.mondai.number) === selected,
          )
          .flatMap((g) => g.questions.map((q) => q.id))
      : groups
          .flatMap((g) => g.questions)
          .filter(isDirectFilterMatch)
          .map((q) => q.id),
  );

  const displayedUnits =
    mode === "review"
      ? units(exam).filter(
          (g) => selected === "all" || String(g.mondai.number) === selected,
        )
      : groups.filter((g) =>
          g.questions.some((q) => matchedQuestionIds.has(q.id)),
        );

  const displayedQuestions = displayedUnits.flatMap((g) => g.questions);
  const filterLabelVi =
    filter === "wrong"
      ? "sai"
      : filter === "blank"
        ? "bỏ trống"
        : filter === "flags"
          ? "chưa chắc"
          : "";

  const hashQuestionId = location.hash.startsWith("#q-")
    ? decodeURIComponent(location.hash.slice(3))
    : null;
  const hashExistsInExam = hashQuestionId
    ? questionSeqMap.has(hashQuestionId)
    : false;
  const hashIsDisplayed = hashQuestionId
    ? displayedQuestions.some((q) => q.id === hashQuestionId)
    : false;

  const retry = async (kind: string) => {
    if (!active) return;
    const ids = questions(active)
      .filter((q) =>
        kind === "wrong"
          ? !!active.answers[q.id] && active.answers[q.id] !== q.answer
          : kind === "blank"
            ? !active.answers[q.id]
            : active.flags.includes(q.id),
      )
      .map((q) => q.id);
    if (!ids.length) return;
    const count = units(exam, ids).flatMap((u) => u.questions).length;
    await start(
      "drill",
      ids,
      `${ids.length} câu cần ôn, ${count} câu thực hành để giữ ngữ cảnh. Lượt mới sẽ thay kết quả hiện tại. Tiếp tục?`,
    );
  };

  // Live drill stats (chỉ tính các câu đã khóa/chốt: câu đơn chốt ngay khi chọn, nhóm đoạn văn chốt khi bấm Kiểm tra nhóm)
  const liveDrillStats = (() => {
    if (!active) return { right: 0, wrong: 0 };
    const allQs = questions(active);
    let right = 0;
    let wrong = 0;
    for (const q of allQs) {
      if (active.committed.includes(q.id)) {
        if (active.answers[q.id] === q.answer) right++;
        else wrong++;
      }
    }
    return { right, wrong };
  })();

  const standardScore =
    active && submitted && isStandardExamStructure(active)
      ? computeStandardJLPTScore(active)
      : null;

  const nextEmphasis = Boolean(
    active?.mode === "drill" &&
      current &&
      current.questions.every((q) => !!active.answers[q.id]),
  );
  const jumpToQuestion = (unitIdx: number, questionId: string) => {
    update((a) => ({ ...a, position: unitIdx }));
    setTimeout(() => {
      document
        .getElementById(`q-${questionId}`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 0);
  };
  const attemptMenuItems: AttemptMenuItem[] = active
    ? [
        {
          key: "info",
          label: "Thông tin bài",
          onSelect: () => setShowInfo(true),
        },
        ...(exam.isPracticePool && active.mode === "drill"
          ? [
              {
                key: "config",
                label: "Đổi dạng / số câu",
                onSelect: () => {
                  setConfiguring(true);
                  navigate(`/exams/jlpt/${exam.id}/drill`);
                },
              },
            ]
          : []),
        ...(lookupAllowed
          ? [
              {
                key: "tools",
                label: "Tiện ích học tập",
                onSelect: () =>
                  window.dispatchEvent(
                    new CustomEvent("app:open-study-tools", {
                      detail: { tab: "lookup" },
                    }),
                  ),
              },
            ]
          : []),
        {
          key: "remove",
          label: "Kết thúc và xóa phiên",
          danger: true,
          onSelect: () => void remove(),
        },
      ]
    : [];
  const attemptDisplayTitle = attempt ? describeAttempt(attempt, now).title : "";

  const headerTitle =
    exam.isPracticePool && (mode === "mock" || active?.mode === "mock")
      ? "Bài làm có giờ · Chữ · Từ vựng · Ngữ pháp (54 câu)"
      : exam.title;

  return (
    <div className="exam-shell">
      {confirmation}

      {/* Thanh phiên: chỉ hiện khi trang đang xem không phải chính lượt trong tab (JL-14) */}
      {attempt && !(active && active.id === attempt.id) && (
        <div className="exam-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4 border-2 border-indigo-500/80 dark:border-indigo-500/70 bg-indigo-50/50 dark:bg-slate-800/90">
          <div className="min-w-0 flex-1 w-full sm:w-auto space-y-0.5">
            <p
              title={attemptDisplayTitle}
              className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 line-clamp-2 break-words"
            >
              Trong tab: {attemptDisplayTitle}
            </p>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {attempt.status === "submitted" ? "Đã nộp" : "Đang làm"} ·{" "}
              {Object.keys(attempt.answers).length}/
              {attempt.questionIds.length} câu
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            {(configuring || !active) && (
              <Link
                className="exam-primary !py-2 !px-3.5 min-h-11 text-xs flex-1 sm:flex-initial"
                to={`/exams/jlpt/${attempt.exam.id}/${attempt.status === "submitted" ? "result" : attempt.mode}`}
                onClick={() => setConfiguring(false)}
              >
                {attempt.status === "submitted" ? "Xem kết quả" : "Làm tiếp"}
              </Link>
            )}
            {exam.isPracticePool &&
              !configuring &&
              (mode === "drill" || active?.mode === "drill") && (
                <button
                  type="button"
                  className="exam-secondary !py-2 !px-3 min-h-11 text-xs flex-1 sm:flex-initial"
                  onClick={() => {
                    setConfiguring(true);
                    navigate(`/exams/jlpt/${exam.id}/drill`);
                  }}
                >
                  Đổi dạng / số câu
                </button>
              )}
            <button
              type="button"
              className="exam-secondary !py-2 !px-3 min-h-11 text-xs flex-1 sm:flex-initial"
              onClick={remove}
            >
              Kết thúc và xóa phiên
            </button>
          </div>
        </div>
      )}

      {/* B1: Compact Header when in_progress so Question 1 is visible above the fold on mobile */}
      {active?.status === "in_progress" ? (
        <header className="mb-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Link
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white shrink-0 transition-colors"
                to="/exams/jlpt"
              >
                ← Kho JLPT
              </Link>
              <h1
                title={headerTitle}
                className="text-sm sm:text-base font-black text-white truncate"
              >
                {headerTitle}
              </h1>
            </div>
          </div>
        </header>
      ) : (
        <header className="mb-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors"
              to="/exams/jlpt"
            >
              ← Kho JLPT
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {exam.isPracticePool && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-400/20 border border-emerald-300/40 text-emerald-100">
                  Ngân hàng 20 ngày · 1.080 câu
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/15 text-indigo-100">
                {active?.mode === "mock" ? labels.mock : labels[mode]}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-200">
              {exam.level} · Chữ Hán · Từ vựng · Ngữ pháp
            </p>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-white">
              {headerTitle}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-indigo-100 mt-1.5">
              {exam.bookTitle} · Bôi đen từ tiếng Nhật bất kỳ để tra từ đa sách
            </p>
          </div>
        </header>
      )}

      <p
        role="status"
        className={`text-xs font-medium mb-3 empty:hidden ${
          noticeKind === "warning"
            ? "text-amber-700 dark:text-amber-300"
            : "text-slate-600 dark:text-slate-400"
        }`}
      >
        {notice}
      </p>

      {active &&
        catalogExam &&
        (active.exam.contentRevision || 0) <
          (catalogExam.contentRevision || 0) && (
          <p className="exam-card mb-4 text-sm border-amber-300 dark:border-amber-700">
            Bài trong tab đang giữ phiên bản nội dung cũ. Kết thúc lượt này rồi
            bắt đầu lượt mới để xem lời giải mới nhất.
          </p>
        )}

      {/* Mode 1: Trang chi tiết bài (JL-28) */}
      {mode === "detail" && (
        <div className="space-y-5">
          <div className="exam-card space-y-3">
            <h2 className="text-xl font-black">Cấu trúc bài</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {exam.bookTitle}
              {exam.subtitle?.match(/Trang\s*[\d–-]+/)?.[0]
                ? ` · ${exam.subtitle.match(/Trang\s*[\d–-]+/)![0]}`
                : ""}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <th className="py-2 pr-3">Mondai</th>
                    <th className="py-2 pr-3">Dạng</th>
                    <th className="py-2 text-right">Số câu</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.mondais.map((m) => (
                    <tr
                      key={m.number}
                      className="border-t border-slate-100 dark:border-slate-700/70"
                    >
                      <td className="py-2 pr-3 font-bold">{m.number}</td>
                      <td className="py-2 pr-3">
                        {m.titleVi}{" "}
                        <span lang="ja" className="text-slate-500 dark:text-slate-400">
                          {m.title}
                        </span>
                      </td>
                      <td className="py-2 text-right">{m.questions.length}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-black">
                    <td className="py-2 pr-3" colSpan={2}>
                      Tổng
                    </td>
                    <td className="py-2 text-right">
                      {exam.totalQuestions} câu · {exam.timeLimitMinutes} phút
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {attempt && attempt.exam.id === exam.id && (
            <div className="exam-card flex flex-wrap items-center justify-between gap-3 border-indigo-300 dark:border-indigo-700">
              <p className="text-sm font-bold">
                {describeAttempt(attempt, now).title} ·{" "}
                {describeAttempt(attempt, now).status}
              </p>
              <Link
                className="exam-primary"
                to={`/exams/jlpt/${attempt.exam.id}/${attempt.status === "submitted" ? "result" : attempt.mode}`}
              >
                {attempt.status === "submitted" ? "Xem kết quả" : "Làm tiếp"}
              </Link>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["drill", "Chọn dạng, chữa từng câu ngay"],
                ["mock", `${exam.totalQuestions} câu, ${exam.timeLimitMinutes} phút, kết quả theo số câu đúng`],
                ["review", "Đọc đề và đáp án, không tính điểm"],
              ] as const
            ).map(([m, desc]) => (
              <div key={m} className="exam-card flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-black text-lg">{labels[m]}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {desc}
                  </p>
                </div>
                <Link
                  className={m === "mock" ? "exam-primary" : "exam-secondary"}
                  to={`/exams/jlpt/${m === "drill" ? poolId(exam.bookId || exam.id, exam.level) : exam.id}/${m}${m === "drill" && exam.day ? `?day=${exam.day}` : ""}`}
                >
                  {labels[m]}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode 2: Drill & Mock Setup Screen */}
      {(mode === "drill" || mode === "mock") && !active && (
        <div className="exam-card space-y-6">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-700/70">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Chuẩn bị {labels[mode].toLowerCase()}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {mode === "mock"
                ? exam.isPracticePool
                  ? "Bài luyện bấm giờ Chữ Hán · Từ vựng · Ngữ pháp (54 câu · 50 phút) rút ngẫu nhiên từ toàn bộ ngân hàng 20 ngày."
                  : "Làm trọn vẹn bài Chữ Hán · Từ vựng · Ngữ pháp (54 câu · 50 phút), giữ lựa chọn đến khi nộp bài hoặc hết giờ."
                : "Chọn dạng bài (Mondai) rồi bấm Bắt đầu luyện. Câu đơn chấm và mở lời giải ngay; nhóm đoạn văn kiểm tra theo cụm."}
            </p>
          </div>

          {mode === "drill" && (
            <div className="space-y-5">
              {/* Step 1: Select Mondai */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Chọn dạng bài (Mondai) muốn ôn
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      aria-pressed={
                        activeMondaiNums.length === exam.mondais.length
                      }
                      onClick={() => selectMondaiGroup(ALL_MONDAI_NUMBERS)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        activeMondaiNums.length === exam.mondais.length
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      ✓ Tất cả 9 dạng
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.join(",") === "1,2"}
                      onClick={() => selectMondaiGroup([1, 2])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        activeMondaiNums.join(",") === "1,2"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50"
                      }`}
                    >
                      Chữ Hán (M1–2)
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.join(",") === "3,4,5,6"}
                      onClick={() => selectMondaiGroup([3, 4, 5, 6])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        activeMondaiNums.join(",") === "3,4,5,6"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50"
                      }`}
                    >
                      Từ vựng (M3–6)
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.join(",") === "7,8,9"}
                      onClick={() => selectMondaiGroup([7, 8, 9])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        activeMondaiNums.join(",") === "7,8,9"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50"
                      }`}
                    >
                      Ngữ pháp (M7–9)
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.length === 0}
                      onClick={() => selectMondaiGroup([])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        activeMondaiNums.length === 0
                          ? "bg-rose-600 text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-rose-50"
                      }`}
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {/* Bài theo ngày dùng ô chọn; ngân hàng dùng lưới thẻ Mondai bên dưới (JL-32) */}
                {!exam.isPracticePool && (
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Chọn dạng
                  <select
                    className="exam-input block mt-1.5 w-full"
                    value={selected}
                    onChange={(e) => handleSelectDropdownChange(e.target.value)}
                  >
                    <option value="all">
                      {exam.isPracticePool
                        ? "Trộn tất cả dạng"
                        : "Toàn bộ ngày"}
                    </option>
                    {exam.mondais.map((m) => (
                      <option key={m.number} value={m.number}>
                        Mondai {m.number} · {m.titleVi}
                      </option>
                    ))}
                    <option value="none">Chưa chọn dạng nào</option>
                    <option value="custom">Tùy chọn nhiều dạng</option>
                  </select>
                </label>
                )}

                {/* Interactive Multi-select Mondai Cards Grid (Clean 9-card 3x3 layout) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {exam.mondais.map((m) => {
                    const isChecked = activeMondaiNums.includes(m.number);
                    const stdQuota = STANDARD_MONDAI_QUOTAS[m.number] ?? 5;
                    return (
                      <button
                        key={m.number}
                        type="button"
                        aria-pressed={isChecked}
                        onClick={() => toggleMondaiNumber(m.number)}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-start justify-between gap-2 ${
                          isChecked
                            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 text-slate-900 dark:text-white shadow-2xs"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                            Mondai {m.number} · Chuẩn đề: {stdQuota} câu
                          </p>
                          <p className="text-xs sm:text-sm font-bold truncate">
                            {m.titleVi}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Kho: {m.questions.length} câu
                          </p>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                            isChecked
                              ? "bg-indigo-600 text-white"
                              : "border border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isChecked ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible Advanced Options (Source Day & Allocation Mode) */}
              {exam.isPracticePool && (
                <details
                  open={advancedOpen}
                  onToggle={(e) =>
                    setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)
                  }
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-4"
                >
                  <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                    <span>
                      Tùy chọn nâng cao (Giới hạn theo ngày & Cách chia số câu)
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 normal-case">
                      {dayFilter === "all"
                        ? "Toàn bộ 20 ngày"
                        : `Ngày ${dayFilter}`}{" "}
                      ·{" "}
                      {allocationMode === "standard"
                        ? "Tỷ lệ chuẩn đề"
                        : allocationMode === "total"
                          ? `Tổng ${roundSize === "all" ? "tất cả" : `${roundSize} câu`}`
                          : `${perMondaiCount} câu/dạng`}
                    </span>
                  </summary>

                  <div className="space-y-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70">
                    {/* Source Scope (Full Bank vs Specific Day) */}
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Nguồn câu hỏi
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDayFilter("all");
                              setShowDayPicker(false);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dayFilter === "all" && !showDayPicker
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            Toàn bộ 20 ngày (1.080 câu)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDayPicker(true);
                              if (dayFilter === "all") setDayFilter(1);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dayFilter !== "all" || showDayPicker
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {dayFilter !== "all"
                              ? `Đang chọn: Ngày ${dayFilter}`
                              : "Theo từng Ngày cụ thể"}
                          </button>
                        </div>
                      </div>

                      {(showDayPicker || dayFilter !== "all") && (
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 flex flex-wrap gap-1.5">
                          {Array.from({ length: 20 }, (_, i) => i + 1).map(
                            (d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDayFilter(d)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                  dayFilter === d
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                }`}
                              >
                                Ngày {d}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    {/* Allocation Mode */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                        Cách phân bổ số lượng câu hỏi
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setAllocationMode("standard")}
                          className={`p-3 rounded-2xl border text-left transition-all space-y-1 ${
                            allocationMode === "standard"
                              ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <p className="font-black text-xs text-slate-900 dark:text-white">
                            🎯 Theo tỷ lệ chuẩn đề (Mặc định)
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Đủ 9 Mondai = 54 câu theo cấu trúc phần từ vựng –
                            ngữ pháp.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAllocationMode("total")}
                          className={`p-3 rounded-2xl border text-left transition-all space-y-1 ${
                            allocationMode === "total"
                              ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <p className="font-black text-xs text-slate-900 dark:text-white">
                            📊 Theo tổng số câu mỗi lượt
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Chọn tổng 10, 20, 50 câu hoặc toàn bộ kho.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAllocationMode("per_mondai")}
                          className={`p-3 rounded-2xl border text-left transition-all space-y-1 ${
                            allocationMode === "per_mondai"
                              ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <p className="font-black text-xs text-slate-900 dark:text-white">
                            🔢 Số câu bằng nhau mỗi Mondai
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Lấy cố định 5, 10, 15 hoặc 20 câu cho mỗi dạng đã
                            chọn.
                          </p>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        {allocationMode === "total" && (
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                          Số câu mỗi lượt
                          <select
                            className="exam-input !py-1.5"
                            value={roundSize}
                            onChange={(e) => setRoundSize(e.target.value)}
                          >
                            {["10", "20", "50", "all"].map((n) => (
                              <option key={n} value={n}>
                                {n === "all"
                                  ? "Tất cả câu phù hợp"
                                  : `${n} câu`}
                              </option>
                            ))}
                          </select>
                        </label>
                        )}

                        {allocationMode === "per_mondai" && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              Số câu mỗi dạng:
                            </span>
                            {[5, 10, 15, 20].map((cnt) => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => setPerMondaiCount(cnt)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  perMondaiCount === cnt
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {cnt} câu/dạng
                              </button>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-slate-500 dark:text-slate-400 flex-1">
                          Có {plannedRound.eligibleCount} câu phù hợp /{" "}
                          {plannedRound.bankTotal} câu trong ngân hàng.
                        </p>
                      </div>
                    </div>
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Summary Preview Box before starting (FIX-02 & FIX-03) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0 w-full sm:flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-lg text-slate-900 dark:text-white">
                  {mode === "drill"
                    ? plannedRound.reason === "passage_expanded"
                      ? `Mục tiêu: ${plannedRound.targetTotal} câu · Lượt này: ${plannedRound.actualTotal} câu`
                      : `Lượt này: ${plannedRound.actualTotal} câu`
                    : `Lượt này: ${plannedRound.actualTotal} câu · ${exam.timeLimitMinutes || 50} phút`}
                </p>
                <span
                  className={`w-fit px-2.5 py-0.5 rounded-xl text-xs font-extrabold ${
                    mode === "mock"
                      ? "bg-indigo-600 text-white"
                      : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {mode === "mock"
                    ? "⏱ Làm bài có giờ · Kết quả theo số câu đúng"
                    : "⚡ Câu đơn chấm ngay · Đoạn văn kiểm tra theo cụm"}
                </span>
              </div>

              {plannedRound.reasonMessage && (
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  {plannedRound.reasonMessage}
                </p>
              )}

              {plannedRound.mondaiDistribution.length > 0 && (
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Phân bổ:{" "}
                  {plannedRound.mondaiDistribution
                    .map((d) => `M${d.mondai}: ${d.count}`)
                    .join(" · ")}
                </p>
              )}

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {mode === "mock"
                  ? "Đồng hồ 50 phút chạy ngay khi bắt đầu. Rời trang không tạm dừng thời gian."
                  : "Câu độc lập khóa và mở lời giải ngay khi chọn; nhóm câu chung đoạn văn giữ lựa chọn nháp cho đến khi bấm Kiểm tra nhóm."}
              </p>
            </div>

            <button
              type="button"
              className="exam-primary !px-6 !py-3 text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                !plannedRound.canStart ||
                (mode === "mock" && !exam.timeLimitMinutes)
              }
              onClick={() =>
                start(
                  mode,
                  plannedRound.questionIds,
                  undefined,
                  plannedRound.configKey,
                )
              }
            >
              <Play size={17} />
              <span>Bắt đầu {mode === "mock" ? "làm bài" : "luyện"}</span>
            </button>
          </div>

          {/* Thanh Bắt đầu dính đáy trên điện thoại (JL-07) */}
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {plannedRound.actualTotal} câu
            </span>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              className="exam-primary !px-5"
              disabled={
                !plannedRound.canStart ||
                (mode === "mock" && !exam.timeLimitMinutes)
              }
              onClick={() =>
                start(
                  mode,
                  plannedRound.questionIds,
                  undefined,
                  plannedRound.configKey,
                )
              }
            >
              <Play size={15} />
              <span>Bắt đầu</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Result Screen */}
      {mode === "result" && !submitted && (
        <div className="exam-card">
          Không có kết quả của bài này trong tab hiện tại.{" "}
          <Link
            className="text-indigo-600 dark:text-indigo-400 font-bold underline"
            to="/exams/jlpt"
          >
            Về kho JLPT
          </Link>
        </div>
      )}

      {result && (
        <section className="exam-card mb-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/70">
            <div>
              <span className="exam-eyebrow">
                {standardScore
                  ? "Kết quả bài luyện Chữ Hán · Từ vựng · Ngữ pháp (54 câu)"
                  : "Kết quả lượt ôn tập tùy chỉnh"}
              </span>
              <h2 className="text-2xl font-black mt-2 text-slate-900 dark:text-white">
                Kết quả hiện tại {active?.reason === "timeout" ? "· Hết giờ" : ""}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(active?.assisted.length || 0) > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-700 dark:text-amber-300">
                  Có dùng trợ giúp ({active?.assisted.length} câu)
                </span>
              )}
              {active?.mode === "mock" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Clock size={14} className="text-indigo-500" />
                  <span>
                    Thời gian:{" "}
                    {Math.floor(
                      ((active.endedAt || now) - active.createdAt) / 60000,
                    )}{" "}
                    phút
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* 4 Core Stat Cards (Primary Result Metrics) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Đúng", result.correct, "text-emerald-600 dark:text-emerald-400"],
              ["Sai", result.wrong, "text-rose-600 dark:text-rose-400"],
              ["Bỏ trống", result.blank, "text-amber-600 dark:text-amber-400"],
              [
                "Tỷ lệ",
                `${result.percent}%`,
                "text-indigo-600 dark:text-indigo-400",
              ],
            ].map(([label, v, color]) => (
              <div
                key={label}
                className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                <strong className={`text-2xl sm:text-3xl font-black ${color}`}>
                  {v}
                </strong>
              </div>
            ))}
          </div>

          {/* Internal Reference Scaled Score Panel when full 54-question structure */}
          {standardScore ? (
            <div className="p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-indigo-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    Điểm quy đổi tham khảo nội bộ (Chữ Hán · Từ vựng · Ngữ pháp):{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400 text-base sm:text-lg">
                      {standardScore.scaledScore}/60
                    </strong>
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Từ vựng (M1–6): {standardScore.vocabCorrect}/
                  {standardScore.vocabTotal} · Ngữ pháp (M7–9):{" "}
                  {standardScore.grammarCorrect}/{standardScore.grammarTotal}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Đây là điểm luyện tập quy đổi tuyến tính nội bộ (Mondai 9 nhân
                trọng số 2) để theo dõi mức độ nắm vững kiến thức ngôn ngữ; kỳ
                thi JLPT chính thức chấm điểm chuẩn hóa theo mô hình thống kê và
                gộp chung phần Đọc hiểu trong 105 phút.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 font-medium">
              ⚡ Lượt ôn tập tự do ({result.total} câu) · Đánh giá trực tiếp theo
              số câu Đúng / Sai và tỷ lệ từng dạng bài bên dưới.
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {active?.assisted.length || 0} câu đã dùng trợ giúp trước khi chốt đáp
            án. Kết quả chỉ giữ trong tab, không ghi vào tài khoản.
          </p>

          {/* Per-Mondai Accuracy Progress Bars */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Thống kê chi tiết theo từng dạng (Mondai)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {exam.mondais.map((m) => {
                const qs = m.questions.filter((q) =>
                  active?.questionIds.includes(q.id),
                );
                if (!qs.length) return null;
                const rightCount = qs.filter(
                  (q) => active?.answers[q.id] === q.answer,
                ).length;
                const pct = Math.round((rightCount / qs.length) * 100);
                return (
                  <div
                    key={m.number}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Mondai {m.number} · {m.titleVi}: {rightCount}/
                        {qs.length}
                      </p>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 70
                            ? "bg-emerald-500"
                            : pct >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/70">
            <button
              className="exam-primary"
              onClick={() => {
                // JL-15: chỉ mở danh sách, không tự mở lời giải nào
                const next = !reviewing;
                if (next) setFilter("all");
                setReviewing(next);
              }}
            >
              <Eye size={15} />
              <span>{reviewing ? "Thu gọn bài" : "Xem lại bài"}</span>
            </button>
            <button
              className="exam-secondary"
              onClick={() => {
                // JL-15: chỉ mở lời giải của đúng các câu sai
                setFilter("wrong");
                setReviewing(true);
                setExpanded(
                  exam.mondais.flatMap((m) =>
                    m.questions
                      .filter(
                        (q) =>
                          !!active?.answers[q.id] &&
                          active.answers[q.id] !== q.answer,
                      )
                      .map((q) => q.id),
                  ),
                );
              }}
            >
              Xem câu sai
            </button>
            <button
              className="exam-secondary"
              disabled={!result.wrong}
              onClick={() => retry("wrong")}
            >
              Luyện câu sai
            </button>
            <button
              className="exam-secondary"
              disabled={!result.blank}
              onClick={() => retry("blank")}
            >
              Luyện câu bỏ trống
            </button>
            <button
              className="exam-secondary"
              disabled={!active?.flags.length}
              onClick={() => retry("flags")}
            >
              Luyện câu chưa chắc
            </button>
            <button
              className="exam-secondary"
              onClick={() => start(active!.mode)}
            >
              <RotateCcw size={14} />
              <span>
                {exam.isPracticePool
                  ? active?.mode === "mock"
                    ? "Thi đề ngẫu nhiên mới (54 câu)"
                    : "Trộn lượt mới"
                  : "Làm lại toàn bài"}
              </span>
            </button>
            <Link className="exam-secondary" to="/exams/jlpt">
              Về trang Kho JLPT
            </Link>
          </div>
        </section>
      )}

      {/* Mode 4: Lượt đang làm — thanh trên, nội dung, phiếu (aside ≥1024 px, sheet <1024 px) */}
      {active?.status === "in_progress" && current && (
        <>
          <div className="exam-toolbar justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <strong
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-black ${
                  active.mode === "mock" && remaining <= 300
                    ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse"
                    : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300"
                }`}
              >
                <Clock size={15} />
                <span>
                  {active.mode === "mock"
                    ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                    : labels.drill}
                </span>
              </strong>
              <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                {Object.keys(active.answers).length}/{active.questionIds.length}{" "}
                <span className="hidden sm:inline">đã chọn</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AttemptMenu items={attemptMenuItems} />
              <button
                className="exam-primary"
                aria-label={active.mode === "mock" ? "Nộp bài" : "Kết thúc luyện"}
                onClick={submit}
              >
                {active.mode === "mock" ? (
                  <>
                    <span className="sm:hidden">Nộp</span>
                    <span className="hidden sm:inline">Nộp bài</span>
                  </>
                ) : (
                  "Kết thúc luyện"
                )}
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="exam-card mb-4 text-sm text-slate-600 dark:text-slate-300 flex items-start justify-between gap-3">
              <p>
                {exam.level} · {exam.bookTitle} · Bôi đen từ tiếng Nhật bất kỳ
                để tra từ đa sách
              </p>
              <button
                type="button"
                className="exam-secondary !min-h-9 text-xs"
                onClick={() => setShowInfo(false)}
              >
                Đóng
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-5 min-w-0">
              {showGroup(current)}

              {active.mode === "drill" &&
                current.questions.length > 1 &&
                !current.questions.every((q) =>
                  active.committed.includes(q.id),
                ) && (
                  <button
                    className="exam-primary !from-emerald-700 !to-teal-700 w-full"
                    disabled={
                      !current.questions.every((q) => active.answers[q.id])
                    }
                    onClick={() => {
                      const currentIds = current.questions.map((q) => q.id);
                      update((a) => ({
                        ...a,
                        committed: [...new Set([...a.committed, ...currentIds])],
                      }));
                      setExpanded((prev) => [...new Set([...prev, ...currentIds])]);
                    }}
                  >
                    Kiểm tra nhóm
                  </button>
                )}

              {/* Điều hướng trên máy tính; điện thoại dùng thanh đáy */}
              <div className="exam-card hidden lg:flex flex-wrap items-center justify-between gap-3">
                <button
                  className="exam-secondary"
                  disabled={active.position === 0}
                  onClick={() => goToUnit(active.position - 1)}
                >
                  ← Trước
                </button>
                <button
                  className={nextEmphasis ? "exam-primary" : "exam-secondary"}
                  disabled={active.position >= groups.length - 1}
                  onClick={() => goToUnit(active.position + 1)}
                >
                  Tiếp / Bỏ qua →
                </button>
              </div>
            </div>

            <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20">
              <div className="exam-card">
                <QuestionPalette
                  attempt={active}
                  groups={groups}
                  seqMap={questionSeqMap}
                  stats={liveDrillStats}
                  onJump={jumpToQuestion}
                  showShortcutHint
                />
              </div>
            </aside>
          </div>

          <MobileAttemptBar
            canPrev={active.position > 0}
            canNext={active.position < groups.length - 1}
            answered={Object.keys(active.answers).length}
            total={active.questionIds.length}
            sheetOpen={sheet}
            sheetId="palette-sheet"
            emphasizeNext={nextEmphasis}
            onPrev={() => goToUnit(active.position - 1)}
            onNext={() => goToUnit(active.position + 1)}
            onPalette={() => setSheet(true)}
          />
          <BottomSheet
            open={sheet}
            id="palette-sheet"
            title="Phiếu câu hỏi"
            onClose={() => setSheet(false)}
          >
            <QuestionPalette
              attempt={active}
              groups={groups}
              seqMap={questionSeqMap}
              stats={liveDrillStats}
              onJump={(unitIdx, qid) => {
                setSheet(false);
                jumpToQuestion(unitIdx, qid);
              }}
              gridClassName=""
            />
          </BottomSheet>
        </>
      )}

      {/* Mode 5: Reference Review / Post-Submit Review (2-Column Layout) */}
      {(mode === "review" || (submitted && reviewing)) && (
        <div className="space-y-5">
          {/* Filter & Expand Controls */}
          <div className="exam-card flex flex-wrap items-center justify-between gap-3">
            <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Filter size={15} className="text-indigo-500" />
              <span>Lọc</span>
              <select
                className="exam-input !py-1.5"
                value={mode === "review" ? selected : filter}
                onChange={(e) =>
                  mode === "review"
                    ? setSelected(e.target.value)
                    : setFilter(e.target.value)
                }
              >
                {mode === "review" ? (
                  <>
                    <option value="all">Tất cả Mondai</option>
                    {exam.mondais.map((m) => (
                      <option key={m.number} value={m.number}>
                        Mondai {m.number}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="all">Tất cả</option>
                    <option value="wrong">Sai</option>
                    <option value="blank">Bỏ trống</option>
                    <option value="flags">Chưa chắc</option>
                  </>
                )}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
                onClick={() =>
                  // JL-15: render ngắt quãng được, không khóa trang khi mở 54 lời giải
                  startTransition(() =>
                    setExpanded(
                      exam.mondais.flatMap((m) => m.questions.map((q) => q.id)),
                    ),
                  )
                }
              >
                Mở tất cả lời giải
              </button>
              <button
                type="button"
                className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
                onClick={() => setExpanded([])}
              >
                Thu gọn tất cả
              </button>
            </div>
          </div>

          {/* FIX-06: Thông báo khi câu trong hash URL không nằm trong bộ lọc hoặc không tồn tại */}
          {hashQuestionId && hashExistsInExam && !hashIsDisplayed && (
            <div className="exam-card flex flex-wrap items-center justify-between gap-3 border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30">
              <p className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-200">
                Câu này không nằm trong bộ lọc hiện tại.
              </p>
              <button
                type="button"
                className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
                onClick={() => {
                  if (mode === "review") setSelected("all");
                  else setFilter("all");
                  setTimeout(() => {
                    document
                      .getElementById(`q-${hashQuestionId}`)
                      ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
                  }, 0);
                }}
              >
                Xem tất cả câu
              </button>
            </div>
          )}

          {hashQuestionId && !hashExistsInExam && (
            <div className="exam-card flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Không tìm thấy câu được liên kết trong bài này.
              </p>
              <button
                type="button"
                className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs"
                onClick={() =>
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }
              >
                Về đầu danh sách
              </button>
            </div>
          )}

          {/* FIX-06: Thông báo khi nhóm đoạn văn kéo thêm các câu cùng cụm để giữ ngữ cảnh */}
          {mode !== "review" &&
            filter !== "all" &&
            matchedQuestionIds.size > 0 &&
            displayedQuestions.length > matchedQuestionIds.size && (
              <div className="exam-card py-3 px-4 border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 text-xs sm:text-sm font-bold text-indigo-800 dark:text-indigo-200">
                {matchedQuestionIds.size} câu {filterLabelVi} · Hiển thị{" "}
                {displayedQuestions.length} câu để giữ ngữ cảnh
              </div>
            )}

          {/* 2-Column Review Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-7 min-w-0">
              {displayedUnits.map((g, idx) => {
                const isFirstOfMondai =
                  idx === 0 ||
                  displayedUnits[idx - 1].mondai.number !== g.mondai.number;
                const mondaiCountInView = isFirstOfMondai
                  ? displayedUnits
                      .filter((u) => u.mondai.number === g.mondai.number)
                      .reduce((sum, u) => sum + u.questions.length, 0)
                  : undefined;
                return showGroup(
                  g,
                  true,
                  isFirstOfMondai,
                  mondaiCountInView,
                  mode !== "review" && filter !== "all"
                    ? matchedQuestionIds
                    : undefined,
                );
              })}

              {displayedUnits.length === 0 && (
                <div className="exam-card text-center py-8">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    Không có câu phù hợp bộ lọc.
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Quick-Jump Review Sidebar (FIX-06: Đồng bộ 100% với danh sách đang hiển thị) */}
            <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
              <div className="exam-card space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Mục lục chuyển nhanh câu hỏi
                </p>
                {displayedQuestions.length > 0 ? (
                  <div className="grid grid-cols-5 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                    {displayedQuestions.map((q, idx) => {
                      const userAns = active?.answers[q.id];
                      const isRight = userAns === q.answer;
                      const seqNum = questionSeqMap.get(q.id) ?? idx + 1;
                      const isContextOnly =
                        mode !== "review" &&
                        filter !== "all" &&
                        !matchedQuestionIds.has(q.id);
                      let badgeClass =
                        "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
                      if (submitted) {
                        badgeClass = !userAns
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300"
                          : isRight
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-rose-600 text-white border-rose-600";
                      }
                      if (isContextOnly) {
                        badgeClass += " border-dashed opacity-75";
                      }
                      const baseTitle = q.origin
                        ? `Câu ${seqNum} · Nguồn: Ngày ${q.origin.day} · Câu ${q.origin.number}`
                        : `Câu ${seqNum}`;
                      return (
                        <a
                          key={q.id}
                          href={`#q-${q.id}`}
                          onClick={() => {
                            document
                              .getElementById(`q-${q.id}`)
                              ?.scrollIntoView?.({
                                behavior: "smooth",
                                block: "start",
                              });
                          }}
                          title={
                            isContextOnly
                              ? `${baseTitle} · Giữ ngữ cảnh đoạn văn`
                              : baseTitle
                          }
                          className={`h-9 rounded-xl border text-xs font-black flex items-center justify-center transition-all hover:border-indigo-500 ${badgeClass}`}
                        >
                          {seqNum}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 py-2">
                    Không có câu phù hợp bộ lọc.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Global Word Lookup Modal & Bôi đen tra từ (Synced with Global Lookup Toggle) */}
      <WordLookupModal
        isOpen={!!lookup}
        word={lookup || ""}
        onAssistProvided={() => {
          const ctx = lookupContextRef.current;
          if (ctx && ctx.attemptId) {
            recordAssistForQuestions(ctx.attemptId, ctx.questionIds);
          }
        }}
        onClose={() => {
          lookupContextRef.current = null;
          setLookup(null);
        }}
      />
      <SelectionLookup
        key={`${examId}:${mode}:${active?.position}:${active?.status}`}
        enabled={lookupEnabled}
        onLookup={(text) => {
          openLookupModal(text);
        }}
      />
    </div>
  );
}
