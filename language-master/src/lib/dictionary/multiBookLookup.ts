// src/lib/dictionary/multiBookLookup.ts
import { searchGlobalDictionary } from './localDictionaryIndex';
import { 
  getStorageCourses, 
  createCustomCourse, 
  addWordToCustomCourse,
  type CustomCourseDoc 
} from '../customCourses/customCourseService';

export interface BookWordMatch {
  id: string;
  courseId: string;
  courseName: string;
  level?: string;
  lesson?: string;
  subject: string;
  term: string;
  reading: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
  template: 'japanese' | 'english' | 'generic';
}

export interface BookWordGroup {
  courseId: string;
  courseName: string;
  level?: string;
  matches: BookWordMatch[];
}

export interface ExternalLookupResult {
  term: string;
  translation: string;
  phonetic?: string;
  partOfSpeech?: string;
  definitions?: string[];
  audioUrl?: string;
  source: 'google' | 'freedict' | 'combined';
}

/**
 * Tra cứu từ vựng trong hệ thống và gom nhóm theo Sách / Khóa học
 */
export function lookupInSystemMultiBook(term: string): { totalBooks: number; totalMatches: number; groups: BookWordGroup[] } {
  const cleanTerm = term.trim();
  if (!cleanTerm) {
    return { totalBooks: 0, totalMatches: 0, groups: [] };
  }

  const { results } = searchGlobalDictionary({
    query: cleanTerm,
    limit: 80,
  });

  const termLower = cleanTerm.toLowerCase();

  // Ưu tiên 1: Khớp chính xác hoàn toàn từ hoặc cách đọc
  const exactMatches = results.filter(
    r => r.term.toLowerCase() === termLower || r.reading.toLowerCase() === termLower
  );

  // Ưu tiên 2: Bắt đầu bằng từ khóa hoặc chứa từ khóa
  const candidates = exactMatches.length > 0 
    ? exactMatches 
    : results.filter(r => 
        r.term.toLowerCase().startsWith(termLower) || 
        r.reading.toLowerCase().startsWith(termLower) ||
        r.term.toLowerCase().includes(termLower)
      );

  // Gom nhóm theo Course
  const groupMap = new Map<string, BookWordGroup>();

  for (const item of candidates) {
    const key = item.courseId || item.courseName;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        courseId: item.courseId,
        courseName: item.courseName,
        level: item.level,
        matches: [],
      });
    }

    const group = groupMap.get(key)!;
    // Chống trùng lặp từ trong cùng 1 sách
    const isExisted = group.matches.some(
      m => m.term === item.term && m.reading === item.reading && m.meaning === item.meaning
    );
    if (!isExisted) {
      group.matches.push({
        id: item.id,
        courseId: item.courseId,
        courseName: item.courseName,
        level: item.level,
        lesson: item.lesson,
        subject: item.subject,
        term: item.term,
        reading: item.reading,
        meaning: item.meaning,
        example: item.example,
        exampleMeaning: item.exampleMeaning,
        template: item.template,
      });
    }
  }

  const groups = Array.from(groupMap.values());
  const totalMatches = groups.reduce((acc, g) => acc + g.matches.length, 0);

  return {
    totalBooks: groups.length,
    totalMatches,
    groups,
  };
}

/**
 * Tra cứu Ngoài Hệ Thống: Gọi Google Translate API & Free Dictionary API
 */
