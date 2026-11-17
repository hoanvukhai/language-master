import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Minus,
  RotateCcw,
} from "lucide-react";
import type { JLPTLevel } from "../../../data/exams/jlpt/types";
import {
  FREE_PRACTICE_ALL_MONDAIS,
  type FreeScopeBookOption,
  type FreeScopeExamOption,
} from "../../../lib/jlpt/freePractice";
import FreeMondaiSelector from "./FreeMondaiSelector";
import BottomSheet from "../workspace/BottomSheet";

export type { FreeScopeBookOption, FreeScopeExamOption };

type Props = {
  open: boolean;
  level: JLPTLevel;
  books: FreeScopeBookOption[];
  selectedBookIds: string[];
  selectedExamIds?: string[];
  selectedMondais: number[];
  showMondais?: boolean;
  onClose: () => void;
  onSave: (scope: {
    bookIds: string[];
    examIds: string[];
    mondais: number[];
  }) => void;
};

function shortExamLabel(exam: FreeScopeExamOption): string {
  if (exam.day !== undefined) return `Ngày ${exam.day}`;
  return exam.title;
}

export default function FreeScopeModal(props: Props) {
  if (!props.open) return null;
  return <FreeScopeModalDialog {...props} />;
}

function FreeScopeModalDialog({
  level,
  books,
  selectedBookIds,
  selectedExamIds,
  selectedMondais,
  showMondais = false,
  onClose,
  onSave,
}: Props) {
  const allExamIds = books.flatMap((b) => b.exams.map((e) => e.id));
  const [draftExamIds, setDraftExamIds] = useState<string[]>(() => {
    const validSet = new Set(allExamIds);
    if (selectedExamIds && selectedExamIds.length > 0) {
      const valid = selectedExamIds.filter((id) => validSet.has(id));
      if (valid.length > 0) return valid;
    }
    if (selectedBookIds.length > 0 && selectedBookIds.length < books.length) {
      const bookSet = new Set(selectedBookIds);
      const fromBooks = books
        .filter((b) => bookSet.has(b.id))
        .flatMap((b) => b.exams.map((e) => e.id));
      if (fromBooks.length > 0) return fromBooks;
    }
    return [...allExamIds];
  });

  const [draftMondais, setDraftMondais] = useState<number[]>(() =>
    selectedMondais.length > 0
      ? selectedMondais
      : [...FREE_PRACTICE_ALL_MONDAIS],
  );

  // Mặc định đóng danh sách bài con, bấm vào từng sách để mở rộng khi cần lọc lẻ
  const [expandedBooks, setExpandedBooks] = useState<string[]>([]);

  const draftExamSet = new Set(draftExamIds);

  const toggleExam = (examId: string) => {
    setDraftExamIds((prev) =>
      prev.includes(examId)
        ? prev.filter((id) => id !== examId)
        : [...prev, examId],
    );
  };

  const toggleWholeBook = (book: FreeScopeBookOption) => {
    const bookExamSet = new Set(book.exams.map((e) => e.id));
    const bookExamIds = book.exams.map((e) => e.id);
    const allChecked = bookExamIds.every((id) => draftExamSet.has(id));
    setDraftExamIds((prev) => {
      const others = prev.filter((id) => !bookExamSet.has(id));
      return allChecked ? others : [...others, ...bookExamIds];
    });
  };

  const toggleExpandBook = (bookId: string) => {
    setExpandedBooks((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId],
    );
  };

  const toggleAllExams = () => {
    if (draftExamIds.length === allExamIds.length) {
      setDraftExamIds([]);
    } else {
      setDraftExamIds([...allExamIds]);
    }
  };

  const resetToAll = () => {
    setDraftExamIds([...allExamIds]);
    setDraftMondais([...FREE_PRACTICE_ALL_MONDAIS]);
  };

  const selectedBookIdsDerived = books
    .filter((b) => b.exams.some((e) => draftExamSet.has(e.id)))
    .map((b) => b.id);

  const availableMondaisInExams = new Set(
    books
      .flatMap((b) => b.exams)
      .filter((e) => draftExamSet.has(e.id))
      .flatMap((e) => e.availableMondais),
  );

  const selectedQuestionsCount = books
    .flatMap((b) => b.exams)
    .filter((e) => draftExamSet.has(e.id))
    .reduce((sum, e) => sum + e.totalQuestions, 0);

  const canApply =
    draftExamIds.length > 0 && (!showMondais || draftMondais.length > 0);

  const buildPayload = () => ({
    bookIds: selectedBookIdsDerived,
    examIds: draftExamIds,
    mondais: draftMondais,
  });

  const allPicked = draftExamIds.length === allExamIds.length;

  return (
    <BottomSheet
      open
      title={`Phạm vi bài nguồn · ${level}`}
      onClose={onClose}
      centeredOnDesktop
      wide
      fixedHeight
    >
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Dải tóm tắt + chọn nhanh */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-3.5 py-2.5">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-bold text-indigo-700 dark:text-indigo-300 tabular-nums">
              {draftExamIds.length}/{allExamIds.length} bài
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {" "}· {selectedQuestionsCount.toLocaleString()} câu
            </span>
          </p>
          <button
            type="button"
            onClick={toggleAllExams}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer min-h-8"
          >
            {allPicked ? "Bỏ chọn hết" : "Chọn tất cả bài"}
          </button>
        </div>

        {/* Phần cuộn: bộ sách (+ dạng Mondai khi mở từ phòng luyện) */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-2.5">
          <p className="text-xs text-slate-500 dark:text-slate-400 px-0.5">
            {showMondais
              ? "Chọn bộ sách, từng bài đề và dạng Mondai cần trộn."
              : "Tick cả bộ sách hoặc bấm “Chọn bài” để lọc từng ngày."}
          </p>

          {books.map((book) => {
            const pickedCount = book.exams.filter((e) =>
              draftExamSet.has(e.id),
            ).length;
            const allChecked =
              book.exams.length > 0 && pickedCount === book.exams.length;
            const partialChecked =
              pickedCount > 0 && pickedCount < book.exams.length;
            const isExpanded = expandedBooks.includes(book.id);

            return (
              <div
                key={book.id}
                className={`rounded-2xl border overflow-hidden transition-colors ${
                  pickedCount > 0
                    ? "border-indigo-200 dark:border-indigo-900/60"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="px-3 py-2.5 flex items-center gap-2 bg-white dark:bg-slate-900">
                  <label className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer min-h-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => toggleWholeBook(book)}
                      className="sr-only"
                      aria-label={`Chọn toàn bộ ${book.title}`}
                    />
                    <span
                      aria-hidden="true"
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        allChecked || partialChecked
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {allChecked ? (
                        <Check size={13} />
                      ) : partialChecked ? (
                        <Minus size={13} />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">
                        {book.title}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {pickedCount}/{book.exams.length} bài ·{" "}
                        {book.totalQuestions.toLocaleString()} câu
                      </span>
                    </span>
                  </label>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Thu gọn" : "Mở rộng"} danh sách bài của ${book.title}`}
                    onClick={() => toggleExpandBook(book.id)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 min-h-9 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    <span>{isExpanded ? "Thu gọn" : "Chọn bài"}</span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {isExpanded && book.exams.length > 0 && (
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30">
                    {book.exams.map((ex) => {
                      const checked = draftExamSet.has(ex.id);
                      return (
                        <label
                          key={ex.id}
                          title={ex.title}
                          className={`flex items-center gap-2 px-2.5 min-h-11 rounded-xl border text-xs transition-colors cursor-pointer ${
                            checked
                              ? "bg-indigo-50 dark:bg-indigo-950/45 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleExam(ex.id)}
                            className="sr-only"
                            aria-label={ex.title}
                          />
                          <span
                            aria-hidden="true"
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {checked && <Check size={10} />}
                          </span>
                          <span className="min-w-0 leading-tight">
                            <span className="block font-bold truncate">
                              {shortExamLabel(ex)}
                            </span>
                            <span className="block opacity-70">
                              {ex.totalQuestions} câu
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {showMondais && (
            <section className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <FreeMondaiSelector
                selectedMondais={draftMondais}
                availableMondais={
                  draftExamIds.length > 0 ? availableMondaisInExams : undefined
                }
                onChange={setDraftMondais}
              />
            </section>
          )}
        </div>

        {/* Chân cố định: luôn thấy nút Lưu dù danh sách dài */}
        <div className="shrink-0 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {!canApply && (
            <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {showMondais
                ? "Hãy chọn ít nhất 1 bài nguồn và 1 dạng Mondai để tiếp tục."
                : "Hãy chọn ít nhất 1 bài hoặc 1 bộ sách để tiếp tục."}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={resetToAll}
              className="inline-flex items-center gap-1.5 px-2 min-h-10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Mặc định tất cả</span>
            </button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="exam-secondary !py-2 !px-4 !min-h-10 text-sm">
                Hủy
              </button>
              <button
                type="button"
                disabled={!canApply}
                onClick={() => onSave(buildPayload())}
                className="exam-primary !py-2 !px-5 !min-h-10 text-sm"
              >
                Lưu phạm vi
              </button>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
