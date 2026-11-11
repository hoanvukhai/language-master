// Sinh lexicon thu gọn cho phần Luyện đề (JL-04).
// Chạy: node scripts/jlpt/build-lexicon.mjs
// Phân tích mọi câu hỏi bằng từ điển đầy đủ, ghi lại các mục khớp chính xác
// (term hoặc reading trùng truy vấn) — đúng những gì sentenceAnalyzer dùng.
// Bỏ ví dụ/cấp độ vì bảng phân tích câu không hiển thị; hộp tra từ dùng từ điển đầy đủ.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const examDir = join(root, "src/data/exams/jlpt/n2/kokusho-20days");
const outFile = join(root, "src/data/dictionary/jlpt-n2-kokusho-lexicon.json");

// localStorage giả để customCourseService chạy được ngoài trình duyệt
globalThis.localStorage ??= {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

const server = await createServer({
  root,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});

try {
  const dict = await server.ssrLoadModule("/src/lib/dictionary/localDictionaryIndex.ts");
  const analyzer = await server.ssrLoadModule("/src/lib/jlpt/sentenceAnalyzer.ts");

  const kept = new Map();
  // Thứ tự kết quả theo từng truy vấn (giữ đúng thứ tự xếp hạng của từ điển đầy đủ)
  const queries = {};
  analyzer.setDictionarySearch((filter) => {
    const res = dict.searchGlobalDictionary(filter);
    const q = filter.query.trim();
    const key = `${q}|${filter.subject || ""}`;
    const ids = [];
    for (const e of res.results) {
      if (e.term !== q && e.reading !== q) continue;
      if (e.isCustom) continue;
      ids.push(e.id);
      if (!kept.has(e.id)) {
        kept.set(e.id, {
          id: e.id,
          term: e.term,
          reading: e.reading,
          meaning: e.meaning,
          template: e.template,
          subject: e.subject,
          courseId: e.courseId,
          courseName: e.courseName,
        });
      }
    }
    if (ids.length) queries[key] = ids;
    return res;
  });

  let questions = 0;
  const files = readdirSync(examDir).filter((f) => /^day\d+\.json$/.test(f)).sort();
  for (const f of files) {
    const exam = JSON.parse(readFileSync(join(examDir, f), "utf8"));
    for (const m of exam.mondais) {
      for (const q of m.questions || []) {
        analyzer.analyzeSentenceComponents(q.stem, q.sentenceBreakdown, q.explanation?.vi);
        if (q.targetWord?.kanji) analyzer.lookupWordInDictionary(q.targetWord.kanji);
        questions++;
      }
    }
  }

  const entries = [...kept.values()].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(outFile, JSON.stringify({ version: 2, entries, queries }) + "\n");
  const kb = Math.round(readFileSync(outFile).length / 1024);
  console.log(`jlpt-n2-kokusho-lexicon.json: ${entries.length} mục từ ${questions} câu (${kb} KB)`);
} finally {
  await server.close();
}
