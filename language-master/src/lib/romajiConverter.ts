// src/lib/romajiConverter.ts
// Sử dụng thư viện chuẩn Wanakana để đảm bảo gõ phím mượt mà và chính xác 100%

import * as wanakana from 'wanakana';

export type KanaInputMode = 'hiragana' | 'katakana';

export function romajiToHiragana(text: string): string {
  if (!text) return '';
  return wanakana.toHiragana(text, { IMEMode: true });
}

export function romajiToKatakana(text: string): string {
  if (!text) return '';
  return wanakana.toKatakana(text, { IMEMode: true });
}

export function hiraganaToKatakana(hira: string): string {
  if (!hira) return '';
  return wanakana.toKatakana(hira);
}

export function katakanaToHiragana(kata: string): string {
  if (!kata) return '';
  return wanakana.toHiragana(kata);
}

/**
 * Chuyển đổi Romaji sang Kana theo chế độ (Hiragana hoặc Katakana)
 * - 'hiragana': Chữ thường -> Hiragana (a -> あ), Chữ hoa Shift -> Katakana (A -> ア). Hỗ trợ từ lai (とんカツ, サボる)
 * - 'katakana': Chữ thường -> Katakana (basu -> バス), Chữ hoa Shift -> Hiragana
 */
export function convertRomajiWithMode(text: string, mode: KanaInputMode = 'hiragana'): string {
  if (!text) return '';
  if (mode === 'katakana') {
    return wanakana.toKatakana(text, { IMEMode: true });
  }
  return wanakana.toKana(text, { IMEMode: true });
}
