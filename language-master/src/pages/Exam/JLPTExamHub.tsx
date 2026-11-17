import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { dayName } from "../../lib/jlpt/attemptLabels";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Headphones,
  LogIn,
  Search,
  Sparkles,
  X,
  PenLine,
} from "lucide-react";
import {
  getExamById,
  getJLPTBooksByLevel,
  type JLPTLevel,
} from "../../data/exams/jlpt";
import { useOptionalAuth } from "../../context/auth/useOptionalAuth";
import { createAttempt } from "../../lib/jlpt/examCore";
import {
  clearLastResultBackup,
  getSession,
  refreshSession,
  setSession,
} from "../../lib/jlpt/tabSession";
import { useJlptSession } from "./useJlptSession";
import {
  buildUnfinishedList,
  planNewAttempt,
  slotOf,
  type UnfinishedItem,
} from "../../lib/jlpt/attemptSlots";
import {
  classifyFirebaseError,
  describeFirebaseError,
} from "../../lib/jlpt/firebaseErrors";
import { useSaveAttemptHistory } from "./workspace/useSaveAttemptHistory";
import { matchExamQuery } from "../../lib/jlpt/examSearch";
import { clearLegacyExamHistory } from "../../lib/jlpt/legacyHistory";
import BottomSheet from "./workspace/BottomSheet";
import { useConfirmation } from "./components/useConfirmation";
import {
  canCreateStandardMock,
  planPracticeRound,
  poolId,
  practiceSnapshot,
} from "../../lib/jlpt/practicePool";
import {
  HISTORY_LOAD_LIMIT,
  buildAttemptHistoryRecord,
  isMockAttempt,
  reconstructAttemptFromHistory,
} from "../../lib/jlpt/historySummary";
import type { StoredAttemptSummary } from "../../lib/jlpt/historyService";
import {
  DRAFTS_CHANGED_EVENT,
  draftSyncError,
  loadUserDrafts,
  readLocalDrafts,
  removeUserDraft,
  restoreAttemptFromDraft,
  saveUserDraft,
  type CompactDraft,
} from "../../lib/jlpt/draftStore";
import SkillRadarCard from "./hub/SkillRadarCard";
import JLPTSubNav from "./hub/JLPTSubNav";
import OverviewPanel from "./hub/OverviewPanel";
import HistoryPanel from "./hub/HistoryPanel";
import FreePracticeCard from "./hub/FreePracticeCard";
import FreeScopeModal, { type FreeScopeBookOption } from "./hub/FreeScopeModal";
import {
  buildFreeScopeSearchParams,
  collectFreePracticeSeeds,
  FREE_PRACTICE_ALL_MONDAIS,
  getFreeScopeBookOptions,
  saveFreePracticeHandoff,
  type FreePracticeConfig,
  type FreePracticeFixedKind,
} from "../../lib/jlpt/freePractice";

type UpcomingSkillModal = "dokkai" | "choukai" | null;

/** Bản lưu tạm dữ liệu Tổng quan trong RAM (BE-6) */
const DASHBOARD_CACHE_MS = 60_000;
let dashboardCache: {
  uid: string;
  version: number;
  at: number;
  recent: StoredAttemptSummary[];
  count: number | null;
} | null = null;