export async function lookupExternal(
  term: string, 
  template: 'japanese' | 'english' | 'generic' = 'japanese'
): Promise<ExternalLookupResult> {
  const cleanTerm = term.trim();
  if (!cleanTerm) {
    return {
      term: '',
      translation: '',
      source: 'google',
    };
  }

  let translation = '';
  let phonetic = '';
  let partOfSpeech = '';
  let definitions: string[] = [];
  let audioUrl = '';

  // 1. Google Translate API (nhận diện tự động sang tiếng Việt)
  try {
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&dt=rm&q=${encodeURIComponent(cleanTerm)}`;
    const res = await fetch(gUrl);
    if (res.ok) {
      const data = await res.json();
      // data[0] chứa các mảng câu dịch
      if (Array.isArray(data[0])) {
        translation = data[0].map((chunk: any) => chunk[0]).filter(Boolean).join(' ');
        // Thử lấy phonetic romaji từ chunk cuối
        const lastChunk = data[0][data[0].length - 1];
        if (Array.isArray(lastChunk) && typeof lastChunk[3] === 'string' && lastChunk[3]) {
          phonetic = lastChunk[3];
        }
      }
    }
  } catch (err) {
    console.warn('Google Translate API error:', err);
  }

  // 2. Nếu là tiếng Anh hoặc chữ cái Latinh, gọi thêm Free Dictionary API
  const isLatin = /^[A-Za-z\s'-]+$/.test(cleanTerm);
  if (template === 'english' || isLatin) {
    try {
      const dUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanTerm)}`;
      const res = await fetch(dUrl);
      if (res.ok) {
        const dictData = await res.json();
        if (Array.isArray(dictData) && dictData.length > 0) {
          const first = dictData[0];
          if (first.phonetic && !phonetic) {
            phonetic = first.phonetic;
          }
          // Tìm file audio trong phonetics
          if (Array.isArray(first.phonetics)) {
            const foundAudio = first.phonetics.find((p: any) => p.audio && p.audio.length > 0);
            if (foundAudio) {
              audioUrl = foundAudio.audio;
            }
          }
          // Lấy part of speech và các definition
          if (Array.isArray(first.meanings) && first.meanings.length > 0) {
            partOfSpeech = first.meanings[0].partOfSpeech || '';
            const defs: string[] = [];
            for (const m of first.meanings) {
              if (Array.isArray(m.definitions)) {
                for (const d of m.definitions) {
                  if (d.definition) defs.push(d.definition);
                  if (defs.length >= 3) break;
                }
              }
              if (defs.length >= 3) break;
            }
            definitions = defs;
          }
        }
      }
    } catch (err) {
      console.warn('Dictionary API error:', err);
    }
  }

  return {
    term: cleanTerm,
    translation: translation || 'Không tìm thấy bản dịch phù hợp.',
    phonetic,
    partOfSpeech,
    definitions,
    audioUrl,
    source: definitions.length > 0 ? 'combined' : 'google',
  };
}

/**
 * 1-Chạm lưu nhanh một từ vào Sổ tay từ vựng của người dùng
 */
export async function quickSaveWordToNotebook(params: {
  term: string;
  reading?: string;
  meaning: string;
  exampleKanji?: string;
  exampleMeaning?: string;
  userId?: string | null;
  userProfile?: any;
  targetCourseId?: string;
}): Promise<{ success: boolean; courseTitle: string; courseId: string }> {
  const { term, reading = '', meaning, exampleKanji = '', exampleMeaning = '', userId, userProfile, targetCourseId } = params;

  let localCourses = getStorageCourses();
  let targetCourse: CustomCourseDoc | null = null;

  if (targetCourseId) {
    targetCourse = localCourses.find(c => c.id === targetCourseId) || null;
  }

  // Nếu chưa chọn targetCourse, tìm course đầu tiên hoặc course mang tên "Sổ tay"
  if (!targetCourse) {
    targetCourse = localCourses.find(c => 
      c.title.toLowerCase().includes('sổ tay') || 
      c.title.toLowerCase().includes('notebook') ||
      c.title.toLowerCase().includes('cá nhân')
    ) || localCourses[0] || null;
  }

  // Nếu người dùng chưa từng tạo bộ từ nào, tự động khởi tạo 1 Sổ tay mặc định
  if (!targetCourse) {
    targetCourse = await createCustomCourse(userId, userProfile, {
      title: 'Sổ tay từ vựng của tôi',
      description: 'Nơi lưu trữ các từ vựng tra cứu nhanh trong lúc học và ôn tập',
      template: 'japanese',
      color: 'indigo',
      words: [],
    });
  }

  // Thêm từ vào bộ từ
  await addWordToCustomCourse(targetCourse.id, userId, {
    kanji: term,
    hiragana: reading,
    meaning,
    exampleKanji,
    exampleMeaning,
    lesson: 'Tra cứu nhanh',
  });

  return {
    success: true,
    courseTitle: targetCourse.title,
    courseId: targetCourse.id,
  };
}
