import { vocabularyN3 } from '../jlpt/n3/vocabularyN3';
import { vocabularyMimikaraN2 } from '../jlpt/n2/vocabulary/mimikara';
import { vocabularyRikiN2 } from '../jlpt/n2/vocabulary/riki';
import { kanjiN3 } from '../jlpt/n3/kanjiN3';
import { allN2Kanji } from '../jlpt/n2/kanji';
import { grammarN3 } from '../jlpt/n3/grammarN3';
import { allN2Grammar } from '../jlpt/n2/grammar';
import { keigoVerbs } from '../jlpt/keigo/keigoDb';
import verbsConjugation from '../jlpt/conjugation/verbs.json';
import {
  essentialWordsStarter,
  essentialWords1,
  essentialWords2,
  essentialWords3,
  essentialWords4,
  essentialWords5,
  essentialWords6,
  toeic600,
  expressionsBook1,
} from '../english/courses';

export type SubjectType = 'vocab' | 'kanji_single' | 'kanji_words' | 'grammar' | 'special';
export type LevelType = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'ALL' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type TemplateType = 'japanese' | 'english' | 'generic';
export type ExtractType = 'all' | 'kanji_only' | 'vocabulary_only';

export interface CourseAuthor {
  name: string;
  isOfficial?: boolean;
  avatar?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  subject: SubjectType;
  level: LevelType;
  color: string;
  data: any[]; // The raw data array
  template?: TemplateType;
  extractType?: ExtractType;
  author?: CourseAuthor;
}