export default function JLPTExamHub({
  initialView = "main",
  tab: activeTab = "overview",
}: {
  initialView?: "main" | "books";
  tab?: "overview" | "practice";
} = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const uid = useOptionalAuth()?.user?.uid ?? null;
  const { ask, confirmation } = useConfirmation();
  const [params, setParams] = useSearchParams();
  const { attempt, notice, noticeKind } = useJlptSession();
  const [sheetExamId, setSheetExamId] = useState<string | null>(null);
  const [upcomingModal, setUpcomingModal] =
    useState<UpcomingSkillModal>(null);
  const startingMockRef = useRef(false);
  useDocumentTitle(
    initialView === "books" || location.pathname === "/exams/jlpt/books"
      ? "Kho sách đề"
      : activeTab === "practice"
        ? "Luyện tập"
        : "Luyện đề JLPT",
  );
  const upcomingDialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!upcomingModal) return;
    const previous = document.activeElement as HTMLElement | null;
    upcomingDialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUpcomingModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [upcomingModal]);

  // Trạng thái Bảng điều khiển (chỉ tải cho tài khoản đã đăng nhập; dữ liệu nằm trên Firebase)
  const [historyItems, setHistoryItems] = useState<StoredAttemptSummary[]>([]);
  const [drafts, setDrafts] = useState<CompactDraft[]>([]);
  /** Tổng số lần thi thử từ trước đến nay (bộ đếm trên tài khoản) */
  const [mockTotal, setMockTotal] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  /** Lỗi đồng bộ bài dở với Firebase (tải, ghi, xóa) */
  const [draftsError, setDraftsError] = useState<string | null>(null);

  const reloadDashboard = useCallback(async (userId: string, force = true) => {
    setDrafts(readLocalDrafts(userId));
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const histMod = await import("../../lib/jlpt/historyService");
      // BE-6: vào lại Tổng quan trong 60 giây mà lịch sử chưa đổi thì dùng bản đã tải, đỡ đọc Firestore
      const version = histMod.getHistoryVersion?.() ?? 0;
      const cached = dashboardCache;
      const useCache =
        !force &&
        cached !== null &&
        cached.uid === userId &&
        cached.version === version &&
        Date.now() - cached.at < DASHBOARD_CACHE_MS;
      // Lịch sử và bài dở tải riêng: một bên lỗi không làm mất bên kia (R3)
      const [recent, loadedDrafts, count] = useCache
        ? ([
            { status: "fulfilled", value: cached.recent } as PromiseFulfilledResult<StoredAttemptSummary[]>,
            ...(await Promise.allSettled([loadUserDrafts(userId)])),
            { status: "fulfilled", value: cached.count } as PromiseFulfilledResult<number | null>,
          ] as const)
        : await Promise.allSettled([
            histMod.listRecentAttempts(userId, { max: HISTORY_LOAD_LIMIT }),
            loadUserDrafts(userId),
            histMod.getMockCount(userId),
          ]);
      if (
        !useCache &&
        recent.status === "fulfilled" &&
        count.status === "fulfilled"
      ) {
        dashboardCache = {
          uid: userId,
          version,
          at: Date.now(),
          recent: recent.value as StoredAttemptSummary[],
          count: count.value as number | null,
        };
      }
      // Bộ đếm là phụ: lỗi đọc thì ô "Lần thi thử" tính theo các bài còn trong lịch sử
      setMockTotal(count.status === "fulfilled" ? count.value : null);
      const savedIds = new Set(
        recent.status === "fulfilled" ? recent.value.map((r) => r.id) : [],
      );
      if (loadedDrafts.status === "fulfilled") {
        // Bản nháp của bài đã nộp (có trong lịch sử) thì xóa, không hiện ở "Đang làm"
        for (const d of loadedDrafts.value)
          if (savedIds.has(d.id)) removeUserDraft(userId, d.id);
        setDrafts(readLocalDrafts(userId));
        setDraftsError(null);
      } else {
        setDraftsError(
          `Không tải được bài đang làm dở: ${describeFirebaseError(classifyFirebaseError(loadedDrafts.reason))}.`,
        );
      }
      if (recent.status === "fulfilled") {
        setHistoryItems(recent.value);
      } else {
        console.error("[JLPT] Không tải được lịch sử:", recent.reason);
        setHistoryError(
          `Không tải được lịch sử: ${describeFirebaseError(classifyFirebaseError(recent.reason))}.`,
        );
      }
    } catch (e) {
      console.error("[JLPT] Không tải được lịch sử:", e);
      setHistoryError(
        `Không tải được lịch sử: ${describeFirebaseError(classifyFirebaseError(e))}.`,
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      setHistoryItems([]);
      setMockTotal(null);
      setDrafts([]);
      setHistoryError(null);
      setDraftsError(null);
      return;
    }
    void reloadDashboard(uid, false);
    const onDraftChange = () => {
      setDrafts(readLocalDrafts(uid));
      const kind = draftSyncError();
      setDraftsError(
        kind ? `Chưa đồng bộ được bài đang làm với tài khoản: ${describeFirebaseError(kind)}.` : null,
      );
    };
    window.addEventListener(DRAFTS_CHANGED_EVENT, onDraftChange);
    return () => {
      window.removeEventListener(DRAFTS_CHANGED_EVENT, onDraftChange);
    };
  }, [uid, reloadDashboard]);

  // Lưới an toàn: bài đã nộp trong tab mà chưa lưu (vd. khách vừa đăng nhập, hoặc nộp lúc mất mạng)
  // được lưu ngay tại trang chính, không cần mở trang kết quả
  const tabSave = useSaveAttemptHistory(
    attempt?.status === "submitted" ? attempt : null,
    { comparePrevious: false },
  );
  // Kết quả chưa lưu được chỉ nằm trong RAM của trang: hỏi trước khi tải lại / đóng trang
  const tabResultUnsaved = Boolean(uid) && tabSave.state.status === "error";
  useEffect(() => {
    if (!tabResultUnsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [tabResultUnsaved]);

  const storedLevel = (() => {
    try {
      const v = localStorage.getItem("jlpt-hub-level");
      return v && ["N1", "N2", "N3", "N4", "N5"].includes(v) ? v : null;
    } catch {
      return null;
    }
  })();
  const level = params.get("level") || storedLevel || "ALL",
    query = params.get("q") || "",
    selectedBookId = params.get("book") || "";
  const normalizedQuery = query.trim().toLowerCase();
  const isBooksView =
    initialView === "books" ||
    location.pathname === "/exams/jlpt/books" ||
    params.get("view") === "books";
  const showBooksRepository =
    !selectedBookId && (isBooksView || Boolean(normalizedQuery));

  const books = getJLPTBooksByLevel(
    ["N1", "N2", "N3", "N4", "N5"].includes(level)
      ? (level as JLPTLevel)
      : "ALL",
  );
  const allBooks = getJLPTBooksByLevel("ALL");
  const levelCounts = allBooks.reduce<Record<string, number>>((acc, b) => {
    acc[b.level] = (acc[b.level] || 0) + b.exams.length;
    return acc;
  }, {});
  const firstLevelWithExams = ["N1", "N2", "N3", "N4", "N5"].find(
    (l) => levelCounts[l],
  );
  const filtered = books
    .map((b) => ({
      ...b,
      exams: normalizedQuery
        ? b.exams.filter((e) =>
            matchExamQuery(e, b.title, normalizedQuery),
          )
        : b.exams,
    }))
    .filter((b) => b.exams.length);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    clearLegacyExamHistory();
  }, []);
  // Chỉ cập nhật từng giây khi có bài đang chạy giờ; còn lại làm mới thưa để đỡ render lại cả trang
  const liveClock = attempt?.status === "in_progress" && attempt.mode === "mock";
  useEffect(() => {
    refreshSession();
    const timer = setInterval(
      () => {
        refreshSession();
        if (liveClock) setNow(Date.now());
      },
      liveClock ? 1000 : 15000,
    );
    return () => clearInterval(timer);
  }, [liveClock]);

  const change = (key: string, value: string) => {
    if (key === "level") {
      try {
        if (value) localStorage.setItem("jlpt-hub-level", value);
        else localStorage.removeItem("jlpt-hub-level");
      } catch {
        // Bỏ qua nếu trình duyệt chặn storage
      }
    }
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const selectBook = (bookId: string | null) => {
    const next = new URLSearchParams(params);
    if (bookId) {
      next.set("book", bookId);
      next.delete("view");
    } else {
      next.delete("book");
      if (location.pathname !== "/exams/jlpt/books") next.set("view", "books");
    }
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetBookFilters = (nextLevel?: string) => {
    const next = new URLSearchParams();
    if (isBooksView && location.pathname !== "/exams/jlpt/books") {
      next.set("view", "books");
    }
    if (nextLevel) next.set("level", nextLevel);
    setParams(next);
  };

  // FIX-01: Tách riêng sách đang mở (openedBook) và danh sách bài khớp từ khóa (matchedBookExams)
  const openedBook = selectedBookId
    ? books.find((b) => b.id === selectedBookId) ||
      allBooks.find((b) => b.id === selectedBookId) ||
      null
    : null;
  const isInvalidBookId = Boolean(selectedBookId) && !openedBook;
  /** Tổng quan / Luyện tập: đầu trang gọn (tiêu đề + thanh tab); Kho sách đề và chi tiết sách giữ đầu trang riêng */
  const isMainView =
    !openedBook && !isInvalidBookId && !showBooksRepository;
  // Phiên từ ngân hàng của sách đang hiện (JL-21)
  const sheetExam = sheetExamId
    ? openedBook?.exams.find((e) => e.id === sheetExamId)
    : undefined;

  const matchedBookExams = openedBook
    ? normalizedQuery
      ? openedBook.exams.filter((e) =>
          matchExamQuery(e, openedBook.title, normalizedQuery),
        )
      : openedBook.exams
    : [];

  const primaryBook = openedBook || filtered[0] || books[0];
  const primaryPoolId = primaryBook
    ? poolId(primaryBook.id, primaryBook.level)
    : "pool-N2-kokusho-20days";
  const primaryPoolExam = getExamById(primaryPoolId);
  const canStartPrimaryMock = primaryPoolExam
    ? canCreateStandardMock(primaryPoolExam)
    : false;
  // ---------- Một nguồn duy nhất cho bài làm ----------
  // Đang làm: bài trong tab + bản nháp (bỏ trùng). Đã nộp: lịch sử + hàng chờ lưu + bài vừa nộp trong tab.
  const unfinished: UnfinishedItem[] = buildUnfinishedList(
    attempt && getExamById(attempt.exam.id)?.isPracticePool ? attempt : null,
    uid ? drafts.filter((d) => getExamById(d.examId)?.isPracticePool) : [],
    now,
  );
  const mockSlot = slotOf({ examId: primaryPoolId, isPool: true, mode: "mock" });
  const mockUnfinished = unfinished.find((u) => u.slot === mockSlot) ?? null;

  const savedIds = new Set(historyItems.map((h) => h.id));
  const sessionRecord = useMemo(
    () =>
      attempt?.status === "submitted" && isMockAttempt(buildAttemptHistoryRecord(attempt))
        ? ({ ...buildAttemptHistoryRecord(attempt), id: attempt.id } as StoredAttemptSummary)
        : null,
    [attempt],
  );
  const recentRecord =
    sessionRecord && !savedIds.has(sessionRecord.id) ? sessionRecord : null;
  const recentLabel = (() => {
    switch (tabSave.state.status) {
      case "saving":
        return { text: "Đang lưu…", tone: "info" as const };
      case "saved":
        return { text: "Đã lưu", tone: "ok" as const };
      case "error":
        return { text: `Chưa lưu: ${describeFirebaseError(tabSave.state.kind)}`, tone: "warn" as const };
      case "guest":
      case "book_local":
        return { text: "Chưa lưu · đăng nhập để lưu", tone: "warn" as const };
      default:
        return { text: "Vừa nộp", tone: "info" as const };
    }
  })();
  /** Dữ liệu cho Năng lực, Ôn tập, tiến độ: lịch sử trên Firebase + bài vừa nộp đã lưu nhưng chưa tải lại */
  const allSummaries: StoredAttemptSummary[] = uid
    ? [
        ...(recentRecord && tabSave.state.status === "saved" ? [recentRecord] : []),
        ...historyItems,
      ]
    : [];

  // Nút Lịch sử ở Tổng quan: tình trạng lịch sử
  const unsavedCount = recentRecord && recentLabel.tone === "warn" ? 1 : 0;
  const historyWarn = unsavedCount > 0 || Boolean(draftsError) || Boolean(historyError);
  const historySub = (() => {
    const parts: string[] = [];
    if (unsavedCount) parts.push(`${unsavedCount} chưa lưu`);
    if (draftsError) parts.push("lỗi đồng bộ");
    if (unfinished.length) parts.push(`${unfinished.length} đang làm`);
    if (historyError) return ["Không tải được lịch sử", ...parts].join(" · ");
    if (parts.length) return parts.join(" · ");
    if (!uid) return "Đăng nhập để lưu";
    if (historyLoading) return "Đang tải…";
    return historyItems.length ? `${historyItems.length} bài đã nộp` : "Chưa có bài nào";
  })();
  const latestMock = allSummaries.find(
    (s) => s.kind === "pool" && s.mode === "mock" && s.retry !== true,
  );
  const mockNote = latestMock
    ? `54 câu · 50 phút · lần gần nhất ${latestMock.correct}/${latestMock.total}${
        latestMock.estimate60 != null ? ` (≈ ${latestMock.estimate60}/60)` : ""
      }`
    : null;

  const activeFreeLevel: JLPTLevel = (primaryBook?.level || "N2") as JLPTLevel;
  const [freeScopeOpen, setFreeScopeOpen] = useState(false);
  const [freeScopeByLevel, setFreeScopeByLevel] = useState<
    Record<string, { bookIds?: string[]; examIds?: string[]; mondais?: number[] }>
  >(() => {
    try {
      const raw = localStorage.getItem("jlpt-free-scope");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("jlpt-free-scope", JSON.stringify(freeScopeByLevel));
    } catch {
      // Bỏ qua nếu trình duyệt chặn storage
    }
  }, [freeScopeByLevel]);
  const freeBookOptions: FreeScopeBookOption[] = getFreeScopeBookOptions(activeFreeLevel);
  const allFreeExamIds = freeBookOptions.flatMap((b) =>
    b.exams.map((e) => e.id),
  );
  const savedFreeScope = freeScopeByLevel[activeFreeLevel];
  const effectiveFreeExamIds =
    savedFreeScope?.examIds !== undefined
      ? savedFreeScope.examIds.filter((id) => allFreeExamIds.includes(id))
      : allFreeExamIds;
  const effectiveFreeExamSet = new Set(effectiveFreeExamIds);
  const effectiveFreeBookIds = freeBookOptions
    .filter((b) => b.exams.some((e) => effectiveFreeExamSet.has(e.id)))
    .map((b) => b.id);
  const selectedFreeMondais =
    savedFreeScope?.mondais !== undefined
      ? savedFreeScope.mondais
      : [...FREE_PRACTICE_ALL_MONDAIS];
  const freeBookKey = effectiveFreeBookIds.join("|");
  const freeExamKey = effectiveFreeExamIds.join("|");
  const freeMondaiKey = selectedFreeMondais.join("|");
  const totalQuestionsInFreeScope = useMemo(
    () =>
      collectFreePracticeSeeds({
        level: activeFreeLevel,
        bookIds: effectiveFreeBookIds,
        examIds: effectiveFreeExamIds,
        mondais: selectedFreeMondais,
      }).reduce((sum, seed) => sum + seed.questions.length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFreeLevel, freeBookKey, freeExamKey, freeMondaiKey],
  );

  const renderMetricTiles = (
    items: ReadonlyArray<{ value: string; label: string }>,
  ) => (
    <div className="hidden lg:grid grid-cols-3 gap-2.5 shrink-0">
      {items.map((item) => (
        <div
          key={item.label}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center min-w-[88px] sm:min-w-[96px]"
        >
          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight whitespace-nowrap">
            {item.value}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 whitespace-nowrap">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );

  const renderMobileChips = (
    items: ReadonlyArray<{ value: string; label: string }>,
  ) => (
    <p className="lg:hidden flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-xs font-medium text-slate-500 dark:text-slate-400 pt-0.5">
      {items.map((item, idx) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2 whitespace-nowrap"
        >
          {idx > 0 && (
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              •
            </span>
          )}
          <span>{item.value}</span>
        </span>
      ))}
    </p>
  );

  /**
   * Bắt đầu bài có giờ: vào thẳng phòng thi. Còn bài dở cùng loại thì hỏi rồi xóa bài cũ;
   * bài dở khác loại được giữ lại thành bản nháp (khách thì báo sẽ mất).
   */
  const startDirectMock = async (targetExamId: string) => {
    if (startingMockRef.current) return;
    startingMockRef.current = true;
    try {
      const source = getExamById(targetExamId);
      if (!source) {
        navigate(`/exams/jlpt/${targetExamId}/mock`);
        return;
      }
      const plan = planPracticeRound(source, { mode: "mock" });
      if (!plan.canStart) {
        return;
      }
      refreshSession();
      const current = getSession();
      const guard = planNewAttempt({
        current,
        slot: slotOf({ examId: source.id, isPool: Boolean(source.isPracticePool), mode: "mock" }),
        signedIn: Boolean(uid),
        drafts: uid ? readLocalDrafts(uid) : [],
        unsavedResult: await resultIsUnsaved(current),
      });
      if (guard.question && !(await ask(guard.question))) return;
      if (uid) {
        if (guard.keepLive) saveUserDraft(uid, guard.keepLive, { immediate: true });
        for (const id of guard.dropIds) removeUserDraft(uid, id);
      }
      const picked = source.isPracticePool ? plan.questionIds : undefined;
      const snapshot =
        source.isPracticePool && picked
          ? practiceSnapshot(source, picked)
          : source;
      clearLastResultBackup();
      setSession(
        {
          ...createAttempt(snapshot, "mock", picked),
          strict: true,
          retry: false,
        },
        { silent: true },
      );
      navigate(`/exams/jlpt/${targetExamId}/mock`);
    } finally {
      startingMockRef.current = false;
    }
  };

  const openFreePractice = (cfg: FreePracticeConfig) => {
    saveFreePracticeHandoff(cfg);
    if (cfg.kind === "fixed") {
      navigate("/exams/jlpt/free?mode=fixed", { state: { freeConfig: cfg } });
      return;
    }
    const sp = buildFreeScopeSearchParams({
      level: cfg.level,
      bookIds: cfg.bookIds,
      examIds: cfg.examIds,
      mondais: cfg.mondais,
      allBooksCount: freeBookOptions.length,
      allExamsCount: allFreeExamIds.length,
    });
    navigate(`/exams/jlpt/free${sp ? `?${sp}` : ""}`, {
      state: { freeConfig: cfg },
    });
  };

  /** Bấm "Luyện ngay M..." từ Radar -> vào thẳng chế độ Luyện tự do cho các Mondai yếu */
  const startWeakMondaisFree = (mondais: number[]) => {
    if (!mondais.length) return;
    openFreePractice({
      kind: "endless",
      level: activeFreeLevel,
      bookIds: effectiveFreeBookIds,
      examIds: effectiveFreeExamIds,
      mondais,
    });
  };

  /** Làm tiếp một bài dở: bài trong tab thì vào thẳng; bản nháp thì khôi phục (bài đang làm khác được giữ thành bản nháp). */
  const resumeUnfinished = async (item: UnfinishedItem) => {
    if (item.live) {
      navigate(`/exams/jlpt/${item.examId}/${item.mode}`);
      return;
    }
    if (!item.draft) return;
    refreshSession();
    const cur = getSession();
    if (uid && cur && cur.status === "in_progress" && cur.id !== item.id) {
      saveUserDraft(uid, cur, { immediate: true });
    }
    const source = getExamById(item.draft.examId);
    const restored = restoreAttemptFromDraft(item.draft, source);
    if (!restored) {
      await ask("Không tìm thấy dữ liệu đề nguồn của bài làm này.");
      return;
    }
    setSession(restored, { silent: true });
    navigate(`/exams/jlpt/${restored.exam.id}/${restored.mode}`);
  };

  /** Xóa thật một bài dở: cả trong tab lẫn bản nháp (trên máy và trên tài khoản). */
  const deleteUnfinished = async (item: UnfinishedItem) => {
    if (!(await ask(`Xóa bài “${item.title}” đang làm dở? Bài sẽ không được tính điểm.`)))
      return;
    if (uid) setDrafts(removeUserDraft(uid, item.id));
    if (getSession()?.id === item.id) setSession(null, { silent: true });
  };

  const openRecentResult = () => {
    if (attempt?.status === "submitted")
      navigate(`/exams/jlpt/${attempt.exam.id}/result/${attempt.id}`);
  };

  const retrySaves = () => {
    tabSave.retry();
    if (uid) void reloadDashboard(uid);
  };

  /** Bỏ kết quả vừa nộp trong tab (chưa lưu, hoặc của khách): xóa hẳn khỏi trang. */
  const discardRecent = async () => {
    if (attempt?.status !== "submitted") return;
    if (!(await ask("Bỏ kết quả vừa nộp này? Kết quả chưa được lưu lên tài khoản sẽ mất."))) return;
    clearLastResultBackup();
    setSession(null, { silent: true });
  };

  /** Kết quả trong tab chưa lưu được lên tài khoản (thử lưu lại một lần trước khi kết luận). */
  const resultIsUnsaved = async (current: ReturnType<typeof getSession>) => {
    if (!uid || current?.status !== "submitted") return false;
    const persistMod = await import("../../lib/jlpt/attemptPersistence");
    const res = await persistMod.persistSubmittedAttempt(uid, current);
    return !res.ok;
  };

  const handleReplayHistory = async (record: StoredAttemptSummary) => {
    const source = getExamById(record.examId);
    const reconstructed = reconstructAttemptFromHistory(record, source);
    if (!reconstructed) {
      await ask("Bản ghi lịch sử cũ này chỉ lưu điểm tổng quan, chưa có chi tiết từng câu.");
      return;
    }
    // Mở trang kết quả riêng của lượt này; trang đó tự tải lượt và giữ an toàn bài đang làm dở
    navigate(`/exams/jlpt/${reconstructed.exam.id}/result/${record.id}`);
  };

  const handleDeleteHistory = async (attemptId: string) => {
    if (!uid) return;
    if (!(await ask("Xóa lượt làm bài này khỏi lịch sử?"))) return;
    setHistoryItems((prev) => prev.filter((item) => item.id !== attemptId));
    // Xóa là xóa hẳn: kết quả đang mở trong tab của chính bài này cũng bỏ đi
    if (getSession()?.id === attemptId) setSession(null, { silent: true });
    try {
      const histMod = await import("../../lib/jlpt/historyService");
      await histMod.deleteAttemptById(uid, attemptId);
    } catch {
      void reloadDashboard(uid);
      await ask("Không xóa được lượt này. Bài vẫn còn trong lịch sử, bạn thử lại sau nhé.");
    }
  };

  const handleClearAllHistory = async () => {
    if (!uid) return;
    if (
      !(await ask(
        "Xóa toàn bộ lịch sử đã nộp và bài đang làm dở? Dữ liệu biểu đồ sẽ được đặt lại về trống.",
      ))
    ) {
      return;
    }
    setHistoryItems([]);
    setDrafts([]);
    if (getSession()) setSession(null, { silent: true });
    try {
      const [histMod, draftMod] = await Promise.all([
        import("../../lib/jlpt/historyService"),
        import("../../lib/jlpt/draftStore"),
      ]);
      await histMod.deleteAllAttempts(uid);
      draftMod.clearAllUserDrafts(uid);
    } catch {
      void reloadDashboard(uid);
      await ask("Không xóa hết được lịch sử. Một số bài còn lại, bạn thử lại sau nhé.");
    }
  };

  /** Lịch sử là popup trên trang Tổng quan, gắn với địa chỉ ?lich-su=1 để nút Back đóng popup */
  const historyOpen = activeTab === "overview" && params.get("lich-su") === "1";
  const openHistory = () => {
    const next = new URLSearchParams(params);
    next.set("lich-su", "1");
    navigate({ search: `?${next.toString()}` }, { state: { historyPopup: true } });
  };
  const closeHistory = () => {
    if ((location.state as { historyPopup?: boolean } | null)?.historyPopup) {
      navigate(-1);
      return;
    }
    const next = new URLSearchParams(params);
    next.delete("lich-su");
    setParams(next, { replace: true });
  };

  const handleStartRetry = (
    kind: FreePracticeFixedKind,
    ids: string[],
    title?: string,
  ) => {
    const picked = [...new Set(ids)];
    if (!picked.length) return;
    openFreePractice({
      kind: "fixed",
      fixedKind: kind,
      level: activeFreeLevel,
      questionIds: picked,
      title,
      // LT-4: Thoát quay về đúng trang đang đứng (Luyện đề, Thống kê...)
      backTo: `${location.pathname}${location.search}`,
    });
  };

  const accountPrompt = (
          <section
            aria-label="Mở khóa phân tích và lưu lịch sử"
            className="p-4 sm:p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Đăng nhập để xem năng lực theo dạng, lưu lịch sử &amp; ôn câu sai
                </h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc pl-4 space-y-0.5">
                  <li>Biểu đồ năng lực và xu hướng theo Mondai 1–9</li>
                  <li>Giữ bài làm dở để làm tiếp trên thiết bị khác</li>
                  <li>Tự gom câu sai để ôn lại</li>
                </ul>
              </div>
            </div>
            <Link
              to="/login"
              state={{ from: `${location.pathname}${location.search}` }}
              className="exam-primary !py-2 !px-4 !min-h-9 text-xs shrink-0 whitespace-nowrap"
            >
              <LogIn size={14} />
              <span>Đăng nhập ngay</span>
            </Link>
          </section>
  );

  return (
    <div className="exam-shell !px-3 sm:!px-6 !py-3 sm:!py-5 !pb-8 sm:!pb-10 space-y-3 sm:space-y-4 overflow-x-clip">
      {confirmation}
      <FreeScopeModal
        open={freeScopeOpen}
        level={activeFreeLevel}
        books={freeBookOptions}
        selectedBookIds={effectiveFreeBookIds}
        selectedExamIds={effectiveFreeExamIds}
        selectedMondais={selectedFreeMondais}
        showMondais={false}
        onClose={() => setFreeScopeOpen(false)}
        onSave={(nextScope) => {
          setFreeScopeByLevel((prev) => ({
            ...prev,
            [activeFreeLevel]: {
              bookIds: nextScope.bookIds,
              examIds: nextScope.examIds,
              mondais: selectedFreeMondais,
            },
          }));
          setFreeScopeOpen(false);
        }}
      />

      <p
        role="status"
        className={`text-xs font-medium empty:hidden ${
          noticeKind === "warning"
            ? "text-amber-700 dark:text-amber-300"
            : "text-slate-600 dark:text-slate-400"
        }`}
      >
        {notice}
      </p>


      {/* =====================================================================
          POPUP MODAL CHO PHÂN HỆ ĐỌC HIỂU / NGHE HIỂU (ĐANG PHÁT TRIỂN)
         ===================================================================== */}
      {upcomingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setUpcomingModal(null)}
        >
          <div
            ref={upcomingDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upcoming-skill-title"
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
                  {upcomingModal === "dokkai" ? (
                    <BookOpen size={20} />
                  ) : (
                    <Headphones size={20} />
                  )}
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Đang phát triển
                  </span>
                  <h3
                    id="upcoming-skill-title"
                    className="text-lg font-black text-slate-900 dark:text-white mt-0.5"
                  >
                    {upcomingModal === "dokkai"
                      ? "Phân hệ Đọc hiểu · 読解 (Mondai 10–13)"
                      : "Phân hệ Nghe hiểu · 聴解 (Audio & Script)"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpcomingModal(null)}
                aria-label="Đóng thông báo"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {upcomingModal === "dokkai"
                ? "Các dạng bài Đọc hiểu đoạn ngắn, đoạn trung, đọc hiểu tổng hợp và tìm kiếm thông tin (Mondai 10–13) đang được số hóa kèm công cụ bôi đen tra từ và giải thích dẫn chứng từng đoạn."
                : "Phân hệ Nghe hiểu JLPT kèm trình phát Audio chuẩn, lời thoại (Transcript) tiếng Nhật – tiếng Việt và giải thích bẫy câu hỏi đang được hoàn thiện."}
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-200 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />
                <span>Đã sẵn sàng: Chữ Hán · Từ vựng · Ngữ pháp</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300 pl-5">
                Đầy đủ 9 dạng bài (Mondai 1–9), bao gồm cả đọc hiểu ngữ pháp
                trong đoạn văn dài (Mondai 9), với lời giải đã kiểm duyệt.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setUpcomingModal(null)}
                className="exam-primary !py-2 !px-5 text-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          HEADER ĐỘNG THEO TỪNG TRANG (TRANG CHÍNH / KHO SÁCH / CHI TIẾT SÁCH)
         ===================================================================== */}
      {(() => {
        const levelSelector = (
          <div className="w-full sm:w-auto grid grid-cols-[1.45fr_repeat(5,minmax(0,1fr))] sm:flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
            {["ALL", "N1", "N2", "N3", "N4", "N5"].map((l) => {
              const count =
                l === "ALL"
                  ? allBooks.reduce((sum, b) => sum + b.exams.length, 0)
                  : levelCounts[l] || 0;
              const empty = l !== "ALL" && count === 0;
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={level === l}
                  disabled={empty}
                  aria-disabled={empty}
                  title={
                    empty
                      ? `Chưa có đề ${l}`
                      : l === "ALL"
                        ? `Tất cả (${count} bài)`
                        : `Cấp ${l} (${count} bài)`
                  }
                  onClick={() => change("level", l)}
                  className={`px-1 sm:px-2.5 py-1 rounded-lg text-xs sm:text-xs font-semibold text-center justify-center whitespace-nowrap transition-all ${
                    level === l
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                      : empty
                        ? "text-slate-400 dark:text-slate-500 cursor-not-allowed"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  }`}
                >
                  {l === "ALL" ? "Tất cả" : l}
                </button>
              );
            })}
          </div>
        );

        const levelsWithExams = ["N1", "N2", "N3", "N4", "N5"].filter((l) => levelCounts[l]);

        // Đầu trang dùng chung cho cả 3 tab: tiêu đề + cấp độ ở trái, thanh tab ở phải
        return (
          <>
            <header className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {!openedBook && (
                    <>
                      <Link
                        to="/exams"
                        className="text-base sm:text-lg font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      >
                        Chọn ngôn ngữ
                      </Link>
                      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-300 dark:text-slate-600" />
                    </>
                  )}
                  {openedBook ? (
                    <Link
                      to="/exams/jlpt/books"
                      className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      Kho sách đề
                    </Link>
                  ) : (
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Luyện đề JLPT
                    </h1>
                  )}
                  {primaryBook && (
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 rounded-full px-2.5 py-1">
                      {primaryBook.level}
                    </span>
                  )}
                  {openedBook && (
                    <>
                      {/* Mũi tên + tên sách đi liền nhau để không bị rớt dòng lẻ mũi tên */}
                      <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
                        <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-300 dark:text-slate-600" />
                        <span
                          role="heading"
                          aria-level={1}
                          aria-current="page"
                          lang="ja"
                          className="text-base sm:text-lg font-semibold text-slate-600 dark:text-slate-300 truncate"
                        >
                          {openedBook.title}
                        </span>
                      </span>
                    </>
                  )}
                </div>
                <JLPTSubNav active={isBooksView || selectedBookId ? "books" : activeTab} />
              </div>
              {isMainView && levelsWithExams.length > 1 && levelSelector}
            </header>

            {openedBook ? null : showBooksRepository && !isInvalidBookId ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Sách & Bộ Đề Luyện Thi ({filtered.length})
                  </h2>
                  <div className="relative w-full sm:w-80">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      className="exam-input w-full !pl-9 !pr-8 !py-2 text-xs font-medium bg-white dark:bg-slate-800"
                      aria-label="Tìm sách hoặc bài"
                      placeholder="Tìm sách hoặc bài (VD: Ngày 5)…"
                      value={query}
                      onChange={(e) => change("q", e.target.value)}
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => change("q", "")}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {levelSelector}
              </div>
            ) : null}
          </>
        );
      })()}


      {/* =====================================================================
          NỘI DUNG CHÍNH THEO VIEW (3 PHẦN CHÍNH / KHO SÁCH RIÊNG / CHI TIẾT SÁCH)
         ===================================================================== */}
      {isInvalidBookId ? (
        <section className="exam-card text-center py-10 space-y-3">
          <p className="text-slate-700 dark:text-slate-200 font-bold text-base">
            Không tìm thấy bộ sách này.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mã sách không tồn tại hoặc đã thay đổi.
          </p>
          <button
            type="button"
            className="exam-primary"
            onClick={() => selectBook(null)}
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách sách</span>
          </button>
        </section>
      ) : openedBook ? (
        <section className="space-y-4">
          <p className="px-1 text-xs text-slate-600 dark:text-slate-300">
            Kho sách tham khảo &amp; lộ trình theo ngày: học theo từng ngày hoặc tra đáp án gốc.{" "}
            <strong className="font-semibold text-slate-800 dark:text-slate-100">
              Bài theo ngày không lưu vào lịch sử
            </strong>
            ; chỉ Thi thử được lưu.
          </p>
          {/* Thanh tiêu đề Sách đang mở + Ô tìm kiếm bài học */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Danh sách bài tập ({matchedBookExams.length} bài)
            </h2>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                className="exam-input w-full !pl-9 !pr-8 !py-1.5 text-xs"
                aria-label="Tìm sách hoặc bài"
                placeholder="Tìm bài (VD: Ngày 1, Ngày 12)…"
                value={query}
                onChange={(e) => change("q", e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => change("q", "")}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Lưới các Thẻ Bài (Day 01 -> Day 20) hoặc Trạng thái rỗng khi tìm kiếm không khớp */}
          {matchedBookExams.length > 0 ? (
            <>
              {/* Điện thoại: lưới ô ngày gọn, chạm để mở bảng hành động (JL-35) */}
              <div className="md:hidden grid grid-cols-4 sm:grid-cols-5 gap-2" aria-label="Chọn bài theo ngày">
                {matchedBookExams.map((e) => {
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSheetExamId(e.id)}
                      aria-label={dayName(e)}
                      className="relative py-2.5 px-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-base text-slate-900 dark:text-white hover:border-indigo-400 transition-colors shadow-2xs flex flex-col items-center justify-center leading-tight"
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Ngày
                      </span>
                      <span>{String(e.day || "").padStart(2, "0")}</span>
                    </button>
                  );
                })}
              </div>
              <BottomSheet
                open={!!sheetExam}
                title={
                  sheetExam
                    ? `${dayName(sheetExam)} · ${sheetExam.totalQuestions} câu · ${sheetExam.timeLimitMinutes} phút`
                    : ""
                }
                onClose={() => setSheetExamId(null)}
              >
                {sheetExam && (
                  <div className="grid gap-2.5">
                    <Link
                      className="exam-primary"
                      to={`/exams/jlpt/${sheetExam.id}/review`}
                    >
                      Làm bài
                    </Link>
                  </div>
                )}
              </BottomSheet>
              <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-3">
                {matchedBookExams.map((e) => {
                  return (
                    <Link
                      key={e.id}
                      to={`/exams/jlpt/${e.id}/review`}
                      aria-label={`Làm bài ${e.title}`}
                      title="Chọn đáp án trước, xem đáp án và lời giải ngay từng câu"
                      className="cursor-pointer px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                            Ngày {String(e.day || "").padStart(2, "0")}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {e.totalQuestions} câu · {e.timeLimitMinutes}p
                          </span>
                        </div>

                        <span
                          lang="ja"
                          className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate block"
                        >
                          {e.title.replace(/\s*\(Day \d+\)/i, "")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="exam-primary !py-1.5 !px-3 !min-h-8 text-xs">
                          <PenLine size={12} />
                          <span>Làm bài</span>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="exam-card text-center py-10 space-y-3">
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Không tìm thấy bài phù hợp trong sách này.
              </p>
              <button
                type="button"
                className="exam-secondary"
                onClick={() => change("q", "")}
              >
                Xóa từ khóa
              </button>
            </div>
          )}
        </section>
      ) : showBooksRepository ? (
        /* ===================================================================
           TRANG RIÊNG 2: KHO SÁCH & BỘ ĐỀ LUYỆN THI
           =================================================================== */
        <section className="space-y-5">
          <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
            Kho sách &amp; Bộ đề theo ngày là khu vực học độc lập theo giáo trình giấy và tra đáp án gốc (không ảnh hưởng đến biểu đồ Radar hay lịch sử tổng).
          </p>
          {filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((book) => {
                // KS-9: số liệu thẻ sách luôn là của cả sách, không đổi theo từ khóa tìm kiếm
                const fullExams = books.find((b) => b.id === book.id)?.exams ?? book.exams;
                const totalBookQuestions = fullExams.reduce(
                  (n, e) => n + e.totalQuestions,
                  0,
                );
                const bookMetrics = [
                  { value: `${fullExams.length} bài`, label: "Lộ trình ngày" },
                  { value: `${totalBookQuestions} câu`, label: "Đã kiểm duyệt" },
                  { value: "Mondai 1–9", label: "Từ · Ngữ pháp" },
                ];

                return (
                  <div
                    key={book.id}
                    onClick={() => selectBook(book.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectBook(book.id);
                      }
                    }}
                    className="group grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center gap-2.5 sm:gap-4 lg:gap-5 p-3.5 sm:p-4 lg:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 rounded-2xl shadow-2xs transition-colors cursor-pointer"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-0.5 items-center sm:items-start min-w-0">
                      <div className="sm:row-span-2 sm:self-center w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-base flex items-center justify-center shrink-0">
                        {book.level}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Bộ đề luyện thi
                        </p>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                          {book.title}
                        </h2>
                        {normalizedQuery && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            {book.exams.length} bài khớp từ khóa
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 sm:col-span-1 sm:col-start-2 min-w-0">
                        {renderMobileChips(bookMetrics)}
                      </div>
                    </div>

                    {renderMetricTiles(bookMetrics)}

                    <div className="shrink-0">
                      <div className="w-full sm:w-auto py-2 sm:py-2.5 px-4 sm:px-5 bg-white group-hover:bg-indigo-600 dark:bg-slate-800/90 dark:group-hover:bg-indigo-600 text-slate-800 group-hover:text-white dark:text-slate-100 dark:group-hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-200/90 dark:border-slate-700 group-hover:border-indigo-600 flex items-center justify-center gap-2 shadow-2xs transition-colors whitespace-nowrap">
                        <BookOpen size={15} />
                        <span>Mở {fullExams.length} bài học</span>
                        <ArrowRight size={15} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="exam-card text-center py-10 space-y-3">
              {level !== "ALL" && !levelCounts[level] ? (
                <>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Chưa có đề cấp {level}.
                  </p>
                  {firstLevelWithExams && (
                    <button
                      type="button"
                      className="exam-secondary"
                      onClick={() => resetBookFilters(firstLevelWithExams)}
                    >
                      Xem {firstLevelWithExams}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Không tìm thấy sách hoặc bài phù hợp. Thử đổi cấp độ hoặc từ
                    khóa.
                  </p>
                  <button
                    type="button"
                    className="exam-secondary"
                    onClick={() => resetBookFilters()}
                  >
                    Xóa bộ lọc
                  </button>
                </>
              )}
            </div>
          )}

          {!query.trim() && filtered.length > 0 && (
            <div className="px-1 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {primaryBook ? `Đang hỗ trợ đầy đủ ${primaryBook.exams.length} ngày ${primaryBook.level} (Mondai 1–9).` : "Đang hỗ trợ Mondai 1–9."}
              </span>
              {primaryBook && (
                <button
                  type="button"
                  onClick={() => selectBook(primaryBook.id)}
                  className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline underline-offset-2 shrink-0 min-h-9 inline-flex items-center"
                >
                  Mở danh sách {primaryBook.exams.length} ngày
                </button>
              )}
            </div>
          )}

          {/* Khi người dùng gõ tìm kiếm bài cụ thể (VD: "Day 5"), hiển thị luôn kết quả bài khớp ngay bên dưới */}
          {query.trim().length > 0 && filtered.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white px-1">
                Bài học khớp từ khóa &ldquo;{query}&rdquo;
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.flatMap((book) =>
                  book.exams.map((e) => {
                    return (
                      <Link
                        key={e.id}
                        to={`/exams/jlpt/${e.id}/review`}
                        aria-label={`Làm bài ${e.title}`}
                        className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                              {book.level} · Ngày{" "}
                              {String(e.day || "").padStart(2, "0")}
                            </span>
                          </div>
                          <span lang="ja" className="font-bold text-base text-slate-900 dark:text-white block">
                            {e.title.replace(/\s*\(Day \d+\)/i, "")}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                          <span className="exam-primary !py-1.5 !px-3 !min-h-8 text-xs flex-1">
                            <PenLine size={12} />
                            <span>Làm bài</span>
                          </span>
                        </div>
                      </Link>
                    );
                  }),
                )}
              </div>
            </div>
          )}
        </section>
      ) : primaryBook ? (
        /* ===================================================================
           TRANG CHÍNH CHUNG CHO KHÁCH VÀ NGƯỜI ĐĂNG NHẬP (R6): cùng một bố cục,
           khối cần tài khoản (năng lực, lịch sử, ôn tập) đổi thành lời mời đăng nhập.
           1. Hàng đầu: Thi thử 54 câu + Kho sách (trái) & Bộ chọn Luyện tập tự do trực tiếp (phải)
           2. Giữa: Hồ sơ năng lực Radar 5 trục + 9 Mondai (không lặp nút khởi chạy)
           3. Dưới: Lịch sử làm bài (Đang làm + Đã nộp) & Kho ôn câu sai/trống/chưa chắc
           =================================================================== */
        <div className="space-y-4">
          {activeTab === "overview" && (
            <>
              <OverviewPanel
                level={primaryBook.level}
                canStartMock={canStartPrimaryMock}
                unfinishedMock={mockUnfinished}
                mockNote={mockNote}
                historySub={historySub}
                historyWarn={historyWarn}
                onStartMock={() => void startDirectMock(primaryPoolId)}
                onResumeMock={(item) => void resumeUnfinished(item)}
                onOpenHistory={openHistory}
              />
              {uid ? (
                <SkillRadarCard
                  summaries={allSummaries}
                  loading={historyLoading}
                  error={historyError}
                  onRetry={() => void reloadDashboard(uid)}
                  mockTotal={mockTotal}
                  onPracticeWeak={(mondais) => startWeakMondaisFree(mondais)}
                  onStartRetry={(kind, ids, title) => handleStartRetry(kind, ids, title)}
                />
              ) : (
                accountPrompt
              )}
            <BottomSheet
            open={historyOpen}
            title="Lịch sử làm bài"
            onClose={closeHistory}
            centeredOnDesktop
            wide
            fixedHeight
          >
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              {uid ? (
                <HistoryPanel
                  bare
                  summaries={historyItems}
                  unfinished={unfinished}
                  recent={
                    recentRecord
                      ? { record: recentRecord, label: recentLabel.text, tone: recentLabel.tone }
                      : null
                  }
                  loading={historyLoading}
                  error={[historyError, draftsError].filter(Boolean).join(" ") || null}
                  onRetry={() => void reloadDashboard(uid)}
                  onResumeUnfinished={(item) => void resumeUnfinished(item)}
                  onDeleteUnfinished={(item) => void deleteUnfinished(item)}
                  onOpenRecent={openRecentResult}
                  onRetrySaves={retrySaves}
                  onDiscardRecent={() => void discardRecent()}
                  onReplayHistory={(r) => void handleReplayHistory(r)}
                  onDeleteHistory={(id) => void handleDeleteHistory(id)}
                  onClearAll={() => void handleClearAllHistory()}
                />
              ) : (
                <>
                  <HistoryPanel
                    bare
                    guest
                    summaries={[]}
                    unfinished={unfinished}
                    recent={
                      sessionRecord
                        ? { record: sessionRecord, label: recentLabel.text, tone: recentLabel.tone }
                        : null
                    }
                    onResumeUnfinished={(item) => void resumeUnfinished(item)}
                    onDeleteUnfinished={(item) => void deleteUnfinished(item)}
                    onOpenRecent={openRecentResult}
                    onDiscardRecent={() => void discardRecent()}
                  />
                  <div className="shrink-0">{accountPrompt}</div>
                </>
              )}
            </div>
          </BottomSheet>
            </>
          )}

          {activeTab === "practice" && (
            <>
          <section
            aria-label="Khu vực luyện thi JLPT"
            className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch"
          >
            {/* Cột phải: Thẻ Luyện tập tự do ngẫu nhiên 1 chạm */}
            <div className="lg:col-span-12">
              <FreePracticeCard
                footer={
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/90 dark:border-slate-700/80 text-xs sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Chữ Hán · Từ vựng · Ngữ pháp</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setUpcomingModal("dokkai")}
                      className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-xs sm:text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <BookOpen size={12} className="text-slate-400 shrink-0 sm:w-[13px] sm:h-[13px]" />
                      <span>Đọc hiểu · 読解</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpcomingModal("choukai")}
                      className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-xs sm:text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Headphones size={12} className="text-slate-400 shrink-0 sm:w-[13px] sm:h-[13px]" />
                      <span>Nghe hiểu · 聴解</span>
                    </button>
                  </div>
                }
                level={activeFreeLevel}
                books={freeBookOptions}
                selectedExamIds={effectiveFreeExamIds}
                selectedMondais={selectedFreeMondais}
                totalQuestionsInScope={totalQuestionsInFreeScope}
                onChangeMondais={(nextMondais) =>
                  setFreeScopeByLevel((prev) => ({
                    ...prev,
                    [activeFreeLevel]: {
                      ...prev[activeFreeLevel],
                      bookIds: effectiveFreeBookIds,
                      examIds: effectiveFreeExamIds,
                      mondais: nextMondais,
                    },
                  }))
                }
                onStartFree={() =>
                  openFreePractice({
                    kind: "endless",
                    level: activeFreeLevel,
                    bookIds: effectiveFreeBookIds,
                    examIds: effectiveFreeExamIds,
                    mondais: selectedFreeMondais,
                  })
                }
                onOpenScopeModal={() => setFreeScopeOpen(true)}
              />
            </div>
          </section>
            </>
          )}
        </div>
      ) : (
        <section className="exam-card text-center py-10 space-y-3">
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Chưa có đề cấp {level}.
          </p>
          {firstLevelWithExams && (
            <button
              type="button"
              className="exam-secondary"
              onClick={() => change("level", firstLevelWithExams)}
            >
              Xem {firstLevelWithExams}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
