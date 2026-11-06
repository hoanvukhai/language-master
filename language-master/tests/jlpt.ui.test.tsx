import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { JLPTExam } from "../src/data/exams/jlpt/types";
import ExamWorkspace from "../src/pages/Exam/ExamWorkspace";
import { getSession, setSession } from "../src/lib/jlpt/tabSession";
import { refreshSession } from "../src/lib/jlpt/tabSession";
import { createAttempt, finish } from "../src/lib/jlpt/examCore";
import {
  buildPracticePool,
  pickPracticeQuestions,
  practiceSnapshot,
} from "../src/lib/jlpt/practicePool";
import { units, decodeSession, validateExam } from "../src/lib/jlpt/examCore";
import DrillSession from "../src/pages/Exam/sessions/DrillSession";
import {
  buildCompletedSentence,
  buildUnfilledStemForTranslation,
} from "../src/lib/jlpt/examText";

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
  return {
    getExamById: (id: string) =>
      id.startsWith("pool-")
        ? buildPracticePool(Object.values(modules))
        : Object.values(modules).find((e) => e.id === id),
  };
});
vi.mock("../src/lib/jlpt/sentenceAnalyzer", () => ({
  lookupWordInDictionary: () => null,
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
          path="/exams/jlpt/:examId"
          element={<ExamWorkspace mode="detail" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  sessionStorage.clear();
  setSession(null);
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
      screen.getByRole("heading", { name: "Luyện theo dạng · 20 bài" }),
    ).toBeTruthy();
    expect(getSession()).toBeNull();
  });
  it("keeps a scoped retry from a mock instead of redirecting and discarding it", () => {
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
    const user = userEvent.setup();
    const view = open(pool, "drill");
    await user.selectOptions(screen.getByLabelText("Chọn dạng"), "9");
    await user.selectOptions(screen.getByLabelText("Số câu mỗi lượt"), "10");
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    const saved = getSession()!;
    expect(saved.questionIds).toHaveLength(10);
    expect(saved.exam.totalQuestions).toBe(10);
    expect(saved.exam.mondais[0].passages).toHaveLength(2);
    expect(screen.getAllByText(/Ngày \d+ · Câu/)).toHaveLength(5);
    view.unmount();
    open(pool, "drill");
    expect(getSession()?.questionIds).toEqual(saved.questionIds);
    await user.click(screen.getByRole("button", { name: "Đổi dạng / số câu" }));
    expect(getSession()?.id).toBe(saved.id);
    await user.selectOptions(screen.getByLabelText("Chọn dạng"), "1");
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    await user.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(getSession()?.id).toBe(saved.id);
    await user.click(screen.getByRole("link", { name: "Làm tiếp" }));
    await user.click(
      screen.getByRole("button", { name: "Kết thúc và xóa phiên" }),
    );
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(getSession()).toBeNull();
    expect(screen.getByRole("button", { name: "Bắt đầu luyện" })).toBeTruthy();
  });
  it("shows authored explanations publicly on reference and never during an ongoing mock", async () => {
    const user = userEvent.setup();
    const view = open(exams[1], "review");
    await user.click(
      screen.getAllByRole("button", { name: "Xem đáp án & lời giải" })[0],
    );
    expect(
      screen.getByText(exams[1].mondais[0].questions[0].explanation!.vi!),
    ).toBeTruthy();
    expect(screen.getByText(/Lời giải tham khảo do AI/)).toBeTruthy();
    view.unmount();
    open(exams[1], "mock");
    await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
    expect(screen.queryByText(/Lời giải tham khảo do AI/)).toBeNull();
    expect(
      screen.queryByText(exams[1].mondais[0].questions[0].explanation!.vi!),
    ).toBeNull();
  });
});

