// src/lib/formRegistry.ts
// ============================================================
// CENTRAL FORM REGISTRY – Thêm thể mới CHỈ cần thêm 1 entry ở đây
// ============================================================
import type { Word, WordType } from '../types';
import {
  getMasuForm,
  getTeForm,
  getNaiForm,
  getTaForm,
  getNakattaForm,
  getPotentialForm,
  getVolitionalForm,
  getImperativeForm,
  getProhibitiveForm,
  getConditionalForm,
  getConditionalNegativeForm,
  getPassiveForm,
  getCausativeForm,
  getCausativePassiveForm,
  getPresumptiveForm,
  getPresumptiveNegativeForm,
} from './conjugator';

export type FormGroup = 'special' | 'futsukei' | 'keigo' | 'advanced' | 'other';

export interface FormDefinition {
  id: string;
  label: string;          // Tên tiếng Việt
  labelEn: string;        // Tên tiếng Anh
  labelJa: string;        // Tên tiếng Nhật
  group: FormGroup;       // Nhóm để phân loại trong UI
  validTypes?: WordType[]; // Các loại từ hợp lệ (VD: ['verb'] cho các thể chỉ dùng cho động từ)
  conjugate: (word: Word) => string;
}

export const FORM_REGISTRY: FormDefinition[] = [
  // ── SPECIAL ──────────────────────────────────────────────
  {
    id: 'random',
    label: '🎲 Ngẫu nhiên',
    labelEn: '🎲 Random',
    labelJa: 'ランダム',
    group: 'special',
    // random form không có conjugate thực – sẽ được resolve trước khi gọi
    conjugate: (word) => word.hiragana,
  },

  // ── PHỔ THÔNG (Futsukei / Thông thường) ─────────────────
  {
    id: 'jisho',
    label: '辞書形 (Từ điển)',
    labelEn: 'Dictionary form',
    labelJa: '辞書形',
    group: 'futsukei',
    conjugate: (word) => word.kanji || word.hiragana,
  },
  {
    id: 'nai',
    label: 'ない形 (Thể phủ định)',
    labelEn: 'Nai form (Negative)',
    labelJa: 'ない形',
    group: 'futsukei',
    conjugate: getNaiForm,
  },
  {
    id: 'ta',
    label: 'た形 (Thể quá khứ)',
    labelEn: 'Ta form (Past)',
    labelJa: 'た形',
    group: 'futsukei',
    conjugate: getTaForm,
  },
  {
    id: 'nakatta',
    label: 'なかった形 (Quá khứ phủ định)',
    labelEn: 'Nakatta form (Negative past)',
    labelJa: 'なかった形',
    group: 'futsukei',
    conjugate: getNakattaForm,
  },
  {
    id: 'te',
    label: 'て形 (Thể Te)',
    labelEn: 'Te form',
    labelJa: 'て形',
    group: 'futsukei',
    conjugate: getTeForm,
  },

  // ── LỊCH SỰ (Keigo) ─────────────────────────────────────
  {
    id: 'masu',
    label: 'ます形 (Thể lịch sự)',
    labelEn: 'Masu form (Polite)',
    labelJa: 'ます形',
    group: 'keigo',
    conjugate: getMasuForm,
  },

  // ── KHU VỰC MỞ RỘNG (Advanced) ───────────────────────────
  {
    id: 'potential',
    label: '可能形 (Thể khả năng)',
    labelEn: 'Potential form',
    labelJa: '可能形',
    group: 'advanced',
    validTypes: ['verb'],
    conjugate: getPotentialForm,
  },
  {
    id: 'volitional',
    label: '意向形 (Thể ý chí)',
    labelEn: 'Volitional form',
    labelJa: '意向形',
    group: 'advanced',
    validTypes: ['verb'],
    conjugate: getVolitionalForm,
  },
  {
    id: 'imperative',
    label: '命令形 (Thể mệnh lệnh)',
    labelEn: 'Imperative form',
    labelJa: '命令形',
    group: 'advanced',
    validTypes: ['verb'],
    conjugate: getImperativeForm,
  },
  {
    id: 'prohibitive',
    label: '禁止形 (Thể cấm chỉ)',
    labelEn: 'Prohibitive form',
    labelJa: '禁止形',
    group: 'advanced',
    validTypes: ['verb'],
    conjugate: getProhibitiveForm,
  },
  {
    id: 'conditional',
    label: '条件形 (Khẳng định -ba)',
    labelEn: 'Conditional (-ba) Affirm',
    labelJa: '条件形',
    group: 'advanced',
    conjugate: getConditionalForm,
  },
  {
    id: 'conditionalNegative',
    label: '条件形 (Phủ định -nakereba)',
    labelEn: 'Conditional (-nakereba)',
    labelJa: '条件形（否定）',
    group: 'advanced',
    conjugate: getConditionalNegativeForm,
  },
  {
    id: 'passive',
    label: '受身形 (Thể bị động)',
    labelEn: 'Passive form',
    labelJa: '受身形',
    group: 'advanced',
    validTypes: ['verb'],
    conjugate: getPassiveForm,
  },
  {
    id: 'causative',
    label: '使役形 (Thể sai khiến)',
    labelEn: 'Causative form',
    labelJa: '使役形',
    group: 'advanced',
    validTypes: ['verb'],
    conjugate: getCausativeForm,
  },
  {
    id: 'causativePassive',
    label: '使役受身形 (Sai khiến bị động)',
    labelEn: 'Causative-Passive form',
    labelJa: '使役受身形',
    group: 'advanced',
    validTypes: ['verb'],
    conjugate: getCausativePassiveForm,
  },
  {
    id: 'presumptive',
    label: 'たら形 (Khẳng định -tara)',
    labelEn: 'Presumptive (-tara) Affirm',
    labelJa: 'たら形',
    group: 'advanced',
    conjugate: getPresumptiveForm,
  },
  {
    id: 'presumptiveNegative',
    label: 'たら形 (Phủ định -nakattara)',
    labelEn: 'Presumptive Negative (-nakattara)',
    labelJa: 'たら形（否定）',
    group: 'advanced',
    conjugate: getPresumptiveNegativeForm,
  },
];

/** Lấy FormDefinition theo id */
export const getFormById = (id: string): FormDefinition | undefined =>
  FORM_REGISTRY.find((f) => f.id === id);

/** Lấy label tuỳ ngôn ngữ */
export const getFormLabel = (id: string, language: 'vi' | 'en' = 'vi'): string => {
  const form = getFormById(id);
  if (!form) return id;
  return language === 'en' ? form.labelEn : form.label;
};

/** Lấy tất cả form theo nhóm */
export const getFormsByGroup = (group: FormGroup): FormDefinition[] =>
  FORM_REGISTRY.filter((f) => f.group === group);

/** Tất cả id form (không gồm 'random') dùng cho random resolver */
export const ALL_REAL_FORM_IDS = FORM_REGISTRY
  .filter((f) => f.id !== 'random')
  .map((f) => f.id);
