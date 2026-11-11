// src/lib/jlpt/sentenceAnalyzer.ts
// Module tự động bóc tách và phân tích các thành phần trong câu tiếng Nhật
// Kết hợp: Intl.Segmenter native + Khử chia thể (De-inflection) + Kho từ điển hệ thống + Trích xuất từ lời giải

import { examPlainText } from "./examText";
import type { JLPTSentencePart } from "../../data/exams/jlpt/types";
import type { DictionaryEntry } from "../dictionary/localDictionaryIndex";

/**
 * Nguồn tra từ được cắm vào lúc chạy (JL-04): module này không import từ điển
 * để trang làm bài không phải tải gói registry 22,5 MB. Xem dictionaryLoader.ts.
 */
export type DictionarySearch = (filter: {
  query: string;
  language: "japanese";
  subject?: "kanji" | "vocab" | "grammar";
  limit?: number;
}) => { results: DictionaryEntry[] };

let searchGlobalDictionary: DictionarySearch = () => ({ results: [] });

/** Đặt nguồn tra từ cho các hàm phân tích (lexicon thu gọn hoặc từ điển đầy đủ). */
export function setDictionarySearch(fn: DictionarySearch) {
  searchGlobalDictionary = fn;
}

/** Tập hợp các hư từ, trợ từ, trợ động từ đơn lẻ không nên hiển thị thành thẻ từ vựng độc lập */
const STOP_WORDS = new Set([
  "は", "が", "を", "に", "へ", "と", "で", "や", "の", "も", "か", "ね", "よ", "わ", "ぞ", "ぜ", "さ",
  "だ", "です", "ます", "ました", "ません", "でした", "だった", "である", "だろう", "でしょう",
  "た", "て", "で", "ない", "なかった", "ず", "ぬ", "ん",
  "いる", "いた", "いて", "います", "ある", "あった", "あって", "あります",
  "する", "した", "して", "しない", "します", "される", "された", "されて", "させる", "させた",
  "なる", "なった", "なって", "ならない", "なります",
  "れる", "られる", "せる", "させる",
  "こと", "もの", "ところ", "ため", "よう", "そう", "はず", "わけ", "べき", "つもり",
  "から", "まで", "より", "ほど", "くらい", "ぐらい", "など", "なり", "やら", "とか",
  "だけ", "しか", "ばかり", "こそ", "さえ", "すら", "でも", "だって",
  "のに", "ので", "から", "けれど", "けれども", "けど", "し", "たり", "だり", "ながら", "つつ",
  "これ", "それ", "あれ", "どれ", "この", "その", "あの", "どの", "ここ", "そこ", "あそこ", "どこ",
  "私", "僕", "俺", "彼", "彼女", "自分", "人", "方",
]);

/** Làm sạch từ, bỏ các ký hiệu đặc biệt của đề thi như [ ], ★, _, [[50]] */
export function cleanJapaneseWord(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\[\[\d+(?:-[abc])?\]\]/g, "")
    .replace(/[★_（）()「」『』【】、。！？!?.,[\]〜~…・]/g, "")
    .trim();
}

/** Tự động bóc tách câu tiếng Nhật thành các từ/token bằng Intl.Segmenter */
export function segmentJapaneseSentence(sentence: string): string[] {
  if (!sentence) return [];

  const cleanSentence = examPlainText(sentence);

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
      const segments = segmenter.segment(cleanSentence);
      const tokens: string[] = [];

      for (const seg of segments) {
        const text = seg.segment.trim();
        if (text && !/^[、。！？!?.,_★\s()[\]「」『』【】〜~…]+$/.test(text)) {
          tokens.push(text);
        }
      }
      return tokens;
    } catch {
      // Fallback bên dưới
    }
  }

  return cleanSentence
    .split(/([、。\s]+)/)
    .map((s) => s.trim())
    .filter((s) => s && !/^[、。\s]+$/.test(s));
}

/**
 * Sinh danh sách các dạng nguyên mẫu (dictionary base forms) từ một từ tiếng Nhật đã chia thể
 */
