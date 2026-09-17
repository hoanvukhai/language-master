// src/lib/dictionary/localDictionaryIndex.ts
import { COURSE_REGISTRY } from '../../data/courses/registry';
import { getStorageCourses, type CustomCourseDoc } from '../customCourses/customCourseService';

export interface DictionaryEntry {
  id: string;
  term: string;
  reading: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
  template: 'japanese' | 'english' | 'generic';
  subject: 'vocab' | 'kanji' | 'grammar' | 'special';
  courseId: string;
  courseName: string;
  level?: string;
  lesson?: string;
  isCustom?: boolean;
  score?: number;
  _termLower?: string;
  _readingLower?: string;
  _meaningLower?: string;
}

export interface DictionarySuggestion {
  term: string;
  reading: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
}

export interface DictionarySearchFilter {
  query: string;
  language?: 'all' | 'japanese' | 'english' | 'custom';
  subject?: 'all' | 'vocab' | 'kanji' | 'grammar';
  courseId?: string;
  limit?: number;
}

let cachedStaticIndex: DictionaryEntry[] | null = null;

function extractMeaning(m: any): string {
  if (!m) return '';
  if (typeof m === 'string') return m;
  if (typeof m === 'object') {
    return m.vi || m.en || Object.values(m)[0] || '';
  }
  return String(m);
}

function createEntry(data: Omit<DictionaryEntry, '_termLower' | '_readingLower' | '_meaningLower'>): DictionaryEntry {
  return {
    ...data,
    _termLower: data.term.toLowerCase(),
    _readingLower: data.reading.toLowerCase(),
    _meaningLower: data.meaning.toLowerCase(),
  };
}

