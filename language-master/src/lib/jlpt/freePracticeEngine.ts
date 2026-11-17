import type {
  JLPTExam,
  JLPTExplanation,
  JLPTLevel,
  JLPTMondai,
  JLPTPassage,
  JLPTQuestion,
} from "../../data/exams/jlpt/types";

export const FREE_PRACTICE_ALL_MONDAIS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const FREE_MONDAI_QUICK_GROUPS: ReadonlyArray<{
  label: string;
  mondais: number[];
}> = [
  { label: "Tất cả M1–9", mondais: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { label: "Chữ Hán (M1–2)", mondais: [1, 2] },
  { label: "Từ vựng (M3–6)", mondais: [3, 4, 5, 6] },
  { label: "Ngữ pháp (M7–9)", mondais: [7, 8, 9] },
];
export const MAX_FREE_HISTORY = 30;
export const LOOKAHEAD_BUFFER_SIZE = 5;
export const FREE_PRACTICE_HANDOFF_KEY =
  "language-master:jlpt:v1:free-handoff";

export type FreePracticeFixedKind = "wrong" | "blank" | "flags" | "full";

export type FreeScopeExamOption = {
  id: string;
  title: string;
  day?: number;
  totalQuestions: number;
  availableMondais: number[];
};

export type FreeScopeBookOption = {
  id: string;
  title: string;
  subtitle?: string;
  totalDays: number;
  totalQuestions: number;
  availableMondais: number[];
  exams: FreeScopeExamOption[];
};

export type FreePracticeConfig =
  | {
      kind: "endless";
      level: JLPTLevel;
      bookIds: string[];
      examIds?: string[];
      mondais: number[];
    }
  | {
      kind: "fixed";
      fixedKind: FreePracticeFixedKind;
      level: JLPTLevel;
      questionIds: string[];
      title?: string;
      backTo?: string;
    };

export type FreePracticeUnit = {
  instanceId: string;
  sourceId: string;
  examId: string;
  examTitle: string;
  bookId: string;
  bookTitle: string;
  day?: number;
  level: JLPTLevel;
  enrichmentStatus?: JLPTExam["enrichmentStatus"];
  mondai: Pick<
    JLPTMondai,
    "number" | "type" | "title" | "titleVi" | "instruction"
  >;
  passage?: JLPTPassage;
  questions: JLPTQuestion[];
};

export type FreePracticeUnitSeed = Omit<FreePracticeUnit, "instanceId">;

export type EndlessQueueState = {
  seeds: FreePracticeUnitSeed[];
  bag: FreePracticeUnitSeed[];
  lastSourceId?: string;
};

const CONTEXT_OPTION_REF_RE =
  /(^|[^\p{L}\p{N}])((?:tổ hợp đúng là|đáp án đúng là|đáp án|phương án|lựa chọn|câu)\s+)([1-4](?:\s*(?:và|hoặc|,|\/)\s*[1-4])*)(?![\p{L}\p{N}])/giu;

const M8_PAREN_REF_RE = /\(([1-4])\)/g;
const M8_STAR_REF_RE = /(Vị trí\s*★\s*là\s*)([1-4])(?![\p{L}\p{N}])/giu;

let instanceSeq = 0;
function nextInstanceId(sourceId: string): string {
  instanceSeq += 1;
  return `${sourceId}#${instanceSeq}`;
}

/** Bộ sinh số ngẫu nhiên có hạt giống (mulberry32): cùng hạt giống cho cùng thứ tự câu và đáp án trộn (LT-3) */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fisherYatesShuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function remapExplanationText(
  text: string | undefined,
  oldToNew: Map<number, number>,
  isOrderQuestion: boolean,
): string | undefined {
  if (!text) return text;
  let updated = text;
  if (isOrderQuestion) {
    updated = updated.replace(
      M8_PAREN_REF_RE,
      (_, digit: string) => `(${oldToNew.get(Number(digit)) ?? digit})`,
    );
    updated = updated.replace(
      M8_STAR_REF_RE,
      (_, prefix: string, digit: string) =>
        `${prefix}${oldToNew.get(Number(digit)) ?? digit}`,
    );
  }
  updated = updated.replace(
    CONTEXT_OPTION_REF_RE,
    (
      _,
      lead: string,
      label: string,
      numsPart: string,
    ) => {
      const remappedNums = numsPart.replace(
        /[1-4]/g,
        (digit) => String(oldToNew.get(Number(digit)) ?? digit),
      );
      return `${lead}${label}${remappedNums}`;
    },
  );
  return updated;
}

function remapExplanation(
  explanation: JLPTExplanation | undefined,
  perm: number[],
  oldToNew: Map<number, number>,
  changed: boolean,
  isOrderQuestion: boolean,
): JLPTExplanation | undefined {
  if (!explanation) return undefined;
  const optionNotes =
    Array.isArray(explanation.optionNotes) &&
    explanation.optionNotes.length === 4
      ? perm.map((oldIdx) => explanation.optionNotes![oldIdx])
      : explanation.optionNotes;

  if (!changed) {
    return {
      ...explanation,
      ...(optionNotes ? { optionNotes } : {}),
    };
  }

  return {
    ...explanation,
    ...(optionNotes ? { optionNotes } : {}),
    vi: remapExplanationText(explanation.vi, oldToNew, isOrderQuestion),
    summary: remapExplanationText(
      explanation.summary,
      oldToNew,
      isOrderQuestion,
    ),
    rule: remapExplanationText(explanation.rule, oldToNew, isOrderQuestion),
  };
}

/**
 * Đảo thứ tự 4 phương án (1–4) đồng bộ với answer, optionNotes, order (Mondai 8)
 * và các tham chiếu số lựa chọn trong lời giải tiếng Việt. Không mutate object gốc.
 */
export function shuffleQuestionOptions(
  question: JLPTQuestion,
  mondaiType?: string,
  random: () => number = Math.random,
): JLPTQuestion {
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    return {
      ...question,
      options: [...(question.options || [])],
      ...(question.order ? { order: [...question.order] } : {}),
      ...(question.explanation
        ? {
            explanation: {
              ...question.explanation,
              ...(question.explanation.optionNotes
                ? { optionNotes: [...question.explanation.optionNotes] }
                : {}),
            },
          }
        : {}),
    };
  }

  const perm = fisherYatesShuffle([0, 1, 2, 3], random);
  const changed = perm.some((oldIdx, newIdx) => oldIdx !== newIdx);
  const oldToNew = new Map<number, number>();
  for (let newIdx = 0; newIdx < 4; newIdx++) {
    oldToNew.set(perm[newIdx] + 1, newIdx + 1);
  }

  const isOrderQuestion = Boolean(
    (question.order && question.order.length > 0) ||
      mondaiType === "sentence_order",
  );

  return {
    ...question,
    options: perm.map((oldIdx) => question.options[oldIdx]),
    answer: oldToNew.get(question.answer) ?? question.answer,
    ...(question.order
      ? { order: question.order.map((oldNum) => oldToNew.get(oldNum) ?? oldNum) }
      : {}),
    explanation: remapExplanation(
      question.explanation,
      perm,
      oldToNew,
      changed,
      isOrderQuestion,
    ),
  };
}

