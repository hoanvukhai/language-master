import type { JLPTExam, JLPTMondai } from "../../data/exams/jlpt/types";
import type { Attempt } from "./examCore";

export const poolId = (bookId: string, level: string) =>
  `pool-${level}-${bookId}`;

/** Standard JLPT Language Knowledge (Chữ Hán - Từ vựng - Ngữ pháp) quota per Mondai (Total = 54 questions) */
export const STANDARD_MONDAI_QUOTAS: Record<number, number> = {
  1: 5,
  2: 5,
  3: 5,
  4: 7,
  5: 5,
  6: 5,
  7: 12,
  8: 5,
  9: 5,
};

export type AllocationMode = "standard" | "total" | "per_mondai";

/** Merge source questions without losing their original page, number or passage. */
export function buildPracticePool(exams: JLPTExam[]): JLPTExam | undefined {
  if (!exams.length) return undefined;
  const first = exams[0];
  const mondais: JLPTMondai[] = [];
  for (const exam of exams) {
    if (exam.level !== first.level || exam.bookId !== first.bookId)
      throw new Error("Chỉ gộp bài cùng cấp độ và cùng sách.");
    for (const source of exam.mondais) {
      let target = mondais.find((m) => m.type === source.type);
      if (!target) {
        target = {
          ...source,
          questions: [],
          passages: [],
          numberRange: undefined,
        };
        mondais.push(target);
      }
      target.passages!.push(
        ...(source.passages || []).map((p) => ({
          ...p,
          id: `${exam.id}:${p.id}`,
        })),
      );
      target.questions.push(
        ...source.questions.map((q) => ({
          ...q,
          passageId: q.passageId ? `${exam.id}:${q.passageId}` : undefined,
          origin: {
            examId: exam.id,
            title: exam.title,
            day: exam.day,
            number: q.number,
          },
        })),
      );
    }
  }
  return {
    ...first,
    id: poolId(first.bookId || first.id, first.level),
    day: undefined,
    title: `Luyện theo dạng · ${exams.length} bài`,
    subtitle: "Ngân hàng câu hỏi trộn từ toàn bộ sách",
    isPracticePool: true,
    mondais,
    totalQuestions: mondais.reduce((n, m) => n + m.questions.length, 0),
    timeLimitMinutes: 50,
  };
}

/** Helper to group questions in a Mondai so shared passages stay intact */
function groupMondaiUnits(
  m: JLPTMondai,
  dayFilter?: number | "all",
): { key: string; ids: string[] }[] {
  const result: { key: string; ids: string[] }[] = [];
  for (const q of m.questions) {
    if (
      dayFilter &&
      dayFilter !== "all" &&
      q.origin?.day !== undefined &&
      q.origin.day !== dayFilter
    ) {
      continue;
    }
    const key = q.passageId || q.id;
    const previous = result.find((g) => g.key === key);
    if (previous) previous.ids.push(q.id);
    else result.push({ key, ids: [q.id] });
  }
  return result;
}

