// src/lib/keigoEngine.ts
// ============================================================
// KEIGO LOGIC ENGINE – Tự động sinh các dạng kính ngữ
// ============================================================
import type { KeigoVerb, KeigoFormKey } from '../types/keigo';
import { getMasuForm } from './conjugator';


const PREFIX_MAP: Record<string, string> = {
  o: 'お',
  go: 'ご',
  none: '',
};

/**
 * Lấy Masu-stem từ động từ (phần trước ます)
 * VD: 書きます → 書き | 食べます → 食べ
 */
const getMasuStem = (verb: KeigoVerb): string => {
  const wordLike = {
    id: verb.id, kanji: verb.kanji, hiragana: verb.hiragana,
    template: 'japanese' as const,
    group: verb.group, type: 'verb' as const, level: 'N4' as const, meaning: verb.meaning,
  };
  return getMasuForm(wordLike).replace(/ます$/, '');
};

export const toMasuForm = (word: string): string => {
  if (word === '(なし)') return '(なし)';
  if (word === 'いらっしゃる') return 'いらっしゃいます';
  if (word === 'おいでになる') return 'おいでになります';
  if (word === 'おっしゃる') return 'おっしゃいます';
  if (word === 'なさる') return 'なさいます';
  if (word === 'くださる') return 'くださいます';
  if (word === 'ござる') return 'ございます';
  if (word.endsWith('でございます')) return word; // already masu
  if (word === 'ご存知だ') return 'ご存知です';

  // Group 3
  if (word.endsWith('する')) return word.replace(/する$/, 'します');
  
  // Rule-based
  if (word.endsWith('になる')) return word.replace(/になる$/, 'になります');
  
  // Special Group 2
  if (word.endsWith('上げる')) return word.replace(/上げる$/, '上げます');
  if (word.endsWith('ている')) return word.replace(/ている$/, 'ています');
  if (word.endsWith('ておる')) return word.replace(/ておる$/, 'ております');
  if (word.endsWith('おる')) return word.replace(/おる$/, 'おります');

  // Regular Group 1
  if (word.endsWith('う')) return word.replace(/う$/, 'います');
  if (word.endsWith('く')) return word.replace(/く$/, 'きます');
  if (word.endsWith('ぐ')) return word.replace(/ぐ$/, 'ぎます');
  if (word.endsWith('す')) return word.replace(/す$/, 'します');
  if (word.endsWith('つ')) return word.replace(/つ$/, 'ちます');
  if (word.endsWith('ぬ')) return word.replace(/ぬ$/, 'にます');
  if (word.endsWith('ぶ')) return word.replace(/ぶ$/, 'びます');
  if (word.endsWith('む')) return word.replace(/む$/, 'みます');
  if (word.endsWith('る')) return word.replace(/る$/, 'ります');
  
  // Catch all
  return word;
};

// ── 1. TÔN KÍNH NGỮ (尊敬語) ─────────────────────────────────
export const generateSonkei = (verb: KeigoVerb, format: 'dict' | 'masu' = 'dict'): string[] => {
  let results: string[] = [];
  if (verb.sonkei.type === 'special' && verb.sonkei.words.length > 0) {
    results = verb.sonkei.words.map(w => w.word);
  } else if (verb.sonkei.type === 'none') {
    results = ['(なし)'];
  } else {
    const prefixKana = PREFIX_MAP[verb.prefix];
    const masuStem = getMasuStem(verb);
    if (verb.group === 3 && verb.hiragana.endsWith('する')) {
      results = [`${prefixKana}${masuStem.replace(/し$/, '')}になる`];
    } else {
      results = [`${prefixKana}${masuStem}になる`];
    }
  }
  return format === 'masu' ? results.map(toMasuForm) : results;
};

// ── 2. KHIÊM NHƯỜNG NGỮ (謙譲語) ─────────────────────────────
export const generateKenjou = (verb: KeigoVerb, format: 'dict' | 'masu' = 'dict'): string[] => {
  let results: string[] = [];
  if (verb.kenjou.type === 'special' && verb.kenjou.words.length > 0) {
    results = verb.kenjou.words.map(w => w.word);
  } else if (verb.kenjou.type === 'none') {
    results = ['(なし)'];
  } else {
    const prefixKana = PREFIX_MAP[verb.prefix];
    const masuStem = getMasuStem(verb);
    if (verb.group === 3 && verb.hiragana.endsWith('する')) {
      results = [`${prefixKana}${masuStem.replace(/し$/, '')}する`];
    } else {
      results = [`${prefixKana}${masuStem}する`];
    }
  }
  return format === 'masu' ? results.map(toMasuForm) : results;
};

// ── 3. THỂ LỊCH SỰ (丁寧語 / Teinei) ─────────────────────────
export const generateTeinei = (verb: KeigoVerb, format: 'dict' | 'masu' = 'dict'): string[] => {
  let results: string[] = [];
  if (verb.teinei.type === 'special' && verb.teinei.words.length > 0) {
    results = verb.teinei.words.map(w => w.word);
  } else {
    const wordLike = {
      id: verb.id, kanji: verb.kanji, hiragana: verb.hiragana,
      template: 'japanese' as const,
      group: verb.group, type: 'verb' as const, level: 'N4' as const, meaning: verb.meaning,
    };
    results = [getMasuForm(wordLike)]; // This is already masu-ish, wait. getMasuForm returns ~ます
  }
  // If format is dict, for special words like でございます, they are already masu in DB.
  // Actually, we can just return results for Teinei if we assume Teinei IS Masu.
  return format === 'masu' ? results.map(toMasuForm) : results;
};

