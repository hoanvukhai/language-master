// src/data/exams/jlpt/types.ts

export type JLPTLevel = "N1" | "N2" | "N3" | "N4" | "N5";

export interface JLPTTargetWord {
  kanji?: string;
  hanViet?: string;
  meaningVi?: string;
}

export interface JLPTOptionNote {
  option: number;
  note: string;
}

export interface JLPTExplanation {
  summary?: string;
  rule?: string;
  vi?: string;
  grammarPoint?: string;
  optionNotes?: string[];
}

export interface JLPTPassage {
  sourceImage?: string;
  sourcePages?: { pdfPage: number; printedPage?: string }[];
  id: string;
  text: string;
  textKana?: string;
  translationVi?: string;
  notes?: string[];
}

export interface JLPTSentencePart {
  text: string; // Cụm từ hoặc từ: "道に迷う", "〜ても", "ちゃんと"
  reading?: string; // Cách đọc Hiragana: "みちにまよう"
  hanViet?: string; // Âm Hán Việt: "ĐẠO MÊ"
  meaning?: string; // Nghĩa tiếng Việt: "lạc đường"
  type?: "vocab" | "grammar" | "adverb" | "particle" | "kanji";
}

export interface JLPTQuestion {
  origin?: { examId: string; title: string; day?: number; number: number };
  explanationStatus?: "authored" | "needs_review";
  sourceImage?: string;
  sourcePages?: { pdfPage: number; printedPage?: string }[];
  answerPages?: { pdfPage: number }[];
  ocrText?: string;
  transcriptionStatus?: "needs_review" | "verified";
  id: string;
  number: number;
  stem: string; // Câu hỏi gốc (chứa [từ gạch chân], ____ ★ ____, [[50]])
  questionKana?: string; // Câu hỏi viết bằng kana (cho phát âm / tra cứu)
  underlined?: string; // Từ gạch chân nếu có
  options: string[]; // 4 lựa chọn (1..4)
  answer: number; // 1..4
  order?: number[]; // Thứ tự đúng cả 4 ô (Mondai 8)
  translationVi?: string; // Bản dịch tiếng Việt của câu hỏi
  explanation?: JLPTExplanation; // Lời giải chi tiết
  targetWord?: JLPTTargetWord; // Từ vựng trọng tâm
  sentenceBreakdown?: JLPTSentencePart[]; // Phân tích chi tiết từng từ/thành phần trong câu đề bài (tùy chọn)
  passageId?: string; // Dành cho Mondai 9 (trỏ tới bài đọc)
  blankIds?: string[];
  blank?: string; // Ví dụ "50", "51"
  blankLabel?: string;
}

export interface JLPTMondai {
  number: number; // 1..9
  type: string; // kanji_reading | kanji_writing | word_formation | context | synonym | usage | grammar_form | sentence_order | text_grammar
  title: string; // Tiêu đề tiếng Nhật: 漢字読み, 文脈規定...
  titleVi: string; // Tiêu đề tiếng Việt: Cách đọc Kanji, Điền từ...
  instruction: string; // Hướng dẫn làm bài
  numberRange?: [number, number]; // Dải số câu: [1, 5]
  passages?: JLPTPassage[]; // Bài đọc ngữ pháp (dành cho Mondai 9)
  questions: JLPTQuestion[]; // Danh sách câu hỏi của mondai này
}

export interface JLPTExam {
  transcriptionReview?: { method: string; pdfPages: number[]; date: string };
  isPracticePool?: boolean;
  delivery?: "source_scan" | "text";
  transcriptionStatus?: "needs_review" | "verified";
  sourceRef?: { documentId: string; fileName: string };
  sourcePages?: { pdfPage: number; printedPage?: string }[];
  answerPages?: { pdfPage: number }[];
  schemaVersion?: number;
  contentRevision?: number;
  status?: "draft" | "published";
  isSample?: boolean;
  kind?: "practice_set" | "section_mock";
  skills?: string[];
  enrichmentStatus?: "draft" | "reviewed";
  explanationSource?: string;
  id: string; // "kokusho-n2-20days-d01"
  bookId?: string; // "kokusho-n2-20days"
  bookTitle?: string; // "日本語能力試験 20日で合格 N2 文字・語彙・文法"
  level: JLPTLevel; // "N2"
  day?: number; // 1
  title: string; // "第1日 (Day 1)"
  subtitle?: string; // "文字・語彙・文法"
  source?: string; // Tên sách hoặc "Sưu tầm"
  timeLimitMinutes?: number; // 50 phút
  totalQuestions: number; // 54
  mondais: JLPTMondai[];
}

export type ExamPracticeMode =
  | "drill" // Chế độ 1: Luyện theo từng Mondai (Speed Drill)
  | "mock" // Chế độ 2: Thi thử trọn đề có tính giờ (Full Mock Exam)
  | "review"; // Chế độ 3: Lướt đề & Xem lời giải nhanh (Flash Review)

export interface JLPTBookGroup {
  id: string; // bookId hoặc mã định danh nhóm
  title: string; // Tên sách hoặc tên bộ đề
  level: JLPTLevel; // N1..N5
  subtitle?: string;
  source?: string;
  description?: string;
  totalExams: number;
  totalQuestions: number;
  exams: JLPTExam[];
}
