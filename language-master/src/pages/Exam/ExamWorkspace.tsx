import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowUp,
  Award,
  BookOpen,
  Clock,
  List,
  Pencil,
  Play,
  RotateCcw,
  Target,
  Zap,
} from "lucide-react";
import { getExamById } from "../../data/exams/jlpt";
import type { JLPTPassage, JLPTQuestion } from "../../data/exams/jlpt/types";
import {
  DRILL_COMMIT_DELAY_MS,
  answer,
  createAttempt,
  effectiveNow,
  finish,
  pauseAttempt,
  questions,
  resumeAttempt,
  score,
  units,
  type Attempt,
  type AttemptRoundConfig,
} from "../../lib/jlpt/examCore";
import {
  clearLastResultBackup,
  getLastResultBackup,
  getSession,
  refreshSession,
  saveLastResultBackup,
  setSession,
} from "../../lib/jlpt/tabSession";
import { useJlptSession } from "./useJlptSession";
import { detectWeakMondais, reconstructAttemptFromHistory } from "../../lib/jlpt/historySummary";
import {
  buildFreeScopeSearchParams,
  getFreeScopeBookOptions,
  saveFreePracticeHandoff,
  type FreePracticeConfig,
} from "../../lib/jlpt/freePractice";
import { planNewAttempt, slotOf } from "../../lib/jlpt/attemptSlots";
import { useConfirmation } from "./components/useConfirmation";
import {
  type AllocationMode,
  type PlannedRound,
  STANDARD_MONDAI_QUOTAS,
  buildPlannedRoundKey,
  computeStandardJLPTScore,
  isEstimateEligible,
  isStandardExamStructure,
  planPracticeRound,
  practiceSnapshot,
} from "../../lib/jlpt/practicePool";
import ExamQuestionCard from "./components/ExamQuestionCard";
import SourceImage from "./components/SourceImage";
import ExamText from "./components/ExamText";
import WordLookupModal from "./components/WordLookupModal";
import { prefetchLexicon } from "../../lib/dictionary/dictionaryLoader";
import SelectionLookup from "./components/SelectionLookup";
import { useAttemptKeyboard } from "./workspace/useAttemptKeyboard";
import { dayName,
  MONDAI_NAMES,
  describeAttempt,
  formatAttemptDuration,
  formatDuration,
} from "../../lib/jlpt/attemptLabels";
import { describeFirebaseError } from "../../lib/jlpt/firebaseErrors";
import JLPTPageHeader from "./hub/JLPTPageHeader";
import { useSaveAttemptHistory } from "./workspace/useSaveAttemptHistory";
import QuestionPalette from "./workspace/QuestionPalette";
import BottomSheet from "./workspace/BottomSheet";
import MobileAttemptBar from "./workspace/MobileAttemptBar";
import AttemptMenu, { type AttemptMenuItem } from "./workspace/AttemptMenu";
import PassageViewSwitch from "./components/PassageViewSwitch";
import { usePassageViewSwitch } from "./workspace/usePassageViewSwitch";

type Mode = "drill" | "mock" | "review" | "result";

const labels = {
  drill: "Luyện theo dạng",
  mock: "Làm bài có giờ",
  review: "Làm bài",
  result: "Kết quả bài vừa làm",
};

const ALL_MONDAI_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function parseMondaisParam(raw: string | null): number[] | null {
  if (!raw) return null;
  const nums = [
    ...new Set(
      raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 9),
    ),
  ].sort((a, b) => a - b);
  return nums.length > 0 ? nums : null;
}

/** Lấy câu đang được chọn trong cụm (bài đọc nhiều câu chỉ hiển thị 1 câu một lúc). */
function resolveFocusedQuestion(
  unit: { questions: JLPTQuestion[] } | undefined,
  focusedId: string | null,
): JLPTQuestion | undefined {
  if (!unit || unit.questions.length === 0) return undefined;
  if (unit.questions.length === 1 || !focusedId) return unit.questions[0];
  return unit.questions.find((q) => q.id === focusedId) ?? unit.questions[0];
}

