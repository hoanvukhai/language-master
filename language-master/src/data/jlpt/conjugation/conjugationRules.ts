// src/data/conjugationRules.ts
// ============================================================
// HARDCODE QUY TẮC CHIA THỂ – Hiển thị trong CardBack khi showRule = true
// ============================================================

import type { WordType } from '../../../types';

export interface ConjugationRule {
  formId: string;
  title: string;               // Tên đầy đủ
  groupLabel: string;          // Nhóm: Futsukei / Keigo / ...
  rules: RuleEntry[];          // Danh sách quy tắc theo loại từ/nhóm ĐT
}

export interface RuleEntry {
  type?: WordType | 'verb1' | 'verb2' | 'verb3' | 'noun/na' | 'all';
  cond: string;                // Điều kiện (vd: "ĐT nhóm 1 (う動詞)")
  pattern: string;             // Quy tắc dạng text (vd: "~う → ~い + ます")
  example?: string;            // Ví dụ (vd: "書く → 書きます")
}

export const CONJUGATION_RULES: Record<string, ConjugationRule> = {

  jisho: {
    formId: 'jisho',
    title: '辞書形（じしょけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'all', cond: 'Tất cả', pattern: 'Dạng gốc không chia', example: '食べる / 書く / 来る / する' },
    ],
  },

  masu: {
    formId: 'masu',
    title: 'ます形（ますけい）',
    groupLabel: 'Thể lịch sự',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~い + ます', example: '書く → 書きます' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + ます', example: '食べる → 食べます' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する → します / 来る → 来（き）ます', example: '勉強する → 勉強します' },
      { type: 'adj_i', cond: 'Tính từ い', pattern: 'Gốc + です', example: 'おいしい → おいしいです' },
      { type: 'noun/na', cond: 'Tính từ な / Danh từ', pattern: 'Gốc + です', example: '元気 → 元気です' },
    ],
  },

  te: {
    formId: 'te',
    title: 'て形（てけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1: ~う/つ/る', pattern: '→ ~って', example: '買う→買って' },
      { type: 'verb1', cond: 'ĐT nhóm 1: ~む/ぶ/ぬ', pattern: '→ ~んで', example: '飲む→飲んで' },
      { type: 'verb1', cond: 'ĐT nhóm 1: ~く', pattern: '→ ~いて (Ngoại lệ: 行く→行って)', example: '書く→書いて' },
      { type: 'verb1', cond: 'ĐT nhóm 1: ~ぐ', pattern: '→ ~いで', example: '泳ぐ→泳いで' },
      { type: 'verb1', cond: 'ĐT nhóm 1: ~す', pattern: '→ ~して', example: '話す→話して' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + て', example: '食べる→食べて' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→して / 来る→来（き）て', example: '勉強する→勉強して' },
      { type: 'adj_i', cond: 'Tính từ い', pattern: 'Bỏ い + くて (いい→よくて)', example: 'おいしい→おいしくて' },
      { type: 'noun/na', cond: 'Tính từ な / Danh từ', pattern: '+ で', example: '元気→元気で, 学生→学生で' },
    ],
  },

  nai: {
    formId: 'nai',
    title: 'ない形（ないけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~あ + ない (う→わ)', example: '書く→書かない, 買う→買わない' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + ない', example: '食べる→食べない' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→しない / 来る→来（こ）ない', example: '勉強する→勉強しない' },
      { type: 'verb1', cond: 'Ngoại lệ', pattern: 'ある → ない (không phải あらない)', example: 'ある→ない' },
      { type: 'adj_i', cond: 'Tính từ い', pattern: 'Bỏ い + くない (いい→よくない)', example: 'おいしい→おいしくない' },
      { type: 'noun/na', cond: 'Tính từ な / Danh từ', pattern: '+ じゃない', example: '元気→元気じゃない' },
    ],
  },

  ta: {
    formId: 'ta',
    title: 'た形（たけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb', cond: 'Động từ', pattern: 'Lấy て形, đổi て→た, で→だ', example: '書いて→書いた' },
      { type: 'adj_i', cond: 'Tính từ い', pattern: 'Bỏ い + かった (いい→よかった)', example: 'おいしい→おいしかった' },
      { type: 'noun/na', cond: 'Tính từ な / Danh từ', pattern: '+ だった', example: '元気→元気だった' },
    ],
  },

  nakatta: {
    formId: 'nakatta',
    title: 'なかった形',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'all', cond: 'Tất cả', pattern: 'Lấy ない形, đổi い→かった', example: '書かない→書かなかった' },
    ],
  },

  potential: {
    formId: 'potential',
    title: '可能形（かのうけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~え + る', example: '書く→書ける' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + られる', example: '食べる→食べられる' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→できる / 来る→来（こ）られる', example: '勉強する→勉強できる' },
    ]
  },

  volitional: {
    formId: 'volitional',
    title: '意向形（いこうけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~お + う', example: '書く→書こう' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + よう', example: '食べる→食べよう' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→しよう / 来る→来（こ）よう', example: 'する→しよう' },
    ]
  },

  imperative: {
    formId: 'imperative',
    title: '命令形（めいれいけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~え', example: '書く→書け' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + ろ (Ngoại lệ: くれる→くれ)', example: '食べる→食べろ' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→しろ / 来る→来（こ）い', example: 'する→しろ' },
    ]
  },

  prohibitive: {
    formId: 'prohibitive',
    title: '禁止形（きんしけい）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb', cond: 'Động từ', pattern: 'Dạng gốc (辞書形) + な', example: '書く→書くな' },
    ]
  },

  conditional: {
    formId: 'conditional',
    title: '条件形（じょうけんけい - ba）',
    groupLabel: 'Thể thông thường',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~え + ば', example: '書く→書けば' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + れば', example: '食べる→食べれば' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→すれば / 来る→来（く）れば', example: 'する→すれば' },
      { type: 'adj_i', cond: 'Tính từ い', pattern: 'Bỏ い + ければ (いい→よければ)', example: 'おいしい→おいしければ' },
      { type: 'noun/na', cond: 'Tính từ な/Danh từ', pattern: '+ なら', example: '元気→元気なら' },
    ]
  },

  conditionalNegative: {
    formId: 'conditionalNegative',
    title: '条件形（否定 - nakereba）',
    groupLabel: 'Thể điều kiện',
    rules: [
      { type: 'all', cond: 'Tất cả', pattern: 'Lấy ない形, đổi い → ければ', example: '書かない→書かなければ, よくない→よくなければ' },
    ]
  },

  passive: {
    formId: 'passive',
    title: '受身形（うけみけい）',
    groupLabel: 'Thể nhận/Bị động',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~あ + れる (う→わ)', example: '書く→書かれる' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + られる', example: '食べる→食べられる' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→される / 来る→来（こ）られる', example: 'する→される' },
    ]
  },

  causative: {
    formId: 'causative',
    title: '使役形（しえきけい）',
    groupLabel: 'Thể sai khiến',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~あ + せる (う→わ)', example: '書く→書かせる' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + させる', example: '食べる→食べさせる' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→させる / 来る→来（こ）させる', example: 'する→させる' },
    ]
  },

  causativePassive: {
    formId: 'causativePassive',
    title: '使役受身形（しえきうけみけい）',
    groupLabel: 'Sai khiến bị động',
    rules: [
      { type: 'verb1', cond: 'ĐT nhóm 1', pattern: 'Âm ~う → ~あ + される/せられる (す→せられる)', example: '書く→書かされる' },
      { type: 'verb2', cond: 'ĐT nhóm 2', pattern: 'Bỏ る + させられる', example: '食べる→食べさせられる' },
      { type: 'verb3', cond: 'ĐT nhóm 3', pattern: 'する→させられる / 来る→来（こ）させられる', example: 'する→させられる' },
    ]
  },

  presumptive: {
    formId: 'presumptive',
    title: 'たら形',
    groupLabel: 'Thể giả định',
    rules: [
      { type: 'all', cond: 'Tất cả', pattern: 'Lấy た形 + ら', example: '書いた→書いたら, よかった→よかったら, だった→だったら' },
    ]
  },

  presumptiveNegative: {
    formId: 'presumptiveNegative',
    title: 'たら形（否定）',
    groupLabel: 'Thể giả định',
    rules: [
      { type: 'all', cond: 'Tất cả', pattern: 'Lấy なかった形 + ら', example: '書かなかった→書かなかったら' },
    ]
  },

};

/** Lấy quy tắc cho 1 form */
export const getRuleForForm = (formId: string): ConjugationRule | undefined =>
  CONJUGATION_RULES[formId];
