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
  vocabInUseElementary,
  vocabInUsePreInt,
  vocabInUseUpperInt,
  vocabInUseAdvanced,
  oxford3000A1,
  oxford3000A2,
  oxford3000B1,
  oxford3000B2,
  oxford5000C1,
  ieltsIntermediate,
  ieltsAdvanced,
  destinationB1,
  destinationB2,
  destinationC1C2,
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
  authorId?: string;
  lessons?: string[];
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
  {
    id: 'en-viu-elementary',
    name: 'English Vocabulary in Use - Elementary',
    description: '60 bài học từ vựng nền tảng A1-A2 (1.192 từ) chuẩn Cambridge kèm ví dụ song ngữ và câu hỏi đục lỗ.',
    subject: 'vocab',
    level: 'A2',
    color: 'emerald',
    template: 'english',
    data: vocabInUseElementary as any[]
  },
  {
    id: 'en-viu-pre-intermediate',
    name: 'English Vocabulary in Use - Pre-intermediate & Intermediate',
    description: '100 bài học từ vựng sơ trung cấp B1 (2.608 từ) mở rộng vốn từ giao tiếp và làm việc thực tế.',
    subject: 'vocab',
    level: 'B1',
    color: 'teal',
    template: 'english',
    data: vocabInUsePreInt as any[]
  },
  {
    id: 'en-viu-upper-intermediate',
    name: 'English Vocabulary in Use - Upper-Intermediate',
    description: '101 bài học từ vựng trung cao cấp B2 (3.305 từ) bản 4th Edition chuẩn xác, kết thúc bằng bài học Anh - Mỹ.',
    subject: 'vocab',
    level: 'B2',
    color: 'indigo',
    template: 'english',
    data: vocabInUseUpperInt as any[]
  },
  {
    id: 'en-viu-advanced',
    name: 'English Vocabulary in Use - Advanced',
    description: '100 bài học từ vựng cao cấp C1-C2 (2.625 từ) làm chủ văn phong học thuật và diễn đạt tự nhiên như người bản ngữ.',
    subject: 'vocab',
    level: 'C1',
    color: 'purple',
    template: 'english',
    data: vocabInUseAdvanced as any[]
  },
  {
    id: 'en-oxford-a1',
    name: 'Oxford 3000 - Căn bản (A1)',
    description: '30 bài học (874 từ) nền tảng căn bản nhất của Đại học Oxford, đầy đủ định nghĩa Anh-Anh, ví dụ và bài tập đục lỗ.',
    subject: 'vocab',
    level: 'A1',
    color: 'emerald',
    template: 'english',
    data: oxford3000A1 as any[]
  },
  {
    id: 'en-oxford-a2',
    name: 'Oxford 3000 - Sơ cấp (A2)',
    description: '30 bài học (855 từ) giao tiếp hàng ngày cốt lõi của Đại học Oxford, hoàn thiện vốn từ sinh hoạt và diễn đạt tự tin.',
    subject: 'vocab',
    level: 'A2',
    color: 'teal',
    template: 'english',
    data: oxford3000A2 as any[]
  },
  {
    id: 'en-oxford-b1',
    name: 'Oxford 3000 - Trung cấp (B1)',
    description: '28 bài học (795 từ) trung cấp của Đại học Oxford, mở rộng khả năng tranh luận, công việc và học tập thực tế.',
    subject: 'vocab',
    level: 'B1',
    color: 'blue',
    template: 'english',
    data: oxford3000B1 as any[]
  },
  {
    id: 'en-oxford-b2',
    name: 'Oxford 3000 - Trung cao cấp (B2)',
    description: '25 bài học (699 từ) hoàn thiện bộ The Oxford 3000, sẵn sàng cho các kỳ thi quốc tế B2 First, IELTS 5.5 - 6.5.',
    subject: 'vocab',
    level: 'B2',
    color: 'indigo',
    template: 'english',
    data: oxford3000B2 as any[]
  },
  {
    id: 'en-oxford-c1',
    name: 'Oxford 5000 - Cao cấp (C1)',
    description: '45 bài học (1.352 từ) cao cấp của Đại học Oxford, làm chủ từ vựng học thuật chuyên sâu và chinh phục IELTS 7.0 - 8.5+.',
    subject: 'vocab',
    level: 'C1',
    color: 'purple',
    template: 'english',
    data: oxford5000C1 as any[]
  },
  {
    id: 'en-ielts-intermediate',
    name: 'Cambridge Vocabulary for IELTS (Band 5.5 - 6.5)',
    description: '60 bài học (1.890 từ) bao quát toàn diện 20 chủ đề trọng điểm của bài thi IELTS từ giáo trình chính thức của Cambridge.',
    subject: 'vocab',
    level: 'B2',
    color: 'amber',
    template: 'english',
    data: ieltsIntermediate as any[]
  },
  {
    id: 'en-ielts-advanced',
    name: 'Cambridge Vocabulary for IELTS - Advanced (Band 7.0 - 8.5+)',
    description: '25 bài học (519 từ) học thuật tinh tuyển của Cambridge, bứt phá band điểm Writing Task 2 và Speaking tự nhiên như người bản ngữ.',
    subject: 'vocab',
    level: 'C1',
    color: 'rose',
    template: 'english',
    data: ieltsAdvanced as any[]
  },
  {
    id: 'en-destination-b1',
    name: 'Destination B1: Vocabulary & Phrasal Verbs',
    description: 'Giáo trình Macmillan Destination B1: 42 bài học (527 từ & cụm động từ) kèm 2.072 collocations, word formations và bài tập thực chiến.',
    subject: 'vocab',
    level: 'B1',
    color: 'teal',
    template: 'english',
    data: destinationB1 as any[]
  },
  {
    id: 'en-destination-b2',
    name: 'Destination B2: Vocabulary & Phrasal Verbs',
    description: 'Giáo trình Macmillan Destination B2: 28 bài học (594 từ & cụm động từ) chuẩn Upper-Intermediate, mở rộng vốn từ vựng và cụm từ nâng cao.',
    subject: 'vocab',
    level: 'B2',
    color: 'sky',
    template: 'english',
    data: destinationB2 as any[]
  },
  {
    id: 'en-destination-c1c2',
    name: 'Destination C1 & C2: Advanced Vocabulary',
    description: 'Giáo trình đỉnh cao Macmillan Destination C1 & C2: 1.505 từ vựng học thuật cao cấp, chuẩn bị cho IELTS 7.5 - 9.0 và Cambridge CAE/CPE.',
    subject: 'vocab',
    level: 'C1',
    color: 'fuchsia',
    template: 'english',
    data: destinationC1C2 as any[]
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