function shuffleGroups<T>(arr: T[], random = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Fisher–Yates shuffles units; a shared passage always stays intact. */
export function pickPracticeQuestions(
  exam: JLPTExam,
  mondai: string,
  count: number,
  random = Math.random,
): string[] {
  const groups = exam.mondais
    .filter((m) => mondai === "all" || String(m.number) === mondai)
    .flatMap((m) => groupMondaiUnits(m));
  const shuffled = shuffleGroups(groups, random);
  const ids: string[] = [];
  for (const group of shuffled) {
    if (ids.length >= count) break;
    ids.push(...group.ids);
  }
  return ids;
}

/**
 * Advanced question picker supporting:
 * 1. "standard": Standard JLPT exam quota per selected Mondai (5-5-5-7-5-5-12-5-5 = 54 questions for all 9 Mondais)
 * 2. "total": Total round size divided evenly across selected Mondais (or classic pool shuffle)
 * 3. "per_mondai": Fixed number of questions per selected Mondai
 */
export function pickAdvancedPracticeQuestions(
  exam: JLPTExam,
  options: {
    mondais: number[];
    allocationMode: AllocationMode;
    totalCount: number;
    perMondaiCount: number;
    dayFilter?: number | "all";
  },
  random = Math.random,
): string[] {
  const activeMondais = exam.mondais.filter((m) =>
    options.mondais.includes(m.number),
  );
  if (!activeMondais.length) return [];

  if (options.allocationMode === "standard") {
    const ids: string[] = [];
    for (const m of activeMondais) {
      const quota = STANDARD_MONDAI_QUOTAS[m.number] ?? 5;
      const groups = shuffleGroups(
        groupMondaiUnits(m, options.dayFilter),
        random,
      );
      let pickedForMondai = 0;
      for (const g of groups) {
        if (pickedForMondai >= quota) break;
        ids.push(...g.ids);
        pickedForMondai += g.ids.length;
      }
    }
    return ids;
  }

  if (options.allocationMode === "per_mondai") {
    const ids: string[] = [];
    for (const m of activeMondais) {
      const quota = options.perMondaiCount;
      const groups = shuffleGroups(
        groupMondaiUnits(m, options.dayFilter),
        random,
      );
      let pickedForMondai = 0;
      for (const g of groups) {
        if (pickedForMondai >= quota) break;
        ids.push(...g.ids);
        pickedForMondai += g.ids.length;
      }
    }
    return ids;
  }

  // "total" mode: if single mondai or all mondais with no dayFilter, keep exact compatibility with pickPracticeQuestions
  if (
    (!options.dayFilter || options.dayFilter === "all") &&
    (activeMondais.length === 1 ||
      activeMondais.length === exam.mondais.length)
  ) {
    const mondaiArg =
      activeMondais.length === 1 ? String(activeMondais[0].number) : "all";
    return pickPracticeQuestions(exam, mondaiArg, options.totalCount, random);
  }

  // Multi-select subset in "total" mode: distribute across selected Mondais
  const allGroups = activeMondais.flatMap((m) =>
    groupMondaiUnits(m, options.dayFilter),
  );
  const shuffled = shuffleGroups(allGroups, random);
  const ids: string[] = [];
  for (const g of shuffled) {
    if (ids.length >= options.totalCount) break;
    ids.push(...g.ids);
  }
  return ids;
}

/** Store only this round in the tab, rather than duplicating the whole bank.
 *  Always keeps sibling questions sharing the same passage so passage blanks remain valid.
 */
export function practiceSnapshot(exam: JLPTExam, ids: string[]): JLPTExam {
  const selected = new Set(ids);
  const sharedPassageIds = new Set<string>();
  for (const m of exam.mondais) {
    for (const q of m.questions) {
      if (selected.has(q.id) && q.passageId) {
        sharedPassageIds.add(q.passageId);
      }
    }
  }
  const mondais = exam.mondais
    .map((m) => {
      const questions = m.questions.filter(
        (q) =>
          selected.has(q.id) ||
          (!!q.passageId && sharedPassageIds.has(q.passageId)),
      );
      const passages = m.passages?.filter((p) =>
        questions.some((q) => q.passageId === p.id),
      );
      return { ...m, questions, passages };
    })
    .filter((m) => m.questions.length);
  const totalQuestions = mondais.reduce(
    (sum, m) => sum + m.questions.length,
    0,
  );
  return { ...exam, mondais, totalQuestions };
}

/** Check whether an Attempt matches the full 54-question standard JLPT structure (5-5-5-7-5-5-12-5-5) */
export function isStandardExamStructure(attempt: Attempt): boolean {
  if (attempt.questionIds.length !== 54) return false;
  const selected = new Set(attempt.questionIds);
  for (let mNum = 1; mNum <= 9; mNum++) {
    const m = attempt.exam.mondais.find((x) => x.number === mNum);
    if (!m) return false;
    const count = m.questions.filter((q) => selected.has(q.id)).length;
    if (count !== STANDARD_MONDAI_QUOTAS[mNum]) return false;
  }
  return true;
}

/** Compute scaled JLPT Language Knowledge score (0 - 60 scale) for a standard 54-question attempt */
export function computeStandardJLPTScore(attempt: Attempt): {
  scaledScore: number;
  maxScore: 60;
  passedSection: boolean;
  passedReference: boolean;
  vocabCorrect: number;
  vocabTotal: number;
  grammarCorrect: number;
  grammarTotal: number;
} {
  const selected = new Set(attempt.questionIds);
  let vocabCorrect = 0;
  let vocabTotal = 0;
  let grammarCorrect = 0;
  let grammarTotal = 0;
  let weightedEarned = 0;
  let weightedMax = 0;

  for (const m of attempt.exam.mondais) {
    const qs = m.questions.filter((q) => selected.has(q.id));
    const weight = m.number === 9 ? 2 : 1; // Reading-grammar passage questions carry higher weight
    for (const q of qs) {
      const isRight = attempt.answers[q.id] === q.answer;
      weightedMax += weight;
      if (isRight) weightedEarned += weight;
      if (m.number <= 6) {
        vocabTotal++;
        if (isRight) vocabCorrect++;
      } else {
        grammarTotal++;
        if (isRight) grammarCorrect++;
      }
    }
  }

  const scaledScore =
    weightedMax > 0 ? Math.round((weightedEarned / weightedMax) * 60) : 0;

  return {
    scaledScore,
    maxScore: 60,
    passedSection: scaledScore >= 19,
    passedReference: scaledScore >= 38,
    vocabCorrect,
    vocabTotal,
    grammarCorrect,
    grammarTotal,
  };
}

export interface ExamHistoryEntry {
  examId: string;
  correct: number;
  total: number;
  percent: number;
  scaledScore?: number;
  updatedAt: number;
}

const LEGACY_HISTORY_STORAGE_KEY = "jlpt_exam_history_v1";

/**
 * Results are kept strictly within the current browser tab (sessionStorage via tabSession).
 * Persistent localStorage score history is disabled per architecture spec.
 */
export function getExamHistory(): Record<string, ExamHistoryEntry> {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

export function saveExamResultHistory(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}
