// src/types/index.ts

export type WordType = 'verb' | 'adj_i' | 'adj_na' | 'noun' | 'adv' | 'expression';
export type VerbGroup = 1 | 2 | 3 | null;
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type TemplateType = 'japanese' | 'english' | 'generic';

export interface BaseLearningItem {
  id: string;
  template: TemplateType;
}

export interface Word extends BaseLearningItem {
  template: 'japanese';
  kanji: string;
  alt_kanji?: string;
  hiragana: string;
  romaji?: string;
  meaning: {vi: string; en?: string} | string;
  type: WordType;
  group?: VerbGroup;
  level: JLPTLevel;
  isSpecial?: boolean;
  lesson?: string;
  examples?: { jp: string; vi: string; en?: string }[];
  note?: { jp: string; vi: string; en?: string } | string;
}

// Thêm vào src/types/index.ts
export type FormType = 'jisho' | 'masu' | 'te' | 'nai' | 'ta' | 'nakatta';
export type FlashcardMode = 'endless' | 'quiz';

export interface FlashcardSettingsState {
  // Khối A
  poolSize: number | 'all';
  sourceForm: FormType;
  targetForms: FormType[];
  
  // Khối B
  uiFront: { showKanji: boolean; showFurigana: boolean; showMeaning: boolean };
  uiBack: { showAnswer: boolean; showRomaji: boolean; showRule: boolean };
  
  // Khối C & D
  playMode: FlashcardMode;
  autoPlayAudio: boolean;
}

// Kanji types
export interface KanjiWord {
  id: string;               // Nên có ID cho từng từ (VD: 'kw_01_01')
  word: string;             // Từ vựng (VD: '責任')
  hiragana: string;         // Cách đọc (VD: 'seki-nin')
  hanVietWord?: string;     // Âm Hán Việt tương ứng của từ
  
  meaning: {
    vi: string;             // Nghĩa tiếng Việt (VD: 'Trách nhiệm')
    en?: string;            // Nghĩa tiếng Anh (VD: 'Responsibility')
  };
  
  type: WordType;           // RẤT QUAN TRỌNG: Để ném vào Máy chia thể
  group?: 1 | 2 | 3;        // Nhóm động từ (nếu type là 'verb')
  readingType: '音' | '訓'; // Âm On hay Âm Kun
  
  examples?: {              // Câu ví dụ
    jp: string;
    vi: string;
  }[];
}

export interface Kanji extends BaseLearningItem {
  template: 'japanese';
  character: string;        // Chữ Hán (VD: '任')
  hanViet: string;          // Âm Hán Việt (VD: 'NHIỆM')
  kunyomi?: string;         // Âm Kun (VD: 'ちーる')
  onyomi?: string;          // Âm On (VD: 'サン')
  mnemonic?: string;        // Mẹo nhớ (VD: 'Cô gái đi dạo...')
  level: JLPTLevel;         // 'N3'
  lesson: string;           // 'Bài 1'
  
  words: KanjiWord[];       // Mảng chứa các từ vựng ghép với chữ Hán này
}

// Grammar types
export interface GrammarExample {
  jp: string;               // Câu ví dụ tiếng Nhật, có dấu [...] đánh dấu điểm rơi ngữ pháp: "妹は犬を怖[がる]。"
  kana: string;             // Đọc toàn bộ bằng hiragana, cũng có [...]: "いもうとはいぬをこわ[がる]。"
  vi: string;               // Nghĩa tiếng Việt
  en?: string;              // Nghĩa tiếng Anh (optional)
}

export interface GrammarItem extends BaseLearningItem {
  template: 'japanese';
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  structure: string;        // Cấu trúc (VD: '〜がる')
  structureKana: string;    // Đọc bằng kana (VD: '〜がる') — dùng để search hiragana
  meaning: {
    vi: string;
    en?: string;
  };
  formation: string[];      // Cách thành lập (mảng các dạng biến thể)
  lesson: string;           // 'Bài 1' — dùng cho chế độ Học theo bài
  group: string;            // 'Emotion_Desire' — dùng cho Game đối kháng
  confusedWith?: string[];  // Các cấu trúc dễ nhầm lẫn
  caution: {
    vi: string;
    en?: string;
  } | string;
  examples: GrammarExample[]; // Câu ví dụ
}

// ----------------------------------------------------
// English Interfaces (Future expansion)
// ----------------------------------------------------
export interface EnglishWord extends BaseLearningItem {
  template: 'english';
  word: string;
  ipa?: string;
  ipaBrE?: string; // Phiên âm Anh - Anh
  ipaAmE?: string; // Phiên âm Anh - Mỹ
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  partOfSpeech?: string;
  meaning: { vi: string; en?: string } | string;
  examples?: { en: string; vi?: string }[];
  lesson?: string;
  synonyms?: string[];
  antonyms?: string[];
}

// ----------------------------------------------------
// Generic Interface (For user-generated or new languages)
// ----------------------------------------------------
export interface GenericItem extends BaseLearningItem {
  template: 'generic';
  front: string;
  back: string;
  notes?: string;
}

// The core union type for all learning items
export type LearningItem = Word | Kanji | GrammarItem | EnglishWord | GenericItem;
