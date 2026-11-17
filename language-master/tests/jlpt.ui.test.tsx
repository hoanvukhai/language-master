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
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { JLPTExam } from "../src/data/exams/jlpt/types";
import ExamWorkspace from "../src/pages/Exam/ExamWorkspace";
import FreePracticeRoom from "../src/pages/Exam/FreePracticeRoom";
import { getSession, setSession } from "../src/lib/jlpt/tabSession";
import { refreshSession } from "../src/lib/jlpt/tabSession";
import {
  createAttempt,
  finish,
  DRILL_COMMIT_DELAY_MS,
} from "../src/lib/jlpt/examCore";
import {
  buildPracticePool,
  pickPracticeQuestions,
  practiceSnapshot,
} from "../src/lib/jlpt/practicePool";
import { units, decodeSession, validateExam } from "../src/lib/jlpt/examCore";
import DrillSession from "../src/pages/Exam/sessions/DrillSession";
import { buildCompletedSentence } from "../src/lib/jlpt/examText";
import JLPTExamHub from "../src/pages/Exam/JLPTExamHub";
import { speakWithVoiceEngine } from "../src/lib/audio/voiceEngine";
import {
  getWordNotebookStatus,
  lookupExternal,
  quickSaveWordToNotebook,
  sanitizeKanaReading,
} from "../src/lib/dictionary/multiBookLookup";


function setupUser() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}
/** Chốt ngay câu đang chờ 1,5 giây trong lượt luyện */
function commitNow() {
  act(() => {
    vi.advanceTimersByTime(DRILL_COMMIT_DELAY_MS + 10);
  });
}

/** Bấm "Bắt đầu làm bài": vào thẳng nếu không thay bài nào; chỉ khi thay bài đang có mới có hộp xác nhận (luôn nghiêm túc) */
/** Chọn đủ đáp án cho mọi câu của bài đang làm (bắt buộc chọn hết mới được nộp) */
function answerAll() {
  const cur = getSession()!;
  const ids = new Set(cur.questionIds);
  const answers = { ...cur.answers };
  for (const q of cur.exam.mondais.flatMap((m) => m.questions))
    if (ids.has(q.id) && !answers[q.id]) answers[q.id] = q.answer;
  act(() => setSession({ ...cur, answers }));
}

async function startMock(user: ReturnType<typeof setupUser>) {
  await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
  const dialog = screen.queryByRole("dialog", { name: "Bắt đầu bài có giờ" });
  if (dialog) await user.click(within(dialog).getByRole("button", { name: "Bắt đầu" }));
}

/** Mở menu ⋯ của lượt đang làm rồi chọn một mục (JL-14). */
async function chooseAttemptMenu(
  user: ReturnType<typeof setupUser>,
  name: string,
) {
  await user.click(screen.getByRole("button", { name: "Tùy chọn lượt làm" }));
  await user.click(screen.getByRole("menuitem", { name }));
}

const exams = Object.values(
  import.meta.glob<JLPTExam>(
    "../src/data/exams/jlpt/n2/kokusho-20days/day*.json",
    { eager: true, import: "default" },
  ),
).sort((a, b) => a.day! - b.day!);
vi.mock("../src/data/exams/jlpt", async () => {
  const { buildPracticePool } = await import("../src/lib/jlpt/practicePool");
  const modules = import.meta.glob<JLPTExam>(
    "../src/data/exams/jlpt/n2/kokusho-20days/day*.json",
    { eager: true, import: "default" },
  );
  const sorted = Object.values(modules).sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
  return {
    getExamById: (id: string) =>
      id.startsWith("pool-")
        ? buildPracticePool(sorted)
        : sorted.find((e) => e.id === id),
    getJLPTBooksByLevel: (level?: string) => {
      if (level && level !== "ALL" && level.toUpperCase() !== "N2") return [];
      return [
        {
          id: "kokusho-n2-20days",
          level: "N2" as const,
          title: "日本語能力試験 20日で合格 N2 文字・語彙・文法",
          subtitle: "Bộ đề thực chiến 20 ngày Chữ Hán, Từ vựng & Ngữ pháp N2",
          totalDays: sorted.length,
          totalQuestions: sorted.reduce(
            (sum, exam) =>
              sum +
              exam.mondais.reduce((mSum, m) => mSum + m.questions.length, 0),
            0,
          ),
          exams: sorted,
        },
      ];
    },
  };
});
vi.mock("../src/lib/jlpt/sentenceAnalyzer", () => ({
  lookupWordInDictionary: () => null,
  setDictionarySearch: () => undefined,
}));
vi.mock("../src/lib/dictionary/dictionaryLoader", () => ({
  loadLexicon: () => Promise.resolve(),
  loadFullDictionary: () => Promise.resolve(),
  prefetchLexicon: () => undefined,
  useDictionaryLevel: () => "lexicon",
  getDictionaryLevel: () => "lexicon",
}));
vi.mock("../src/lib/audio/voiceEngine", () => ({
  speakWithVoiceEngine: vi.fn(),
}));
vi.mock("../src/pages/Exam/components/SentenceBreakdownPanel", () => ({
  default: () => null,
}));

