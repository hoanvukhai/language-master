// src/types/keigo.ts

export type KeigoPrefix = 'o' | 'go' | 'none';
export type KeigoRuleType = 'rule' | 'special' | 'none';

export interface KeigoWord {
  word: string;
  hiragana: string;
}

export interface KeigoForm {
  type: KeigoRuleType;
  /** Nếu 'special': danh sách các từ đặc biệt. Nếu 'rule': danh sách rỗng (tự sinh). */
  words: KeigoWord[];
}

export interface KeigoVerb {
  id: string;
  jisho: string;       // Thể từ điển (VD: 食べる)
  kanji: string;       // Chữ Hán dùng hiển thị
  hiragana: string;    // Cách đọc
  group: 1 | 2 | 3;
  prefix: KeigoPrefix; // Tiền tố お hoặc ご
  meaning: { vi: string; en: string };

  sonkei: KeigoForm;   // 尊敬語 – Tôn kính ngữ (nâng đối phương)
  kenjou: KeigoForm;   // 謙譲語 – Khiêm nhường ngữ (hạ bản thân)
  teinei: KeigoForm;   // 丁寧語 – Thể lịch sự (masu/desu)

  /** Ghi chú thêm (ví dụ: sự khác biệt context) */
  note?: { vi?: string; en?: string };
}

export type KeigoFormKey = 'sonkei' | 'kenjou' | 'teinei';
