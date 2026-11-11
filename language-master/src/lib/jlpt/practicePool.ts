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

/**
 * Ensure any question belonging to a shared passage brings its entire passage cluster
 * in original question order, without duplicate IDs.
 */
export function expandPassageClusters(exam: JLPTExam, ids: string[]): string[] {
  if (!ids.length) return [];
  const questionById = new Map<string, { passageId?: string }>();
  const passageGroups = new Map<string, string[]>();

  for (const m of exam.mondais) {
    for (const q of m.questions) {
      questionById.set(q.id, q);
      if (q.passageId) {
        const list = passageGroups.get(q.passageId) || [];
        list.push(q.id);
        passageGroups.set(q.passageId, list);
      }
    }
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;
    const q = questionById.get(id);
    if (!q) continue;
    if (q.passageId && passageGroups.has(q.passageId)) {
      for (const sibId of passageGroups.get(q.passageId)!) {
        if (!seen.has(sibId)) {
          seen.add(sibId);
          result.push(sibId);
        }
      }
    } else {
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}

/**
 * Verify whether an exam source has enough valid questions across all 9 Mondais
 * to form a standard 54-question timed exam.
 */
export function canCreateStandardMock(exam?: JLPTExam | null): boolean {
  if (!exam || !Array.isArray(exam.mondais) || !exam.timeLimitMinutes) {
    return false;
  }
  for (let mNum = 1; mNum <= 9; mNum++) {
    const quota = STANDARD_MONDAI_QUOTAS[mNum] ?? 5;
    const m = exam.mondais.find((x) => x.number === mNum);
    if (!m || !Array.isArray(m.questions) || m.questions.length < quota) {
      return false;
    }
  }
  return true;
}

export interface PlannedRoundConfig {
  mode: "drill" | "mock";
  mondais: number[];
  allocationMode: AllocationMode;
  totalCount: number | "all";
  perMondaiCount: number;
  dayFilter: number | "all";
}

export interface PlannedRound {
  configKey: string;
  config: PlannedRoundConfig;
  examId: string;
  contentRevision: number;
  questionIds: string[];
  actualTotal: number;
  targetTotal: number | "all";
  eligibleCount: number;
  bankTotal: number;
  mondaiDistribution: { mondai: number; count: number }[];
  reason?: "passage_expanded" | "shortage" | "empty" | "invalid_mock";
  reasonMessage?: string;
  canStart: boolean;
}

export function buildPlannedRoundKey(
  exam: JLPTExam,
  rawConfig: Partial<PlannedRoundConfig>,
): string {
  const mode = rawConfig.mode === "mock" ? "mock" : "drill";
  const validMondaiSet = new Set(exam.mondais.map((m) => m.number));
  const mondais =
    mode === "mock"
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
      : Array.from(
          new Set(
            (rawConfig.mondais ?? exam.mondais.map((m) => m.number)).filter(
              (n) => validMondaiSet.has(n),
            ),
          ),
        ).sort((a, b) => a - b);
  const allocationMode: AllocationMode =
    mode === "mock" ? "standard" : (rawConfig.allocationMode ?? "standard");
  const totalCount: number | "all" =
    rawConfig.totalCount === "all" || rawConfig.totalCount === Infinity
      ? "all"
      : Number.isFinite(Number(rawConfig.totalCount)) &&
          Number(rawConfig.totalCount) > 0
        ? Math.floor(Number(rawConfig.totalCount))
        : 20;
  const perMondaiCount =
    Number.isFinite(Number(rawConfig.perMondaiCount)) &&
    Number(rawConfig.perMondaiCount) > 0
      ? Math.floor(Number(rawConfig.perMondaiCount))
      : 5;
  const dayFilter: number | "all" =
    !exam.isPracticePool ||
    rawConfig.dayFilter === undefined ||
    rawConfig.dayFilter === "all"
      ? "all"
      : rawConfig.dayFilter;

  return JSON.stringify({
    examId: exam.id,
    rev: exam.contentRevision || 0,
    mode,
    mondais,
    allocationMode,
    totalCount,
    perMondaiCount,
    dayFilter,
  });
}

/**
 * Create an in-memory PlannedRound so the setup preview and the actual started Attempt
 * share the exact same question list, count, and per-Mondai distribution.
 */
export function planPracticeRound(
  exam: JLPTExam,
  rawConfig: Partial<PlannedRoundConfig>,
  random = Math.random,
): PlannedRound {
  const mode = rawConfig.mode === "mock" ? "mock" : "drill";
  const validMondaiSet = new Set(exam.mondais.map((m) => m.number));
  const mondais =
    mode === "mock"
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
      : Array.from(
          new Set(
            (rawConfig.mondais ?? exam.mondais.map((m) => m.number)).filter(
              (n) => validMondaiSet.has(n),
            ),
          ),
        ).sort((a, b) => a - b);
  const allocationMode: AllocationMode =
    mode === "mock" ? "standard" : (rawConfig.allocationMode ?? "standard");
  const totalCount: number | "all" =
    rawConfig.totalCount === "all" || rawConfig.totalCount === Infinity
      ? "all"
      : Number.isFinite(Number(rawConfig.totalCount)) &&
          Number(rawConfig.totalCount) > 0
        ? Math.floor(Number(rawConfig.totalCount))
        : 20;
  const perMondaiCount =
    Number.isFinite(Number(rawConfig.perMondaiCount)) &&
    Number(rawConfig.perMondaiCount) > 0
      ? Math.floor(Number(rawConfig.perMondaiCount))
      : 5;
  const dayFilter: number | "all" =
    !exam.isPracticePool ||
    rawConfig.dayFilter === undefined ||
    rawConfig.dayFilter === "all"
      ? "all"
      : rawConfig.dayFilter;

  const config: PlannedRoundConfig = {
    mode,
    mondais,
    allocationMode,
    totalCount,
    perMondaiCount,
    dayFilter,
  };
  const configKey = buildPlannedRoundKey(exam, config);
  const bankTotal = exam.mondais.reduce(
    (sum, m) => sum + m.questions.length,
    0,
  );

  if (mode === "mock") {
    if (!canCreateStandardMock(exam)) {
      return {
        configKey,
        config,
        examId: exam.id,
        contentRevision: exam.contentRevision || 0,
        questionIds: [],
        actualTotal: 0,
        targetTotal: 54,
        eligibleCount: bankTotal,
        bankTotal,
        mondaiDistribution: [],
        reason: "invalid_mock",
        reasonMessage: "Nguồn hiện tại chưa đủ câu để tạo bài 54 câu.",
        canStart: false,
      };
    }

    const rawIds = exam.isPracticePool
      ? pickAdvancedPracticeQuestions(
          exam,
          {
            mondais: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            allocationMode: "standard",
            totalCount: 54,
            perMondaiCount: 5,
            dayFilter: "all",
          },
          random,
        )
      : exam.mondais.flatMap((m) => m.questions.map((q) => q.id));

    const questionIds = expandPassageClusters(exam, rawIds);
    const idSet = new Set(questionIds);
    const mondaiMap: Record<number, number> = {};
    const mondaiDistribution: { mondai: number; count: number }[] = [];
    let validStructure = questionIds.length === 54;
    for (const m of exam.mondais) {
      const cnt = m.questions.filter((q) => idSet.has(q.id)).length;
      if (cnt > 0) {
        mondaiMap[m.number] = cnt;
        mondaiDistribution.push({ mondai: m.number, count: cnt });
      }
    }
    for (let mNum = 1; mNum <= 9; mNum++) {
      if (mondaiMap[mNum] !== (STANDARD_MONDAI_QUOTAS[mNum] ?? 5)) {
        validStructure = false;
      }
    }

    return {
      configKey,
      config,
      examId: exam.id,
      contentRevision: exam.contentRevision || 0,
      questionIds: validStructure ? questionIds : [],
      actualTotal: validStructure ? questionIds.length : 0,
      targetTotal: 54,
      eligibleCount: bankTotal,
      bankTotal,
      mondaiDistribution: validStructure ? mondaiDistribution : [],
      reason: validStructure ? undefined : "invalid_mock",
      reasonMessage: validStructure
        ? undefined
        : "Nguồn hiện tại chưa đủ câu để tạo bài 54 câu.",
      canStart: validStructure,
    };
  }

  // Drill mode
  const activeMondais = exam.mondais.filter((m) => mondais.includes(m.number));
  const eligibleCount = activeMondais.reduce(
    (sum, m) =>
      sum +
      m.questions.filter(
        (q) =>
          dayFilter === "all" ||
          q.origin?.day === undefined ||
          q.origin.day === dayFilter,
      ).length,
    0,
  );

  if (activeMondais.length === 0 || eligibleCount === 0) {
    return {
      configKey,
      config,
      examId: exam.id,
      contentRevision: exam.contentRevision || 0,
      questionIds: [],
      actualTotal: 0,
      targetTotal: 0,
      eligibleCount: 0,
      bankTotal,
      mondaiDistribution: [],
      reason: "empty",
      reasonMessage:
        "Chưa có dạng bài hoặc câu hỏi phù hợp. Vui lòng chọn lại ít nhất một Mondai để bắt đầu.",
      canStart: false,
    };
  }

  let rawIds: string[];
  if (!exam.isPracticePool) {
    rawIds = activeMondais.flatMap((m) => m.questions.map((q) => q.id));
  } else if (
    allocationMode === "total" &&
    dayFilter === "all" &&
    (activeMondais.length === 1 ||
      activeMondais.length === exam.mondais.length)
  ) {
    const mondaiArg =
      activeMondais.length === 1 ? String(activeMondais[0].number) : "all";
    rawIds = pickPracticeQuestions(
      exam,
      mondaiArg,
      totalCount === "all" ? Infinity : totalCount,
      random,
    );
  } else {
    rawIds = pickAdvancedPracticeQuestions(
      exam,
      {
        mondais,
        allocationMode,
        totalCount: totalCount === "all" ? Infinity : totalCount,
        perMondaiCount,
        dayFilter,
      },
      random,
    );
  }

  const questionIds = expandPassageClusters(exam, rawIds);
  const idSet = new Set(questionIds);
  const mondaiMap: Record<number, number> = {};
  const mondaiDistribution: { mondai: number; count: number }[] = [];
  for (const m of activeMondais) {
    const cnt = m.questions.filter((q) => idSet.has(q.id)).length;
    mondaiMap[m.number] = cnt;
    mondaiDistribution.push({ mondai: m.number, count: cnt });
  }

  const actualTotal = questionIds.length;
  let targetTotal: number | "all" = actualTotal;
  let reason: PlannedRound["reason"];
  let reasonMessage: string | undefined;

  if (exam.isPracticePool) {
    if (allocationMode === "standard") {
      targetTotal = activeMondais.reduce(
        (sum, m) => sum + (STANDARD_MONDAI_QUOTAS[m.number] ?? 5),
        0,
      );
      if (actualTotal < targetTotal) {
        reason = "shortage";
        reasonMessage = `Nguồn đã chọn chỉ có ${actualTotal} câu phù hợp.`;
      } else if (actualTotal > targetTotal) {
        reason = "passage_expanded";
        reasonMessage =
          "Giữ nguyên nhóm câu trong đoạn văn nên số câu tăng thêm.";
      }
    } else if (allocationMode === "per_mondai") {
      targetTotal = activeMondais.length * perMondaiCount;
      const hasShortMondai = activeMondais.some(
        (m) => (mondaiMap[m.number] ?? 0) < perMondaiCount,
      );
      if (hasShortMondai) {
        reason = "shortage";
        reasonMessage = `Nguồn đã chọn chỉ có ${actualTotal} câu phù hợp.`;
      } else if (actualTotal > targetTotal) {
        reason = "passage_expanded";
        reasonMessage =
          "Giữ nguyên nhóm câu trong đoạn văn nên số câu tăng thêm.";
      }
    } else {
      if (totalCount === "all") {
        targetTotal = "all";
      } else {
        targetTotal = totalCount;
        if (actualTotal > totalCount) {
          reason = "passage_expanded";
          reasonMessage =
            "Giữ nguyên nhóm câu trong đoạn văn nên số câu tăng thêm.";
        } else if (actualTotal < totalCount) {
          reason = "shortage";
          reasonMessage = `Nguồn đã chọn chỉ có ${actualTotal} câu phù hợp.`;
        }
      }
    }
  }

  return {
    configKey,
    config,
    examId: exam.id,
    contentRevision: exam.contentRevision || 0,
    questionIds,
    actualTotal,
    targetTotal,
    eligibleCount,
    bankTotal,
    mondaiDistribution,
    reason,
    reasonMessage,
    canStart: actualTotal > 0,
  };
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
