// src/components/FlashcardModule/CardBack.tsx
import { useMemo, useEffect, useCallback, useState } from 'react';
import type { Word } from '../../types';
import type { FormType } from '../../context/features/flashcard/FlashcardSettingsContext';
import { useFlashcardSettings } from '../../context/features/flashcard/useFlashcardSettings';
import { useSettings } from '../../context/global/useSettings';
import { FORM_REGISTRY, getFormLabel } from '../../lib/formRegistry';
import { getRuleForForm } from '../../data/jlpt/conjugation/conjugationRules';
import { Volume2, BookOpen, Star, Zap, ChevronRight, X } from 'lucide-react';

interface CardBackProps {
  word: Word;
  isFlipped?: boolean;
  actualTargetForms: FormType[];
}

export default function CardBack({ word, isFlipped, actualTargetForms }: CardBackProps) {
  const { settings } = useFlashcardSettings();
  const { showConjugation, showFurigana, showMeaning } = settings.uiBack;
  const { autoPlayAudio } = settings;
  const { language } = useSettings();

  const [activeRuleForm, setActiveRuleForm] = useState<FormType | null>(null);

  // Auto reset popup when flipped
  useEffect(() => {
    setActiveRuleForm(null);
  }, [isFlipped, word.id]);

  const displayMeaning = typeof word.meaning === 'object' ? word.meaning[language] : word.meaning;

  const results = useMemo(() => {
    return actualTargetForms.map(form => {
      const formDef = FORM_REGISTRY.find(f => f.id === form);
      const text = formDef ? formDef.conjugate(word) : word.hiragana;
      const furigana = (word.kanji && word.kanji !== word.hiragana)
        ? (formDef ? formDef.conjugate({ ...word, kanji: word.hiragana }) : word.hiragana)
        : null;
      const label = getFormLabel(form, language);
      return { form, text, furigana, label };
    });
  }, [actualTargetForms, word, language]);

  const playAudio = useCallback((e?: React.MouseEvent | React.PointerEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    const textToRead = results.map(r => r.text).join('、');
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ja-JP'; utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, [results]);

  useEffect(() => {
    if (isFlipped && autoPlayAudio) {
      const timer = setTimeout(() => playAudio(), 150);
      return () => clearTimeout(timer);
    }
  }, [isFlipped, autoPlayAudio, playAudio]);

  // ── Badge helpers ────────────────────────────────────────
  const typeMap: Record<string, { ja: string; en: string }> = {
    verb: { ja: '動詞', en: 'Verb' },
    adj_i: { ja: 'い形容詞', en: 'i-Adj' },
    adj_na: { ja: 'な形容詞', en: 'na-Adj' },
    noun: { ja: '名詞', en: 'Noun' },
  };
  const typeEntry = typeMap[word.type];
  const typeBadge = typeEntry ? (language === 'en' ? typeEntry.en : typeEntry.ja) : word.type;

  const groupLabel = word.type === 'verb' && word.group
    ? `${language === 'en' ? 'Group' : 'Nhóm'} ${word.group}`
    : null;

  const levelColors: Record<string, string> = {
    N5: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    N4: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    N3: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    N2: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    N1: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  };

  /** Rendering the Popover for conjugation rule */
  const renderRulePopover = () => {
    if (!activeRuleForm) return null;
    const rule = getRuleForForm(activeRuleForm);
    if (!rule) return null;
    const applicableRules = rule.rules.filter(r => {
      if (!r.type || r.type === 'all') return true;
      if (word.type === 'verb' && r.type === `verb${word.group}`) return true;
      if (r.type === word.type) return true;
      if (r.type === 'noun/na' && (word.type === 'noun' || word.type === 'adj_na')) return true;
      return false;
    });

    const activeRes = results.find(r => r.form === activeRuleForm);

    return (
      <div
        className="absolute inset-x-2 inset-y-2 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-5 rounded-2xl flex flex-col shadow-2xl border border-blue-200 dark:border-blue-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => { e.stopPropagation(); setActiveRuleForm(null); }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex w-full justify-between items-start mb-4 shrink-0">
          <div>
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-500" />
              {rule.title}
            </h3>
            {activeRes && (
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                {word.kanji || word.hiragana} ➔ {activeRes.text}
              </p>
            )}
          </div>
          <button className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
          {applicableRules.length > 0 ? applicableRules.map((r, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600/50">
              <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-1.5">
                <span className="font-bold text-blue-700 dark:text-blue-400">{r.cond}</span>: {r.pattern}
              </div>
              {r.example && (
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="font-semibold">{language === 'en' ? 'Ex:' : 'VD:'}</span> {r.example}
                </div>
              )}
            </div>
          )) : (
            <div className="text-slate-500 text-sm italic py-4 text-center">
              {language === 'en' ? 'No specific rule documented.' : 'Không có quy tắc cụ thể.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex flex-col p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 transition-colors overflow-hidden">

      {/* Popover overlay */}
      {renderRulePopover()}

      {/* FIXED TOP: Badges & Base Word */}
      <div className="w-full shrink-0 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-300 uppercase">
              {typeBadge}
            </span>
            {groupLabel && (
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-full text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                {groupLabel}
              </span>
            )}
            <span className={`px-2 py-0.5 border rounded-full text-[10px] uppercase font-bold ${levelColors[word.level] || 'bg-gray-100 text-gray-600'}`}>
              {word.level}
            </span>
            {word.isSpecial && (
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-full text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Zap size={10} /> {language === 'en' ? 'Irreg.' : 'Bất Quy Tắc'}
              </span>
            )}
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={playAudio}
            className="p-1.5 bg-blue-50 dark:bg-slate-700/50 hover:bg-blue-100 dark:hover:bg-blue-500/30 rounded-full text-blue-600 dark:text-blue-400 transition-colors border border-blue-200 dark:border-slate-600 shrink-0"
          >
            <Volume2 size={18} />
          </button>
        </div>

        {/* Base Word Display */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold font-sans text-slate-800 dark:text-white">
              {word.kanji || word.hiragana}
            </span>
            {word.kanji && word.kanji !== word.hiragana && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {word.hiragana}
              </span>
            )}
          </div>
          {showMeaning && (
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
              {displayMeaning}
            </div>
          )}
        </div>
      </div>

      {/* SCROLLABLE MIDDLE: Conjugation Table */}
      <div className="flex-1 w-full min-h-0 relative">
        {showConjugation ? (
          <div className="absolute inset-x-0 inset-y-0 overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-2 pb-4">
              {results.map((res, index) => (
                <div
                  key={`${res.form}-${index}`}
                  onClick={(e) => { e.stopPropagation(); setActiveRuleForm(res.form); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title={language === 'en' ? 'Click to see rule' : 'Nhấp xem quy tắc chia'}
                  className="group flex flex-col justify-center p-3 rounded-xl bg-slate-50 hover:bg-white dark:bg-slate-700/30 dark:hover:bg-slate-700 border border-transparent hover:border-blue-200 hover:shadow-sm dark:hover:border-blue-800 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {res.label}
                    </span>
                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-yellow-400 tracking-wide">
                      {res.text}
                    </span>
                    {showFurigana && res.furigana && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {res.furigana}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 italic">
            <span className="text-xl font-bold mb-2">
              {language === 'en' ? '(Japanese hidden)' : '(Chữ Nhật đã ẩn)'}
            </span>
          </div>
        )}
      </div>

      {/* Star easter egg for N1/N2 */}
      {(word.level === 'N1' || word.level === 'N2') && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-10 pointer-events-none">
          <Star size={24} className="text-yellow-500" />
        </div>
      )}
    </div>
  );
}