// src/pages/Practice/SentenceTyping.tsx
// Chế độ Luyện Gõ Câu (Sentence Typing & Dictation):
// Hỗ trợ đầy đủ các chiều và chế độ theo chuẩn học ngoại ngữ:
//
// 1. Nhóm 1: DỊCH (Nhìn câu ➔ Gõ câu):
//    - Nhìn câu Tiếng Việt ➔ Gõ câu Ngoại ngữ (Tiếng Anh / Tiếng Nhật)
//    - Nhìn câu Ngoại ngữ (Tiếng Anh / Tiếng Nhật) ➔ Gõ câu Tiếng Việt
//    - Trộn Nhóm 1: Xáo trộn ngẫu nhiên cả 2 chiều Dịch trên
//
// 2. Nhóm 2: NGHE (Nghe ngoại ngữ ➔ Gõ câu):
//    - Nghe Ngoại ngữ ➔ Gõ Ngoại ngữ (Chính tả ngoại ngữ)
//    - Nghe Ngoại ngữ ➔ Gõ Tiếng Việt (Nghe hiểu & dịch nghĩa tiếng Việt)
//    - Trộn Nhóm 2: Xáo trộn ngẫu nhiên cả 2 chiều Nghe trên
//
// 3. Trộn Cả Hai Nhóm (Toàn diện nhất):
//    - Xáo trộn ngẫu nhiên cả 4 dạng bài (2 chiều Dịch + 2 chiều Nghe)
//
// - Chip từ che dấu sao (*****), phím tắt Ctrl + Space mở gợi ý từ tiếp theo.
// - Hỗ trợ nhiều đáp án phân tách bởi '/', ';', '|' hoặc bỏ dấu ngoặc đơn.
// - So sánh diff chi tiết từng từ khi nộp bài chưa chính xác.
// - Làm sai thì đẩy câu xuống cuối hàng đợi (queue) để luyện lại cho đến khi thuộc.
// - Chuẩn hóa đồng bộ 100% với các trang Luyện tập khác, không timer/coins thừa thãi.

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  Volume2,
  Eye,
  EyeOff,
  Languages,
  Headphones,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import * as wanakana from 'wanakana';
import { usePracticeContext } from './PracticeContext';
import { speakWithVoiceEngine } from '../../lib/audio/voiceEngine';
import VocabLessonChips from '../../components/vocabulary/VocabLessonChips';

export interface SentenceItem {
  id: string;
  targetSentence: string;      // Câu tiếng Anh hoặc tiếng Nhật
  translation: string;         // Nghĩa tiếng Việt
  sourceWord: string;          // Từ vựng gốc liên quan
  lesson?: string;
  assignedMode?: ConcreteSentenceMode; // Dùng khi ở chế độ Trộn (mix)
}

export type ConcreteSentenceMode =
  | 'translate_vi_to_target'    // Nhìn VI -> Gõ Ngoại ngữ (TA/Nhật)
  | 'translate_target_to_vi'    // Nhìn Ngoại ngữ -> Gõ VI
  | 'listen_target_to_target'   // Nghe Ngoại ngữ -> Gõ Ngoại ngữ (Chính tả)
  | 'listen_target_to_vi';      // Nghe Ngoại ngữ -> Gõ VI (Nghe hiểu & dịch)

export type MixMode =
  | 'mix_group1'                // Trộn Nhóm 1 (Nhìn & Dịch)
  | 'mix_group2'                // Trộn Nhóm 2 (Nghe hiểu)
  | 'mix_all';                  // Trộn Cả hai nhóm (Tất cả 4 chiều)

export type SentenceMode = ConcreteSentenceMode | MixMode;

export const GROUP1_MODES: ConcreteSentenceMode[] = [
  'translate_vi_to_target',
  'translate_target_to_vi',
];

export const GROUP2_MODES: ConcreteSentenceMode[] = [
  'listen_target_to_target',
  'listen_target_to_vi',
];

export const ALL_CONCRETE_MODES: ConcreteSentenceMode[] = [
  ...GROUP1_MODES,
  ...GROUP2_MODES,
];

