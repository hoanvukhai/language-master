// src/components/FlashcardModule/CardFront.tsx
import { useMemo, useCallback, useEffect, useState } from 'react';
import type { Word } from '../../types';
import type { FormType } from '../../context/features/flashcard/FlashcardSettingsContext';
import { useFlashcardSettings } from '../../context/features/flashcard/useFlashcardSettings';
import { useSettings } from '../../context/global/useSettings';
import { FORM_REGISTRY, getFormLabel } from '../../lib/formRegistry';
import { RotateCcw, Volume2, BookOpen, ArrowRight, X } from 'lucide-react';
import { getRuleForForm } from '../../data/jlpt/conjugation/conjugationRules';

interface CardFrontProps {
  word: Word;
  isFlipped?: boolean;
  actualSourceForm: FormType;
  actualTargetForms: FormType[];
}

export default function CardFront({ word, isFlipped, actualSourceForm, actualTargetForms }: CardFrontProps) {
  const { settings: flashcardSettings } = useFlashcardSettings();
  const { showConjugation, showFurigana, showMeaning } = flashcardSettings.uiFront;
  const { autoPlayFront } = flashcardSettings;
  const { language } = useSettings();

  const [showPopover, setShowPopover] = useState(false);
  const isSourceRandom = flashcardSettings.sourceForm === 'random';
  const [isSourceBlurred, setIsSourceBlurred] = useState(isSourceRandom);

  // Reset popover and blur when new card appears
  useEffect(() => {
    setShowPopover(false);
    setIsSourceBlurred(isSourceRandom);
  }, [word.id, actualSourceForm, isSourceRandom]);

  const displayMeaning = typeof word.meaning === 'object' ? word.meaning[language] : word.meaning;

  const mainText = useMemo(() => {
    const formDef = FORM_REGISTRY.find(f => f.id === actualSourceForm);
    if (!formDef || actualSourceForm === 'jisho') return word.kanji || word.hiragana;
    return formDef.conjugate(word);
  }, [actualSourceForm, word]);

  const furiganaText = useMemo(() => {
    if (!word.kanji || word.kanji === word.hiragana) return null;
    const formDef = FORM_REGISTRY.find(f => f.id === actualSourceForm);
    if (!formDef || actualSourceForm === 'jisho') return word.hiragana;
    return formDef.conjugate({ ...word, kanji: word.hiragana });
  }, [actualSourceForm, word]);

  const playAudio = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    const utterance = new SpeechSynthesisUtterance(mainText);
    utterance.lang = 'ja-JP'; utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, [mainText]);

  useEffect(() => {
    if (!isFlipped && autoPlayFront) {
      const timer = setTimeout(() => playAudio(), 100);
      return () => clearTimeout(timer);
    }
  }, [word.id, actualSourceForm, autoPlayFront]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeMap: Record<string, string> = {
    verb: language === 'en' ? 'Verb' : '動詞',
    adj_i: language === 'en' ? 'i-Adj' : 'い形容詞',
    adj_na: language === 'en' ? 'na-Adj' : 'な形容詞',
    noun: language === 'en' ? 'Noun' : '名詞',
  };
  const typeBadge = typeMap[word.type] || word.type;

  const handleChipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopover(true);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col p-6 [backface-visibility:hidden] border border-slate-200 dark:border-slate-700 transition-colors">
      {/* Popover */}
      {showPopover && (
        <div
          className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-4 rounded-2xl flex flex-col overflow-y-auto custom-scrollbar border border-indigo-200 dark:border-indigo-800"
          onClick={(e) => { e.stopPropagation(); setShowPopover(false); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" />
              {language === 'en' ? 'Conjugation Rules' : 'Quy tắc chia thể'}
            </h3>
            <button className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {actualTargetForms.map(formId => {
              const rule = getRuleForForm(formId);
              if (!rule) return null;
              const applicableRules = rule.rules.filter(r => {
                if (!r.type || r.type === 'all') return true;
                if (word.type === 'verb' && r.type === `verb${word.group}`) return true;
                if (r.type === word.type) return true;
                if (r.type === 'noun/na' && (word.type === 'noun' || word.type === 'adj_na')) return true;
                return false;
              });
              if (applicableRules.length === 0) return null;

              return (
                <div key={formId} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600/50">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 mb-2 border-b border-indigo-100 dark:border-indigo-900/30 pb-1">
                    {rule.title}
                  </div>
                  {applicableRules.map((r, i) => (
                    <div key={i} className="text-sm text-slate-600 dark:text-slate-300 mb-1 last:mb-0">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{r.cond}:</span> {r.pattern}
                      {r.example && <span className="text-slate-500 dark:text-slate-400 ml-1 block text-xs mt-0.5">VD: {r.example}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full flex justify-between items-start mb-auto pt-1">
        <div className="flex flex-col gap-2 flex-1 mr-2">
          {/* Target Forms Line */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 transition-all ${isSourceBlurred ? 'blur-[4px] opacity-70 cursor-pointer hover:blur-[2px]' : ''}`}
              onClick={(e) => {
                if (isSourceBlurred) {
                  e.stopPropagation();
                  setIsSourceBlurred(false);
                }
              }}
              onPointerDown={(e) => isSourceBlurred && e.stopPropagation()}
              title={isSourceBlurred ? (language === 'en' ? 'Click to reveal' : 'Nhấp để hiện thể gốc') : ''}
            >
              {getFormLabel(actualSourceForm, language)}
            </span>
            <ArrowRight size={14} className="text-slate-400" />

            <div
              className="flex flex-wrap items-center gap-1.5 cursor-pointer transition-all"
              onClick={handleChipClick}
              onPointerDown={(e) => e.stopPropagation()}
              title={language === 'en' ? 'Click to show rules' : 'Nhấp để xem quy tắc'}
            >
              {actualTargetForms.slice(0, 3).map((f, i) => (
                <span key={`${f}-${i}`} className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {getFormLabel(f, language)}
                </span>
              ))}
              {actualTargetForms.length > 3 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  +{actualTargetForms.length - 3} {language === 'en' ? 'more' : 'nữa'}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              {typeBadge}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold">
              {word.level}
            </span>
          </div>
        </div>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={playAudio}
          className="p-2 bg-white dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm shrink-0"
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center justify-center flex-1 w-full mt-4 overflow-y-auto custom-scrollbar py-2">
        {showConjugation && (
          <>
            {showFurigana && furiganaText && (
              <span className="text-slate-500 dark:text-slate-400 text-lg font-medium mb-2">
                {furiganaText}
              </span>
            )}
            <h2 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4 text-center px-2 leading-tight break-all">
              {mainText}
            </h2>
          </>
        )}
        {showMeaning && (
          <div className="text-2xl text-blue-600 dark:text-blue-400 font-bold mt-2 text-center px-4">
            {displayMeaning}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pb-2 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm animate-pulse">
        <RotateCcw size={16} className="mr-2" />
        <span>{language === 'en' ? 'Tap to flip / view hints' : 'Chạm để lật / xem gợi ý'}</span>
      </div>
    </div>
  );
}