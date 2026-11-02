import { useState, useEffect, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { TypingQ } from './VocabCommon';
import { KanaInputToggle } from '../../../components/shared/KanaInputToggle';
import { convertRomajiWithMode, type KanaInputMode } from '../../../lib/romajiConverter';

interface VocabTypingProps {
  q: TypingQ;
  typingInput: string;
  setTypingInput: (s: string) => void;
  typingSubmitted: boolean;
  typingCorrect: boolean;
  typingHintShown: boolean;
  onSubmit: (e: React.FormEvent) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  countdown: number | null;
  onNext: () => void;
  resultSecs: number;
  skipRomaji?: boolean; // true for English courses
}

export default function VocabTyping({
  q,
  typingInput,
  setTypingInput,
  typingSubmitted,
  typingCorrect,
  typingHintShown,
  onSubmit,
  inputRef,
  countdown,
  onNext,
  resultSecs,
  skipRomaji = false,
}: VocabTypingProps) {
  const hasHint = !!q.hintText && q.hintText.trim() !== '';
  const isExpectedKatakana = !skipRomaji && /^[\u30A0-\u30FF\u30FC\s]+$/.test(q.answer);
  const [kanaMode, setKanaMode] = useState<KanaInputMode>(isExpectedKatakana ? 'katakana' : 'hiragana');

  useEffect(() => {
    setKanaMode(isExpectedKatakana ? 'katakana' : 'hiragana');
  }, [q.prompt, isExpectedKatakana]);

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 text-center shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="text-2xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-2">
          <span>{q.prompt}</span>
          {q.readingType && (
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
              q.readingType === '訓'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : q.readingType === '音'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}>
              {q.readingType === '訓' ? '訓 · Âm Kun' : q.readingType === '音' ? '音 · Âm On' : '特殊 · Đọc đặc biệt'}
            </span>
          )}
        </div>
        {typingHintShown && hasHint && <div className="text-indigo-500 text-sm mt-2 font-medium">💡 {q.hintText}</div>}
      </div>
      <form onSubmit={onSubmit}>
        <div className="relative mb-2">
          <input
            ref={inputRef}
            type="text"
            value={typingInput}
            disabled={typingSubmitted}
            onChange={e => {
              if (!typingSubmitted) {
                if (skipRomaji) {
                  // English: plain text input, no romaji conversion
                  setTypingInput(e.target.value);
                } else {
                  setTypingInput(convertRomajiWithMode(e.target.value, kanaMode));
                }
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Tab' && !skipRomaji) {
                e.preventDefault();
                setKanaMode(m => m === 'hiragana' ? 'katakana' : 'hiragana');
              }
            }}
            onFocus={e => {
              // Scroll input into view when mobile keyboard pops up
              setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
            }}
            placeholder={skipRomaji ? 'Type the word...' : `Gõ Romaji (${kanaMode === 'hiragana' ? 'Hiragana' : 'Katakana'})...`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className={`w-full text-center text-2xl font-bold p-4 rounded-2xl border-2 outline-none transition-all dark:bg-slate-700 dark:text-white ${
              !skipRomaji ? 'pr-28 sm:pr-32' : ''
            } ${
              typingSubmitted
                ? typingCorrect
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-red-400 bg-red-50 dark:bg-red-950/20'
                : 'border-slate-200 focus:border-indigo-500'
            }`}
          />
          {!skipRomaji && !typingSubmitted && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <KanaInputToggle
                mode={kanaMode}
                onToggle={() => setKanaMode(m => m === 'hiragana' ? 'katakana' : 'hiragana')}
                size="sm"
              />
            </div>
          )}
        </div>
        {!typingSubmitted ? (
          <div className="flex gap-2">
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl text-sm">
              Kiểm tra <kbd className="ml-1 px-1 bg-white/20 rounded text-xs font-mono">Enter</kbd>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {!typingCorrect && (
              <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-center">
                <div className="text-xs text-slate-500 mb-1">Đáp án đúng:</div>
                <div className="text-xl font-black text-slate-800 dark:text-white">{q.answerDisplay}</div>
              </div>
            )}
            {countdown !== null && (
              <div className="space-y-2">
                
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onNext}
                  className={`w-full py-3.5 rounded-2xl font-bold text-white relative overflow-hidden flex items-center justify-center gap-2 ${
                    typingCorrect ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                >
                  <motion.div
                    className="absolute left-0 inset-y-0 bg-black/10"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: resultSecs, ease: 'linear' }}
                  />
                  {typingCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  Tiếp theo ({countdown}s) · <kbd className="px-1 bg-white/20 rounded text-xs">Enter</kbd>
                </motion.button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