// Giả lập chia nhỏ các khóa học dựa trên Data tĩnh hiện tại
export const COURSE_REGISTRY: Course[] = [
  {
    id: 'n3-vocab-core',
    name: 'Từ vựng N3 Mimikara Oboeru',
    description: 'Bao quát toàn bộ từ vựng N3 thường gặp trong JLPT.',
    subject: 'vocab',
    level: 'N3',
    color: 'indigo',
    data: vocabularyN3
  },
  {
    id: 'n2-vocab-mimikara',
    name: 'Từ vựng N2 Mimikara',
    description: 'Tổng hợp từ vựng N2 theo giáo trình Mimikara Oboeru.',
    subject: 'vocab',
    level: 'N2',
    color: 'rose',
    data: vocabularyMimikaraN2
  },
  {
    id: 'n2-vocab-riki',
    name: 'Từ vựng N2 Riki',
    description: 'Tổng hợp từ vựng N2 theo giáo trình Riki Nihongo.',
    subject: 'vocab',
    level: 'N2',
    color: 'blue',
    data: vocabularyRikiN2
  },
  {
    id: 'n3-kanji-single',
    name: 'Hán Tự N3 Riki (Chữ Gốc)',
    description: 'Học mặt chữ, Bộ thủ và Âm Hán Việt cơ bản.',
    subject: 'kanji_single',
    level: 'N3',
    color: 'amber',
    data: kanjiN3
  },
  {
    id: 'n3-kanji-words',
    name: 'Chữ Hán N3 Riki (Từ Vựng)',
    description: 'Từ vựng cấu tạo từ các Hán Tự N3.',
    subject: 'kanji_words',
    level: 'N3',
    color: 'orange',
    data: kanjiN3
  },
  {
    id: 'n2-kanji-single',
    name: 'Hán Tự N2 Riki (Chữ Gốc)',
    description: 'Kanji N2 cấp cao và Âm Hán Việt.',
    subject: 'kanji_single',
    level: 'N2',
    color: 'emerald',
    data: allN2Kanji as any[]
  },
  {
    id: 'n2-kanji-words',
    name: 'Chữ Hán N2 Riki (Từ Vựng)',
    description: 'Từ vựng cấu tạo từ các Hán Tự N2.',
    subject: 'kanji_words',
    level: 'N2',
    color: 'teal',
    data: allN2Kanji as any[]
  },
  {
    id: 'n3-grammar-core',
    name: 'Ngữ pháp N3 Riki',
    description: 'Nắm chắc ngữ pháp N3 với ví dụ và bẫy JLPT.',
    subject: 'grammar',
    level: 'N3',
    color: 'teal',
    data: grammarN3
  },
  {
    id: 'n2-grammar-core',
    name: 'Ngữ pháp N2 Riki',
    description: 'Luyện thi ngữ pháp N2 theo Shinkanzen Master.',
    subject: 'grammar',
    level: 'N2',
    color: 'cyan',
    data: allN2Grammar
  },
  {
    id: 'keigo-master',
    name: 'Chinh phục Kính ngữ',
    description: 'Nắm vững Tôn kính ngữ và Khiêm nhường ngữ giao tiếp công sở.',
    subject: 'special',
    level: 'ALL',
    color: 'fuchsia',
    data: keigoVerbs
  },
  {
    id: 'verb-conjugation',
    name: 'Chia thể Động từ',
    description: 'Phản xạ chia thể nhanh như gió không cần suy nghĩ.',
    subject: 'special',
    level: 'ALL',
    color: 'orange',
    data: verbsConjugation as any[]
  },
  // ── English Courses ────────────────────────────────────────────────────
  {
    id: 'en-essential-starter',
    name: '4000 Essential Words – Starter & Phụ lục',
    description: 'Từ điển hình ảnh cơ bản: Cơ thể, Gia đình, Màu sắc, Quần áo, Đồ ăn, Thể thao và Động thực vật.',
    subject: 'vocab',
    level: 'A1',
    color: 'emerald',
    template: 'english',
    data: essentialWordsStarter as any[]
  },
  {
    id: 'en-essential-1',
    name: '4000 Essential English Words 1',
    description: 'Quyển 1: 30 bài học xây dựng vốn từ vựng nền tảng tiếng Anh thực chiến (600 từ).',
    subject: 'vocab',
    level: 'A1',
    color: 'teal',
    template: 'english',
    data: essentialWords1 as any[]
  },
  {
    id: 'en-essential-2',
    name: '4000 Essential English Words 2',
    description: 'Quyển 2: 30 bài học phát triển từ vựng sơ trung cấp A2 (600 từ).',
    subject: 'vocab',
    level: 'A2',
    color: 'cyan',
    template: 'english',
    data: essentialWords2 as any[]
  },
  {
    id: 'en-essential-3',
    name: '4000 Essential English Words 3',
    description: 'Quyển 3: 30 bài học nâng cao phản xạ từ vựng trung cấp B1 (600 từ).',
    subject: 'vocab',
    level: 'B1',
    color: 'blue',
    template: 'english',
    data: essentialWords3 as any[]
  },
  {
    id: 'en-essential-4',
    name: '4000 Essential English Words 4',
    description: 'Quyển 4: 30 bài học từ vựng trung cao cấp B2 cho học thuật và đời sống (600 từ).',
    subject: 'vocab',
    level: 'B2',
    color: 'indigo',
    template: 'english',
    data: essentialWords4 as any[]
  },
  {
    id: 'en-essential-5',
    name: '4000 Essential English Words 5',
    description: 'Quyển 5: 30 bài học từ vựng cao cấp C1 phong phú và chuyên sâu (600 từ).',
    subject: 'vocab',
    level: 'C1',
    color: 'violet',
    template: 'english',
    data: essentialWords5 as any[]
  },
  {
    id: 'en-essential-6',
    name: '4000 Essential English Words 6',
    description: 'Quyển 6: 30 bài học chinh phục đỉnh cao từ vựng bản xứ C2 (600 từ).',
    subject: 'vocab',
    level: 'C2',
    color: 'purple',
    template: 'english',
    data: essentialWords6 as any[]
  },
  {
    id: 'en-toeic-600',
    name: '600 Essential Words for the TOEIC',
    description: '50 chủ đề từ vựng kinh điển của Barron luyện thi TOEIC và tiếng Anh công sở thực tế.',
    subject: 'vocab',
    level: 'B1',
    color: 'amber',
    template: 'english',
    data: toeic600 as any[]
  },
  {
    id: 'en-expressions-1',
    name: 'English Expressions 1',
    description: '30 bài học thành ngữ và cụm từ thông dụng nhất trong giao tiếp bản ngữ hàng ngày.',
    subject: 'vocab',
    level: 'ALL',
    color: 'rose',
    template: 'english',
    data: expressionsBook1 as any[]
  },
];

export const OFFICIAL_AUTHOR: CourseAuthor = {
  name: 'Hệ thống',
  isOfficial: true
};

export function getCourseById(courseId: string): Course | undefined {
  const course = COURSE_REGISTRY.find(c => c.id === courseId);
  if (course && !course.author) {
    return { ...course, author: OFFICIAL_AUTHOR };
  }
  return course;
}

export function getCoursesBySubject(subject: SubjectType): Course[] {
  return COURSE_REGISTRY.filter(c => c.subject === subject).map(c => ({
    ...c,
    author: c.author || OFFICIAL_AUTHOR
  }));
}

export function getAllCourses(): Course[] {
  return COURSE_REGISTRY.map(c => ({
    ...c,
    author: c.author || OFFICIAL_AUTHOR
  }));
}
