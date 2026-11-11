import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createAttempt,
  answer,
  finish,
  reconcile,
  decodeSession,
  score,
  units,
  validateExam,
  TTL,
  SESSION_KEY,
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
    decodeSession(JSON.stringify({ version: 2, attempt: a }), now),
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
  assert.ok(data.has(SESSION_KEY));
  const b = createAttempt(exam, "drill");
  blocked = true;
  store.setSession(b);
  assert.equal(store.getSession().id, b.id);
  assert.equal(data.has(SESSION_KEY), false);
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
  assert.equal(d.title, "第1日 (Day 1) · Bài có giờ");
  assert.equal(d.status, "Còn 49:00 · 0/54 câu");
});
