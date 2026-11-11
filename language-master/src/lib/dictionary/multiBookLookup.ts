// src/lib/dictionary/multiBookLookup.ts
import {
  searchGlobalDictionary,
  invalidateDictionaryCache,
} from './localDictionaryIndex';
import {
  getStorageCourses,
  createCustomCourse,
  addWordToCustomCourse,
  type CustomCourseDoc,
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

export type ExternalLookupStatus =
  | 'success'
  | 'not_found'
  | 'network_error'
  | 'invalid_response'
  | 'timeout';

export interface ExternalLookupResult {
  status: ExternalLookupStatus;
  term: string;
  /** Chỉ chứa bản dịch tiếng Việt hợp lệ khi status === 'success'; luôn rỗng khi lỗi hoặc không tìm thấy */
  translation: string;
  /** Chỉ chứa cách đọc Kana hợp lệ (Hiragana/Katakana), không chứa Romaji */
  readingKana?: string;
  /** Phiên âm Latin (Romaji) hoặc IPA để hiển thị dưới nhãn "Phiên âm" */
  phonetic?: string;
  partOfSpeech?: string;
  definitions?: string[];
  definitionsLang?: 'en' | 'vi';
  audioUrl?: string;
  source: 'google' | 'freedict' | 'combined';
  errorMessage?: string;
  partialWarning?: string;
  canSave: boolean;
}

export const EXTERNAL_LOOKUP_TIMEOUT_MS = 12_000;

const KNOWN_ERROR_TRANSLATIONS = new Set([
  'không tìm thấy bản dịch phù hợp.',
  'không tìm thấy bản dịch phù hợp',
  'không thể kết nối dịch trực tuyến lúc này.',
  'không thể kết nối dịch trực tuyến lúc này',
  'không thể tra trực tuyến lúc này. thử lại',
  'không thể tra trực tuyến lúc này.',
  'không thể tra trực tuyến lúc này',
  'chưa tìm thấy nghĩa phù hợp',
  'chưa tìm thấy nghĩa phù hợp.',
  'dịch vụ trả dữ liệu chưa hợp lệ. thử lại',
  'dịch vụ trả dữ liệu chưa hợp lệ.',
  'dịch vụ trả dữ liệu chưa hợp lệ',
  'tra cứu mất quá lâu. thử lại',
  'tra cứu mất quá lâu.',
  'tra cứu mất quá lâu',
]);

/**
 * Chuẩn hóa chuỗi để so khớp (Unicode NFC + gộp khoảng trắng thừa)
 */
export function normalizeTextForCompare(value?: string | null): string {
  if (!value) return '';
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * Kiểm tra một chuỗi có phải là cách đọc Kana tiếng Nhật hợp lệ (Hiragana / Katakana) hay không.
 * Phiên âm Latin (Romaji như "Shōhai") hoặc âm Hán-Việt sẽ trả về false.
 */
export function isKanaReading(value?: string | null): boolean {
  const norm = normalizeTextForCompare(value);
  if (!norm) return false;
  const stripped = norm.replace(/[\s・、,，／/()（）[\]「」〜~・-]/g, '');
  if (!stripped) return false;
  return /^[\u3040-\u309F\u30A0-\u30FFーゝゞヽヾ]+$/.test(stripped);
}

/**
 * Chỉ giữ lại cách đọc nếu đúng là Kana; nếu là Romaji hoặc chữ Latin thì trả về chuỗi rỗng
 * để không ghi nhầm vào trường hiragana của sổ tay.
 */
export function sanitizeKanaReading(value?: string | null): string {
  const norm = normalizeTextForCompare(value);
  if (!norm) return '';
  return isKanaReading(norm) ? norm : '';
}

/**
 * Kiểm tra xem nghĩa truyền vào có phải là rỗng hoặc chuỗi thông báo lỗi không hợp lệ hay không
 */
export function isInvalidMeaningForSave(meaning?: string | null): boolean {
  const norm = normalizeTextForCompare(meaning).toLowerCase();
  if (!norm) return true;
  return KNOWN_ERROR_TRANSLATIONS.has(norm);
}

/**
 * Tra cứu từ vựng trong hệ thống và gom nhóm theo Sách / Khóa học
 */
export function lookupInSystemMultiBook(term: string): {
  totalBooks: number;
  totalMatches: number;
  groups: BookWordGroup[];
} {
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
    (r) =>
      r.term.toLowerCase() === termLower ||
      r.reading.toLowerCase() === termLower,
  );

  // Ưu tiên 2: Bắt đầu bằng từ khóa hoặc chứa từ khóa
  const candidates =
    exactMatches.length > 0
      ? exactMatches
      : results.filter(
          (r) =>
            r.term.toLowerCase().startsWith(termLower) ||
            r.reading.toLowerCase().startsWith(termLower) ||
            r.term.toLowerCase().includes(termLower),
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
      (m) =>
        m.term === item.term &&
        m.reading === item.reading &&
        m.meaning === item.meaning,
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

class LookupTimeoutError extends Error {
  constructor() {
    super('LOOKUP_TIMEOUT');
    this.name = 'LookupTimeoutError';
  }
}

async function fetchWithDeadline(
  url: string,
  controller: AbortController,
  deadlinePromise: Promise<never>,
): Promise<Response> {
  return Promise.race([
    fetch(url, { signal: controller.signal }),
    deadlinePromise,
  ]);
}

/**
 * Tra cứu Ngoài Hệ Thống: Gọi Google Translate API & Free Dictionary API
 * Có phân biệt rõ trạng thái: success, not_found, network_error, invalid_response, timeout (12s tổng).
 */
export async function lookupExternal(
  term: string,
  template: 'japanese' | 'english' | 'generic' = 'japanese',
  timeoutMs: number = EXTERNAL_LOOKUP_TIMEOUT_MS,
): Promise<ExternalLookupResult> {
  const cleanTerm = normalizeTextForCompare(term);
  if (!cleanTerm) {
    return {
      status: 'not_found',
      term: '',
      translation: '',
      source: 'google',
      errorMessage: 'Chưa tìm thấy nghĩa phù hợp',
      canSave: false,
    };
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const deadlinePromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      try {
        controller.abort();
      } catch {
        // Ignore abort error
      }
      reject(new LookupTimeoutError());
    }, timeoutMs);
  });

  let translation = '';
  let phonetic = '';
  let readingKana = '';
  let partOfSpeech = '';
  let definitions: string[] = [];
  let audioUrl = '';
  let partialWarning: string | undefined;

  type SourceOutcome =
    | 'ok'
    | 'empty'
    | 'network_error'
    | 'invalid_response'
    | 'timeout';
  let googleOutcome: SourceOutcome = 'empty';

  try {
    // 1. Google Translate API (nhận diện tự động sang tiếng Việt)
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&dt=rm&q=${encodeURIComponent(cleanTerm)}`;
      const res = await fetchWithDeadline(gUrl, controller, deadlinePromise);
      if (!res.ok) {
        googleOutcome = 'network_error';
      } else {
        let data: unknown;
        try {
          data = await Promise.race([res.json(), deadlinePromise]);
        } catch (jsonErr) {
          if (jsonErr instanceof LookupTimeoutError || timedOut) {
            googleOutcome = 'timeout';
          } else {
            googleOutcome = 'invalid_response';
          }
          data = null;
        }

        if (googleOutcome === 'empty') {
          if (!Array.isArray(data) || !Array.isArray(data[0])) {
            googleOutcome = 'invalid_response';
          } else {
            const chunks = data[0];
            // Kiểm tra cấu trúc phần tử hợp lệ
            const hasValidChunkStructure =
              chunks.length === 0 ||
              chunks.some((c: unknown) => Array.isArray(c));
            if (!hasValidChunkStructure) {
              googleOutcome = 'invalid_response';
            } else {
              translation = chunks
                .map((chunk: unknown) =>
                  Array.isArray(chunk) && typeof chunk[0] === 'string'
                    ? chunk[0]
                    : '',
                )
                .filter(Boolean)
                .join(' ');
              translation = normalizeTextForCompare(translation);

              const lastChunk = chunks[chunks.length - 1];
              if (
                Array.isArray(lastChunk) &&
                typeof lastChunk[3] === 'string' &&
                lastChunk[3].trim()
              ) {
                phonetic = normalizeTextForCompare(lastChunk[3]);
                if (isKanaReading(phonetic)) {
                  readingKana = phonetic;
                }
              }

              if (
                translation &&
                translation.toLowerCase() !== cleanTerm.toLowerCase() &&
                !isInvalidMeaningForSave(translation)
              ) {
                googleOutcome = 'ok';
              } else {
                translation = '';
                googleOutcome = 'empty';
              }
            }
          }
        }
      }
    } catch (err) {
      if (
        err instanceof LookupTimeoutError ||
        timedOut ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        googleOutcome = 'timeout';
      } else {
        googleOutcome = 'network_error';
      }
    }

    // 2. Nếu là tiếng Anh hoặc chữ cái Latinh và chưa hết thời gian 12s, gọi thêm Free Dictionary API
    const isLatin = /^[A-Za-z\s'-]+$/.test(cleanTerm);
    if (!timedOut && (template === 'english' || isLatin)) {
      try {
        const dUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanTerm)}`;
        const res = await fetchWithDeadline(dUrl, controller, deadlinePromise);
        if (res.ok) {
          const dictData = await Promise.race([res.json(), deadlinePromise]);
          if (Array.isArray(dictData) && dictData.length > 0) {
            const first = dictData[0];
            if (first?.phonetic && !phonetic) {
              phonetic = normalizeTextForCompare(String(first.phonetic));
            }
            if (Array.isArray(first?.phonetics)) {
              const foundAudio = first.phonetics.find(
                (p: { audio?: string }) => p?.audio && p.audio.length > 0,
              );
              if (foundAudio?.audio) {
                audioUrl = foundAudio.audio;
              }
            }
            if (Array.isArray(first?.meanings) && first.meanings.length > 0) {
              partOfSpeech = first.meanings[0]?.partOfSpeech || '';
              const defs: string[] = [];
              for (const m of first.meanings) {
                if (Array.isArray(m?.definitions)) {
                  for (const d of m.definitions) {
                    if (typeof d?.definition === 'string' && d.definition.trim()) {
                      defs.push(d.definition.trim());
                    }
                    if (defs.length >= 3) break;
                  }
                }
                if (defs.length >= 3) break;
              }
              definitions = defs;
            }
          }
        } else if (googleOutcome === 'ok' && res.status >= 500) {
          partialWarning =
            'Đã tải bản dịch chính; từ điển mở rộng tạm thời chưa phản hồi.';
        }
      } catch (err) {
        if (googleOutcome === 'ok') {
          if (
            err instanceof LookupTimeoutError ||
            timedOut ||
            (err instanceof Error && err.name === 'AbortError')
          ) {
            partialWarning =
              'Đã tải bản dịch chính; từ điển mở rộng phản hồi quá thời gian.';
          } else {
            partialWarning =
              'Đã tải bản dịch chính; từ điển mở rộng tạm thời chưa phản hồi.';
          }
        }
      }
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (googleOutcome === 'ok' && translation) {
    return {
      status: 'success',
      term: cleanTerm,
      translation,
      readingKana: readingKana || undefined,
      phonetic: phonetic || undefined,
      partOfSpeech: partOfSpeech || undefined,
      definitions: definitions.length > 0 ? definitions : undefined,
      definitionsLang: definitions.length > 0 ? 'en' : undefined,
      audioUrl: audioUrl || undefined,
      source: definitions.length > 0 ? 'combined' : 'google',
      partialWarning,
      canSave: true,
    };
  }

  const statusMap: Record<
    Exclude<SourceOutcome, 'ok'>,
    { status: ExternalLookupStatus; message: string }
  > = {
    empty: {
      status: 'not_found',
      message: 'Chưa tìm thấy nghĩa phù hợp',
    },
    network_error: {
      status: 'network_error',
      message: 'Không thể tra trực tuyến lúc này. Thử lại',
    },
    invalid_response: {
      status: 'invalid_response',
      message: 'Dịch vụ trả dữ liệu chưa hợp lệ. Thử lại',
    },
    timeout: {
      status: 'timeout',
      message: 'Tra cứu mất quá lâu. Thử lại',
    },
  };

  const mapped = statusMap[googleOutcome as Exclude<SourceOutcome, 'ok'>];

  return {
    status: mapped.status,
    term: cleanTerm,
    translation: '',
    readingKana: readingKana || undefined,
    phonetic: phonetic || undefined,
    partOfSpeech: partOfSpeech || undefined,
    definitions: definitions.length > 0 ? definitions : undefined,
    definitionsLang: definitions.length > 0 ? 'en' : undefined,
    audioUrl: audioUrl || undefined,
    source: definitions.length > 0 ? 'freedict' : 'google',
    errorMessage: mapped.message,
    canSave: false,
  };
}

