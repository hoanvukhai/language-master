// src/lib/customCourses/customCourseService.ts
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Course, CourseAuthor } from '../../data/courses/registry';

export interface CustomWord {
  id: string;
  kanji: string;           // Từ vựng gốc (EN, JP hoặc Thuật ngữ)
  hiragana: string;        // Cách đọc Hiragana (với JP) hoặc IPA (với EN), rỗng nếu là Thuật ngữ
  meaning: string;         // Nghĩa tiếng Việt / Định nghĩa
  exampleKanji: string;    // Ví dụ
  exampleMeaning: string;  // Dịch nghĩa ví dụ
  lesson: string;          // Tên bài học (VD: 'Bài 1: Chào hỏi')
}

export interface CustomCourseDoc {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  title: string;
  description: string;
  template: 'japanese' | 'english' | 'generic';
  subject: 'vocab';
  level: 'ALL';
  color: string;
  isPublished: boolean;
  publishedAt: string | null;
  wordCount: number;
  enrolledCount: number;
  lessons: string[];
  words: CustomWord[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'nihongo_local_custom_courses';

/** Chuẩn hóa 1 từ vựng, tuyệt đối không để lọt undefined (tránh lỗi Firestore) */
export function sanitizeWord(w: any, idx = 0, defaultLesson = 'Bài 1'): CustomWord {
  const lessonName = String(w.lesson || defaultLesson).trim() || defaultLesson;
  return {
    id: String(w.id || `w_${Date.now()}_${idx + 1}`),
    kanji: String(w.kanji || w.word || w.term || '').trim(),
    hiragana: String(w.hiragana || w.reading || w.ipa || '').trim(),
    meaning: String(w.meaning || w.definition || '').trim(),
    exampleKanji: String(w.exampleKanji || w.example || '').trim(),
    exampleMeaning: String(w.exampleMeaning || '').trim(),
    lesson: lessonName,
  };
}

/** Chuẩn hóa Document khóa học, loại bỏ toàn bộ undefined */
export function sanitizeCourseDoc(docData: any): CustomCourseDoc {
  // Lấy danh sách bài học
  let lessons: string[] = [];
  if (Array.isArray(docData.lessons)) {
    lessons = docData.lessons.map((l: any) => String(l).trim()).filter(Boolean);
  }

  const defaultLesson = lessons[0] || 'Bài 1';
  const words = Array.isArray(docData.words) 
    ? docData.words.map((w: any, idx: number) => sanitizeWord(w, idx, defaultLesson)) 
    : [];

  // Đảm bảo tất cả lesson xuất hiện trong words đều có trong mảng lessons
  const lessonSet = new Set<string>(lessons);
  words.forEach((w: CustomWord) => {
    if (w.lesson) lessonSet.add(w.lesson);
  });
  if (lessonSet.size === 0) lessonSet.add('Bài 1');
  const finalLessons = Array.from(lessonSet);

  let template: 'japanese' | 'english' | 'generic' = 'japanese';
  if (docData.template === 'english') template = 'english';
  else if (docData.template === 'generic') template = 'generic';

  return {
    id: String(docData.id || `custom_${Date.now()}`),
    authorId: String(docData.authorId || 'guest'),
    authorName: String(docData.authorName || 'Người dùng'),
    authorPhoto: String(docData.authorPhoto || ''),
    title: String(docData.title || '').trim(),
    description: String(docData.description || '').trim(),
    template,
    subject: 'vocab',
    level: 'ALL',
    color: String(docData.color || 'indigo'),
    isPublished: Boolean(docData.isPublished),
    publishedAt: docData.publishedAt ? String(docData.publishedAt) : null,
    wordCount: words.length,
    enrolledCount: Number(docData.enrolledCount) || 1,
    lessons: finalLessons,
    words,
    createdAt: docData.createdAt ? String(docData.createdAt) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Đọc các khóa custom từ LocalStorage */
export function getStorageCourses(): CustomCourseDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(sanitizeCourseDoc) : [];
  } catch (e) {
    console.error('Failed to parse local custom courses:', e);
    return [];
  }
}

/** Lưu các khóa custom vào LocalStorage. Mặc định KHÔNG dispatch event để tránh loop; chỉ dispatch khi emitEvent = true */
export function saveStorageCourses(courses: CustomCourseDoc[], emitEvent: boolean = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent('custom_courses_changed'));
    }
  } catch (e) {
    console.error('Failed to save local custom courses:', e);
  }
}

