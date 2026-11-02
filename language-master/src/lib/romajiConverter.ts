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
 * - 'katakana': Chữ thường -> Katakana (basu -> バス), Chữ hoa Shift -> Hiragana (RU -> る)
 * BẢO ĐẢM: Chỉ chuyển đổi các đoạn ký tự Latin/Romaji, giữ nguyên 100% các ký tự Hiragana/Katakana/Hán tự đã có sẵn!
 */
export function convertRomajiWithMode(text: string, mode: KanaInputMode = 'hiragana'): string {
  if (!text) return '';
  return text.replace(/[a-zA-Z0-9-~^]+/g, (chunk) => {
    if (mode === 'katakana') {
      if (/^[A-Z0-9-~^]+$/.test(chunk) && /[A-Z]/.test(chunk)) {
        return wanakana.toHiragana(chunk, { IMEMode: true });
      }
      return wanakana.toKatakana(chunk, { IMEMode: true });
    }
    return wanakana.toKana(chunk, { IMEMode: true });
  });
}

/**
 * Hoàn tất chuỗi Kana khi người dùng nhấn Enter/Submit hoặc chuyển đổi chế độ
 * Xử lý các âm đệm lẻ như n/N còn đọng lại, bảo toàn 100% các chữ Kana đã có.
 */
export function finalizeKana(text: string, mode?: KanaInputMode): string {
  if (!text) return '';
  return text.replace(/[a-zA-Z0-9-~^]+/g, (chunk) => {
    if (mode === 'katakana') {
      return wanakana.toKatakana(chunk);
    }
    return wanakana.toKana(chunk);
  });
}
