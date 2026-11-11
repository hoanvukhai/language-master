import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Headphones,
  Play,
  Search,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  getExamById,
  getJLPTBooksByLevel,
  type JLPTLevel,
} from "../../data/exams/jlpt";
import { createAttempt, type Attempt } from "../../lib/jlpt/examCore";
import {
  getSession,
  refreshSession,
  setSession,
  useTabSession,
} from "../../lib/jlpt/tabSession";
import { matchExamQuery } from "../../lib/jlpt/examSearch";
import BottomSheet from "./workspace/BottomSheet";
import { describeAttempt } from "../../lib/jlpt/attemptLabels";
import { useConfirmation } from "./components/useConfirmation";
import { useStartMockDialog } from "./components/useStartMockDialog";
import {
  canCreateStandardMock,
  planPracticeRound,
  poolId,
  practiceSnapshot,
} from "../../lib/jlpt/practicePool";

type UpcomingSkillModal = "dokkai" | "choukai" | null;

/** Nút tiếp tục phiên trong tab (JL-21): "Làm tiếp · còn 32:15", "Làm tiếp" hoặc "Xem kết quả" */
function resumeLabel(a: Attempt, now: number): string {
  if (a.status === "submitted") return "Xem kết quả";
  if (a.mode === "mock" && a.deadlineAt) {
    const left = Math.max(0, Math.ceil((a.deadlineAt - now) / 1000));
    return `Làm tiếp · còn ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  }
  return "Làm tiếp";
}
function resumeHref(a: Attempt): string {
  return `/exams/jlpt/${a.exam.id}/${a.status === "submitted" ? "result" : a.mode}`;
}

export default function JLPTExamHub() {
  const navigate = useNavigate();
  const { ask, confirmation } = useConfirmation();
  const { askStartMock, startMockDialog } = useStartMockDialog();
  const [params, setParams] = useSearchParams();
  const { attempt, notice, noticeKind } = useTabSession();
  const [sheetExamId, setSheetExamId] = useState<string | null>(null);
  const [upcomingModal, setUpcomingModal] =
    useState<UpcomingSkillModal>(null);
  const startingMockRef = useRef(false);

  const level = params.get("level") || "ALL",
    query = params.get("q") || "",
    selectedBookId = params.get("book") || "";
  const normalizedQuery = query.trim().toLowerCase();

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
    refreshSession();
    const timer = setInterval(() => {
      refreshSession();
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const selectBook = (bookId: string | null) => {
    const next = new URLSearchParams(params);
    if (bookId) next.set("book", bookId);
    else next.delete("book");
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // FIX-01: Tách riêng sách đang mở (openedBook) và danh sách bài khớp từ khóa (matchedBookExams)
  const openedBook = selectedBookId
    ? books.find((b) => b.id === selectedBookId) ||
      allBooks.find((b) => b.id === selectedBookId) ||
      null
    : null;
  const isInvalidBookId = Boolean(selectedBookId) && !openedBook;
  // Phiên từ ngân hàng của sách đang hiện (JL-21)
  const poolMockAttempt =
    attempt?.exam.isPracticePool && attempt.mode === "mock" ? attempt : null;
  const poolDrillAttempt =
    attempt?.exam.isPracticePool && attempt.mode === "drill" ? attempt : null;
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

  /** Vào thẳng phòng thi bấm giờ (Không qua màn hình chờ trung gian) */
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
      // Hộp xác nhận chung của bài có giờ (JL-22), mặc định thi nghiêm túc (JL-05)
      const res = await askStartMock({
        questionCount: plan.actualTotal || source.totalQuestions,
        minutes: source.timeLimitMinutes || 50,
        replacing: !!getSession(),
      });
      if (!res) return;
      const picked = source.isPracticePool ? plan.questionIds : undefined;
      const snapshot =
        source.isPracticePool && picked
          ? practiceSnapshot(source, picked)
          : source;
      setSession({
        ...createAttempt(snapshot, "mock", picked),
        strict: res.strict,
        retry: false,
      });
      navigate(`/exams/jlpt/${targetExamId}/mock`);
    } finally {
      startingMockRef.current = false;
    }
  };

  return (
    <div className="exam-shell space-y-6">
      {confirmation}
      {startMockDialog}

      {/* Active Session Resume Banner — Placed at the very top for instant resume */}
      {attempt && (
        <section className="exam-card border-2 border-indigo-500/80 dark:border-indigo-500/70 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-stretch sm:items-center justify-between">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1 w-full sm:w-auto">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
              <Play size={18} />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <h2
                title={describeAttempt(attempt, now).title}
                className="font-black text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 break-words"
              >
                {describeAttempt(attempt, now).title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {describeAttempt(attempt, now).status}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Link
              className="exam-primary flex-1 sm:flex-initial min-h-11"
              to={`/exams/jlpt/${attempt.exam.id}/${attempt.status === "submitted" ? "result" : attempt.mode}`}
            >
              {resumeLabel(attempt, now)}
            </Link>
            <button
              type="button"
              className="exam-secondary flex-1 sm:flex-initial min-h-11"
              onClick={async () => {
                if (await ask("Xóa phiên tạm trong tab này?")) setSession(null);
              }}
            >
              <Trash2 size={15} />
              <span>Kết thúc và xóa phiên</span>
            </button>
          </div>
        </section>
      )}

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
            role="dialog"
            aria-modal="true"
            aria-labelledby="upcoming-skill-title"
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  {upcomingModal === "dokkai" ? (
                    <BookOpen size={20} />
                  ) : (
                    <Headphones size={20} />
                  )}
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {upcomingModal === "dokkai"
                ? "Các dạng bài Đọc hiểu đoạn ngắn, đoạn trung, đọc hiểu tổng hợp và tìm kiếm thông tin (Mondai 10–13) đang được số hóa kèm công cụ bôi đen tra từ và giải thích dẫn chứng từng đoạn."
                : "Phân hệ Nghe hiểu JLPT kèm trình phát Audio chuẩn, lời thoại (Transcript) tiếng Nhật – tiếng Việt và giải thích bẫy câu hỏi đang được hoàn thiện."}
            </p>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
              <p className="font-extrabold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Đã sẵn sàng 100%: Chữ Hán · Từ vựng · Ngữ pháp</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300 pl-5">
                Đầy đủ 9 dạng bài (Mondai 1–9), bao gồm cả đọc hiểu ngữ pháp
                trong đoạn văn dài (Mondai 9) với 1.080 câu hỏi đã kiểm duyệt.
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
          KHỐI 1: HERO + BỘ LỌC CẤP ĐỘ / KỸ NĂNG + 2 LỐI VÀO NGÂN HÀNG ĐỀ
         ===================================================================== */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-6 sm:p-8 shadow-xl space-y-6">
        <div className="relative z-10 space-y-5">
          {/* Thanh điều hướng trên cùng + Chọn Cấp Độ & Kỹ Năng */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {openedBook || isInvalidBookId ? (
              <button
                type="button"
                onClick={() => selectBook(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Quay lại danh sách sách</span>
              </button>
            ) : (
              <Link
                to="/exams"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-colors"
              >
                ← Đổi ngôn ngữ
              </Link>
            )}

            {/* Chọn Cấp độ N1 - N5 tích hợp gọn trên Header */}
            {!openedBook && !isInvalidBookId && (
              <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md p-1 rounded-2xl border border-white/15">
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
                      title={empty ? `Chưa có đề ${l}` : undefined}
                      onClick={() => change("level", l)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all ${
                        level === l
                          ? "bg-white text-indigo-700 shadow-xs"
                          : empty
                            ? "text-indigo-200/60 cursor-not-allowed"
                            : "text-indigo-100 hover:bg-white/10 cursor-pointer"
                      }`}
                    >
                      {l === "ALL" ? "Tất cả" : count ? `${l} · ${count}` : l}
                    </button>
                  );
                })}
              </div>
            )}

          </div>

          {/* Tiêu đề & Nút Kỹ năng (Đọc hiểu / Nghe hiểu mở Popup) */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-200">
                {openedBook
                  ? `Giáo trình ${openedBook.level} · Chọn bài học theo ngày`
                  : "Ngân hàng luyện đề tiếng Nhật"}
              </p>
              <h1 className="text-2xl sm:text-4xl font-black mt-1 tracking-tight">
                {openedBook ? openedBook.title : "Kho bài luyện JLPT"}
              </h1>
              <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-2xl leading-relaxed">
                {openedBook
                  ? `Gồm ${openedBook.exams.length} bài học theo ngày đã đối chiếu bản gốc PDF. Chọn bài bên dưới để ôn từng câu ngay, làm bài bấm giờ hoặc xem lời giải.`
                  : "Thi thử ngẫu nhiên 54 câu rút từ toàn bộ ngân hàng đề, ôn tập tự do chữa từng câu ngay theo Mondai, hoặc học lần lượt theo từng cuốn sách."}
              </p>
            </div>

            {/* Các phân hệ Kỹ năng (Bấm vào Đọc hiểu / Nghe hiểu sẽ bật Popup Modal) */}
            {!openedBook && !isInvalidBookId && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/25 border border-emerald-300/40 text-xs font-extrabold text-white">
                  <CheckCircle2 size={13} className="text-emerald-300" />
                  <span>Chữ Hán · Từ vựng · Ngữ pháp</span>
                </span>
                <button
                  type="button"
                  onClick={() => setUpcomingModal("dokkai")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-indigo-100 transition-colors cursor-pointer"
                >
                  <BookOpen size={13} className="text-amber-300" />
                  <span>Đọc hiểu · 読解</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUpcomingModal("choukai")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-indigo-100 transition-colors cursor-pointer"
                >
                  <Headphones size={13} className="text-amber-300" />
                  <span>Nghe hiểu · 聴解</span>
                </button>
              </div>
            )}
          </div>

          {/* 2 Nút / Thẻ Chế Độ Ngân Hàng Tổng Hợp đặt ngay trong Khối 1 */}
          {!openedBook && !isInvalidBookId && primaryBook && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Lối vào 1: Làm bài có giờ từ ngân hàng trộn -> VÀO THẲNG PHÒNG THI */}
              <div className="rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white p-5 shadow-lg border border-white/40 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-600 text-white">
                      <Trophy size={12} />
                      <span>Đề trộn Chữ · Từ vựng · Ngữ pháp</span>
                    </span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      54 câu · 50 phút · Điểm tham khảo 0–60
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black">
                    Làm Bài Có Giờ (Đề Trộn 54 Câu)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Rút ngẫu nhiên 54 câu theo đủ 9 Mondai Chữ Hán – Từ vựng –
                    Ngữ pháp từ toàn bộ ngân hàng câu hỏi (20 bài). Giữ lựa chọn
                    đến khi nộp bài hoặc hết giờ.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {canStartPrimaryMock
                      ? "Vào thẳng bài làm · Không qua trang chờ"
                      : "Nguồn hiện tại chưa đủ câu để tạo bài 54 câu."}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {poolMockAttempt && (
                      <Link className="exam-primary" to={resumeHref(poolMockAttempt)}>
                        {resumeLabel(poolMockAttempt, now)}
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={!canStartPrimaryMock}
                      onClick={() => startDirectMock(primaryPoolId)}
                      className={`${poolMockAttempt ? "exam-secondary" : "exam-primary"} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <Trophy size={15} />
                      <span>{poolMockAttempt ? "Đề mới (54 câu)" : "Vào làm ngay (54 câu)"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Lối vào 2: Ôn Tập Tự Do Theo Dạng (Mondai) */}
              <div className="rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white p-5 shadow-lg border border-white/40 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-700 text-white">
                      <Zap size={12} />
                      <span>Chữa từng câu tức thì</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Tự chọn Mondai · Không giới hạn giờ
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black">
                    Luyện Theo Dạng (Mondai)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Chọn 1 hoặc nhiều dạng bài (Mondai 1–9) lấy ngẫu nhiên từ
                    toàn sách. Câu đơn chấm và mở lời giải ngay; nhóm đoạn văn
                    kiểm tra theo cụm.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Hỗ trợ lọc theo từng dạng bài
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {poolDrillAttempt && (
                      <Link
                        className="exam-primary !from-emerald-700 !to-teal-700 hover:!from-emerald-800 hover:!to-teal-800"
                        to={resumeHref(poolDrillAttempt)}
                      >
                        {resumeLabel(poolDrillAttempt, now)}
                      </Link>
                    )}
                    <Link
                      className={
                        poolDrillAttempt
                          ? "exam-secondary"
                          : "exam-primary !from-emerald-700 !to-teal-700 hover:!from-emerald-800 hover:!to-teal-800"
                      }
                      to={`/exams/jlpt/${primaryPoolId}/drill`}
                    >
                      <Zap size={15} />
                      <span>{poolDrillAttempt ? "Lượt mới" : "Luyện theo dạng →"}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* =====================================================================
          KHỐI 2: SÁCH & BỘ ĐỀ LUYỆN THI (KÈM THANH TÌM KIẾM Ở BÊN DƯỚI)
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
        <section className="space-y-5">
          {/* Thanh tiêu đề Sách đang mở + Ô tìm kiếm bài học */}
          <div className="exam-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => selectBook(null)}
                className="exam-secondary !py-2 !px-3 !min-h-9 text-xs shrink-0"
              >
                <ArrowLeft size={14} />
                <span>Tất cả sách</span>
              </button>
              <div>
                <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  Danh sách bài tập ({matchedBookExams.length} bài)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chọn bài bên dưới để ôn từng câu, thi bấm giờ hoặc xem lời
                  giải
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  className="exam-input w-full !pl-9 !pr-8 !py-1.5 text-xs"
                  aria-label="Tìm sách hoặc bài"
                  placeholder="Tìm bài (VD: Day 1, Ngày 12)…"
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

              <Link
                className="exam-primary !from-emerald-700 !to-teal-700 hover:!from-emerald-800 hover:!to-teal-800 !py-2 !px-3.5 !min-h-9 text-xs"
                to={`/exams/jlpt/${poolId(openedBook.id, openedBook.level)}/drill`}
              >
                <Zap size={14} />
                <span>Ôn tự do toàn sách</span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  startDirectMock(poolId(openedBook.id, openedBook.level))
                }
                className="exam-primary !py-2 !px-3.5 !min-h-9 text-xs cursor-pointer"
              >
                <Trophy size={14} />
                <span>Thi ngẫu nhiên 54 câu</span>
              </button>
            </div>
          </div>

          {/* Lưới các Thẻ Bài (Day 01 -> Day 20) hoặc Trạng thái rỗng khi tìm kiếm không khớp */}
          {matchedBookExams.length > 0 ? (
            <>
            {/* Điện thoại: lưới ô ngày gọn, chạm để mở bảng hành động (JL-35) */}
            <div className="md:hidden grid grid-cols-4 gap-2.5" aria-label="Chọn bài theo ngày">
              {matchedBookExams.map((e) => {
                const inTab = attempt?.exam.id === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSheetExamId(e.id)}
                    aria-label={`${e.title}${inTab ? (attempt?.status === "submitted" ? ", có kết quả trong tab" : ", đang làm trong tab") : ""}`}
                    className="relative min-h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-lg text-slate-900 dark:text-white hover:border-indigo-400"
                  >
                    {String(e.day || "").padStart(2, "0")}
                    {inTab && (
                      <span
                        className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ${
                          attempt?.status === "submitted" ? "bg-emerald-500" : "bg-indigo-500"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <BottomSheet
              open={!!sheetExam}
              title={
                sheetExam
                  ? `${sheetExam.title} · ${sheetExam.totalQuestions} câu · ${sheetExam.timeLimitMinutes} phút`
                  : ""
              }
              onClose={() => setSheetExamId(null)}
            >
              {sheetExam && (
                <div className="grid gap-2.5">
                  {attempt?.exam.id === sheetExam.id && (
                    <Link
                      className="exam-primary"
                      to={`/exams/jlpt/${attempt.exam.id}/${attempt.status === "submitted" ? "result" : attempt.mode}`}
                    >
                      {resumeLabel(attempt, now)}
                    </Link>
                  )}
                  <Link
                    className={
                      attempt?.exam.id === sheetExam.id
                        ? "exam-secondary"
                        : "exam-primary !from-emerald-700 !to-teal-700"
                    }
                    to={`/exams/jlpt/${poolId(openedBook.id, openedBook.level)}/drill${sheetExam.day ? `?day=${sheetExam.day}` : ""}`}
                  >
                    Luyện theo dạng
                  </Link>
                  <button
                    type="button"
                    className="exam-secondary"
                    disabled={!canCreateStandardMock(getExamById(sheetExam.id) || sheetExam)}
                    onClick={() => {
                      const id = sheetExam.id;
                      setSheetExamId(null);
                      void startDirectMock(id);
                    }}
                  >
                    Làm bài có giờ
                  </button>
                  <Link className="exam-secondary" to={`/exams/jlpt/${sheetExam.id}/review`}>
                    Xem đề & lời giải
                  </Link>
                  <Link
                    className="text-center text-sm font-bold text-indigo-700 dark:text-indigo-300 underline py-2"
                    to={`/exams/jlpt/${sheetExam.id}`}
                  >
                    Mở trang bài
                  </Link>
                </div>
              )}
            </BottomSheet>
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchedBookExams.map((e) => {
                const isInTab = attempt?.exam.id === e.id;
                const bookPoolId = poolId(openedBook.id, openedBook.level);
                const sourceExam = getExamById(e.id) || e;
                const canStartExamMock = canCreateStandardMock(sourceExam);
                return (
                  <article
                    key={e.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                          Day {String(e.day || "").padStart(2, "0")}
                        </span>
                        {isInTab ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 size={12} />
                            <span>
                              {attempt.status === "submitted"
                                ? "Có kết quả trong tab"
                                : "Đang làm trong tab"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {e.totalQuestions} câu
                          </span>
                        )}
                      </div>

                      <Link
                        className="font-black text-lg text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-4 hover:underline block"
                        to={`/exams/jlpt/${e.id}`}
                      >
                        {e.title}
                      </Link>

                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {e.totalQuestions} câu · {e.mondais.length} dạng ·{" "}
                        {e.timeLimitMinutes} phút
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/70">
                      {isInTab && attempt && (
                        <Link
                          className="exam-primary !py-1.5 !px-3 !min-h-9 text-xs w-full"
                          to={resumeHref(attempt)}
                        >
                          {resumeLabel(attempt, now)}
                        </Link>
                      )}
                      <Link
                        className={`${isInTab ? "exam-secondary" : "exam-primary !from-emerald-700 !to-teal-700 hover:!from-emerald-800 hover:!to-teal-800"} !py-1.5 !px-3 !min-h-9 text-xs flex-1`}
                        to={`/exams/jlpt/${bookPoolId}/drill${e.day ? `?day=${e.day}` : ""}`}
                      >
                        <Zap size={13} />
                        <span>Luyện theo dạng</span>
                      </Link>
                      <button
                        type="button"
                        disabled={!canStartExamMock}
                        title={
                          canStartExamMock
                            ? undefined
                            : "Nguồn hiện tại chưa đủ câu để tạo bài 54 câu."
                        }
                        onClick={() => startDirectMock(e.id)}
                        className={`${isInTab ? "exam-secondary" : "exam-primary"} !py-1.5 !px-3 !min-h-9 text-xs flex-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Clock size={13} />
                        <span>Làm bài có giờ</span>
                      </button>
                      <Link
                        className="exam-secondary !py-1.5 !px-3 !min-h-9 text-xs w-full"
                        to={`/exams/jlpt/${e.id}/review`}
                      >
                        <FileText size={13} />
                        <span>Xem đề & lời giải</span>
                      </Link>
                    </div>
                  </article>
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
      ) : (
        <section className="space-y-4">
          {/* Thanh tiêu đề Khối 2 + Ô tìm kiếm nằm gọn bên phải */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Sách & Bộ Đề Luyện Thi ({filtered.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhấn vào thẻ sách để mở danh sách các bài tập trong sách
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                className="exam-input w-full !pl-9 !pr-8 !py-2 text-xs font-medium bg-white dark:bg-slate-800"
                aria-label="Tìm sách hoặc bài"
                placeholder="Tìm sách hoặc bài (VD: Day 5)…"
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

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((book) => {
                const totalBookQuestions = book.exams.reduce(
                  (n, e) => n + e.totalQuestions,
                  0,
                );

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
                    className="group flex flex-col justify-between p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-black text-lg flex items-center justify-center shrink-0">
                          {book.level}
                        </div>
                        <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                          🇯🇵 Bộ đề {book.level}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                        {book.title}
                      </h3>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg">
                          {book.exams.length} bài học
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg">
                          {totalBookQuestions} câu hỏi
                        </span>
                        <span className="px-2.5 py-0.5 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-lg">
                          Mondai 1–9
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                        Bộ đề thực chiến 20 ngày Chữ Hán, Từ vựng & Ngữ pháp{" "}
                        {book.level} kèm đáp án đối chiếu cuối sách và lời giải
                        chi tiết.
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/70">
                      <div className="w-full py-2.5 px-4 bg-indigo-50 group-hover:bg-indigo-600 dark:bg-indigo-950/50 dark:group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white dark:text-indigo-300 dark:group-hover:text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
                        <BookOpen size={15} />
                        <span>Mở {book.exams.length} bài học</span>
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
                      className="exam-secondary"
                      onClick={() => setParams({ level: firstLevelWithExams })}
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
                <button className="exam-secondary" onClick={() => setParams({})}>
                  Xóa bộ lọc
                </button>
                </>
              )}
            </div>
          )}

          {/* Khi người dùng gõ tìm kiếm bài cụ thể (VD: "Day 5"), hiển thị luôn kết quả bài khớp ngay bên dưới */}
          {query.trim().length > 0 && filtered.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white px-1">
                Bài học khớp từ khóa &ldquo;{query}&rdquo;
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.flatMap((book) =>
                  book.exams.map((e) => {
                    const bookPoolId = poolId(book.id, book.level);
                    return (
                      <article
                        key={e.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                              {book.level} · Day{" "}
                              {String(e.day || "").padStart(2, "0")}
                            </span>
                          </div>
                          <Link
                            className="font-black text-base text-slate-900 dark:text-white hover:text-indigo-600 block"
                            to={`/exams/jlpt/${e.id}`}
                          >
                            {e.title}
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <Link
                            className="exam-primary !from-emerald-700 !to-teal-700 !py-1.5 !px-3 !min-h-8 text-xs flex-1"
                            to={`/exams/jlpt/${bookPoolId}/drill${e.day ? `?day=${e.day}` : ""}`}
                          >
                            <Zap size={12} />
                            <span>Luyện theo dạng</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => startDirectMock(e.id)}
                            className="exam-primary !py-1.5 !px-3 !min-h-8 text-xs flex-1 cursor-pointer"
                          >
                            <Clock size={12} />
                            <span>Làm bài có giờ</span>
                          </button>
                        </div>
                      </article>
                    );
                  }),
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