// ── 4. HELPER: Lấy kết quả theo key ──────────────────────────
export const getKeigoResult = (verb: KeigoVerb, key: KeigoFormKey, format: 'dict' | 'masu' = 'dict'): string[] => {
  switch (key) {
    case 'sonkei': return generateSonkei(verb, format);
    case 'kenjou': return generateKenjou(verb, format);
    case 'teinei': return generateTeinei(verb, format);
  }
};

// ── 5. GIẢI THÍCH QUY TẮC (Explanation Builder) ──────────────
export const buildRuleExplanation = (
  formKey: KeigoFormKey,
  verb: KeigoVerb,
  lang: 'vi' | 'en' = 'vi'
): string => {
  // Teinei: KHÔNG dùng tiền tố お/ご, chỉ chia ~ます
  if (formKey === 'teinei') {
    return lang === 'vi'
      ? 'Thể Lịch sự (丁寧語): chỉ cần chia sang dạng ~ます, không thêm tiền tố お/ご.'
      : 'Polite form (丁寧語): simply conjugate to ~ます. No お/ご prefix.';
  }

  const prefix = PREFIX_MAP[verb.prefix] || 'お';
  const suffix = formKey === 'sonkei' ? 'になる' : 'する';
  const formName = formKey === 'sonkei'
    ? (lang === 'vi' ? 'Tôn kính (尊敬語)' : 'Honorific (尊敬語)')
    : (lang === 'vi' ? 'Khiêm nhường (謙譲語)' : 'Humble (謙譲語)');

  // Nhóm 3 する: お/ご + danh từ + になる/する
  if (verb.group === 3 && verb.hiragana.endsWith('する')) {
    return lang === 'vi'
      ? `${formName}: ${prefix} + danh từ + ${suffix} (Nhóm 3 する).`
      : `${formName}: ${prefix} + noun stem + ${suffix} (Group 3 する).`;
  }

  // Nhóm 1/2: お/ご + masu-stem + になる/する
  return lang === 'vi'
    ? `${formName}: ${prefix} + masu-stem + ${suffix}.`
    : `${formName}: ${prefix} + masu-stem + ${suffix}.`;
};

// ── 6. DISTRACTOR GENERATOR (Tạo bẫy – đáp án sai) ──────────
export const generateDistractors = (
  verb: KeigoVerb,
  targetKey: KeigoFormKey,
  count = 3,
  format: 'dict' | 'masu' = 'dict',
): string[] => {
  const correct = getKeigoResult(verb, targetKey, format);
  const pool: string[] = [];

  // Bẫy A: Các dạng Keigo khác của cùng động từ
  const otherKeys: KeigoFormKey[] = (['sonkei', 'kenjou', 'teinei'] as KeigoFormKey[])
    .filter(k => k !== targetKey);
  otherKeys.forEach(k => {
    const results = getKeigoResult(verb, k, format);
    results.forEach(r => {
      if (!correct.includes(r) && r !== '(なし)') pool.push(r);
    });
  });

  // Bẫy B: Sai tiền tố (お ↔ ご)
  const masuStem = getMasuStem(verb);
  const wrongPrefix = verb.prefix === 'o' ? 'ご' : 'お';
  if (targetKey !== 'teinei') {
    const suffix = targetKey === 'sonkei' ? 'になる' : 'する';
    if (verb.group === 3 && verb.hiragana.endsWith('する')) {
      pool.push(format === 'masu' ? toMasuForm(`${wrongPrefix}${masuStem.replace(/し$/, '')}${suffix}`) : `${wrongPrefix}${masuStem.replace(/し$/, '')}${suffix}`);
    } else {
      pool.push(format === 'masu' ? toMasuForm(`${wrongPrefix}${masuStem}${suffix}`) : `${wrongPrefix}${masuStem}${suffix}`);
    }
  }

  // Bẫy C: Nhầm になる ↔ する (sai suffix)
  if (targetKey !== 'teinei' && verb.prefix !== 'none') {
    const wrongSuffix = targetKey === 'sonkei' ? 'する' : 'になる';
    const prefixKana = PREFIX_MAP[verb.prefix];
    pool.push(format === 'masu' ? toMasuForm(`${prefixKana}${masuStem}${wrongSuffix}`) : `${prefixKana}${masuStem}${wrongSuffix}`);
  }

  // Bẫy D: Double-keigo (thêm お trước từ đặc biệt)
  if (verb[targetKey].type === 'special' && verb[targetKey].words.length > 0) {
    verb[targetKey].words.forEach(w => {
      pool.push(format === 'masu' ? toMasuForm(`お${w.word}`) : `お${w.word}`);
    });
  }

  // Lọc trùng & đúng
  let unique = [...new Set(pool)].filter(d => !correct.includes(d) && d.length > 0);

  // Fallback: Nếu vẫn chưa đủ, tạo các bẫy chia đuôi sai ngữ pháp
  if (unique.length < count) {
    // Lấy đáp án đúng đầu tiên để chế bẫy
    const baseStr = correct[0] || '';
    if (baseStr) {
      if (format === 'masu') {
        unique.push(baseStr.replace(/ます$/, 'ません'));
        unique.push(baseStr.replace(/ます$/, 'ました'));
        unique.push(baseStr.replace(/ます$/, 'ましたら'));
      } else {
        unique.push(baseStr + 'ない');
        unique.push(baseStr + 'た');
        unique.push(baseStr + 'なかった');
      }
    }
  }

  // Lọc lại một lần nữa
  unique = [...new Set(unique)].filter(d => !correct.includes(d) && d.length > 0);
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  return unique.slice(0, count);
};