describe.each(exams.map((e) => [e.day, e] as const))("Day %s", (_day, exam) => {
  it("starts only on click, submits, and keeps answers read-only", async () => {
    const user = userEvent.setup();
    open(exam);
    expect(getSession()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
    expect(getSession()?.questionIds.length).toBe(54);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(document.querySelectorAll("[data-exam-selectable]")).toHaveLength(5);
    expect(screen.queryByText(/Chọn phương án [1-4]/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
    expect(Object.values(getSession()!.answers)).toEqual([1]);
    await user.click(screen.getByRole("button", { name: "Nộp bài" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(getSession()?.status).toBe("submitted");
    const saved = JSON.stringify(getSession()?.answers);
    await user.click(screen.getByRole("button", { name: "Xem lại bài" }));
    for (const option of screen.getAllByRole("radio"))
      expect((option as HTMLInputElement).disabled).toBe(true);
    expect(JSON.stringify(getSession()?.answers)).toBe(saved);
  });
  it("keeps passage and five final questions in one drill unit", async () => {
    const user = userEvent.setup();
    open(exam, "drill");
    await user.selectOptions(screen.getByRole("combobox"), "9");
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));
    expect(getSession()?.questionIds.length).toBe(5);
    expect(
      screen.getByAltText("Đoạn văn và chú thích nguyên bản"),
    ).toBeTruthy();
    const check = screen.getByRole("button", {
      name: "Kiểm tra nhóm",
    }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    for (const option of screen.getAllByRole("radio", {
      name: /^Phương án 1, câu/,
    }))
      await user.click(option);
    await user.click(check);
    expect(getSession()?.committed.length).toBe(5);
  });
  it("opens and closes reference answers without creating a session", async () => {
    const user = userEvent.setup();
    open(exam, "review");
    expect(getSession()).toBeNull();
    expect(screen.queryAllByText(/^Đáp án:/).length).toBe(0);
    await user.click(
      screen.getByRole("button", { name: "Mở tất cả lời giải" }),
    );
    expect(screen.getAllByText(/^Đáp án:/).length).toBe(54);
    await user.click(
      screen.getAllByRole("button", { name: "Thu gọn lời giải" })[0],
    );
    expect(screen.getAllByText(/^Đáp án:/).length).toBe(53);
    await user.click(screen.getByRole("button", { name: "Thu gọn tất cả" }));
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
  const user = userEvent.setup();
  const a = createAttempt(exams[0], "mock");
  act(() => setSession(a));
  open(exams[0]);
  vi.spyOn(Date, "now").mockReturnValue(a.deadlineAt! + 1);
  await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
  expect(getSession()?.reason).toBe("timeout");
  expect(Object.keys(getSession()!.answers).length).toBe(0);
});
it("clears only the JLPT session", async () => {
  const user = userEvent.setup();
  sessionStorage.setItem("currentRaceId", "keep");
  act(() => setSession(createAttempt(exams[0], "drill")));
  open(exams[0], "drill");
  await user.click(
    screen.getByRole("button", { name: "Kết thúc và xóa phiên" }),
  );
  await user.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(getSession()).toBeNull();
  expect(sessionStorage.getItem("currentRaceId")).toBe("keep");
});

it("still starts and submits when sessionStorage is blocked", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const user = userEvent.setup();
  open(exams[0]);
  await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
  expect(screen.getByRole("status").textContent).toContain("bộ nhớ");
  await user.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
  await user.click(screen.getByRole("button", { name: "Nộp bài" }));
  await user.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(getSession()?.status).toBe("submitted");
});

it("provides a zoomable source image for mobile reading", async () => {
  const user = userEvent.setup();
  open(exams[0]);
  await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
  await user.click(screen.getByText("Đối chiếu bản quét gốc"));
  await user.click(screen.getByRole("button", { name: "Phóng to để đọc rõ" }));
  expect(
    screen
      .getByRole("button", { name: "Thu nhỏ bản gốc" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
});

it("confirmation cancel keeps the current session and deadline", async () => {
  const user = userEvent.setup();
  const a = createAttempt(exams[0], "mock");
  act(() => setSession(a));
  open(exams[1]);
  await user.click(screen.getByRole("button", { name: "Bắt đầu làm bài" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Quay lại" }));
  expect(getSession()?.id).toBe(a.id);
  expect(getSession()?.deadlineAt).toBe(a.deadlineAt);
});

it("confirmation closes automatically if the deadline expires", async () => {
  const user = userEvent.setup();
  const a = createAttempt(exams[0], "mock");
  act(() => setSession(a));
  open(exams[0]);
  await user.click(screen.getByRole("button", { name: "Nộp bài" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  vi.spyOn(Date, "now").mockReturnValue(a.deadlineAt! + 1);
  act(() => refreshSession());
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(getSession()?.reason).toBe("timeout");
});

it("confirmation retries one wrong passage question as a complete group once", async () => {
  const user = userEvent.setup();
  const a = createAttempt(exams[0], "drill");
  for (const q of a.exam.mondais.flatMap((m) => m.questions))
    a.answers[q.id] = q.answer;
  const target = a.exam.mondais[8].questions[1];
  a.answers[target.id] = (target.answer % 4) + 1;
  act(() => setSession(finish(a)));
  open(exams[0], "result");
  await user.click(screen.getByRole("button", { name: "Luyện câu sai" }));
  expect(screen.getAllByRole("dialog").length).toBe(1);
  expect(screen.getByRole("dialog").textContent).toContain("5 câu thực hành");
  await user.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(getSession()?.id).not.toBe(a.id);
  expect(getSession()?.questionIds.length).toBe(5);
  expect(getSession()?.targetQuestionIds).toEqual([target.id]);
  expect(screen.queryByRole("dialog")).toBeNull();
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

  it("never leaks the correct option when translating before answering", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([[["Bản dịch đề", ""]]])));
    const user = userEvent.setup();
    const day1 = exams[0];
    const q11 = day1.mondais
      .flatMap((m) => m.questions)
      .find((q) => q.number === 11)!;
    const correctOption = q11.options[q11.answer - 1];
    expect(buildUnfilledStemForTranslation(q11)).not.toContain(correctOption);

    const a = createAttempt(day1, "mock", [q11.id]);
    act(() => setSession(a));
    open(day1, "mock");
    await user.click(screen.getByRole("button", { name: "Dịch câu" }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestedUrl = String(fetchSpy.mock.calls[0][0]);
    expect(decodeURIComponent(requestedUrl)).not.toContain(correctOption);
  });

  it("keeps passage group answers as draft without showing answer until Kiểm tra nhóm is clicked", async () => {
    const user = userEvent.setup();
    open(exams[0], "drill");
    await user.selectOptions(screen.getByRole("combobox"), "9");
    await user.click(screen.getByRole("button", { name: "Bắt đầu luyện" }));

    const wrongOpt = (exams[0].mondais[8].questions[0].answer % 4) + 1;
    await user.click(
      screen.getByRole("radio", { name: `Phương án ${wrongOpt}, câu 50` }),
    );
    // Must not reveal answer or explanation before Kiểm tra nhóm
    expect(screen.queryByText(/^Đáp án:/)).toBeNull();
    expect(getSession()?.committed).toHaveLength(0);
  });

  it("preserves all 5 passage questions when retrying 1 wrong passage question from a pooled session and survives decodeSession", async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));

    const retried = getSession()!;
    expect(retried.questionIds).toHaveLength(5);
    expect(retried.targetQuestionIds).toEqual([wrongQ.id]);
    expect(validateExam(retried.exam)).toEqual([]);
    const reloaded = decodeSession(
      JSON.stringify({ version: 1, attempt: retried }),
    );
    expect(reloaded?.questionIds).toHaveLength(5);
  });

  it("marks current unit assisted on F9 / app:trigger-selection-lookup and blocks 1-4 keys while lookup dialog is open", async () => {
    const user = userEvent.setup();
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
    expect(getSession()?.assisted).toContain(
      exams[0].mondais[0].questions[0].id,
    );

    // Pressing "1" while lookup modal is open should NOT select option 1
    await user.keyboard("1");
    expect(getSession()?.answers[exams[0].mondais[0].questions[0].id]).toBe(
      undefined,
    );
  });
});