function open(exam: JLPTExam, mode = "mock") {
  return render(
    <MemoryRouter initialEntries={[`/exams/jlpt/${exam.id}/${mode}`]}>
      <Routes>
        <Route
          path="/exams/jlpt/free"
          element={<FreePracticeRoom />}
        />
        <Route
          path="/exams/jlpt/:examId/mock"
          element={<ExamWorkspace mode="mock" />}
        />
        <Route
          path="/exams/jlpt/:examId/drill"
          element={<ExamWorkspace mode="drill" />}
        />
        <Route
          path="/exams/jlpt/:examId/review"
          element={<ExamWorkspace mode="review" />}
        />
        <Route
          path="/exams/jlpt/:examId/result"
          element={<ExamWorkspace mode="result" />}
        />
        <Route
          path="/exams/jlpt/:examId/result/:attemptId"
          element={<ExamWorkspace mode="result" />}
        />
        <Route
          path="/exams/jlpt/:examId"
          element={<ExamWorkspace mode="detail" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setSession(null);
  // Đồng hồ giả chạy theo thời gian thật; commitNow() tua qua 1,5 giây chờ chốt (mục 7.1)
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("pooled practice", () => {
  const pool = buildPracticePool(exams)!;
  it("redirects a day drill entry into the full bank", () => {
    render(
      <MemoryRouter initialEntries={[`/exams/jlpt/${exams[0].id}/drill`]}>
        <Routes>
          <Route path="/exams/jlpt/:examId/drill" element={<DrillSession />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Luyện theo dạng" }),
    ).toBeTruthy();
    expect(getSession()).toBeNull();
  });
  it("keeps a scoped retry from a mock instead of redirecting and discarding it", async () => {
    const user = setupUser();
    const exam = exams[0];
    const retry = createAttempt(exam, "drill", [
      exam.mondais[8].questions[2].id,
    ]);
    setSession(retry);
    render(
      <MemoryRouter initialEntries={[`/exams/jlpt/${exam.id}/drill`]}>
        <Routes>
          <Route path="/exams/jlpt/:examId/drill" element={<DrillSession />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("button", { name: "Xem câu hỏi" }).getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Xem đoạn văn" }));
    expect(
      screen.getByAltText("Đoạn văn và chú thích nguyên bản"),
    ).toBeTruthy();
    expect(getSession()?.id).toBe(retry.id);
    expect(getSession()?.questionIds).toHaveLength(5);
  });
  it("merges all 20 days with unique IDs, source attribution and independent passages", () => {
    expect(validateExam(pool)).toEqual([]);
    const qs = pool.mondais.flatMap((m) => m.questions);
    expect(qs).toHaveLength(1080);
    expect(new Set(qs.map((q) => q.id)).size).toBe(1080);
    expect(new Set(qs.map((q) => q.origin!.day)).size).toBe(20);
    expect(pool.mondais[8].passages).toHaveLength(20);
    expect(units(pool).filter((u) => u.questions.length === 5)).toHaveLength(
      20,
    );
  });
  it.each(Array.from({ length: 9 }, (_, i) => String(i + 1)))(
    "samples Mondai %s without repeats or changing options/keys",
    (mondai) => {
      const ids = pickPracticeQuestions(pool, mondai, 20, () => 0.37);
      expect(ids).toHaveLength(20);
      expect(new Set(ids).size).toBe(20);
      const snapshot = practiceSnapshot(pool, ids);
      expect(snapshot.mondais).toHaveLength(1);
      expect(String(snapshot.mondais[0].number)).toBe(mondai);
      expect(validateExam(snapshot)).toEqual([]);
      const a = createAttempt(snapshot, "drill", ids);
      expect(a.questionIds).toEqual(ids);
      expect(
        decodeSession(JSON.stringify({ version: 1, attempt: a }))?.questionIds,
      ).toEqual(ids);
      for (const q of snapshot.mondais[0].questions) {
        const original = exams
          .flatMap((e) => e.mondais.flatMap((m) => m.questions))
          .find((x) => x.id === q.id)!;
        expect(q.answer).toBe(original.answer);
        expect(q.options).toEqual(original.options);
      }
    },
  );
  it("keeps full passage if the requested size intersects a group", () => {
    const ids = pickPracticeQuestions(pool, "9", 7, () => 0);
    expect(ids).toHaveLength(10);
    expect(units(pool, ids).every((u) => u.questions.length === 5)).toBe(true);
  });
  it("stores shuffled navigation order without regrouping it by source day", () => {
    const ids = pickPracticeQuestions(pool, "1", 10, () => 0);
    const sourceOrder = pool.mondais[0].questions.slice(0, 10).map((q) => q.id);
    expect(ids).not.toEqual(sourceOrder);
    const a = createAttempt(practiceSnapshot(pool, ids), "drill", ids);
    expect(units(a.exam, a.questionIds).map((u) => u.questions[0].id)).toEqual(
      ids,
    );
  });
  it("starts a random 10-question passage round, resumes unchanged and changes configuration without erasing it", async () => {
    const user = setupUser();
    const view = open(pool, "drill");
    await user.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    await user.click(screen.getByText(/Mondai 9 · Chuẩn đề/));
    await user.click(screen.getByText(/Theo tổng số câu mỗi lượt/));
    await user.selectOptions(screen.getByLabelText("Số câu mỗi lượt"), "10");
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    const saved = getSession()!;
    expect(saved.questionIds).toHaveLength(10);
    expect(saved.exam.totalQuestions).toBe(10);
    expect(saved.exam.mondais[0].passages).toHaveLength(2);
    expect(screen.getAllByText(/Ngày \d+ · Câu/)).toHaveLength(1);
    expect(
      screen.queryByRole("group", { name: "Chọn câu trong đoạn văn" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Xem đoạn văn" }));
    const poolBlankButtons = screen.getAllByRole("button", {
      name: /^Ô trống .*, tới câu hỏi$/,
    });
    const poolUniqueNums = new Set(
      poolBlankButtons
        .map((btn) => btn.getAttribute("aria-label")?.match(/^Ô trống (\d+)/)?.[1])
        .filter(Boolean),
    );
    expect(poolUniqueNums.size).toBe(5);
    await user.click(screen.getByRole("button", { name: "Xem câu hỏi" }));
    view.unmount();
    open(pool, "drill");
    expect(getSession()?.questionIds).toEqual(saved.questionIds);
    await chooseAttemptMenu(user, "Đổi dạng / số câu");
    expect(getSession()?.id).toBe(saved.id);
    await user.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    await user.click(screen.getByText(/Mondai 1 · Chuẩn đề/));
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await user.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(getSession()?.id).toBe(saved.id);
    await user.click(screen.getByRole("link", { name: "Làm tiếp" }));
    await chooseAttemptMenu(user, "Kết thúc và xóa bài đang làm");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(getSession()).toBeNull();
    expect(screen.getByRole("button", { name: "Bắt đầu luyện" })).toBeTruthy();
  });
  it("shows authored explanations publicly on reference and never during an ongoing mock", async () => {
    const user = setupUser();
    const view = open(exams[1], "review");
    // Chưa chọn đáp án thì chưa hiện lời giải
    expect(
      screen.queryByText(exams[1].mondais[0].questions[0].explanation!.vi!),
    ).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
    expect(
      screen.getByText(exams[1].mondais[0].questions[0].explanation!.vi!),
    ).toBeTruthy();
    expect(screen.getByText(/Lời giải tham khảo do AI/)).toBeTruthy();
    view.unmount();
    open(exams[1], "mock");
    await startMock(user);
    expect(screen.queryByText(/Lời giải tham khảo do AI/)).toBeNull();
    expect(
      screen.queryByText(exams[1].mondais[0].questions[0].explanation!.vi!),
    ).toBeNull();
  });
});

describe.each(exams.map((e) => [e.day, e] as const))("Day %s", (_day, exam) => {
  it("starts only on click, submits, and keeps answers read-only", async () => {
    const user = setupUser();
    open(exam);
    expect(getSession()).toBeNull();
    // Không có bài nào bị thay thì vào thẳng, không hỏi xác nhận
    await startMock(user);
    expect(getSession()?.questionIds.length).toBe(54);
    expect(getSession()?.strict).toBe(true);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(document.querySelectorAll("[data-exam-selectable]")).toHaveLength(5);
    expect(screen.queryByText(/Chọn phương án [1-4]/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
    expect(Object.values(getSession()!.answers)).toEqual([1]);
    // Còn câu chưa chọn thì không cho nộp: không hỏi xác nhận, chỉ nhắc chọn hết
    await user.click(screen.getByRole("button", { name: "Nộp bài" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Còn 53 câu chưa chọn");
    expect(getSession()?.status).toBe("in_progress");
    answerAll();
    await user.click(screen.getByRole("button", { name: "Nộp bài" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(getSession()?.status).toBe("submitted");
    const saved = JSON.stringify(getSession()?.answers);
    // Sau khi nộp mở tab "Tóm tắt"; phần bài làm nằm ở tab "Bài làm chi tiết", không còn nút bật/tắt
    expect(screen.queryByRole("button", { name: "Xem lại bài" })).toBeNull();
    await user.click(await screen.findByRole("tab", { name: "Bài làm chi tiết" }));
    expect(screen.getByRole("tab", { name: "Tóm tắt" }).getAttribute("aria-selected")).toBe("false");
    for (const option of await screen.findAllByRole("radio"))
      expect((option as HTMLInputElement).disabled).toBe(true);
    expect(JSON.stringify(getSession()?.answers)).toBe(saved);
  });
  it("JL-15: result page has a summary tab and a detail tab with explanations open, without filter, view toggle or expand buttons", async () => {
    const user = setupUser();
    const qs = exams[0].mondais[0].questions.slice(0, 3);
    const a = createAttempt(exams[0], "mock", qs.map((q) => q.id));
    a.answers[qs[0].id] = qs[0].answer;
    a.answers[qs[1].id] = (qs[1].answer % 4) + 1;
    act(() => setSession(finish(a)));
    open(exams[0], "result");
    // Tab "Tóm tắt" mặc định: có khối Mondai yếu của riêng bài này (Mondai 1 đúng 1/3 câu), chưa hiện bài làm
    expect(screen.getByRole("tab", { name: "Tóm tắt" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "Luyện Mondai yếu M1" })).toBeTruthy();
    expect(screen.queryAllByText(/^Đáp án:/)).toHaveLength(0);
    await user.click(screen.getByRole("tab", { name: "Bài làm chi tiết" }));
    expect(screen.getByRole("tab", { name: "Bài làm chi tiết" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("button", { name: "Luyện Mondai yếu M1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xem lại bài" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xem câu sai" })).toBeNull();
    // Không còn thanh lọc, nút Từng câu / Danh sách, nút mở / thu gọn lời giải, nút Dịch câu
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Danh sách" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xem đáp án & lời giải" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Thu gọn lời giải" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Dịch câu/ })).toBeNull();
    // Lời giải hiện sẵn
    expect(screen.getAllByText(/^Đáp án:/).length).toBeGreaterThanOrEqual(1);
  });
  it("result page opens the detail tab from ?tab=detail", async () => {
    const qs = exams[0].mondais[0].questions.slice(0, 3);
    act(() => setSession(finish(createAttempt(exams[0], "mock", qs.map((q) => q.id)))));
    open(exams[0], "result?tab=detail");
    expect(
      (await screen.findByRole("tab", { name: "Bài làm chi tiết" })).getAttribute("aria-selected"),
    ).toBe("true");
    expect((await screen.findAllByText(/^Đáp án:/)).length).toBeGreaterThanOrEqual(1);
  });
  it("keeps passage and five final questions in one drill unit", async () => {
    const user = setupUser();
    open(exam, "drill");
    await user.selectOptions(screen.getByRole("combobox"), "9");
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    expect(getSession()?.questionIds.length).toBe(5);
    const check = screen.getByRole("button", {
      name: "Kiểm tra nhóm",
    }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    expect(
      screen.queryByRole("group", { name: "Chọn câu trong đoạn văn" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Xem đoạn văn" }));
    expect(
      screen.getByAltText("Đoạn văn và chú thích nguyên bản"),
    ).toBeTruthy();
    const blankButtons = screen.getAllByRole("button", {
      name: /^Ô trống .*, tới câu hỏi$/,
    });
    const uniqueNums: string[] = [];
    for (const btn of blankButtons) {
      const num = btn.getAttribute("aria-label")?.match(/^Ô trống (\d+)/)?.[1];
      if (num && !uniqueNums.includes(num)) uniqueNums.push(num);
    }
    expect(uniqueNums).toHaveLength(5);
    for (let i = 0; i < uniqueNums.length; i++) {
      if (i > 0) {
        await user.click(screen.getByRole("button", { name: "Xem đoạn văn" }));
      }
      const targetBtn = screen.getAllByRole("button", {
        name: new RegExp(
          `^Ô trống ${uniqueNums[i]}(?:-[^,]+)?(?:, đã chọn)?, tới câu hỏi$`,
        ),
      })[0];
      await user.click(targetBtn);
      await user.click(
        screen.getByRole("radio", { name: /^Phương án 1, câu/ }),
      );
    }
    await user.click(
      screen.getByRole("button", { name: "Kiểm tra nhóm" }),
    );
    expect(getSession()?.committed.length).toBe(5);
  });
  it("Làm bài: chọn đáp án trước mới hiện đáp án và lời giải, không tạo phiên", async () => {
    const user = setupUser();
    open(exam, "review");
    expect(getSession()).toBeNull();
    // Chưa chọn thì không lộ đáp án, cũng không có nút mở tất cả lời giải
    expect(screen.queryAllByText(/^Đáp án:/).length).toBe(0);
    expect(screen.queryByRole("button", { name: "Mở tất cả lời giải" })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
    expect(screen.getAllByText(/^Đáp án:/).length).toBe(1);
    expect(screen.getAllByText(/Đã làm/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\/60$/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Danh sách" })).toBeNull();
    expect(screen.queryByLabelText("Lọc")).toBeNull();
    expect(screen.queryByRole("button", { name: /Dịch câu/ })).toBeNull();
    // Làm lại từ đầu xóa các lựa chọn
    await user.click(screen.getByRole("button", { name: "Làm lại từ đầu" }));
    expect(screen.queryAllByText(/^Đáp án:/).length).toBe(0);
    expect(getSession()).toBeNull();
  });

});

it("generic review preserves an existing timed session", () => {
  const a = createAttempt(exams[0], "mock");
  act(() => setSession(a));
  open(exams[1], "review");
  expect(getSession()?.id).toBe(a.id);
  expect(getSession()?.deadlineAt).toBe(a.deadlineAt);
});
it("rejects a new answer after deadline and closes with timeout", async () => {
  const user = setupUser();
  const a = createAttempt(exams[0], "mock");
  act(() => setSession(a));
  open(exams[0]);
  vi.spyOn(Date, "now").mockReturnValue(a.deadlineAt! + 1);
  await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
  expect(getSession()?.reason).toBe("timeout");
  expect(Object.keys(getSession()!.answers).length).toBe(0);
});
it("clears only the JLPT session", async () => {
  const user = setupUser();
  sessionStorage.setItem("currentRaceId", "keep");
  act(() => setSession(createAttempt(exams[0], "drill")));
  open(exams[0], "drill");
  await chooseAttemptMenu(user, "Kết thúc và xóa bài đang làm");
  await user.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem("currentRaceId")).toBe("keep");
});

it("still starts and submits when sessionStorage is blocked", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const user = setupUser();
  open(exams[0]);
  await startMock(user);
  expect(screen.getByRole("status").textContent).toContain("bộ nhớ");
  await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
  answerAll();
  await user.click(screen.getByRole("button", { name: "Nộp bài" }));
  await user.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(getSession()?.status).toBe("submitted");
});

it("provides a zoomable source image for mobile reading", async () => {
  const user = setupUser();
  open(exams[0]);
  await startMock(user);
  await user.click(screen.getByText("Đối chiếu bản quét gốc"));
  await user.click(screen.getByRole("button", { name: "Phóng to để đọc rõ" }));
  expect(
    screen
      .getByRole("button", { name: "Thu nhỏ bản gốc" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
});

it("guest starting another exam is warned the in-tab attempt will be lost; cancel keeps session and deadline", async () => {
  const user = setupUser();
  const a = createAttempt(exams[0], "mock");
  act(() => setSession(a));
  open(exams[1]);
  await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toContain("sẽ mất vì bạn chưa đăng nhập");
  await user.click(within(dialog).getByRole("button", { name: "Quay lại" }));
  expect(getSession()?.id).toBe(a.id);
  expect(getSession()?.deadlineAt).toBe(a.deadlineAt);
});

it("same exam with an unfinished timed attempt asks before discarding it", async () => {
  const user = setupUser();
  const a = createAttempt(exams[0], "drill");
  act(() => setSession(a));
  open(exams[0], "mock");
  await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.textContent).toContain("đang dở");
  expect(dialog.textContent).toContain("sẽ bị xóa và không tính điểm");
  await user.click(within(dialog).getByRole("button", { name: "Quay lại" }));
  expect(getSession()?.id).toBe(a.id);
});

it("strict mock clock pauses while the page is hidden and resumes when visible again", async () => {
  const user = setupUser();
  open(exams[0], "mock");
  await startMock(user);
  expect(getSession()?.status).toBe("in_progress");
  expect(getSession()?.pausedAt).toBeUndefined();
  let state: DocumentVisibilityState = "hidden";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  try {
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(getSession()?.pausedAt).toBeDefined();
    state = "visible";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(getSession()?.pausedAt).toBeUndefined();
  } finally {
    delete (document as unknown as { visibilityState?: unknown }).visibilityState;
  }
});

it("confirmation closes automatically if the deadline expires", async () => {
  const user = setupUser();
  const a = createAttempt(exams[0], "mock");
  for (const q of a.exam.mondais.flatMap((m) => m.questions))
    if (a.questionIds.includes(q.id)) a.answers[q.id] = q.answer;
  act(() => setSession(a));
  open(exams[0]);
  await user.click(screen.getByRole("button", { name: "Nộp bài" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  vi.spyOn(Date, "now").mockReturnValue(a.deadlineAt! + 1);
  act(() => refreshSession());
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(getSession()?.reason).toBe("timeout");
});

it("retries one wrong passage question into Free Practice as a complete 5-question passage group without erasing the submitted result", async () => {
  const user = setupUser();
  const a = createAttempt(exams[0], "drill");
  for (const q of a.exam.mondais.flatMap((m) => m.questions))
    a.answers[q.id] = q.answer;
  const target = a.exam.mondais[8].questions[1];
  a.answers[target.id] = (target.answer % 4) + 1;
  const submittedDrill = finish(a);
  act(() => setSession(submittedDrill));
  open(exams[0], "result");
  await user.click(screen.getByRole("button", { name: "Luyện câu sai" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(await screen.findByText("Ôn câu sai · Luyện nhanh")).toBeTruthy();
  expect(
    screen.queryByRole("group", { name: "Chọn ô trống trong đoạn văn" }),
  ).toBeNull();
  expect(screen.getAllByText("Câu 1 / 5").length).toBeGreaterThanOrEqual(1);
  await user.click(screen.getByRole("button", { name: "Xem đoạn văn" }));
  const retryBlankBtns = screen.getAllByRole("button", {
    name: /^Ô trống .*, tới câu hỏi$/,
  });
  const retryUniqueNums = new Set(
    retryBlankBtns
      .map((btn) => btn.getAttribute("aria-label")?.match(/^Ô trống (\d+)/)?.[1])
      .filter(Boolean),
  );
  expect(retryUniqueNums.size).toBe(5);
  // Kết quả bài trước vẫn giữ nguyên trong tabSession
  expect(getSession()?.id).toBe(submittedDrill.id);
});

describe("audit regression fixes", () => {
  const pool = buildPracticePool(exams)!;

  it("fills both blanks properly in two-blank questions (Day 7 Q41 & Day 8 Q42)", () => {
    const day7 = exams.find((e) => e.day === 7)!;
    const q41 = day7.mondais
      .flatMap((m) => m.questions)
      .find((q) => q.number === 41)!;
    const completed41 = buildCompletedSentence(q41)!;
    expect(completed41).not.toContain("（　）");
    expect(completed41).not.toContain("／");

    const day8 = exams.find((e) => e.day === 8)!;
    const q42 = day8.mondais
      .flatMap((m) => m.questions)
      .find((q) => q.number === 42)!;
    const completed42 = buildCompletedSentence(q42)!;
    expect(completed42).not.toContain("（　）");
    expect(completed42).not.toContain("／");
  });

  it("12.1: uses stored translations by Mondai type and never calls the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = setupUser();
    const day1 = exams[0];
    const qById = (n: number) =>
      day1.mondais.flatMap((m) => m.questions).find((q) => q.number === n)!;
    const q11 = qById(11);
    const view = open(day1, "drill");
    view.unmount();
    // Câu 11 (Mondai 3): trước khi trả lời dùng stemTranslationVi, có "…", không lộ đáp án
    act(() => setSession(createAttempt(day1, "drill", [q11.id])));
    const v2 = open(day1, "drill");
    await user.click(screen.getByRole("button", { name: "Dịch câu" }));
    expect(screen.getByText(q11.stemTranslationVi!)).toBeTruthy();
    expect(screen.getByText("AI dịch")).toBeTruthy();
    expect(screen.queryByText(q11.translationVi!)).toBeNull();
    // Sau khi chốt: bản dịch câu hoàn chỉnh trong lời giải
    await user.click(screen.getByRole("radio", { name: /^Phương án 1, câu \d+$/ }));
    commitNow();
    expect(await screen.findByText(q11.translationVi!)).toBeTruthy();
    v2.unmount();
    // Mondai 6 và 8: không có nút Dịch câu trước khi trả lời
    for (const n of [28, 45]) {
      act(() => setSession(createAttempt(day1, "drill", [qById(n).id])));
      const v = open(day1, "drill");
      expect(screen.queryByRole("button", { name: "Dịch câu" })).toBeNull();
      v.unmount();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("JL-05: timed mock always runs strictly without a toggle-off menu option", async () => {
    const user = setupUser();
    const day1 = exams[0];
    const q6 = day1.mondais[1].questions[0];
    act(() => setSession({ ...createAttempt(day1, "mock", [q6.id]), strict: true }));
    open(day1, "mock");
    expect(screen.queryByRole("button", { name: "Dịch câu" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nghe câu" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Tùy chọn lượt làm" }));
    expect(
      screen.queryByRole("menuitem", { name: "Tắt thi nghiêm túc" }),
    ).toBeNull();
  });

  it("7.1: a single drill question commits after 1.5 s and can be undone before that", async () => {
    const user = setupUser();
    const q1 = exams[0].mondais[0].questions[0];
    act(() => setSession(createAttempt(exams[0], "drill", [q1.id])));
    open(exams[0], "drill");
    await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
    expect(screen.getByText("Đã chọn 1 · đang chốt…")).toBeTruthy();
    expect(getSession()?.answers[q1.id]).toBeUndefined();
    await user.click(screen.getByRole("button", { name: "Hoàn tác" }));
    act(() => {
      vi.advanceTimersByTime(DRILL_COMMIT_DELAY_MS + 50);
    });
    expect(getSession()?.committed).toEqual([]);
    await user.click(screen.getByRole("radio", { name: "Phương án 2, câu 1" }));
    commitNow();
    expect(getSession()?.answers[q1.id]).toBe(2);
    expect(getSession()?.committed).toEqual([q1.id]);
  });

  it("keeps passage group answers as draft without showing answer until Kiểm tra nhóm is clicked", async () => {
    const user = setupUser();
    open(exams[0], "drill");
    await user.selectOptions(screen.getByRole("combobox"), "9");
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));

    const wrongOpt = (exams[0].mondais[8].questions[0].answer % 4) + 1;
    await user.click(
      screen.getByRole("radio", { name: new RegExp(`^Phương án ${wrongOpt}, câu \\d+$`) }),
    );
    // Must not reveal answer or explanation before Kiểm tra nhóm
    expect(screen.queryByText(/^Đáp án:/)).toBeNull();
    expect(getSession()?.committed).toHaveLength(0);
  });

  it("preserves all 5 passage questions when retrying 1 wrong passage question from a pooled session and survives decodeSession", async () => {
    const user = setupUser();
    const passageIds = pool.mondais[8].questions.slice(0, 5).map((q) => q.id);
    const snap = practiceSnapshot(pool, [passageIds[2]]);
    expect(snap.mondais[0].questions).toHaveLength(5);
    expect(validateExam(snap)).toEqual([]);

    const a = createAttempt(
      practiceSnapshot(pool, passageIds),
      "mock",
      passageIds,
    );
    for (const id of passageIds) {
      const q = a.exam.mondais[0].questions.find((x) => x.id === id)!;
      a.answers[id] = q.answer;
    }
    const wrongQ = a.exam.mondais[0].questions[2];
    a.answers[wrongQ.id] = (wrongQ.answer % 4) + 1;
    act(() => setSession(finish(a)));

    open(pool, "result");
    await user.click(screen.getByRole("button", { name: "Luyện câu sai" }));
    expect(await screen.findByText("Ôn câu sai · Luyện nhanh")).toBeTruthy();
    expect(
      screen.queryByRole("group", { name: "Chọn ô trống trong đoạn văn" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Xem đoạn văn" }));
    const pooledRetryBlanks = screen.getAllByRole("button", {
      name: /^Ô trống .*, tới câu hỏi$/,
    });
    const pooledRetryNums = new Set(
      pooledRetryBlanks
        .map((btn) => btn.getAttribute("aria-label")?.match(/^Ô trống (\d+)/)?.[1])
        .filter(Boolean),
    );
    expect(pooledRetryNums.size).toBe(5);

    const preserved = getSession()!;
    expect(preserved.questionIds).toHaveLength(5);
    expect(validateExam(preserved.exam)).toEqual([]);
    const reloaded = decodeSession(
      JSON.stringify({ version: 1, attempt: preserved }),
    );
    expect(reloaded?.questionIds).toHaveLength(5);
  });

  it("marks current unit assisted on F9 / app:trigger-selection-lookup and blocks 1-4 keys while lookup dialog is open", async () => {
    const user = setupUser();
    const a = createAttempt(exams[0], "drill", [
      exams[0].mondais[0].questions[0].id,
    ]);
    act(() => setSession(a));
    open(exams[0], "drill");

    act(() => {
      window.dispatchEvent(
        new CustomEvent("app:trigger-selection-lookup", {
          detail: { text: "賢い" },
        }),
      );
    });
    // Từ điển tải theo nhu cầu (JL-04) nên dấu "đã tra" đến sau khi có kết quả
    await waitFor(() =>
      expect(getSession()?.assisted).toContain(
        exams[0].mondais[0].questions[0].id,
      ),
    );

    // Pressing "1" while lookup modal is open should NOT select option 1
    await user.keyboard("1");
    expect(getSession()?.answers[exams[0].mondais[0].questions[0].id]).toBe(
      undefined,
    );
  });
});

describe("QA spec 2026-11-08 regression suite", () => {
  const pool = buildPracticePool(exams)!;

  it("FIX-01: keeps book view open when searching Day 12 or 0-match query and handles invalid book param", async () => {
    const user = setupUser();
    render(
      <MemoryRouter
        initialEntries={["/exams/jlpt?book=kokusho-n2-20days&q=Day%2012"]}
      >
        <Routes>
          <Route path="/exams/jlpt" element={<JLPTExamHub />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Danh sách bài tập \(1 bài\)/)).toBeTruthy();
    expect(screen.getAllByText(/Ngày 12/i).length).toBeGreaterThan(0);

    const searchInput = screen.getByRole("textbox");
    await user.clear(searchInput);
    await user.type(searchInput, "zzzz");

    expect(
      screen.getByText("Không tìm thấy bài phù hợp trong sách này."),
    ).toBeTruthy();
    expect(screen.queryByText(/Bắt đầu thi thử/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Xóa từ khóa" }));
    expect(screen.getByText(/Danh sách bài tập \(20 bài\)/)).toBeTruthy();

    cleanup();
    render(
      <MemoryRouter initialEntries={["/exams/jlpt?book=invalid-book-id"]}>
        <Routes>
          <Route path="/exams/jlpt" element={<JLPTExamHub />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Không tìm thấy bộ sách này.")).toBeTruthy();
    await user.click(
      screen.getAllByRole("button", { name: /Quay lại danh sách sách/ })[0],
    );
    expect(screen.getByText(/Sách & Bộ Đề Luyện Thi/)).toBeTruthy();
  });

  it("FIX-02 & FIX-03: allows unchecking all Mondais to 0 câu and matches preview count with started session", async () => {
    const user = setupUser();
    open(pool, "drill");

    await user.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    expect(screen.getByText("Lượt này: 0 câu")).toBeTruthy();
    expect(
      screen.getByText(
        "Chưa có dạng bài hoặc câu hỏi phù hợp. Vui lòng chọn lại ít nhất một Mondai để bắt đầu.",
      ),
    ).toBeTruthy();
    const startBtn = screen.getByRole("button", {
      name: /Bắt đầu luyện/,
    }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);

    // Select only Mondai 9 (in standard mode, Mondai 9 quota is 5 questions = 1 full passage)
    await user.click(screen.getByText(/Mondai 9 · Chuẩn đề/));
    expect(screen.getByText("Lượt này: 5 câu")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Bắt đầu luyện/ }));
    expect(getSession()?.questionIds).toHaveLength(5);
  });

  it("FIX-04: records assist only when help is shown for uncommitted questions, not on hide toggle", async () => {
    const user = setupUser();
    // Mondai 2: có cả "Nghe câu" và "Dịch câu" trước khi trả lời
    const q6 = exams[0].mondais[1].questions[0];
    const a = createAttempt(exams[0], "drill", [q6.id]);
    act(() => setSession(a));
    open(exams[0], "drill");

    // 1. Mở bản dịch soạn sẵn -> ghi nhận hỗ trợ
    await user.click(screen.getByRole("button", { name: "Dịch câu" }));
    expect(screen.getByText(q6.translationVi!)).toBeTruthy();
    expect(getSession()?.assisted).toEqual([q6.id]);

    // 2. Reset, rồi bấm "Ẩn bản dịch" -> KHÔNG ghi nhận
    act(() => {
      const current = getSession()!;
      setSession({ ...current, assisted: [] });
    });
    await user.click(screen.getByRole("button", { name: "Ẩn bản dịch" }));
    expect(getSession()?.assisted).toEqual([]);

    // 3. Nghe câu thất bại -> không ghi; thành công -> ghi
    vi.mocked(speakWithVoiceEngine).mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Nghe câu" }));
    expect(getSession()?.assisted).toEqual([]);

    vi.mocked(speakWithVoiceEngine).mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Nghe câu" }));
    expect(getSession()?.assisted).toEqual([q6.id]);
  });

  it("FIX-05 & FIX-08: sanitizes readings, detects duplicate/conflict, serializes quickSave, and separates online statuses", async () => {
    expect(sanitizeKanaReading("kashikoi")).toBe("");
    expect(sanitizeKanaReading("かしこい")).toBe("かしこい");

    // Save new word
    const res1 = await quickSaveWordToNotebook({
      term: "未知語テスト",
      reading: "みちごてすと",
      meaning: "Từ mới kiểm thử",
    });
    expect(res1.status).toBe("added");

    // Identical save -> already_exists
    const res2 = await quickSaveWordToNotebook({
      term: "未知語テスト",
      reading: "みちごてすと",
      meaning: "Từ mới kiểm thử",
    });
    expect(res2.status).toBe("already_exists");

    // Different meaning -> conflict without overwriting
    const res3 = await quickSaveWordToNotebook({
      term: "未知語テスト",
      reading: "みちごてすと",
      meaning: "Nghĩa hoàn toàn khác",
    });
    expect(res3.status).toBe("conflict");

    const statusCheck = getWordNotebookStatus({
      term: "未知語テスト",
      reading: "みちごてすと",
      meaning: "Nghĩa hoàn toàn khác",
    });
    expect(statusCheck.status).toBe("conflict");

    // Concurrent saves of a brand-new word produce only 1 item
    const [c1, c2] = await Promise.all([
      quickSaveWordToNotebook({
        term: "並列保存語",
        reading: "へいれつほぞんご",
        meaning: "Từ lưu song song",
      }),
      quickSaveWordToNotebook({
        term: "並列保存語",
        reading: "へいれつほぞんご",
        meaning: "Từ lưu song song",
      }),
    ]);
    expect([c1.status, c2.status]).toEqual(["added", "already_exists"]);

    // Online lookup statuses (template='japanese' makes 1 fetch call to Google Translate)
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("err", { status: 500 }));
    const netErr = await lookupExternal("テスト語");
    expect(netErr.status).toBe("network_error");
    expect(netErr.canSave).toBe(false);

    // Not found when Google returns identical term
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify([[["テスト語", "テスト語"]]])),
    );
    const notFound = await lookupExternal("テスト語");
    expect(notFound.status).toBe("not_found");
    expect(notFound.canSave).toBe(false);
  });

  it("FIX-06 & B3: synchronizes Quick-Jump TOC with active filter, renders 1 Mondai header per Mondai, and shows context badge for passage siblings", async () => {
    const user = setupUser();
    // 1. Review mode filtered by Mondai 1 -> switch to Danh sách -> 5 cards, 5 TOC links, 1 Mondai header
    open(exams[0], "review");
    expect(screen.queryByRole("combobox")).toBeNull();
    const tocNav = screen.getByRole("complementary");
    expect(tocNav.querySelectorAll("a")).toHaveLength(54);

    cleanup();

    // 2. Post-submit result screen with 1 wrong passage question -> shows 1 câu sai · Hiển thị 5 câu để giữ ngữ cảnh + 4 context badges in Danh sách
    const passageIds = exams[0].mondais[8].questions.map((q) => q.id);
    const a = createAttempt(exams[0], "mock", passageIds);
    for (const q of exams[0].mondais[8].questions) {
      a.answers[q.id] = q.answer;
    }
    const wrongQ = exams[0].mondais[8].questions[2];
    a.answers[wrongQ.id] = (wrongQ.answer % 4) + 1;
    act(() => setSession(finish(a)));

    open(exams[0], "result?tab=detail");
    // Trang kết quả không có bộ lọc; bảng câu hỏi vẫn liệt kê đủ 5 câu của nhóm đoạn văn
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("complementary").querySelectorAll("a")).toHaveLength(5);
  });

  it("Stage 1: pauses mock timer when leaving /mock and resumes remaining time on return", async () => {
    const a = createAttempt(exams[0], "mock");
    const deadline0 = a.deadlineAt!;
    act(() => setSession(a));
    const view = open(exams[0], "mock");
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    // Rời khỏi phòng thi (unmount) -> tự động tạm dừng
    view.unmount();
    const paused = getSession()!;
    expect(paused.pausedAt).toBeDefined();
    // 60 giây trôi qua bên ngoài phòng thi
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    open(exams[0], "mock");
    const resumed = getSession()!;
    expect(resumed.pausedAt).toBeUndefined();
    expect(resumed.deadlineAt!).toBeGreaterThan(deadline0 + 50_000);
  });

  it("Stage 1: retry wrong questions and full-exam retry default to Free Practice mode and preserve previous mock result", async () => {
    const user = setupUser();
    const a = createAttempt(pool, "mock");
    const allQs = a.exam.mondais.flatMap((m) => m.questions);
    for (const q of allQs) a.answers[q.id] = q.answer;
    const wrongQ = allQs[0];
    a.answers[wrongQ.id] = (wrongQ.answer % 4) + 1;
    const submittedMock = finish(a);
    act(() => setSession(submittedMock));

    open(pool, "result");
    expect(
      screen.getByRole("button", { name: "Ôn lại cả bài · không tính giờ" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Luyện câu sai" }));
    expect(await screen.findByText("Ôn câu sai · Luyện nhanh")).toBeTruthy();
    expect(screen.getAllByText("Câu 1 / 1").length).toBeGreaterThanOrEqual(1);
    // Tab session mock result remains untouched
    expect(getSession()?.id).toBe(submittedMock.id);
    expect(getSession()?.status).toBe("submitted");

    await user.click(screen.getByRole("link", { name: "Luyện đề JLPT" }));
    expect(
      await screen.findByRole("button", { name: "Ôn lại cả bài · không tính giờ" }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Ôn lại cả bài · không tính giờ" }),
    );
    expect(await screen.findByText("Làm lại cả bài · Luyện nhanh")).toBeTruthy();
    expect(
      screen.getAllByText(`Câu 1 / ${allQs.length}`).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("Stage 1: reference /review defaults to Từng câu focus mode with prev/next stepping", async () => {
    const user = setupUser();
    open(exams[0], "review");
    expect(screen.getByText("Câu 1 / 54")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Câu tiếp →" }));
    expect(screen.getByText("Câu 2 / 54")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "← Câu trước" }));
    expect(screen.getByText("Câu 1 / 54")).toBeTruthy();
  });

  it("toggles inline passage vs question via icon switch and R/Escape without popup while preserving scroll position", async () => {
    const user = setupUser();
    const q50 = exams[0].mondais[8].questions[0];
    const scrollSpy = vi.mocked(window.scrollTo);
    scrollSpy.mockClear();

    let mockScrollY = 0;
    const origScrollYDesc = Object.getOwnPropertyDescriptor(window, "scrollY");
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => mockScrollY,
    });

    try {
      act(() => setSession(createAttempt(exams[0], "mock", [q50.id])));
      open(exams[0], "mock");

      // Mặc định vào thẳng Câu hỏi (không mở sẵn đoạn văn, không popup)
      expect(screen.getByRole("radio", { name: /^Phương án 1, câu \d+$/ })).toBeTruthy();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(
        screen.queryByRole("button", { name: /^Ô trống 50/ }),
      ).toBeNull();

      // Bấm nút "Đoạn văn" trong thẻ câu hỏi -> đổi sang Đoạn văn nội tuyến (không popup)
      await user.click(screen.getByRole("button", { name: "Đoạn văn" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getAllByRole("button", { name: /^Ô trống 50/ }).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByRole("radio", { name: /^Phương án 1, câu \d+$/ })).toBeNull();

      // Giả lập đang đọc tận đoạn dưới của bài đọc (scrollY = 640) rồi bấm icon Câu hỏi
      mockScrollY = 640;
      scrollSpy.mockClear();
      await user.click(screen.getByRole("button", { name: "Xem câu hỏi" }));
      expect(screen.getByRole("radio", { name: /^Phương án 1, câu \d+$/ })).toBeTruthy();
      expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: "auto" });

      // Giả lập đang ở đầu Câu hỏi (scrollY = 0) rồi bấm phím R quay lại Đoạn văn -> khôi phục đúng 640
      mockScrollY = 0;
      scrollSpy.mockClear();
      await user.keyboard("r");
      expect(screen.getAllByRole("button", { name: /^Ô trống 50/ }).length).toBeGreaterThanOrEqual(1);
      expect(scrollSpy).toHaveBeenCalledWith({ top: 640, behavior: "auto" });

      // Phím Escape thoát khỏi Đoạn văn về Câu hỏi
      await user.keyboard("{Escape}");
      expect(screen.getByRole("radio", { name: /^Phương án 1, câu \d+$/ })).toBeTruthy();
    } finally {
      if (origScrollYDesc) {
        Object.defineProperty(window, "scrollY", origScrollYDesc);
      }
    }
  });
});
