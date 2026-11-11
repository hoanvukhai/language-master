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

/**
 * Mondai 9: tách câu chứa ô trống [[blankId]] khỏi đoạn văn (JL-13).
 * Tách theo 。！？ và xuống dòng (giữ dấu kết câu), bỏ ký hiệu （注n）.
 */
export function extractBlankSentence(
  passageText: string,
  blankId: string | string[],
): string | null {
  const ids = Array.isArray(blankId) ? blankId : [blankId];
  const sentences = passageText.match(/[^。！？\n]*[。！？]?[」』〉）)]*/g) || [];
  // Câu có nhiều ô (52-a, 52-b, 52-c) có thể trải qua vài câu: ghép theo thứ tự xuất hiện
  const found = sentences.filter((s) => ids.some((id) => s.includes(`[[${id}]]`)));
  if (!found.length) return null;
  const clean = found
    .map((s) => s.replace(/（注\d+）|\(注\d+\)/g, "").trim())
    .join("");
  return clean || null;
}

/** "a 世 / b 原稿 / c 悪口" → { a: "世", b: "原稿", c: "悪口" } */
function splitLetteredOption(option: string): Record<string, string> | null {
  const parts = option.split(/\s*[／/]\s*/);
  const out: Record<string, string> = {};
  for (const part of parts) {
    const m = part.match(/^([a-z])\s*(.+)$/);
    if (!m) return null;
    out[m[1]] = m[2].trim();
  }
  return out;
}

export function buildCompletedSentence(
  question: {
    stem: string;
    options: string[];
    answer: number;
    order?: number[];
    blankLabel?: string;
    blankIds?: string[];
  },
  mondaiType?: string,
  passageText?: string,
): string | null {
  const correctOpt = question.options[question.answer - 1];
  if (!correctOpt) return null;

  // Mondai 9: điền đáp án đúng vào câu chứa ô trống của đoạn văn
  if (mondaiType === "text_grammar") {
    const ids = question.blankIds?.length
      ? question.blankIds
      : question.blankLabel
        ? [question.blankLabel]
        : [];
    const sentence =
      passageText && ids.length ? extractBlankSentence(passageText, ids) : null;
    if (!sentence) return null;
    let filled = sentence;
    if (ids.length > 1) {
      const parts = splitLetteredOption(examPlainText(correctOpt));
      if (!parts) return null;
      for (const id of ids) {
        const letter = id.split("-").pop() || "";
        filled = filled.replace(`[[${id}]]`, parts[letter] ?? "");
      }
    } else {
      filled = filled.replace(`[[${ids[0]}]]`, examPlainText(correctOpt));
    }
    return examPlainText(filled).trim();
  }

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
    const replaced = question.stem.replace(/____|★/g, () => {
      const piece = orderedTexts[slotIdx] || "";
      slotIdx++;
      return piece;
    });
    return examPlainText(replaced).replace(/\s+/g, "").trim();
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

  // Mondai 2: thay từ gạch chân (kana) bằng chữ Hán của đáp án đúng
  if (mondaiType === "kanji_writing" && /\[[^\]]+\]/.test(question.stem)) {
    return examPlainText(
      question.stem.replace(/\[[^\]]+\]/, examPlainText(correctOpt)),
    ).trim();
  }

  // Mondai 6: Đề bài là 1 từ, đáp án đúng là cả 1 câu hoàn chỉnh (JL-30: theo dạng, không theo số câu)
  if (mondaiType === "usage") {
    return examPlainText(correctOpt).trim();
  }

  return examPlainText(question.stem).trim();
}
