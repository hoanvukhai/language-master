// src/pages/Learn/LearnCourseDetail.tsx
// Màn hình chi tiết khóa học — Grid Bài/Unit, Bảng danh sách từ & Chỉnh hàng loạt 'Đã thuộc'
// Hỗ trợ tất cả subject types: vocab, kanji_single, kanji_words, grammar
// [FIX] Dùng courseId từ route ancestor /course/:courseId thay vì sSubject string cũ

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/auth/useAuth';
import { 
  ArrowLeft, 
  BookOpen, 
  RefreshCw, 
  CheckCircle2, 
  CheckSquare, 
  Square, 
  Plus, 
  ChevronsUp, 
  Droplet, 
  EyeOff, 
  Copy, 
  FolderPlus,
  Edit2,
  Trash2,
  FileText,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Users,
  Loader2
} from 'lucide-react';
import MasteryIcon from '../../components/srs/MasteryIcon';
import MasterySVG from '../../components/srs/MasterySVG';
import { fetchAllProgress, batchUpdateWordMasteredStatus } from '../../lib/srs/firestoreSync';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useMyCourses } from '../../context/global/useMyCourses';
import { useSettings } from '../../context/global/useSettings';
import { type WordProgress, type SRSSubject } from '../../lib/srs/srsTypes';
import { useCourseData } from '../../hooks/useCourseData';
import CopyWordsModal from '../../components/course/CopyWordsModal';
import CustomWordModal from '../../components/course/CustomWordModal';
import CustomBulkImportModal from '../../components/course/CustomBulkImportModal';
import CustomLessonModal from '../../components/course/CustomLessonModal';
import ReorderLessonsModal from '../../components/course/ReorderLessonsModal';
import { useCustomCourses } from '../../context/customCourses/useCustomCourses';
import { 
  addWordToCustomCourse,
  updateWordInCustomCourse,
  deleteWordFromCustomCourse,
  bulkAddWordsToCustomCourse,
  addLessonToCustomCourse,
  renameLessonInCustomCourse,
  deleteLessonFromCustomCourse,
  reorderLessonsInCustomCourse,
  moveLessonPosition,
  cloneFullCourse,
  type CustomWord
} from '../../lib/customCourses/customCourseService';

// ── Types ─────────────────────────────────────────────────────────────────

interface LessonGroupItem {
  id: string;
  title: string;
  sub: string;
  meaning: string;
  words?: any[];
  masteryLevel: number;
  isMastered: boolean;
  nextReviewDate?: Date | null;
  isDue?: boolean;
  hoursLeft?: number;
  timeLeftStr?: string;
  example?: string;
}