function attachOrigin(q: JLPTQuestion, exam: JLPTExam): JLPTQuestion {
  if (q.origin) return q;
  return {
    ...q,
    origin: {
      examId: exam.id,
      title: exam.title,
      day: exam.day,
      number: q.number,
    },
  };
}

export function buildSeedsFromExams(
  exams: JLPTExam[],
  allowedMondais?: ReadonlySet<number>,
  allowedQuestionIds?: ReadonlySet<string>,
): FreePracticeUnitSeed[] {
  const seeds: FreePracticeUnitSeed[] = [];
  for (const exam of exams) {
    if (exam.isSample || exam.isPracticePool) continue;
    for (const mondai of exam.mondais) {
      if (allowedMondais && !allowedMondais.has(mondai.number)) continue;

      const passageById = new Map<string, JLPTPassage>(
        (mondai.passages || []).map((p) => [p.id, p]),
      );
      const grouped = new Map<string, JLPTQuestion[]>();
      const groupOrder: string[] = [];

      for (const rawQ of mondai.questions) {
        const q = attachOrigin(rawQ, exam);
        const key = q.passageId
          ? `${exam.id}:${mondai.number}:${q.passageId}`
          : q.id;
        let bucket = grouped.get(key);
        if (!bucket) {
          bucket = [];
          grouped.set(key, bucket);
          groupOrder.push(key);
        }
        bucket.push(q);
      }

      for (const sourceId of groupOrder) {
        const qs = grouped.get(sourceId)!;
        // Nếu có lọc theo câu (ví dụ Ôn câu sai), hễ trúng ít nhất 1 câu trong bài đọc thì giữ trọn cụm câu đi kèm đoạn văn
        if (
          allowedQuestionIds &&
          !qs.some((q) => allowedQuestionIds.has(q.id))
        ) {
          continue;
        }
        const passageId = qs[0]?.passageId;
        const passage = passageId ? passageById.get(passageId) : undefined;
        seeds.push({
          sourceId,
          examId: exam.id,
          examTitle: exam.title,
          bookId: exam.bookId || exam.id,
          bookTitle: exam.bookTitle || exam.title,
          day: exam.day,
          level: exam.level,
          enrichmentStatus: exam.enrichmentStatus,
          mondai: {
            number: mondai.number,
            type: mondai.type,
            title: mondai.title,
            titleVi: mondai.titleVi,
            instruction: mondai.instruction,
          },
          ...(passage ? { passage } : {}),
          questions: qs,
        });
      }
    }
  }
  return seeds;
}