export type QuickSaveStatus =
  | 'added'
  | 'already_exists'
  | 'conflict'
  | 'failed';

export interface QuickSaveResult {
  status: QuickSaveStatus;
  success: boolean;
  courseTitle: string;
  courseId: string;
  message: string;
}

export function findTargetNotebookCourse(
  localCourses: CustomCourseDoc[],
  targetCourseId?: string,
): CustomCourseDoc | null {
  if (targetCourseId) {
    const byId = localCourses.find((c) => c.id === targetCourseId);
    if (byId) return byId;
  }
  return (
    localCourses.find(
      (c) =>
        c.title.toLowerCase().includes('sổ tay') ||
        c.title.toLowerCase().includes('notebook'),
    ) || null
  );
}

/**
 * So khớp từ cần lưu với danh sách từ hiện có trong Sổ tay đích theo quy tắc FIX-05:
 * 1. Khớp đầy đủ (term + kana reading + meaning) -> 'already_exists' (ưu tiên cao nhất, kể cả khi dữ liệu cũ có bản trùng).
 * 2. Một bên thiếu kana reading nhưng chỉ có duy nhất 1 ứng viên cùng từ & cùng nghĩa -> 'already_exists'.
 * 3. Hai cách đọc kana đã biết khác nhau -> 'none' (cho phép lưu thành mục từ mới hợp lệ).
 * 4. Cùng từ/cách đọc nhưng nghĩa khác, hoặc thiếu cách đọc mà có nhiều ứng viên khác nhau -> 'conflict'.
 */