export default function ExamWorkspace({ mode }: { mode: Mode }) {
  const { examId, attemptId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  // Trang kết quả có 2 tab: "Tóm tắt" (mặc định) và "Bài làm chi tiết" (?tab=detail)
  const resultTab: "summary" | "detail" = searchParams.get("tab") === "detail" ? "detail" : "summary";
  const showResultTab = (t: "summary" | "detail") => {
    setSearchParams(t === "detail" ? { tab: "detail" } : {}, { replace: true });
    window.scrollTo({ top: 0 });
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { ask, cancel, confirmation } = useConfirmation();
  const { attempt, notice, noticeKind, uid, authLoading } = useJlptSession();
  useDocumentTitle(mode === "mock" ? "Làm bài có giờ" : mode === "review" ? "Làm bài" : labels[mode]);

  const initialMondaisParam = parseMondaisParam(searchParams.get("mondais"));
  const initialSizeParam = searchParams.get("size");

  // Classic states (kept in sync for backward compatibility & tests)
  const [selected, setSelected] = useState(() => {
    if (!initialMondaisParam) return "all";
    if (initialMondaisParam.length === ALL_MONDAI_NUMBERS.length) return "all";
    return initialMondaisParam.length === 1
      ? String(initialMondaisParam[0])
      : "custom";
  });
  const [roundSize, setRoundSize] = useState(() =>
    initialSizeParam === "all" ||
    (initialSizeParam &&
      ["10", "15", "20", "30", "40", "50", "54"].includes(initialSizeParam))
      ? initialSizeParam
      : "20",
  );

  // Enhanced Flexible Practice Setup states
  const [selectedMondais, setSelectedMondais] = useState<number[]>(
    () => initialMondaisParam ?? ALL_MONDAI_NUMBERS,
  );
  const [allocationMode, setAllocationMode] = useState<AllocationMode>(() =>
    initialSizeParam ? "total" : "standard",
  );
  const [perMondaiCount, setPerMondaiCount] = useState<number>(5);
  const [dayFilter, setDayFilter] = useState<number | "all">(() => {
    const d = Number(searchParams.get("day"));
    return Number.isInteger(d) && d >= 1 && d <= 20 ? d : "all";
  });

  const [configuring, setConfiguring] = useState<boolean>(() => {
    if (
      (searchParams.get("setup") === "1" || searchParams.get("mondais")) &&
      attempt &&
      attempt.exam.id === examId &&
      attempt.mode === "drill"
    ) {
      return true;
    }
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
  // Làm bài (Kho sách đề): chọn đáp án trước rồi mới hiện đáp án + lời giải; chỉ giữ tạm trong phiên trình duyệt
  const reviewPicksKey = `language-master:jlpt:v1:day-picks:${examId}`;
  const [reviewPicks, setReviewPicks] = useState<Record<string, number>>(() => {
    try {
      const raw = sessionStorage.getItem(reviewPicksKey);
      const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      if (Object.keys(reviewPicks).length) sessionStorage.setItem(reviewPicksKey, JSON.stringify(reviewPicks));
      else sessionStorage.removeItem(reviewPicksKey);
    } catch {
      // Bỏ qua nếu storage bị chặn
    }
  }, [reviewPicks, reviewPicksKey]);
  const [collapsedFocus, setCollapsedFocus] = useState<string[]>([]);
  const [focusedQid, setFocusedQid] = useState<string | null>(null);
  const [reviewView] = useState<"focus" | "list">("focus");
  const [reviewUnitIdx, setReviewUnitIdx] = useState(0);
  const [backupResult, setBackupResult] = useState<Attempt | null>(() =>
    getLastResultBackup(),
  );
  // Trang kết quả luôn hiện sẵn phần xem lại bài (không còn nút bật/tắt)
  const [reviewing, setReviewing] = useState(mode === "result");
  // Vào trang kết quả (kể cả khi chuyển từ phòng thi sang) thì mở sẵn phần xem lại bài
  useEffect(() => {
    if (mode === "result") setReviewing(true);
  }, [mode]);
  /** Tải kết quả theo mã lượt từ lịch sử: đang tải / không tìm thấy */
  const [resultLoad, setResultLoad] = useState<"idle" | "loading" | "missing">("idle");
  const [filter, setFilter] = useState("all");
  /** Đã bấm nộp khi còn câu chưa chọn: hiện nhắc chọn hết */
  const [submitHint, setSubmitHint] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [reviewTocOpen, setReviewTocOpen] = useState(false);
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
  /** Câu đơn đang chờ chốt trong lượt luyện (mục 7.1); không ghi vào phiên */
  const [pending, setPending] = useState<{
    attemptId: string;
    questionId: string;
    option: number;
    until: number;
  } | null>(null);
  const pendingRef = useRef(pending);
  useLayoutEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const commitPendingRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(
      () => commitPendingRef.current(),
      Math.max(0, pending.until - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [pending]);
  const [now, setNow] = useState(() => Date.now());

  const active =
    !configuring &&
    attempt &&
    attempt.exam.id === examId &&
    (mode === attempt.mode ||
      (mode === "result" &&
        attempt.status === "submitted" &&
        // Địa chỉ có mã lượt thì chỉ hiện đúng lượt đó
        (!attemptId || attempt.id === attemptId)))
      ? attempt
      : null;

  const catalogExam = useMemo(
    () => (examId ? getExamById(examId) : undefined),
    [examId],
  );
  const exam = active?.exam || catalogExam;
  const clockRunning = mode === "mock" && active?.status === "in_progress";
  /** Thi có giờ luôn chạy ở chế độ nghiêm túc (tắt tra từ, dịch, nghe) */
  const strictRunning = Boolean(
    active?.mode === "mock" && active.status === "in_progress" && active.strict !== false,
  );
  const lookupAllowed = !strictRunning;

  // Địa chỉ kết quả riêng từng lượt (/result/<mã lượt>): tải đúng lượt đó từ lịch sử vào tab,
  // vẫn giữ an toàn bài đang làm dở / kết quả chưa lưu như khi mở lại từ Lịch sử.
  useEffect(() => {
    if (mode !== "result" || authLoading || !examId) return;
    const cur = getSession();
    if (!attemptId) {
      // Địa chỉ cũ không có mã lượt: chuyển sang địa chỉ có mã nếu tab đang giữ kết quả bài này
      if (cur?.status === "submitted" && cur.exam.id === examId)
        navigate(`/exams/jlpt/${examId}/result/${cur.id}${location.search}`, { replace: true });
      return;
    }
    if (cur?.id === attemptId && cur.status === "submitted") {
      setResultLoad("idle");
      return;
    }
    if (!uid) {
      setResultLoad("missing");
      return;
    }
    let cancelled = false;
    setResultLoad("loading");
    void (async () => {
      try {
        const histMod = await import("../../lib/jlpt/historyService");
        const record = await histMod.getAttemptById(uid, attemptId);
        if (cancelled) return;
        const source = record ? getExamById(record.examId) : undefined;
        const rebuilt =
          record && record.examId === examId
            ? reconstructAttemptFromHistory(record, source)
            : null;
        if (!record || !rebuilt) {
          setResultLoad("missing");
          return;
        }
        const latest = getSession();
        if (latest && latest.id !== attemptId) {
          if (latest.status === "in_progress") {
            const draftMod = await import("../../lib/jlpt/draftStore");
            draftMod.saveUserDraft(uid, latest, { immediate: true });
          } else if (latest.status === "submitted") {
            const persistMod = await import("../../lib/jlpt/attemptPersistence");
            const saved = await persistMod.persistSubmittedAttempt(uid, latest);
            if (
              !saved.ok &&
              !(await ask(
                "Kết quả vừa nộp chưa lưu được lên tài khoản sẽ mất. Vẫn xem lại bài cũ?",
              ))
            ) {
              if (!cancelled) navigate("/exams/jlpt", { replace: true });
              return;
            }
          }
        }
        if (cancelled) return;
        histMod.markSaved(uid, record.id);
        setSession(rebuilt, { silent: true });
        setResultLoad("idle");
      } catch {
        if (!cancelled) setResultLoad("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, attemptId, examId, uid, authLoading, attempt?.id]);

  // Thi nghiêm túc: cảnh báo khi đóng tab hoặc tải lại giữa giờ (R10)
  useEffect(() => {
    if (!strictRunning) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [strictRunning]);

  const activeMockIdRef = useRef<string | null>(null);
  activeMockIdRef.current =
    mode === "mock" && active?.mode === "mock" && active.status === "in_progress"
      ? active.id
      : null;

  // Khi vào phòng thi mock: mở lại đồng hồ nếu đang tạm dừng; khi rời trang: tạm dừng ngay
  useEffect(() => {
    if (mode !== "mock") return;
    refreshSession();
    const cur = getSession();
    if (
      cur &&
      cur.exam.id === examId &&
      cur.mode === "mock" &&
      cur.status === "in_progress" &&
      cur.pausedAt !== undefined
    ) {
      setSession(resumeAttempt(cur));
    }
    const pauseIfActive = () => {
      const id = activeMockIdRef.current;
      if (!id) return;
      const latest = getSession();
      if (
        latest &&
        latest.id === id &&
        latest.mode === "mock" &&
        latest.status === "in_progress" &&
        latest.pausedAt === undefined
      ) {
        setSession(pauseAttempt(latest));
      }
    };
    // Chỉ đếm giờ khi bạn đang nhìn phòng thi: ẩn tab, chuyển app, khóa màn hình đều tạm dừng
    const resumeIfPaused = () => {
      const latest = getSession();
      if (
        latest &&
        latest.id === activeMockIdRef.current &&
        latest.mode === "mock" &&
        latest.status === "in_progress" &&
        latest.pausedAt !== undefined
      ) {
        setSession(resumeAttempt(latest));
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pauseIfActive();
      else resumeIfPaused();
    };
    window.addEventListener("pagehide", pauseIfActive);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", pauseIfActive);
      document.removeEventListener("visibilitychange", onVisibility);
      pauseIfActive();
    };
  }, [mode, examId]);

  // Đồng bộ bài làm dở thuộc ngân hàng cho tài khoản đã đăng nhập (tối đa 3 bản)
  const draftModRef = useRef<typeof import("../../lib/jlpt/draftStore") | null>(
    null,
  );
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void import("../../lib/jlpt/draftStore").then((mod) => {
      if (!cancelled) draftModRef.current = mod;
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Bài dở của tài khoản: ghi lên Firebase (kho tự gom các thay đổi liên tiếp, ghi sau ~0,3 giây)
  useEffect(() => {
    if (!uid || !active || active.status !== "in_progress") {
      return;
    }
    const snap = active;
    if (draftModRef.current) draftModRef.current.saveUserDraft(uid, snap);
    else
      void import("../../lib/jlpt/draftStore").then((mod) => {
        draftModRef.current = mod;
        const latest = getSession();
        if (latest && latest.id === snap.id && latest.status === "in_progress")
          mod.saveUserDraft(uid, latest);
      });
    return () => {
      const latest = getSession();
      // Bài đã nộp (kể cả hết giờ) thì không ghi lại bản nháp nữa (R2)
      if (latest && latest.id === snap.id && latest.status !== "in_progress") {
        return;
      }
      const target =
        latest && latest.id === snap.id && latest.status === "in_progress"
          ? latest
          : snap;
      draftModRef.current?.saveUserDraft(uid, target);
    };
  }, [uid, active]);

  // Tải lại trang khi đã đăng nhập: bài trong tab chỉ nằm trong RAM nên lấy lại bài dở từ Firebase
  const [restoringDraft, setRestoringDraft] = useState(false);
  const restoreTriedRef = useRef<string | null>(null);
  // Đường dẫn yêu cầu thiết lập lượt mới (?setup, ?mondais, ?size, ?day) thì không tự mở bài dở
  const wantsSetup = ["setup", "mondais", "size", "day"].some((k) => searchParams.has(k));
  useEffect(() => {
    if (!uid || authLoading || configuring || wantsSetup) return;
    if (mode !== "mock" && mode !== "drill") return;
    if (getSession()) return;
    const key = `${uid}:${examId}:${mode}`;
    if (restoreTriedRef.current === key) return;
    restoreTriedRef.current = key;
    let cancelled = false;
    let finished = false;
    void (async () => {
      try {
        const mod = draftModRef.current ?? (await import("../../lib/jlpt/draftStore"));
        draftModRef.current = mod;
        if (cancelled) return;
        // Chuyển trang trong app: danh sách đã tải sẵn; chỉ tải từ Firebase sau khi tải lại trang
        let list = mod.readLocalDrafts(uid);
        if (!mod.draftsLoaded(uid)) {
          setRestoringDraft(true);
          list = await mod.loadUserDrafts(uid);
        }
        if (cancelled || getSession()) return;
        const d = list.find((x) => x.examId === examId && x.mode === mode);
        if (!d) return;
        const restored = mod.restoreAttemptFromDraft(d, examId ? getExamById(examId) : undefined);
        if (restored) setSession(restored, { silent: true });
      } catch {
        // Không với tới Firebase: vẫn cho bắt đầu bài mới như bình thường
      } finally {
        finished = true;
        if (!cancelled) setRestoringDraft(false);
      }
    })();
    return () => {
      cancelled = true;
      // Bị hủy giữa chừng (vd. React chạy lại hiệu ứng): cho phép thử lại ở lần chạy sau
      if (!finished && restoreTriedRef.current === key) restoreTriedRef.current = null;
      setRestoringDraft(false);
    };
  }, [uid, authLoading, configuring, wantsSetup, mode, examId]);

  // Rời phòng, đóng tab, ẩn tab: đẩy bản nháp (đã tạm dừng giờ) lên Firebase một lần
  useEffect(() => {
    if (!uid) return;
    const flush = () => {
      const latest = getSession();
      if (latest && latest.status === "in_progress")
        draftModRef.current?.saveUserDraft(uid, latest, { immediate: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [uid]);

  // Bản nháp của bài vừa nộp chỉ được xóa sau khi kết quả đã lưu xong (persistSubmittedAttempt), để lưu lỗi không mất bài (BE-2)

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
  // Lịch sử điểm cho người đăng nhập (mục 10): lưu ngay khi bài đã nộp ở bất kỳ route nào,
  // kể cả hết giờ khi kết quả hiện ngay trên /mock (R1)
  const historySave = useSaveAttemptHistory(submitted ? active : null);
  // Đã đăng nhập: kết quả chưa lưu được chỉ nằm trong RAM — hỏi trước khi tải lại / đóng trang
  const resultUnsaved = submitted && historySave.state.status === "error";
  useEffect(() => {
    if (!resultUnsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [resultUnsaved]);

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
      if (!trimmed || strictRunning) return;
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
    [active?.id, strictRunning],
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

  /** Chốt ngay câu đang chờ (hết 1,5 giây, Enter, chuyển câu, kết thúc luyện) */
  const commitPending = () => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    setPending(null);
    refreshSession();
    const a = getSession();
    if (!a || a.id !== p.attemptId || a.status !== "in_progress") return;
    if (a.committed.includes(p.questionId)) return;
    const next = answer(a, p.questionId, p.option);
    setSession({
      ...next,
      committed: [...new Set([...next.committed, p.questionId])],
    });
    setExpanded((prev) =>
      prev.includes(p.questionId) ? prev : [...prev, p.questionId],
    );
  };
  useLayoutEffect(() => {
    commitPendingRef.current = commitPending;
  });
  const undoPending = () => {
    pendingRef.current = null;
    setPending(null);
  };

  // Chọn đáp án dùng chung cho chuột/chạm và phím 1–4
  const selectOption = (questionId: string, opt: number, singleUnit: boolean) => {
    if (active?.mode === "drill") {
      if (singleUnit) {
        if (active.committed.includes(questionId)) return;
        // Câu đơn: chờ 1,5 giây trước khi chốt, chọn lại thì đếm lại từ đầu
        const p = {
          attemptId: active.id,
          questionId,
          option: opt,
          until: Date.now() + DRILL_COMMIT_DELAY_MS,
        };
        pendingRef.current = p;
        setPending(p);
        return;
      }
      update((a) => answer(a, questionId, opt));
    } else {
      update((a) => answer(a, questionId, opt));
    }
  };

  const goToUnit = (index: number) => {
    commitPending();
    update((a) => ({ ...a, position: index }));
    window.scrollTo({ top: 0 });
  };

  const isReviewModeActive =
    mode === "review" ||
    (active?.status === "submitted" && reviewing && (mode !== "result" || resultTab === "detail"));

  // FIX-06: Đồng bộ danh sách câu hiển thị và mục lục chuyển nhanh (Quick-Jump TOC)
  const isDirectFilterMatch = (q: JLPTQuestion) =>
    filter === "all" ||
    // Câu chưa làm (hết giờ) tính là sai
    (filter === "wrong" && active?.answers[q.id] !== q.answer);

  const matchedQuestionIds = new Set(
    mode === "review"
      ? exam
        ? units(exam)
            .filter(
              (g) => selected === "all" || String(g.mondai.number) === selected,
            )
            .flatMap((g) => g.questions.map((q) => q.id))
        : []
      : groups
          .flatMap((g) => g.questions)
          .filter(isDirectFilterMatch)
          .map((q) => q.id),
  );

  const displayedUnits =
    mode === "review"
      ? exam
        ? units(exam).filter(
            (g) => selected === "all" || String(g.mondai.number) === selected,
          )
        : []
      : groups.filter((g) =>
          g.questions.some((q) => matchedQuestionIds.has(q.id)),
        );

  const displayedQuestions = displayedUnits.flatMap((g) => g.questions);
  const safeReviewUnitIdx =
    displayedUnits.length > 0
      ? Math.min(reviewUnitIdx, displayedUnits.length - 1)
      : 0;
  const activeReviewUnit =
    displayedUnits.length > 0 ? displayedUnits[safeReviewUnitIdx] : undefined;

  const inProgressUnit =
    active && active.status === "in_progress" ? current : undefined;
  const focusReviewUnit =
    isReviewModeActive && reviewView === "focus" ? activeReviewUnit : undefined;
  const toggleUnit = inProgressUnit ?? focusReviewUnit;
  const togglePassage = toggleUnit?.mondai.passages?.find(
    (p) => p.id === toggleUnit.questions[0]?.passageId,
  );
  const toggleScopeKey = togglePassage
    ? inProgressUnit
      ? `run-${active!.position}:${togglePassage.id}`
      : `rev-${safeReviewUnitIdx}:${togglePassage.id}`
    : undefined;
  const passageSwitch = usePassageViewSwitch({
    passageId: togglePassage?.id,
    scopeKey: toggleScopeKey,
  });

  const keyboardHandlerRef = useRef<(e: KeyboardEvent) => boolean>(() => false);
  // Phím tắt cho phòng làm bài và chế độ xem đáp án từng câu (JL-01)
  useAttemptKeyboard(
    Boolean(
      (active && active.status === "in_progress") ||
        (isReviewModeActive && reviewView === "focus"),
    ),
    (e) => keyboardHandlerRef.current(e),
  );

  // XL-4: bộ đề ngẫu nhiên (cả ngân hàng) không có trang đáp án riêng, xem đáp án theo từng ngày
  if (!exam || (mode === "review" && exam.isPracticePool))
    return (
      <div className="exam-shell">
        <JLPTPageHeader
          root={{ label: "Luyện đề JLPT", to: "/exams/jlpt" }}
          current="Không tìm thấy bài"
        />
        <div className="exam-card space-y-3">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Không tìm thấy bài này</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Địa chỉ có thể đã cũ hoặc bài đã được đổi tên. Mở lại từ Kho sách đề để chọn đúng ngày.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className="exam-primary" to="/exams/jlpt/books">
              Kho sách đề
            </Link>
            <Link className="exam-secondary" to="/exams/jlpt">
              Luyện đề JLPT
            </Link>
          </div>
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
    _promptText?: string,
    expectedConfigKey?: string,
    opts?: {
      config?: AttemptRoundConfig;
      retry?: boolean;
      retryKind?: "wrong" | "blank" | "flags";
      backupAttempt?: Attempt;
    },
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
      // Quy tắc chung: mỗi loại tối đa một bài dở; trùng loại thì hỏi rồi xóa bài cũ,
      // khác loại thì giữ bài cũ thành bản nháp (có tài khoản)
      const draftMod = uid
        ? draftModRef.current ?? (await import("../../lib/jlpt/draftStore"))
        : null;
      if (draftMod) draftModRef.current = draftMod;
      const current = getSession();
      // Kết quả trong tab chưa lưu được lên tài khoản thì báo trước khi thay (thử lưu lại một lần)
      let unsavedResult = false;
      if (uid && current?.status === "submitted") {
        const persistMod = await import("../../lib/jlpt/attemptPersistence");
        unsavedResult = !(await persistMod.persistSubmittedAttempt(uid, current)).ok;
      }
      const plan = planNewAttempt({
        current,
        unsavedResult,
        slot: slotOf({
          examId: exam.id,
          isPool: Boolean(source.isPracticePool),
          mode: nextMode,
          retry: opts?.retry === true,
        }),
        signedIn: Boolean(uid),
        drafts: uid && draftMod ? draftMod.readLocalDrafts(uid) : [],
      });
      if (plan.question && !(await ask(plan.question))) return;
      if (uid && draftMod) {
        if (plan.keepLive) draftMod.saveUserDraft(uid, plan.keepLive, { immediate: true });
        for (const id of plan.dropIds) draftMod.removeUserDraft(uid, id);
      }
      const strict: boolean | undefined = nextMode === "mock" ? true : undefined;

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
      // Lưu cấu hình đã chuẩn hóa của lượt luyện từ ngân hàng để trộn lại (JL-09)
      const roundConfig: AttemptRoundConfig | undefined =
        opts?.config ??
        (source.isPracticePool && nextMode === "drill" && expectedConfigKey
          ? {
              mondais: [...plannedRound.config.mondais],
              allocationMode: plannedRound.config.allocationMode,
              totalCount: plannedRound.config.totalCount,
              perMondaiCount: plannedRound.config.perMondaiCount,
              dayFilter: plannedRound.config.dayFilter,
            }
          : undefined);
      if (opts?.retry && opts.backupAttempt) {
        saveLastResultBackup(opts.backupAttempt);
        setBackupResult(opts.backupAttempt);
      } else if (!opts?.retry) {
        clearLastResultBackup();
        setBackupResult(null);
      }
      const created = createAttempt(snapshot, nextMode, picked);
      setSession({
        ...created,
        ...(strict !== undefined ? { strict } : {}),
        retry: opts?.retry === true,
        ...(opts?.retryKind ? { retryKind: opts.retryKind } : {}),
        ...(roundConfig ? { config: roundConfig } : {}),
      });
      plannedRoundRef.current = null;
      setFocusedQid(null);
      setConfiguring(false);
      setReviewing(false);
      setFilter("all");
      setExpanded([]);
      setCollapsedFocus([]);
      navigate(`/exams/jlpt/${exam.id}/${nextMode}`);
    } finally {
      startingRef.current = false;
    }
  };

  const remove = async () => {
    const wasPoolMock = exam.isPracticePool && active?.mode === "mock";
    if (await ask("Kết thúc và xóa bài/kết quả tạm trong tab này?")) {
      if (uid && active?.id) {
        draftModRef.current?.removeUserDraft(uid, active.id);
      }
      clearLastResultBackup();
      setBackupResult(null);
      setSession(null);
      navigate(
        wasPoolMock
          ? "/exams/jlpt"
          : `/exams/jlpt/${exam.id}${exam.isPracticePool ? "/drill" : ""}`,
      );
    }
  };

  const submit = async () => {
    commitPending();
    const a = getSession();
    if (!a || a.id !== active?.id) return;
    // Thi thử: phải chọn hết các câu mới được nộp. Luyện theo dạng: được kết thúc bất cứ lúc nào (PT-1)
    const blanks = questions(a).filter((q) => !a.answers[q.id]);
    const firstBlank = blanks[0];
    if (a.mode === "mock" && firstBlank) {
      setSubmitHint(true);
      const unitIdx = groups.findIndex((g) => g.questions.some((q) => q.id === firstBlank.id));
      if (unitIdx >= 0) jumpToQuestion(unitIdx, firstBlank.id);
      return;
    }
    const confirmText =
      a.mode === "mock"
        ? "Nộp bài? Kết quả sẽ khóa sau nộp."
        : blanks.length > 0
          ? `Kết thúc lượt luyện? Còn ${blanks.length} câu chưa làm, các câu này tính là chưa làm.`
          : "Kết thúc lượt luyện và xem kết quả?";
    if (await ask(confirmText)) {
      refreshSession();
      const latest = getSession();
      if (latest?.id === a.id) setSession(finish(latest));
      setReviewing(false);
      navigate(`/exams/jlpt/${exam.id}/result/${a.id}`);
    }
  };

  const contentReady =
    exam.enrichmentStatus === "ai" || exam.enrichmentStatus === "reviewed";

  /** Mondai 9: cuộn tới ô trống trong đoạn văn và tô sáng 1,5 giây (JL-13) */
  const focusBlank = (passageId: string, blankId: string) => {
    const el = document.getElementById(`blank-${passageId}-${blankId}`);
    if (!el) return;
    el.scrollIntoView?.({ behavior: "smooth", block: "center" });
    el.classList.add("exam-blank-flash");
    window.setTimeout(() => el.classList.remove("exam-blank-flash"), 1500);
  };

  const renderPassageBody = (
    passage: JLPTPassage,
    blankToQuestion: Map<string, string>,
    helpVisible: boolean,
    activeQuestionId?: string,
    onSelectQuestionFromBlank?: () => void,
  ) => (
    <div className="space-y-4">
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
          className="select-text text-base sm:text-lg leading-[1.9] font-medium text-slate-900 dark:text-slate-100"
        >
          <ExamText
            text={passage.text}
            blanks={{
              idPrefix: `blank-${passage.id}-`,
              active: activeQuestionId
                ? (b) => blankToQuestion.get(b) === activeQuestionId
                : undefined,
              answered: (b) => {
                const qid = blankToQuestion.get(b);
                return !!(qid && (active?.answers[qid] || pending?.questionId === qid));
              },
              onClick: (b) => {
                const qid = blankToQuestion.get(b);
                if (qid) {
                  setFocusedQid(qid);
                  if (onSelectQuestionFromBlank) {
                    onSelectQuestionFromBlank();
                  } else {
                    setTimeout(() => {
                      document
                        .getElementById(`q-${qid}`)
                        ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
                    }, 0);
                  }
                }
              },
            }}
          />
        </div>
      )}

      {exam.delivery === "text" && passage.sourceImage && (
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
          {helpVisible
            ? n
            : n.replace(/\([^)]*[A-Za-zÀ-ỹ][^)]*\)/g, "")}
        </p>
      ))}

      {helpVisible && passage.translationVi && (
        <details className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-sm">
          <summary className="cursor-pointer font-bold text-emerald-800 dark:text-emerald-300">
            Bản dịch tham khảo
            {exam.enrichmentStatus === "ai" && (
              <span className="ml-1.5 px-1.5 py-px rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                AI dịch
              </span>
            )}
          </summary>
          <p className="whitespace-pre-wrap leading-7 mt-2">
            {passage.translationVi}
          </p>
        </details>
      )}
    </div>
  );

  const showGroup = (
    unit: (typeof groups)[number],
    reading = false,
    showMondaiHeader = true,
    mondaiQuestionCount?: number,
    matchedIds?: Set<string>,
    singleQid?: string,
    focusAutoExpand = false,
    passageToggle?: typeof passageSwitch,
  ) => {
    const passage = unit.mondai.passages?.find(
      (p) => p.id === unit.questions[0].passageId,
    );
    const unitQuestionIds = unit.questions.map((q) => q.id);
    // Bản dịch/giải nghĩa đoạn văn: chỉ khi nội dung ai/reviewed và đã có phản hồi (mục 12.4)
    const groupChecked = unit.questions.every((q) =>
      active?.committed.includes(q.id),
    );
    const passageHelpVisible =
      contentReady &&
      !(active?.mode === "mock" && active.status === "in_progress" && !reading) &&
      (mode === "review" || submitted || groupChecked || reading);
    const blankToQuestion = new Map<string, string>();
    for (const q of unit.questions) {
      for (const b of q.blankIds?.length ? q.blankIds : [q.blankLabel || ""])
        if (b) blankToQuestion.set(b, q.id);
    }
    const visibleQuestions = singleQid
      ? unit.questions.filter((q) => q.id === singleQid)
      : unit.questions;
    const effectiveVisible =
      visibleQuestions.length > 0
        ? visibleQuestions
        : singleQid
          ? unit.questions.slice(0, 1)
          : unit.questions;
    const activePillId = effectiveVisible[0]?.id;
    const showPassageCard = Boolean(
      passage && (!passageToggle || passageToggle.view === "passage"),
    );
    const showQuestionCards =
      !passage || !passageToggle || passageToggle.view === "question";
    return (
      <section key={unit.id} className="space-y-4">
        {/* Mondai Instruction Banner (B3: Chỉ hiển thị ở đầu mỗi Mondai khi xem danh sách dài) */}
        {showMondaiHeader && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-5 py-3.5 sm:py-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Mondai {unit.mondai.number} · {unit.mondai.titleVi}
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
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

        <div className="space-y-4">
        {/* Đoạn văn: khi dùng chế độ gạt 2 mặt thì trải rộng thoáng; ở Danh sách (xem lại toàn bộ) giữ cuộn gọn 42vh */}
        {passage && showPassageCard && (
          <article
            className={`${
              passageToggle ? "" : "lg:max-h-[42vh] lg:overflow-y-auto "
            }rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span>
                  Đoạn văn · câu{" "}
                  {unit.questions.map((q) => q.number).join(", ")}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {lookupAllowed && (
                  <span className="hidden sm:inline text-xs font-medium text-slate-500 dark:text-slate-400">
                    Bôi đen chữ bất kỳ để tra từ
                  </span>
                )}
                {passageToggle && (
                  <button
                    type="button"
                    onClick={() => passageToggle.showQuestion()}
                    title="Quay lại câu hỏi (R)"
                    className="exam-secondary !py-1 !px-2.5 !min-h-8 text-xs font-semibold"
                  >
                    <Pencil size={12} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Câu hỏi</span>
                  </button>
                )}
              </div>
            </div>

            {renderPassageBody(
              passage,
              blankToQuestion,
              passageHelpVisible,
              singleQid ? activePillId : undefined,
              passageToggle ? () => passageToggle.showQuestion() : undefined,
            )}
          </article>
        )}

        {/* Questions in Unit */}
        {showQuestionCards && (
        <div className="space-y-3 min-w-0">
        {effectiveVisible.map((q) => {
          const pickFirst = mode === "review";
          const pickedOption = pickFirst ? reviewPicks[q.id] : undefined;
          const pickedDone = pickedOption !== undefined;
          const checked = !!active?.committed.includes(q.id);
          const isContextOnly = Boolean(matchedIds && !matchedIds.has(q.id));
          // Trang kết quả: lời giải luôn hiện sẵn, không có nút mở / thu gọn
          const lockOpen = mode === "result" || pickFirst;
          const isExpanded = pickFirst
            ? pickedDone
            : lockOpen
            ? true
            : focusAutoExpand
              ? !collapsedFocus.includes(q.id)
              : expanded.includes(q.id);
          return (
            <ExamQuestionCard
              key={q.id}
              sequenceNumber={questionSeqMap.get(q.id)}
              totalQuestions={totalQuestionsInView}
              contextRole={isContextOnly ? "context_only" : "matched"}
              question={
                contentReady
                  ? q
                  : {
                      ...q,
                      translationVi: undefined,
                      stemTranslationVi: undefined,
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
              mode={pickFirst ? "drill" : active?.mode || "review"}
              userAnswer={pickFirst ? pickedOption : active?.answers[q.id]}
              showFeedback={pickFirst ? pickedDone : reading || checked}
              locked={pickFirst ? pickedDone : reading || checked}
              expanded={isExpanded}
              onExpand={
                lockOpen
                  ? undefined
                  : () =>
                focusAutoExpand
                  ? setCollapsedFocus((v) =>
                      v.includes(q.id)
                        ? v.filter((id) => id !== q.id)
                        : [...v, q.id],
                    )
                  : setExpanded((v) =>
                      v.includes(q.id)
                        ? v.filter((id) => id !== q.id)
                        : [...v, q.id],
                    )
              }
              onSelectOption={(opt) =>
                pickFirst
                  ? setReviewPicks((prev) => (prev[q.id] ? prev : { ...prev, [q.id]: opt }))
                  : selectOption(q.id, opt, unit.questions.length === 1)
              }
              mondaiType={unit.mondai.type}
              hideTranslateButton={pickFirst}
              explanationSheetOnPhone={pickFirst}
              enrichmentStatus={exam.enrichmentStatus}
              strict={strictRunning}
              pendingOption={
                pending && pending.questionId === q.id ? pending.option : null
              }
              onUndoPending={undoPending}
              passage={passage}
              onShowInPassage={
                passage && (q.blankIds?.[0] || q.blankLabel)
                  ? () => {
                      const bid = q.blankIds?.[0] || q.blankLabel!;
                      if (passageToggle) {
                        passageToggle.showPassage(`blank-${passage.id}-${bid}`);
                      } else {
                        focusBlank(passage.id, bid);
                      }
                    }
                  : undefined
              }
              onOpenPassage={
                passage && passageToggle
                  ? () => passageToggle.showPassage()
                  : undefined
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
                  ? () => goToUnit(active.position + 1)
                  : undefined
              }
            />
          );
        })}
        </div>
        )}
        </div>
      </section>
    );
  };

  const unansweredCount = active
    ? questions(active).filter((q) => !active.answers[q.id]).length
    : 0;
  const clockNow = active ? effectiveNow(active, now) : now;
  const remaining = active?.deadlineAt
    ? Math.max(0, Math.ceil((active.deadlineAt - clockNow) / 1000))
    : 0;

  const filterLabelVi =
    filter === "wrong" ? "sai" : "";

  const hashQuestionId = location.hash.startsWith("#q-")
    ? decodeURIComponent(location.hash.slice(3))
    : null;
  const hashExistsInExam = hashQuestionId
    ? questionSeqMap.has(hashQuestionId)
    : false;
  const hashIsDisplayed = hashQuestionId
    ? displayedQuestions.some((q) => q.id === hashQuestionId)
    : false;

  // Điều hướng từng câu trong phòng làm bài (kể cả trong bài đọc nhiều câu)
  const activeUnitQuestion = resolveFocusedQuestion(current, focusedQid);
  const activeQIndexInUnit =
    current && activeUnitQuestion
      ? Math.max(
          0,
          current.questions.findIndex((q) => q.id === activeUnitQuestion.id),
        )
      : 0;
  const canStepPrev = Boolean(
    active && current && (activeQIndexInUnit > 0 || active.position > 0),
  );
  const canStepNext = Boolean(
    active &&
      current &&
      (activeQIndexInUnit < current.questions.length - 1 ||
        active.position < groups.length - 1),
  );
  const stepPrev = () => {
    if (!active || !current) return;
    passageSwitch.showQuestion();
    if (activeQIndexInUnit > 0) {
      commitPending();
      setFocusedQid(current.questions[activeQIndexInUnit - 1].id);
      return;
    }
    if (active.position > 0) {
      const prevUnit = groups[active.position - 1];
      setFocusedQid(
        prevUnit?.questions[prevUnit.questions.length - 1]?.id ?? null,
      );
      goToUnit(active.position - 1);
    }
  };
  const stepNext = () => {
    if (!active || !current) return;
    passageSwitch.showQuestion();
    if (activeQIndexInUnit < current.questions.length - 1) {
      commitPending();
      setFocusedQid(current.questions[activeQIndexInUnit + 1].id);
      return;
    }
    if (active.position < groups.length - 1) {
      const nextUnit = groups[active.position + 1];
      setFocusedQid(nextUnit?.questions[0]?.id ?? null);
      goToUnit(active.position + 1);
    }
  };

  // Điều hướng từng câu trong chế độ xem đáp án / xem lại bài
  const activeReviewQ = resolveFocusedQuestion(activeReviewUnit, focusedQid);
  const activeReviewQIdx =
    activeReviewUnit && activeReviewQ
      ? Math.max(
          0,
          activeReviewUnit.questions.findIndex((q) => q.id === activeReviewQ.id),
        )
      : 0;
  const canReviewPrev = Boolean(
    activeReviewUnit && (activeReviewQIdx > 0 || safeReviewUnitIdx > 0),
  );
  const canReviewNext = Boolean(
    activeReviewUnit &&
      (activeReviewQIdx < activeReviewUnit.questions.length - 1 ||
        safeReviewUnitIdx < displayedUnits.length - 1),
  );
  const stepReviewPrev = () => {
    if (!activeReviewUnit) return;
    passageSwitch.showQuestion();
    if (activeReviewQIdx > 0) {
      setFocusedQid(activeReviewUnit.questions[activeReviewQIdx - 1].id);
      return;
    }
    if (safeReviewUnitIdx > 0) {
      const prevUnit = displayedUnits[safeReviewUnitIdx - 1];
      setReviewUnitIdx(safeReviewUnitIdx - 1);
      setFocusedQid(
        prevUnit?.questions[prevUnit.questions.length - 1]?.id ?? null,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const stepReviewNext = () => {
    if (!activeReviewUnit) return;
    passageSwitch.showQuestion();
    if (activeReviewQIdx < activeReviewUnit.questions.length - 1) {
      setFocusedQid(activeReviewUnit.questions[activeReviewQIdx + 1].id);
      return;
    }
    if (safeReviewUnitIdx < displayedUnits.length - 1) {
      const nextUnit = displayedUnits[safeReviewUnitIdx + 1];
      setReviewUnitIdx(safeReviewUnitIdx + 1);
      setFocusedQid(nextUnit?.questions[0]?.id ?? null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Gắn xử lý phím tắt sau khi mọi hàm điều hướng đã được tính toán
  keyboardHandlerRef.current = (e) => {
    if (lookup) return false;
    if (active && active.status === "in_progress" && current) {
      if (e.key === "Escape") {
        if (pendingRef.current) {
          undoPending();
          return true;
        }
        if (togglePassage && passageSwitch.view === "passage") {
          passageSwitch.showQuestion();
          return true;
        }
        return false;
      }
      if ((e.key === "r" || e.key === "R") && togglePassage) {
        passageSwitch.toggleView();
        return true;
      }
      if (["1", "2", "3", "4"].includes(e.key)) {
        const q = activeUnitQuestion;
        if (!q || active.committed.includes(q.id)) return false;
        selectOption(q.id, Number(e.key), current.questions.length === 1);
        return true;
      }
      if (e.key === "ArrowLeft") {
        if (!canStepPrev) return false;
        stepPrev();
        return true;
      }
      const pendingHere = Boolean(
        pendingRef.current &&
          current.questions.some((q) => q.id === pendingRef.current?.questionId),
      );
      if (
        e.key === "ArrowRight" ||
        (e.key === "Enter" &&
          active.mode === "drill" &&
          activeUnitQuestion &&
          (pendingHere || !!active.answers[activeUnitQuestion.id]))
      ) {
        if (!canStepNext) {
          if (!pendingHere) return false;
          commitPending();
          return true;
        }
        stepNext();
        return true;
      }
      return false;
    }
    if (isReviewModeActive && reviewView === "focus") {
      if ((e.key === "r" || e.key === "R") && togglePassage) {
        passageSwitch.toggleView();
        return true;
      }
      if (
        e.key === "Escape" &&
        togglePassage &&
        passageSwitch.view === "passage"
      ) {
        passageSwitch.showQuestion();
        return true;
      }
      if (e.key === "ArrowLeft") {
        if (!canReviewPrev) return false;
        stepReviewPrev();
        return true;
      }
      if (e.key === "ArrowRight") {
        if (!canReviewNext) return false;
        stepReviewNext();
        return true;
      }
    }
    return false;
  };

  /** Điền màn thiết lập theo cấu hình đã lưu của lượt (JL-09) */
  const applyRoundConfig = (config: AttemptRoundConfig) => {
    selectMondaiGroup([...config.mondais]);
    setAllocationMode(config.allocationMode);
    setRoundSize(String(config.totalCount));
    setPerMondaiCount(config.perMondaiCount);
    setDayFilter(config.dayFilter);
  };
  const openSetupFromConfig = () => {
    if (active?.config) applyRoundConfig(active.config);
    setConfiguring(true);
    navigate(`/exams/jlpt/${exam.id}/drill`);
  };
  /** "Trộn lượt mới cùng cấu hình": bốc lại câu theo attempt.config; phiên cũ không có config thì mở thiết lập */
  const reshuffleSameConfig = async () => {
    const config = active?.config;
    const source = catalogExam || exam;
    if (!config || !source.isPracticePool) {
      openSetupFromConfig();
      return;
    }
    const plan = planPracticeRound(source, { mode: "drill", ...config });
    if (!plan.canStart) {
      openSetupFromConfig();
      return;
    }
    await start(
      "drill",
      plan.questionIds,
      `Lượt mới ${plan.actualTotal} câu cùng cấu hình sẽ thay kết quả hiện tại. Tiếp tục?`,
      undefined,
      { config },
    );
  };

  /** Luyện các Mondai yếu của riêng bài này (đề theo ngày: chỉ trong đề đó; đề trộn: cả cấp độ) */
  const practiceWeak = (mondais: number[]) => {
    if (!active || !mondais.length) return;
    const options = getFreeScopeBookOptions(active.exam.level);
    const isDay = !active.exam.isPracticePool && Boolean(active.exam.bookId);
    const allBookIds = options.map((b) => b.id);
    const allExamIds = options.flatMap((b) => b.exams.map((e) => e.id));
    const cfg: Extract<FreePracticeConfig, { kind: "endless" }> = {
      kind: "endless",
      level: active.exam.level,
      bookIds: isDay && active.exam.bookId ? [active.exam.bookId] : allBookIds,
      examIds: isDay ? [active.exam.id] : allExamIds,
      mondais,
    };
    saveFreePracticeHandoff(cfg);
    const sp = buildFreeScopeSearchParams({
      level: cfg.level,
      bookIds: cfg.bookIds,
      examIds: cfg.examIds,
      mondais: cfg.mondais,
      allBooksCount: options.length,
      allExamsCount: allExamIds.length,
    });
    navigate(`/exams/jlpt/free${sp ? `?${sp}` : ""}`, { state: { freeConfig: cfg } });
  };

  const retry = (kind: "wrong" | "full") => {
    if (!active) return;
    const ids =
      kind === "full"
        ? questions(active).map((q) => q.id)
        : questions(active)
            // Câu sai gồm cả câu chưa làm (hết giờ)
            .filter((q) => active.answers[q.id] !== q.answer)
            .map((q) => q.id);
    if (!ids.length) return;
    const cfg = {
      kind: "fixed" as const,
      fixedKind: kind,
      level: exam.level,
      questionIds: ids,
      title: `${kind === "wrong" ? "Ôn câu sai" : "Ôn lại cả bài"} · ${
        active.mode === "mock" ? "Thi thử" : exam.isPracticePool ? "Luyện theo dạng" : exam.title
      }`,
      // Có mã lượt để Thoát quay lại đúng trang Kết quả, kể cả sau khi tải lại (LT-2)
      backTo: `/exams/jlpt/${exam.id}/result/${active.id}`,
    };
    try {
      sessionStorage.setItem(
        "language-master:jlpt:v1:free-handoff",
        JSON.stringify(cfg),
      );
    } catch {
      // Bỏ qua nếu storage bị chặn
    }
    navigate("/exams/jlpt/free?mode=fixed", { state: { freeConfig: cfg } });
  };

  const canRestoreBackupResult = Boolean(
    backupResult && backupResult.exam.id === exam.id && active?.retry,
  );
  const restorePreviousResult = () => {
    if (!backupResult) return;
    setSession(backupResult);
    clearLastResultBackup();
    setBackupResult(null);
    setReviewing(false);
    setFilter("all");
    navigate(`/exams/jlpt/${backupResult.exam.id}/result/${backupResult.id}`);
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
    active && submitted && isEstimateEligible(active)
      ? computeStandardJLPTScore(active)
      : null;

  const nextEmphasis = Boolean(
    active?.mode === "drill" &&
      activeUnitQuestion &&
      (!!active.answers[activeUnitQuestion.id] ||
        pending?.questionId === activeUnitQuestion.id),
  );
  const jumpToQuestion = (unitIdx: number, questionId: string) => {
    commitPending();
    passageSwitch.showQuestion();
    setFocusedQid(questionId);
    update((a) => ({ ...a, position: unitIdx }));
    setTimeout(() => {
      document
        .getElementById(`q-${questionId}`)
        ?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 0);
  };
  const retryBadgeLabel =
    active?.retryKind === "wrong"
      ? "Ôn câu sai"
      : active?.retryKind === "blank"
        ? "Ôn bỏ trống"
        : active?.retryKind === "flags"
          ? "Ôn chưa chắc"
          : "Ôn lại";
  const attemptMenuItems: AttemptMenuItem[] = active
    ? [
        {
          key: "info",
          label: "Thông tin bài",
          onSelect: () => setShowInfo(true),
        },
        ...(exam.isPracticePool && active.mode === "drill" && !active.retry
          ? [
              {
                key: "config",
                label: "Đổi dạng / số câu",
                onSelect: openSetupFromConfig,
              },
            ]
          : []),
        ...(canRestoreBackupResult && active.status === "in_progress"
          ? [
              {
                key: "back-result",
                label: "Quay lại kết quả bài thi",
                onSelect: restorePreviousResult,
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
          label: "Kết thúc và xóa bài đang làm",
          danger: true,
          onSelect: () => void remove(),
        },
      ]
    : [];
  const attemptDisplayTitle = attempt ? describeAttempt(attempt, now).title : "";

  const headerTitle = active?.retry
    ? describeAttempt(active, now).title
    : exam.isPracticePool && (mode === "mock" || active?.mode === "mock")
      ? `Đề thi thử ${exam.level} · 54 câu`
      : dayName(exam);
  const backTo =
    !exam.isPracticePool && exam.bookId
      ? `/exams/jlpt/books?book=${encodeURIComponent(exam.bookId)}`
      : "/exams/jlpt";
  const backLabel =
    !exam.isPracticePool && exam.bookId ? "← Danh sách bài" : "← Luyện đề JLPT";
  const needsBottomNavPad =
    active?.status === "in_progress" ||
    (isReviewModeActive &&
      reviewView === "focus" &&
      displayedUnits.length > 0);

  const reviewStats = (() => {
    const all = exam.mondais.flatMap((m) => m.questions);
    const done = all.filter((q) => reviewPicks[q.id]).length;
    const right = all.filter((q) => reviewPicks[q.id] === q.answer).length;
    const score = all.length ? Math.round((right / all.length) * 60) : 0;
    return { total: all.length, done, right, wrong: done - right, score };
  })();
  const renderReviewSummary = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5 text-center" aria-live="polite">
        {[
          ["Đã làm", `${reviewStats.done}/${reviewStats.total}`],
          ["Đúng", String(reviewStats.right)],
          ["Sai", String(reviewStats.wrong)],
          ["Điểm", `${reviewStats.score}/60`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 px-1 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={reviewStats.done === 0}
        onClick={() => setReviewPicks({})}
        className="exam-secondary !py-1.5 !px-2.5 !min-h-8 text-xs w-full disabled:opacity-50"
      >
        Làm lại từ đầu
      </button>
    </div>
  );

  const renderQuickJumpGrid = (onPick?: () => void) =>
    displayedQuestions.length > 0 ? (
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 p-1.5 pr-2 max-h-[50vh] overflow-y-auto">
        {displayedQuestions.map((q, idx) => {
          const userAns = active?.answers[q.id];
          const isRight = userAns === q.answer;
          const seqNum = questionSeqMap.get(q.id) ?? idx + 1;
          const isCurrentFocus =
            reviewView === "focus" && activeReviewQ?.id === q.id;
          const isContextOnly =
            mode !== "review" &&
            filter !== "all" &&
            !matchedQuestionIds.has(q.id);
          let badgeClass =
            "bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/80";
          if (mode === "review") {
            const pk = reviewPicks[q.id];
            if (pk) {
              badgeClass =
                pk === q.answer
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-rose-600 text-white border-rose-600";
            } else {
              badgeClass =
                "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/80";
            }
          } else if (submitted) {
            badgeClass = !userAns
              ? "bg-rose-600 text-white border-rose-600"
              : isRight
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-rose-600 text-white border-rose-600";
          }
          if (isContextOnly) {
            badgeClass += " border-dashed opacity-75";
          }
          const baseTitle = q.origin && mode !== "mock"
            ? `Câu ${seqNum} · Nguồn: Ngày ${q.origin.day} · Câu ${q.origin.number}`
            : `Câu ${seqNum}`;
          const stateTitle = submitted ? (!userAns ? " · Chưa làm (tính là sai)" : isRight ? " · Đúng" : " · Sai") : "";
          return (
            <a
              key={q.id}
              href={`#q-${q.id}`}
              onClick={(e) => {
                if (reviewView === "focus") {
                  e.preventDefault();
                  const unitIdx = displayedUnits.findIndex((u) =>
                    u.questions.some((uq) => uq.id === q.id),
                  );
                  if (unitIdx >= 0) setReviewUnitIdx(unitIdx);
                  setFocusedQid(q.id);
                  if (onPick) onPick();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }
                if (onPick) {
                  e.preventDefault();
                  onPick();
                }
                setTimeout(
                  () => {
                    document
                      .getElementById(`q-${q.id}`)
                      ?.scrollIntoView?.({
                        behavior: "smooth",
                        block: "start",
                      });
                  },
                  onPick ? 60 : 0,
                );
              }}
              title={
                isContextOnly
                  ? `${baseTitle}${stateTitle} · Giữ ngữ cảnh đoạn văn`
                  : `${baseTitle}${stateTitle}`
              }
              className={`h-9 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all hover:border-indigo-500 ${badgeClass} ${
                isCurrentFocus
                  ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900"
                  : ""
              }`}
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
    );

  return (
    <div
      className={`exam-shell !px-3 sm:!px-6 !py-3 sm:!py-5 overflow-x-clip ${
        needsBottomNavPad ? "!pb-28 sm:!pb-12" : "!pb-8 sm:!pb-12"
      }`}
    >
      {confirmation}

      {/* Thanh phiên: chỉ hiện khi trang đang xem không phải chính lượt trong tab (JL-14) */}
      {mode !== "review" && attempt && !(active && active.id === attempt.id) && (
        <div className="mb-4 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p
              title={attemptDisplayTitle}
              className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 break-words"
            >
              Trong tab: {attemptDisplayTitle}
            </p>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {attempt.status === "submitted" ? "Đã nộp" : "Đang làm"} ·{" "}
              {Object.keys(attempt.answers).length}/
              {attempt.questionIds.length} câu
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0">
            {(configuring || !active) && (
              <Link
                className="exam-primary !py-1.5 !px-3 !min-h-9 text-xs flex-1 sm:flex-initial"
                to={`/exams/jlpt/${attempt.exam.id}/${attempt.status === "submitted" ? "result" : attempt.mode}`}
                onClick={() => setConfiguring(false)}
              >
                {attempt.status === "submitted" ? "Xem kết quả" : "Làm tiếp"}
              </Link>
            )}
            {exam.isPracticePool &&
              !configuring &&
              !attempt.retry &&
              (mode === "drill" || active?.mode === "drill") && (
                <button
                  type="button"
                  className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs flex-1 sm:flex-initial"
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
              className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs flex-1 sm:flex-initial"
              onClick={remove}
            >
              Kết thúc và xóa bài đang làm
            </button>
          </div>
        </div>
      )}

      {/* B1: Compact Header when in_progress so Question 1 is visible above the fold on mobile */}
      {active?.status === "in_progress" ? (
        <header className="mb-2 sm:mb-3 px-2.5 sm:px-4 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <Link
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0 transition-colors whitespace-nowrap"
                to={backTo}
                onClick={async (e) => {
                  if (!strictRunning) return;
                  e.preventDefault();
                  if (
                    await ask(
                      "Rời phòng thi? Đồng hồ sẽ tạm dừng và thời gian tạm dừng được ghi vào kết quả.",
                    )
                  ) {
                    navigate(backTo);
                  }
                }}
              >
                {backLabel}
              </Link>
              <h1
                title={headerTitle}
                className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate"
              >
                {headerTitle}
              </h1>
            </div>
          </div>
        </header>
      ) : mode === "result" ? (
        <JLPTPageHeader
          level={exam.level}
          root={
            !exam.isPracticePool && exam.bookId
              ? { label: exam.bookTitle || "Kho sách đề", to: `/exams/jlpt/books?book=${encodeURIComponent(exam.bookId)}` }
              : { label: "Luyện đề JLPT", to: "/exams/jlpt" }
          }
          current={
            active?.endedAt
              ? `Kết quả · ${new Date(active.endedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
              : "Kết quả"
          }
          trail={
[]
          }
          actions={
            !result || !active ? undefined : <div
              role="tablist"
              aria-label="Các mục của trang kết quả"
              className="grid grid-cols-2 sm:inline-grid gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 w-full sm:w-auto"
            >
              {(
                [
                  ["summary", "Tóm tắt"],
                  ["detail", "Bài làm chi tiết"],
                ] as const
              ).map(([id, label]) => {
                const on = resultTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => showResultTab(id)}
                    className={`inline-flex items-center justify-center min-h-10 sm:px-5 rounded-lg text-[13px] sm:text-sm whitespace-nowrap transition-colors ${
                      on
                        ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                        : "text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          }
        />
      ) : (
        <JLPTPageHeader
          level={exam.level}
          root={
            !exam.isPracticePool && exam.bookId
              ? {
                  label: exam.bookTitle || "Kho sách đề",
                  to: `/exams/jlpt/books?book=${encodeURIComponent(exam.bookId)}`,
                }
              : { label: "Luyện đề JLPT", to: "/exams/jlpt" }
          }
          trail={[]}
          current={
            mode === "mock" && exam.isPracticePool
              ? `Đề thi thử ${exam.level}`
              : mode === "review" && !exam.isPracticePool
                ? `${dayName(exam)} · ${labels[mode]}`
                : labels[mode]
          }
        />
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

      {submitHint && unansweredCount > 0 && active?.status === "in_progress" && (
        <p role="alert" className="text-xs font-semibold mb-3 text-rose-700 dark:text-rose-300">
          Còn {unansweredCount} câu chưa chọn. Hãy chọn hết các câu rồi nộp bài.
        </p>
      )}

      {active &&
        catalogExam &&
        (active.exam.contentRevision || 0) <
          (catalogExam.contentRevision || 0) && (
          <p className="exam-card mb-4 text-sm border-amber-300 dark:border-amber-700">
            Bài trong tab đang giữ phiên bản nội dung cũ. Kết thúc lượt này rồi
            bắt đầu lượt mới để xem lời giải mới nhất.
          </p>
        )}

      {/* Mode 2: Drill & Mock Setup Screen */}
      {(mode === "drill" || mode === "mock") && !active && restoringDraft && (
        <div role="status" className="exam-card text-sm text-slate-600 dark:text-slate-300">
          Đang tải bài đang làm dở từ tài khoản…
        </div>
      )}
      {(mode === "drill" || mode === "mock") && !active && !restoringDraft && (
        <div className="exam-card !p-4 sm:!p-6 space-y-4 sm:space-y-5">
          {mode === "mock" && (
            <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Chuẩn bị {labels.mock.toLowerCase()}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {exam.isPracticePool
                  ? "54 câu · 50 phút rút ngẫu nhiên từ toàn bộ 20 ngày."
                  : "54 câu · 50 phút, giữ lựa chọn đến khi nộp bài hoặc hết giờ."}
              </p>
            </div>
          )}

          {mode === "drill" && (
            <div className="space-y-4 sm:space-y-5">
              {/* Step 1: Select Mondai */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    1. Chọn dạng bài (Mondai)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      aria-pressed={
                        activeMondaiNums.length === exam.mondais.length
                      }
                      onClick={() => selectMondaiGroup(ALL_MONDAI_NUMBERS)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        activeMondaiNums.length === exam.mondais.length
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      ✓ Tất cả 9 dạng
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.join(",") === "1,2"}
                      onClick={() => selectMondaiGroup([1, 2])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        activeMondaiNums.join(",") === "1,2"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Chữ Hán (M1–2)
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.join(",") === "3,4,5,6"}
                      onClick={() => selectMondaiGroup([3, 4, 5, 6])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        activeMondaiNums.join(",") === "3,4,5,6"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Từ vựng (M3–6)
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.join(",") === "7,8,9"}
                      onClick={() => selectMondaiGroup([7, 8, 9])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        activeMondaiNums.join(",") === "7,8,9"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Ngữ pháp (M7–9)
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMondaiNums.length === 0}
                      onClick={() => selectMondaiGroup([])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        activeMondaiNums.length === 0
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      }`}
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {/* Bài theo ngày dùng ô chọn; ngân hàng dùng lưới thẻ Mondai bên dưới (JL-32) */}
                {!exam.isPracticePool && (
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Chọn dạng
                    <select
                      className="exam-input block mt-1.5 w-full"
                      value={selected}
                      onChange={(e) => handleSelectDropdownChange(e.target.value)}
                    >
                      <option value="all">Toàn bộ ngày</option>
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

                {/* Interactive Multi-select Mondai Cards Grid (Compact rows on mobile, 3x3 on desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {exam.mondais.map((m) => {
                    const isChecked = activeMondaiNums.includes(m.number);
                    const stdQuota = STANDARD_MONDAI_QUOTAS[m.number] ?? 5;
                    return (
                      <button
                        key={m.number}
                        type="button"
                        aria-pressed={isChecked}
                        onClick={() => toggleMondaiNumber(m.number)}
                        className={`px-3 py-2 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                          isChecked
                            ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-600/15 text-slate-900 dark:text-white"
                            : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate text-slate-900 dark:text-white">
                            {m.titleVi}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Mondai {m.number} · Chuẩn đề: {stdQuota} · Kho: {dayFilter === "all" ? m.questions.length : m.questions.filter((q) => q.origin?.day === dayFilter).length}
                          </p>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
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

              {/* Step 2: Visible Round Size & Source Scope (No hidden accordion) */}
              {exam.isPracticePool && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      2. Số câu &amp; phạm vi ngày
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Có {plannedRound.eligibleCount} / {plannedRound.bankTotal} câu phù hợp
                    </span>
                  </div>

                  {/* 3 Allocation Mode Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      aria-pressed={allocationMode === "standard"}
                      onClick={() => setAllocationMode("standard")}
                      className={`px-3 py-2 rounded-xl border text-left transition-all ${
                        allocationMode === "standard"
                          ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-600/15"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                      }`}
                    >
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">
                        Theo tỷ lệ chuẩn đề (Mặc định)
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Đủ 9 Mondai = 54 câu
                      </p>
                    </button>

                    <button
                      type="button"
                      aria-pressed={allocationMode === "total"}
                      onClick={() => setAllocationMode("total")}
                      className={`px-3 py-2 rounded-xl border text-left transition-all ${
                        allocationMode === "total"
                          ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-600/15"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                      }`}
                    >
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">
                        Theo tổng số câu mỗi lượt
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Chọn 10, 20, 50 câu hoặc tất cả
                      </p>
                    </button>

                    <button
                      type="button"
                      aria-pressed={allocationMode === "per_mondai"}
                      onClick={() => setAllocationMode("per_mondai")}
                      className={`px-3 py-2 rounded-xl border text-left transition-all ${
                        allocationMode === "per_mondai"
                          ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-600/15"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                      }`}
                    >
                      <p className="font-semibold text-xs text-slate-900 dark:text-white">
                        Số câu bằng nhau mỗi Mondai
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Cố định 5–20 câu cho mỗi dạng
                      </p>
                    </button>
                  </div>

                  {/* Direct Selectors: Round Size + Day Scope */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                    {allocationMode === "total" && (
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span>Số câu mỗi lượt</span>
                      <select
                        className="exam-input !py-1 !min-h-8 text-xs"
                        value={roundSize}
                        onChange={(e) => {
                          setAllocationMode("total");
                          setRoundSize(e.target.value);
                        }}
                      >
                        {["10", "15", "20", "30", "50", "all"].map((n) => (
                          <option key={n} value={n}>
                            {n === "all"
                              ? "Tất cả câu phù hợp"
                              : `${n} câu`}
                          </option>
                        ))}
                      </select>
                    </label>
                    )}

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                      <span>Phạm vi ngày</span>
                      <select
                        className="exam-input !py-1 !min-h-8 text-xs"
                        value={dayFilter === "all" ? "all" : String(dayFilter)}
                        onChange={(e) =>
                          setDayFilter(
                            e.target.value === "all"
                              ? "all"
                              : Number(e.target.value),
                          )
                        }
                      >
                        <option value="all">Toàn bộ 20 ngày</option>
                        {Array.from({ length: 20 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Chỉ Ngày {d}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {allocationMode === "per_mondai" && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Số câu mỗi dạng:
                      </span>
                      {[5, 10, 15, 20].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setPerMondaiCount(cnt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            perMondaiCount === cnt
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {cnt} câu/dạng
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Summary Preview Box before starting (Single clear CTA on all viewports) */}
          <div className="p-3.5 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1 min-w-0 w-full sm:flex-1">
              <p className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                {mode === "drill"
                  ? plannedRound.reason === "passage_expanded"
                    ? `Mục tiêu: ${plannedRound.targetTotal} câu · Lượt này: ${plannedRound.actualTotal} câu`
                    : `Lượt này: ${plannedRound.actualTotal} câu`
                  : `Lượt này: ${plannedRound.actualTotal} câu · ${exam.timeLimitMinutes || 50} phút`}
              </p>

              {plannedRound.reasonMessage && (
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {plannedRound.reasonMessage}
                </p>
              )}

              {plannedRound.mondaiDistribution.length > 0 && (
                <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  Phân bổ:{" "}
                  {plannedRound.mondaiDistribution
                    .map((d) => `M${d.mondai}: ${d.count}`)
                    .join(" · ")}
                </p>
              )}
            </div>

            <button
              type="button"
              className="exam-primary !px-6 !py-3 text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
        </div>
      )}

      {/* Mode 3: Result Screen */}
      {mode === "result" && !submitted && resultLoad === "loading" && (
        <div className="exam-card" role="status">
          Đang tải kết quả…
        </div>
      )}
      {mode === "result" && !submitted && resultLoad !== "loading" && (
        <div className="exam-card">
          {!uid && !authLoading
            ? "Đăng nhập để xem kết quả này. Kết quả đã lưu nằm trong tài khoản của bạn."
            : resultLoad === "missing"
              ? "Không tìm thấy kết quả này. Bản ghi có thể đã bị xóa, chưa có chi tiết từng câu hoặc thuộc tài khoản khác."
              : "Chưa có kết quả của bài này."}{" "}
          {!uid && !authLoading && (
            <Link className="text-indigo-600 dark:text-indigo-400 font-bold underline mr-2" to="/login" state={{ from: `${location.pathname}${location.search}` }}>
              Đăng nhập
            </Link>
          )}
          <Link
            className="text-indigo-600 dark:text-indigo-400 font-bold underline"
            to="/exams/jlpt"
          >
            Về Luyện đề JLPT
          </Link>
        </div>
      )}

      {result && active && (
        <section className="mb-6">
          {historySave.state.status === "error" && (
            <div
              role="alert"
              className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
            >
              <p className="min-w-0 flex-1">
                <strong>Chưa lưu được kết quả lên tài khoản.</strong> {describeFirebaseError(historySave.state.kind)}.
                Đừng đóng hoặc tải lại trang này, kết quả sẽ mất.
              </p>
              <button type="button" className="exam-secondary !min-h-9 shrink-0" onClick={historySave.retry}>
                Thử lưu lại
              </button>
            </div>
          )}
          {(mode !== "result" || resultTab === "summary") && (
          <div className="exam-card grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
            {/* Tên bài, nhãn và kết quả chính */}
            <>
              <div className="space-y-2 min-w-0 lg:col-start-1 lg:row-start-1 lg:self-center">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {describeAttempt(active, now).title}
                  </h2>
                  {active.reason === "timeout" && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/60 text-xs font-semibold text-rose-700 dark:text-rose-200">
                      Hết giờ
                    </span>
                  )}
                  {active.assisted.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Có dùng trợ giúp ({active.assisted.length} câu)
                    </span>
                  )}
                </div>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight text-indigo-600 dark:text-indigo-300">
                  {result.correct}/{result.total} câu đúng · {result.percent}%
                </p>
                {/* So với lượt trước (chỉ hiện khi vừa lưu xong và có lượt trước để so) */}
                {historySave.state.status === "saved" && historySave.state.previous && (
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                    Lượt trước: {historySave.state.previous.correct}/{historySave.state.previous.total} →
                    lượt này: {result.correct}/{result.total}
                  </p>
                )}
              </div>
              {/* Ô số liệu: Đúng, Sai (câu chưa làm tính là sai) (+ Thời gian làm với bài có giờ) */}
              <div
                className={`grid gap-2.5 sm:gap-3 lg:col-start-2 lg:row-start-1 lg:self-center ${active.mode === "mock" ? "grid-cols-3" : "grid-cols-2"}`}
              >
                {(
                  [
                    ["Đúng", String(result.correct), "text-emerald-700 dark:text-emerald-400"],
                    ["Sai", String(result.wrong + result.blank), "text-rose-700 dark:text-rose-400"],
                    ...(active.mode === "mock"
                      ? [
                          [
                            "Thời gian làm",
                            formatAttemptDuration(active, now),
                            "text-slate-900 dark:text-slate-100",
                          ],
                        ]
                      : []),
                  ] as [string, string, string][]
                ).map(([label, v, color]) => (
                  <div
                    key={label}
                    className="px-2 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center"
                  >
                    <strong className={`block text-xl sm:text-2xl font-bold tabular-nums ${color}`}>
                      {v}
                    </strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                    {label === "Thời gian làm" && (active.pausedMs ?? 0) >= 1000 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        (tạm dừng {formatDuration(active.pausedMs ?? 0)})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>

            <>
              {/* Trái: thống kê theo từng dạng (Mondai) */}
              <div className="lg:col-start-1 lg:row-start-2 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Thống kê theo từng dạng (Mondai)
                </h3>
                <div className="space-y-3">
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
                      <div key={m.number} className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                            Mondai {m.number} · {MONDAI_NAMES[m.number] ?? m.titleVi}: {rightCount}/{qs.length}
                          </p>
                          <span className="font-bold tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 75
                                ? "bg-emerald-500"
                                : pct >= 50
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

              {/* Phải: điểm ước tính và hành động (chỉ Luyện câu sai + Làm lại cả bài) */}
              <div className="lg:col-start-2 lg:row-start-2 flex flex-col gap-3">
                {standardScore ? (
                  <div className="flex-1 flex flex-col justify-center p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/25 space-y-1.5">
                    <p className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      <Award size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span title="Ước tính từ số câu đúng (câu đoạn văn Mondai 9 tính nặng gấp đôi). JLPT thật dùng điểm quy đổi riêng nên chỉ để tham khảo.">
                        Điểm ước tính: {standardScore.scaledScore}/60
                      </span>
                      {["N1", "N2", "N3"].includes(exam.level) && (
                        <span
                          className={`ml-auto shrink-0 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-xs font-bold ${
                            standardScore.scaledScore >= 19
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          }`}
                        >
                          {standardScore.scaledScore >= 19 ? "Đạt mức tối thiểu" : "Dưới mức tối thiểu"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Từ vựng {standardScore.vocabCorrect}/{standardScore.vocabTotal} · Ngữ pháp{" "}
                      {standardScore.grammarCorrect}/{standardScore.grammarTotal} · tham khảo
                    </p>
                  </div>
                ) : (
                  isStandardExamStructure(active) && active.mode === "mock" && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Không có ước lượng /60 vì lượt này dùng trợ giúp hoặc không thi nghiêm túc.
                    </p>
                  )
                )}


                {result.wrong + result.blank > 0 && (
                  <button
                    type="button"
                    aria-label="Luyện câu sai"
                    onClick={() => retry("wrong")}
                    className="w-full flex-1 text-left p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/25 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span className="text-xs space-y-0.5 min-w-0 block">
                      <span className="block font-bold text-slate-900 dark:text-white">
                        {result.wrong + result.blank} câu sai
                      </span>
                      <span className="block text-slate-600 dark:text-slate-300">
                        Làm lại riêng các câu sai
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 whitespace-nowrap inline-flex items-center justify-center min-h-9 px-3.5 rounded-xl bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-xs"
                    >
                      Luyện câu sai
                    </span>
                  </button>
                )}
                {(() => {
                  // Mondai yếu của riêng bài này (dưới 75%, tối đa 2 dạng thấp nhất)
                  const stats = exam.mondais.flatMap((m) => {
                    const qs = m.questions.filter((q) => active.questionIds.includes(q.id));
                    if (!qs.length) return [];
                    const right = qs.filter((q) => active.answers[q.id] === q.answer).length;
                    return [
                      {
                        mondai: m.number,
                        correct: right,
                        total: qs.length,
                        percent: Math.round((right / qs.length) * 100),
                        name: m.titleVi,
                      },
                    ];
                  });
                  const weak = detectWeakMondais(stats, 2).map((w) => ({
                    ...w,
                    name: stats.find((s) => s.mondai === w.mondai)?.name ?? "",
                  }));
                  if (!weak.length) return null;
                  const tag = weak.map((w) => `M${w.mondai}`).join(", ");
                  return (
                    <button
                      type="button"
                      aria-label={`Luyện Mondai yếu ${tag}`}
                      onClick={() => practiceWeak(weak.map((w) => w.mondai))}
                      className="w-full flex-1 text-left p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/25 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="flex items-start gap-2.5 min-w-0">
                        <AlertTriangle
                          size={16}
                          className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span className="text-xs space-y-0.5 min-w-0 block">
                          <span className="block font-bold text-slate-900 dark:text-white">
                            Cần củng cố
                          </span>
                          <span className="block text-slate-600 dark:text-slate-300">
                            {weak.map((w) => `Mondai ${w.mondai} · ${w.percent}%`).join(" · ")}
                          </span>
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-1.5 min-h-9 px-3.5 rounded-xl bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-xs"
                      >
                        <Target size={14} />
                        <span>Luyện ngay {tag}</span>
                      </span>
                    </button>
                  );
                })()}
                <div className="grid grid-cols-1 gap-2">
                  <button className="exam-secondary w-full justify-center" onClick={() => retry("full")}>
                    <RotateCcw size={14} />
                    <span>Ôn lại cả bài · không tính giờ</span>
                  </button>
                  {canRestoreBackupResult && (
                    <button
                      type="button"
                      className="exam-secondary w-full justify-center"
                      onClick={restorePreviousResult}
                    >
                      ← Quay lại kết quả bài thi
                    </button>
                  )}
                  {active.retry ? null : exam.isPracticePool && active.mode === "drill" ? (
                    <>
                      <button className="exam-secondary w-full justify-center" onClick={() => void reshuffleSameConfig()}>
                        <RotateCcw size={14} />
                        <span>Làm lượt mới cùng cấu hình</span>
                      </button>
                      <button
                        type="button"
                        className="self-center text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-4 min-h-9"
                        onClick={openSetupFromConfig}
                      >
                        Đổi cấu hình
                      </button>
                    </>
                  ) : null}
                </div>

              </div>
            </>
          </div>
          )}

          <div className="space-y-1 px-1 pt-3 empty:hidden text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {active.assisted.length > 0 && (
              <p>{active.assisted.length} câu đã dùng trợ giúp trước khi chốt đáp án.</p>
            )}
            {historySave.state.status === "guest" && (
              <p>
                Kết quả này chỉ giữ tới khi bạn đóng tab.{" "}
                <Link className="font-semibold text-indigo-700 dark:text-indigo-300 underline underline-offset-4 inline-flex items-center min-h-9" to="/login" state={{ from: `${location.pathname}${location.search}` }}>
                  Đăng nhập để lưu
                </Link>
              </p>
            )}
            {historySave.state.status === "saving" && <p role="status">Đang lưu…</p>}
          </div>


        </section>
      )}

      {/* Mode 4: Lượt đang làm — thanh điều khiển gọn ở sidebar phải (Desktop ≥1024px) hoặc dính đầu + thanh đáy (Mobile <1024px) */}
      {active?.status === "in_progress" && current && (
        <>
          {showInfo && (
            <div className="exam-card mb-4 text-sm text-slate-600 dark:text-slate-300 hidden sm:flex items-start justify-between gap-3">
              <p>
                {exam.level} · {exam.bookTitle}
                {active?.mode === "mock" && active.strict ? "" : " · Bôi đen từ tiếng Nhật bất kỳ để tra từ đa sách"}
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* Sidebar điều khiển: sticky trên đầu ở Mobile, dính cột phải ở Desktop */}
            <aside
              className={`order-1 lg:order-2 lg:col-span-4 sticky z-20 ${strictRunning ? "top-1 lg:top-4" : "top-16 lg:top-20"}`}
            >
              <div className="exam-card !p-2.5 sm:!p-3 lg:!p-4 space-y-3 lg:space-y-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md lg:max-h-[calc(100vh-5.75rem)] lg:overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pb-0 lg:pb-3 lg:border-b lg:border-slate-100 lg:dark:border-slate-800">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <strong
                      className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 tabular-nums max-w-[130px] sm:max-w-none ${
                        active.mode === "mock" && remaining <= 300
                          ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse"
                          : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300"
                      }`}
                    >
                      {active.mode === "mock" ? (
                        <Clock size={14} />
                      ) : (
                        <Zap size={14} />
                      )}
                      <span className="truncate">
                        {active.mode === "mock" ? (
                          `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                        ) : active.retry ? (
                          retryBadgeLabel
                        ) : (
                          <>
                            <span className="sm:hidden">Luyện tập</span>
                            <span className="hidden sm:inline">
                              {labels.drill}
                            </span>
                          </>
                        )}
                      </span>
                    </strong>
                    <span className="lg:hidden text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap shrink-0 text-slate-600 dark:text-slate-300">
                      {Object.keys(active.answers).length}/
                      {active.questionIds.length}{" "}
                      <span className="hidden sm:inline">
                        đã chọn
                      </span>
                    </span>
                  </div>
                  {togglePassage && (
                    <PassageViewSwitch
                      view={passageSwitch.view}
                      shortcutHint="R"
                      onChange={(next) =>
                        next === "passage"
                          ? passageSwitch.showPassage()
                          : passageSwitch.showQuestion()
                      }
                    />
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <AttemptMenu items={attemptMenuItems} />
                    <button
                      className={`${active.mode === "mock" ? "exam-primary" : "exam-secondary"} !px-3 sm:!px-3.5 !min-h-9 lg:!min-h-10 text-xs sm:text-sm whitespace-nowrap shrink-0`}
                      aria-label={
                        active.mode === "mock" ? "Nộp bài" : "Kết thúc luyện"
                      }
                      onClick={submit}
                    >
                      {active.mode === "mock" ? (
                        <>
                          <span className="sm:hidden">Nộp</span>
                          <span className="hidden sm:inline">Nộp bài</span>
                        </>
                      ) : (
                        <>
                          <span className="sm:hidden">Kết thúc</span>
                          <span className="hidden sm:inline">
                            Kết thúc luyện
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Phiếu trả lời & nút chuyển câu tích hợp trong sidebar Desktop */}
                <div className="hidden lg:block space-y-4">
                  <QuestionPalette
                    attempt={active}
                    groups={groups}
                    seqMap={questionSeqMap}
                    stats={liveDrillStats}
                    currentQuestionId={activeUnitQuestion?.id}
                    onJump={jumpToQuestion}
                    showShortcutHint
                    hasPassage={groups.some((g) =>
                      Boolean(g.mondai.passages?.length && g.questions[0]?.passageId),
                    )}
                    gridClassName="max-h-[38vh] min-h-[140px] overflow-y-auto"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      className="exam-secondary !min-h-10 !px-2.5 text-xs xl:text-sm"
                      disabled={!canStepPrev}
                      onClick={stepPrev}
                    >
                      ← Câu trước
                    </button>
                    <button
                      type="button"
                      className={`${
                        nextEmphasis ? "exam-primary" : "exam-secondary"
                      } !min-h-10 !px-2.5 text-xs xl:text-sm`}
                      disabled={!canStepNext}
                      onClick={stepNext}
                    >
                      {nextEmphasis ? "Câu tiếp →" : "Tiếp / Bỏ qua →"}
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Cột trái: Tập trung tối đa cho đề bài, đoạn văn & câu hỏi */}
            <div className="order-2 lg:order-1 lg:col-span-8 space-y-4 min-w-0">
              {showGroup(
                current,
                false,
                true,
                groups
                  .filter((g) => g.mondai.number === current.mondai.number)
                  .reduce((sum, g) => sum + g.questions.length, 0),
                undefined,
                activeUnitQuestion?.id,
                false,
                passageSwitch,
              )}

              {(!togglePassage || passageSwitch.view === "question") &&
                active.mode === "drill" &&
                current.questions.length > 1 &&
                !current.questions.every((q) =>
                  active.committed.includes(q.id),
                ) && (
                  <button
                    className="exam-primary w-full"
                    disabled={
                      !current.questions.every((q) => active.answers[q.id])
                    }
                    onClick={() => {
                      const currentIds = current.questions.map((q) => q.id);
                      update((a) => ({
                        ...a,
                        committed: [...new Set([...a.committed, ...currentIds])],
                      }));
                      setExpanded((prev) => [
                        ...new Set([...prev, ...currentIds]),
                      ]);
                    }}
                  >
                    Kiểm tra nhóm
                  </button>
                )}
            </div>
          </div>

          <MobileAttemptBar
            canPrev={canStepPrev}
            canNext={canStepNext}
            answered={Object.keys(active.answers).length}
            total={active.questionIds.length}
            sheetOpen={sheet}
            sheetId="palette-sheet"
            emphasizeNext={nextEmphasis}
            pendingOption={pending ? pending.option : null}
            onUndoPending={undoPending}
            onPrev={stepPrev}
            onNext={stepNext}
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
              currentQuestionId={activeUnitQuestion?.id}
              onJump={(unitIdx, qid) => {
                setSheet(false);
                jumpToQuestion(unitIdx, qid);
              }}
              gridClassName=""
            />
          </BottomSheet>
        </>
      )}

      {/* Mode 5: Reference Review / Post-Submit Review (Focus Từng câu mặc định + Danh sách) */}
      {(mode === "review" || (submitted && reviewing && (mode !== "result" || resultTab === "detail"))) && (
        <div className="space-y-5">
          {/* Filter, View Mode Toggle & List Expand Controls */}
          {mode === "review" && (
            <p className="lg:hidden text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
              Đã làm {reviewStats.done}/{reviewStats.total} · Đúng {reviewStats.right} · Sai {reviewStats.wrong} · Điểm {reviewStats.score}/60
            </p>
          )}
          <div
            className={`exam-toolbar justify-between gap-2 flex-wrap sm:flex-nowrap ${mode === "result" && !togglePassage ? "hidden" : ""} ${mode === "review" && !togglePassage ? "hidden" : ""}`}
          >

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 ml-auto">

              {togglePassage && reviewView === "focus" && (
                <PassageViewSwitch
                  view={passageSwitch.view}
                  shortcutHint="R"
                  onChange={(next) =>
                    next === "passage"
                      ? passageSwitch.showPassage()
                      : passageSwitch.showQuestion()
                  }
                />
              )}

              {(reviewView === "list" || displayedUnits.length === 0) && (
                <button
                  type="button"
                  className="lg:hidden exam-secondary !py-1.5 !px-2.5 !min-h-8 text-xs"
                  onClick={() => setReviewTocOpen(true)}
                >
                  <List size={14} />
                  <span>Mục lục ({displayedQuestions.length})</span>
                </button>
              )}


              {mode !== "review" && reviewView === "list" && (
                <>
                  <button
                    type="button"
                    aria-label="Mở tất cả lời giải"
                    className="exam-secondary !py-1.5 !px-2.5 sm:!px-3 !min-h-8 sm:!min-h-9 text-xs"
                    onClick={() =>
                      // JL-15: render ngắt quãng được, không khóa trang khi mở 54 lời giải
                      startTransition(() =>
                        setExpanded(
                          exam.mondais.flatMap((m) =>
                            m.questions.map((q) => q.id),
                          ),
                        ),
                      )
                    }
                  >
                    <span className="sm:hidden">Mở giải</span>
                    <span className="hidden sm:inline">Mở tất cả lời giải</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Thu gọn tất cả"
                    className="exam-secondary !py-1.5 !px-2.5 sm:!px-3 !min-h-8 sm:!min-h-9 text-xs"
                    onClick={() => setExpanded([])}
                  >
                    <span className="sm:hidden">Thu gọn</span>
                    <span className="hidden sm:inline">Thu gọn tất cả</span>
                  </button>
                </>
              )}
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
                  const sourceUnits =
                    mode === "review" ? units(exam) : groups;
                  const targetIdx = sourceUnits.findIndex((u) =>
                    u.questions.some((q) => q.id === hashQuestionId),
                  );
                  if (mode === "review") setSelected("all");
                  else setFilter("all");
                  if (targetIdx >= 0) setReviewUnitIdx(targetIdx);
                  setFocusedQid(hashQuestionId);
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
              {displayedUnits.length === 0 ? (
                <div className="exam-card text-center py-8">
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    Không có câu phù hợp bộ lọc.
                  </p>
                </div>
              ) : reviewView === "focus" && activeReviewUnit ? (
                showGroup(
                  activeReviewUnit,
                  true,
                  true,
                  displayedUnits
                    .filter(
                      (u) =>
                        u.mondai.number === activeReviewUnit.mondai.number,
                    )
                    .reduce((sum, u) => sum + u.questions.length, 0),
                  mode !== "review" && filter !== "all"
                    ? matchedQuestionIds
                    : undefined,
                  activeReviewQ?.id,
                  mode === "review",
                  passageSwitch,
                )
              ) : (
                displayedUnits.map((g, idx) => {
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
                })
              )}
            </div>

            {/* Sticky Quick-Jump Review Sidebar (Desktop: sidebar, Mobile: BottomSheet) */}
            <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 space-y-4">
              <div className="exam-card space-y-3 lg:max-h-[calc(100vh-5.75rem)] lg:overflow-y-auto">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Mục lục chuyển nhanh câu hỏi
                </p>
                {mode === "review" && renderReviewSummary()}
                {renderQuickJumpGrid()}
                {reviewView === "focus" && displayedUnits.length > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        className="exam-secondary !min-h-10 !px-2.5 text-xs xl:text-sm"
                        disabled={!canReviewPrev}
                        onClick={stepReviewPrev}
                      >
                        ← Câu trước
                      </button>
                      <button
                        type="button"
                        className="exam-primary !min-h-10 !px-2.5 text-xs xl:text-sm"
                        disabled={!canReviewNext}
                        onClick={stepReviewNext}
                      >
                        Câu tiếp →
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Phím tắt: ←/→ chuyển câu
                      {togglePassage ? " · R đoạn văn" : ""}
                    </p>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {isReviewModeActive &&
        reviewView === "focus" &&
        displayedUnits.length > 0 && (
          <nav
            aria-label="Điều hướng xem đáp án"
            className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
          >
            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 px-3 py-2.5">
              <button
                type="button"
                className="exam-secondary !min-h-11"
                disabled={!canReviewPrev}
                onClick={stepReviewPrev}
              >
                ← Trước
              </button>
              <button
                type="button"
                className="exam-secondary !min-h-11 !px-2 whitespace-nowrap"
                onClick={() => setReviewTocOpen(true)}
              >
                <List size={15} />
                <span>
                  {activeReviewQ
                    ? `${displayedQuestions.findIndex((q) => q.id === activeReviewQ.id) + 1}/${displayedQuestions.length}`
                    : `${displayedQuestions.length}`}
                </span>
              </button>
              <button
                type="button"
                className="exam-primary !min-h-11"
                disabled={!canReviewNext}
                onClick={stepReviewNext}
              >
                Tiếp →
              </button>
            </div>
          </nav>
        )}

      {isReviewModeActive && reviewView === "list" && (
        <button
          type="button"
          aria-label="Lên đầu trang"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="lg:hidden fixed right-4 bottom-5 z-30 h-11 w-11 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-colors"
        >
          <ArrowUp size={18} />
        </button>
      )}

      <BottomSheet
        open={reviewTocOpen}
        id="review-toc-sheet"
        title="Mục lục câu hỏi"
        onClose={() => setReviewTocOpen(false)}
      >
        {mode === "review" && <div className="mb-3">{renderReviewSummary()}</div>}
        {renderQuickJumpGrid(() => setReviewTocOpen(false))}
      </BottomSheet>

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
        key={`${examId}:${mode}:${active?.position}:${active?.status}:${passageSwitch.view}`}
        enabled={lookupEnabled && !strictRunning}
        onLookup={(text) => {
          openLookupModal(text);
        }}
      />
    </div>
  );
}
