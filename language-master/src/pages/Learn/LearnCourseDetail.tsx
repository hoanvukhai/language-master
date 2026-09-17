// src/pages/Learn/LearnCourseDetail.tsx
// Màn hình chi tiết khóa học — Grid Bài/Unit, Bảng danh sách từ & Chỉnh hàng loạt 'Đã thuộc'
// Hỗ trợ tất cả subject types: vocab, kanji_single, kanji_words, grammar
// [FIX] Dùng courseId từ route ancestor /course/:courseId thay vì sSubject string cũ

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/auth/useAuth';
import { ArrowLeft, BookOpen, RefreshCw, CheckCircle2, CheckSquare, Square, Plus, ChevronsUp, Droplet, EyeOff } from 'lucide-react';
import MasteryIcon from '../../components/srs/MasteryIcon';
import MasterySVG from '../../components/srs/MasterySVG';
import { fetchAllProgress, batchUpdateWordMasteredStatus } from '../../lib/srs/firestoreSync';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useMyCourses } from '../../context/global/useMyCourses';
import { useSettings } from '../../context/global/useSettings';
import { type WordProgress, type SRSSubject } from '../../lib/srs/srsTypes';
import { getCourseById } from '../../data/courses/registry';

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

  // [FIX-3] Lấy course object từ registry thay vì dùng biến undefined
  const course = getCourseById(courseId);

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

  // ── Build Lesson Groups ────────────────────────────────────────────────
  // [FIX-3 & FIX-5] Dùng course.data + course.subject thay vì switch-case theo sSubject
  const lessonGroups: LessonGroup[] = useMemo(() => {
    if (!course) return [];

    const rawList = buildFlatList(course.subject, course.data as any[], course.template);

    const groupMap = new Map<string, any[]>();
    rawList.forEach((item: any) => {
      const lessonName = item.lesson || 'Bài 1';
      if (!groupMap.has(lessonName)) groupMap.set(lessonName, []);
      groupMap.get(lessonName)!.push(item);
    });

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
        };
      });

      groups.push({ lessonName, total: items.length, learned: learnedCount, items: formattedItems });
    });

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
      setSelectedItemIds([]);
    } catch (e) {
      console.error('Batch update error:', e);
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
            <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {lessonGroups.map((group) => {
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
                className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 flex items-center justify-center p-1 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <MasterySVG level={avgLevel} className="w-full h-full" />
                  </div>
                  {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>

                <h3 className="font-extrabold text-base mb-1 text-slate-800 dark:text-white">{group.lessonName}</h3>
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
        </div>
      ) : (
        /* VIEW 2: DETAILED LESSON WORD TABLE & BATCH EDIT */
        activeGroup && (
          <div className="space-y-4">
            {/* Batch Action Toolbar */}
            {isAdded && (
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
                  <div className="flex items-center gap-2">
                    {eligibleForLv2Count > 0 && (
                      <button
                        onClick={() => handleBatchMark(true)}
                        disabled={updating}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20"
                      >
                        <ChevronsUp size={14} className="stroke-[3]" /><span>Lv.2</span>
                      </button>
                    )}
                    {eligibleForRestoreCount > 0 && (
                      <button
                        onClick={() => handleBatchMark(false)}
                        disabled={updating}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                      >
                        Khôi phục
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Word List Table */}
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
                        {isAdded && (
                          <>
                            {item.isDue && (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-900/30 border border-sky-200/60 dark:border-sky-800/50" title="Đến hạn ôn">
                                <Droplet size={14} className="text-sky-500 dark:text-sky-400 fill-current" />
                              </div>
                            )}
                            {item.timeLeftStr && <span className="flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"><Droplet size={12} className="fill-current opacity-70" /> {item.timeLeftStr}</span>}
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
          </div>
        )
      )}

      <GateComponent />
    </div>
  );
}