export function evaluateNotebookMatch(
  course: CustomCourseDoc,
  rawTerm: string,
  rawReading: string | undefined,
  rawMeaning: string,
): 'none' | 'already_exists' | 'conflict' {
  const normTerm = normalizeTextForCompare(rawTerm);
  const normKana = sanitizeKanaReading(rawReading);
  const normMeaning = normalizeTextForCompare(rawMeaning);

  const sameTermWords = (course.words || []).filter(
    (w) => normalizeTextForCompare(w.kanji) === normTerm,
  );
  if (sameTermWords.length === 0) return 'none';

  // Khử trùng lặp hoàn toàn trong dữ liệu cũ để đánh giá ứng viên chính xác
  const distinctMap = new Map<string, { kana: string; meaning: string }>();
  for (const w of sameTermWords) {
    const kana = sanitizeKanaReading(w.hiragana);
    const meaning = normalizeTextForCompare(w.meaning);
    const key = `${kana}|||${meaning}`;
    if (!distinctMap.has(key)) {
      distinctMap.set(key, { kana, meaning });
    }
  }
  const distinct = Array.from(distinctMap.values());

  // 1. Ưu tiên kiểm tra khớp đầy đủ (cùng từ, cùng cách đọc kana hoặc cùng trống kana, cùng nghĩa)
  const exactFullMatch = distinct.some(
    (c) => c.meaning === normMeaning && c.kana === normKana,
  );
  if (exactFullMatch) {
    return 'already_exists';
  }

  // 2. Nếu một nguồn thiếu cách đọc kana, chỉ coi là trùng khi có đúng 1 ứng viên duy nhất và cùng nghĩa
  if (normKana === '' && distinct.length === 1 && distinct[0].meaning === normMeaning) {
    return 'already_exists';
  }
  if (
    normKana !== '' &&
    distinct.length === 1 &&
    distinct[0].kana === '' &&
    distinct[0].meaning === normMeaning
  ) {
    return 'already_exists';
  }

  // 3. Nếu cả từ mới và mọi ứng viên đã có đều có cách đọc kana xác định và khác nhau hoàn toàn -> mục từ mới hợp lệ
  if (
    normKana !== '' &&
    distinct.every((c) => c.kana !== '' && c.kana !== normKana)
  ) {
    return 'none';
  }

  // 4. Các trường hợp còn lại (cùng từ/cách đọc nhưng nghĩa khác, hoặc thiếu cách đọc mà có nhiều ứng viên)
  return 'conflict';
}

