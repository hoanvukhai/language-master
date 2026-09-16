// src/lib/conjugator.ts
import type { Word } from '../types';

const uToIMap: Record<string, string> = {
  'う': 'い', 'く': 'き', 'ぐ': 'ぎ', 'す': 'し', 'つ': 'ち',
  'ぬ': 'に', 'ぶ': 'び', 'む': 'み', 'る': 'り'
};

const uToAMap: Record<string, string> = {
  'う': 'わ', 'く': 'か', 'ぐ': 'が', 'す': 'さ', 'つ': 'た',
  'ぬ': 'な', 'ぶ': 'ば', 'む': 'ま', 'る': 'ら'
};

const uToEMap: Record<string, string> = {
  'う': 'え', 'く': 'け', 'ぐ': 'げ', 'す': 'せ', 'つ': 'て',
  'ぬ': 'ね', 'ぶ': 'べ', 'む': 'め', 'る': 'れ'
};

const uToOMap: Record<string, string> = {
  'う': 'お', 'く': 'こ', 'ぐ': 'ご', 'す': 'そ', 'つ': 'と',
  'ぬ': 'の', 'ぶ': 'ぼ', 'む': 'も', 'る': 'ろ'
};

/**
 * HÀM 1: CHIA THỂ LỊCH SỰ (MASU / DESU)
 */
