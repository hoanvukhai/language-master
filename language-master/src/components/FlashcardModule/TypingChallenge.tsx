// src/components/FlashcardModule/TypingChallenge.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import type { Word } from '../../types';
import type { FormType } from '../../context/features/flashcard/FlashcardSettingsContext';
import { FORM_REGISTRY, getFormLabel } from '../../lib/formRegistry';
import { useSettings } from '../../context/global/useSettings';
import { useFlashcardSettings } from '../../context/features/flashcard/useFlashcardSettings';
import { romajiToHiragana } from '../../lib/romajiConverter';
import * as wanakana from 'wanakana';
import { resolveForm } from './FlipCard';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Volume2 } from 'lucide-react';

interface TypingChallengeProps {
  word: Word;
  targetFormsOverride: FormType[];
  cardSeed: number;
  onCorrect: () => void;
  onWrong: () => void;
  onNextEndless: () => void;
  isQuizMode: boolean;
}

export default function TypingChallenge({
  word,
  targetFormsOverride,
  cardSeed,
  onCorrect,
  onWrong,
  onNextEndless,
  isQuizMode,
}: TypingChallengeProps) {
  const { language } = useSettings();
  const { settings } = useFlashcardSettings();
  const [userTyping, setUserTyping] = useState('');
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  // Chỉ lấy 1 target form duy nhất để challenge (lấy cái đầu tiên)
  const targetForm = useMemo(() => {
    const baseTargetForms = targetFormsOverride || settings.targetForms;
    if (baseTargetForms.length === 0) return 'jisho' as FormType;
    return resolveForm(baseTargetForms[0], cardSeed, 0, word, []);
  }, [targetFormsOverride, settings.targetForms, cardSeed, word]);

  const targetData = useMemo(() => {
    const formDef = FORM_REGISTRY.find(f => f.id === targetForm);
    const correctAns = formDef ? formDef.conjugate(word) : word.hiragana;
    return {
      formId: targetForm,
      label: getFormLabel(targetForm, language),
      correctAns,
    };
  }, [targetForm, word, language]);

  // Focus input khi đổi thẻ
  useEffect(() => {
    setUserTyping('');
    setFeedback('none');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [word.id, targetForm, cardSeed]);

  const playAudio = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(targetData.correctAns);
    u.lang = 'ja-JP';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const handleSubmit = () => {
    if (feedback !== 'none' || !userTyping.trim()) return;

    const inputHiragana = romajiToHiragana(userTyping.trim());
    const isCorrect = inputHiragana === wanakana.toHiragana(targetData.correctAns);

    setFeedback(isCorrect ? 'correct' : 'wrong');

    if (isCorrect && settings.autoPlayAudio) {
      playAudio();
    }

    // Auto next after delay
    setTimeout(() => {
      if (isCorrect) {
        if (isQuizMode) onCorrect();
        else onNextEndless();
      } else {
        if (isQuizMode) onWrong();
        else {
          // Endless mode: reset để gõ lại nếu sai
          setFeedback('none');
          setUserTyping('');
          inputRef.current?.focus();
        }
      }
    }, isCorrect ? 800 : 1500);
  };

  const isCorrectFB = feedback === 'correct';

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto">
      {/* Feedback Banner */}
      <div className="h-14 mb-2">
        <AnimatePresence mode="wait">
          {feedback !== 'none' && (
            <motion.div
              key={feedback}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`w-full flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-sm shadow-sm ${
                isCorrectFB
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-300'
                  : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700/50 dark:text-red-300'
              }`}
            >
              {isCorrectFB ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <span>
                {isCorrectFB
                  ? (language === 'en' ? 'Correct!' : 'Chính xác!')
                  : (language === 'en' ? `Wrong! Answer: ${targetData.correctAns}` : `Sai rồi! Đáp án: ${targetData.correctAns}`)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        key={`${word.id}-${targetForm}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xl text-center"
      >
        <div className="mb-2">
          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">
            {targetData.label}
          </span>
        </div>

        <h2 className="text-4xl font-black text-slate-800 dark:text-white mt-4 mb-1">
          {word.kanji || word.hiragana}
        </h2>
        {word.kanji && word.kanji !== word.hiragana && (
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">{word.hiragana}</p>
        )}
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">
          {typeof word.meaning === 'object' ? word.meaning[language] : word.meaning}
        </p>

        <div className="mt-8 space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={userTyping}
            onChange={(e) => setUserTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            disabled={feedback !== 'none'}
            placeholder={language === 'en' ? 'Type romaji...' : 'Gõ romaji...'}
            className="w-full py-4 px-5 bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600/50 rounded-2xl text-center font-bold text-xl text-blue-600 dark:text-blue-400 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 transition-colors disabled:opacity-60"
          />
          {userTyping && (
            <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">
              → <strong>{romajiToHiragana(userTyping)}</strong>
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={playAudio}
              className="p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-2xl transition-colors"
            >
              <Volume2 size={20} />
            </button>
            <button
              onClick={handleSubmit}
              disabled={feedback !== 'none' || !userTyping.trim()}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white font-bold rounded-2xl transition-colors shadow-md"
            >
              {language === 'en' ? 'Submit' : 'Gửi'} <kbd className="ml-2 text-xs opacity-70">Enter</kbd>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
