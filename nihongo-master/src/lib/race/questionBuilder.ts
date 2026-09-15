// src/lib/race/questionBuilder.ts
import type { Word, Kanji, GrammarItem, KanjiWord } from '../../types';
import { formatDualIpa } from '../english/ipaHelper';

// Các GameType hiện có: 'quiz' | 'matching' | 'typing' | 'truefalse'
export type GameType = 'quiz' | 'matching' | 'typing' | 'truefalse';

export interface RaceQuestionItem {
  id: string;
  prompt: string;
  subPrompt?: string;      // Hint lệnh (VD: "Chọn nghĩa đúng", "Gõ Hiragana")
  correctAnswer: string;
  options?: string[];      // Quiz options
  optionsData?: any[];     // Dữ liệu chi tiết của 4 đáp án (dùng để hiển thị chi tiết trong Lịch sử)
  isTrue?: boolean;        // TrueFalse only
  isSingleKanjiChar?: boolean; // Đặc biệt cho Kanji cha
  direction?: 'w2m' | 'm2w' | 'char2hv' | 'hv2char' | 'm2h' | 'w2h' | 'h2w' | 's2kana' | 'fillblank' | 'm2s' | 's2m';
  sourceItem?: any;
}

// ── Helpers ────────────────────────────────────────────────────────
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickUniqueQuestions(pool: RaceQuestionItem[], count: number): RaceQuestionItem[] {
  const shuffled = shuffleArray(pool);
  const result: RaceQuestionItem[] = [];
  
  const usedMeanings = new Set<string>();
  const usedKanji = new Set<string>();
  const usedHiragana = new Set<string>();
  const usedCharacters = new Set<string>();
  const usedHanViet = new Set<string>();
  
  for (const q of shuffled) {
    if (result.length >= count) break;
    
    const s = q.sourceItem;
    if (!s) {
      result.push(q);
      continue;
    }
    
    // Hàm getMeaning dùng tạm ở đây vì helper getMeaning ở dưới
    const meaning = s.meaning ? (typeof s.meaning === 'object' ? s.meaning.vi : s.meaning) : '';
    const kanji = s.kanji || s.word;
    const hiragana = s.hiragana;
    const character = s.character;
    const hanViet = s.hanViet || s.hanVietWord;
    
    if (meaning && usedMeanings.has(meaning)) continue;
    if (kanji && usedKanji.has(kanji)) continue;
    if (hiragana && usedHiragana.has(hiragana)) continue;
    if (character && usedCharacters.has(character)) continue;
    if (hanViet && usedHanViet.has(hanViet)) continue;
    
    if (meaning) usedMeanings.add(meaning);
    if (kanji) usedKanji.add(kanji);
    if (hiragana) usedHiragana.add(hiragana);
    if (character) usedCharacters.add(character);
    if (hanViet) usedHanViet.add(hanViet);
    
    result.push(q);
  }
  
  if (result.length < count) {
    for (const q of shuffled) {
      if (result.length >= count) break;
      if (!result.includes(q)) result.push(q);
    }
  }
  
  return result;
}

export function pickRandoms<T>(arr: T[], count: number, exclude?: T): T[] {
  const result: T[] = [];
  const max = arr.length;
  let attempts = 0;
  while (result.length < count && attempts < count * 10) {
    attempts++;
    const item = arr[Math.floor(Math.random() * max)];
    if (item !== exclude && !result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}

export function pickUniqueOptionsBy<T>(dataset: T[], count: number, correctItem: T, getProp: (item: T) => string): T[] {
  const result: T[] = [];
  const correctVal = getProp(correctItem);
  const max = dataset.length;
  let attempts = 0;
  while (result.length < count && attempts < count * 30) {
    attempts++;
    const item = dataset[Math.floor(Math.random() * max)];
    const val = getProp(item);
    if (val && val !== correctVal && !result.some(r => getProp(r) === val)) {
      result.push(item);
    }
  }
  return result;
}

export function pickFakeTrueFalseItem<T>(dataset: T[], correctItem: T, getProp: (item: T) => string, promptProp: (item: T) => string): string {
  const max = dataset.length;
  const correctProp = getProp(correctItem);
  const correctPrompt = promptProp(correctItem);
  
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const item = dataset[Math.floor(Math.random() * max)];
    const val = getProp(item);
    const itemPrompt = promptProp(item);
    
    if (val && val !== correctProp && itemPrompt !== correctPrompt) {
      return val;
    }
  }
  
  // Fallback nếu không tìm thấy (cực hiếm)
  return pickRandoms(dataset.map(getProp), 1, correctProp)[0];
}

export function getMeaning(item: any): string {
  if (!item.meaning) return '';
  return typeof item.meaning === 'object' ? item.meaning.vi : item.meaning;
}

// Hàm chuẩn hóa Kana (xóa dấu ngã, dấu câu, khoảng trắng)
export function normalizeKana(str: string): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, '').toLowerCase()
    .replace(/〜/g, '').replace(/~/g, '').replace(/。/g, '').replace(/、/g, '');
}

