import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import type { JLPTExam } from "../src/data/exams/jlpt/types";
import JLPTExamHub from "../src/pages/Exam/JLPTExamHub";
import FreePracticeRoom from "../src/pages/Exam/FreePracticeRoom";
import ExamWorkspace from "../src/pages/Exam/ExamWorkspace";
import {
  buildAttemptHistoryRecord,
  toCompactDraft,
  type CompactDraft,
} from "../src/lib/jlpt/historySummary";
import type { StoredAttemptSummary } from "../src/lib/jlpt/historyService";
import {
  answer,
  createAttempt,
  finish,
} from "../src/lib/jlpt/examCore";
import { claimSession, getSession, setSession } from "../src/lib/jlpt/tabSession";

let mockUid: string | null = null;
let mockHistory: StoredAttemptSummary[] = [];
let mockDrafts: CompactDraft[] = [];
const savedIdsMock = new Set<string>();

const saveAttemptSummaryMock = vi.fn(
  async (_uid: string, id: string, summary: StoredAttemptSummary) => {
    mockHistory = [{ ...summary, id }, ...mockHistory];
  },
);
const listRecentAttemptsMock = vi.fn(async () => [...mockHistory]);
const deleteAttemptByIdMock = vi.fn(async (_uid: string, attemptId: string) => {
  mockHistory = mockHistory.filter((item) => item.id !== attemptId);
});
let historyVersionForTest = 0;
const deleteAllAttemptsMock = vi.fn(async () => {
  const n = mockHistory.length;
  mockHistory = [];
  return n;
});

vi.mock("../src/context/auth/useOptionalAuth", () => ({
  useOptionalAuth: () =>
    mockUid
      ? { user: { uid: mockUid, email: "test@example.com" } }
      : null,
}));

vi.mock("../src/lib/jlpt/historyService", async () => {
  const actual = await vi.importActual<
    typeof import("../src/lib/jlpt/historySummary")
  >("../src/lib/jlpt/historySummary");
  return {
    ...actual,
    saveAttemptSummary: saveAttemptSummaryMock,
    listRecentAttempts: listRecentAttemptsMock,
    deleteAttemptById: deleteAttemptByIdMock,
    deleteAllAttempts: deleteAllAttemptsMock,
    getMockCount: vi.fn(async () => null),
    getHistoryVersion: () => ++historyVersionForTest,
    getAttemptById: vi.fn(async (_uid: string, id: string) => mockHistory.find((r) => r.id === id) ?? null),
    readSavedIds: () => new Set<string>(savedIdsMock),
    markSaved: vi.fn((_uid: string | null, id: string) => {
      savedIdsMock.add(id);
    }),
  };
});

vi.mock("../src/lib/jlpt/draftStore", async () => {
  const actual = await vi.importActual<
    typeof import("../src/lib/jlpt/historySummary")
  >("../src/lib/jlpt/historySummary");
  return {
    DRAFTS_CHANGED_EVENT: "app:jlpt-drafts-changed",
    MAX_DRAFTS: actual.MAX_DRAFTS,
    toCompactDraft: actual.toCompactDraft,
    restoreAttemptFromDraft: actual.restoreAttemptFromDraft,
    readLocalDrafts: () => [...mockDrafts],
    loadUserDrafts: async () => [...mockDrafts],
    saveUserDraft: vi.fn((_uid: string, attempt) => {
      const d = actual.toCompactDraft(attempt);
      if (d) mockDrafts = [d, ...mockDrafts.filter((x) => x.id !== d.id)];
      return d;
    }),
    removeUserDraft: vi.fn((_uid: string, draftId: string) => {
      mockDrafts = mockDrafts.filter((d) => d.id !== draftId);
      return [...mockDrafts];
    }),
    clearAllUserDrafts: vi.fn(() => {
      mockDrafts = [];
    }),
    flushUserDrafts: vi.fn(async () => undefined),
    draftSyncError: () => null,
    draftsLoaded: () => false,
  };
});

vi.mock("../src/data/exams/jlpt", async () => {
  const raw = (
    await import("../src/data/exams/jlpt/n2/kokusho-20days/day01.json")
  ).default as JLPTExam;
  const { buildPracticePool, poolId } = await import(
    "../src/lib/jlpt/practicePool"
  );
  const exams = [raw];
  const pool = buildPracticePool(exams)!;
  return {
    allJLPTExams: exams,
    getExamById: (id: string) =>
      id === poolId(raw.bookId || raw.id, raw.level)
        ? pool
        : exams.find((e) => e.id === id),
    getJLPTBooksByLevel: () => [
      {
        id: raw.bookId || raw.id,
        title: raw.bookTitle,
        level: raw.level,
        exams,
      },
    ],
  };
});

