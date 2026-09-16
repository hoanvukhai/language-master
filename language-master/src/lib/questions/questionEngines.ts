// src/lib/questions/questionEngines.ts
// Bộ Tạo Câu Hỏi Chuẩn Hóa Toàn Dự Án — Phục vụ cho Mini-Games, FullRun, Đua Top (RaceArena) & Học SRS

import type { Word, Kanji, KanjiWord, GrammarItem } from '../../types';

export type QuestionSubject = 'vocab' | 'kanji' | 'grammar';

export type QuestionType =
  | 'vocab_kanji_to_meaning'
  | 'vocab_meaning_to_hiragana'
  | 'kanji_char_to_hanviet'
  | 'kanji_hanviet_to_char'
  | 'kanji_word_to_meaning'
  | 'kanji_word_to_hiragana'
  | 'kanji_word_to_hanviet'
  | 'grammar_fill_blank'
  | 'grammar_structure_to_meaning';

export interface GeneratedQuestion {
  id: string;
  subject: QuestionSubject;
  type: QuestionType;
  prompt: string;             // Đề bài chính (VD: "造", "製造", "妹は犬を 怖[ _____ ]。")
  subPrompt?: string;         // Chú thích phụ (VD: "Hán Việt: CHẾ TẠO", "Chọn Âm Hán Việt")
  kanjiChar?: string;         // Chữ Hán gốc (nếu có)
  hanViet?: string;           // Âm Hán Việt (nếu có)
  wordText?: string;          // Từ ghép (nếu có)
  hiraganaAnswer?: string;     // Đáp án Hiragana (nếu có)
  meaningAnswer?: string;      // Đáp án Nghĩa tiếng Việt (nếu có)
  options: string[];           // Danh sách 4 lựa chọn trắc nghiệm
  correctIndex: number;        // Vị trí đáp án đúng (0-3)
  correctAnswer: string;       // Đáp án đúng chính xác
  isKatakana?: boolean;        // Có phải từ mượn Katakana không
  explanation?: string;        // Lời giải thích / bẫy JLPT / ví dụ
}

// ── Utility: Tráo ngẫu nhiên mảng (Fisher-Yates Shuffle) ─────────────────
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Utility: Lấy N phương án nhiễu ngẫu nhiên ─────────────────────────────
function getRandomDistractors(correctItem: string, pool: string[], count: number = 3): string[] {
  const filtered = Array.from(new Set(pool.filter(item => item && item !== correctItem)));
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, count);
}

// ── 1. VOCAB QUESTION ENGINE ──────────────────────────────────────────────
export function generateVocabQuestion(word: Word, pool: Word[]): GeneratedQuestion {
  const isMeaningQuestion = Math.random() > 0.5;
  const meaningText = typeof word.meaning === 'object' ? word.meaning.vi : word.meaning;
  const isKatakana = word.type === 'expression' || Boolean(word.hiragana && /^[\u30A0-\u30FF]+$/.test(word.hiragana));

  if (isMeaningQuestion) {
    const correct = meaningText;
    const allMeanings = pool.map(w => typeof w.meaning === 'object' ? w.meaning.vi : w.meaning);
    const distractors = getRandomDistractors(correct, allMeanings, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `vq_${word.id}_meaning`,
      subject: 'vocab',
      type: 'vocab_kanji_to_meaning',
      prompt: word.kanji || word.hiragana,
      subPrompt: word.kanji ? word.hiragana : undefined,
      wordText: word.kanji || word.hiragana,
      hiraganaAnswer: word.hiragana,
      meaningAnswer: correct,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
      isKatakana,
    };
  } else {
    const correct = word.hiragana;
    const allHiragana = pool.map(w => w.hiragana);
    const distractors = getRandomDistractors(correct, allHiragana, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `vq_${word.id}_kana`,
      subject: 'vocab',
      type: 'vocab_meaning_to_hiragana',
      prompt: meaningText,
      subPrompt: word.kanji ? `Hán tự: ${word.kanji}` : undefined,
      wordText: word.kanji || word.hiragana,
      hiraganaAnswer: correct,
      meaningAnswer: meaningText,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
      isKatakana,
    };
  }
}

// ── 2. KANJI CHARACTER QUESTION ENGINE (Chữ Hán Gốc & Âm Hán Việt) ─────────
export function generateKanjiCharacterQuestion(kanji: Kanji, pool: Kanji[]): GeneratedQuestion {
  const isCharToHanViet = Math.random() > 0.4;

  if (isCharToHanViet) {
    const correct = kanji.hanViet;
    const allHanViet = pool.map(k => k.hanViet);
    const distractors = getRandomDistractors(correct, allHanViet, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `kq_char_${kanji.id}`,
      subject: 'kanji',
      type: 'kanji_char_to_hanviet',
      prompt: kanji.character,
      subPrompt: 'Chọn Âm Hán Việt đúng của chữ này',
      kanjiChar: kanji.character,
      hanViet: kanji.hanViet,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
    };
  } else {
    const correct = kanji.character;
    const allChars = pool.map(k => k.character);
    const distractors = getRandomDistractors(correct, allChars, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `kq_hv_${kanji.id}`,
      subject: 'kanji',
      type: 'kanji_hanviet_to_char',
      prompt: kanji.hanViet,
      subPrompt: 'Chọn Chữ Hán tương ứng với Âm Hán Việt',
      kanjiChar: kanji.character,
      hanViet: kanji.hanViet,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
    };
  }
}

