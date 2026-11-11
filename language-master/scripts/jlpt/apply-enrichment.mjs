// Ghi file vá nội dung (bản dịch, lời giải từng phương án, từ trọng tâm) vào đề — mục 14.4.
// Chạy: node scripts/jlpt/apply-enrichment.mjs day01 [day02 ...] | all
// File vá: imports/jlpt/kokusho-20days/enrichment/dayXX.json
// {
//   "examId": "kokusho-n2-20days-d01",
//   "questions": { "<id>": { "translationVi", "stemTranslationVi"?, "optionNotes": [4], "targetWord"?, "explanationVi"? } },
//   "passages": { "<id>": { "translationVi" } }
// }
// Không đổi đáp án, ID, phương án. Đặt enrichmentStatus "ai" (giữ "reviewed" nếu đã duyệt), contentRevision 5.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const patchDir = join(root, "imports/jlpt/kokusho-20days/enrichment");
const examDir = join(root, "src/data/exams/jlpt/n2/kokusho-20days");

const STEM_REQUIRED = new Set(["word_formation", "context", "grammar_form", "text_grammar"]);
const TARGET_REQUIRED = new Set([
  "kanji_reading",
  "kanji_writing",
  "word_formation",
  "context",
  "synonym",
  "usage",
]);
const KANA_ONLY = /^[぀-ゟ゠-ヿー・〜～\s]+$/;
const EXPLANATION_SOURCE =
  "AI-authored Vietnamese notes and translations; answer key checked against source book";

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

/** Trả về danh sách lỗi; rỗng là hợp lệ. Xuất ra để test dùng lại. */
export function checkPatch(exam, patch) {
  const errors = [];
  if (patch.examId !== exam.id) errors.push(`examId ${patch.examId} ≠ ${exam.id}`);
  const byId = new Map();
  for (const m of exam.mondais) for (const q of m.questions) byId.set(q.id, { q, m });
  const passages = new Map();
  for (const m of exam.mondais) for (const p of m.passages || []) passages.set(p.id, p);

  for (const id of Object.keys(patch.questions || {}))
    if (!byId.has(id)) errors.push(`${id}: không có trong đề`);
  for (const id of Object.keys(patch.passages || {}))
    if (!passages.has(id)) errors.push(`đoạn ${id}: không có trong đề`);

  for (const [id, { m }] of byId) {
    const e = patch.questions?.[id];
    if (!e) {
      errors.push(`${id}: thiếu trong file vá`);
      continue;
    }
    if (!nonEmpty(e.translationVi)) errors.push(`${id}: thiếu translationVi`);
    if (STEM_REQUIRED.has(m.type)) {
      if (!nonEmpty(e.stemTranslationVi)) errors.push(`${id}: thiếu stemTranslationVi`);
      else if (!e.stemTranslationVi.includes("…"))
        errors.push(`${id}: stemTranslationVi phải có "…"`);
    }
    if (!Array.isArray(e.optionNotes) || e.optionNotes.length !== 4)
      errors.push(`${id}: optionNotes phải đủ 4`);
    else
      e.optionNotes.forEach((n, i) => {
        if (!nonEmpty(n)) errors.push(`${id}: ghi chú ${i + 1} rỗng`);
        else if (n.length > 160) errors.push(`${id}: ghi chú ${i + 1} dài ${n.length} > 160`);
        else if (/^\s*(Đúng|Sai)\b/i.test(n))
          errors.push(`${id}: ghi chú ${i + 1} không được mở đầu bằng Đúng/Sai`);
      });
    if (TARGET_REQUIRED.has(m.type)) {
      const t = e.targetWord;
      if (!t || !nonEmpty(t.term) || !nonEmpty(t.reading) || !nonEmpty(t.meaningVi))
        errors.push(`${id}: thiếu targetWord (term, reading, meaningVi)`);
      else {
        if (!KANA_ONLY.test(t.reading)) errors.push(`${id}: reading "${t.reading}" phải chỉ gồm kana`);
        if (t.meaningVi.length > 60) errors.push(`${id}: meaningVi dài ${t.meaningVi.length} > 60`);
      }
    } else if (e.targetWord) errors.push(`${id}: dạng ${m.type} không dùng targetWord`);
    if (e.explanationVi !== undefined && !nonEmpty(e.explanationVi))
      errors.push(`${id}: explanationVi rỗng`);
  }
  for (const [pid] of passages)
    if (!nonEmpty(patch.passages?.[pid]?.translationVi))
      errors.push(`đoạn ${pid}: thiếu translationVi`);
  return errors;
}