/** Xây dựng danh mục từ điển từ toàn bộ các khóa học chuẩn */
function buildStaticIndex(): DictionaryEntry[] {
  const items: DictionaryEntry[] = [];
  const seen = new Set<string>();

  for (const course of COURSE_REGISTRY) {
    const tmpl: 'japanese' | 'english' = course.template === 'english' ? 'english' : 'japanese';
    const dataList = course.data || [];

    if (course.subject === 'vocab') {
      for (const item of dataList) {
        if (!item) continue;
        const term = String(item.word || item.kanji || '').trim();
        const reading = String(item.ipa || item.hiragana || '').trim();
        const meaning = extractMeaning(item.meaning);
        if (!term || !meaning) continue;

        const key = `${course.id}_${term}_${reading}`;
        if (seen.has(key)) continue;
        seen.add(key);

        let example = '';
        let exampleMeaning = '';
        if (item.examples && item.examples[0]) {
          example = item.examples[0].en || item.examples[0].jp || '';
          exampleMeaning = extractMeaning(item.examples[0]);
        } else if (item.example) {
          example = item.example.kanji || item.example.jp || '';
          exampleMeaning = extractMeaning(item.example.meaning);
        }

        items.push(createEntry({
          id: `${course.id}_${item.id || term}`,
          term,
          reading,
          meaning,
          example,
          exampleMeaning,
          template: tmpl,
          subject: 'vocab',
          courseId: course.id,
          courseName: course.name,
          level: course.level,
          lesson: item.lesson || '',
          isCustom: false,
        }));
      }
    } else if (course.subject === 'kanji_single') {
      for (const k of dataList) {
        if (!k) continue;
        const char = String(k.character || k.kanji || '').trim();
        const hanViet = String(k.hanViet || '').trim();
        const meaning = extractMeaning(k.meaning) || (hanViet ? `Âm Hán: ${hanViet}` : '');
        if (char) {
          const key = `${course.id}_kanji_${char}`;
          if (!seen.has(key)) {
            seen.add(key);
            items.push(createEntry({
              id: key,
              term: char,
              reading: hanViet || k.onyomi || '',
              meaning,
              example: k.kunyomi ? `Kun: ${k.kunyomi} | On: ${k.onyomi || ''}` : '',
              exampleMeaning: k.mnemonic || '',
              template: 'japanese',
              subject: 'kanji',
              courseId: course.id,
              courseName: course.name,
              level: course.level,
              lesson: k.lesson || '',
              isCustom: false,
            }));
          }
        }

        // Từ ghép của chữ Hán
        if (Array.isArray(k.words)) {
          for (const w of k.words) {
            const wTerm = String(w.word || '').trim();
            const wReading = String(w.hiragana || w.hanVietWord || '').trim();
            const wMeaning = extractMeaning(w.meaning);
            if (!wTerm || !wMeaning) continue;

            const wKey = `${course.id}_word_${wTerm}`;
            if (seen.has(wKey)) continue;
            seen.add(wKey);

            items.push(createEntry({
              id: wKey,
              term: wTerm,
              reading: wReading,
              meaning: wMeaning,
              example: w.hanVietWord ? `Hán Việt: ${w.hanVietWord}` : '',
              template: 'japanese',
              subject: 'kanji',
              courseId: course.id,
              courseName: course.name,
              level: course.level,
              lesson: k.lesson || '',
              isCustom: false,
            }));
          }
        }
      }
    } else if (course.subject === 'kanji_words') {
      for (const k of dataList) {
        if (!k || !Array.isArray(k.words)) continue;
        for (const w of k.words) {
          const term = String(w.word || '').trim();
          const reading = String(w.hiragana || '').trim();
          const meaning = extractMeaning(w.meaning);
          if (!term || !meaning) continue;

          const key = `${course.id}_${term}`;
          if (seen.has(key)) continue;
          seen.add(key);

          items.push(createEntry({
            id: key,
            term,
            reading,
            meaning,
            example: w.examples?.[0]?.jp || '',
            exampleMeaning: extractMeaning(w.examples?.[0]),
            template: 'japanese',
            subject: 'kanji',
            courseId: course.id,
            courseName: course.name,
            level: course.level,
            lesson: k.lesson || '',
            isCustom: false,
          }));
        }
      }
    } else if (course.subject === 'grammar') {
      for (const g of dataList) {
        if (!g) continue;
        const term = String(g.structure || g.pattern || g.title || '').trim();
        const meaning = extractMeaning(g.meaning);
        if (!term || !meaning) continue;

        const key = `${course.id}_grammar_${term}`;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push(createEntry({
          id: key,
          term,
          reading: '',
          meaning,
          example: g.examples?.[0]?.sentence || g.examples?.[0]?.jp || '',
          exampleMeaning: extractMeaning(g.examples?.[0]?.translation || g.examples?.[0]),
          template: 'japanese',
          subject: 'grammar',
          courseId: course.id,
          courseName: course.name,
          level: course.level,
          lesson: g.lesson || '',
          isCustom: false,
        }));
      }
    } else if (course.subject === 'special') {
      for (const s of dataList) {
        if (!s) continue;
        const term = String(s.verb || s.kanji || s.word || '').trim();
        const reading = String(s.hiragana || s.reading || '').trim();
        const meaning = extractMeaning(s.meaning);
        if (!term || !meaning) continue;

        const key = `${course.id}_${term}`;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push(createEntry({
          id: key,
          term,
          reading,
          meaning,
          example: s.sonkeigo ? `Tôn kính: ${s.sonkeigo} | Khiêm nhường: ${s.kenjougo || ''}` : '',
          template: 'japanese',
          subject: 'special',
          courseId: course.id,
          courseName: course.name,
          level: course.level,
          lesson: s.lesson || '',
          isCustom: false,
        }));
      }
    }
  }

  return items;
}

/** Nạp các mục từ các bộ từ cá nhân (Custom Courses) */
function extractCustomEntries(customCourses: CustomCourseDoc[]): DictionaryEntry[] {
  const items: DictionaryEntry[] = [];

  for (const c of customCourses) {
    for (const w of c.words || []) {
      const term = String(w.kanji || '').trim();
      const reading = String(w.hiragana || '').trim();
      const meaning = String(w.meaning || '').trim();
      if (!term || !meaning) continue;

      items.push(createEntry({
        id: `${c.id}_${w.id || term}`,
        term,
        reading,
        meaning,
        example: w.exampleKanji || '',
        exampleMeaning: w.exampleMeaning || '',
        template: c.template || 'japanese',
        subject: 'vocab',
        courseId: c.id,
        courseName: c.title || 'Bộ từ cá nhân',
        level: 'Cá nhân',
        lesson: w.lesson || '',
        isCustom: true,
      }));
    }
  }

  return items;
}

/**
 * Lấy danh sách các khóa học hiện có để đưa vào dropdown bộ lọc của Từ điển
 */
export function getDictionaryCourseList(customCourses: CustomCourseDoc[] = []): { id: string; name: string; type: string }[] {
  const list: { id: string; name: string; type: string }[] = [];

  // Khóa học tĩnh
  for (const c of COURSE_REGISTRY) {
    list.push({
      id: c.id,
      name: c.name,
      type: c.template === 'english' ? 'Tiếng Anh' : 'Tiếng Nhật',
    });
  }

  // Khóa học cá nhân
  for (const cc of customCourses) {
    list.push({
      id: cc.id,
      name: `[Tự tạo] ${cc.title}`,
      type: 'Bộ từ của tôi',
    });
  }

  return list;
}

