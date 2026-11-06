const { createWorker } = require("tesseract.js");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const root = path.resolve("imports/jlpt/kokusho-20days/raw");
  const worker = await createWorker("jpn", 1, {
    workerPath: path.resolve("scripts/ocr-worker.cjs"),
    langPath: path.resolve("imports/jlpt/models"),
    cachePath: path.resolve("imports/jlpt/models"),
    gzip: false,
  });
  await worker.setParameters({
    tessedit_pageseg_mode: "3",
    preserve_interword_spaces: "1",
  });
  for (const n of process.argv.slice(2).map(Number)) {
    const target = path.join(root, `tess-${String(n).padStart(3, "0")}.json`);
    if (fs.existsSync(target)) continue;
    const { data } = await worker.recognize(
      path.join(root, `page-${String(n).padStart(3, "0")}.png`),
      {},
      { text: true, blocks: true, tsv: true },
    );
    const blocks = (data.blocks || []).map((b) => ({
      paragraphs: b.paragraphs.map((p) => ({
        lines: p.lines.map((l) => ({
          words: l.words.map((w) => ({
            text: w.text,
            bbox: w.bbox,
            confidence: w.confidence,
          })),
        })),
      })),
    }));
    fs.writeFileSync(
      target,
      JSON.stringify({ text: data.text, confidence: data.confidence, blocks }),
    );
    console.log("Tesseract", n, data.confidence);
  }
  await worker.terminate();
})();