export function getCandidateBaseForms(word: string): string[] {
  const clean = cleanJapaneseWord(word);
  if (!clean) return [];

  const candidates = new Set<string>([clean]);

  // 1. Bỏ các hậu tố trợ động từ phổ biến
  const auxSuffixes = [
    "ている", "ていた", "ていて", "ています", "ていました",
    "でいる", "でいた", "でいて", "でいます",
    "てある", "ておく", "てしまう", "てしまった", "てくる", "てきた", "ていく", "ていった",
    "られる", "られた", "られて", "られない",
    "わせる", "わせた", "される", "された", "されて", "されない",
    "させる", "させた", "させて",
    "なければならない", "なくてはならない", "ざるをえない",
    "てください", "ないでください",
    "たがる", "たい", "たく", "たかった",
    "すぎる", "すぎた", "すぎて",
    "やすい", "にくい", "がたい", "かねる", "かねない",
    "らしい", "ようだ", "ような", "ように", "そうだ", "そうな", "そうに",
    "ました", "ません", "ます",
  ];

  for (const suf of auxSuffixes) {
    if (clean.endsWith(suf) && clean.length > suf.length) {
      const stem = clean.slice(0, -suf.length);
      candidates.add(stem);
      candidates.add(stem + "る");
      candidates.add(stem + "す");
      candidates.add(stem + "く");
      candidates.add(stem + "う");
      candidates.add(stem + "い");
    }
  }

  // 2. Động từ nhóm 3 (Danh từ + する)
  const suruSuffixes = ["する", "した", "して", "しない", "すれば", "しろ", "せよ", "しよう", "せず"];
  for (const suf of suruSuffixes) {
    if (clean.endsWith(suf) && clean.length > suf.length) {
      const noun = clean.slice(0, -suf.length);
      candidates.add(noun);
      candidates.add(noun + "する");
    }
  }

  // 3. Tính từ đuôi -i và Tính từ đuôi -na
  if (clean.endsWith("くて") && clean.length > 2) candidates.add(clean.slice(0, -2) + "い");
  if (clean.endsWith("かった") && clean.length > 3) candidates.add(clean.slice(0, -3) + "い");
  if (clean.endsWith("くない") && clean.length > 3) candidates.add(clean.slice(0, -3) + "い");
  if (clean.endsWith("ければ") && clean.length > 3) candidates.add(clean.slice(0, -3) + "い");
  if (clean.endsWith("く") && clean.length > 1) candidates.add(clean.slice(0, -1) + "い");
  if (clean.endsWith("さ") && clean.length > 1) candidates.add(clean.slice(0, -1) + "い");
  if ((clean.endsWith("な") || clean.endsWith("に") || clean.endsWith("だ")) && clean.length > 1) {
    candidates.add(clean.slice(0, -1));
  }

  // 4. Động từ chia thể て / た (Godan & Ichidan)
  if ((clean.endsWith("って") || clean.endsWith("った")) && clean.length > 2) {
    const base = clean.slice(0, -2);
    candidates.add(base + "る");
    candidates.add(base + "う");
    candidates.add(base + "つ");
  }
  if ((clean.endsWith("いて") || clean.endsWith("いた")) && clean.length > 2) {
    const base = clean.slice(0, -2);
    candidates.add(base + "く");
    candidates.add(base + "る");
  }
  if ((clean.endsWith("いで") || clean.endsWith("いだ")) && clean.length > 2) {
    const base = clean.slice(0, -2);
    candidates.add(base + "ぐ");
  }
  if ((clean.endsWith("んで") || clean.endsWith("んだ")) && clean.length > 2) {
    const base = clean.slice(0, -2);
    candidates.add(base + "む");
    candidates.add(base + "ぶ");
    candidates.add(base + "ぬ");
  }
  if ((clean.endsWith("して") || clean.endsWith("した")) && clean.length > 2) {
    const base = clean.slice(0, -2);
    candidates.add(base + "す");
    candidates.add(base + "する");
  }
  if ((clean.endsWith("て") || clean.endsWith("た")) && clean.length > 1) {
    const base = clean.slice(0, -1);
    candidates.add(base + "る");
  }

  // 5. Động từ thể phủ định ない
  const naiMap: Array<[string, string]> = [
    ["わない", "う"], ["かない", "く"], ["がない", "ぐ"], ["さない", "す"],
    ["たない", "つ"], ["まない", "む"], ["ばない", "ぶ"], ["らない", "る"],
    ["ない", "る"],
  ];
  for (const [suf, rep] of naiMap) {
    if (clean.endsWith(suf) && clean.length > suf.length) {
      candidates.add(clean.slice(0, -suf.length) + rep);
    }
  }

  // 6. Động từ thể điều kiện ば / ý chí よう / danh động từ cột i (ます-stem)
  const ebaMap: Array<[string, string]> = [
    ["えば", "う"], ["けば", "く"], ["げば", "ぐ"], ["せば", "す"],
    ["てば", "つ"], ["めば", "む"], ["べば", "ぶ"], ["れば", "る"],
  ];
  for (const [suf, rep] of ebaMap) {
    if (clean.endsWith(suf) && clean.length > suf.length) {
      candidates.add(clean.slice(0, -suf.length) + rep);
    }
  }

  return [...candidates];
}

