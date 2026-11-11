export type TextToken = {
  kind: "text" | "underline" | "blank" | "slot" | "star" | "ruby";
  text: string;
  reading?: string;
};
export function parseExamText(text: string): TextToken[] {
  const result: TextToken[] = [];
  const re =
    /\\(.)|\[\[([^\]]+)\]\]|\[([^[\]]+)\]|\{\{([^|{}]+)\|([^{}]+)\}\}|(_{3,})|(★)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last)
      result.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1]) result.push({ kind: "text", text: m[1] });
    else if (m[2]) result.push({ kind: "blank", text: m[2] });
    else if (m[3]) result.push({ kind: "underline", text: m[3] });
    else if (m[4]) result.push({ kind: "ruby", text: m[4], reading: m[5] });
    else
      result.push({ kind: m[6] ? "slot" : "star", text: m[6] ? "____" : "★" });
    last = m.index! + m[0].length;
  }
  if (last < text.length) result.push({ kind: "text", text: text.slice(last) });
  return result;
}
export function examPlainText(text: string): string {
  return parseExamText(text)
    .map((t) =>
      ["blank", "slot", "star"].includes(t.kind)
        ? " "
        : t.kind === "underline"
          ? examPlainText(t.text)
          : t.text,
    )
    .join("");
}

export function buildCompletedSentence(question: {
  stem: string;
  options: string[];
  answer: number;
  number: number;
  order?: number[];
  origin?: { number: number };
}): string | null {
  const correctOpt = question.options[question.answer - 1];
  if (!correctOpt) return null;

  // Mondai 8: Sắp xếp 4 mảnh vào câu có dấu ★
  if (
    question.order &&
    question.order.length === 4 &&
    question.stem.includes("★")
  ) {
    let slotIdx = 0;
    const orderedTexts = question.order.map(
      (optNum) => question.options[optNum - 1] || "",
    );
    const replaced = question.stem.replace(/____|★/g, (match) => {
      const piece = orderedTexts[slotIdx] || "";
      slotIdx++;
      return match === "★" ? `[★ ${piece}]` : piece;
    });
    return examPlainText(replaced).replace(/\s+/g, " ").trim();
  }

  // Mondai 3, 4, 7: Điền vào chỗ trống ( ) — hỗ trợ cả câu có 2 ô trống phân tách bằng ／ hoặc /
  const fullWidthBlank = "（\u3000）";
  if (question.stem.includes(fullWidthBlank)) {
    const parts = correctOpt.split(/\s*[／/]\s*/);
    if (parts.length > 1) {
      let partIdx = 0;
      const replaced = question.stem.replace(/（\u3000）/g, () => {
        const piece = parts[partIdx] ?? parts[parts.length - 1] ?? "";
        partIdx++;
        return `[${piece}]`;
      });
      return examPlainText(replaced).trim();
    }
    return examPlainText(
      question.stem.replace(fullWidthBlank, `[${correctOpt}]`),
    ).trim();
  }

  // Mondai 6: Đề bài là 1 từ, đáp án đúng là cả 1 câu hoàn chỉnh
  const qNum = question.origin?.number ?? question.number;
  if (qNum >= 28 && qNum <= 32) {
    return examPlainText(correctOpt).trim();
  }

  return examPlainText(question.stem).trim();
}

export function buildUnfilledStemForTranslation(question: {
  stem: string;
}): string {
  return examPlainText(question.stem.replace(/（\u3000）|____|★/g, " … "))
    .replace(/\s+/g, " ")
    .trim();
}

export const sentenceTranslationCache = new Map<string, string>();

export function clearSentenceTranslationCache(): void {
  sentenceTranslationCache.clear();
}