/**
 * Kiểm tra trạng thái hiện tại của một mục từ trong Sổ tay (dùng khi mở lại hộp tra từ hoặc đổi nguồn)
 */
export function getWordNotebookStatus(params: {
  term: string;
  reading?: string;
  meaning: string;
  targetCourseId?: string;
}): {
  status: 'unsaved' | 'already_exists' | 'conflict';
  courseId?: string;
  courseTitle?: string;
} {
  const normTerm = normalizeTextForCompare(params.term);
  const normMeaning = normalizeTextForCompare(params.meaning);
  if (!normTerm || !normMeaning || isInvalidMeaningForSave(normMeaning)) {
    return { status: 'unsaved' };
  }
  const localCourses = getStorageCourses();
  const targetCourse = findTargetNotebookCourse(
    localCourses,
    params.targetCourseId,
  );
  if (!targetCourse) return { status: 'unsaved' };

  const match = evaluateNotebookMatch(
    targetCourse,
    normTerm,
    params.reading,
    normMeaning,
  );
  if (match === 'already_exists') {
    return {
      status: 'already_exists',
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
    };
  }
  if (match === 'conflict') {
    return {
      status: 'conflict',
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
    };
  }
  return { status: 'unsaved' };
}

// Hàng đợi tuần tự trong cùng trang để chống tạo 2 sổ tay hoặc ghi trùng khi bấm nhanh liên tiếp
let quickSaveQueue: Promise<unknown> = Promise.resolve();

