import type { RefObject } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import * as wanakana from 'wanakana';
import type { TypingQ } from './KanjiCommon';

interface KanjiTypingProps {
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
}

export default function KanjiTyping({
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
}: KanjiTypingProps) {
  const hasHint = !!q.hintText && q.hintText.trim() !== '';

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 text-center shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="text-2xl font-black text-slate-800 dark:text-white">{q.prompt}</div>
        {q.promptSub && <div className="text-amber-500 text-sm mt-1">{q.promptSub}</div>}
        {typingHintShown && hasHint && <div className="text-indigo-500 text-sm mt-2">💡 {q.hintText}</div>}
      </div>
      
      <form onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={typingInput}
          disabled={typingSubmitted}
          onChange={e => {
            if (!typingSubmitted) {
              if (q.inputMode === 'jp') {
                setTypingInput(wanakana.toHiragana(e.target.value, { IMEMode: true }));
              } else {
                setTypingInput(e.target.value);
              }
            }
          }}
          onFocus={e => {
            setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
          }}
          placeholder={q.inputMode === 'jp' ? "Gõ Romaji → Hiragana..." : "Gõ Tiếng Việt (Hán Việt)..."}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className={`w-full text-center text-2xl font-bold p-4 rounded-2xl border-2 outline-none transition-all dark:bg-slate-700 dark:text-white mb-2 ${
            typingSubmitted
              ? typingCorrect
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                : 'border-red-400 bg-red-50 dark:bg-red-950/20'
              : 'border-slate-200 focus:border-indigo-500'
          }`}
        />
        {!typingSubmitted ? (
          <div className="flex gap-2">
            <button type="submit" className="w-full py-3 bg-amber-500 text-white font-bold rounded-2xl text-sm">
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
