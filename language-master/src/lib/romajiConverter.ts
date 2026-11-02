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
 * QUAN TRỌNG: Dùng wanakana.toKana với Romaji đã đảo case để KHÔNG bị biến đổi các chữ Hiragana/Kanji đã gõ trước đó!
 */
export function convertRomajiWithMode(text: string, mode: KanaInputMode = 'hiragana'): string {
  if (!text) return '';
  if (mode === 'katakana') {
    // Đổi case các ký tự ASCII (Romaji): [a-z] -> [A-Z] để toKana tạo Katakana.
    // toKana giữ nguyên 100% các chữ Hiragana / Katakana / Kanji đã có sẵn trong text.
    const swapped = text.replace(/[a-zA-Z]/g, c =>
      c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
    );
    return wanakana.toKana(swapped, { IMEMode: true });
  }
  return wanakana.toKana(text, { IMEMode: true });
}

/**
 * Hoàn tất chuỗi Kana khi người dùng nhấn Enter/Submit (ví dụ xử lý n/N lẻ còn đọng lại)
 * Không thay đổi Hiragana thành Katakana hay ngược lại.
 */
export function finalizeKana(text: string): string {
  if (!text) return '';
  return wanakana.toKana(text);
}