export function materializeFreeUnit(
  seed: FreePracticeUnitSeed,
  random: () => number = Math.random,
): FreePracticeUnit {
  return {
    ...seed,
    instanceId: nextInstanceId(seed.sourceId),
    questions: seed.questions.map((q) =>
      shuffleQuestionOptions(q, seed.mondai.type, random),
    ),
  };
}

export function createEndlessQueue(
  seeds: FreePracticeUnitSeed[],
  random: () => number = Math.random,
): EndlessQueueState {
  return {
    seeds: [...seeds],
    bag: fisherYatesShuffle(seeds, random),
    lastSourceId: undefined,
  };
}

export function drawNextEndlessUnit(
  queue: EndlessQueueState,
  random: () => number = Math.random,
): { unit: FreePracticeUnit | null; nextQueue: EndlessQueueState } {
  if (queue.seeds.length === 0) {
    return { unit: null, nextQueue: queue };
  }

  const bag =
    queue.bag.length > 0
      ? [...queue.bag]
      : fisherYatesShuffle(queue.seeds, random);

  if (
    bag.length > 1 &&
    queue.lastSourceId &&
    bag[0].sourceId === queue.lastSourceId
  ) {
    const swapIdx = 1 + Math.floor(random() * (bag.length - 1));
    [bag[0], bag[swapIdx]] = [bag[swapIdx], bag[0]];
  }

  const [seed, ...rest] = bag;
  return {
    unit: materializeFreeUnit(seed, random),
    nextQueue: {
      seeds: queue.seeds,
      bag: rest,
      lastSourceId: seed.sourceId,
    },
  };
}

export function fillLookaheadBuffer(
  queue: EndlessQueueState,
  currentBuffer: FreePracticeUnit[],
  targetSize: number = LOOKAHEAD_BUFFER_SIZE,
  random: () => number = Math.random,
): { buffer: FreePracticeUnit[]; nextQueue: EndlessQueueState } {
  if (queue.seeds.length === 0) {
    return { buffer: currentBuffer, nextQueue: queue };
  }
  const buffer = [...currentBuffer];
  let q = queue;
  while (buffer.length < targetSize) {
    const { unit, nextQueue } = drawNextEndlessUnit(q, random);
    q = nextQueue;
    if (!unit) break;
    buffer.push(unit);
  }
  return { buffer, nextQueue: q };
}

export function collectUpcomingImageUrls(
  units: FreePracticeUnit[],
  maxUnits: number = LOOKAHEAD_BUFFER_SIZE,
): string[] {
  const urls = new Set<string>();
  for (const unit of units.slice(0, maxUnits)) {
    if (unit.passage?.sourceImage) urls.add(unit.passage.sourceImage);
    for (const q of unit.questions) {
      if (q.sourceImage) urls.add(q.sourceImage);
    }
  }
  return [...urls];
}

export function buildFreeScopeSearchParams(params: {
  level: JLPTLevel;
  bookIds: string[];
  examIds?: string[];
  mondais: number[];
  allBooksCount?: number;
  allExamsCount?: number;
}): string {
  const sp = new URLSearchParams();
  sp.set("level", params.level);
  const hasPartialExams = Boolean(
    params.examIds &&
      params.examIds.length > 0 &&
      (!params.allExamsCount || params.examIds.length < params.allExamsCount),
  );
  if (hasPartialExams && params.examIds) {
    sp.set("exams", params.examIds.join(","));
  } else if (
    params.bookIds.length > 0 &&
    (!params.allBooksCount || params.bookIds.length < params.allBooksCount)
  ) {
    sp.set("books", params.bookIds.join(","));
  }
  if (
    params.mondais.length > 0 &&
    params.mondais.length < FREE_PRACTICE_ALL_MONDAIS.length
  ) {
    sp.set("mondais", params.mondais.join(","));
  }
  return sp.toString();
}

export function parseFreeScopeSearchParams(
  search: string,
  fallbackLevel: JLPTLevel = "N2",
): {
  level: JLPTLevel;
  bookIds: string[] | null;
  examIds: string[] | null;
  mondais: number[] | null;
} {
  const sp = new URLSearchParams(search);
  const rawLevel = (sp.get("level") || fallbackLevel).toUpperCase();
  const level: JLPTLevel =
    rawLevel === "N1" ||
    rawLevel === "N2" ||
    rawLevel === "N3" ||
    rawLevel === "N4" ||
    rawLevel === "N5"
      ? rawLevel
      : fallbackLevel;

  const rawBooks = sp.get("books");
  const bookIds = rawBooks
    ? rawBooks
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  const rawExams = sp.get("exams");
  const examIds = rawExams
    ? [
        ...new Set(
          rawExams
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ]
    : null;

  const rawMondais = sp.get("mondais");
  const mondais = rawMondais
    ? [
        ...new Set(
          rawMondais
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 9),
        ),
      ].sort((a, b) => a - b)
    : null;

  return { level, bookIds, examIds, mondais };
}

