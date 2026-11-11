// Chuyển bản soạn dạng văn bản gọn thành file vá JSON (mục 14.4).
// Chạy: node scripts/jlpt/compile-enrichment.mjs day02 [day03 ...]
// Nguồn: imports/jlpt/kokusho-20days/enrichment/src/dayXX.txt
//
// Định dạng:
//   @m1_01                      ← đuôi ID câu (sau "kokusho_n2_dXX_")
//   T: bản dịch câu hoàn chỉnh
//   S: bản dịch trước khi trả lời (có "…")      (Mondai 3, 4, 7, 9)
//   W: term | reading | HÁN VIỆT | nghĩa | affix (Mondai 1–6; bỏ trống ô không dùng)
//   E: lời giải mới (tùy chọn, thay explanation.vi)
//   1: ghi chú phương án 1 … 4: ghi chú phương án 4
//   @P p01 | @P d02-passage     ← đuôi "pNN" hoặc ID đầy đủ của đoạn văn; các dòng sau là bản dịch
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const base = join(root, "imports/jlpt/kokusho-20days/enrichment");

export function compile(day, text) {
  const n = String(day).padStart(2, "0");
  const prefix = `kokusho_n2_d${n}_`;
  const out = { examId: `kokusho-n2-20days-d${n}`, questions: {}, passages: {} };
  let cur = null;
  let passage = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith("@P ")) {
      const tok = line.slice(3).trim();
      // "p01" → kokusho_n2_dXX_p01; ID khác (vd "d02-passage") giữ nguyên
      passage = /^p\d+$/.test(tok) ? prefix + tok : tok;
      out.passages[passage] = { translationVi: "" };
      cur = null;
      continue;
    }
    if (line.startsWith("@")) {
      passage = null;
      const id = prefix + line.slice(1).trim();
      cur = out.questions[id] = { optionNotes: [] };
      continue;
    }
    if (passage) {
      const p = out.passages[passage];
      p.translationVi = p.translationVi ? `${p.translationVi}\n${line}` : line;
      continue;
    }
    if (!cur || !line.trim()) continue;
    const m = line.match(/^([TSWE1-4]):\s?(.*)$/);
    if (!m) throw new Error(`Dòng không hiểu: ${line}`);
    const [, k, v] = m;
    if (k === "T") cur.translationVi = v;
    else if (k === "S") cur.stemTranslationVi = v;
    else if (k === "E") cur.explanationVi = v;
    else if (k === "W") {
      const [term, reading, hanViet, meaningVi, affix] = v.split("|").map((x) => x.trim());
      cur.targetWord = { term, reading, meaningVi };
      if (hanViet) cur.targetWord.hanViet = hanViet;
      if (affix) cur.targetWord.affix = affix;
    } else cur.optionNotes[Number(k) - 1] = v;
  }
  for (const p of Object.values(out.passages)) p.translationVi = p.translationVi.trim();
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(base, { recursive: true });
  for (const day of process.argv.slice(2)) {
    const num = Number(day.replace(/\D/g, ""));
    const text = readFileSync(join(base, "src", `day${String(num).padStart(2, "0")}.txt`), "utf8");
    const patch = compile(num, text);
    writeFileSync(
      join(base, `day${String(num).padStart(2, "0")}.json`),
      JSON.stringify(patch, null, 2) + "\n",
    );
    console.log(`day${String(num).padStart(2, "0")}: ${Object.keys(patch.questions).length} câu`);
  }
}