// ── Builders ───────────────────────────────────────────────────────

/**
 * VOCABULARY (`vocab`)
 * Từ vựng thông thường
 */
export function buildVocabQuestions(dataset: Word[], game: GameType, count: number): RaceQuestionItem[] {
  const pool: RaceQuestionItem[] = [];

  dataset.forEach((v) => {
    const startLen = pool.length;
    const wordStr = v.kanji || v.hiragana;
    const meaningStr = getMeaning(v);
    const hiraganaStr = v.hiragana;
    
    if (game === 'quiz') {
      const r = Math.random();
      const hasKanji = !!v.kanji;
      const isKatakana = /^[\u30A0-\u30FF\u30FC]+$/.test(wordStr);
      let dir: 'w2m' | 'm2w' | 'w2h' | 'h2w';
      
      if (isKatakana) {
        dir = r < 0.5 ? 'w2m' : 'm2w';
      } else {
        dir = hasKanji 
          ? (r < 0.25 ? 'w2m' : (r < 0.5 ? 'm2w' : (r < 0.75 ? 'w2h' : 'h2w')))
          : (r < 0.5 ? 'w2m' : 'm2w');
      }
      
      const getPropFn = dir === 'w2m' ? getMeaning 
                      : (dir === 'w2h' ? (item: any) => item.hiragana 
                      : (item: any) => item.kanji || item.hiragana);
                      
      const wrongItems = pickUniqueOptionsBy(dataset, 3, v, getPropFn);
      const allFour = shuffleArray([v, ...wrongItems]);
      const optionsData = allFour.map(item => ({
        kanji: item.kanji,
        hiragana: item.hiragana,
        meaning: getMeaning(item)
      }));
      
      if (dir === 'w2m') {
        pool.push({
          id: `rv_w2m_${v.id}`,
          prompt: wordStr,
          subPrompt: 'Nghĩa tiếng Việt',
          correctAnswer: meaningStr,
          options: optionsData.map(o => o.meaning),
          optionsData,
          direction: 'w2m'
        });
      } else if (dir === 'm2w') {
        pool.push({
          id: `rv_m2w_${v.id}`,
          prompt: meaningStr,
          subPrompt: 'Từ tiếng Nhật tương ứng',
          correctAnswer: wordStr,
          options: optionsData.map(o => o.kanji || o.hiragana),
          optionsData,
          direction: 'm2w'
        });
      } else if (dir === 'w2h') {
        pool.push({
          id: `rv_w2h_${v.id}`,
          prompt: wordStr,
          subPrompt: 'Cách đọc (Hiragana)',
          correctAnswer: hiraganaStr,
          options: optionsData.map(o => o.hiragana),
          optionsData,
          direction: 'w2h'
        });
      } else {
        pool.push({
          id: `rv_h2w_${v.id}`,
          prompt: hiraganaStr,
          subPrompt: 'Chọn Kanji tương ứng',
          correctAnswer: wordStr,
          options: optionsData.map(o => o.kanji || o.hiragana),
          optionsData,
          direction: 'h2w'
        });
      }
    } else if (game === 'typing') {
      const isKatakana = /^[\u30A0-\u30FF\u30FC]+$/.test(wordStr);
      const hasKanji = !!v.kanji && v.kanji !== v.hiragana;
      const dir = (!hasKanji || isKatakana) ? 'm2h' : (Math.random() > 0.5 ? 'w2h' : 'm2h');
      const ans = isKatakana ? wordStr : hiraganaStr;
      
      // Thuật toán phát hiện trùng lặp
      const hasKanjiCollision = dataset.some(item => 
        (item.kanji || item.hiragana) === wordStr && item.hiragana !== hiraganaStr
      );
      
      const hasMeaningCollision = dataset.some(item => 
        getMeaning(item) === meaningStr && (isKatakana ? (item.kanji || item.hiragana) !== wordStr : item.hiragana !== hiraganaStr)
      );

      if (dir === 'w2h') {
        pool.push({
          id: `rvt_w2h_${v.id}`,
          prompt: wordStr,
          subPrompt: hasKanjiCollision ? `Gõ cách đọc (Nghĩa: ${meaningStr})` : undefined,
          correctAnswer: ans,
          direction: 'w2h'
        });
      } else {
        pool.push({
          id: `rvt_m2h_${v.id}`,
          prompt: meaningStr,
          subPrompt: hasMeaningCollision ? (hasKanji ? `Gõ cách đọc (Từ: ${wordStr})` : `Gõ Hiragana/Katakana`) : undefined,
          correctAnswer: ans,
          direction: 'm2h'
        });
      }
    } else if (game === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      const hasKanji = !!v.kanji;
      const isKatakana = /^[\u30A0-\u30FF\u30FC]+$/.test(wordStr);
      const r = Math.random();
      let dir: 'w2m' | 'm2w' | 'w2h' | 'h2w';
      
      if (isKatakana) {
        dir = r < 0.5 ? 'w2m' : 'm2w';
      } else {
        dir = hasKanji 
          ? (r < 0.25 ? 'w2m' : (r < 0.5 ? 'm2w' : (r < 0.75 ? 'w2h' : 'h2w')))
          : (r < 0.5 ? 'w2m' : 'm2w');
      }
      
      if (dir === 'w2m') {
        const fakeMeaning = isTrue ? meaningStr : pickFakeTrueFalseItem(dataset, v, getMeaning, item => item.kanji || item.hiragana);
        pool.push({
          id: `rvtf_${v.id}`,
          prompt: wordStr,
          subPrompt: `Nghĩa: "${fakeMeaning}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      } else if (dir === 'm2w') {
        const fakeWord = isTrue ? wordStr : pickFakeTrueFalseItem(dataset, v, item => item.kanji || item.hiragana, getMeaning);
        pool.push({
          id: `rvtf_m2w_${v.id}`,
          prompt: meaningStr,
          subPrompt: `Từ: "${fakeWord}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      } else if (dir === 'w2h') {
        const fakeHiragana = isTrue ? hiraganaStr : pickFakeTrueFalseItem(dataset, v, item => item.hiragana, item => item.kanji || item.hiragana);
        pool.push({
          id: `rvtf_w2h_${v.id}`,
          prompt: wordStr,
          subPrompt: `Cách đọc: "${fakeHiragana}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      } else {
        const fakeWord = isTrue ? wordStr : pickFakeTrueFalseItem(dataset, v, item => item.kanji || item.hiragana, item => item.hiragana);
        pool.push({
          id: `rvtf_h2w_${v.id}`,
          prompt: hiraganaStr,
          subPrompt: `Kanji: "${fakeWord}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      }
    }
    
    for (let i = startLen; i < pool.length; i++) {
      pool[i].sourceItem = v;
    }
  });

  return pickUniqueQuestions(pool, count);
}

/**
 * KANJI TỪ VỰNG (`kanji`)
 * Chỉ lấy từ con (words[]), đố Nghĩa tiếng Việt và Hiragana
 */
export function buildKanjiWordQuestions(dataset: Kanji[], game: GameType, count: number): RaceQuestionItem[] {
  const pool: RaceQuestionItem[] = [];
  
  // Extract all words
  const datasetWords: KanjiWord[] = [];
  dataset.forEach(k => {
    if (k.words) {
      k.words.forEach(w => {
        datasetWords.push(w);
      });
    }
  });

  datasetWords.forEach((w) => {
    const startLen = pool.length;
    const meaningStr = getMeaning(w);
    const wordStr = w.word;
    const hiraganaStr = w.hiragana;

    if (game === 'quiz') {
      const r = Math.random();
      const hasKanji = w.word !== w.hiragana;
      let dir: 'w2m' | 'm2w' | 'w2h' | 'h2w';
      
      if (hasKanji) {
        dir = r < 0.25 ? 'w2m' : (r < 0.5 ? 'm2w' : (r < 0.75 ? 'w2h' : 'h2w'));
      } else {
        dir = r < 0.5 ? 'w2m' : 'm2w';
      }
      
      const getPropFn = dir === 'w2m' ? getMeaning 
                      : (dir === 'w2h' ? (item: any) => item.hiragana 
                      : (item: any) => item.word || item.hiragana);
                      
      const wrongItems = pickUniqueOptionsBy(datasetWords, 3, w, getPropFn);
      const allFour = shuffleArray([w, ...wrongItems]);
      const optionsData = allFour.map(item => ({
        kanji: item.word,
        hiragana: item.hiragana,
        meaning: getMeaning(item)
      }));
      
      if (dir === 'w2m') {
        pool.push({
          id: `rkw_w2m_${w.id || w.word}`,
          prompt: wordStr,
          subPrompt: 'Nghĩa tiếng Việt',
          correctAnswer: meaningStr,
          options: optionsData.map(o => o.meaning),
          optionsData,
          direction: 'w2m'
        });
      } else if (dir === 'm2w') {
        pool.push({
          id: `rkw_m2w_${w.id || w.word}`,
          prompt: meaningStr,
          subPrompt: 'Từ ghép tương ứng',
          correctAnswer: wordStr,
          options: optionsData.map(o => o.kanji || o.hiragana),
          optionsData,
          direction: 'm2w'
        });
      } else if (dir === 'w2h') {
        pool.push({
          id: `rkw_w2h_${w.id || w.word}`,
          prompt: wordStr,
          subPrompt: 'Cách đọc (Hiragana)',
          correctAnswer: hiraganaStr,
          options: optionsData.map(o => o.hiragana),
          optionsData,
          direction: 'w2h'
        });
      } else {
        pool.push({
          id: `rkw_h2w_${w.id || w.word}`,
          prompt: hiraganaStr,
          subPrompt: 'Chọn Kanji tương ứng',
          correctAnswer: wordStr,
          options: optionsData.map(o => o.kanji || o.hiragana),
          optionsData,
          direction: 'h2w'
        });
      }
    } else if (game === 'typing') {
      const dir = Math.random() > 0.5 ? 'w2h' : 'm2h';
      
      const hasKanjiCollision = datasetWords.some(item => 
        item.word === wordStr && item.hiragana !== hiraganaStr
      );
      
      const hasMeaningCollision = datasetWords.some(item => 
        getMeaning(item) === meaningStr && item.hiragana !== hiraganaStr
      );

      if (dir === 'w2h') {
        pool.push({
          id: `rkwt_w2h_${w.id || w.word}`,
          prompt: wordStr,
          subPrompt: hasKanjiCollision ? `Gõ cách đọc (Nghĩa: ${meaningStr})` : undefined,
          correctAnswer: hiraganaStr,
          direction: 'w2h'
        });
      } else {
        pool.push({
          id: `rkwt_m2h_${w.id || w.word}`,
          prompt: meaningStr,
          subPrompt: hasMeaningCollision ? `Gõ cách đọc (Từ: ${wordStr})` : undefined,
          correctAnswer: hiraganaStr,
          direction: 'm2h'
        });
      }
    } else if (game === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      const hasKanji = w.word !== w.hiragana;
      const r = Math.random();
      let dir: 'w2m' | 'm2w' | 'w2h' | 'h2w';
      
      const dirR = hasKanji 
        ? (r < 0.25 ? 'w2m' : (r < 0.5 ? 'm2w' : (r < 0.75 ? 'w2h' : 'h2w')))
        : (r < 0.5 ? 'w2m' : 'm2w');
      dir = dirR;
      
      if (dir === 'w2m') {
        const fakeMeaning = isTrue ? meaningStr : pickFakeTrueFalseItem(datasetWords, w, getMeaning, item => item.word);
        pool.push({
          id: `rkwtf_${w.id || w.word}`,
          prompt: wordStr,
          subPrompt: `Nghĩa: "${fakeMeaning}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      } else if (dir === 'm2w') {
        const fakeWord = isTrue ? wordStr : pickFakeTrueFalseItem(datasetWords, w, item => item.word, getMeaning);
        pool.push({
          id: `rkwtf_m2w_${w.id || w.word}`,
          prompt: meaningStr,
          subPrompt: `Từ: "${fakeWord}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      } else if (dir === 'w2h') {
        const fakeHiragana = isTrue ? hiraganaStr : pickFakeTrueFalseItem(datasetWords, w, item => item.hiragana, item => item.word);
        pool.push({
          id: `rkwtf_w2h_${w.id || w.word}`,
          prompt: wordStr,
          subPrompt: `Cách đọc: "${fakeHiragana}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      } else {
        const fakeWord = isTrue ? wordStr : pickFakeTrueFalseItem(datasetWords, w, item => item.word, item => item.hiragana);
        pool.push({
          id: `rkwtf_h2w_${w.id || w.word}`,
          prompt: hiraganaStr,
          subPrompt: `Kanji: "${fakeWord}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      }
    }
    
    for (let i = startLen; i < pool.length; i++) {
      pool[i].sourceItem = w;
    }
  });

  return pickUniqueQuestions(pool, count);
}

/**
 * HÁN TỰ (`hanjt`)
 * Trộn Kanji cha và Từ con (Chỉ đố Âm Hán Việt)
 */
export function buildHanjtQuestions(dataset: Kanji[], game: GameType, count: number): RaceQuestionItem[] {
  const poolSingle: RaceQuestionItem[] = [];
  const poolMulti: RaceQuestionItem[] = [];
  
  // Extract all words that have hanVietWord
  const datasetWords: KanjiWord[] = [];
  dataset.forEach(k => {
    if (k.words) {
      k.words.filter(w => w.hanVietWord).forEach(w => datasetWords.push(w));
    }
  });

  const allHanViet = dataset.map(x => x.hanViet);
  const allWordHanViet = datasetWords.map(x => x.hanVietWord as string);
  const allChar = dataset.map(x => x.character);
  const allWordStr = datasetWords.map(x => x.word);

  const countKanji = (s: string) => (s.match(/[\u4E00-\u9FAF]/g) || []).length;
  const combinedHanViet = [...allHanViet, ...allWordHanViet];
  const combinedJp = [...allChar, ...allWordStr];
  
  const singleHV = combinedHanViet.filter(hv => hv.trim().split(/\s+/).length === 1);
  const multiHV = combinedHanViet.filter(hv => hv.trim().split(/\s+/).length > 1);
  const singleJp = combinedJp.filter(s => countKanji(s) === 1);
  const multiJp = combinedJp.filter(s => countKanji(s) > 1);

  // KANJI CHA
  dataset.forEach(k => {
    const startLen = poolSingle.length;
    if (game === 'quiz') {
      const dir = Math.random() > 0.5 ? 'char2hv' : 'hv2char';
      if (dir === 'char2hv') {
        const wrongHV = pickRandoms(singleHV, 3, k.hanViet);
        poolSingle.push({
          id: `rht_c2h_${k.id}`,
          prompt: k.character,
          subPrompt: 'Chọn Âm Hán Việt',
          correctAnswer: k.hanViet,
          options: shuffleArray([k.hanViet, ...wrongHV]),
          isSingleKanjiChar: true,
          direction: 'char2hv'
        });
      } else {
        const wrongChar = pickRandoms(singleJp, 3, k.character);
        poolSingle.push({
          id: `rht_h2c_${k.id}`,
          prompt: k.hanViet,
          subPrompt: 'Chọn Chữ Hán tương ứng',
          correctAnswer: k.character,
          options: shuffleArray([k.character, ...wrongChar]),
          isSingleKanjiChar: true,
          direction: 'hv2char'
        });
      }
    } else if (game === 'typing') {
      poolSingle.push({
        id: `rht_t_char_${k.id}`,
        prompt: k.character,
        subPrompt: 'Gõ Âm Hán Việt (Không dấu hoặc có dấu)',
        correctAnswer: k.hanViet.toLowerCase(),
        isSingleKanjiChar: true,
        direction: 'char2hv'
      });
    } else if (game === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      const fakeHV = isTrue ? k.hanViet : pickRandoms(singleHV, 1, k.hanViet)[0];
      poolSingle.push({
        id: `rht_tf_char_${k.id}`,
        prompt: k.character,
        subPrompt: `Âm Hán Việt là "${fakeHV}"?`,
        correctAnswer: isTrue ? 'TRUE' : 'FALSE',
        isTrue,
        isSingleKanjiChar: true,
      });
    }
    
    for (let i = startLen; i < poolSingle.length; i++) {
      poolSingle[i].sourceItem = k;
    }
  });

  // TỪ CON (HÁN VIỆT)
  datasetWords.forEach(w => {
    const startLen = poolMulti.length;
    const hvStr = w.hanVietWord as string;
    const wordStr = w.word;
    const meaningStr = getMeaning(w);

    const isSingleHV = hvStr.trim().split(/\s+/).length === 1;
    const isSingleJp = countKanji(wordStr) === 1;

    if (game === 'quiz') {
      const dir = Math.random() > 0.5 ? 'char2hv' : 'hv2char';
      if (dir === 'char2hv') {
        const wrongHV = pickRandoms(isSingleHV ? singleHV : multiHV, 3, hvStr);
        poolMulti.push({
          id: `rht_w_c2h_${w.id || w.word}`,
          prompt: wordStr,
          subPrompt: `Chọn Âm Hán Việt (Nghĩa: ${meaningStr})`,
          correctAnswer: hvStr,
          options: shuffleArray([hvStr, ...wrongHV]),
          direction: 'char2hv'
        });
      } else {
        const wrongWord = pickRandoms(isSingleJp ? singleJp : multiJp, 3, wordStr);
        poolMulti.push({
          id: `rht_w_h2c_${w.id || w.word}`,
          prompt: hvStr,
          subPrompt: `Chọn Từ ghép tương ứng (Nghĩa: ${meaningStr})`,
          correctAnswer: wordStr,
          options: shuffleArray([wordStr, ...wrongWord]),
          direction: 'hv2char'
        });
      }
    } else if (game === 'typing') {
      poolMulti.push({
        id: `rht_t_word_${w.id || w.word}`,
        prompt: wordStr,
        subPrompt: `Gõ Âm Hán Việt (Nghĩa: ${meaningStr})`,
        correctAnswer: hvStr.toLowerCase(),
        direction: 'char2hv'
      });
    } else if (game === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      const filteredWords = datasetWords.filter(item => 
        ((item.hanVietWord as string).trim().split(/\s+/).length === 1) === isSingleHV
      );
      const distractorSource = filteredWords.length >= 4 ? filteredWords : datasetWords;
      const fakeHV = isTrue ? hvStr : pickFakeTrueFalseItem(distractorSource, w, item => item.hanVietWord as string, item => item.word);
      poolMulti.push({
        id: `rht_tf_word_${w.id || w.word}`,
        prompt: wordStr,
        subPrompt: `Âm Hán Việt là "${fakeHV}"?`,
        correctAnswer: isTrue ? 'TRUE' : 'FALSE',
        isTrue
      });
    }

    for (let i = startLen; i < poolMulti.length; i++) {
      poolMulti[i].sourceItem = w;
    }
  });

  // Chia tỷ lệ: 1/3 Chữ đơn, 2/3 Từ ghép
  const targetSingle = Math.floor(count / 3);
  let pickedSingle = pickUniqueQuestions(poolSingle, targetSingle);
  let pickedMulti = pickUniqueQuestions(poolMulti, count - pickedSingle.length);

  // Fallback an toàn nếu thiếu câu hỏi
  if (pickedSingle.length + pickedMulti.length < count) {
    const extraCount = count - (pickedSingle.length + pickedMulti.length);
    const extraSinglePool = poolSingle.filter(p => !pickedSingle.includes(p));
    const extraSingle = pickUniqueQuestions(extraSinglePool, extraCount);
    pickedSingle = [...pickedSingle, ...extraSingle];
  }

  // Trộn lẫn ngẫu nhiên cả hai
  return shuffleArray([...pickedSingle, ...pickedMulti]);
}

/**
 * NGỮ PHÁP (`grammar`)
 */
// Hàm loại bỏ nội dung trong ngoặc đơn (và khoảng trắng dư thừa)
export const stripParentheses = (str: string) => str.replace(/\s*[（(][^）)]*[）)]\s*/g, ' ').trim() || str;

export function buildGrammarQuestions(dataset: GrammarItem[], game: GameType, count: number): RaceQuestionItem[] {
  const pool: RaceQuestionItem[] = [];

  dataset.forEach((g) => {
    const startLen = pool.length;
    const meaningStr = stripParentheses(getMeaning(g));
    const structureStr = stripParentheses(g.structure);

    if (game === 'quiz') {
      const dir = Math.random() > 0.5 ? 'm2s' : 's2m';
      
      if (dir === 'm2s') {
        const wrongItems: string[] = [];
        let attempts = 0;
        while (wrongItems.length < 3 && attempts < 200) {
          attempts++;
          const rand = dataset[Math.floor(Math.random() * dataset.length)];
          const rStruct = stripParentheses(rand.structure);
          const rMean = stripParentheses(getMeaning(rand));
          if (rStruct !== structureStr && rMean !== meaningStr && !wrongItems.includes(rStruct)) {
            wrongItems.push(rStruct);
          }
        }
        
        pool.push({
          id: `rg_m2s_${g.id}`,
          prompt: meaningStr,
          subPrompt: 'Chọn cấu trúc tương ứng',
          correctAnswer: structureStr,
          options: shuffleArray([structureStr, ...wrongItems]),
          direction: 'm2s'
        });
      } else {
        const wrongItems: string[] = [];
        let attempts = 0;
        while (wrongItems.length < 3 && attempts < 200) {
          attempts++;
          const rand = dataset[Math.floor(Math.random() * dataset.length)];
          const rStruct = stripParentheses(rand.structure);
          const rMean = stripParentheses(getMeaning(rand));
          if (rMean !== meaningStr && rStruct !== structureStr && !wrongItems.includes(rMean)) {
            wrongItems.push(rMean);
          }
        }
        
        pool.push({
          id: `rg_s2m_${g.id}`,
          prompt: structureStr,
          subPrompt: 'Chọn ý nghĩa đúng',
          correctAnswer: meaningStr,
          options: shuffleArray([meaningStr, ...wrongItems]),
          direction: 's2m'
        });
      }
    } else if (game === 'typing') {
      const kanaTarget = g.structureKana ? stripParentheses(g.structureKana) : structureStr;
      pool.push({
        id: `rgt_${g.id}`,
        prompt: meaningStr,
        subPrompt: 'Gõ cấu trúc tương ứng',
        correctAnswer: kanaTarget.replace(/〜|~/g, ''), // Dùng phần Kana để check đáp án chuẩn, loại bỏ dấu ngã
        direction: 's2kana'
      });
    } else if (game === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      const dir = Math.random() > 0.5 ? 'm2s' : 's2m';
      
      if (dir === 's2m') {
        const fakeMeaning = isTrue ? meaningStr : pickFakeTrueFalseItem(dataset, g, getMeaning, item => item.structure);
        pool.push({
          id: `rgtf_s2m_${g.id}`,
          prompt: structureStr,
          subPrompt: `Có nghĩa là: "${fakeMeaning}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      } else {
        const fakeStructure = isTrue ? structureStr : pickFakeTrueFalseItem(dataset, g, item => stripParentheses(item.structure), item => getMeaning(item));
        pool.push({
          id: `rgtf_m2s_${g.id}`,
          prompt: meaningStr,
          subPrompt: `Cấu trúc là: "${fakeStructure}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue
        });
      }
    }

    for (let i = startLen; i < pool.length; i++) {
      pool[i].sourceItem = g;
    }
  });

  return pickUniqueQuestions(pool, count);
}

// ── English Vocabulary Builder ─────────────────────────────────────────────

/**
 * ENGLISH VOCABULARY (`vocab` with template `english`)
 * Chỉ dùng `word` (EN term) và `meaning.vi` (VN meaning).
 * Không có kanji/hiragana → không có w2h, h2w directions.
 * Typing: show meaning → type the English word (plain text, no romaji conversion)
 */
export function buildEnglishVocabQuestions(dataset: any[], game: GameType, count: number): RaceQuestionItem[] {
  const pool: RaceQuestionItem[] = [];

  const getWordStr = (item: any): string => item.word || '';
  const getMeaningStr = (item: any): string => {
    if (!item.meaning) return '';
    return typeof item.meaning === 'object' ? item.meaning.vi : item.meaning;
  };

  dataset.forEach((v) => {
    const startLen = pool.length;
    const wordStr = getWordStr(v);
    const meaningStr = getMeaningStr(v);
    if (!wordStr || !meaningStr) return;

    if (game === 'quiz') {
      const dir: 'w2m' | 'm2w' = Math.random() < 0.5 ? 'w2m' : 'm2w';
      const getPropFn = dir === 'w2m' ? getMeaningStr : getWordStr;
      const wrongItems = pickUniqueOptionsBy(dataset, 3, v, getPropFn);
      const allFour = shuffleArray([v, ...wrongItems]);

      if (dir === 'w2m') {
        pool.push({
          id: `en_w2m_${v.id}`,
          prompt: wordStr,
          subPrompt: formatDualIpa(v) || 'Nghĩa tiếng Việt',
          correctAnswer: meaningStr,
          options: allFour.map(getMeaningStr),
          direction: 'w2m',
          sourceItem: v,
        });
      } else {
        pool.push({
          id: `en_m2w_${v.id}`,
          prompt: meaningStr,
          subPrompt: 'Từ tiếng Anh tương ứng',
          correctAnswer: wordStr,
          options: allFour.map(getWordStr),
          direction: 'm2w',
          sourceItem: v,
        });
      }
    } else if (game === 'typing') {
      // Always: show meaning → type the English word
      const hasMeaningCollision = dataset.some(
        item => getMeaningStr(item) === meaningStr && getWordStr(item) !== wordStr
      );
      const ipaHint = formatDualIpa(v);
      pool.push({
        id: `en_t_${v.id}`,
        prompt: meaningStr,
        subPrompt: ipaHint || (hasMeaningCollision ? `(Word starts with: ${wordStr[0]?.toUpperCase()})` : undefined),
        correctAnswer: wordStr,
        direction: 'm2w',
        sourceItem: v,
      });
    } else if (game === 'truefalse') {
      const isTrue = Math.random() > 0.5;
      const dir: 'w2m' | 'm2w' = Math.random() < 0.5 ? 'w2m' : 'm2w';

      if (dir === 'w2m') {
        const fakeMeaning = isTrue ? meaningStr : pickFakeTrueFalseItem(dataset, v, getMeaningStr, getWordStr);
        const ipaText = formatDualIpa(v);
        pool.push({
          id: `en_tf_w2m_${v.id}`,
          prompt: wordStr,
          subPrompt: `${ipaText ? `${ipaText} · ` : ''}Nghĩa: "${fakeMeaning}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue,
          sourceItem: v,
        });
      } else {
        const fakeWord = isTrue ? wordStr : pickFakeTrueFalseItem(dataset, v, getWordStr, getMeaningStr);
        pool.push({
          id: `en_tf_m2w_${v.id}`,
          prompt: meaningStr,
          subPrompt: `Từ: "${fakeWord}"?`,
          correctAnswer: isTrue ? 'TRUE' : 'FALSE',
          isTrue,
          sourceItem: v,
        });
      }
    } else if (game === 'matching') {
      // Matching: pairs are built in setupMatchingRound, not here
      // Still build a dummy quiz question as placeholder
      pool.push({
        id: `en_m_${v.id}`,
        prompt: wordStr,
        correctAnswer: meaningStr,
        direction: 'w2m',
        sourceItem: v,
      });
    }

    for (let i = startLen; i < pool.length; i++) {
      pool[i].sourceItem = v;
    }
  });

  return pickUniqueQuestions(pool, count);
}