/** Chuyển đổi CustomCourseDoc sang chuẩn Course của hệ thống */
export function customDocToCourse(docData: CustomCourseDoc): Course {
  const author: CourseAuthor = {
    name: docData.authorName || 'Người dùng',
    avatar: docData.authorPhoto || undefined,
    isOfficial: false,
  };

  return {
    id: docData.id,
    name: docData.title,
    description: docData.description || 'Bộ từ vựng cá nhân do người dùng tạo.',
    subject: 'vocab',
    level: 'ALL',
    color: docData.color || 'indigo',
    template: docData.template || 'japanese',
    author,
    authorId: docData.authorId,
    lessons: docData.lessons && docData.lessons.length > 0 ? docData.lessons : ['Bài 1'],
    data: docData.words.map((w, idx) => ({
      id: w.id || `w_${idx + 1}`,
      word: w.kanji,
      kanji: w.kanji,
      term: w.kanji,
      hiragana: w.hiragana || '',
      ipa: w.hiragana || '',
      meaning: w.meaning,
      definition: w.meaning,
      lesson: w.lesson || (docData.lessons && docData.lessons[0]) || 'Bài 1',
      example: w.exampleKanji ? { kanji: w.exampleKanji, meaning: w.exampleMeaning || '' } : undefined,
      examples: w.exampleKanji ? [{ jp: w.exampleKanji, en: w.exampleKanji, vi: w.exampleMeaning || '' }] : undefined,
    })),
  };
}

export interface CreateCustomCourseInput {
  title: string;
  description?: string;
  template: 'japanese' | 'english' | 'generic';
  color?: string;
  isPublished?: boolean;
  lessons?: string[];
  words: any[];
}

