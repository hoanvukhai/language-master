import type {
  JLPTExam,
  JLPTMondai,
  JLPTQuestion,
} from "../../data/exams/jlpt/types";
export const SESSION_KEY = "language-master:jlpt:v1:session";
export const TTL = 86400000;
export type Unit = {
  id: string;
  mondai: JLPTMondai;
  questions: JLPTQuestion[];
};
export type Attempt = {
  id: string;
  exam: JLPTExam;
  mode: "drill" | "mock";
  status: "in_progress" | "submitted";
  questionIds: string[];
  targetQuestionIds: string[];
  answers: Record<string, number>;
  committed: string[];
  flags: string[];
  assisted: string[];
  position: number;
  createdAt: number;
  expiresAt: number;
  deadlineAt?: number;
  endedAt?: number;
  reason?: "manual" | "timeout";
  /** Bài có giờ ở chế độ thi nghiêm túc: tắt mọi trợ giúp khi đang làm */
  strict?: boolean;
};
export function units(exam: JLPTExam, ids?: string[]): Unit[] {
  const result: Unit[] = [];
  for (const mondai of exam.mondais)
    for (const q of mondai.questions) {
      const id = q.passageId ? `${mondai.number}:${q.passageId}` : q.id;
      let unit = result.find((u) => u.id === id);
      if (!unit) {
        unit = { id, mondai, questions: [] };
        result.push(unit);
      }
      unit.questions.push(q);
    }
  if (!ids) return result;
  const rank = new Map(ids.map((id, i) => [id, i]));
  const firstRank = (u: Unit) =>
    Math.min(...u.questions.map((q) => rank.get(q.id) ?? Infinity));
  return result
    .filter((u) => u.questions.some((q) => rank.has(q.id)))
    .sort((a, b) => firstRank(a) - firstRank(b));
}
export function questions(a: Attempt) {
  return a.exam.mondais
    .flatMap((m) => m.questions)
    .filter((q) => a.questionIds.includes(q.id));
}
export function createAttempt(
  exam: JLPTExam,
  mode: Attempt["mode"],
  ids?: string[],
  now = Date.now(),
): Attempt {
  const selected = units(exam, ids).flatMap((u) =>
    u.questions.map((q) => q.id),
  );
  if (!selected.length) throw new Error("Không có câu hỏi để luyện.");
  if (
    mode === "mock" &&
    (!exam.timeLimitMinutes ||
      exam.timeLimitMinutes <= 0 ||
      exam.timeLimitMinutes >= 1440)
  )
    throw new Error("Thời lượng chưa hợp lệ.");
  return {
    id: crypto.randomUUID(),
    exam: structuredClone(exam),
    mode,
    status: "in_progress",
    questionIds: selected,
    targetQuestionIds: ids || [],
    answers: {},
    committed: [],
    flags: [],
    assisted: [],
    position: 0,
    createdAt: now,
    expiresAt: now + TTL,
    deadlineAt:
      mode === "mock" ? now + exam.timeLimitMinutes! * 60000 : undefined,
  };
}
export function finish(a: Attempt, now = Date.now()): Attempt {
  if (a.status === "submitted") return a;
  return {
    ...a,
    status: "submitted",
    committed: [...a.questionIds],
    endedAt: Math.min(now, a.deadlineAt ?? now),
    reason: a.deadlineAt && now >= a.deadlineAt ? "timeout" : "manual",
  };
}
export function reconcile(a: Attempt | null, now = Date.now()): Attempt | null {
  if (!a || now >= a.expiresAt) return null;
  return a.status === "in_progress" && a.deadlineAt && now >= a.deadlineAt
    ? finish(a, now)
    : a;
}
export function answer(
  a: Attempt,
  id: string,
  option: number,
  now = Date.now(),
): Attempt {
  const c = reconcile(a, now);
  if (
    !c ||
    c.status !== "in_progress" ||
    c.committed.includes(id) ||
    !c.questionIds.includes(id) ||
    ![1, 2, 3, 4].includes(option)
  )
    return c || a;
  return { ...c, answers: { ...c.answers, [id]: option } };
}
export function score(a: Attempt) {
  const qs = questions(a),
    correct = qs.filter((q) => a.answers[q.id] === q.answer).length,
    blank = qs.filter((q) => !a.answers[q.id]).length;
  return {
    correct,
    blank,
    wrong: qs.length - correct - blank,
    total: qs.length,
    percent: Math.round((correct / qs.length) * 100),
  };
}
export function validateExam(value: unknown): string[] {
  try {
    return inspectExam(value);
  } catch {
    return ["Cấu trúc câu/đoạn không hợp lệ."];
  }
}
function inspectExam(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return ["Không phải dữ liệu đề"];
  const e = value as JLPTExam;
  if (
    !e.id ||
    !e.title ||
    !["N1", "N2", "N3", "N4", "N5"].includes(e.level) ||
    !Array.isArray(e.mondais) ||
    !e.mondais.length
  )
    return ["Thiếu thông tin bài"];
  const ids = new Set<string>();
  let count = 0;
  const kinds = [
    "kanji_reading",
    "kanji_writing",
    "word_formation",
    "context",
    "synonym",
    "usage",
    "grammar_form",
    "sentence_order",
    "text_grammar",
  ];
  for (const m of e.mondais) {
    if (
      !kinds.includes(m.type) ||
      !Array.isArray(m.questions) ||
      !m.questions.length
    ) {
      errors.push(`Mondai ${m.number}: sai dạng/rỗng`);
      continue;
    }
    const passages = new Map((m.passages || []).map((p) => [p.id, p]));
    if (passages.size !== (m.passages || []).length)
      errors.push(`Mondai ${m.number}: trùng ID đoạn`);
    const blankOwners = new Set<string>();
    for (const q of m.questions) {
      count++;
      if (!q.id || ids.has(q.id)) errors.push(`ID trùng/thiếu: ${q.id}`);
      ids.add(q.id);
      if (
        typeof q.stem !== "string" ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        q.options.some((o) => typeof o !== "string" || !o.trim()) ||
        ![1, 2, 3, 4].includes(q.answer)
      )
        errors.push(`Câu ${q.number}: nội dung/đáp án không hợp lệ`);
      if (
        e.delivery === "source_scan" &&
        (!q.sourceImage || !q.sourcePages?.length || !q.answerPages?.length)
      )
        errors.push(`Question ${q.number}: missing source`);
      if (q.passageId && !passages.has(q.passageId))
        errors.push(`Câu ${q.number}: thiếu đoạn văn`);
      if (q.passageId && passages.has(q.passageId)) {
        const text = passages.get(q.passageId)!.text;
        const blankIds = q.blankIds || [];
        for (const id of blankIds) {
          const key = `${q.passageId}:${id}`;
          if (!text.includes(`[[${id}]]`) || blankOwners.has(key))
            errors.push(`Câu ${q.number}: ô trống thiếu/trùng ${id}`);
          blankOwners.add(key);
        }
        if (
          e.delivery !== "source_scan" &&
          m.type === "text_grammar" &&
          !blankIds.length
        )
          errors.push(`Câu ${q.number}: thiếu liên kết ô trống`);
      }
      if (q.order) {
        const slots = q.stem.match(/_{3,}|★/g) || [];
        if (
          slots.length !== 4 ||
          slots.filter((x) => x === "★").length !== 1 ||
          [...q.order].sort().join() !== "1,2,3,4" ||
          q.order[slots.indexOf("★")] !== q.answer
        )
          errors.push(`Câu ${q.number}: thứ tự sao sai`);
      }
    }
    for (const passage of passages.values()) {
      for (const match of (e.delivery === "source_scan"
        ? ""
        : passage.text
      ).matchAll(/\[\[([^\]]+)\]\]/g))
        if (!blankOwners.has(`${passage.id}:${match[1]}`))
          errors.push(`Đoạn ${passage.id}: ô trống chưa có câu quản lý`);
    }
  }
  if (count !== e.totalQuestions) errors.push("Tổng câu không khớp");
  return errors;
}
export function decodeSession(raw: string, now = Date.now()): Attempt | null {
  const e = JSON.parse(raw) as { version: number; attempt: Attempt },
    a = e.attempt;
  if (
    e.version !== 1 ||
    !a ||
    validateExam(a.exam).length ||
    !["drill", "mock"].includes(a.mode) ||
    !["in_progress", "submitted"].includes(a.status)
  )
    throw new Error("Phiên không tương thích");
  const all = a.exam.mondais.flatMap((m) => m.questions).map((q) => q.id);
  if (
    !a.id ||
    !Number.isFinite(a.createdAt) ||
    a.createdAt > now ||
    a.expiresAt !== a.createdAt + TTL ||
    !Array.isArray(a.questionIds) ||
    !a.questionIds.length ||
    a.questionIds.some((id) => !all.includes(id)) ||
    new Set(a.questionIds).size !== a.questionIds.length ||
    !Number.isInteger(a.position) ||
    a.position < 0 ||
    a.position >= units(a.exam, a.questionIds).length
  )
    throw new Error("Phiên không hợp lệ");
  for (const list of [a.committed, a.flags, a.assisted, a.targetQuestionIds])
    if (!Array.isArray(list) || list.some((id) => !a.questionIds.includes(id)))
      throw new Error("Phạm vi sai");
  if (
    !a.answers ||
    Object.entries(a.answers).some(
      ([id, v]) => !a.questionIds.includes(id) || ![1, 2, 3, 4].includes(v),
    )
  )
    throw new Error("Đáp án sai");
  if (
    a.mode === "mock" &&
    (!a.exam.timeLimitMinutes ||
      !Number.isInteger(a.exam.timeLimitMinutes) ||
      a.exam.timeLimitMinutes <= 0 ||
      a.exam.timeLimitMinutes >= 1440 ||
      a.deadlineAt !== a.createdAt + a.exam.timeLimitMinutes * 60000)
  )
    throw new Error("Hạn sai");
  if (a.mode === "drill" && a.deadlineAt !== undefined)
    throw new Error("Hạn luyện sai");
  if (
    a.status === "submitted" &&
    (!Number.isFinite(a.endedAt) ||
      a.endedAt! < a.createdAt ||
      a.endedAt! > Math.min(now, a.deadlineAt ?? now))
  )
    throw new Error("Kết quả sai");
  return reconcile(a, now);
}
