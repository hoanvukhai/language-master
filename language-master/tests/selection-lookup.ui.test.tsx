import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import SelectionLookup from "../src/pages/Exam/components/SelectionLookup";
import ExamQuestionCard from "../src/pages/Exam/components/ExamQuestionCard";
import type { JLPTQuestion } from "../src/data/exams/jlpt/types";
import day from "../src/data/exams/jlpt/n2/kokusho-20days/day20.json";

afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function select(start: Node, end = start) {
  const range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(
    end,
    end.nodeType === Node.TEXT_NODE
      ? end.textContent!.length
      : end.childNodes.length,
  );
  range.getBoundingClientRect = () => ({ top: 100, left: 30 }) as DOMRect;
  window.getSelection()?.removeAllRanges();
  window.getSelection()?.addRange(range);
  act(() => {
    document.dispatchEvent(new Event("selectionchange"));
    vi.advanceTimersByTime(121);
  });
}

it("offers lookup for selected option text without changing the answer", () => {
  vi.useFakeTimers();
  const lookup = vi.fn(),
    answer = vi.fn();
  const { container } = render(
    <>
      <ExamQuestionCard
        question={day.mondais[0].questions[0] as JLPTQuestion}
        mode="drill"
        showFeedback={false}
        onSelectOption={answer}
      />
      <SelectionLookup enabled onLookup={lookup} />
    </>,
  );
  const option = container.querySelectorAll("[data-exam-selectable]")[1];
  select(option.firstChild!);
  fireEvent.click(option);
  expect(answer).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Tra từ đã chọn" }));
  expect(lookup).toHaveBeenCalledWith("ふいて");
  expect(screen.queryByText("Tra từ đã chọn")).toBeNull();
  window.getSelection()?.removeAllRanges();
  fireEvent.click(screen.getByRole("radio", { name: "Phương án 1, câu 1" }));
  expect(answer).toHaveBeenCalledWith(1);
});

it("ignores selection across two question boundaries and non-Japanese text", () => {
  vi.useFakeTimers();
  const { container } = render(
    <>
      <p data-exam-selectable>日本語</p>
      <p data-exam-selectable>選択肢</p>
      <p data-exam-selectable>English</p>
      <SelectionLookup enabled onLookup={vi.fn()} />
    </>,
  );
  const nodes = container.querySelectorAll("p");
  select(nodes[0].firstChild!, nodes[1].firstChild!);
  expect(screen.queryByText("Tra từ đã chọn")).toBeNull();
  select(nodes[2].firstChild!);
  expect(screen.queryByText("Tra từ đã chọn")).toBeNull();
});

it("dismisses selection lookup on Escape and scrolling", () => {
  vi.useFakeTimers();
  const { container } = render(
    <>
      <p data-exam-selectable>日本語</p>
      <SelectionLookup enabled onLookup={vi.fn()} />
    </>,
  );
  select(container.querySelector("p")!.firstChild!);
  expect(screen.getByText("Tra từ đã chọn")).toBeTruthy();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByText("Tra từ đã chọn")).toBeNull();
  select(container.querySelector("p")!.firstChild!);
  fireEvent.scroll(window);
  expect(screen.queryByText("Tra từ đã chọn")).toBeNull();
});

it("does not offer lookup when exam assistance is disabled", () => {
  vi.useFakeTimers();
  const { container } = render(
    <>
      <p data-exam-selectable>日本語</p>
      <SelectionLookup enabled={false} onLookup={vi.fn()} />
    </>,
  );
  select(container.querySelector("p")!.firstChild!);
  expect(screen.queryByText("Tra từ đã chọn")).toBeNull();
});