/** Tra cứu âm Hán Việt của một chuỗi Kanji từ kho Kanji đơn */
export function lookupKanjiHanViet(text: string): string | undefined {
  const kanjis = text.match(/[一-龯]/g);
  if (!kanjis || kanjis.length === 0 || kanjis.length > 4) return undefined;

  const parts: string[] = [];
  for (const ch of kanjis) {
    const res = searchGlobalDictionary({
      query: ch,
      language: "japanese",
      subject: "kanji",
      limit: 5,
    });
    const exactKanji = res.results.find((r) => r.term === ch);
    if (exactKanji && exactKanji.reading && /^[A-ZÀ-Ỹ\s,;/]+$/i.test(exactKanji.reading)) {
      const firstHv = exactKanji.reading.split(/[,;/]/)[0].trim().toUpperCase();
      if (firstHv) parts.push(firstHv);
    }
  }

  return parts.length === kanjis.length ? parts.join(" ") : undefined;
}

/** Tra cứu nhanh 1 từ trong kho từ điển nội bộ (có hỗ trợ khử chia thể) */
export function lookupWordInDictionary(word: string): DictionaryEntry | null {
  const clean = cleanJapaneseWord(word);
  if (!clean || clean.length === 0) return null;

  const candidates = getCandidateBaseForms(clean);

  for (const cand of candidates) {
    if (!cand) continue;
    const res = searchGlobalDictionary({
      query: cand,
      language: "japanese",
      limit: 25,
    });

    const list = res.results || [];
    if (list.length === 0) continue;

    // 1. Ưu tiên khớp chính xác term ở danh mục vocab / grammar / special trước
    const exactVocab = list.find(
      (r: DictionaryEntry) =>
        r.term === cand && r.subject !== "kanji" && !!r.meaning,
    );
    if (exactVocab) return exactVocab;

    // 2. Khớp chính xác term ở danh mục kanji (từ ghép chữ Hán hoặc Hán tự đơn)
    const exactKanji = list.find(
      (r: DictionaryEntry) => r.term === cand && !!r.meaning,
    );
    if (exactKanji) return exactKanji;

    // 3. Khớp chính xác reading (chỉ áp dụng khi từ gốc hoàn toàn là kana và dài >= 2 ký tự)
    if (/^[ぁ-んァ-ヶー]{2,}$/.test(cand)) {
      const exactReading = list.find(
        (r: DictionaryEntry) => r.reading === cand && !!r.meaning,
      );
      if (exactReading) return exactReading;
    }
  }

  return null;
}

/**
 * Trích xuất các mục từ vựng/cấu trúc được giải nghĩa trực tiếp trong `explanation.vi`
 * (Đảm bảo luôn có thẻ từ vựng chuẩn xác 100% khớp với lời giải của câu hỏi)
 */
