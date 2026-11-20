import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createAttempt,
  answer,
  effectiveNow,
  finish,
  pauseAttempt,
  reconcile,
  resumeAttempt,
  decodeSession,
  score,
  units,
  validateExam,
  TTL,
  SESSION_KEY,
  SESSION_CONTENT_KEY,
  SESSION_STATE_KEY,
} from "../src/lib/jlpt/examCore.ts";
import { parseExamText, examPlainText } from "../src/lib/jlpt/examText.ts";
const exam = JSON.parse(
  fs.readFileSync(
    new URL(
      "../src/data/exams/jlpt/n2/kokusho-20days/day01.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const now = 10000000;
test("pilot validates and has 54 questions with one five-question passage unit", () => {
  assert.deepEqual(validateExam(exam), []);
  const u = units(exam);
  assert.equal(u.flatMap((g) => g.questions).length, 54);
  assert.equal(u.find((g) => g.questions.length > 1).questions.length, 5);
});
test("retrying question 52 includes the whole passage, still five scored questions", () => {
  const id = exam.mondais[8].questions[2].id;
  const a = createAttempt(exam, "drill", [id], now);
  assert.equal(a.questionIds.length, 5);
  assert.deepEqual(a.targetQuestionIds, [id]);
});
test("underline, blanks, ruby and star use distinct tokens", () => {
  const tokens = parseExamText("[屋外] [[52-a]] {{漢字|かんじ}} ____ ★");
  assert.deepEqual(
    tokens.filter((t) => t.kind !== "text").map((t) => t.kind),
    ["underline", "blank", "ruby", "slot", "star"],
  );
  assert.equal(examPlainText("人[[50]] [屋外]★"), "人  屋外 ");
});
test("answer is editable until committed, never after submission", () => {
  let a = createAttempt(exam, "drill", undefined, now);
  const q = exam.mondais[0].questions[0];
  a = answer(a, q.id, 1, now + 1);
  a = { ...a, committed: [q.id] };
  assert.equal(answer(a, q.id, 2, now + 2).answers[q.id], 1);
  const done = finish(a, now + 3);
  assert.equal(answer(done, q.id, 2, now + 4), done);
  assert.equal(finish(done, now + 5), done);
});
test("deadline survives serialization and timeout rejects new answers", () => {
  const a = createAttempt(exam, "mock", undefined, now);
  const copy = decodeSession(
    JSON.stringify({ version: 1, attempt: a }),
    now + 60000,
  );
  assert.equal(copy.deadlineAt, a.deadlineAt);
  const ended = answer(copy, a.questionIds[0], 2, a.deadlineAt);
  assert.equal(ended.status, "submitted");
  assert.equal(ended.answers[a.questionIds[0]], undefined);
  assert.equal(ended.endedAt, a.deadlineAt);
});
test("TTL is absolute and independent of deadline", () => {
  const a = createAttempt(exam, "mock", undefined, now);
  assert.equal(reconcile(a, now + TTL), null);
  assert.equal(reconcile(a, a.deadlineAt + 1).reason, "timeout");
});
test("score includes wrong and blanks in denominator", () => {
  let a = createAttempt(exam, "drill", undefined, now);
  const q = exam.mondais[0].questions;
  a = answer(a, q[0].id, q[0].answer, now + 1);
  a = answer(a, q[1].id, 1, now + 2);
  const s = score(finish(a, now + 3));
  assert.equal(s.correct, 1);
  assert.equal(s.wrong, 1);
  assert.equal(s.blank, 52);
  assert.equal(s.correct + s.wrong + s.blank, s.total);
});
test("snapshot remains unchanged if catalog is edited", () => {
  const copy = structuredClone(exam);
  const a = createAttempt(copy, "mock", undefined, now);
  copy.mondais[0].questions[0].answer = 4;
  assert.equal(a.exam.mondais[0].questions[0].answer, 2);
});
test("corrupt, incompatible and malformed sessions fail safely", () => {
  assert.throws(() => decodeSession("{"));
  const a = createAttempt(exam, "mock", undefined, now);
  assert.throws(() =>
    decodeSession(JSON.stringify({ version: 3, attempt: a }), now),
  );
  a.deadlineAt++;
  assert.throws(() =>
    decodeSession(JSON.stringify({ version: 1, attempt: a }), now),
  );
});
test("validator rejects invalid answer, duplicated ID and missing passage", () => {
  const e = structuredClone(exam);
  e.mondais[0].questions[0].answer = 5;
  e.mondais[0].questions[1].id = e.mondais[0].questions[0].id;
  e.mondais[8].passages = [];
  assert.ok(validateExam(e).length >= 3);
});
test("tab store replaces a single slot, preserves other keys, and falls back to RAM", async () => {
  const data = new Map([["currentRaceId", "keep"]]);
  let blocked = false;
  globalThis.sessionStorage = {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => {
      if (blocked) throw Error("quota");
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
  const store = await import("../src/lib/jlpt/tabSession.ts");
  const a = createAttempt(exam, "mock");
  store.setSession(a);
  assert.equal(store.getSession().id, a.id);
  assert.ok(data.has(SESSION_CONTENT_KEY) && data.has(SESSION_STATE_KEY));
  assert.equal(data.has(SESSION_KEY), false);
  // JL-20: đổi đáp án chỉ ghi khóa trạng thái, không ghi lại bản chụp đề
  const writes = [];
  const realSet = globalThis.sessionStorage.setItem;
  globalThis.sessionStorage.setItem = (k, v) => {
    writes.push(k);
    realSet(k, v);
  };
  store.setSession(answer(a, a.questionIds[0], 2));
  assert.deepEqual(writes, [SESSION_STATE_KEY]);
  assert.ok(data.get(SESSION_STATE_KEY).length < 20000);
  globalThis.sessionStorage.setItem = realSet;
  const b = createAttempt(exam, "drill");
  blocked = true;
  store.setSession(b);
  assert.equal(store.getSession().id, b.id);
  assert.equal(data.has(SESSION_CONTENT_KEY), false);
  assert.equal(data.has(SESSION_STATE_KEY), false);
  store.setSession(null);
  assert.equal(store.getSession(), null);
  assert.equal(data.get("currentRaceId"), "keep");
});

test("missing blank ownership is rejected", () => {
  const e = structuredClone(exam);
  e.delivery = "text";
  e.mondais[8].questions[2].blankIds = ["52-a"];
  assert.ok(validateExam(e).some((x) => x.includes("quản lý")));
});
test("copied tabs share original deadline but changes are independent", () => {
  const a = createAttempt(exam, "mock", undefined, now);
  const b = decodeSession(JSON.stringify({ version: 1, attempt: a }), now + 1);
  const edited = answer(a, a.questionIds[0], 2, now + 2);
  assert.equal(b.deadlineAt, a.deadlineAt);
  assert.equal(b.answers[a.questionIds[0]], undefined);
  assert.equal(edited.answers[a.questionIds[0]], 2);
});

const corpusDir = new URL(
  "../src/data/exams/jlpt/n2/kokusho-20days/",
  import.meta.url,
);
const reviewed = JSON.parse(
  fs.readFileSync(
    new URL(
      "../imports/jlpt/kokusho-20days/answers-reviewed.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const corpus = fs
  .readdirSync(corpusDir)
  .filter((f) => /^day\d+\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(new URL(f, corpusDir), "utf8")));
test("complete corpus has exactly twenty days and 1080 unique questions", () => {
  assert.equal(corpus.length, 20);
  const ids = corpus.flatMap((e) =>
    e.mondais.flatMap((m) => m.questions.map((q) => q.id)),
  );
  assert.equal(ids.length, 1080);
  assert.equal(new Set(ids).size, 1080);
});
for (const e of corpus) {
  test(`day ${e.day}: source mappings, reviewed answers and all images exist`, () => {
    assert.deepEqual(validateExam(e), []);
    assert.equal(e.delivery, "text");
    assert.equal(e.transcriptionStatus, "verified");
    assert.deepEqual(
      e.transcriptionReview.pdfPages,
      Array.from({ length: 8 }, (_, i) => 5 + (e.day - 1) * 8 + i),
    );
    const qs = e.mondais.flatMap((m) => m.questions);
    assert.deepEqual(
      qs.map((q) => q.number),
      Array.from({ length: 54 }, (_, i) => i + 1),
    );
    assert.equal(qs.map((q) => q.answer).join(""), reviewed[e.day].join(""));
    for (const q of qs) {
      assert.equal(q.transcriptionStatus, "verified");
      assert.equal(q.options.length, 4);
      for (const option of q.options) {
        assert.ok(option.trim());
        assert.doesNotMatch(
          option,
          /Chọn phương án|xem lựa chọn|[|_《》]|\d{3}$/i,
        );
      }
      if (q.number <= 10 || (q.number >= 23 && q.number <= 27))
        assert.ok(
          parseExamText(q.stem).some((t) => t.kind === "underline"),
          q.id,
        );
      if (
        (q.number >= 11 && q.number <= 22) ||
        (q.number >= 33 && q.number <= 44)
      )
        assert.ok(q.stem.includes("（　）"), q.id);
      if (q.number >= 45 && q.number <= 49) {
        const slots = parseExamText(q.stem).filter(
          (t) => t.kind === "slot" || t.kind === "star",
        );
        assert.equal(slots.length, 4, q.id);
        assert.equal(
          q.order[slots.findIndex((t) => t.kind === "star")],
          q.answer,
          q.id,
        );
      }
      assert.equal(q.explanationStatus, "authored");
      assert.ok(
        q.explanation?.vi?.trim().length > 20,
        `Missing explanation: ${q.id}`,
      );
      const starAnswer = q.explanation.vi.match(/Ô sao (?:là )?([1-4])/);
      if (starAnswer)
        assert.equal(
          Number(starAnswer[1]),
          q.answer,
          `Wrong star in explanation: ${q.id}`,
        );
      assert.ok(
        q.sourcePages[0].pdfPage >= 5 + (e.day - 1) * 8 &&
          q.sourcePages[0].pdfPage < 13 + (e.day - 1) * 8,
      );
      assert.equal(q.answerPages[0].pdfPage, 167 + Math.floor((e.day - 1) / 2));
    }
    for (const path of [
      ...qs.map((q) => q.sourceImage),
      ...e.mondais.flatMap((m) => (m.passages || []).map((p) => p.sourceImage)),
    ]) {
      const image = fs.readFileSync(
        new URL("../public" + path, import.meta.url),
      );
      assert.equal(image.subarray(0, 4).toString(), "RIFF");
      assert.equal(image.subarray(8, 12).toString(), "WEBP");
      assert.ok(image.length > 500);
    }
  });
  test(`day ${e.day}: perfect, wrong, blank scores and serialized timeout`, () => {
    let a = createAttempt(e, "mock", undefined, now);
    for (const q of e.mondais.flatMap((m) => m.questions))
      a = answer(a, q.id, q.answer, now + 1);
    assert.equal(score(finish(a, now + 2)).percent, 100);
    const restored = decodeSession(
      JSON.stringify({ version: 1, attempt: a }),
      a.deadlineAt + 1,
    );
    assert.equal(restored.reason, "timeout");
    assert.equal(score(restored).correct, 54);
    const blank = createAttempt(e, "mock", undefined, now);
    assert.equal(score(finish(blank, now + 2)).blank, 54);
    let wrong = createAttempt(e, "drill", undefined, now);
    for (const q of e.mondais.flatMap((m) => m.questions))
      wrong = answer(wrong, q.id, (q.answer % 4) + 1, now + 1);
    assert.equal(score(finish(wrong, now + 2)).wrong, 54);
  });
}

test("malformed nested data returns validation errors rather than crashing the catalog", () => {
  const e = structuredClone(exam);
  e.mondais = [null];
  assert.ok(validateExam(e).length);
});

test("FIX-02 & FIX-03: planPracticeRound guarantees actualTotal === questionIds.length across all modes", async () => {
  const {
    buildPracticePool,
    planPracticeRound,
    canCreateStandardMock,
  } = await import("../src/lib/jlpt/practicePool.ts");
  const pool = buildPracticePool(corpus);

  // C01: Standard 9 Mondai = 54 questions
  const c01 = planPracticeRound(
    pool,
    { mode: "drill", mondais: [1, 2, 3, 4, 5, 6, 7, 8, 9], allocationMode: "standard" },
    () => 0.25,
  );
  assert.equal(c01.actualTotal, 54);
  assert.equal(c01.questionIds.length, 54);
  assert.equal(c01.canStart, true);

  // C02: Standard M1 + M2 = 10 questions
  const c02 = planPracticeRound(
    pool,
    { mode: "drill", mondais: [1, 2], allocationMode: "standard" },
    () => 0.25,
  );
  assert.equal(c02.actualTotal, 10);
  assert.equal(c02.questionIds.length, 10);

  // C03: Total 10 questions on M9 -> passage intact = 10 questions
  const c03 = planPracticeRound(
    pool,
    { mode: "drill", mondais: [9], allocationMode: "total", totalCount: 10 },
    () => 0.1,
  );
  assert.equal(c03.actualTotal, 10);
  assert.equal(c03.questionIds.length, 10);

  // C04: Total 10 questions on M8 + M9 when a 5-question passage is pulled in -> passage_expanded
  const c04 = planPracticeRound(
    pool,
    {
      mode: "drill",
      mondais: [9],
      allocationMode: "total",
      totalCount: 7,
    },
    () => 0.1,
  );
  assert.equal(c04.targetTotal, 7);
  assert.equal(c04.actualTotal, 10);
  assert.equal(c04.questionIds.length, 10);
  assert.equal(c04.reason, "passage_expanded");
  assert.match(c04.reasonMessage || "", /để giữ trọn đoạn văn Mondai 9/);

  // C05 & C06: Day 1 + M1 + 20 per mondai -> shortage (only 5 available)
  const c06 = planPracticeRound(pool, {
    mode: "drill",
    mondais: [1],
    allocationMode: "per_mondai",
    perMondaiCount: 20,
    dayFilter: 1,
  });
  assert.equal(c06.targetTotal, 20);
  assert.equal(c06.actualTotal, 5);
  assert.equal(c06.questionIds.length, 5);
  assert.equal(c06.reason, "shortage");
  assert.match(c06.reasonMessage || "", /Một số dạng không đủ 20 câu: Mondai 1 có 5\. Lượt này có 5 câu\./);

  // C07: 0 Mondai selected -> empty, canStart = false
  const c07 = planPracticeRound(pool, {
    mode: "drill",
    mondais: [],
    allocationMode: "standard",
  });
  assert.equal(c07.actualTotal, 0);
  assert.equal(c07.canStart, false);
  assert.equal(c07.reason, "empty");

  // M01–M05: Mock validation
  assert.equal(canCreateStandardMock(pool), true);
  assert.equal(canCreateStandardMock(exam), true);
  const brokenExam = structuredClone(exam);
  brokenExam.mondais = brokenExam.mondais.slice(0, 8);
  assert.equal(canCreateStandardMock(brokenExam), false);
  const m05 = planPracticeRound(brokenExam, { mode: "mock" });
  assert.equal(m05.canStart, false);
  assert.equal(m05.reason, "invalid_mock");
});


// ── Đặc tả 11/11: thông báo số câu (6.3), tìm kiếm (11.1), thời gian (8.5) ──
import { matchExamQuery } from "../src/lib/jlpt/examSearch.ts";
import { formatDuration, describeAttempt } from "../src/lib/jlpt/attemptLabels.ts";

test("6.3: round messages explain each shortage and expansion case", async () => {
  const { buildPracticePool, planPracticeRound } = await import(
    "../src/lib/jlpt/practicePool.ts"
  );
  const dir = new URL("../src/data/exams/jlpt/n2/kokusho-20days/", import.meta.url);
  const all = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")));
  const pool = buildPracticePool(all);
  const perMondai = planPracticeRound(pool, {
    mode: "drill",
    mondais: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    allocationMode: "per_mondai",
    perMondaiCount: 10,
    dayFilter: 1,
  });
  assert.equal(perMondai.actualTotal, 52);
  assert.match(perMondai.reasonMessage, /^Một số dạng không đủ 10 câu: Mondai 1 có 5/);
  assert.doesNotMatch(perMondai.reasonMessage, /Mondai 7 có/);
  assert.match(perMondai.reasonMessage, /Lượt này có 52 câu\.$/);
  const total = planPracticeRound(pool, {
    mode: "drill",
    mondais: [1],
    allocationMode: "total",
    totalCount: 50,
    dayFilter: 1,
  });
  assert.equal(total.reasonMessage, "Nguồn đã chọn chỉ có 5 câu, ít hơn 50 câu bạn chọn.");
  const exact = planPracticeRound(pool, {
    mode: "drill",
    mondais: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    allocationMode: "standard",
    dayFilter: 1,
  });
  assert.equal(exact.actualTotal, 54);
  assert.equal(exact.reasonMessage, undefined);
});

test("11.1: search matches day numbers exactly and ignores page numbers", () => {
  const book = "日本語能力試験 20日で合格 N2 文字・語彙・文法";
  const day = (n) => ({ day: n, title: `第${n}日 (Day ${n})`, subtitle: "文字・語彙・文法 · Trang 6–13" });
  const days = Array.from({ length: 20 }, (_, i) => day(i + 1));
  const hits = (q) => days.filter((d) => matchExamQuery(d, book, q)).map((d) => d.day);
  assert.deepEqual(hits("Day 1"), [1]);
  assert.deepEqual(hits("day 01"), [1]);
  assert.deepEqual(hits("Ngày 12"), [12]);
  assert.deepEqual(hits("12"), [12]);
  assert.deepEqual(hits("１２"), [12]);
  assert.equal(hits("文法").length, 20);
  assert.deepEqual(hits("zzznomatch"), []);
  assert.equal(hits("13").length, 1);
});

test("8.5 & 8.4: duration format and attempt labels", () => {
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(65_400), "01:05");
  assert.equal(formatDuration(50 * 60_000), "50:00");
  const a = createAttempt(exam, "mock", undefined, now);
  const d = describeAttempt(a, now + 60_000);
  assert.equal(d.title, "Ngày 01 · Bài có giờ");
  assert.equal(d.status, "Còn 49:00 · 0/54 câu");
});

test("13.2: a v1 session migrates to v2 keys and keeps answers", async () => {
  const data = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  const a = answer(createAttempt(exam, "drill"), exam.mondais[0].questions[0].id, 3);
  data.set(SESSION_KEY, JSON.stringify({ version: 1, attempt: a }));
  const store = await import("../src/lib/jlpt/tabSession.ts?migrate");
  const restored = store.getSession();
  assert.equal(restored.id, a.id);
  assert.equal(restored.answers[exam.mondais[0].questions[0].id], 3);
  assert.ok(data.has(SESSION_CONTENT_KEY) && data.has(SESSION_STATE_KEY));
  assert.equal(data.has(SESSION_KEY), false);
});

test("13.3: grouping 1,080 questions stays fast", async () => {
  const { buildPracticePool } = await import("../src/lib/jlpt/practicePool.ts");
  const dir = new URL("../src/data/exams/jlpt/n2/kokusho-20days/", import.meta.url);
  const all = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")));
  const pool = buildPracticePool(all);
  const a = createAttempt(pool, "drill");
  const t0 = performance.now();
  units(pool, a.questionIds);
  score(a);
  assert.ok(performance.now() - t0 < 50, `took ${performance.now() - t0} ms`);
});

test("13.1: lexicon search keeps recorded order and falls back to exact term/reading", async () => {
  const { createLexiconSearch } = await import("../src/lib/dictionary/lexiconSearch.ts");
  const e = (id, term, reading, subject = "vocab") => ({ id, term, reading, meaning: id, subject, template: "japanese", courseId: "c", courseName: "C" });
  const entries = [e("a", "仲", "なか", "kanji"), e("b", "仲", "なか"), e("c", "頃", "ころ")];
  const search = createLexiconSearch(entries, { "仲|": ["b", "a"] });
  assert.deepEqual(search({ query: "仲", language: "japanese" }).results.map((r) => r.id), ["b", "a"]);
  assert.deepEqual(search({ query: "ころ", language: "japanese" }).results.map((r) => r.id), ["c"]);
  assert.deepEqual(search({ query: "なか", language: "japanese", subject: "kanji" }).results.map((r) => r.id), ["a"]);
  assert.equal(search({ query: "無", language: "japanese" }).results.length, 0);
});

test("13.1: committed lexicon covers the analyzer queries of every question", () => {
  const lex = JSON.parse(fs.readFileSync(new URL("../src/data/dictionary/jlpt-n2-kokusho-lexicon.json", import.meta.url), "utf8"));
  assert.ok(lex.entries.length > 1000);
  const ids = new Set(lex.entries.map((x) => x.id));
  for (const list of Object.values(lex.queries)) for (const id of list) assert.ok(ids.has(id), id);
});

// ── Đợt 3: Mondai 9, câu hoàn chỉnh, ước lượng, lịch sử, nội dung ─────────
import {
  extractBlankSentence,
  buildCompletedSentence,
} from "../src/lib/jlpt/examText.ts";
import {
  attemptDurationMs,
  formatAttemptDuration,
} from "../src/lib/jlpt/attemptLabels.ts";
import { isEstimateEligible } from "../src/lib/jlpt/practicePool.ts";
import {
  HISTORY_MAX_ATTEMPTS,
  RADAR_AXES,
  accuracyByMondai,
  aggregateMistakeBuckets,
  buildAttemptHistoryRecord,
  buildAttemptSummary,
  computeSkillRadarAxes,
  computeTrendSeries,
  detectWeakMondais,
  filterAnalyticsAttempts,
  reconstructAttemptFromHistory,
  restoreAttemptFromDraft,
  sameAttemptKind,
  toCompactDraft,
} from "../src/lib/jlpt/historySummary.ts";
import { buildPracticePool } from "../src/lib/jlpt/practicePool.ts";
import {
  buildSeedsFromExams,
  createEndlessQueue,
  drawNextEndlessUnit,
  fillLookaheadBuffer,
  parseFreeScopeSearchParams,
  shuffleQuestionOptions,
} from "../src/lib/jlpt/freePracticeEngine.ts";
import { checkPatch, applyPatch } from "../scripts/jlpt/apply-enrichment.mjs";

test("JL-13: extractBlankSentence keeps the sentence with the blank and drops (注n)", () => {
  assert.equal(
    extractBlankSentence(
      "前の文。これが堅守のイタリア[[50]]だと、通は1－0を尊ぶという（注1）。次の文。",
      "50",
    ),
    "これが堅守のイタリア[[50]]だと、通は1－0を尊ぶという。",
  );
  assert.equal(extractBlankSentence("ô trống không có", "50"), null);
});

test("JL-13: every Mondai 9 question in the corpus resolves to a completed sentence", () => {
  for (const e of corpus) {
    const m = e.mondais.find((x) => x.type === "text_grammar");
    for (const q of m.questions) {
      const p = m.passages.find((x) => x.id === q.passageId) || m.passages[0];
      const s = buildCompletedSentence(q, "text_grammar", p.text);
      assert.ok(s && !s.includes("[["), `${q.id}: ${s}`);
      const first = examPlainText(q.options[q.answer - 1]).split(/[／/]/)[0].replace(/^[a-z]\s*/, "").trim();
      assert.ok(s.includes(first), `${q.id}: ${first}`);
    }
  }
});

test("JL-30: Mondai 6 completed sentence depends on mondaiType, not question number", () => {
  const q = { stem: "器用", options: ["a", "手先が器用な人", "c", "d"], answer: 2 };
  assert.equal(buildCompletedSentence(q, "usage"), "手先が器用な人");
  assert.equal(buildCompletedSentence({ ...q, number: 1 }, "usage"), "手先が器用な人");
  assert.equal(buildCompletedSentence(q, "kanji_reading"), "器用");
});

test("8.5: duration uses min(endedAt, deadlineAt) and marks timeout", () => {
  const a = createAttempt(exam, "mock", undefined, now);
  const done = { ...a, status: "submitted", endedAt: a.deadlineAt + 5000, reason: "timeout" };
  assert.equal(attemptDurationMs(done), a.deadlineAt - a.createdAt);
  assert.equal(formatAttemptDuration(done), `${exam.timeLimitMinutes || 50}:00 (hết giờ)`.replace(/^(\d):/, "0$1:"));
  const early = { ...a, status: "submitted", endedAt: a.createdAt + 65000, reason: "manual" };
  assert.equal(formatAttemptDuration(early), "01:05");
});

test("9.2: /60 estimate only for strict, unassisted, standard mock", () => {
  const a = { ...createAttempt(exam, "mock", undefined, now), strict: true };
  assert.equal(isEstimateEligible(a), true);
  assert.equal(isEstimateEligible({ ...a, strict: false }), false);
  assert.equal(isEstimateEligible({ ...a, strict: undefined }), false);
  assert.equal(isEstimateEligible({ ...a, assisted: [a.questionIds[0]] }), false);
  assert.equal(isEstimateEligible({ ...createAttempt(exam, "drill", undefined, now), strict: true }), false);
  const part = { ...createAttempt(exam, "mock", a.questionIds.slice(0, 10), now), strict: true };
  assert.equal(isEstimateEligible(part), false);
});

test("10.2: buildAttemptSummary keeps totals, wrong ids and no answers", () => {
  let a = { ...createAttempt(exam, "mock", undefined, now), strict: true };
  const qs = exam.mondais.flatMap((m) => m.questions);
  a = answer(a, qs[0].id, qs[0].answer, now + 1000);
  a = answer(a, qs[1].id, (qs[1].answer % 4) + 1, now + 2000);
  a = finish(a, now + 60000);
  const s = buildAttemptSummary(a);
  assert.equal(s.v, 1);
  assert.equal(s.total, 54);
  assert.equal(s.correct, 1);
  assert.equal(s.wrong, 1);
  assert.equal(s.blank, 52);
  assert.equal(s.wrongIds.length, 53);
  assert.ok(!s.wrongIds.includes(qs[0].id));
  assert.equal(s.byMondai["1"].total, 5);
  assert.equal(s.byMondai["1"].correct, 1);
  assert.equal(s.durationSec, 60);
  assert.equal(typeof s.estimate60, "number");
  assert.equal("answers" in s, false);
  assert.equal(sameAttemptKind(s, { ...s }), true);
  assert.equal(sameAttemptKind(s, { ...s, mode: "drill" }), false);
  assert.deepEqual(accuracyByMondai([s, s])[0], { mondai: 1, correct: 2, total: 10, percent: 20 });
});

test("14.4: checkPatch rejects incomplete patches and applyPatch keeps answers", () => {
  const raw = JSON.parse(fs.readFileSync(new URL("../imports/jlpt/kokusho-20days/enrichment/day01.json", import.meta.url), "utf8"));
  const before = JSON.parse(fs.readFileSync(new URL("../src/data/exams/jlpt/n2/kokusho-20days/day01.json", import.meta.url), "utf8"));
  assert.deepEqual(checkPatch(before, raw), []);
  const broken = structuredClone(raw);
  const firstId = Object.keys(broken.questions)[0];
  broken.questions[firstId].optionNotes = ["a", "b"];
  delete broken.questions[firstId].targetWord;
  const errs = checkPatch(before, broken);
  assert.ok(errs.some((e) => e.includes("optionNotes")));
  assert.ok(errs.some((e) => e.includes("targetWord")));
  const out = applyPatch(before, raw);
  for (let i = 0; i < before.mondais.length; i++)
    for (let j = 0; j < before.mondais[i].questions.length; j++) {
      const a = before.mondais[i].questions[j];
      const b = out.mondais[i].questions[j];
      assert.equal(b.id, a.id);
      assert.equal(b.answer, a.answer);
      assert.deepEqual(b.options, a.options);
    }
  assert.equal(out.contentRevision, 5);
});

const KANA = /^[぀-ゟ゠-ヿー・〜～\s]+$/;
const STEM_TYPES = new Set(["word_formation", "context", "grammar_form", "text_grammar"]);
for (const e of corpus.filter((x) => x.enrichmentStatus === "ai" || x.enrichmentStatus === "reviewed")) {
  test(`14.5: day ${e.day} content is complete`, () => {
    assert.equal(e.contentRevision, 5);
    for (const m of e.mondais) {
      for (const p of m.passages || []) assert.ok(p.translationVi?.trim(), p.id);
      for (const q of m.questions) {
        assert.ok(q.translationVi?.trim(), `${q.id} translationVi`);
        const notes = q.explanation?.optionNotes;
        assert.ok(Array.isArray(notes) && notes.length === 4 && notes.every((n) => n.trim()), `${q.id} optionNotes`);
        if (STEM_TYPES.has(m.type)) assert.ok(q.stemTranslationVi?.includes("…"), `${q.id} stemTranslationVi`);
        if (m.number <= 6) {
          const t = q.targetWord;
          assert.ok(t?.term && t.meaningVi && KANA.test(t.reading || ""), `${q.id} targetWord`);
        }
      }
    }
  });
}

test("8.4: attempt kind uses the retry flag, not picked question ids", () => {
  const qs = exam.mondais.flatMap((m) => m.questions);
  const all = qs.map((q) => q.id);
  // Lượt luyện cả ngày có danh sách câu nhưng không phải luyện lại
  assert.equal(describeAttempt({ ...createAttempt(exam, "drill", all, now), retry: false }, now).title.startsWith("Luyện lại"), false);
  const r = { ...createAttempt(exam, "drill", all.slice(0, 6), now), retry: true };
  assert.equal(describeAttempt(r, now).title, "Luyện lại · 6 câu");
  // Phiên cũ không có cờ: 54 câu của cả ngày không bị coi là luyện lại
  assert.equal(describeAttempt(createAttempt(exam, "mock", all, now), now).title, "Ngày 01 · Bài có giờ");
  assert.equal(describeAttempt(createAttempt(exam, "drill", all.slice(0, 6), now), now).title, "Luyện lại · 6 câu");
});

test("Stage 1: mock clock pauses on leave and resumes with remaining time preserved", () => {
  const start = now;
  const mock = createAttempt(exam, "mock", undefined, start);
  const beforePauseRemaining = mock.deadlineAt - (start + 10_000);
  // Tạm dừng sau 10 giây
  const paused = pauseAttempt(mock, start + 10_000);
  assert.equal(paused.pausedAt, start + 10_000);
  // Thời gian trôi 5 phút ngoài phòng thi vẫn không làm tụt giờ còn lại hay bị auto-submit timeout
  const checkedAway = reconcile(paused, start + 310_000);
  assert.equal(checkedAway.status, "in_progress");
  assert.equal(effectiveNow(checkedAway, start + 310_000), start + 10_000);
  assert.equal(
    describeAttempt(checkedAway, start + 310_000).status.startsWith("Tạm dừng"),
    true,
  );
  // Quay lại sau 5 phút: deadline dời +300_000ms, thời gian làm trừ pausedMs = 10s
  const resumed = resumeAttempt(checkedAway, start + 310_000);
  assert.equal(resumed.pausedAt, undefined);
  assert.equal(resumed.pausedMs, 300_000);
  assert.equal(resumed.deadlineAt - (start + 310_000), beforePauseRemaining);
  const raw = JSON.stringify({ version: 1, attempt: paused });
  const decoded = decodeSession(raw, start + 310_000);
  assert.equal(decoded?.pausedAt, start + 10_000);
});

test("Stage 1: retryKind produces clear retry labels and survives decodeSession", () => {
  const qs = exam.mondais.flatMap((m) => m.questions).slice(0, 4).map((q) => q.id);
  const wrongRetry = { ...createAttempt(exam, "drill", qs, now), retry: true, retryKind: "wrong" };
  const blankRetry = { ...createAttempt(exam, "drill", qs, now), retry: true, retryKind: "blank" };
  const flagRetry = { ...createAttempt(exam, "drill", qs, now), retry: true, retryKind: "flags" };
  assert.equal(describeAttempt(wrongRetry, now).title, "Ôn câu sai · 4 câu");
  assert.equal(describeAttempt(blankRetry, now).title, "Ôn câu bỏ trống · 4 câu");
  assert.equal(describeAttempt(flagRetry, now).title, "Ôn câu chưa chắc · 4 câu");
  const decoded = decodeSession(JSON.stringify({ version: 1, attempt: wrongRetry }), now + 10);
  assert.equal(decoded?.retryKind, "wrong");
});

test("Stage 2: RADAR_AXES covers all Mondais 1..9 and computes rolling analytics cleanly", () => {
  const covered = RADAR_AXES.flatMap((a) => a.mondais).sort((a, b) => a - b);
  assert.deepEqual(covered, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

  const t0 = now - 40 * 86400000;
  const tRecent = now - 2 * 86400000;
  const makeRec = (overrides) => ({
    v: 1,
    examId: "pool-N2-kokusho-n2-20days",
    bookId: "kokusho-n2-20days",
    level: "N2",
    mode: "drill",
    kind: "pool",
    title: "Luyện",
    config: null,
    strict: null,
    assistedCount: 0,
    total: 10,
    correct: 5,
    wrong: 5,
    blank: 0,
    byMondai: { 1: { total: 5, correct: 1 }, 9: { total: 5, correct: 4 } },
    wrongIds: [],
    durationSec: null,
    estimate60: null,
    contentRevision: 0,
    startedAt: tRecent - 1000,
    endedAt: tRecent,
    ...overrides,
  });

  const dayRec = makeRec({ kind: "day", endedAt: now - 1000 });
  const retryRec = makeRec({ retry: true, endedAt: now - 500 });
  const oldRec = makeRec({ endedAt: t0, byMondai: { 1: { total: 5, correct: 5 } } });
  const freshRec = makeRec({
    endedAt: tRecent,
    byMondai: { 1: { total: 5, correct: 1 }, 2: { total: 5, correct: 4 }, 9: { total: 5, correct: 4 } },
  });

  // Chỉ lọc kind === "pool" && retry !== true, thống nhất duy nhất theo 20 bài gần nhất
  assert.equal(HISTORY_MAX_ATTEMPTS, 20);
  const extraPool = Array.from({ length: 22 }, (_, idx) =>
    makeRec({
      endedAt: t0 + idx * 1000,
      correct: 6,
      total: 10,
      estimate60: idx % 2 === 0 ? 35 + idx : null,
    }),
  );
  const poolSample = [dayRec, retryRec, oldRec, ...extraPool, freshRec];
  const filtered20 = filterAnalyticsAttempts(poolSample);
  assert.equal(filtered20.length, 20);
  assert.equal(filtered20[0].endedAt, freshRec.endedAt);

  // Kể cả bài từ t0 (40 ngày trước) vẫn nằm trong thống kê 20 bài nếu chưa đủ 20 bài mới hơn
  const underCap = filterAnalyticsAttempts([dayRec, retryRec, oldRec, freshRec]);
  assert.deepEqual(underCap, [freshRec, oldRec]);

  // Kiểm tra đường xu hướng sắp từ cũ -> mới
  const trend = computeTrendSeries([freshRec, oldRec]);
  assert.equal(trend.length, 2);
  assert.equal(trend[0].endedAt, oldRec.endedAt);
  assert.equal(trend[1].endedAt, freshRec.endedAt);
  assert.equal(trend[1].percent, 50);

  const axes = computeSkillRadarAxes([freshRec]);
  assert.equal(axes.find((a) => a.id === "kanji")?.percent, 50); // M1(1/5)+M2(4/5) = 5/10 = 50%
  assert.equal(axes.find((a) => a.id === "reading")?.percent, 80); // M9(4/5) = 80%
  assert.equal(axes.find((a) => a.id === "context")?.percent, null);

  const weak = detectWeakMondais(accuracyByMondai([freshRec]), 2);
  assert.deepEqual(
    weak.map((w) => w.mondai),
    [1],
  );
});

test("Stage 2: aggregateMistakeBuckets separates wrong/blank/flags without auto-curing and collects allQuestionIds", () => {
  const t1 = now - 5000;
  const t2 = now - 1000;
  const firstPool = {
    v: 1,
    examId: "pool-N2-kokusho-n2-20days",
    bookId: "kokusho-n2-20days",
    level: "N2",
    mode: "mock",
    kind: "pool",
    title: "Mock",
    config: null,
    strict: true,
    assistedCount: 0,
    total: 3,
    correct: 1,
    wrong: 1,
    blank: 1,
    byMondai: {},
    questionIds: ["q1", "q2", "q3"],
    wrongIds: ["q2", "q3"],
    answeredWrongIds: ["q2"],
    blankIds: ["q3"],
    flagIds: ["q2"],
    durationSec: 60,
    estimate60: null,
    contentRevision: 0,
    startedAt: t1 - 60000,
    endedAt: t1,
  };
  // Bài theo ngày không được trộn vào kho sai của ngân hàng
  const dayWrong = { ...firstPool, kind: "day", questionIds: ["d1"], wrongIds: ["d1"], answeredWrongIds: ["d1"], blankIds: [], endedAt: t2 };
  // Bài mới hơn làm đúng q2 và q3 -> hai câu rời kho (R7: mỗi câu lấy kết quả gần nhất)
  const newerPoolRight = {
    ...firstPool,
    mode: "mock",
    correct: 3,
    wrong: 0,
    blank: 0,
    questionIds: ["q1", "q2", "q3"],
    wrongIds: [],
    answeredWrongIds: [],
    blankIds: [],
    flagIds: [],
    endedAt: t2,
  };

  const beforeRetry = aggregateMistakeBuckets([firstPool, dayWrong]);
  assert.deepEqual(beforeRetry, {
    wrongIds: ["q2"],
    blankIds: ["q3"],
    flagIds: ["q2"],
    allQuestionIds: ["q1", "q2", "q3"],
  });

  // Làm đúng ở bài mới KHÔNG làm câu sai cũ biến mất: chỉ mất khi bài cũ bị xóa/đẩy khỏi cửa sổ
  const withNewer = aggregateMistakeBuckets([firstPool, dayWrong, newerPoolRight]);
  assert.deepEqual(withNewer, {
    wrongIds: ["q2"],
    blankIds: ["q3"],
    flagIds: [],
    allQuestionIds: ["q1", "q2", "q3"],
  });

  // Lượt ôn lại (không còn được lưu) cũng không trừ câu sai
  const retryRightQ2 = {
    ...firstPool,
    retry: true,
    retryKind: "wrong",
    mode: "drill",
    questionIds: ["q2"],
    wrongIds: [],
    answeredWrongIds: [],
    blankIds: [],
    flagIds: [],
    endedAt: t2,
  };
  assert.deepEqual(aggregateMistakeBuckets([firstPool, retryRightQ2]), {
    wrongIds: ["q2"],
    blankIds: ["q3"],
    flagIds: [],
    allQuestionIds: ["q1", "q2", "q3"],
  });
  // Lượt ôn lại làm sai q2: q2 vẫn ở kho
  const retryWrongQ2 = { ...retryRightQ2, wrongIds: ["q2"], answeredWrongIds: ["q2"] };
  assert.deepEqual(aggregateMistakeBuckets([firstPool, retryWrongQ2]).wrongIds, ["q2"]);
});

test("Free Practice engine: shuffles options/optionNotes/M8 order/references and fills non-repeating lookahead buffer", () => {
  // 1. Đảo 4 đáp án câu thường + optionNotes + tham chiếu "Câu 3" / "câu 2 và 4" + giữ nguyên số không phải đáp án ("100 năm", "3%")
  const mockSeedRandom = (() => {
    const seq = [0.1, 0.2, 0.3];
    let idx = 0;
    return () => seq[idx++ % seq.length];
  })();
  const qNormal = {
    id: "test-m6",
    number: 28,
    stem: "テスト",
    options: ["opt1", "opt2", "opt3", "opt4"],
    answer: 1,
    explanation: {
      vi: "Câu 3 đúng ngữ cảnh 100 năm và 3%; câu 2 và 4 sai kết hợp.",
      optionNotes: ["n1", "n2", "n3", "n4"],
    },
  };
  const shuffledNormal = shuffleQuestionOptions(qNormal, "usage", mockSeedRandom);
  assert.equal(qNormal.answer, 1);
  assert.deepEqual(qNormal.options, ["opt1", "opt2", "opt3", "opt4"]);
  const newIndexOfOpt1 = shuffledNormal.options.indexOf("opt1") + 1;
  const newIndexOfOpt2 = shuffledNormal.options.indexOf("opt2") + 1;
  const newIndexOfOpt3 = shuffledNormal.options.indexOf("opt3") + 1;
  const newIndexOfOpt4 = shuffledNormal.options.indexOf("opt4") + 1;
  assert.equal(shuffledNormal.answer, newIndexOfOpt1);
  assert.equal(
    shuffledNormal.explanation.optionNotes[newIndexOfOpt3 - 1],
    "n3",
  );
  assert.ok(shuffledNormal.explanation.vi.includes(`Câu ${newIndexOfOpt3}`));
  assert.ok(
    shuffledNormal.explanation.vi.includes(
      `câu ${newIndexOfOpt2} và ${newIndexOfOpt4}`,
    ),
  );
  assert.ok(shuffledNormal.explanation.vi.includes("100 năm và 3%"));

  // 2. Kiểm tra trên toàn bộ 1.080 câu thật (đặc biệt 100 câu Mondai 8 ★): ghép câu theo order mới khớp 100% đáp án & chuỗi gốc
  const dir = new URL("../src/data/exams/jlpt/n2/kokusho-20days/", import.meta.url);
  const allExams = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(new URL(f, dir), "utf8")));
  let checkedOrderQuestions = 0;
  for (const ex of allExams) {
    for (const m of ex.mondais) {
      for (const q of m.questions) {
        const s = shuffleQuestionOptions(q, m.type, () => 0.42);
        assert.equal(s.options[s.answer - 1], q.options[q.answer - 1]);
        if (q.order?.length) {
          checkedOrderQuestions++;
          const origSentence = q.order.map((n) => q.options[n - 1]).join("|");
          const newSentence = s.order.map((n) => s.options[n - 1]).join("|");
          assert.equal(newSentence, origSentence);
          if (s.explanation?.vi && s.explanation.vi.includes("Vị trí ★ là")) {
            assert.ok(s.explanation.vi.includes(`Vị trí ★ là ${s.options[s.answer - 1]}`));
          assert.ok(!/(?:Ô sao|Ô ★|Vị trí ★)(?: thứ ba)? là [1-4]\b/.test(s.explanation.vi));
          }
        }
      }
    }
  }
  assert.equal(checkedOrderQuestions, 100);

  // 3. Queue trộn vô hạn + lookahead buffer không lặp liên tiếp qua ranh giới túi
  const seeds = buildSeedsFromExams(allExams.slice(0, 2), new Set([1, 9]));
  assert.ok(seeds.some((u) => u.mondai.number === 1));
  assert.ok(seeds.some((u) => u.mondai.number === 9 && Boolean(u.passage)));
  let qState = createEndlessQueue(seeds);
  const drawnIds = [];
  for (let i = 0; i < seeds.length + 3; i++) {
    const step = drawNextEndlessUnit(qState);
    qState = step.nextQueue;
    assert.ok(step.unit);
    if (drawnIds.length > 0 && seeds.length > 1) {
      assert.notEqual(step.unit.sourceId, drawnIds[drawnIds.length - 1]);
    }
    drawnIds.push(step.unit.sourceId);
  }

  const filled = fillLookaheadBuffer(qState, [], 5);
  assert.equal(filled.buffer.length, 5);

  const parsed = parseFreeScopeSearchParams("?level=n2&books=b1,b2&mondais=1,8,8,99");
  assert.deepEqual(parsed, {
    level: "N2",
    bookIds: ["b1", "b2"],
    examIds: null,
    mondais: [1, 8],
  });

  const parsedExams = parseFreeScopeSearchParams("?level=n2&exams=d01,d03,d01&mondais=2");
  assert.deepEqual(parsedExams, {
    level: "N2",
    bookIds: null,
    examIds: ["d01", "d03"],
    mondais: [2],
  });
});

test("Stage 2: history record & compact draft round-trip past 24h TTL safely", () => {
  const pool = buildPracticePool([exam]);
  assert.ok(pool);
  const qs = pool.mondais.flatMap((m) => m.questions).slice(0, 5).map((q) => q.id);

  // Bài theo ngày đang làm cũng có bản nháp (không mất khi đóng tab) và khôi phục hợp lệ
  const dayQ = exam.mondais[0].questions[0].id;
  const dayAttempt = answer(createAttempt(exam, "drill", [dayQ], now - 5000), dayQ, 2, now - 4000);
  const dayDraft = toCompactDraft(dayAttempt, now);
  assert.ok(dayDraft);
  assert.equal(dayDraft.pool, false);
  const dayRestored = restoreAttemptFromDraft(dayDraft, exam, now);
  assert.ok(dayRestored);
  assert.equal(dayRestored.answers[dayQ], 2);
  assert.ok(decodeSession(JSON.stringify({ version: 1, attempt: dayRestored }), now));
  // Bài đã nộp thì không có bản nháp
  assert.equal(toCompactDraft(finish(dayAttempt, now), now), null);

  // In-progress pooled mock tạo bản nháp gọn nhẹ và khôi phục được kể cả khi tạo từ 3 ngày trước
  const oldStart = now - 3 * 86400000;
  let mockAttempt = createAttempt(pool, "mock", qs, oldStart);
  mockAttempt = answer(mockAttempt, qs[0], 1, oldStart + 1000);
  const draft = toCompactDraft(mockAttempt, oldStart + 10 * 60000);
  assert.ok(draft);
  assert.equal("exam" in draft, false);
  const restored = restoreAttemptFromDraft(draft, pool, now);
  assert.ok(restored);
  assert.equal(restored.answers[qs[0]], 1);
  assert.ok(decodeSession(JSON.stringify({ version: 1, attempt: restored }), now));

  // Submitted history record khôi phục xem lại kết quả kể cả khi >24h TTL
  const submitted = {
    ...finish(mockAttempt, oldStart + 12 * 60000),
    retry: false,
  };
  const record = buildAttemptHistoryRecord(submitted);
  assert.equal(record.choices?.[qs[0]], 1);
  const replayed = reconstructAttemptFromHistory({ ...record, id: "hist-1" }, pool, now);
  assert.ok(replayed);
  assert.equal(replayed.id, "hist-1");
  assert.equal(replayed.status, "submitted");
  assert.equal(replayed.answers[qs[0]], 1);
  assert.ok(decodeSession(JSON.stringify({ version: 1, attempt: replayed }), now));
});

// ---------- Một nguồn cho bài làm: ô bài dở, danh sách Đang làm, quy tắc bắt đầu bài mới ----------
import {
  slotOf,
  attemptSlot,
  draftSlot,
  planNewAttempt,
  buildUnfinishedList,
} from "../src/lib/jlpt/attemptSlots.ts";
import { isValidDraft } from "../src/lib/jlpt/historySummary.ts";
import { classifyFirebaseError } from "../src/lib/jlpt/firebaseErrors.ts";
import {
  describeAttempt as describeAttemptLabel,
  resumeButtonLabel,
} from "../src/lib/jlpt/attemptLabels.ts";

test("slots: one unfinished attempt per kind (pool mock, pool drill, retry, each day)", () => {
  const pool = buildPracticePool([exam]);
  assert.equal(slotOf({ examId: pool.id, isPool: true, mode: "mock" }), `mock:${pool.id}`);
  assert.equal(slotOf({ examId: pool.id, isPool: true, mode: "drill" }), `drill:${pool.id}`);
  assert.equal(slotOf({ examId: pool.id, isPool: true, mode: "drill", retry: true }), `retry:${pool.id}`);
  // Bài theo ngày: làm có giờ hay luyện đều chung một ô
  assert.equal(slotOf({ examId: exam.id, isPool: false, mode: "mock" }), `day:${exam.id}`);
  assert.equal(slotOf({ examId: exam.id, isPool: false, mode: "drill" }), `day:${exam.id}`);
  const mock = createAttempt(pool, "mock", undefined, now);
  assert.equal(attemptSlot(mock), `mock:${pool.id}`);
  const draft = toCompactDraft(mock, now);
  assert.equal(draftSlot(draft), `mock:${pool.id}`);
  // Bản nháp cũ chưa có cờ pool vẫn nhận ra nhờ tiền tố "pool-"
  const legacy = { ...draft };
  delete legacy.pool;
  assert.equal(draftSlot(legacy), `mock:${pool.id}`);
});

test("start guard: same kind asks then drops; other kind kept as draft (signed in) or warned (guest)", () => {
  const pool = buildPracticePool([exam]);
  const mockSlot = `mock:${pool.id}`;
  const liveMock = createAttempt(pool, "mock", undefined, now);
  const same = planNewAttempt({ current: liveMock, slot: mockSlot, signedIn: true, drafts: [], now });
  assert.ok(same.question?.includes("sẽ bị xóa và không tính điểm"));
  assert.deepEqual(same.dropIds, [liveMock.id]);
  assert.equal(same.keepLive, null);

  const liveDay = createAttempt(exam, "drill", undefined, now);
  const other = planNewAttempt({ current: liveDay, slot: mockSlot, signedIn: true, drafts: [], now });
  assert.equal(other.question, null);
  assert.equal(other.keepLive?.id, liveDay.id);

  const guest = planNewAttempt({ current: liveDay, slot: mockSlot, signedIn: false, drafts: [], now });
  assert.ok(guest.question?.includes("sẽ mất vì bạn chưa đăng nhập"));
  assert.equal(guest.keepLive, null);

  // Bài dở cùng loại chỉ còn ở bản nháp (tab đang trống) vẫn phải hỏi và bị xóa
  const draft = toCompactDraft(liveMock, now);
  const fromDraft = planNewAttempt({ current: null, slot: mockSlot, signedIn: true, drafts: [draft], now });
  assert.ok(fromDraft.question);
  assert.deepEqual(fromDraft.dropIds, [liveMock.id]);

  // Kết quả đã nộp trong tab không chặn bài mới
  const submitted = finish(liveMock, now + 1000);
  assert.equal(planNewAttempt({ current: submitted, slot: mockSlot, signedIn: true, drafts: [], now }).question, null);
});

test("unfinished list: tab copy and its draft appear once; drafts keep their own status", () => {
  const pool = buildPracticePool([exam]);
  const live = createAttempt(pool, "mock", undefined, now);
  const liveDraft = toCompactDraft(live, now);
  const day = createAttempt(exam, "drill", undefined, now - 5000);
  const dayDraft = toCompactDraft(day, now - 4000);
  const list = buildUnfinishedList(live, [liveDraft, dayDraft], now + 1000);
  assert.equal(list.length, 2);
  assert.equal(list[0].id, live.id);
  assert.equal(list[0].live, true);
  assert.equal(list[0].kindLabel, "Thi thử");
  assert.equal(list[1].live, false);
  assert.equal(list[1].kindLabel, "Theo ngày");
  // Không có bài trong tab: bản nháp thi thử hiện "Tạm dừng · Còn …"
  const pausedDraft = toCompactDraft(pauseAttempt(live, now + 3000), now + 4000);
  const onlyDrafts = buildUnfinishedList(null, [pausedDraft], now + 5000);
  assert.match(onlyDrafts[0].status, /^Tạm dừng · Còn 49:57 · 0\/54 câu$/);
  assert.equal(onlyDrafts[0].resumeLabel, "Làm tiếp · tạm dừng 49:57");
});

test("remaining time shows the same second everywhere (no 1-second mismatch)", () => {
  const pool = buildPracticePool([exam]);
  const a = pauseAttempt(createAttempt(pool, "mock", undefined, now), now + 2400);
  const status = describeAttemptLabel(a, now + 9999).status;
  assert.match(status, /Còn 49:58/);
  assert.equal(resumeButtonLabel(a, now + 9999), "Làm tiếp · tạm dừng 49:58");
});

test("start guard warns before replacing a result that could not be saved to the account", () => {
  const pool = buildPracticePool([exam]);
  const done = finish(createAttempt(pool, "mock", undefined, now), now + 60000);
  const slot = `mock:${pool.id}`;
  const warned = planNewAttempt({ current: done, slot, signedIn: true, drafts: [], unsavedResult: true, now });
  assert.ok(warned.question?.includes("chưa lưu được lên tài khoản sẽ mất"));
  const saved = planNewAttempt({ current: done, slot, signedIn: true, drafts: [], unsavedResult: false, now });
  assert.equal(saved.question, null);
});

test("drafts read back from Firebase are validated", () => {
  const pool = buildPracticePool([exam]);
  const d = toCompactDraft(createAttempt(pool, "drill", undefined, now), now);
  assert.equal(isValidDraft(d), true);
  assert.equal(isValidDraft({ id: "x", examId: "y", mode: "drill", questionIds: [] }), false);
  assert.equal(isValidDraft(null), false);
});

test("firebase errors are classified so the UI can say why saving failed", () => {
  assert.equal(classifyFirebaseError({ code: "permission-denied" }), "permission");
  assert.equal(classifyFirebaseError({ code: "firestore/permission-denied" }), "permission");
  assert.equal(classifyFirebaseError({ message: "Missing or insufficient permissions." }), "permission");
  assert.equal(classifyFirebaseError({ code: "unavailable" }), "offline");
  assert.equal(classifyFirebaseError({ code: "resource-exhausted" }), "quota");
  assert.equal(classifyFirebaseError(new Error("boom")), "unknown");
});

test("Ôn tập: câu sai giữ nguyên cho tới khi bài chứa nó bị xóa/đẩy khỏi cửa sổ", () => {
  const base = {
    v: 1, examId: "e", bookId: "b", level: "N2", mode: "mock", kind: "pool", title: "t", config: null,
    strict: true, assistedCount: 0, total: 2, correct: 0, wrong: 2, blank: 0, byMondai: {},
    wrongIds: ["q1", "q2"], questionIds: ["q1", "q2"], answeredWrongIds: ["q1", "q2"], blankIds: [],
    durationSec: 100, estimate60: null, contentRevision: 1, startedAt: 1000, endedAt: 2000,
  };
  assert.deepEqual(aggregateMistakeBuckets([base]).wrongIds.sort(), ["q1", "q2"]);
  // Bài mới làm đúng cả hai câu: vẫn còn trong kho vì bài cũ còn trong danh sách
  const later = { ...base, wrongIds: [], answeredWrongIds: [], endedAt: 3000 };
  assert.deepEqual(aggregateMistakeBuckets([base, later]).wrongIds.sort(), ["q1", "q2"]);
  // Bài cũ bị xóa / đẩy ra khỏi cửa sổ thì hết
  assert.deepEqual(aggregateMistakeBuckets([later]).wrongIds, []);
});

import { seededRandom, fisherYatesShuffle as fyShuffle, shuffleQuestionOptions as shuffleOpts } from "../src/lib/jlpt/freePracticeEngine.ts";

test("LT-3: cùng hạt giống cho cùng thứ tự câu và cùng thứ tự đáp án trộn", () => {
  const a = fyShuffle([1, 2, 3, 4, 5, 6, 7, 8], seededRandom(12345));
  const b = fyShuffle([1, 2, 3, 4, 5, 6, 7, 8], seededRandom(12345));
  assert.deepEqual(a, b);
  const q = { id: "x", number: 1, prompt: "p", options: ["a", "b", "c", "d"], answer: 2 };
  const s1 = shuffleOpts(q, "vocab", seededRandom(777));
  const s2 = shuffleOpts(q, "vocab", seededRandom(777));
  assert.deepEqual(s1.options, s2.options);
  assert.equal(s1.answer, s2.answer);
  assert.equal(s1.options[s1.answer - 1], "b");
});

test("Câu sắp xếp ★: lời giải không ghi cứng số thứ tự đáp án (đề trộn đáp án vẫn đúng)", () => {
  const dir = new URL("../src/data/exams/jlpt/n2/kokusho-20days/", import.meta.url);
  let checked = 0;
  for (const f of fs.readdirSync(dir).filter((n) => /^day\d+\.json$/.test(n))) {
    const exam = JSON.parse(fs.readFileSync(new URL(f, dir), "utf8"));
    for (const m of exam.mondais) {
      for (const q of m.questions) {
        if (!q.stem?.includes("★")) continue;
        checked++;
        const vi = q.explanation?.vi ?? "";
        assert.ok(!/Ghép\s*\d\s*[→>]/.test(vi), `${f} q${q.number}: còn "Ghép 4→2→1→3"`);
        assert.ok(!/Ô sao(?: thứ ba)? là \d/.test(vi), `${f} q${q.number}: còn "Ô sao là N"`);
        assert.ok(!/\([1-4]\)/.test(vi), `${f} q${q.number}: còn "(N)"`);
      }
    }
  }
  assert.equal(checked, 100);
});