// ── 3. KANJI COMPOUND WORD QUESTION ENGINE (Từ Ghép Kanji) ───────────────
export function generateKanjiWordHanVietQuestion(
  kanjiChar: string,
  kw: KanjiWord,
  poolWords: KanjiWord[]
): GeneratedQuestion {
  const correct = kw.hanVietWord || kanjiChar;
  const allHVs = poolWords.map(w => w.hanVietWord).filter(Boolean) as string[];
  const distractors = getRandomDistractors(correct, allHVs, 3);
  const options = shuffleArray([correct, ...distractors]);

  return {
    id: `kq_word_hv_${kw.id || kw.word}`,
    subject: 'kanji',
    type: 'kanji_word_to_hanviet',
    prompt: kw.word,
    subPrompt: 'Chọn Âm Hán Việt của từ ghép',
    kanjiChar,
    hanViet: kw.hanVietWord,
    wordText: kw.word,
    options,
    correctIndex: options.indexOf(correct),
    correctAnswer: correct,
  };
}

export function generateKanjiCompoundQuestion(
  kanjiChar: string,
  kw: KanjiWord,
  poolWords: KanjiWord[]
): GeneratedQuestion {
  const meaningText = typeof kw.meaning === 'object' ? kw.meaning.vi : kw.meaning;
  const isWordToMeaning = Math.random() > 0.5;

  if (isWordToMeaning) {
    const correct = meaningText;
    const allMeanings = poolWords.map(w => typeof w.meaning === 'object' ? w.meaning.vi : w.meaning);
    const distractors = getRandomDistractors(correct, allMeanings, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `kq_word_m_${kw.id || kw.word}`,
      subject: 'kanji',
      type: 'kanji_word_to_meaning',
      prompt: kw.word,
      subPrompt: kw.hanVietWord ? `Hán Việt: ${kw.hanVietWord} · (${kw.hiragana})` : `(${kw.hiragana})`,
      kanjiChar,
      hanViet: kw.hanVietWord,
      wordText: kw.word,
      hiraganaAnswer: kw.hiragana,
      meaningAnswer: correct,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
    };
  } else {
    const correct = kw.hiragana;
    const allHiragana = poolWords.map(w => w.hiragana);
    const distractors = getRandomDistractors(correct, allHiragana, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `kq_word_h_${kw.id || kw.word}`,
      subject: 'kanji',
      type: 'kanji_word_to_hiragana',
      prompt: kw.word,
      subPrompt: kw.hanVietWord ? `Hán Việt: ${kw.hanVietWord} · Nghĩa: ${meaningText}` : `Nghĩa: ${meaningText}`,
      kanjiChar,
      hanViet: kw.hanVietWord,
      wordText: kw.word,
      hiraganaAnswer: correct,
      meaningAnswer: meaningText,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
    };
  }
}

// ── 4. GRAMMAR QUESTION ENGINE (Điền Ô Trống & Bẫy JLPT) ──────────────────
export function generateGrammarQuestion(item: GrammarItem, pool: GrammarItem[]): GeneratedQuestion {
  const hasExample = item.examples && item.examples.length > 0;
  const meaningText = typeof item.meaning === 'object' ? item.meaning.vi : item.meaning;

  if (hasExample) {
    // Ưu tiên 1: Tạo câu hỏi Điền vào chỗ trống (FillBlank) từ câu ví dụ
    const ex = item.examples[Math.floor(Math.random() * item.examples.length)];
    // Thay thế đoạn [...] bằng [ _____ ]
    const promptSentence = ex.jp.replace(/\[([^\]]+)\]/g, '[ _____ ]');
    const correct = item.structure;

    // Lấy nhiễu từ confusedWith hoặc cùng group
    let candidatePool = pool.filter(g => g.id !== item.id);
    if (item.confusedWith && item.confusedWith.length > 0) {
      const confusedItems = candidatePool.filter(g => item.confusedWith?.includes(g.structure) || item.confusedWith?.includes(g.id));
      if (confusedItems.length >= 2) candidatePool = confusedItems;
    }
    const allStructures = candidatePool.map(g => g.structure);
    const distractors = getRandomDistractors(correct, allStructures, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `gq_fb_${item.id}`,
      subject: 'grammar',
      type: 'grammar_fill_blank',
      prompt: promptSentence,
      subPrompt: `Dịch nghĩa câu: "${ex.vi}"`,
      meaningAnswer: meaningText,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
      explanation: typeof item.caution === 'object' ? item.caution.vi : item.caution,
    };
  } else {
    // Trắc nghiệm Cấu trúc ➔ Nghĩa
    const correct = meaningText;
    const allMeanings = pool.map(g => typeof g.meaning === 'object' ? g.meaning.vi : g.meaning);
    const distractors = getRandomDistractors(correct, allMeanings, 3);
    const options = shuffleArray([correct, ...distractors]);

    return {
      id: `gq_str_${item.id}`,
      subject: 'grammar',
      type: 'grammar_structure_to_meaning',
      prompt: item.structure,
      subPrompt: item.structureKana ? `(${item.structureKana})` : undefined,
      meaningAnswer: correct,
      options,
      correctIndex: options.indexOf(correct),
      correctAnswer: correct,
      explanation: typeof item.caution === 'object' ? item.caution.vi : item.caution,
    };
  }
}