export const getMasuForm = (word: Word): string => {
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana; // Lấy Kanji làm gốc để cắt ghép

  if (word.type === 'adj_i' || word.type === 'adj_na' || word.type === 'noun') {
    return kanjiBase + 'です';
  }

  const lastChar = hira.slice(-1);
  const body = kanjiBase.slice(0, -1); // CẮT THẲNG TRÊN KANJI

  switch (word.group) {
    case 2: return body + 'ます';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'きます'; // 来る -> 来ます
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'します'; // 勉強する -> 勉強します
      return kanjiBase;
    case 1:
      {
        const iChar = uToIMap[lastChar] || lastChar;
        return body + iChar + 'ます';
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 2: CHIA THỂ TE (て / で / くて)
 */
export const getTeForm = (word: Word): string => {
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1); // CẮT THẲNG TRÊN KANJI

  if (word.type === 'adj_na' || word.type === 'noun') return kanjiBase + 'で';
  if (word.type === 'adj_i') {
    if (word.isSpecial && hira === 'いい') return 'よくて'; // Ngoại lệ giữ nguyên chữ mềm
    return body + 'くて';
  }

  const lastChar = hira.slice(-1);
  if (word.isSpecial && hira === 'いく') return body + 'って'; // 行く -> 行って

  switch (word.group) {
    case 2: return body + 'て';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'て'; // 来て
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'して'; // 勉強して
      return kanjiBase;
    case 1:
      if (['う', 'つ', 'る'].includes(lastChar)) return body + 'って';
      if (['む', 'ぶ', 'ぬ'].includes(lastChar)) return body + 'んで';
      if (lastChar === 'く') return body + 'いて';
      if (lastChar === 'ぐ') return body + 'いで';
      if (lastChar === 'す') return body + 'して';
      return kanjiBase;
    default: return kanjiBase;
  }
};

/**
 * HÀM 3: CHIA THỂ NAI (PHỦ ĐỊNH)
 */
export const getNaiForm = (word: Word): string => {
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1); // CẮT THẲNG TRÊN KANJI

  if (word.type === 'adj_na' || word.type === 'noun') return kanjiBase + 'じゃない';
  if (word.type === 'adj_i') {
    if (word.isSpecial && hira === 'いい') return 'よくない';
    return body + 'くない';
  }

  const lastChar = hira.slice(-1);
  if (word.isSpecial && hira === 'ある') return 'ない';

  switch (word.group) {
    case 2: return body + 'ない';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'ない'; // 来ない
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'しない'; // 勉強しない
      return kanjiBase;
    case 1:
      {
        const aChar = uToAMap[lastChar] || lastChar;
        return body + aChar + 'ない';
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 4: CHIA THỂ TA (QUÁ KHỨ)
 */
export const getTaForm = (word: Word): string => {
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);

  if (word.type === 'adj_na' || word.type === 'noun') return kanjiBase + 'だった';
  if (word.type === 'adj_i') {
    const adjBody = (word.isSpecial && hira === 'いい') ? 'よ' : body;
    return adjBody + 'かった';
  }

  const teForm = getTeForm(word);
  if (teForm.endsWith('て')) return teForm.slice(0, -1) + 'た';
  if (teForm.endsWith('で')) return teForm.slice(0, -1) + 'だ';
  return teForm;
};

/**
 * HÀM 5: CHIA THỂ NAKATTA (QUÁ KHỨ PHỦ ĐỊNH)
 */
export const getNakattaForm = (word: Word): string => {
  const naiForm = getNaiForm(word);
  return naiForm.slice(0, -1) + 'かった';
};

/**
 * HÀM 6: CHIA THỂ KHẢ NĂNG (POTENTIAL)
 */
export const getPotentialForm = (word: Word): string => {
  if (word.type !== 'verb') return word.kanji || word.hiragana;
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);
  const lastChar = hira.slice(-1);

  if (word.isSpecial && hira === 'わかる') return kanjiBase;

  switch (word.group) {
    case 2: return body + 'られる';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'こられる'; // 来られる
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'できる'; // できる
      return kanjiBase;
    case 1:
      {
        const eChar = uToEMap[lastChar] || lastChar;
        return body + eChar + 'る';
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 7: CHIA THỂ Ý CHÍ (VOLITIONAL)
 */
export const getVolitionalForm = (word: Word): string => {
  if (word.type !== 'verb') return word.kanji || word.hiragana;
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);
  const lastChar = hira.slice(-1);

  switch (word.group) {
    case 2: return body + 'よう';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'こよう';
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'しよう';
      return kanjiBase;
    case 1:
      {
        const oChar = uToOMap[lastChar] || lastChar;
        return body + oChar + 'う';
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 8: CHIA THỂ MỆNH LỆNH (IMPERATIVE)
 */
export const getImperativeForm = (word: Word): string => {
  if (word.type !== 'verb') return word.kanji || word.hiragana;
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);
  const lastChar = hira.slice(-1);

  if (hira === 'くれる') return body + 'れ'; // Ngoại lệ くれる -> くれ

  switch (word.group) {
    case 2: return body + 'ろ';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'こい';
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'しろ';
      return kanjiBase;
    case 1:
      {
        const eChar = uToEMap[lastChar] || lastChar;
        return body + eChar;
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 9: CHIA THỂ CẤM CHỈ (PROHIBITIVE)
 */
export const getProhibitiveForm = (word: Word): string => {
  if (word.type !== 'verb') return word.kanji || word.hiragana;
  const jisho = word.kanji || word.hiragana;
  return jisho + 'な';
};

/**
 * HÀM 10: CHIA THỂ ĐIỀU KIỆN (CONDITIONAL / BA)
 */
export const getConditionalForm = (word: Word): string => {
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);

  if (word.type === 'adj_na' || word.type === 'noun') return kanjiBase + 'なら';
  if (word.type === 'adj_i') {
    if (word.isSpecial && hira === 'いい') return 'よければ';
    return body + 'ければ';
  }

  const lastChar = hira.slice(-1);
  switch (word.group) {
    case 2: return body + 'れば';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'くれば';
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'すれば';
      return kanjiBase;
    case 1:
      {
        const eChar = uToEMap[lastChar] || lastChar;
        return body + eChar + 'ば';
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 10b: CHIA THỂ ĐIỀU KIỆN PHỦ ĐỊNH (CONDITIONAL NEGATIVE / NAKEREBA)
 */
export const getConditionalNegativeForm = (word: Word): string => {
  const naiForm = getNaiForm(word);
  // Nai form luon ket thuc bang ない (nai). Thay ない thanh なければ (nakereba)
  return naiForm.slice(0, -2) + 'なければ';
};

/**
 * HÀM 11: CHIA THỂ BỊ ĐỘNG (PASSIVE)
 */
export const getPassiveForm = (word: Word): string => {
  if (word.type !== 'verb') return word.kanji || word.hiragana;
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);
  const lastChar = hira.slice(-1);

  switch (word.group) {
    case 2: return body + 'られる';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'こられる';
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'される';
      return kanjiBase;
    case 1:
      {
        const aChar = uToAMap[lastChar] || lastChar;
        return body + aChar + 'れる';
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 12: CHIA THỂ SAI KHIẾN (CAUSATIVE)
 */
export const getCausativeForm = (word: Word): string => {
  if (word.type !== 'verb') return word.kanji || word.hiragana;
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);
  const lastChar = hira.slice(-1);

  switch (word.group) {
    case 2: return body + 'させる';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'こさせる';
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'させる';
      return kanjiBase;
    case 1:
      {
        const aChar = uToAMap[lastChar] || lastChar;
        return body + aChar + 'せる';
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 13: CHIA THỂ SAI KHIẾN BỊ ĐỘNG (CAUSATIVE-PASSIVE)
 */
export const getCausativePassiveForm = (word: Word): string => {
  if (word.type !== 'verb') return word.kanji || word.hiragana;
  const hira = word.hiragana;
  const kanjiBase = word.kanji || word.hiragana;
  const body = kanjiBase.slice(0, -1);
  const lastChar = hira.slice(-1);

  switch (word.group) {
    case 2: return body + 'させられる';
    case 3:
      if (hira.endsWith('くる')) return kanjiBase.slice(0, -1) + 'こさせられる';
      if (hira.endsWith('する')) return kanjiBase.slice(0, -2) + 'させられる';
      return kanjiBase;
    case 1:
      {
        const aChar = uToAMap[lastChar] || lastChar;
        if (lastChar === 'す') {
          // Ngoại lệ: Nhóm 1 kết thúc bằng す chỉ có dạng dài
          return body + aChar + 'せられる';
        } else {
          // Lấy cả 2 thể: Rút gọn (される) và Dài (せられる)
          return body + aChar + 'される・' + body + aChar + 'せられる';
        }
      }
    default: return kanjiBase;
  }
};

/**
 * HÀM 14: CHIA THỂ GIẢ ĐỊNH (PRESUMPTIVE / TARA)
 */
export const getPresumptiveForm = (word: Word): string => {
  const taForm = getTaForm(word);
  return taForm + 'ら';
};

/**
 * HÀM 15: CHIA THỂ GIẢ ĐỊNH PHỦ ĐỊNH (PRESUMPTIVE NEGATIVE / NAKATTARA)
 */
export const getPresumptiveNegativeForm = (word: Word): string => {
  const nakattaForm = getNakattaForm(word);
  return nakattaForm + 'ら';
};