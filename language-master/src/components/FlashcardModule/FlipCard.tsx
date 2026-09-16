// src/components/FlashcardModule/FlipCard.tsx
import { useMemo } from 'react';
import type { Word } from '../../types';
import type { FormType } from '../../context/features/flashcard/FlashcardSettingsContext';
import { useFlashcardSettings } from '../../context/features/flashcard/useFlashcardSettings';
import { FORM_REGISTRY } from '../../lib/formRegistry';
import CardFront from './CardFront';
import CardBack from './CardBack';

interface FlipCardProps {
  word: Word;
  isFlipped?: boolean;
  targetFormsOverride?: FormType[];
  /** Seed ngẫu nhiên được tạo sẵn từ QueueCard – tránh double-random giữa 2 mặt */
  cardSeed?: number;
}

export const resolveForm = (form: FormType, seed: number, index: number, word: Word, excludeForms: FormType[] = []): FormType => {
  if (form !== 'random') return form;

  const validForms = FORM_REGISTRY.filter(f =>
    f.id !== 'random' &&
    (!f.validTypes || f.validTypes.includes(word.type)) &&
    !excludeForms.includes(f.id as FormType)
  );

  if (validForms.length === 0) {
    if (!excludeForms.includes('jisho')) return 'jisho';
    const anyValid = FORM_REGISTRY.filter(f => f.id !== 'random' && !excludeForms.includes(f.id as FormType));
    return anyValid.length > 0 ? (anyValid[0].id as FormType) : 'jisho';
  }

  const idx = (seed + index * 7) % validForms.length;
  return validForms[idx].id as FormType;
};

export default function FlipCard({ word, isFlipped, targetFormsOverride, cardSeed = 0 }: FlipCardProps) {
  const { settings } = useFlashcardSettings();
  const sourceForm = settings.sourceForm;
  const baseTargetForms = targetFormsOverride || settings.targetForms;

  const actualSourceForm = useMemo(() => {
    // Nếu sourceForms có nhiều entry (multi-select mặt trước): random 1 thể từ danh sách
    const multiSources = settings.sourceForms ?? [];
    const effectiveSourceForm: FormType = multiSources.length > 0
      ? (() => {
          // Dùng seed ổn định: chọn theo (cardSeed + 31) % len
          const idx = (cardSeed + 31) % multiSources.length;
          return multiSources[idx];
        })()
      : sourceForm;
    return resolveForm(effectiveSourceForm, cardSeed + 99, 0, word, []);
  }, [sourceForm, settings.sourceForms, cardSeed, word]);

  const actualTargetForms = useMemo(
    () => {
      const targets: FormType[] = [];
      baseTargetForms.forEach((form, i) => {
        const resolved = resolveForm(form, cardSeed, i, word, [actualSourceForm, ...targets]);
        targets.push(resolved);
      });
      return targets;
    },
    [baseTargetForms, cardSeed, word, actualSourceForm]
  );

  return (
    <div className="w-full max-w-sm sm:max-w-[30rem] [perspective:1000px] px-2">
      <div
        className={`relative w-full transition-all duration-500 [transform-style:preserve-3d] shadow-2xl rounded-2xl ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        style={{ minHeight: '22rem' }}
      >
        <CardFront
          word={word}
          isFlipped={isFlipped}
          actualSourceForm={actualSourceForm}
          actualTargetForms={actualTargetForms}
        />
        <CardBack
          word={word}
          isFlipped={isFlipped}
          actualTargetForms={actualTargetForms}
        />
      </div>
    </div>
  );
}