interface LessonGroup {
  lessonName: string;
  total: number;
  learned: number;
  items: LessonGroupItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────


/** Xây danh sách phẳng từ course.data dựa trên course.subject */
function buildFlatList(subject: string, data: any[], template?: string): any[] {
  // English vocab: pass through directly like 'vocab'
  if (subject === 'vocab' || subject === 'grammar' || subject === 'special' || template === 'english') {
    return data;
  }

  if (subject === 'kanji_single') {
    const items: any[] = [];
    data.forEach((k: any) => {
      // 1. Chữ Hán gốc
      items.push({
        id: k.id || k.character,
        character: k.character,
        kanji: k.character,
        hanViet: k.hanViet,
        hiragana: k.character,
        meaning: `Chữ Hán Gốc — Âm Hán Việt: ${k.hanViet}`,
        lesson: k.lesson || 'Bài 1',
        isRootKanji: true,
      });
      // 2. Từ ghép Hán Việt
      if (k.words && k.words.length > 0) {
        k.words.forEach((w: any) => {
          const meaningStr = typeof w.meaning === 'object' ? w.meaning.vi : w.meaning;
          items.push({
            id: w.id || `${k.character}_${w.word}`,
            character: w.word,
            kanji: w.word,
            hanViet: w.hanVietWord || k.hanViet,
            hiragana: w.hiragana,
            meaning: `Từ Ghép Hán Việt: ${w.hanVietWord || k.hanViet} · (${meaningStr})`,
            lesson: k.lesson || 'Bài 1',
            isRootKanji: false,
          });
        });
      }
    });
    return items;
  }

  if (subject === 'kanji_words') {
    const items: any[] = [];
    data.forEach((k: any) => {
      if (k.words) {
        k.words.forEach((w: any) => {
          items.push({
            id: w.id || `${k.character}_${w.word}`,
            kanji: w.word,
            hiragana: w.hiragana,
            hanViet: w.hanVietWord || k.hanViet,
            meaning: typeof w.meaning === 'object' ? w.meaning.vi : w.meaning,
            lesson: k.lesson || 'Bài 1',
          });
        });
      }
    });
    return items;
  }

  return data;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function LearnCourseDetail() {
  // [FIX-4] courseId đến từ route ancestor /course/:courseId/* — React Router v6 merge params
  const { courseId = '' } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Lấy course object từ useCourseData (hỗ trợ cả khóa hệ thống và custom course)
  const { course } = useCourseData(courseId);

  // Sync selected lesson với URL param ?lesson=Bài%201
  const selectedLesson = searchParams.get('lesson');
  const setSelectedLesson = (lesson: string | null) => {
    if (lesson) setSearchParams({ lesson });
    else setSearchParams({});
  };

  // [FIX-URL] returnUrl dùng /course/:courseId thay vì /learn/:sSubject
  const currentCourseUrl = selectedLesson
    ? `/course/${courseId}?lesson=${encodeURIComponent(selectedLesson)}`
    : `/course/${courseId}`;

  const { user } = useAuth();
  const { language } = useSettings();
  const navigate = useNavigate();
  const { executeWithGate, GateComponent } = useAuthGate();

  // Lấy trạng thái khóa học
  const { myCourseIds } = useMyCourses();
  const isAdded = courseId ? myCourseIds.includes(courseId) : false;

  const [progressMap, setProgressMap] = useState<Map<string, WordProgress>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  // Toast thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // State cho modal sao chép từ/bài
  const [copyModalState, setCopyModalState] = useState<{
    isOpen: boolean;
    words: any[];
    sourceLessonName?: string;
    sourceCourseName?: string;
    title?: string;
  }>({ isOpen: false, words: [] });

  const { customCourses } = useCustomCourses();
  const isCustomCourse = Boolean(course?.id?.startsWith('custom_'));
  const isOwner = Boolean(
    isCustomCourse && (
      (course?.authorId && user?.uid ? course.authorId === user.uid : false) ||
      customCourses.some(c => c.id === courseId)
    )
  );

  const [isCloning, setIsCloning] = useState(false);
  const handleCloneThisCourse = async () => {
    if (!course || isCloning) return;
    setIsCloning(true);
    try {
      const cloned = await cloneFullCourse(user?.uid, user, course);
      showToast(`Đã sao chép thành công "${cloned.title}"! Đang chuyển hướng...`);
      setTimeout(() => {
        navigate(`/course/${cloned.id}`);
      }, 1200);
    } catch (err) {
      console.error('Lỗi sao chép khóa học:', err);
      showToast('Có lỗi xảy ra khi sao chép khóa học.');
    } finally {
      setIsCloning(false);
    }
  };

  // State cho modal quản lý từ và bài học custom
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<{ id: string; title: string; sub?: string; meaning: string; example?: string } | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [lessonModalState, setLessonModalState] = useState<{
    isOpen: boolean;
    isEditing: boolean;
    initialName: string;
  }>({ isOpen: false, isEditing: false, initialName: '' });

  // State menu 3 chấm trên thẻ bài học
  const [activeMenuLesson, setActiveMenuLesson] = useState<string | null>(null);
  // State modal sắp xếp thứ tự bài học
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  useEffect(() => {
    if (!activeMenuLesson) return;
    const handleClickOutside = () => setActiveMenuLesson(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuLesson]);

  // [FIX-6] Dùng course.id làm courseId cho Firestore thay vì sSubject string
  const loadData = async () => {
    if (!user || !course) { setLoading(false); return; }
    setLoading(true);
    try {
      const allProg = await fetchAllProgress(user.uid, course.id);
      const map = new Map<string, WordProgress>();
      Object.values(allProg).forEach(p => map.set(p.itemId, p));
      setProgressMap(map);
    } catch (err) {
      console.error('Error loading course details:', err);
    } finally {
      setLoading(false);
    }
  };

  // [FIX-4] Depend on courseId (không phải sSubject)
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user, courseId]);

  // Handlers thao tác từ và bài học cho Custom Course
  const handleSaveWord = async (wordData: Partial<CustomWord>) => {
    if (!course) return;
    if (editingWord) {
      await updateWordInCustomCourse(course.id, user?.uid, {
        id: editingWord.id,
        kanji: wordData.kanji || '',
        hiragana: wordData.hiragana || '',
        meaning: wordData.meaning || '',
        exampleKanji: wordData.exampleKanji || '',
        exampleMeaning: '',
        lesson: selectedLesson || 'Bài 1',
      });
      showToast('Đã cập nhật từ vựng thành công!');
    } else {
      await addWordToCustomCourse(course.id, user?.uid, wordData, selectedLesson || 'Bài 1');
      showToast('Đã thêm từ vựng mới thành công!');
    }
    await loadData();
  };

  const handleDeleteWord = async (wordId: string, wordTerm: string) => {
    if (!course) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa từ "${wordTerm}" khỏi bộ thẻ này không?`)) return;
    await deleteWordFromCustomCourse(course.id, user?.uid, wordId);
    showToast(`Đã xóa từ "${wordTerm}" thành công!`);
    await loadData();
  };

  const handleBulkImport = async (words: Partial<CustomWord>[]) => {
    if (!course) return;
    await bulkAddWordsToCustomCourse(course.id, user?.uid, words, selectedLesson || 'Bài 1');
    showToast(`Đã thêm thành công ${words.length} từ vựng vào "${selectedLesson || 'Bài 1'}"!`);
    await loadData();
  };

  const handleSaveLesson = async (lessonName: string) => {
    if (!course) return;
    if (lessonModalState.isEditing) {
      await renameLessonInCustomCourse(course.id, user?.uid, lessonModalState.initialName, lessonName);
      showToast(`Đã đổi tên bài thành "${lessonName}"!`);
      if (selectedLesson === lessonModalState.initialName) {
        setSelectedLesson(lessonName);
      }
    } else {
      await addLessonToCustomCourse(course.id, user?.uid, lessonName);
      showToast(`Đã tạo bài học "${lessonName}" thành công!`);
    }
    await loadData();
  };

  const handleMoveLesson = async (lessonName: string, direction: 'up' | 'down') => {
    if (!course) return;
    await moveLessonPosition(course.id, user?.uid, lessonName, direction);
    showToast(direction === 'up' ? `Đã chuyển "${lessonName}" lên trước` : `Đã chuyển "${lessonName}" xuống sau`);
    await loadData();
  };

  const handleSaveReorderedLessons = async (newOrder: string[]) => {
    if (!course) return;
    await reorderLessonsInCustomCourse(course.id, user?.uid, newOrder);
    showToast('Đã lưu thứ tự bài học thành công!');
    await loadData();
  };

  const handleDeleteLesson = async (lessonName: string) => {
    if (!course) return;
    if (lessonGroups.length <= 1) {
      if (!window.confirm(`Đây là bài học duy nhất còn lại trong bộ thẻ. Bạn có chắc muốn xóa bài này không? (Thao tác này sẽ xóa sạch từ vựng và đặt lại bài mới trống).`)) {
        return;
      }
    } else {
      if (!window.confirm(`Bạn có chắc muốn xóa bài "${lessonName}"? Các từ vựng trong bài này sẽ được chuyển sang bài đầu tiên.`)) {
        return;
      }
    }
    await deleteLessonFromCustomCourse(course.id, user?.uid, lessonName);
    showToast(`Đã xóa bài "${lessonName}"!`);
    if (selectedLesson === lessonName) {
      setSelectedLesson(null);
    }
    await loadData();
  };

  // ── Build Lesson Groups ────────────────────────────────────────────────
  // [FIX-3 & FIX-5] Dùng course.data + course.subject thay vì switch-case theo sSubject
  const lessonGroups: LessonGroup[] = useMemo(() => {
    if (!course) return [];

    const rawList = buildFlatList(course.subject, course.data as any[], course.template);

    const groupMap = new Map<string, any[]>();

    // Đảm bảo tất cả các bài học được cấu hình trong course.lessons đều xuất hiện (ngay cả khi chưa có từ nào)
    if (course.lessons && Array.isArray(course.lessons)) {
      course.lessons.forEach((l: string) => {
        const clean = String(l || '').trim();
        if (clean && !groupMap.has(clean)) groupMap.set(clean, []);
      });
    }

    rawList.forEach((item: any) => {
      const lessonName = item.lesson || 'Bài 1';
      if (!groupMap.has(lessonName)) groupMap.set(lessonName, []);
      groupMap.get(lessonName)!.push(item);
    });

    if (groupMap.size === 0) {
      groupMap.set('Bài 1', []);
    }

    const groups: LessonGroup[] = [];
    groupMap.forEach((items, lessonName) => {
      let learnedCount = 0;
      const formattedItems = items.map((item: any) => {
        const id = item.id || item.character || item.structure;
        const prog = progressMap.get(id);
        const lvl = prog?.masteryLevel ?? 0;
        const isMastered = lvl >= 6 || prog?.status === 'mastered';
        if (lvl > 0 || isMastered) learnedCount++;

        const now = new Date();
        const isDue = prog?.nextReviewDate
          ? prog.nextReviewDate <= now && prog.status !== 'new'
          : false;

        let timeLeftFormatted = '';
        if (prog?.nextReviewDate && prog.nextReviewDate > now && prog.status !== 'new') {
          const msLeft = prog.nextReviewDate.getTime() - now.getTime();
          const mins = Math.ceil(msLeft / (1000 * 60));
          if (mins < 60) {
            timeLeftFormatted = `${mins}p`;
          } else {
            const hours = Math.round(mins / 60);
            if (hours < 24) {
              timeLeftFormatted = `${hours}h`;
            } else {
              const days = Math.round(hours / 24);
              timeLeftFormatted = `${days}d`;
            }
          }
        }

        const exampleStr = typeof item.example === 'object'
          ? (item.example?.kanji || item.example?.jp || '')
          : (item.exampleKanji || item.example || '');

        return {
          id,
          // English: use 'word' as title, 'ipa' as sub; Japanese: use 'kanji'/'hiragana'
          title: item.word || item.kanji || item.character || item.structure || item.hiragana,
          sub: item.ipa || item.hanViet || item.hiragana || '',
          meaning: typeof item.meaning === 'object' ? (language === 'en' && item.meaning.en ? item.meaning.en : item.meaning.vi) : item.meaning,
          words: item.words,
          masteryLevel: lvl,
          isMastered,
          nextReviewDate: prog?.nextReviewDate ?? null,
          isDue,
          timeLeftStr: timeLeftFormatted,
          example: exampleStr,
        };
      });

      groups.push({ lessonName, total: items.length, learned: learnedCount, items: formattedItems });
    });

    // Sắp xếp bài học: Ưu tiên theo thứ tự trong course.lessons nếu có
    if (course.lessons && Array.isArray(course.lessons)) {
      const orderMap = new Map(course.lessons.map((name, i) => [name, i]));
      return groups.sort((a, b) => {
        const idxA = orderMap.has(a.lessonName) ? orderMap.get(a.lessonName)! : 9999;
        const idxB = orderMap.has(b.lessonName) ? orderMap.get(b.lessonName)! : 9999;
        if (idxA !== idxB) return idxA - idxB;
        const numA = parseInt(a.lessonName.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.lessonName.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    }

    // Sắp xếp tự nhiên: Bài 1, Bài 2 ... Bài 10, Bài 11...
    return groups.sort((a, b) => {
      const numA = parseInt(a.lessonName.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.lessonName.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [course, progressMap, language]);

  // ── Batch Selection Handlers ───────────────────────────────────────────

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectUnlearned = (items: { id: string }[]) => {
    const unlearnedIds = items.filter(i => (progressMap.get(i.id)?.masteryLevel || 0) < 2).map(i => i.id);
    const isAllSelected = unlearnedIds.length > 0 && unlearnedIds.every(id => selectedItemIds.includes(id));
    if (isAllSelected) {
      setSelectedItemIds(prev => prev.filter(id => !unlearnedIds.includes(id)));
    } else {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...unlearnedIds])));
    }
  };

  const toggleSelectLearned = (items: { id: string }[]) => {
    const learnedIds = items.filter(i => (progressMap.get(i.id)?.masteryLevel || 0) > 0).map(i => i.id);
    const isAllSelected = learnedIds.length > 0 && learnedIds.every(id => selectedItemIds.includes(id));
    if (isAllSelected) {
      setSelectedItemIds(prev => prev.filter(id => !learnedIds.includes(id)));
    } else {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...learnedIds])));
    }
  };

  // [FIX-2] Truyền đúng 5 tham số: userId, courseId, subject, itemIds, isMastered
  const handleBatchMark = async (markAsMastered: boolean) => {
    if (!user || !course || selectedItemIds.length === 0) return;

    // Tự động lọc ra những từ phù hợp để tránh bị tăng/giảm cấp độ oan uổng
    const validIds = selectedItemIds.filter(id => {
      const prog = progressMap.get(id);
      const lvl = prog ? prog.masteryLevel : 0;
      if (markAsMastered) {
        return lvl < 2; // Chỉ nhảy cóc nếu < 2
      } else {
        return lvl > 0; // Chỉ khôi phục nếu > 0
      }
    });

    if (validIds.length === 0) {
      setSelectedItemIds([]);
      return;
    }

    // Xác nhận trước khi Khôi phục (xóa dữ liệu)
    if (!markAsMastered) {
      const confirmMsg = `Bạn có chắc chắn muốn khôi phục ${validIds.length} từ này về Hạt giống không?\nToàn bộ tiến độ và level của các từ này sẽ bị xóa sạch!`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setUpdating(true);
    try {
      await batchUpdateWordMasteredStatus(
        user.uid,
        course.id,
        course.subject as SRSSubject,
        validIds,
        markAsMastered
      );
      await loadData();
      const count = validIds.length;
      setSelectedItemIds([]);
      if (markAsMastered) {
        showToast(`Đã chuyển thành công ${count} từ lên Level 2!`);
      } else {
        showToast(`Đã khôi phục ${count} từ về Chưa học!`);
      }
    } catch (e) {
      console.error('Batch update error:', e);
      showToast('Có lỗi xảy ra khi cập nhật tiến độ.');
    } finally {
      setUpdating(false);
    }
  };


  // ── Tính toán số lượng từ hợp lệ cho Batch Actions ─────────────────────
  const eligibleForLv2Count = selectedItemIds.filter(id => {
    const prog = progressMap.get(id);
    return !prog || prog.masteryLevel < 2;
  }).length;

  const eligibleForRestoreCount = selectedItemIds.filter(id => {
    const prog = progressMap.get(id);
    return prog && prog.masteryLevel > 0;
  }).length;

  // ── Render States ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500">Không tìm thấy khóa học!</h2>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-slate-200 rounded-xl">Quay lại</button>
      </div>
    );
  }

  const activeGroup = lessonGroups.find(g => g.lessonName === selectedLesson);
  // [FIX] Dùng course.name thay vì getSubjectTitle(sSubject)
  const subjectTitle = course.name;

  return (
    <div className="font-sans">
      {/* Header chỉ hiện khi xem chi tiết bài cụ thể */}
      {selectedLesson && (() => {
        const now = new Date();
        const lessonDueCount = activeGroup?.items.filter(item => {
          const prog = progressMap.get(item.id);
          return prog && prog.status !== 'new' && prog.nextReviewDate <= now;
        }).length ?? 0;
        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedLesson(null); setSelectedItemIds([]); }}
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  {selectedLesson} — {subjectTitle}
                </h2>
                <p className="text-xs text-slate-400">Quản lý danh sách từ &amp; Chỉnh sửa trạng thái Đã thuộc</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Nút thao tác riêng cho tác giả Custom Course */}
              {isOwner && (
                <>
                  <button
                    onClick={() => {
                      setEditingWord(null);
                      setIsWordModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                    title="Thêm từ vựng mới vào bài này"
                  >
                    <Plus size={14} /> <span>Thêm từ mới</span>
                  </button>
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-600"
                    title="Nhập hàng loạt từ vựng (Copy/Paste)"
                  >
                    <FileText size={14} /> <span>Nhập hàng loạt</span>
                  </button>
                  <button
                    onClick={() => setLessonModalState({ isOpen: true, isEditing: true, initialName: selectedLesson })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-600"
                    title="Đổi tên bài học này"
                  >
                    <Edit2 size={13} /> <span>Đổi tên</span>
                  </button>
                  <button
                    onClick={() => handleDeleteLesson(selectedLesson)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all border border-red-200/60 dark:border-red-900/40"
                    title="Xóa bài học này"
                  >
                    <Trash2 size={13} /> <span>Xóa bài</span>
                  </button>
                </>
              )}

              {/* Nút Sao chép cả bài học */}
              <button
                onClick={() => {
                  const lessonWords = (activeGroup?.items || []).map(i => ({
                    kanji: i.title,
                    hiragana: i.sub,
                    meaning: i.meaning,
                    lesson: selectedLesson || 'Bài 1',
                  }));
                  setCopyModalState({
                    isOpen: true,
                    words: lessonWords,
                    sourceLessonName: selectedLesson || undefined,
                    sourceCourseName: course.name,
                    title: `Sao chép "${selectedLesson}" (${lessonWords.length} từ) vào bộ thẻ cá nhân`,
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-600"
                title="Sao chép toàn bộ bài học này vào bộ thẻ cá nhân của bạn"
              >
                <Copy size={14} /> <span>Sao chép bài</span>
              </button>

              {isAdded ? (
                <>
                  <button
                    onClick={() => navigate(`/learn/session?courseId=${courseId}&lesson=${encodeURIComponent(selectedLesson)}&mode=new&returnUrl=${encodeURIComponent(currentCourseUrl)}`)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                  >
                    <BookOpen size={14} /> Học bài này
                  </button>
                  {lessonDueCount > 0 && (
                    <button
                      onClick={() => navigate(`/learn/session?courseId=${courseId}&lesson=${encodeURIComponent(selectedLesson)}&mode=review&returnUrl=${encodeURIComponent(currentCourseUrl)}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
                    >
                      <RefreshCw size={14} />Ôn bài ({lessonDueCount})
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => executeWithGate(() => navigate(`/learn/session?courseId=${courseId}&lesson=${encodeURIComponent(selectedLesson)}&mode=new&returnUrl=${encodeURIComponent(currentCourseUrl)}`), courseId)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                >
                  <Plus size={14} /> Thêm vào Khóa Học
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* VIEW 1: LESSON GRID OVERVIEW */}
      {!selectedLesson ? (
        <div className="space-y-4">
          {/* Banner thông báo khóa học cộng đồng khi không phải chủ sở hữu */}
          {isCustomCourse && !isOwner && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span>Khóa học cộng đồng</span>
                    <span className="text-purple-600 dark:text-purple-400">• Tác giả: {course.author?.name || 'Thành viên'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Bạn đang học ở chế độ chỉ đọc. Để thêm bớt hoặc chỉnh sửa nội dung, hãy sao chép thành bộ từ cá nhân của bạn.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloneThisCourse}
                disabled={isCloning}
                className="shrink-0 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCloning ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                <span>{isCloning ? 'Đang sao chép...' : 'Tạo bản sao để chỉnh sửa'}</span>
              </button>
            </div>
          )}

          {/* Header thanh công cụ */}
          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={16} className="text-indigo-500" />
                <span>Bài học</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/40">
                {lessonGroups.length} bài
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <>
                  {lessonGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsReorderModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-200 dark:border-slate-600"
                      title="Đổi thứ tự hiển thị các bài học"
                    >
                      <ArrowUpDown size={14} /> <span>Đổi thứ tự</span>
                    </button>
                  )}
                  <button
                    onClick={() => setLessonModalState({ isOpen: true, isEditing: false, initialName: '' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                  >
                    <Plus size={14} /> <span>Thêm bài mới</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCloneThisCourse}
                  disabled={isCloning}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-600 cursor-pointer disabled:opacity-50"
                  title="Sao chép toàn bộ khóa học này thành bộ từ cá nhân của bạn"
                >
                  {isCloning ? <Loader2 size={13} className="animate-spin text-indigo-500" /> : <Copy size={13} />}
                  <span>Sao chép toàn bộ khóa</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {lessonGroups.map((group, idx) => {
              const pct = group.total > 0 ? Math.round((group.learned / group.total) * 100) : 0;
              const isDone = pct === 100;
              const avgLevelNum = group.items.reduce((acc, i) => acc + (i.masteryLevel || 0), 0) / (group.items.length || 1);
              const avgLevel = group.items.every(i => (i.masteryLevel || 0) === 0)
                ? 'unlearned'
                : Math.round(avgLevelNum);

              return (
                <div
                  key={group.lessonName}
                  onClick={() => setSelectedLesson(group.lessonName)}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between relative min-h-[175px]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 flex items-center justify-center p-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 shrink-0">
                      <MasterySVG level={avgLevel} className="w-full h-full" />
                    </div>

                    <div className="flex items-center gap-1 relative">
                      {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}

                      {/* Nút 3 chấm gọn gàng */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuLesson(activeMenuLesson === group.lessonName ? null : group.lessonName);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
                          title="Tùy chọn bài học"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuLesson === group.lessonName && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-scale-up origin-top-right divide-y divide-slate-100 dark:divide-slate-700/60"
                          >
                            <div className="py-1">
                              {/* Sao chép bài học */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuLesson(null);
                                  const lessonWords = group.items.map(i => ({
                                    kanji: i.title,
                                    hiragana: i.sub,
                                    meaning: i.meaning,
                                    lesson: group.lessonName,
                                  }));
                                  setCopyModalState({
                                    isOpen: true,
                                    words: lessonWords,
                                    sourceLessonName: group.lessonName,
                                    sourceCourseName: course.name,
                                    title: `Sao chép "${group.lessonName}" (${lessonWords.length} từ) vào bộ thẻ cá nhân`,
                                  });
                                }}
                                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
                              >
                                <Copy size={14} className="text-slate-400" />
                                <span>Sao chép bài học</span>
                              </button>

                              {/* Tùy chọn cho Chủ sở hữu Custom Course */}
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuLesson(null);
                                    setLessonModalState({
                                      isOpen: true,
                                      isEditing: true,
                                      initialName: group.lessonName,
                                    });
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
                                >
                                  <Edit2 size={14} className="text-slate-400" />
                                  <span>Đổi tên bài học</span>
                                </button>
                              )}
                            </div>

                            {/* Đổi vị trí bài học nếu là custom course và có từ 2 bài trở lên */}
                            {isCustomCourse && lessonGroups.length > 1 && (
                              <div className="py-1">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuLesson(null);
                                      handleMoveLesson(group.lessonName, 'up');
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
                                  >
                                    <ArrowUp size={14} className="text-slate-400" />
                                    <span>Chuyển lên trước</span>
                                  </button>
                                )}
                                {idx < lessonGroups.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuLesson(null);
                                      handleMoveLesson(group.lessonName, 'down');
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
                                  >
                                    <ArrowDown size={14} className="text-slate-400" />
                                    <span>Chuyển xuống sau</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Xóa bài học */}
                            {isCustomCourse && (
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuLesson(null);
                                    handleDeleteLesson(group.lessonName);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
                                >
                                  <Trash2 size={14} className="text-red-500" />
                                  <span>Xóa bài học</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base mb-1 text-slate-800 dark:text-white line-clamp-2 min-h-[2.5rem]">{group.lessonName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {group.learned}/{group.total} từ ({pct}%)
                  </p>

                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Thẻ Thêm bài mới chỉ hiện cho Chủ sở hữu */}
            {isOwner && (
              <div
                onClick={() => setLessonModalState({ isOpen: true, isEditing: false, initialName: '' })}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl p-5 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 group min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Plus size={24} />
                </div>
                <span className="font-bold text-sm">Thêm bài mới</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Tạo bài / chủ đề mới</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: DETAILED LESSON WORD TABLE & BATCH EDIT */
        activeGroup && (
          <div className="space-y-4">
            {/* Batch Action Toolbar */}
            {isAdded && activeGroup.items.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSelectUnlearned(activeGroup.items)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    <CheckSquare size={14} />
                    <span>Chọn Chưa học</span>
                  </button>
                  <button
                    onClick={() => toggleSelectLearned(activeGroup.items)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    <CheckSquare size={14} />
                    <span>Chọn Đã học</span>
                  </button>
                  <span className="text-xs text-slate-400 font-medium">
                    Đã chọn: <strong className="text-indigo-500">{selectedItemIds.length}</strong> từ
                  </span>
                </div>

                {selectedItemIds.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Nút Sao chép vào bộ từ cá nhân */}
                    <button
                      onClick={() => {
                        const wordsToCopy = activeGroup.items
                          .filter(i => selectedItemIds.includes(i.id))
                          .map(i => ({
                            kanji: i.title,
                            hiragana: i.sub,
                            meaning: i.meaning,
                            lesson: selectedLesson || 'Bài 1',
                          }));
                        setCopyModalState({
                          isOpen: true,
                          words: wordsToCopy,
                          sourceLessonName: selectedLesson || undefined,
                          sourceCourseName: course.name,
                          title: `Sao chép ${wordsToCopy.length} từ vào bộ thẻ cá nhân`,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all border border-indigo-200 dark:border-indigo-800/40 shadow-xs active:scale-95"
                      title="Sao chép các từ đã chọn vào một bộ từ cá nhân độc lập của bạn"
                    >
                      <FolderPlus size={14} />
                      <span>Sao chép ({selectedItemIds.length})</span>
                    </button>

                    {/* Nút Tăng Lv.2 - Luôn hiển thị, disabled khi count = 0 */}
                    <button
                      onClick={() => handleBatchMark(true)}
                      disabled={updating || eligibleForLv2Count === 0}
                      title={eligibleForLv2Count === 0 ? "Tất cả từ đã chọn đều đã đạt Lv.2 trở lên" : `Chuyển ${eligibleForLv2Count} từ lên Level 2`}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        eligibleForLv2Count > 0
                          ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/20 active:scale-95'
                          : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <ChevronsUp size={14} className="stroke-[3]" />
                      <span>Tăng Lv.2 ({eligibleForLv2Count})</span>
                    </button>

                    {/* Nút Khôi phục - Luôn hiển thị, disabled khi count = 0 */}
                    <button
                      onClick={() => handleBatchMark(false)}
                      disabled={updating || eligibleForRestoreCount === 0}
                      title={eligibleForRestoreCount === 0 ? "Tất cả từ đã chọn đều là Chưa học (Level 0), không cần khôi phục" : `Khôi phục ${eligibleForRestoreCount} từ về Chưa học`}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        eligibleForRestoreCount > 0
                          ? 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 active:scale-95'
                          : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>Khôi phục ({eligibleForRestoreCount})</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty State when 0 words in lesson */}
            {activeGroup.items.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={26} />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                  Bài học "{selectedLesson}" chưa có từ vựng nào
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
                  Hãy bắt đầu thêm từ vựng mới hoặc dán danh sách hàng loạt để tích hợp vào lộ trình học tập SRS!
                </p>
                {isOwner ? (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => { setEditingWord(null); setIsWordModalOpen(true); }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Plus size={15} /> Thêm từ mới
                    </button>
                    <button
                      onClick={() => setIsBulkModalOpen(true)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <FileText size={15} /> Nhập hàng loạt (Copy/Paste)
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Khóa học này đang được cập nhật thêm nội dung.</p>
                )}
              </div>
            ) : (
              /* Word List Table */
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {activeGroup.items.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 transition-colors ${isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-900/20'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/40'
                          }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          {isAdded && (
                            <button
                              onClick={() => toggleSelectItem(item.id)}
                              className={`mt-1 sm:mt-0 transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          )}

                          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-sm shrink-0">
                            <MasteryIcon level={item.masteryLevel as any} size="md" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center bg-indigo-500 text-white text-[9px] font-black rounded-full shadow-sm border border-white dark:border-slate-800">
                              {item.masteryLevel}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                              {item.title}
                              {item.sub && (
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/40">
                                  ({item.sub})
                                </span>
                              )}
                            </p>

                            {/* Danh sách từ ghép cho khóa Hán Tự */}
                            {item.words && item.words.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.words.map((w: any, wIdx: number) => (
                                  <span
                                    key={wIdx}
                                    className="text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-600 font-medium"
                                  >
                                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{w.word}</strong>{' '}
                                    ({w.hiragana}) {w.hanVietWord ? `· ${w.hanVietWord}` : ''}:{' '}
                                    {typeof w.meaning === 'object' ? w.meaning.vi : w.meaning}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.meaning}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 mt-3 sm:mt-0">
                          {isOwner && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingWord({
                                    id: item.id,
                                    title: item.title,
                                    sub: item.sub,
                                    meaning: item.meaning,
                                    example: item.example,
                                  });
                                  setIsWordModalOpen(true);
                                }}
                                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                                title="Chỉnh sửa từ này"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteWord(item.id, item.title)}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title="Xóa từ này"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}

                          {isAdded && (
                            <>
                              {item.isDue && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-900/30 border border-sky-200/60 dark:border-sky-800/50" title="Đến hạn ôn">
                                  <Droplet size={14} className="text-sky-500 dark:text-sky-400 fill-current" />
                                </div>
                              )}
                              {item.timeLeftStr && (
                                <span className="flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                  <Droplet size={12} className="fill-current opacity-70" /> {item.timeLeftStr}
                                </span>
                              )}
                              {item.masteryLevel === 0 && (
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/50" title="Chưa học (Hạt giống mới)">
                                  <EyeOff size={14} className="text-slate-400 dark:text-slate-500" />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}

      <GateComponent />

      {/* Modal sao chép từ vựng / bài học */}
      <CopyWordsModal
        isOpen={copyModalState.isOpen}
        onClose={() => setCopyModalState(prev => ({ ...prev, isOpen: false }))}
        wordsToCopy={copyModalState.words}
        sourceLessonName={copyModalState.sourceLessonName}
        sourceCourseName={copyModalState.sourceCourseName}
        title={copyModalState.title}
        onSuccess={(courseTitle, lesson, count) => {
          showToast(`Đã sao chép thành công ${count} từ vào bộ từ "${courseTitle}" (${lesson})!`);
        }}
      />

      {/* Modal thêm / sửa từ vựng cho Custom Course */}
      <CustomWordModal
        isOpen={isWordModalOpen}
        onClose={() => { setIsWordModalOpen(false); setEditingWord(null); }}
        onSave={handleSaveWord}
        editingWord={editingWord}
        lessonName={selectedLesson || 'Bài 1'}
        template={course.template}
      />

      {/* Modal nhập hàng loạt từ vựng cho Custom Course */}
      <CustomBulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onImport={handleBulkImport}
        lessonName={selectedLesson || 'Bài 1'}
      />

      {/* Modal thêm / sửa tên bài học cho Custom Course */}
      <CustomLessonModal
        isOpen={lessonModalState.isOpen}
        onClose={() => setLessonModalState(prev => ({ ...prev, isOpen: false }))}
        onSave={handleSaveLesson}
        initialName={lessonModalState.initialName}
        isEditing={lessonModalState.isEditing}
      />

      {/* Modal sắp xếp thứ tự bài học cho Custom Course */}
      <ReorderLessonsModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        lessons={lessonGroups.map(g => g.lessonName)}
        onSave={handleSaveReorderedLessons}
      />

      {/* Toast thông báo kết quả */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs md:text-sm font-bold animate-in slide-in-from-bottom-5 duration-300 border border-slate-800 dark:border-slate-200">
          <CheckCircle2 size={18} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