export function extractPartsFromExplanation(
  explanationVi?: string,
): JLPTSentencePart[] {
  if (!explanationVi) return [];
  const extracted: JLPTSentencePart[] = [];
  const seen = new Set<string>();

  const addPart = (
    text: string,
    reading: string | undefined,
    meaning: string,
    type: JLPTSentencePart["type"] = "vocab",
  ) => {
    const cleanText = cleanJapaneseWord(text.replace(/^[1-4]\s*/, ""));
    const cleanMeaning = meaning
      .replace(/^[:：-\s]+/, "")
      .replace(/[.;,]\s*$/, "")
      .trim();
    if (!cleanText || !cleanMeaning || seen.has(cleanText)) return;
    seen.add(cleanText);

    const hanViet = lookupKanjiHanViet(cleanText);
    extracted.push({
      text: cleanText,
      reading: reading ? cleanJapaneseWord(reading) : undefined,
      hanViet,
      meaning: cleanMeaning,
      type,
    });
  };

  // Tách câu đầu tiên và các câu sau
  const sentences = explanationVi.split(/\.\s+/);
  const firstSentence = sentences[0] || "";

  // Mẫu 1: "<Kanji> đọc <Kana>: <Nghĩa>" (Mondai 1)
  const mRead = firstSentence.match(
    /^([一-龯々ぁ-んァ-ヶー]+)\s+(?:có cách đọc là|đọc)\s+([ぁ-んァ-ヶー]+)\s*[:：.,]\s*(.+)$/i,
  );
  if (mRead) {
    addPart(mRead[1], mRead[2], mRead[3], "vocab");
  }

  // Mẫu 2: "<Kana> viết <Kanji>: <Nghĩa>" (Mondai 2)
  const mWrite = firstSentence.match(
    /^([ぁ-んァ-ヶー]+)\s+viết\s+([一-龯々ぁ-んァ-ヶー]+)\s*[:：]\s*(.+)$/i,
  );
  if (mWrite) {
    addPart(mWrite[2], mWrite[1], mWrite[3], "vocab");
  }

  // Mẫu 3: "<Từ 1> gần <Từ 2>: <Nghĩa>" (Mondai 5)
  const mSyn = firstSentence.match(
    /^([一-龯々ぁ-んァ-ヶー\s]+?)\s+gần\s+([一-龯々ぁ-んァ-ヶー\s]+?)\s*[:：]\s*(.+)$/i,
  );
  if (mSyn) {
    const dict1 = lookupWordInDictionary(mSyn[1]);
    const dict2 = lookupWordInDictionary(mSyn[2]);
    addPart(
      mSyn[1],
      dict1?.reading,
      `${mSyn[3]} (≈ ${mSyn[2].trim()})`,
      "vocab",
    );
    addPart(mSyn[2], dict2?.reading, mSyn[3], "vocab");
  }

  // Mẫu 4: "<Cụm từ / Ngữ pháp>: <Nghĩa>" ở đầu câu giải thích (Mondai 3, 4, 6, 7, 9)
  if (!mRead && !mWrite && !mSyn && !firstSentence.startsWith("Ghép")) {
    const mLead = firstSentence.match(
      /^([一-龯々ぁ-んァ-ヶーVN0-9a-zA-Z＋+\s／/…〜]+?)\s*[:：]\s*(.+)$/,
    );
    if (mLead && /[一-龯ぁ-んァ-ヶー]/.test(mLead[1]) && mLead[1].length <= 24) {
      const leadText = mLead[1].trim();
      const isGrammar =
        leadText.includes("V") ||
        leadText.includes("N") ||
        leadText.includes("A") ||
        leadText.includes("…") ||
        leadText.includes("〜");
      const dict = lookupWordInDictionary(leadText);
      addPart(
        leadText,
        dict?.reading,
        mLead[2].split(/[;.] /)[0],
        isGrammar ? "grammar" : "vocab",
      );
    }
  }

  // Mẫu 5: Quét các mệnh đề giải nghĩa phương án nhiễu "<Từ> (đọc <Kana>)? là <Nghĩa>"
  const distractorRegex =
    /([一-龯々ぁ-んァ-ヶー]{2,12})(?:\s+đọc\s+([ぁ-んァ-ヶー]+))?\s+là\s+([^.,;]+?)(?=[.,;]|$|\s+không|\s+khác|\s+trái)/g;
  let match: RegExpExecArray | null;
  while ((match = distractorRegex.exec(explanationVi)) !== null) {
    const word = match[1].trim();
    const reading = match[2]?.trim() || lookupWordInDictionary(word)?.reading;
    const meaning = match[3].trim();
    if (meaning && meaning.length >= 2 && meaning.length <= 60) {
      addPart(word, reading, meaning, "vocab");
    }
  }

  return extracted;
}