// Cache kết quả tìm kiếm theo query (tối đa 60 queries gần nhất)
const searchResultCache = new Map<string, { total: number; results: DictionaryEntry[] }>();

/**
 * Tra cứu toàn diện từ điển (Global Search) - Tối ưu hóa hiệu năng cao
 */
export function searchGlobalDictionary(
  options: DictionarySearchFilter,
  customCourses?: CustomCourseDoc[]
): { total: number; results: DictionaryEntry[] } {
  const { query, language = 'all', subject = 'all', courseId, limit = 100 } = options;
  const q = (query || '').trim().toLowerCase();

  // Khóa cache
  const cacheKey = `${q}|${language}|${subject}|${courseId || 'all'}|${limit}|${customCourses?.length || 0}`;
  if (searchResultCache.has(cacheKey)) {
    return searchResultCache.get(cacheKey)!;
  }

  if (!cachedStaticIndex) {
    cachedStaticIndex = buildStaticIndex();
  }

  // Lấy danh sách custom courses (nếu không truyền vào, tự lấy từ local storage)
  const userCourses = customCourses || getStorageCourses();
  const customEntries = extractCustomEntries(userCourses);

  // Gộp 2 nguồn
  const allEntries = [...cachedStaticIndex, ...customEntries];

  if (!q && !courseId && language === 'all' && subject === 'all') {
    return { total: 0, results: [] };
  }

  // 3 nhóm kết quả ưu tiên cao -> thấp (Loại bỏ nhu cầu sort mảng khổng lồ)
  const exactMatches: DictionaryEntry[] = [];
  const prefixMatches: DictionaryEntry[] = [];
  const containsMatches: DictionaryEntry[] = [];

  const maxScanLimit = Math.max(limit * 2, 200);

  for (let i = 0; i < allEntries.length; i++) {
    const item = allEntries[i];

    // 1. Lọc theo ngôn ngữ
    if (language === 'japanese' && item.template !== 'japanese') continue;
    if (language === 'english' && item.template !== 'english') continue;
    if (language === 'custom' && !item.isCustom) continue;

    // 2. Lọc theo danh mục
    if (subject !== 'all' && item.subject !== subject) continue;

    // 3. Lọc theo khóa học
    if (courseId && item.courseId !== courseId) continue;

    if (!q) {
      // Khi không có query mà lọc theo courseId/subject
      prefixMatches.push(item);
      if (prefixMatches.length >= limit) break;
      continue;
    }

    const t = item._termLower || item.term.toLowerCase();
    const r = item._readingLower || item.reading.toLowerCase();
    const m = item._meaningLower || item.meaning.toLowerCase();

    // Khớp tuyệt đối (Exact)
    if (t === q || r === q) {
      exactMatches.push(item);
      continue;
    }

    // Khớp đầu từ (Prefix)
    if (t.startsWith(q) || r.startsWith(q)) {
      prefixMatches.push(item);
      continue;
    }

    // Khớp chứa bên trong (Contains)
    if (t.includes(q) || r.includes(q) || m.includes(q)) {
      containsMatches.push(item);
      // Dừng sớm nếu đã gom đủ quá nhiều kết quả
      if (exactMatches.length + prefixMatches.length + containsMatches.length >= maxScanLimit) {
        break;
      }
    }
  }

  const combined = [...exactMatches, ...prefixMatches, ...containsMatches];
  const finalResult = {
    total: combined.length,
    results: combined.slice(0, limit),
  };

  // Giới hạn cache size
  if (searchResultCache.size > 60) {
    const firstKey = searchResultCache.keys().next().value;
    if (firstKey) searchResultCache.delete(firstKey);
  }
  searchResultCache.set(cacheKey, finalResult);

  return finalResult;
}

/**
 * Tìm kiếm gợi ý nhanh trong từ điển (Dùng cho auto-suggest / popup nhanh)
 */
export function searchLocalDictionary(
  query: string,
  template: 'japanese' | 'english' = 'japanese',
  limit: number = 6
): DictionarySuggestion[] {
  const { results } = searchGlobalDictionary({
    query,
    language: template,
    limit,
  });

  return results.map(r => ({
    term: r.term,
    reading: r.reading,
    meaning: r.meaning,
    example: r.example,
    exampleMeaning: r.exampleMeaning,
  }));
}
