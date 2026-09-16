import { createContext } from 'react';
import type { WordType } from '../../../types';

export type FormType = 'jisho' | 'masu' | 'te' | 'nai' | 'ta' | 'nakatta' | 'potential' | 'volitional' | 'imperative' | 'prohibitive' | 'conditional' | 'conditionalNegative' | 'passive' | 'causative' | 'causativePassive' | 'presumptive' | 'presumptiveNegative' | 'random';
export type FlashcardMode = 'endless' | 'quiz';

/** Toggles for each card face */
export interface CardUIToggles {
  showConjugation: boolean; // Show Japanese conjugated text
  showFurigana: boolean;    // Show furigana / hiragana reading
  showMeaning: boolean;     // Show meaning
}

export interface FlashcardSettingsState {
  // ── FILTER ────────────────────────────────────────────
  limit: number | 'all';
  levels: string[];

  // ── FORMS & WORD TYPES ────────────────────────────────
  wordTypes: WordType[]; // Chỉ ôn các loại từ được tick
  sourceForm: FormType;       // Thể mặt trước (legacy – single)
  sourceForms: FormType[];    // Thể mặt trước (multi-select) – override sourceForm nếu length > 0
  targetForms: FormType[];
  displayLogic: 'focused' | 'mixed';

  // ── CARD UI ───────────────────────────────────────────
  uiFront: CardUIToggles;
  uiBack: CardUIToggles;

  // ── PLAY MODE ─────────────────────────────────────────
  playMode: FlashcardMode;

  // ── UTILITIES ─────────────────────────────────────────
  autoPlayFront: boolean;
  autoPlayAudio: boolean;
  handsFree: boolean;
  keybindsEnabled: boolean;

  // ── ADVANCED ──────────────────────────────────────────
  showAdvanced: boolean;
  quizInsertRange: number;      // Quiz: how many cards ahead to reinsert "forgot" card
  handsFreeFlipDelay: number;  // Endless hands-free: seconds before auto-flip
  handsFreeNextDelay: number;  // Endless hands-free: seconds after flip before next card
}

export interface FlashcardContextType {
  settings: FlashcardSettingsState;
  updateSettings: (newSettings: Partial<FlashcardSettingsState>) => void;
}

export const defaultFlashcardSettings: FlashcardSettingsState = {
  limit: 'all',
  levels: ['N5'],

  wordTypes: ['verb', 'adj_i', 'adj_na', 'noun'],
  sourceForm: 'jisho',
  sourceForms: [],           // [] = chỉ dùng sourceForm đơn
  targetForms: ['te'],
  displayLogic: 'focused',

  uiFront: { showConjugation: true, showFurigana: true, showMeaning: true },
  uiBack: { showConjugation: true, showFurigana: true, showMeaning: false },

  playMode: 'endless',

  autoPlayFront: false,
  autoPlayAudio: false,
  handsFree: false,
  keybindsEnabled: true,

  showAdvanced: false,
  quizInsertRange: 3,
  handsFreeFlipDelay: 3,
  handsFreeNextDelay: 4,
};

export const FlashcardSettingsContext = createContext<FlashcardContextType>({
  settings: defaultFlashcardSettings,
  updateSettings: () => { },
});