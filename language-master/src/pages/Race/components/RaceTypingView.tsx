// src/pages/Race/components/RaceTypingView.tsx
// Sub-component cho Game 3: Gõ Phím Kana (Từ vựng/Kanji) hoặc Điền Ô Trống 1/4 (Ngữ pháp)
// Hỗ trợ 100% Light/Dark mode & Tiếng Việt/English

import { motion } from 'framer-motion';
import { romajiToHiragana, romajiToKatakana } from '../../../lib/romajiConverter';

interface RaceTypingViewProps {
  subject: string; // 'vocab' | 'kanji' | 'grammar'
  question: {
    id: string;
    prompt: string;
    subPrompt?: string;
    correctAnswer: string;
    options?: string[]; // 4 options for grammar fillblank
  };
  typingInput: string;
  selectedOption: string | null;
  isAnswerCorrect: boolean | null;
  onChangeInput: (val: string) => void;
  onSubmitAnswer: (ans?: string) => void;
  language?: string;
  skipRomaji?: boolean; // true for English or any plain-text course
}

export default function RaceTypingView({
  subject,
  question,
  typingInput,
  isAnswerCorrect,
  onChangeInput,
  onSubmitAnswer,
  language = 'vi',
  skipRomaji = false,
}: RaceTypingViewProps) {
  const isGrammar = subject === 'grammar';
  const isExpectedKatakana = !skipRomaji && /^[\u30A0-\u30FF\u30FC\s]+$/.test(question.correctAnswer);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 my-auto text-center font-sans transition-colors"
    >
      {/* Header Info */}
      <div>
        <p className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2 leading-relaxed">
          {question.prompt}
        </p>
        {question.subPrompt && (
          <p className="inline-block mt-1 text-xs font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/50">
            {question.subPrompt}
          </p>
        )}
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <input
            type="text"
            value={typingInput}
            onChange={e => {
              const val = e.target.value;
              if (skipRomaji || subject === 'hanjt') {
                // Plain text – no romaji conversion
                onChangeInput(val);
              } else {
                onChangeInput(isExpectedKatakana ? romajiToKatakana(val) : romajiToHiragana(val));
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Ngăn trình duyệt tự click nút bậy bạ
                e.stopPropagation(); // Ngăn sự kiện nổi bọt lên window listener
                onSubmitAnswer(typingInput);
              }
            }}
            placeholder={
              subject === 'hanjt' 
                ? (language === 'en' ? 'Type Vietnamese meaning (no tones needed)...' : 'Gõ Âm Hán Việt (có dấu hoặc không dấu)...')
                : isGrammar
                ? (language === 'en' ? 'Type grammar structure (e.g., tameni)...' : 'Gõ cấu trúc ngữ pháp (VD: tameni)...')
                : (language === 'en' ? 'Type Romaji to get Kana...' : 'Gõ Romaji (sẽ tự động chuyển thành Hiragana)...')
            }
            className={`w-full py-4 px-4 rounded-2xl text-center font-bold text-3xl focus:outline-none transition-all border-2 ${
              isAnswerCorrect === true
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-500'
                : isAnswerCorrect === false
                ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-amber-300 focus:border-indigo-500'
            }`}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={isAnswerCorrect !== null}
          />
        </div>

        <button
          onClick={() => onSubmitAnswer(typingInput)}
          disabled={isAnswerCorrect !== null}
          className="w-full py-4 rounded-2xl font-black text-white text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-indigo-600"
        >
          {language === 'en' ? 'Submit Answer' : '✓ Gửi đáp án'}
        </button>
      </div>
    </motion.div>
  );
}