vi.mock("../src/lib/jlpt/sentenceAnalyzer", () => ({
  preloadKuromoji: () => Promise.resolve(),
}));
vi.mock("../src/lib/dictionary/dictionaryLoader", () => ({
  prefetchLexicon: vi.fn(),
  lookupWords: vi.fn().mockResolvedValue([]),
  lookupWord: vi.fn().mockResolvedValue(null),
}));
vi.mock("../src/lib/audio/voiceEngine", () => ({
  speakWithVoiceEngine: vi.fn().mockReturnValue(true),
}));
vi.mock("../src/pages/Exam/components/SentenceBreakdownPanel", () => ({
  default: () => null,
}));

const { allJLPTExams, getExamById } = await import("../src/data/exams/jlpt");
const { poolId } = await import("../src/lib/jlpt/practicePool");
const day01 = allJLPTExams[0];
const poolExamId = poolId(day01.bookId || day01.id, day01.level);
const poolExam = getExamById(poolExamId)!;

function renderHub(initialUrl = "/exams/jlpt") {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/exams/jlpt" element={<JLPTExamHub />} />
        <Route path="/exams/jlpt/free" element={<FreePracticeRoom />} />
        <Route path="/exams/jlpt/books" element={<JLPTExamHub initialView="books" />} />
        <Route path="/exams/jlpt/practice" element={<JLPTExamHub tab="practice" />} />
        <Route path="/exams/jlpt/history" element={<Navigate to="/exams/jlpt?lich-su=1" replace />} />
        <Route path="/exams/jlpt/:examId/drill" element={<ExamWorkspace mode="drill" />} />
        <Route path="/exams/jlpt/:examId/mock" element={<ExamWorkspace mode="mock" />} />
        <Route path="/exams/jlpt/:examId/result" element={<ExamWorkspace mode="result" />} />
        <Route path="/exams/jlpt/:examId/result/:attemptId" element={<ExamWorkspace mode="result" />} />
        <Route path="/login" element={<p>Trang đăng nhập</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Stage 2 & Stage 3: JLPT Dashboard, History, Radar & Book Separation", () => {
  beforeEach(() => {
    mockUid = null;
    mockHistory = [];
    mockDrafts = [];
    sessionStorage.clear();
    localStorage.clear();
    setSession(null);
    claimSession(null);
    savedIdsMock.clear();
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("guests see the same layout as signed-in users, with a /login prompt instead of account-only blocks (R6)", () => {
    mockUid = null;
    renderHub("/exams/jlpt");
    expect(screen.getByRole("region", { name: /^Thi thử/ })).toBeTruthy();
    const loginLink = screen.getByRole("link", { name: "Đăng nhập ngay" });
    expect(loginLink.getAttribute("href")).toBe("/login");
    expect(screen.queryByRole("region", { name: "Phân tích năng lực JLPT" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Lịch sử luyện đề và ôn câu sai" })).toBeNull();

    cleanup();
    renderHub("/exams/jlpt/practice");
    expect(screen.getByRole("region", { name: "Luyện nhanh" })).toBeTruthy();
    expect(screen.getByText("Phạm vi bài nguồn")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Bắt đầu luyện nhanh/ })).toBeTruthy();
  });

  it("renders FreePracticeCard, multi-select Scope popup, Skill Radar, Mistake + Full-Exam buckets when logged in", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const m1Questions = poolExam.mondais[0].questions;
    const m2Questions = poolExam.mondais[1].questions;
    const picked = [m1Questions[0].id, m1Questions[1].id, m2Questions[0].id, m2Questions[1].id];

    // Tạo 1 lượt đã nộp: sai câu 1 của M1, bỏ trống câu 2 của M1, đúng cả 2 câu của M2
    const now = Date.now();
    let pastAttempt = createAttempt(poolExam, "mock", picked, now - 120_000);
    const wrongOpt = ((m1Questions[0].answer % 4) + 1) as 1 | 2 | 3 | 4;
    pastAttempt = answer(pastAttempt, m1Questions[0].id, wrongOpt, now - 115_000);
    pastAttempt = answer(pastAttempt, m2Questions[0].id, m2Questions[0].answer, now - 110_000);
    pastAttempt = answer(pastAttempt, m2Questions[1].id, m2Questions[1].answer, now - 105_000);
    const submittedPast = finish(pastAttempt, now - 90_000);
    const summary = buildAttemptHistoryRecord(submittedPast);
    mockHistory = [{ ...summary, id: submittedPast.id }];

    // Tạo 1 bản nháp đang làm dở
    let draftAttempt = createAttempt(poolExam, "drill", picked.slice(0, 2), now - 30_000);
    draftAttempt = answer(draftAttempt, picked[0], m1Questions[0].answer, now - 25_000);
    const compact = toCompactDraft(draftAttempt, now - 20_000)!;
    mockDrafts = [compact];

    renderHub("/exams/jlpt/practice");

    // 1. Khối Luyện tập tự do: chọn Mondai ngay ngoài thẻ, còn Phạm vi bài mở popup chọn Bộ sách & Bài
    const freeCardEl = screen.getByRole("region", { name: "Luyện nhanh" });
    const freeCard = within(freeCardEl);
    expect(freeCard.getByRole("button", { name: /Bắt đầu luyện nhanh/ })).toBeTruthy();
    expect(freeCard.getByText("Dạng bài (9/9 Mondai)")).toBeTruthy();
    expect(freeCard.getByText(/54 câu hỏi sẵn sàng/)).toBeTruthy();

    // Bấm chọn nhanh Mondai Chữ Hán (M1–2) ngay ngoài thẻ mà không cần mở popup
    await user.click(freeCard.getByRole("button", { name: "Chữ Hán (M1–2)" }));
    expect(freeCard.getByText("Dạng bài (2/9 Mondai)")).toBeTruthy();
    expect(freeCard.getByText(/10 câu hỏi sẵn sàng/)).toBeTruthy();

    // Bỏ hết Mondai ngoài thẻ -> nút Bắt đầu bị khóa; chọn lại M1–2
    await user.click(freeCard.getByRole("button", { name: "Bỏ hết" }));
    expect(
      (freeCard.getByRole("button", { name: /Bắt đầu luyện nhanh/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await user.click(freeCard.getByRole("button", { name: "Tất cả M1–9" }));

    // Bấm cả khối Phạm vi bài nguồn -> mở popup, dropdown đóng mặc định, không có Nửa đầu/Nửa cuối hay Lưu & Luyện ngay
    await user.click(freeCard.getByRole("button", { name: /Phạm vi bài nguồn/ }));
    const scopeDialog = await screen.findByRole("dialog", {
      name: /Phạm vi bài nguồn · /,
    });
    expect(within(scopeDialog).queryByRole("button", { name: "Nửa đầu" })).toBeNull();
    expect(within(scopeDialog).queryByRole("button", { name: "Nửa cuối" })).toBeNull();
    expect(within(scopeDialog).queryByRole("button", { name: /Lưu & Luyện ngay/ })).toBeNull();
    expect(within(scopeDialog).queryByRole("checkbox", { name: day01.title })).toBeNull();
    await user.click(within(scopeDialog).getByRole("button", { name: /Mở rộng danh sách bài/ }));
    expect(within(scopeDialog).getByRole("checkbox", { name: day01.title })).toBeTruthy();
    expect(within(scopeDialog).queryByText("Dạng bài (9/9 Mondai)")).toBeNull();
    await user.click(within(scopeDialog).getByRole("button", { name: "Lưu phạm vi" }));
    expect(freeCard.getByText(/54 câu hỏi sẵn sàng/)).toBeTruthy();

    // 3. Trang Tổng quan gom: ôn sai / bỏ trống / làm lại cả bài, năng lực và lịch sử
    cleanup();
    renderHub("/exams/jlpt");
    // Ôn tập chỉ còn một khối đỏ "Ôn câu sai" (sai + chưa làm), nằm sẵn trong Năng lực, không popup
    const reviewBtn = await screen.findByRole("button", { name: /^Ôn câu sai \(2 câu\)/ });
    expect(reviewBtn.textContent).toContain("Ôn 2 câu sai");
    expect(screen.queryByRole("button", { name: /Ôn câu bỏ trống|Chưa chắc|Làm lại cả bài/ })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Ôn tập" })).toBeNull();
    // Số liệu tổng quan là trung bình
    expect(screen.getByText("Chính xác TB")).toBeTruthy();
    expect(screen.getByText("Điểm thi TB")).toBeTruthy();

    // Có hai biểu đồ năng lực
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Biểu đồ năng lực 5 nhóm kỹ năng JLPT" })).toBeTruthy();
      expect(screen.getByRole("img", { name: "Biểu đồ xu hướng độ chính xác JLPT" })).toBeTruthy();
    });
    expect(screen.getByText(/Tính trên tối đa 20 bài thi thử gần nhất/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "10 bài gần nhất" })).toBeNull();
    expect(screen.queryByRole("button", { name: "7 ngày" })).toBeNull();
    expect(screen.queryByRole("button", { name: "30 ngày" })).toBeNull();
    expect(screen.getByRole("button", { name: /Luyện ngay M1/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Luyện ngay M1/ })).toBeNull();

    // Biểu đồ xu hướng: trục theo ngày, không còn nhãn "#n" và chấm xanh "Luyện theo dạng"
    expect(screen.queryByText(/^#\d+/)).toBeNull();
    expect(screen.queryByText("Luyện theo dạng")).toBeNull();
    expect(screen.getByText("Lần thi thử")).toBeTruthy();

    // Lịch sử là popup trên trang Tổng quan, mở từ nút Lịch sử
    expect(screen.queryByRole("dialog", { name: "Lịch sử làm bài" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Lịch sử/ }));
    expect(await screen.findByRole("dialog", { name: "Lịch sử làm bài" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lịch sử làm bài" })).toBeNull());
    cleanup();
    renderHub("/exams/jlpt?lich-su=1");
    await user.click(await screen.findByRole("tab", { name: "Đang làm (1)" }));
    expect(screen.getByRole("button", { name: "Làm tiếp" })).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Đã nộp (1)" }));
    // Mỗi dòng đã nộp chỉ còn Xem lại và Xóa; ôn lại câu sai nằm ở nút Ôn tập
    const popup = screen.getByRole("dialog", { name: "Lịch sử làm bài" });
    expect(within(popup).queryByRole("button", { name: /Ôn sai|Làm lại cả bài/ })).toBeNull();
    const replayBtn = within(popup).getByRole("button", { name: "Xem lại" });
    await user.click(replayBtn);

    await waitFor(() => {
      expect(getSession()?.id).toBe(submittedPast.id);
      expect(getSession()?.status).toBe("submitted");
    });
  });

  it("runs 1-tap endless Free Practice without saving history/drafts and launches Free mode from Scope/Weak/Guest/Full-Exam retry", async () => {
    mockUid = "user-123";
    mockHistory = [];
    mockDrafts = [];
    const user = userEvent.setup();

    renderHub("/exams/jlpt");

    // Khi chưa có dữ liệu: vẫn hiện cả 2 khung biểu đồ (Radar + Xu hướng)
    await waitFor(() => {
      expect(screen.getByRole("region", { name: "Phân tích năng lực JLPT" })).toBeTruthy();
      expect(screen.getByRole("img", { name: "Biểu đồ năng lực 5 nhóm kỹ năng JLPT" })).toBeTruthy();
      expect(screen.getByText("Biểu đồ xu hướng tiến bộ")).toBeTruthy();
    });

    // Xóa dấu vết lưu còn sót từ test trước (lưu bất đồng bộ có thể rơi vào test này khi máy chậm)
    saveAttemptSummaryMock.mockClear();
    cleanup();
    renderHub("/exams/jlpt/practice");

    // Chọn M1–2 ngay ngoài thẻ FreePracticeCard rồi mở popup Lưu phạm vi -> bấm "Bắt đầu luyện nhanh" vào /exams/jlpt/free
    const freeCard = within(screen.getByRole("region", { name: "Luyện nhanh" }));
    await user.click(freeCard.getByRole("button", { name: "Chữ Hán (M1–2)" }));
    await user.click(freeCard.getByRole("button", { name: /Phạm vi bài nguồn/ }));
    const scopeDlg = await screen.findByRole("dialog", { name: /Phạm vi bài nguồn · / });
    await user.click(within(scopeDlg).getByRole("button", { name: "Lưu phạm vi" }));
    await user.click(freeCard.getByRole("button", { name: /Bắt đầu luyện nhanh/ }));

    expect(await screen.findByText(/Đã làm 0 · Đúng 0/)).toBeTruthy();
    expect(screen.queryByText("Luyện nhanh · Không giới hạn")).toBeNull();
    expect(screen.getByText("Câu 1")).toBeTruthy();

    // 1-tap: bấm trực tiếp lựa chọn 1 -> lập tức hiện Đáp án & lời giải (không cần nút Kiểm tra)
    await user.click(screen.getAllByRole("radio")[0]);
    expect(await screen.findByText(/Đáp án: [1-4]/)).toBeTruthy();

    // Sang Câu 2, chọn đáp án thì mới hiện đúng/sai và lời giải, quay lại Câu 1
    await user.click(screen.getByRole("button", { name: "Câu tiếp theo" }));
    expect(await screen.findByText("Câu 2")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xem đáp án luôn" })).toBeNull();
    await user.click(screen.getAllByRole("radio")[0]);
    expect(await screen.findByText(/Đáp án: [1-4]/)).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "← Câu trước" })[0]);
    expect(await screen.findByText("Câu 1")).toBeTruthy();

    // Không ghi history hay tabSession
    expect(getSession()).toBeNull();
    expect(saveAttemptSummaryMock).not.toHaveBeenCalled();

    // Thoát -> kiểm tra Radar "Luyện ngay M1" & bucket "Làm lại full đề" -> đều chạy ở Free Practice Mode
    cleanup();
    setSession(null);
    const m1Questions = poolExam.mondais[0].questions;
    let attempt = createAttempt(poolExam, "mock", [m1Questions[0].id, m1Questions[1].id], Date.now() - 20_000);
    const wrongOpt = ((m1Questions[0].answer % 4) + 1) as 1 | 2 | 3 | 4;
    attempt = answer(attempt, m1Questions[0].id, wrongOpt, Date.now() - 15_000);
    attempt = answer(attempt, m1Questions[1].id, m1Questions[1].answer, Date.now() - 12_000);
    mockHistory = [{ ...buildAttemptHistoryRecord(finish(attempt, Date.now() - 10_000)), id: "weak-m1" }];

    renderHub("/exams/jlpt");
    await user.click(await screen.findByRole("button", { name: /^Ôn câu sai \(1 câu\)/ }));
    expect(await screen.findByText("Ôn câu sai · Luyện nhanh")).toBeTruthy();
    expect(screen.getAllByText("Câu 1 / 1").length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("link", { name: "Luyện đề JLPT" }));
    cleanup();
    renderHub("/exams/jlpt");
    await user.click(await screen.findByRole("button", { name: /Luyện ngay M1/ }));
    expect(await screen.findByText(/Đã làm \d+ · Đúng \d+/)).toBeTruthy();
    expect(screen.getByText(/Mondai 1 ·/)).toBeTruthy();

    // Kiểm tra thêm Guest bấm "Bắt đầu luyện nhanh →" -> vào thẳng Free Practice room
    cleanup();
    setSession(null);
    mockUid = null;
    mockHistory = [];
    renderHub("/exams/jlpt/practice");

    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện nhanh" }));
    expect(await screen.findByText(/Đã làm \d+ · Đúng \d+/)).toBeTruthy();
    expect(getSession()).toBeNull();
  }, 40_000);

  it("resumes draft into tabSession and deletes history entry with confirmation", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const q1 = poolExam.mondais[0].questions[0];
    let draftAttempt = createAttempt(poolExam, "drill", [q1.id], Date.now() - 20_000);
    draftAttempt = answer(draftAttempt, q1.id, q1.answer, Date.now() - 10_000);
    mockDrafts = [toCompactDraft(draftAttempt, Date.now() - 5_000)!];

    renderHub("/exams/jlpt?lich-su=1");
    // Bài dở nằm trong Lịch sử làm bài (mục "Đang làm"), không còn khối riêng ở đầu trang
    const historyRegion = await screen.findByRole("region", { name: "Lịch sử làm bài" });
    await waitFor(() => {
      expect(within(historyRegion).getByRole("button", { name: /^Làm tiếp/ })).toBeTruthy();
    });
    await user.click(within(historyRegion).getByRole("button", { name: /^Làm tiếp/ }));

    await waitFor(() => {
      expect(getSession()?.id).toBe(draftAttempt.id);
      expect(getSession()?.status).toBe("in_progress");
    });

    // Kiểm tra xóa lịch sử đã nộp qua hộp thoại xác nhận
    cleanup();
    const pastSubmitted = finish(
      answer(createAttempt(poolExam, "drill", [q1.id], Date.now() - 40_000), q1.id, q1.answer),
    );
    const rec = { ...buildAttemptHistoryRecord(pastSubmitted), id: "hist-del-1" };
    mockHistory = [rec];
    mockDrafts = [];

    renderHub("/exams/jlpt?lich-su=1");
    const delBtn = await screen.findByRole("button", {
      name: `Xóa lịch sử ${rec.title}`,
    });
    await user.click(delBtn);
    await user.click(await screen.findByRole("button", { name: "Xác nhận" }));

    await waitFor(() => {
      expect(deleteAttemptByIdMock).toHaveBeenCalledWith("user-123", "hist-del-1");
    });
  });

  it("keeps Stage 3 Day book practice isolated from dashboard history", async () => {
    mockUid = "user-123";
    renderHub(`/exams/jlpt?book=${day01.bookId || day01.id}`);

    expect(screen.getByText(/Bài theo ngày không lưu vào lịch sử/)).toBeTruthy();
    // Kho sách đề chỉ còn 1 nút "Làm bài" (chọn đáp án trước rồi xem lời giải); không có Luyện theo dạng / Làm bài có giờ
    expect(screen.queryByRole("link", { name: `Luyện theo dạng ${day01.title}` })).toBeNull();
    expect(screen.queryByRole("button", { name: /Làm bài có giờ/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: `Làm bài ${day01.title}` }).getAttribute("href"),
    ).toBe(`/exams/jlpt/${day01.id}/review`);

    // Nộp 1 bài theo ngày khi đăng nhập -> KHÔNG ghi vào lịch sử (chỉ Thi thử được lưu)
    cleanup();
    const q1 = day01.mondais[0].questions[0];
    const dayAttempt = finish(
      answer(createAttempt(day01, "drill", [q1.id], Date.now() - 10_000), q1.id, q1.answer),
    );
    setSession(dayAttempt);
    renderHub(`/exams/jlpt/${day01.id}/result`);

    await screen.findByText(/Kết quả/);
    expect(saveAttemptSummaryMock).not.toHaveBeenCalled();
    // Lưu thành công thì không còn dòng "Đã lưu vào tài khoản" (chỉ báo khi lưu lỗi)
    expect(screen.queryByText(/Đã lưu vào tài khoản/)).toBeNull();
    expect(screen.queryByText(/Chưa lưu lên tài khoản/)).toBeNull();
  });

  it("prefills selected Mondais from ?mondais=7,8 query parameter in ExamWorkspace", () => {
    mockUid = "user-123";
    renderHub(`/exams/jlpt/${poolExamId}/drill?mondais=7,8`);

    const m7Btn = screen.getByText(/Mondai 7 · Chuẩn đề/).closest("button")!;
    const m8Btn = screen.getByText(/Mondai 8 · Chuẩn đề/).closest("button")!;
    const m1Btn = screen.getByText(/Mondai 1 · Chuẩn đề/).closest("button")!;
    expect(m7Btn.getAttribute("aria-pressed")).toBe("true");
    expect(m8Btn.getAttribute("aria-pressed")).toBe("true");
    expect(m1Btn.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Lượt này: 17 câu")).toBeTruthy();
  });

  it("collapses HistoryPanel to 5 items by default and expands with Xem thêm", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const q1 = poolExam.mondais[0].questions[0];
    const baseAttempt = finish(
      answer(createAttempt(poolExam, "drill", [q1.id], Date.now() - 100_000), q1.id, q1.answer),
    );
    const baseSummary = buildAttemptHistoryRecord(baseAttempt);

    // 7 lượt -> mặc định hiển thị 5 lượt mới nhất, nút "Xem thêm (còn 2 bài)"
    mockHistory = Array.from({ length: 7 }, (_, idx) => ({
      ...baseSummary,
      id: `hist-row-${idx + 1}`,
      title: `Lượt luyện #${idx + 1}`,
      endedAt: Date.now() - (7 - idx) * 60_000,
    }));

    renderHub("/exams/jlpt?lich-su=1");
    expect(await screen.findByText("Lượt luyện #7")).toBeTruthy();
    expect(screen.getByText("Lượt luyện #3")).toBeTruthy();
    expect(screen.queryByText("Lượt luyện #1")).toBeNull();
    expect(screen.queryByText("Lượt luyện #2")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Xem thêm (còn 2 bài)" }));
    expect(screen.getByText("Lượt luyện #1")).toBeTruthy();
    expect(screen.getByText("Lượt luyện #2")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Thu gọn danh sách" }));
    expect(screen.queryByText("Lượt luyện #1")).toBeNull();
  });

  it("shows an unfinished mock once: Thi thử offers Làm tiếp + Đề mới, Lịch sử lists it, Xóa removes tab copy and draft", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const live = { ...createAttempt(poolExam, "mock"), strict: true, retry: false };
    act(() => setSession(live));
    mockDrafts = [toCompactDraft(live)!];
    renderHub("/exams/jlpt");

    const thiThu = screen.getByRole("region", { name: /^Thi thử/ });
    expect(within(thiThu).getByRole("button", { name: /^Làm tiếp/ })).toBeTruthy();
    expect(within(thiThu).getByRole("button", { name: "Đề mới" })).toBeTruthy();
    expect(within(thiThu).queryByRole("button", { name: /Xem kết quả/ })).toBeNull();
    // Không còn khối riêng ở đầu trang
    expect(screen.queryByText(/Kết thúc và xóa bài đang làm/)).toBeNull();
    // Nút Lịch sử báo có 1 bài đang làm
    expect(screen.getByRole("button", { name: /^Lịch sử/ }).textContent).toContain("1 đang làm");

    cleanup();
    renderHub("/exams/jlpt?lich-su=1");
    const history = await screen.findByRole("region", { name: "Lịch sử làm bài" });
    expect(within(history).getByRole("tab", { name: "Đang làm (1)" })).toBeTruthy();
    await user.click(within(history).getByRole("button", { name: /Xóa bài đang làm/ }));
    await user.click(await screen.findByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(getSession()).toBeNull());
    expect(mockDrafts).toHaveLength(0);
    cleanup();
    renderHub("/exams/jlpt");
    expect(
      within(screen.getByRole("region", { name: /^Thi thử/ })).getByRole("button", {
        name: /Bắt đầu thi thử/,
      }),
    ).toBeTruthy();
  });

  it("Đề mới asks first, then deletes the old unfinished mock (tab + draft) and starts a new one", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const old = { ...createAttempt(poolExam, "mock"), strict: true, retry: false };
    act(() => setSession(old));
    mockDrafts = [toCompactDraft(old)!];
    renderHub("/exams/jlpt");

    await user.click(
      within(screen.getByRole("region", { name: /^Thi thử/ })).getByRole("button", {
        name: "Đề mới",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("sẽ bị xóa và không tính điểm");
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => {
      expect(getSession()?.id).not.toBe(old.id);
      expect(getSession()?.status).toBe("in_progress");
    });
    expect(mockDrafts.some((d) => d.id === old.id)).toBe(false);
  });

  it("Xem lại an old result keeps the in-progress attempt as a draft instead of discarding it", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const q1 = poolExam.mondais[0].questions[0];
    const past = finish(
      answer(createAttempt(poolExam, "drill", [q1.id], Date.now() - 60_000), q1.id, q1.answer),
    );
    mockHistory = [{ ...buildAttemptHistoryRecord(past), id: "hist-old" }];
    const dayQ = day01.mondais[0].questions[0].id;
    const live = answer(createAttempt(day01, "drill", [dayQ]), dayQ, 1);
    act(() => setSession(live));
    renderHub("/exams/jlpt?lich-su=1");

    const history = await screen.findByRole("region", { name: "Lịch sử làm bài" });
    await user.click(await within(history).findByRole("button", { name: "Xem lại" }));
    await waitFor(() => expect(getSession()?.id).toBe("hist-old"));
    expect(mockDrafts.some((d) => d.id === live.id)).toBe(true);
  });

  it("opens a result by its own address in a fresh tab, and explains when the id is unknown", async () => {
    mockUid = "user-123";
    const q1 = poolExam.mondais[0].questions[0];
    const past = finish(
      answer(createAttempt(poolExam, "mock", [q1.id], Date.now() - 60_000), q1.id, q1.answer),
    );
    mockHistory = [{ ...buildAttemptHistoryRecord(past), id: "hist-x" }];
    act(() => setSession(null, { silent: true }));
    renderHub(`/exams/jlpt/${poolExam.id}/result/hist-x`);
    expect(await screen.findByText(/1\/1 câu đúng/)).toBeTruthy();
    expect(getSession()?.id).toBe("hist-x");

    cleanup();
    act(() => setSession(null, { silent: true }));
    renderHub(`/exams/jlpt/${poolExam.id}/result/khong-co`);
    expect(await screen.findByText(/Không tìm thấy kết quả này/)).toBeTruthy();
  });

  it("signing out removes the previous account's attempt from this tab", async () => {
    mockUid = "user-123";
    const live = { ...createAttempt(poolExam, "mock"), strict: true, retry: false };
    act(() => setSession(live));
    renderHub("/exams/jlpt");
    await waitFor(() => expect(getSession()?.id).toBe(live.id));

    cleanup();
    mockUid = null;
    renderHub("/exams/jlpt");
    await waitFor(() => expect(getSession()).toBeNull());
    expect(
      within(screen.getByRole("region", { name: /^Thi thử/ })).getByRole("button", {
        name: /Bắt đầu thi thử/,
      }),
    ).toBeTruthy();
  });

  it("a guest's submitted result is saved to the account right after signing in, without opening the result page", async () => {
    mockUid = null;
    const q1 = poolExam.mondais[0].questions[0];
    const done = finish(answer({ ...createAttempt(poolExam, "mock", [q1.id]), strict: true, retry: false }, q1.id, q1.answer));
    act(() => setSession(done));
    renderHub("/exams/jlpt?lich-su=1");
    expect(screen.getByRole("region", { name: "Lịch sử làm bài" }).textContent).toContain(
      "đăng nhập để lưu",
    );
    expect(saveAttemptSummaryMock).not.toHaveBeenCalled();

    cleanup();
    mockUid = "user-123";
    renderHub("/exams/jlpt");
    await waitFor(() =>
      expect(saveAttemptSummaryMock).toHaveBeenCalledWith(
        "user-123",
        done.id,
        expect.objectContaining({ correct: 1 }),
      ),
    );
  });

  it("a failed save shows the real reason without keeping any copy in browser storage; Lưu lại saves it to the account", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const denied = Object.assign(new Error("Missing or insufficient permissions."), {
      code: "permission-denied",
    });
    const ok = async (_uid: string, id: string, summary: StoredAttemptSummary) => {
      mockHistory = [{ ...summary, id }, ...mockHistory];
    };
    saveAttemptSummaryMock.mockImplementation(async () => {
      throw denied;
    });
    try {
      const q1 = poolExam.mondais[0].questions[0];
      const done = finish(answer({ ...createAttempt(poolExam, "mock", [q1.id]), strict: true, retry: false }, q1.id, q1.answer));
      act(() => setSession(done));
      renderHub("/exams/jlpt?lich-su=1");

      const history = await screen.findByRole("region", { name: "Lịch sử làm bài" });
      expect(
        await within(history).findByText(/Chưa lưu: Không có quyền ghi dữ liệu/),
      ).toBeTruthy();
      // Đã đăng nhập: không ghi gì của bài này vào bộ nhớ trình duyệt
      const stored = [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) =>
        /jlpt:(v1|v2):(state|content|pending-saves|drafts)/.test(k),
      );
      expect(stored).toEqual([]);

      saveAttemptSummaryMock.mockImplementation(ok);
      await user.click(within(history).getByRole("button", { name: "Lưu lại" }));
      await waitFor(() => expect(mockHistory.some((h) => h.id === done.id)).toBe(true));
      await waitFor(() => expect(within(history).queryByText(/Chưa lưu/)).toBeNull());
    } finally {
      saveAttemptSummaryMock.mockImplementation(ok);
    }
  });

  it("Bỏ kết quả chưa lưu removes it for good (it does not come back after reopening the page)", async () => {
    mockUid = "user-123";
    const user = userEvent.setup();
    const ok = async (_uid: string, id: string, summary: StoredAttemptSummary) => {
      mockHistory = [{ ...summary, id }, ...mockHistory];
    };
    saveAttemptSummaryMock.mockImplementation(async () => {
      throw Object.assign(new Error("denied"), { code: "permission-denied" });
    });
    try {
      const q1 = poolExam.mondais[0].questions[0];
      const done = finish(answer({ ...createAttempt(poolExam, "mock", [q1.id]), strict: true, retry: false }, q1.id, q1.answer));
      act(() => setSession(done));
      renderHub("/exams/jlpt?lich-su=1");
      const history = await screen.findByRole("region", { name: "Lịch sử làm bài" });
      await within(history).findByText(/Chưa lưu/);
      await user.click(within(history).getByRole("button", { name: /Bỏ kết quả chưa lưu/ }));
      await user.click(await screen.findByRole("button", { name: "Xác nhận" }));
      await waitFor(() => expect(getSession()).toBeNull());

      cleanup();
      saveAttemptSummaryMock.mockClear();
      renderHub("/exams/jlpt");
      await waitFor(() => expect(listRecentAttemptsMock).toHaveBeenCalled());
      expect(screen.queryByText(/Chưa lưu/)).toBeNull();
      expect(saveAttemptSummaryMock).not.toHaveBeenCalled();
    } finally {
      saveAttemptSummaryMock.mockImplementation(ok);
    }
  });

  it("signed-in attempts live only in page memory; guests keep them in sessionStorage", async () => {
    const live = { ...createAttempt(poolExam, "mock"), strict: true, retry: false };
    mockUid = null;
    act(() => setSession(live));
    renderHub("/exams/jlpt");
    expect(sessionStorage.getItem("language-master:jlpt:v2:state")).not.toBeNull();

    cleanup();
    mockUid = "user-123";
    renderHub("/exams/jlpt");
    await waitFor(() => expect(sessionStorage.getItem("language-master:jlpt:v2:state")).toBeNull());
    expect(getSession()?.id).toBe(live.id);
  });

  it("after a reload, a signed-in user's unfinished mock is restored from the account", async () => {
    mockUid = "user-123";
    const draftAttempt = { ...createAttempt(poolExam, "mock"), strict: true, retry: false };
    mockDrafts = [toCompactDraft(draftAttempt)!];
    expect(getSession()).toBeNull();
    renderHub(`/exams/jlpt/${poolExamId}/mock`);
    await waitFor(() => expect(getSession()?.id).toBe(draftAttempt.id));
    expect(getSession()?.status).toBe("in_progress");
  });
  it("Tổng quan: Thi thử và Lịch sử là nút; Lịch sử mở popup, /history chuyển về popup; khách không có khối Ôn tập", async () => {
    mockUid = null;
    const user = userEvent.setup();
    renderHub("/exams/jlpt");
    expect(screen.getByRole("button", { name: /Bắt đầu thi thử/ })).toBeTruthy();
    // Khách: Ôn tập và Năng lực cần đăng nhập
    expect(screen.queryByRole("region", { name: "Ôn tập" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Ôn tập/ })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Lịch sử làm bài" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Đề mới" })).toBeNull();

    // Kết quả vừa nộp chưa lưu: nút Lịch sử đổi cảnh báo, bấm mở popup
    const q1 = poolExam.mondais[0].questions[0];
    act(() =>
      setSession(finish(answer({ ...createAttempt(poolExam, "mock", [q1.id]), strict: true, retry: false }, q1.id, q1.answer))),
    );
    cleanup();
    renderHub("/exams/jlpt");
    const historyBtn = screen.getByRole("button", { name: /^Lịch sử/ });
    expect(historyBtn.textContent).toContain("1 chưa lưu");
    await user.click(historyBtn);
    const dialog = await screen.findByRole("dialog", { name: "Lịch sử làm bài" });
    expect(within(dialog).getByRole("region", { name: "Lịch sử làm bài" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Các mục Luyện đề JLPT" })).not.toBeNull();

    // Địa chỉ cũ /history chuyển về popup
    cleanup();
    renderHub("/exams/jlpt/history");
    expect(await screen.findByRole("dialog", { name: "Lịch sử làm bài" })).toBeTruthy();
  });

  it("đặt tên bài thi thử theo bộ đếm cố định và hiện tổng số lần thi thử", async () => {
    mockUid = "user-123";
    const m = poolExam.mondais[0].questions;
    let a1 = { ...createAttempt(poolExam, "mock", [m[0].id], Date.now() - 20_000), strict: true, retry: false };
    a1 = answer(a1, m[0].id, m[0].answer, Date.now() - 15_000);
    mockHistory = [
      { ...buildAttemptHistoryRecord(finish(a1, Date.now() - 10_000)), id: "mock-seq", seq: 12 },
    ];
    renderHub("/exams/jlpt?lich-su=1");
    const dialog = await screen.findByRole("dialog", { name: "Lịch sử làm bài" });
    await waitFor(() => expect(within(dialog).getByText("Thi thử lần 12")).toBeTruthy());
  });
});
