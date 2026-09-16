// src/lib/romajiConverter.ts
// Sử dụng thư viện chuẩn Wanakana để đảm bảo gõ phím mượt mà và chính xác 100%

import * as wanakana from 'wanakana';

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