/** Áp file vá; giữ thứ tự khóa hiện có, thêm khóa mới ngay sau khóa liên quan. */
export function applyPatch(exam, patch) {
  const out = structuredClone(exam);
  const insertAfter = (obj, afterKey, key, value) => {
    if (key in obj) {
      obj[key] = value;
      return obj;
    }
    const entries = Object.entries(obj);
    const idx = entries.findIndex(([k]) => k === afterKey);
    entries.splice(idx >= 0 ? idx + 1 : entries.length, 0, [key, value]);
    return Object.fromEntries(entries);
  };
  for (const m of out.mondais) {
    m.questions = m.questions.map((q) => {
      const e = patch.questions[q.id];
      let next = { ...q };
      next = insertAfter(next, "questionKana", "translationVi", e.translationVi.trim());
      if (e.stemTranslationVi)
        next = insertAfter(next, "translationVi", "stemTranslationVi", e.stemTranslationVi.trim());
      if (e.targetWord) {
        const t = e.targetWord;
        next = insertAfter(next, "stemTranslationVi" in next ? "stemTranslationVi" : "translationVi", "targetWord", {
          term: t.term.trim(),
          reading: t.reading.trim(),
          ...(nonEmpty(t.hanViet) ? { hanViet: t.hanViet.trim() } : {}),
          meaningVi: t.meaningVi.trim(),
          ...(nonEmpty(t.affix) ? { affix: t.affix.trim() } : {}),
        });
      } else if ("targetWord" in next) delete next.targetWord;
      next.explanation = {
        ...(next.explanation || {}),
        ...(e.explanationVi ? { vi: e.explanationVi.trim() } : {}),
        optionNotes: e.optionNotes.map((n) => n.trim()),
      };
      return next;
    });
    if (m.passages)
      m.passages = m.passages.map((p) => ({
        ...p,
        translationVi: patch.passages[p.id].translationVi.trim(),
      }));
  }
  out.enrichmentStatus = exam.enrichmentStatus === "reviewed" ? "reviewed" : "ai";
  out.contentRevision = 5;
  out.explanationSource = EXPLANATION_SOURCE;
  return out;
}

function run(day) {
  const patchFile = join(patchDir, `${day}.json`);
  const examFile = join(examDir, `${day}.json`);
  if (!existsSync(patchFile)) throw new Error(`Không có ${patchFile}`);
  const exam = JSON.parse(readFileSync(examFile, "utf8"));
  const patch = JSON.parse(readFileSync(patchFile, "utf8"));
  const errors = checkPatch(exam, patch);
  if (errors.length) {
    console.error(`${day}: ${errors.length} lỗi`);
    for (const e of errors.slice(0, 40)) console.error("  - " + e);
    return false;
  }
  const next = applyPatch(exam, patch);
  writeFileSync(examFile, JSON.stringify(next, null, 2) + "\n");
  console.log(`${day}: đã ghi ${Object.keys(patch.questions).length} câu`);
  return true;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let days = process.argv.slice(2);
  if (days.includes("all"))
    days = readdirSync(patchDir)
      .filter((f) => /^day\d+\.json$/.test(f))
      .map((f) => f.replace(".json", ""))
      .sort();
  if (!days.length) {
    console.error("Dùng: node scripts/jlpt/apply-enrichment.mjs day01 [day02 ...] | all");
    process.exit(1);
  }
  const ok = days.map(run).every(Boolean);
  process.exit(ok ? 0 : 1);
}
