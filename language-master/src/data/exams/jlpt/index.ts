// src/data/exams/jlpt/index.ts
// Tự động phát hiện và nạp toàn bộ các đề thi JLPT từ các file JSON trong thư mục

import { validateExam } from "../../../lib/jlpt/examCore";
import { buildPracticePool, poolId } from "../../../lib/jlpt/practicePool";
import type { JLPTExam, JLPTLevel } from "./types";

// Tự động quét tất cả các file JSON trong thư mục src/data/exams/jlpt/
const examModules = import.meta.glob<JLPTExam>("./**/*.json", {
  eager: true,
  import: "default",
});

export const allJLPTExams: JLPTExam[] = Object.values(examModules)
  .filter((exam) => {
    if (exam.isSample || exam.status !== "published") return false;
    const errors = validateExam(exam);
    if (errors.length) console.error("Không nạp bài JLPT", exam.id, errors);
    return !errors.length;
  })
  .sort((a, b) => {
    // Sắp xếp theo Level (N5 -> N1) rồi đến Day / Title
    if (a.level !== b.level) {
      return a.level.localeCompare(b.level);
    }
    if (a.day && b.day) {
      return a.day - b.day;
    }
    return a.title.localeCompare(b.title);
  });

export function getExamById(id: string): JLPTExam | undefined {
  if (id.startsWith("pool-")) {
    const first = allJLPTExams.find(
      (e) => poolId(e.bookId || e.id, e.level) === id,
    );
    return first
      ? buildPracticePool(
          allJLPTExams.filter(
            (e) => e.bookId === first.bookId && e.level === first.level,
          ),
        )
      : undefined;
  }
  return allJLPTExams.find((e) => e.id === id);
}

export function getExamsByLevel(level: JLPTLevel | string): JLPTExam[] {
  return allJLPTExams.filter(
    (e) => e.level.toUpperCase() === level.toUpperCase(),
  );
}

/**
 * Gom nhóm đề thi theo từng Đầu Sách / Bộ Đề (Book Groups)
 * Giúp giao diện hiển thị gọn gàng theo từng quyển sách / bộ đề thi
 */
export function getJLPTBooksByLevel(
  level?: JLPTLevel | "ALL",
): import("./types").JLPTBookGroup[] {
  const filtered =
    level && level !== "ALL" ? getExamsByLevel(level) : allJLPTExams;
  const groupMap = new Map<string, import("./types").JLPTBookGroup>();

  for (const exam of filtered) {
    const bookKey =
      exam.bookId || `misc-${exam.level}-${exam.source || "default"}`;
    const bookTitle =
      exam.bookTitle || exam.source || `Bộ đề luyện thi ${exam.level}`;

    if (!groupMap.has(bookKey)) {
      groupMap.set(bookKey, {
        id: bookKey,
        title: bookTitle,
        level: exam.level,
        subtitle: exam.subtitle,
        source: exam.source,
        totalExams: 0,
        totalQuestions: 0,
        exams: [],
      });
    }

    const group = groupMap.get(bookKey)!;
    group.exams.push(exam);
    group.totalExams += 1;
    group.totalQuestions += exam.totalQuestions || 0;
  }

  return Array.from(groupMap.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level.localeCompare(b.level);
    return a.title.localeCompare(b.title);
  });
}

export * from "./types";