/**
 * Tự động phân tích các từ vựng bổ trợ trong câu đề bài:
 * - Bỏ qua các từ mục tiêu & phương án nhiễu ĐÃ được giải thích trực tiếp trong `explanationVi` ở ngay phía trên (tránh lặp nội dung 2 lần).
 * - Bỏ qua toàn bộ hư từ, trợ từ cơ bản (`は`, `が`, `を`, `に`, `で`, `だ`, `です`...).
 * - Chỉ giữ lại các từ vựng thực sự có mặt trong câu và tra được nghĩa chuẩn từ kho từ điển nội bộ.
 * - Nếu mọi từ trong câu đều đã được giải thích ở lời giải trên, trả về `[]` để ẩn khung phụ cho gọn.
 */
export function analyzeSentenceComponents(
  sentence: string,
  manualBreakdown?: JLPTSentencePart[],
  explanationVi?: string,
): JLPTSentencePart[] {
  const parts: JLPTSentencePart[] = [];
  const seen = new Set<string>();

  // 1. Đánh dấu các từ/cụm từ ĐÃ có mặt trong lời giải `explanationVi` để không lặp lại bên dưới
  if (explanationVi) {
    for (const item of extractPartsFromExplanation(explanationVi)) {
      const key = cleanJapaneseWord(item.text);
      if (key) seen.add(key);
    }
    const jpInExp = explanationVi.match(/[一-龯々ぁ-んァ-ヶー]{2,}/g) || [];
    for (const token of jpInExp) {
      seen.add(cleanJapaneseWord(token));
    }
  }

  // 2. Nếu có dữ liệu phân tích thủ công (như Ngày 1), lọc bỏ trợ từ và từ đã giải thích ở trên
  if (manualBreakdown && manualBreakdown.length > 0) {
    for (const p of manualBreakdown) {
      const clean = cleanJapaneseWord(p.text.replace(/\s*\([^)]*\)\s*/g, ""));
      if (!clean || STOP_WORDS.has(clean) || seen.has(clean)) continue;
      if (p.type === "particle") continue;
      if (!p.meaning && !p.hanViet) continue;
      seen.add(clean);
      parts.push(p);
    }
    if (parts.length > 0) return parts;
  }

  if (!sentence) return parts;

  // 3. Tự động tách từ qua Intl.Segmenter và chỉ giữ những từ bổ trợ tra được nghĩa thực sự
  const tokens = segmentJapaneseSentence(sentence);

  for (const token of tokens) {
    const clean = cleanJapaneseWord(token);
    if (!clean || clean.length === 0) continue;
    if (STOP_WORDS.has(clean)) continue;
    if (clean.length === 1 && /^[ぁ-んァ-ヶー0-9a-zA-Z]$/.test(clean)) continue;
    if (seen.has(clean)) continue;

    const entry = lookupWordInDictionary(clean);
    if (!entry || !entry.meaning) continue;

    // Tránh trùng lặp cả theo dạng nguyên mẫu (dictionary term)
    if (seen.has(entry.term)) continue;
    seen.add(clean);
    seen.add(entry.term);

    const isKanjiOnlyReading =
      entry.subject === "kanji" && /^[A-ZÀ-Ỹ\s,;/]+$/i.test(entry.reading || "");
    const hanViet = isKanjiOnlyReading
      ? entry.reading
      : lookupKanjiHanViet(entry.term);

    parts.push({
      text: entry.term !== clean && clean.length >= 2 ? `${clean} (${entry.term})` : clean,
      reading: isKanjiOnlyReading ? undefined : entry.reading,
      hanViet,
      meaning: entry.meaning,
      type:
        entry.subject === "grammar"
          ? "grammar"
          : entry.subject === "kanji"
            ? "kanji"
            : "vocab",
    });
  }

  return parts;
}