/** Tạo mới một bộ từ vựng cá nhân */
export async function createCustomCourse(
  userId: string | null | undefined,
  userProfile: any,
  input: CreateCustomCourseInput
): Promise<CustomCourseDoc> {
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const authorName = userProfile?.displayName || userProfile?.name || 'Thành viên LM';
  const authorPhoto = userProfile?.photoURL || '';

  const sanitized = sanitizeCourseDoc({
    id,
    authorId: userId || 'guest',
    authorName,
    authorPhoto,
    title: input.title,
    description: input.description,
    template: input.template,
    color: input.color,
    isPublished: Boolean(input.isPublished),
    publishedAt: input.isPublished ? new Date().toISOString() : null,
    lessons: input.lessons,
    words: input.words,
  });

  // 1. Luôn cập nhật LocalStorage ngay lập tức
  const localList = getStorageCourses();
  localList.unshift(sanitized);
  saveStorageCourses(localList);

  // 2. Nếu đã đăng nhập, lưu vào tài liệu người dùng (100% có quyền ghi trong Firestore rules)
  if (userId && userId !== 'guest') {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const existingUserCourses: CustomCourseDoc[] = userSnap.exists() && Array.isArray(userSnap.data().customCourses)
        ? userSnap.data().customCourses.map(sanitizeCourseDoc)
        : [];
      
      const updatedUserCourses = [sanitized, ...existingUserCourses.filter(c => c.id !== sanitized.id)];
      await setDoc(userRef, {
        customCourses: updatedUserCourses,
        hasPublishedCourses: updatedUserCourses.some(c => c.isPublished)
      }, { merge: true });

      // Thử ghi cả vào root collection (nếu rules cho phép)
      try {
        const rootRef = doc(db, 'custom_courses', id);
        await setDoc(rootRef, sanitized);
      } catch (rootErr) {
        // Không block nếu root collection chưa mở rule
      }
    } catch (err) {
      console.error('Error saving custom course to Firestore user doc:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('custom_courses_changed'));
  return sanitized;
}

/** Chỉnh sửa bộ từ vựng cá nhân */
export async function updateCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  updates: Partial<CreateCustomCourseInput> & { isPublished?: boolean }
): Promise<void> {
  // 1. Cập nhật LocalStorage
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  let updatedDoc: CustomCourseDoc | null = null;
  if (idx !== -1) {
    updatedDoc = sanitizeCourseDoc({
      ...localList[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
      publishedAt: updates.isPublished !== undefined
        ? (updates.isPublished ? new Date().toISOString() : null)
        : localList[idx].publishedAt,
    });
    localList[idx] = updatedDoc;
    saveStorageCourses(localList);
  }

  // 2. Cập nhật Firestore
  if (userId && userId !== 'guest') {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && Array.isArray(userSnap.data().customCourses)) {
        const userCourses: CustomCourseDoc[] = userSnap.data().customCourses.map(sanitizeCourseDoc);
        const uIdx = userCourses.findIndex(c => c.id === courseId);
        if (uIdx !== -1) {
          const merged = sanitizeCourseDoc({
            ...userCourses[uIdx],
            ...updates,
            updatedAt: new Date().toISOString(),
            publishedAt: updates.isPublished !== undefined
              ? (updates.isPublished ? new Date().toISOString() : null)
              : userCourses[uIdx].publishedAt,
          });
          userCourses[uIdx] = merged;
          await setDoc(userRef, {
            customCourses: userCourses,
            hasPublishedCourses: userCourses.some(c => c.isPublished)
          }, { merge: true });

          try {
            const rootRef = doc(db, 'custom_courses', courseId);
            await setDoc(rootRef, merged, { merge: true });
          } catch (rootErr) {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Error updating custom course in Firestore:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('custom_courses_changed'));
}

/** Xóa bộ từ vựng */
export async function deleteCustomCourse(
  courseId: string,
  userId: string | null | undefined
): Promise<void> {
  // 1. Xóa khỏi LocalStorage
  const localList = getStorageCourses().filter(c => c.id !== courseId);
  saveStorageCourses(localList);

  // 2. Xóa khỏi Firestore
  if (userId && userId !== 'guest') {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && Array.isArray(userSnap.data().customCourses)) {
        const userCourses: CustomCourseDoc[] = userSnap.data().customCourses
          .map(sanitizeCourseDoc)
          .filter((c: CustomCourseDoc) => c.id !== courseId);
        
        await setDoc(userRef, {
          customCourses: userCourses,
          hasPublishedCourses: userCourses.some(c => c.isPublished)
        }, { merge: true });

        try {
          const rootRef = doc(db, 'custom_courses', courseId);
          await deleteDoc(rootRef);
        } catch (rootErr) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Error deleting custom course from Firestore:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('custom_courses_changed'));
}

/** Chuyển đổi trạng thái Publish (Xuất bản lên Khám phá) */
export async function togglePublishCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  currentStatus: boolean
): Promise<boolean> {
  const nextStatus = !currentStatus;
  await updateCustomCourse(courseId, userId, {
    isPublished: nextStatus,
  });
  return nextStatus;
}

/** Lấy danh sách các bộ từ do người dùng hiện tại tạo */
export async function getUserCustomCourses(userId: string | null | undefined): Promise<CustomCourseDoc[]> {
  const localList = getStorageCourses();

  if (!userId || userId === 'guest') {
    return localList;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists() && Array.isArray(snap.data().customCourses)) {
      const firestoreList: CustomCourseDoc[] = snap.data().customCourses.map(sanitizeCourseDoc);
      // Đồng bộ vào localStorage để dùng khi offline (KHÔNG dispatch event để tránh vòng lặp tải vô tận)
      saveStorageCourses(firestoreList, false);
      return firestoreList;
    }
    return localList;
  } catch (e) {
    console.warn('Fallback to local storage for custom courses:', e);
    return localList;
  }
}

/** Lấy danh sách các khóa học cộng đồng đã xuất bản */
export async function getPublishedCustomCourses(): Promise<CustomCourseDoc[]> {
  const publishedMap = new Map<string, CustomCourseDoc>();

  // 1. Thử lấy từ root collection custom_courses
  try {
    const q = query(
      collection(db, 'custom_courses'),
      where('isPublished', '==', true)
    );
    const snap = await getDocs(q);
    snap.forEach(d => {
      const c = sanitizeCourseDoc(d.data());
      publishedMap.set(c.id, c);
    });
  } catch (e) {
    // Không log lỗi nếu rules chưa mở
  }

  // 2. Lấy từ các tài liệu users có hasPublishedCourses (luôn được phép đọc)
  try {
    const userQ = query(
      collection(db, 'users'),
      where('hasPublishedCourses', '==', true)
    );
    const userSnap = await getDocs(userQ);
    userSnap.forEach(d => {
      const data = d.data();
      if (Array.isArray(data.customCourses)) {
        data.customCourses.forEach((c: any) => {
          if (c.isPublished) {
            const sanitized = sanitizeCourseDoc(c);
            publishedMap.set(sanitized.id, sanitized);
          }
        });
      }
    });
  } catch (e) {
    console.warn('Error querying published courses from users:', e);
  }

  // 3. Ghép thêm các khóa xuất bản cục bộ
  const localList = getStorageCourses();
  localList.filter(c => c.isPublished).forEach(c => {
    if (!publishedMap.has(c.id)) {
      publishedMap.set(c.id, c);
    }
  });

  const result = Array.from(publishedMap.values());
  result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return result;
}

/** Lấy chi tiết 1 custom course theo ID */
export async function getCustomCourseById(courseId: string): Promise<CustomCourseDoc | null> {
  // 1. Tìm trong local storage trước (nhanh nhất)
  const localList = getStorageCourses();
  const localFound = localList.find(c => c.id === courseId);
  if (localFound) return localFound;

  // 2. Tìm trong published custom courses
  const published = await getPublishedCustomCourses();
  const pubFound = published.find(c => c.id === courseId);
  if (pubFound) return pubFound;

  // 3. Thử tìm trong root collection nếu có
  try {
    const docRef = doc(db, 'custom_courses', courseId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return sanitizeCourseDoc(snap.data());
    }
  } catch (e) {
    // ignore
  }

  return null;
}

/** Thêm nhanh một từ vựng vào một bộ từ đã có */
/** Đồng bộ thay đổi của 1 khóa học vào LocalStorage và Firestore */
async function syncSingleCourse(
  courseId: string, 
  updatedDoc: CustomCourseDoc, 
  userId: string | null | undefined
): Promise<void> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx !== -1) {
    localList[idx] = updatedDoc;
  } else {
    localList.unshift(updatedDoc);
  }
  saveStorageCourses(localList);

  if (userId && userId !== 'guest') {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && Array.isArray(userSnap.data().customCourses)) {
        const existing = userSnap.data().customCourses.map(sanitizeCourseDoc);
        const nextList = existing.map((c: CustomCourseDoc) => c.id === courseId ? updatedDoc : c);
        if (!existing.some((c: CustomCourseDoc) => c.id === courseId)) {
          nextList.unshift(updatedDoc);
        }
        await updateDoc(userRef, { customCourses: nextList });
      }
      try {
        const rootRef = doc(db, 'custom_courses', courseId);
        await setDoc(rootRef, updatedDoc, { merge: true });
      } catch (rootErr) {
        // ignore
      }
    } catch (err) {
      console.warn('Could not sync custom course to Firestore:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('custom_courses_changed'));
}

/** Thêm nhanh một từ vựng vào một bộ từ đã có */
export async function addWordToCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  rawWord: Partial<CustomWord>,
  targetLesson?: string
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) {
    throw new Error('Không tìm thấy bộ từ vựng mục tiêu.');
  }

  const course = localList[idx];
  const lesson = targetLesson || rawWord.lesson || (course.lessons && course.lessons[0]) || 'Bài 1';
  
  // Đảm bảo tên bài có trong danh sách lessons
  const lessons = Array.from(new Set([...(course.lessons || []), lesson]));

  const newWord = sanitizeWord({
    ...rawWord,
    lesson,
  }, course.words.length, lesson);

  const updatedWords = [...course.words, newWord];
  const updatedDoc = sanitizeCourseDoc({
    ...course,
    lessons,
    words: updatedWords,
    wordCount: updatedWords.length,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Cập nhật một từ vựng trong bộ từ */
export async function updateWordInCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  updatedWord: CustomWord
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  const sanitized = sanitizeWord(updatedWord, 0, updatedWord.lesson || 'Bài 1');
  const words = course.words.map(w => w.id === updatedWord.id ? sanitized : w);

  const updatedDoc = sanitizeCourseDoc({
    ...course,
    words,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Xóa một từ vựng khỏi bộ từ */
export async function deleteWordFromCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  wordId: string
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  const words = course.words.filter(w => w.id !== wordId);

  const updatedDoc = sanitizeCourseDoc({
    ...course,
    words,
    wordCount: words.length,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Thêm hàng loạt từ vựng vào một bài học */
export async function bulkAddWordsToCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  rawWords: Partial<CustomWord>[],
  targetLesson?: string
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  const lesson = targetLesson || (course.lessons && course.lessons[0]) || 'Bài 1';
  const lessons = Array.from(new Set([...(course.lessons || []), lesson]));

  const newWords = rawWords.map((rw, i) => sanitizeWord({
    ...rw,
    lesson: rw.lesson || lesson,
  }, course.words.length + i, lesson));

  const words = [...course.words, ...newWords];
  const updatedDoc = sanitizeCourseDoc({
    ...course,
    lessons,
    words,
    wordCount: words.length,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Thêm một bài học mới vào bộ từ */
export async function addLessonToCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  lessonName: string
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  const trimmed = lessonName.trim();
  if (!trimmed) throw new Error('Tên bài học không được để trống.');

  if (course.lessons.includes(trimmed)) return course;

  const lessons = [...course.lessons, trimmed];
  const updatedDoc = sanitizeCourseDoc({
    ...course,
    lessons,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Đổi tên bài học trong bộ từ */
export async function renameLessonInCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  oldName: string,
  newName: string
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  const trimmedOld = oldName.trim();
  const trimmedNew = newName.trim();
  if (!trimmedNew || trimmedOld === trimmedNew) return course;

  const lessons = course.lessons.map(l => l === trimmedOld ? trimmedNew : l);
  const words = course.words.map(w => w.lesson === trimmedOld ? { ...w, lesson: trimmedNew } : w);

  const updatedDoc = sanitizeCourseDoc({
    ...course,
    lessons,
    words,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Xóa một bài học khỏi bộ từ (từ vựng chuyển sang bài đầu tiên) */
export async function deleteLessonFromCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  lessonName: string
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  if (course.lessons.length <= 1) {
    // Nếu là bài học duy nhất, xóa sạch từ vựng và reset về 'Bài 1'
    const updatedDoc = sanitizeCourseDoc({
      ...course,
      lessons: ['Bài 1'],
      words: [],
      updatedAt: new Date().toISOString(),
    });
    await syncSingleCourse(courseId, updatedDoc, userId);
    return updatedDoc;
  }

  const remaining = course.lessons.filter(l => l !== lessonName);
  const fallback = remaining[0];
  const words = course.words.map(w => w.lesson === lessonName ? { ...w, lesson: fallback } : w);

  const updatedDoc = sanitizeCourseDoc({
    ...course,
    lessons: remaining,
    words,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Đổi toàn bộ thứ tự các bài học trong bộ từ */
export async function reorderLessonsInCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  newLessonsOrder: string[]
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  const updatedDoc = sanitizeCourseDoc({
    ...course,
    lessons: newLessonsOrder,
    updatedAt: new Date().toISOString(),
  });

  await syncSingleCourse(courseId, updatedDoc, userId);
  return updatedDoc;
}

/** Di chuyển vị trí một bài học lên hoặc xuống */
export async function moveLessonPosition(
  courseId: string,
  userId: string | null | undefined,
  lessonName: string,
  direction: 'up' | 'down'
): Promise<CustomCourseDoc> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error('Không tìm thấy bộ từ vựng.');

  const course = localList[idx];
  const lessons = [...course.lessons];
  const curIdx = lessons.indexOf(lessonName);
  if (curIdx === -1) return course;

  const targetIdx = direction === 'up' ? curIdx - 1 : curIdx + 1;
  if (targetIdx < 0 || targetIdx >= lessons.length) return course;

  // Hoán đổi vị trí
  const temp = lessons[curIdx];
  lessons[curIdx] = lessons[targetIdx];
  lessons[targetIdx] = temp;

  return await reorderLessonsInCustomCourse(courseId, userId, lessons);
}

/**
 * Trích xuất từ vựng chuẩn hóa để sao chép (Chỉ lấy Từ, Nghĩa, Cách đọc; bỏ ví dụ; sinh ID mới)
 */
export function extractCopyWord(item: any, idx: number, targetLesson = 'Bài 1'): CustomWord {
  const term = String(item.kanji || item.word || item.character || item.structure || item.term || '').trim();
  
  let meaning = '';
  if (typeof item.meaning === 'object' && item.meaning !== null) {
    meaning = String(item.meaning.vi || item.meaning.en || '').trim();
  } else {
    meaning = String(item.meaning || item.definition || '').trim();
  }

  const reading = String(item.hiragana || item.ipa || item.reading || item.hanViet || '').trim();
  const lesson = String(item.lesson || targetLesson).trim() || targetLesson;

  return {
    id: `w_custom_${Date.now()}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
    kanji: term,
    hiragana: reading,
    meaning: meaning,
    exampleKanji: '',    // Cố tình để trống theo yêu cầu
    exampleMeaning: '',  // Cố tình để trống theo yêu cầu
    lesson: lesson,
  };
}

/**
 * Sao chép toàn bộ một khóa học (khóa hệ thống hoặc custom course) thành một khóa cá nhân mới
 */
export async function cloneFullCourse(
  userId: string | null | undefined,
  userProfile: any,
  sourceCourse: any
): Promise<CustomCourseDoc> {
  const sourceName = sourceCourse.name || sourceCourse.title || 'Khóa học';
  const cloneTitle = `[Bản sao] ${sourceName}`;
  const rawData: any[] = Array.isArray(sourceCourse.data) ? sourceCourse.data : (Array.isArray(sourceCourse.words) ? sourceCourse.words : []);

  // Lấy danh sách bài học
  const lessonSet = new Set<string>();
  if (Array.isArray(sourceCourse.lessons) && sourceCourse.lessons.length > 0) {
    sourceCourse.lessons.forEach((l: any) => lessonSet.add(String(l).trim()));
  }

  const words: CustomWord[] = rawData.map((item, idx) => {
    const w = extractCopyWord(item, idx, sourceCourse.lessons?.[0] || 'Bài 1');
    if (w.lesson) lessonSet.add(w.lesson);
    return w;
  });

  if (lessonSet.size === 0) lessonSet.add('Bài 1');
  const lessons = Array.from(lessonSet);

  let template: 'japanese' | 'english' | 'generic' = 'generic';
  if (sourceCourse.template === 'japanese' || sourceCourse.template === 'english') {
    template = sourceCourse.template;
  }

  return await createCustomCourse(userId, userProfile, {
    title: cloneTitle,
    description: sourceCourse.description ? `Bản sao từ: ${sourceCourse.description}` : `Bản sao tạo từ ${sourceName}`,
    template,
    color: sourceCourse.color || 'indigo',
    lessons,
    words,
  });
}

/**
 * Sao chép hàng loạt từ vựng vào một bộ từ và bài học đích
 */
export async function copyWordsToCustomCourse(
  courseId: string,
  userId: string | null | undefined,
  wordsToCopy: any[],
  targetLesson: string
): Promise<{ addedCount: number; course: CustomCourseDoc }> {
  const localList = getStorageCourses();
  const idx = localList.findIndex(c => c.id === courseId);
  if (idx === -1) {
    throw new Error('Không tìm thấy bộ từ vựng mục tiêu.');
  }

  const course = localList[idx];
  const lesson = targetLesson.trim() || (course.lessons && course.lessons[0]) || 'Bài 1';

  // Đảm bảo bài có trong danh sách lessons
  const lessons = Array.from(new Set([...(course.lessons || []), lesson]));

  const newWords: CustomWord[] = wordsToCopy.map((w, i) => {
    const extracted = extractCopyWord(w, course.words.length + i, lesson);
    extracted.lesson = lesson;
    return extracted;
  });

  const updatedWords = [...course.words, ...newWords];
  const updatedDoc = sanitizeCourseDoc({
    ...course,
    lessons,
    words: updatedWords,
    wordCount: updatedWords.length,
    updatedAt: new Date().toISOString(),
  });

  localList[idx] = updatedDoc;
  saveStorageCourses(localList);

  if (userId && userId !== 'guest') {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && Array.isArray(userSnap.data().customCourses)) {
        const existing = userSnap.data().customCourses.map(sanitizeCourseDoc);
        const nextList = existing.map((c: CustomCourseDoc) => c.id === courseId ? updatedDoc : c);
        await updateDoc(userRef, { customCourses: nextList });
      }
    } catch (err) {
      console.warn('Could not sync copyWords to Firestore customCourses:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('custom_courses_changed'));
  return { addedCount: newWords.length, course: updatedDoc };
}