interface QuestionConfig {
  badgeLabel: string;
  promptTitle: string;
  promptContent?: string;
  audioText: string;
  audioLang: string;
  expectedText: string;
  isTypingVietnamese: boolean;
  hintText?: string;
  hintTitle?: string;
  isAudioMode: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Tách từ và dấu câu để che dấu sao */
function tokenizeSentence(sentence: string): { word: string; punctuation: string; full: string }[] {
  if (!sentence) return [];
  const parts = sentence.trim().split(/\s+/);
  return parts.map(part => {
    const match = part.match(/^(.*?)([.,!?;:"'”’‘“…)\]}\-_/\\~`…–—]+)?$/);
    if (match) {
      return {
        word: match[1] || '',
        punctuation: match[2] || '',
        full: part,
      };
    }
    return { word: part, punctuation: '', full: part };
  });
}

/** Chuẩn hóa chuỗi so sánh */
function cleanTextForCompare(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'”’‘“…)\]}\-_/\\~`…–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lấy danh sách các phương án đáp án được chấp nhận (hỗ trợ phân tách bằng dấu / hoặc ; hoặc | hoặc bỏ ngoặc đơn) */
function getAcceptableAnswers(expectedText: string): string[] {
  if (!expectedText) return [];
  const parts = expectedText.split(/[/;|]/).map(p => p.trim()).filter(Boolean);
  const result = new Set<string>();

  parts.forEach(part => {
    const cleaned = cleanTextForCompare(part);
    if (cleaned) result.add(cleaned);

    // Bỏ nội dung trong ngoặc đơn (ví dụ "Tôi (đang) đi học" -> "Tôi đi học")
    const withoutParens = part.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    const cleanedWithout = cleanTextForCompare(withoutParens);
    if (cleanedWithout) result.add(cleanedWithout);
  });

  const fullClean = cleanTextForCompare(expectedText);
  if (fullClean) result.add(fullClean);

  const fullWithoutParens = cleanTextForCompare(expectedText.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim());
  if (fullWithoutParens) result.add(fullWithoutParens);

  return Array.from(result);
}

/** Trích xuất toàn bộ câu ví dụ từ dữ liệu khóa học */
function extractSentencesFromData(data: any[], selectedLessons: string[], isEnglish: boolean): SentenceItem[] {
  const filteredWords = selectedLessons.length === 0
    ? data
    : data.filter(w => selectedLessons.includes(w.lesson || ''));

  const items: SentenceItem[] = [];

  filteredWords.forEach((w: any, wIdx: number) => {
    const rawEx = w.examples || w.originalData?.examples;
    const lesson = w.lesson;
    const sourceWord = isEnglish ? (w.word || '') : (w.kanji || w.hiragana || '');
    let addedCount = 0;

    // 1. Kiểm tra mảng examples (nếu từ có nhiều ví dụ thì lấy TẤT CẢ)
    if (Array.isArray(rawEx) && rawEx.length > 0) {
      rawEx.forEach((ex: any, exIdx: number) => {
        const sentence = isEnglish
          ? (ex.en || ex.sentence)
          : (ex.jp || ex.sentence || ex.en);
        const translation = ex.vi || ex.meaning || '';
        if (
          sentence && typeof sentence === 'string' && sentence.trim() &&
          translation && typeof translation === 'string' && translation.trim()
        ) {
          items.push({
            id: `${w.id || wIdx}-${exIdx}`,
            targetSentence: sentence.trim(),
            translation: translation.trim(),
            sourceWord,
            lesson,
          });
          addedCount++;
        }
      });
    }

    // 2. Kiểm tra ví dụ đơn
    if (addedCount === 0) {
      if (w.exampleKanji && typeof w.exampleKanji === 'string' && w.exampleKanji.trim()) {
        const tr = (w.exampleMeaning || '').trim();
        if (tr) {
          items.push({
            id: `${w.id || wIdx}-exK`,
            targetSentence: w.exampleKanji.trim(),
            translation: tr,
            sourceWord,
            lesson,
          });
          addedCount++;
        }
      } else if (w.example && typeof w.example === 'string' && w.example.trim()) {
        const tr = (typeof w.meaning === 'string' ? w.meaning : w.meaning?.vi || '').trim();
        if (tr) {
          items.push({
            id: `${w.id || wIdx}-exStr`,
            targetSentence: w.example.trim(),
            translation: tr,
            sourceWord,
            lesson,
          });
          addedCount++;
        }
      } else if (w.example && typeof w.example === 'object') {
        const sentence = isEnglish ? (w.example.en || w.example.sentence) : (w.example.jp || w.example.sentence);
        const tr = (w.example.vi || w.example.meaning || '').trim();
        if (sentence && typeof sentence === 'string' && sentence.trim() && tr) {
          items.push({
            id: `${w.id || wIdx}-exObj`,
            targetSentence: sentence.trim(),
            translation: tr,
            sourceWord,
            lesson,
          });
          addedCount++;
        }
      }
    }

    // 3. Fallback: Nếu không có ví dụ (trường hợp từ mới chưa có ví dụ)
    if (addedCount === 0 && sourceWord) {
      const meaningStr = typeof w.meaning === 'string'
        ? w.meaning
        : (w.meaning?.vi || w.meaning?.en || '');
      if (meaningStr && typeof meaningStr === 'string' && meaningStr.trim()) {
        items.push({
          id: `${w.id || wIdx}-fallback`,
          targetSentence: sourceWord.trim(),
          translation: meaningStr.trim(),
          sourceWord,
          lesson,
        });
      }
    }
  });

  return shuffle(items);
}

/** Xác định cấu hình hiển thị và câu hỏi theo từng chế độ cụ thể */
function getQuestionConfig(item: SentenceItem, mode: ConcreteSentenceMode, isJapanese: boolean): QuestionConfig {
  const targetLangName = isJapanese ? 'tiếng Nhật' : 'tiếng Anh';
  const targetSpeechLang = isJapanese ? 'ja-JP' : 'en-US';

  switch (mode) {
    case 'translate_vi_to_target':
      return {
        badgeLabel: `Nhìn VI ➔ Gõ ${targetLangName}`,
        promptTitle: 'Nghĩa tiếng Việt:',
        promptContent: item.translation,
        audioText: item.targetSentence,
        audioLang: targetSpeechLang,
        expectedText: item.targetSentence,
        isTypingVietnamese: false,
        hintText: item.sourceWord ? `Từ liên quan: ${item.sourceWord}` : undefined,
        hintTitle: 'Gợi ý từ:',
        isAudioMode: false,
      };

    case 'translate_target_to_vi':
      return {
        badgeLabel: `Nhìn ${targetLangName} ➔ Gõ VI`,
        promptTitle: `Câu ${targetLangName}:`,
        promptContent: item.targetSentence,
        audioText: item.targetSentence,
        audioLang: targetSpeechLang,
        expectedText: item.translation,
        isTypingVietnamese: true,
        hintText: item.sourceWord ? `Từ liên quan: ${item.sourceWord}` : undefined,
        hintTitle: 'Gợi ý từ:',
        isAudioMode: false,
      };

    case 'listen_target_to_target':
      return {
        badgeLabel: `Nghe ${targetLangName} ➔ Gõ ${targetLangName}`,
        promptTitle: `Nghe câu ${targetLangName} và gõ lại (Chính tả):`,
        audioText: item.targetSentence,
        audioLang: targetSpeechLang,
        expectedText: item.targetSentence,
        isTypingVietnamese: false,
        hintText: item.translation,
        hintTitle: 'Gợi ý nghĩa tiếng Việt:',
        isAudioMode: true,
      };

    case 'listen_target_to_vi':
      return {
        badgeLabel: `Nghe ${targetLangName} ➔ Gõ VI`,
        promptTitle: `Nghe câu ${targetLangName} và gõ nghĩa tiếng Việt (Nghe hiểu):`,
        audioText: item.targetSentence,
        audioLang: targetSpeechLang,
        expectedText: item.translation,
        isTypingVietnamese: true,
        hintText: item.targetSentence,
        hintTitle: `Câu ${targetLangName} gốc:`,
        isAudioMode: true,
      };
  }
}

export default function SentenceTyping() {
  const { course } = usePracticeContext();
  const data = useMemo(() => (course?.data || []) as any[], [course]);
  const isEnglish = course?.template === 'english';
  const isJapanese = !isEnglish;
  const targetLangLabel = isJapanese ? 'Tiếng Nhật' : 'Tiếng Anh';
  const targetShortCode = isJapanese ? 'JP' : 'EN';

  // Danh sách bài học
  const lessons = useMemo(() => {
    return Array.from(new Set(data.map((w: any) => w.lesson).filter(Boolean))) as string[];
  }, [data]);

  // Cài đặt setup
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<SentenceMode>('translate_vi_to_target');
  const [showMaskChips, setShowMaskChips] = useState<boolean>(true);
  const [started, setStarted] = useState<boolean>(false);

  // Pool câu hỏi đã lọc theo bài học
  const pool = useMemo(() => {
    return extractSentencesFromData(data, selectedLessons, isEnglish);
  }, [data, selectedLessons, isEnglish]);

  // Trạng thái phiên luyện tập
  const [queue, setQueue] = useState<SentenceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);

  // Gợi ý và mở từ che dấu sao
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [showListenHint, setShowListenHint] = useState<boolean>(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const current = queue[currentIndex] || null;

  const isMixMode = activeMode === 'mix_group1' || activeMode === 'mix_group2' || activeMode === 'mix_all';

  // Xác định chế độ cụ thể cho câu hiện tại
  const effectiveConcreteMode: ConcreteSentenceMode = useMemo(() => {
    if (!isMixMode) {
      return activeMode as ConcreteSentenceMode;
    }
    return current?.assignedMode || 'translate_vi_to_target';
  }, [isMixMode, activeMode, current]);

  // Cấu hình hiển thị theo câu hiện tại
  const currentConfig = useMemo(() => {
    if (!current) return null;
    return getQuestionConfig(current, effectiveConcreteMode, isJapanese);
  }, [current, effectiveConcreteMode, isJapanese]);

  // Phát âm thanh câu ngoại ngữ
  const playAudio = useCallback((customText?: string, customLang?: string) => {
    if (!currentConfig) return;
    const textToSpeak = customText || currentConfig.audioText;
    const langToSpeak = customLang || currentConfig.audioLang;
    if (!textToSpeak) return;

    speakWithVoiceEngine(textToSpeak, {
      lang: langToSpeak,
      rate: 0.95,
      pitch: 1.0,
      volume: 1.0,
    });
  }, [currentConfig]);

  // Focus ô nhập khi sang câu mới
  useEffect(() => {
    if (started && !submitted) {
      inputRef.current?.focus();
    }
  }, [currentIndex, started, submitted, activeMode]);

  // Tự động phát âm thanh ở chế độ nghe khi chuyển câu
  useEffect(() => {
    if (started && currentConfig?.isAudioMode && !submitted) {
      const timer = setTimeout(() => {
        playAudio();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [started, currentConfig?.isAudioMode, currentIndex, submitted, playAudio]);

  // Tokens của câu đáp án hiện tại để che dấu sao
  const tokens = useMemo(() => {
    if (!currentConfig?.expectedText) return [];
    return tokenizeSentence(currentConfig.expectedText);
  }, [currentConfig?.expectedText]);

  // Tự động reveal từ che dấu sao khi người dùng gõ đúng từ đó
  useEffect(() => {
    if (!tokens || tokens.length === 0) return;
    const typedWords = cleanTextForCompare(input).split(/\s+/).filter(Boolean);
    const newRevealed = new Set(revealedIndices);
    let changed = false;

    tokens.forEach((tok, idx) => {
      const targetClean = cleanTextForCompare(tok.word);
      if (typedWords.includes(targetClean)) {
        if (!newRevealed.has(idx)) {
          newRevealed.add(idx);
          changed = true;
        }
      }
    });

    if (changed) {
      setRevealedIndices(newRevealed);
    }
  }, [input, tokens, revealedIndices]);

  // Phím tắt Ctrl + Space: Mở từ tiếp theo
  const revealNextWord = useCallback(() => {
    if (!tokens || tokens.length === 0) return;
    for (let i = 0; i < tokens.length; i++) {
      if (!revealedIndices.has(i)) {
        setRevealedIndices(prev => new Set([...prev, i]));
        break;
      }
    }
  }, [tokens, revealedIndices]);

  // Xử lý phím tắt
  useEffect(() => {
    if (!started || done) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space: mở từ tiếp theo
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        revealNextWord();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, done, revealNextWord]);

  // Kiểm tra câu trả lời
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || submitted || !currentConfig) return;

    const userClean = cleanTextForCompare(input);
    const acceptableAnswers = getAcceptableAnswers(currentConfig.expectedText);

    const check = acceptableAnswers.includes(userClean);
    setIsCorrect(check);
    setSubmitted(true);

    if (check) {
      setScore(s => s + 1);
      playAudio();
    } else {
      setWrong(s => s + 1);
    }
  };

  // Chuyển sang câu tiếp theo (kèm cơ chế đẩy câu sai xuống cuối queue để luyện lại)
  const handleNext = () => {
    if (!current) return;

    // Nếu trả lời sai: Đẩy câu sai này xuống cuối hàng đợi để luyện lại cho đến khi gõ đúng
    if (!isCorrect) {
      setQueue(prev => [...prev, current]);
    }

    const totalInQueue = queue.length + (!isCorrect ? 1 : 0);
    if (currentIndex + 1 >= totalInQueue) {
      setDone(true);
    } else {
      setCurrentIndex(i => i + 1);
      setInput('');
      setSubmitted(false);
      setIsCorrect(false);
      setRevealedIndices(new Set());
      setShowListenHint(false);
    }
  };

  // Chuẩn bị queue câu hỏi kèm gán ngẫu nhiên mode nếu là mix
  const prepareQueue = useCallback((itemsList: SentenceItem[], mode: SentenceMode): SentenceItem[] => {
    const shuffledItems = shuffle(itemsList);
    if (mode === 'mix_group1') {
      return shuffledItems.map(item => ({
        ...item,
        assignedMode: GROUP1_MODES[Math.floor(Math.random() * GROUP1_MODES.length)],
      }));
    }
    if (mode === 'mix_group2') {
      return shuffledItems.map(item => ({
        ...item,
        assignedMode: GROUP2_MODES[Math.floor(Math.random() * GROUP2_MODES.length)],
      }));
    }
    if (mode === 'mix_all') {
      return shuffledItems.map(item => ({
        ...item,
        assignedMode: ALL_CONCRETE_MODES[Math.floor(Math.random() * ALL_CONCRETE_MODES.length)],
      }));
    }
    return shuffledItems.map(item => ({ ...item, assignedMode: mode }));
  }, []);

  // Làm lại từ đầu
  const handleRestart = () => {
    setQueue(prepareQueue(pool, activeMode));
    setCurrentIndex(0);
    setInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setScore(0);
    setWrong(0);
    setDone(false);
    setRevealedIndices(new Set());
    setShowListenHint(false);
  };

  // Bắt đầu phiên luyện tập
  const handleStart = () => {
    setQueue(prepareQueue(pool, activeMode));
    setCurrentIndex(0);
    setInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setScore(0);
    setWrong(0);
    setDone(false);
    setRevealedIndices(new Set());
    setShowListenHint(false);
    setStarted(true);
  };

  // Chuyển đổi nhanh chế độ trong khi đang chơi
  const handleSwitchMode = (newMode: SentenceMode) => {
    setActiveMode(newMode);
    setInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setRevealedIndices(new Set());
    setShowListenHint(false);

    // Cập nhật lại queue hiện tại với mode mới
    setQueue(prev => {
      if (newMode === 'mix_group1') {
        return prev.map(item => ({
          ...item,
          assignedMode: GROUP1_MODES[Math.floor(Math.random() * GROUP1_MODES.length)],
        }));
      }
      if (newMode === 'mix_group2') {
        return prev.map(item => ({
          ...item,
          assignedMode: GROUP2_MODES[Math.floor(Math.random() * GROUP2_MODES.length)],
        }));
      }
      if (newMode === 'mix_all') {
        return prev.map(item => ({
          ...item,
          assignedMode: ALL_CONCRETE_MODES[Math.floor(Math.random() * ALL_CONCRETE_MODES.length)],
        }));
      }
      return prev.map(item => ({ ...item, assignedMode: newMode }));
    });
  };

  // ──────────────────────────────────────────────
  // 1. MÀN HÌNH CÀI ĐẶT (SETUP)
  // ──────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 md:p-12 font-sans">
        <div className="max-w-3xl mx-auto">
          <Link
            to={`/course/${course.id}/practice`}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-3 transition-colors"
          >
            <ArrowLeft size={18} /> Quay lại
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
            💬 Luyện Gõ Câu
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Luyện tập gõ cả câu hoàn chỉnh: 2 chiều Dịch câu, 2 chiều Nghe ngoại ngữ, hoặc Trộn ngẫu nhiên (Nhóm 1, Nhóm 2, Cả hai nhóm).
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
            {/* Bộ lọc bài học */}
            <VocabLessonChips
              options={lessons}
              selected={selectedLessons}
              onToggle={(val) => {
                setSelectedLessons(prev =>
                  prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
                );
              }}
              onSelectAll={() => setSelectedLessons([])}
              totalCount={data.length}
              getCount={(l) => data.filter(w => w.lesson === l).length}
              accentClass="border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
            />

            {/* Các tùy chọn chế độ luyện tập */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                  🔄 Chọn chế độ & Chiều gõ câu:
                </label>

                {/* Phần Trộn ngẫu nhiên đặc biệt */}
                <div className="mb-6 p-4 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    <Sparkles size={16} />
                    <span>Chế độ Trộn ngẫu nhiên (Luyện phản xạ nhanh):</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveMode('mix_all')}
                      className={`p-3.5 rounded-2xl border-2 font-medium text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        activeMode === 'mix_all'
                          ? 'border-indigo-600 bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 font-bold shadow-sm'
                          : 'border-indigo-200/80 dark:border-indigo-900/60 bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <Shuffle size={14} className="text-indigo-600 shrink-0" />
                          <span>Trộn Cả 2 Nhóm</span>
                        </span>
                        {activeMode === 'mix_all' && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                        Xáo trộn ngẫu nhiên cả 4 dạng bài (Dịch + Nghe)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMode('mix_group1')}
                      className={`p-3.5 rounded-2xl border-2 font-medium text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        activeMode === 'mix_group1'
                          ? 'border-indigo-600 bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 font-bold shadow-sm'
                          : 'border-indigo-200/80 dark:border-indigo-900/60 bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <Languages size={14} className="text-teal-600 shrink-0" />
                          <span>Trộn Nhóm 1</span>
                        </span>
                        {activeMode === 'mix_group1' && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                        Trộn 2 chiều Dịch (Nhìn VI ➔ Ngoại ngữ & Ngược lại)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMode('mix_group2')}
                      className={`p-3.5 rounded-2xl border-2 font-medium text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        activeMode === 'mix_group2'
                          ? 'border-indigo-600 bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 font-bold shadow-sm'
                          : 'border-indigo-200/80 dark:border-indigo-900/60 bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold flex items-center gap-1.5">
                          <Headphones size={14} className="text-blue-600 shrink-0" />
                          <span>Trộn Nhóm 2</span>
                        </span>
                        {activeMode === 'mix_group2' && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-snug">
                        Trộn 2 chiều Nghe (Nghe gõ Ngoại ngữ & Nghe gõ VI)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Nhóm 1: Dịch câu (Nhìn câu ➔ Gõ câu) */}
                <div className="space-y-3 mb-5">
                  <p className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                    <Languages size={15} />
                    <span>Nhóm 1: Dịch (Nhìn câu ➔ Gõ câu)</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveMode('translate_vi_to_target')}
                      className={`p-4 rounded-2xl border-2 font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                        activeMode === 'translate_vi_to_target'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold">Nghĩa Tiếng Việt ➔ Gõ {targetLangLabel}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Nhìn câu tiếng Việt ➔ Dịch và gõ câu {targetLangLabel}</div>
                      </div>
                      {activeMode === 'translate_vi_to_target' && <CheckCircle2 size={18} className="text-teal-600 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMode('translate_target_to_vi')}
                      className={`p-4 rounded-2xl border-2 font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                        activeMode === 'translate_target_to_vi'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold">Câu {targetLangLabel} ➔ Gõ Nghĩa Tiếng Việt</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Nhìn câu {targetLangLabel} ➔ Dịch và gõ câu tiếng Việt</div>
                      </div>
                      {activeMode === 'translate_target_to_vi' && <CheckCircle2 size={18} className="text-teal-600 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Nhóm 2: Nghe câu (Nghe ngoại ngữ ➔ Gõ câu) */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                    <Headphones size={15} />
                    <span>Nhóm 2: Nghe (Nghe ngoại ngữ ➔ Gõ câu)</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveMode('listen_target_to_target')}
                      className={`p-4 rounded-2xl border-2 font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                        activeMode === 'listen_target_to_target'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold">Nghe {targetLangLabel} ➔ Gõ {targetLangLabel}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Nghe phát âm ngoại ngữ ➔ Gõ lại chính tả câu {targetLangLabel}</div>
                      </div>
                      {activeMode === 'listen_target_to_target' && <CheckCircle2 size={18} className="text-teal-600 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveMode('listen_target_to_vi')}
                      className={`p-4 rounded-2xl border-2 font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                        activeMode === 'listen_target_to_vi'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold">Nghe {targetLangLabel} ➔ Gõ Nghĩa Tiếng Việt</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Nghe hiểu câu {targetLangLabel} ➔ Gõ nghĩa tiếng Việt</div>
                      </div>
                      {activeMode === 'listen_target_to_vi' && <CheckCircle2 size={18} className="text-teal-600 shrink-0" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tùy chọn gợi ý che dấu sao ***** */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowMaskChips(prev => !prev)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                    showMaskChips
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 font-bold text-sm">
                    {showMaskChips ? <Eye size={20} /> : <EyeOff size={20} />}
                    <span>{showMaskChips ? 'Bật khung chip che dấu sao (***** Gợi ý)' : 'Ẩn khung chip dấu sao (Thử thách cao)'}</span>
                  </div>
                  <div
                    className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative transition-colors"
                    style={{ backgroundColor: showMaskChips ? '#0d9488' : '' }}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        showMaskChips ? 'left-5' : 'left-1'
                      }`}
                    />
                  </div>
                </button>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  💡 Bạn có thể nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono border">Ctrl + Space</kbd> trong lúc gõ để mở gợi ý từ tiếp theo.
                </p>
              </div>
            </div>

            {/* Thông báo số lượng câu khả dụng */}
            {pool.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-sm">
                ⚠️ Khóa học này chưa có câu ví dụ nào. Vui lòng bổ sung câu ví dụ cho các từ vựng để sử dụng chế độ Luyện Gõ Câu!
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tìm thấy <strong className="text-teal-600 dark:text-teal-400">{pool.length}</strong> câu ví dụ sẵn sàng luyện tập.
              </div>
            )}

            {/* Nút Bắt đầu */}
            <button
              type="button"
              onClick={handleStart}
              disabled={pool.length === 0}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
            >
              Bắt đầu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // 2. MÀN HÌNH KẾT QUẢ (DONE)
  // ──────────────────────────────────────────────
  if (done) {
    const total = score + wrong;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg max-w-xs w-full text-center"
        >
          <Trophy className="mx-auto mb-3 text-amber-400" size={56} />
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-1">Kết quả</h2>
          <div className="text-6xl font-black text-teal-600 my-4">{pct}%</div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-green-50 dark:bg-green-900/30 rounded-xl p-3">
              <div className="text-xl font-bold text-green-600">{score}</div>
              <div className="text-xs text-green-600">Đúng</div>
            </div>
            <div className="flex-1 bg-red-50 dark:bg-red-900/30 rounded-xl p-3">
              <div className="text-xl font-bold text-red-500">{wrong}</div>
              <div className="text-xs text-red-500">Sai</div>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRestart}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              Làm lại
            </button>
            <Link
              to={`/course/${course.id}/practice`}
              className="block w-full py-3 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:border-teal-400 transition-all text-center"
            >
              Về Luyện tập Hub
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // 3. MÀN HÌNH LUYỆN TẬP (PLAYING)
  // ──────────────────────────────────────────────
  const progress = queue.length > 0 ? ((currentIndex + 1) / queue.length) * 100 : 0;
  const userWordsClean = cleanTextForCompare(input).split(/\s+/).filter(Boolean);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header trên cùng */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => setStarted(false)}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors font-medium cursor-pointer text-sm"
          >
            <ArrowLeft size={18} /> Cài đặt
          </button>

          {/* Quick Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            {/* Nhóm 1 đơn */}
            <button
              type="button"
              onClick={() => handleSwitchMode('translate_vi_to_target')}
              className={`px-2 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                activeMode === 'translate_vi_to_target'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Nhìn tiếng Việt ➔ Gõ câu ngoại ngữ"
            >
              VI ➔ {targetShortCode}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('translate_target_to_vi')}
              className={`px-2 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                activeMode === 'translate_target_to_vi'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Nhìn câu ngoại ngữ ➔ Gõ tiếng Việt"
            >
              {targetShortCode} ➔ VI
            </button>

            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-0.5" />

            {/* Nhóm 2 đơn */}
            <button
              type="button"
              onClick={() => handleSwitchMode('listen_target_to_target')}
              className={`px-2 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'listen_target_to_target'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Nghe ngoại ngữ ➔ Gõ ngoại ngữ (Chính tả)"
            >
              <Headphones size={12} />
              <span>Nghe {targetShortCode}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('listen_target_to_vi')}
              className={`px-2 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'listen_target_to_vi'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Nghe ngoại ngữ ➔ Gõ nghĩa tiếng Việt"
            >
              <Headphones size={12} />
              <span>Nghe ➔ VI</span>
            </button>

            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-0.5" />

            {/* Các tùy chọn Trộn */}
            <button
              type="button"
              onClick={() => handleSwitchMode('mix_group1')}
              className={`px-2 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'mix_group1'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30'
              }`}
              title="Trộn ngẫu nhiên 2 chiều Nhóm 1 (Nhìn & Dịch)"
            >
              <Shuffle size={11} />
              <span>Trộn N1</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('mix_group2')}
              className={`px-2 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'mix_group2'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
              title="Trộn ngẫu nhiên 2 chiều Nhóm 2 (Nghe hiểu)"
            >
              <Shuffle size={11} />
              <span>Trộn N2</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('mix_all')}
              className={`px-2 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'mix_all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              }`}
              title="Trộn ngẫu nhiên tất cả 4 chiều (Nhóm 1 + Nhóm 2)"
            >
              <Sparkles size={11} />
              <span>Trộn Tất Cả</span>
            </button>
          </div>

          {/* Tiến độ câu: 1 / 20 */}
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {currentIndex + 1} / {queue.length}
          </span>
        </div>

        {/* Thanh tiến độ */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-teal-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Thẻ câu hỏi chính */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${current?.id}-${effectiveConcreteMode}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 mb-4 text-center space-y-4">
              {/* Badges: Bài học & Chiều câu hỏi hiện tại */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {current?.lesson && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full font-medium inline-block">
                    {current.lesson}
                  </span>
                )}
                {currentConfig?.badgeLabel && (
                  <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full font-bold inline-block border border-teal-200 dark:border-teal-800/40">
                    {currentConfig.badgeLabel}
                  </span>
                )}
              </div>

              {/* Nội dung câu hỏi theo chế độ */}
              {currentConfig && !currentConfig.isAudioMode ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {currentConfig.promptTitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => playAudio()}
                      className="p-1.5 rounded-xl text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title="Phát âm câu này"
                    >
                      <Volume2 size={16} />
                      <span>Nghe</span>
                    </button>
                  </div>

                  <div className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white leading-relaxed">
                    {currentConfig.promptContent}
                  </div>

                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {currentConfig.isTypingVietnamese
                      ? 'Gõ nghĩa câu bằng tiếng Việt hoàn chỉnh'
                      : `Gõ câu bằng ${targetLangLabel} hoàn chỉnh`}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {currentConfig?.promptTitle}
                  </p>
                  <button
                    type="button"
                    onClick={() => playAudio()}
                    className="mx-auto w-16 h-16 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-md shadow-teal-200 dark:shadow-teal-950/50 cursor-pointer"
                    title="Nghe lại phát âm ngoại ngữ"
                  >
                    <Volume2 size={32} />
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowListenHint(s => !s)}
                      className="text-xs text-slate-400 hover:text-teal-600 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showListenHint ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showListenHint ? 'Ẩn gợi ý' : 'Hiện gợi ý'}</span>
                    </button>
                    {showListenHint && currentConfig?.hintText && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic pt-1">
                        {currentConfig.hintTitle} {currentConfig.hintText}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Khung chip từ che dấu sao (*****) */}
              {showMaskChips && tokens.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap gap-2 items-center justify-center">
                  {tokens.map((tok, idx) => {
                    const isRevealed = revealedIndices.has(idx) || submitted;
                    const displayMask = '*'.repeat(Math.max(tok.word.length, 1)) + tok.punctuation;
                    return (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full border text-xs md:text-sm font-mono transition-all select-none ${
                          isRevealed
                            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {isRevealed ? tok.full : displayMask}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Ô gõ câu & form submit */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={input}
                  onChange={e => {
                    if (submitted) return;
                    if (isJapanese && currentConfig && !currentConfig.isTypingVietnamese) {
                      // Gõ tiếng Nhật -> tự động chuyển Hiragana
                      setInput(wanakana.toHiragana(e.target.value, { IMEMode: true }));
                    } else {
                      // Gõ tiếng Anh hoặc tiếng Việt -> gõ chữ thường
                      setInput(e.target.value);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (submitted) {
                        handleNext();
                      } else {
                        handleSubmit();
                      }
                    }
                  }}
                  disabled={submitted && isCorrect}
                  placeholder={
                    currentConfig?.isTypingVietnamese
                      ? 'Nhập câu tiếng Việt...'
                      : isJapanese
                        ? 'Nhập câu tiếng Nhật...'
                        : 'Nhập câu tiếng Anh...'
                  }
                  className={`w-full text-center text-lg md:text-xl font-medium p-4 rounded-2xl border-2 outline-none transition-all dark:bg-slate-700 dark:text-white ${
                    submitted
                      ? isCorrect
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'border-slate-200 dark:border-slate-600 focus:border-teal-500'
                  }`}
                />

                {!submitted ? (
                  <div className="space-y-2">
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Kiểm tra (Enter)
                    </button>
                    {showMaskChips && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">
                          Ctrl
                        </kbd>
                        <span>+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">
                          Space
                        </kbd>
                        <span>để mở từ tiếp theo</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Kết quả đúng */}
                    {isCorrect && (
                      <div className="p-4 rounded-2xl flex items-center justify-center gap-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-bold text-lg">
                        <CheckCircle2 size={22} />
                        <span>Chính xác! 🎉</span>
                      </div>
                    )}

                    {/* Kết quả sai kèm diff highlight */}
                    {!isCorrect && (
                      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-left space-y-2">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                          <XCircle size={18} />
                          <span>Chưa chính xác (câu này sẽ được đưa xuống cuối để luyện lại):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 font-mono text-sm pt-1">
                          {tokens.map((tok, tIdx) => {
                            const uWord = userWordsClean[tIdx];
                            const tWordClean = cleanTextForCompare(tok.word);
                            const isMatch = uWord === tWordClean;
                            return (
                              <span
                                key={tIdx}
                                className={`px-2 py-0.5 rounded border ${
                                  isMatch
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300'
                                    : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300'
                                }`}
                              >
                                {tok.full}
                              </span>
                            );
                          })}
                        </div>
                        <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                          Đáp án đúng:{' '}
                          <span className="font-bold text-slate-800 dark:text-white">
                            {currentConfig?.expectedText}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Nút Tiếp theo */}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full py-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span>
                        {currentIndex + 1 >= queue.length + (!isCorrect ? 1 : 0)
                          ? '🏁 Xem kết quả'
                          : 'Tiếp theo (Enter)'}
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  </motion.div>
                )}
              </form>
            </div>

            {/* Thống kê Đúng / Sai mini bên dưới chuẩn của Luyện tập */}
            <div className="flex justify-center gap-6 mt-4 text-sm font-bold">
              <span className="text-green-500 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Đúng: {score}
              </span>
              <span className="text-red-500 flex items-center gap-1.5">
                <XCircle size={16} /> Sai: {wrong}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
