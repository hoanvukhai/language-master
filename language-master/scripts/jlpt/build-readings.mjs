// Tạo bảng cách đọc hiragana cho câu hoàn chỉnh của từng câu hỏi (Mondai 1–8) bằng kuromoji (IPADIC).
// Chạy thủ công một lần khi đề đổi:  KUROMOJI_DIR=/đường/dẫn/node_modules/kuromoji node scripts/jlpt/build-readings.mjs
// (kuromoji không nằm trong dependencies của app; chỉ cần khi tạo lại bảng).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { buildCompletedSentence } from "../../src/lib/jlpt/examText.ts";

const dir = process.env.KUROMOJI_DIR;
if (!dir) throw new Error("Cần đặt KUROMOJI_DIR trỏ tới thư mục kuromoji đã cài");
const require = createRequire(path.join(dir, "package.json"));
const kuromoji = require(dir);

const root = "src/data/exams/jlpt";
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".json")) files.push(p);
  }
})(root);

const kataToHira = (s) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const hasKanji = (s) => /[一-鿿々]/.test(s);

kuromoji.builder({ dicPath: path.join(dir, "dict") }).build((err, tokenizer) => {
  if (err) throw err;
  const out = {};
  for (const f of files) {
    const exam = JSON.parse(fs.readFileSync(f, "utf8"));
    for (const m of exam.mondais || []) {
      if (m.type === "text_grammar") continue; // đoạn văn xử lý riêng
      for (const q of m.questions || []) {
        const sentence = buildCompletedSentence(q, m.type);
        if (!sentence) continue;
        const clean = sentence.replace(/[\[\]★]/g, "");
        const reading = tokenizer
          .tokenize(clean)
          .map((t) => (hasKanji(t.surface_form) && t.reading && t.reading !== "*" ? kataToHira(t.reading) : t.surface_form))
          .join("");
        if (reading && reading !== clean) out[q.id] = reading;
      }
    }
  }
  fs.writeFileSync(path.join(root, "readings.json"), JSON.stringify(out));
  console.log("Đã ghi", Object.keys(out).length, "câu");
});
