import { getJLPTBooksByLevel } from "../../data/exams/jlpt";
import type { JLPTLevel } from "../../data/exams/jlpt/types";
import {
  buildSeedsFromExams,
  FREE_PRACTICE_ALL_MONDAIS,
  FREE_PRACTICE_HANDOFF_KEY,
  type FreePracticeConfig,
  type FreePracticeUnitSeed,
  type FreeScopeBookOption,
} from "./freePracticeEngine";

export * from "./freePracticeEngine";

/** Chuyển danh sách sách/bộ đề theo cấp độ thành tùy chọn dùng cho hộp thoại phạm vi Tự do (gồm từng bài bên trong). */
export function getFreeScopeBookOptions(level: JLPTLevel): FreeScopeBookOption[] {
  return getJLPTBooksByLevel(level).map((b) => {
    const validExams = b.exams.filter((ex) => !ex.isSample && !ex.isPracticePool);
    return {
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      totalDays: b.totalExams ?? validExams.length,
      totalQuestions:
        b.totalQuestions ??
        validExams.reduce(
          (sum, ex) =>
            sum + ex.mondais.reduce((mSum, m) => mSum + m.questions.length, 0),
          0,
        ),
      availableMondais: [
        ...new Set(validExams.flatMap((e) => e.mondais.map((m) => m.number))),
      ].sort((a, b2) => a - b2),
      exams: validExams.map((ex) => ({
        id: ex.id,
        title: ex.title,
        day: ex.day,
        totalQuestions:
          ex.totalQuestions ??
          ex.mondais.reduce((mSum, m) => mSum + m.questions.length, 0),
        availableMondais: [
          ...new Set(ex.mondais.map((m) => m.number)),
        ].sort((a, b2) => a - b2),
      })),
    };
  });
}

export function collectFreePracticeSeeds(scope: {
  level: JLPTLevel;
  bookIds?: string[];
  examIds?: string[];
  mondais?: number[];
}): FreePracticeUnitSeed[] {
  const books = getJLPTBooksByLevel(scope.level);
  let exams;
  if (scope.examIds !== undefined) {
    if (scope.examIds.length === 0) return [];
    const examSet = new Set(scope.examIds);
    exams = books.flatMap((b) => b.exams).filter((ex) => examSet.has(ex.id));
  } else {
    const bookSet =
      scope.bookIds && scope.bookIds.length > 0 ? new Set(scope.bookIds) : null;
    const selectedBooks = bookSet
      ? books.filter((b) => bookSet.has(b.id))
      : books;
    exams = selectedBooks.flatMap((b) => b.exams);
  }
  if (scope.mondais !== undefined && scope.mondais.length === 0) {
    return [];
  }
  const mondaiSet =
    scope.mondais !== undefined
      ? new Set(scope.mondais)
      : new Set(FREE_PRACTICE_ALL_MONDAIS);
  return buildSeedsFromExams(exams, mondaiSet);
}

export function collectFixedPracticeSeeds(params: {
  level?: JLPTLevel;
  questionIds: string[];
}): FreePracticeUnitSeed[] {
  const idSet = new Set(params.questionIds);
  if (idSet.size === 0) return [];
  const allBooks = getJLPTBooksByLevel("ALL");
  const allExams = allBooks.flatMap((b) => b.exams);
  return buildSeedsFromExams(allExams, undefined, idSet);
}

export function saveFreePracticeHandoff(config: FreePracticeConfig): void {
  try {
    sessionStorage.setItem(FREE_PRACTICE_HANDOFF_KEY, JSON.stringify(config));
  } catch {
    // Bỏ qua nếu trình duyệt chặn storage
  }
}

export function readFreePracticeHandoff(): FreePracticeConfig | null {
  try {
    const raw = sessionStorage.getItem(FREE_PRACTICE_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FreePracticeConfig;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.kind === "fixed" && Array.isArray(parsed.questionIds)) {
      return parsed;
    }
    if (parsed.kind === "endless" && parsed.level) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

let knownIdsCache: Set<string> | null = null;
/** Mọi mã câu hiện có trong kho đề (BE-10: bỏ các mã cũ trong lịch sử đã không còn trong kho) */
export function getKnownQuestionIds(): Set<string> {
  if (!knownIdsCache) {
    knownIdsCache = new Set(
      getJLPTBooksByLevel("ALL").flatMap((b) =>
        b.exams.flatMap((e) => e.mondais.flatMap((m) => m.questions.map((q) => q.id))),
      ),
    );
  }
  return knownIdsCache;
}