/**
 * 1-Chạm lưu nhanh một từ vào Sổ tay từ vựng của người dùng (có kiểm tra trùng, kiểm tra lỗi và tuần tự hóa)
 */
export function quickSaveWordToNotebook(params: {
  term: string;
  reading?: string;
  meaning: string;
  exampleKanji?: string;
  exampleMeaning?: string;
  userId?: string | null;
  userProfile?: unknown;
  targetCourseId?: string;
  lookupStatus?: ExternalLookupStatus;
}): Promise<QuickSaveResult> {
  const run = async (): Promise<QuickSaveResult> => {
    const rawTerm = normalizeTextForCompare(params.term);
    const rawMeaning = normalizeTextForCompare(params.meaning);

    // Từ chối ngay ở tầng dữ liệu nếu kết quả tra cứu không phải nhánh thành công hoặc nghĩa không hợp lệ
    if (
      (params.lookupStatus && params.lookupStatus !== 'success') ||
      !rawTerm ||
      !rawMeaning ||
      isInvalidMeaningForSave(rawMeaning)
    ) {
      return {
        status: 'failed',
        success: false,
        courseTitle: '',
        courseId: '',
        message: 'Chưa lưu được. Nội dung nghĩa chưa hợp lệ.',
      };
    }

    // Chỉ lưu kana hợp lệ vào trường hiragana; không lưu Romaji ("Shōhai") vào trường hiragana
    const validKanaReading = sanitizeKanaReading(params.reading);

    try {
      const localCourses = getStorageCourses();
      let targetCourse = findTargetNotebookCourse(
        localCourses,
        params.targetCourseId,
      );

      if (targetCourse) {
        const match = evaluateNotebookMatch(
          targetCourse,
          rawTerm,
          validKanaReading,
          rawMeaning,
        );
        if (match === 'already_exists') {
          return {
            status: 'already_exists',
            success: true,
            courseTitle: targetCourse.title,
            courseId: targetCourse.id,
            message: 'Đã có trong sổ tay',
          };
        }
        if (match === 'conflict') {
          return {
            status: 'conflict',
            success: false,
            courseTitle: targetCourse.title,
            courseId: targetCourse.id,
            message: 'Từ này đã có trong sổ tay với nội dung khác.',
          };
        }
      } else {
        targetCourse = await createCustomCourse(
          params.userId,
          params.userProfile,
          {
            title: 'Sổ tay từ vựng của tôi',
            description:
              'Nơi lưu trữ các từ vựng tra cứu nhanh trong lúc học và ôn tập',
            template: 'japanese',
            color: 'indigo',
            words: [],
          },
        );
      }

      await addWordToCustomCourse(targetCourse.id, params.userId, {
        kanji: rawTerm,
        hiragana: validKanaReading,
        meaning: rawMeaning,
        exampleKanji: normalizeTextForCompare(params.exampleKanji),
        exampleMeaning: normalizeTextForCompare(params.exampleMeaning),
        lesson: 'Tra cứu nhanh',
      });

      invalidateDictionaryCache();

      return {
        status: 'added',
        success: true,
        courseTitle: targetCourse.title,
        courseId: targetCourse.id,
        message: `Đã lưu "${rawTerm}" vào "${targetCourse.title}"`,
      };
    } catch {
      return {
        status: 'failed',
        success: false,
        courseTitle: '',
        courseId: '',
        message: 'Chưa lưu được. Thử lại',
      };
    }
  };

  const task = quickSaveQueue.then(run, run);
  quickSaveQueue = task.catch(() => {});
  return task;
}
