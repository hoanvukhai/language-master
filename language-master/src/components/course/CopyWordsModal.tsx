// src/components/course/CopyWordsModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  FolderPlus, 
  Plus, 
  Search, 
  Check, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  Sparkles
} from 'lucide-react';
import { useCustomCourses } from '../../context/customCourses/useCustomCourses';
import { 
  copyWordsToCustomCourse, 
  createCustomCourse, 
  type CustomCourseDoc 
} from '../../lib/customCourses/customCourseService';
import { useAuth } from '../../context/auth/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wordsToCopy: any[];
  sourceLessonName?: string;
  sourceCourseName?: string;
  title?: string;
  onSuccess?: (targetCourseTitle: string, targetLesson: string, count: number) => void;
}

export function CopyWordsModal({
  isOpen,
  onClose,
  wordsToCopy,
  sourceLessonName,
  sourceCourseName,
  title,
  onSuccess,
}: Props) {
  const { user, userProfile } = useAuth();
  const { customCourses = [], myCourses: hookCourses } = useCustomCourses();
  const myCourses = (hookCourses || customCourses || []) as CustomCourseDoc[];

  // Form states
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<string>('Bài 1');
  const [isCreatingNewLesson, setIsCreatingNewLesson] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');

  // Quick create new course
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseTemplate, setNewCourseTemplate] = useState<'japanese' | 'english' | 'generic'>('generic');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selection
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSaving(false);
      setCourseSearch('');
      setIsCreatingNewLesson(false);
      setNewLessonName(sourceLessonName || '');

      if (myCourses.length > 0) {
        setIsCreatingNewCourse(false);
        const firstCourse = myCourses[0];
        setSelectedCourseId(firstCourse.id);
        const defaultLesson = sourceLessonName || (firstCourse.lessons && firstCourse.lessons[0]) || 'Bài 1';
        setSelectedLesson(defaultLesson);
      } else {
        // Chưa có bộ từ nào -> mở form tạo mới
        setIsCreatingNewCourse(true);
        setNewCourseTitle(sourceCourseName ? `[Bản sao] ${sourceCourseName}` : 'Bộ từ của tôi');
      }
    }
  }, [isOpen, myCourses.length, sourceLessonName, sourceCourseName]);

  const activeCourse = useMemo(() => {
    return myCourses.find(c => c.id === selectedCourseId);
  }, [myCourses, selectedCourseId]);

  // Lọc bộ từ theo ô tìm kiếm
  const filteredCourses = useMemo(() => {
    if (!courseSearch.trim()) return myCourses;
    const q = courseSearch.trim().toLowerCase();
    return myCourses.filter(c => c.title.toLowerCase().includes(q));
  }, [myCourses, courseSearch]);

  // Kiểm tra từ trùng lặp trong bộ từ đích
  const duplicateCount = useMemo(() => {
    if (!activeCourse || !activeCourse.words || wordsToCopy.length === 0) return 0;
    const existingTerms = new Set(
      activeCourse.words.map(w => (w.kanji || '').trim().toLowerCase())
    );
    return wordsToCopy.filter(w => {
      const term = String(w.kanji || w.word || w.character || w.structure || w.term || '').trim().toLowerCase();
      return term && existingTerms.has(term);
    }).length;
  }, [activeCourse, wordsToCopy]);

  if (!isOpen) return null;

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
    const target = myCourses.find(c => c.id === courseId);
    if (target && target.lessons && target.lessons.length > 0) {
      setSelectedLesson(sourceLessonName && target.lessons.includes(sourceLessonName) ? sourceLessonName : target.lessons[0]);
    } else {
      setSelectedLesson('Bài 1');
    }
  };

  const handleSubmit = async () => {
    if (wordsToCopy.length === 0) {
      setError('Không có từ vựng nào được chọn để sao chép.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let targetId = selectedCourseId;
      let targetCourseNameResult = activeCourse?.title || 'Bộ từ của bạn';
      let targetLessonResult = isCreatingNewLesson ? newLessonName.trim() || 'Bài 1' : selectedLesson;

      // TH1: Tạo nhanh bộ từ mới
      if (isCreatingNewCourse || myCourses.length === 0) {
        if (!newCourseTitle.trim()) {
          setError('Vui lòng nhập tên bộ từ mới.');
          setSaving(false);
          return;
        }

        // Mặc định tên bài là "Bài 1" (hoặc tên bài nguồn nếu có)
        const initialLesson = (isCreatingNewLesson && newLessonName.trim()) 
          ? newLessonName.trim() 
          : (sourceLessonName || 'Bài 1');

        const created = await createCustomCourse(user?.uid, userProfile || user, {
          title: newCourseTitle.trim(),
          description: sourceCourseName ? `Sao chép từ: ${sourceCourseName}` : 'Bộ từ được sao chép cá nhân',
          template: newCourseTemplate,
          color: 'indigo',
          lessons: [initialLesson],
          words: [],
        });

        targetId = created.id;
        targetCourseNameResult = created.title;
        targetLessonResult = initialLesson;
      }

      // TH2: Sao chép từ vựng vào bộ từ
      const result = await copyWordsToCustomCourse(
        targetId,
        user?.uid,
        wordsToCopy,
        targetLessonResult
      );

      if (onSuccess) {
        onSuccess(targetCourseNameResult, targetLessonResult, result.addedCount);
      }

      onClose();
    } catch (err: any) {
      console.error('Error copying words to course:', err);
      setError(err?.message || 'Không thể sao chép từ vựng. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
      >
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">
                {title || `Sao chép ${wordsToCopy.length} từ vào bộ thẻ cá nhân`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự do chỉnh sửa và ôn luyện SRS độc lập
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Summary Box */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500 shrink-0" />
              <span>
                Đang chuẩn bị sao chép <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{wordsToCopy.length}</strong> từ vựng
                {sourceCourseName ? ` từ "${sourceCourseName}"` : ''}
              </span>
            </div>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md">
              Level 0 mới
            </span>
          </div>

          {/* Warning banner nếu có lỗi */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border border-red-200 dark:border-red-800/40">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning banner nếu trùng từ */}
          {!isCreatingNewCourse && duplicateCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2 border border-amber-200 dark:border-amber-800/40">
              <AlertTriangle size={16} className="shrink-0 text-amber-500" />
              <span>
                Bộ từ này đã có <strong>{duplicateCount}</strong> từ trùng lặp (hệ thống vẫn sẽ sao chép thêm nếu bạn xác nhận).
              </span>
            </div>
          )}

          {/* CHẾ ĐỘ 1: Chọn bộ từ đã có */}
          {!isCreatingNewCourse && myCourses.length > 0 ? (
            <div className="space-y-4">
              
              {/* Chọn bộ từ với tìm kiếm */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chọn bộ từ cá nhân đích:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewCourse(true)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Tạo bộ từ mới
                  </button>
                </div>

                {/* Thanh tìm kiếm bộ từ nếu có > 3 bộ từ */}
                {myCourses.length > 3 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Tìm kiếm bộ từ của bạn..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-1 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                  {filteredCourses.length > 0 ? (
                    filteredCourses.map((c) => {
                      const isSelected = c.id === selectedCourseId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCourseSelect(c.id)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-bold shadow-sm'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium'
                          }`}
                        >
                          <span className="truncate pr-2">{c.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {c.words?.length || 0} từ
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-3 text-center text-xs text-slate-400">
                      Không tìm thấy bộ từ nào khớp.
                    </p>
                  )}
                </div>
              </div>

              {/* Chọn bài học đích */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chọn bài học đích:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewLesson(!isCreatingNewLesson)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isCreatingNewLesson ? 'Chọn bài có sẵn' : '+ Thêm bài mới'}
                  </button>
                </div>

                {isCreatingNewLesson ? (
                  <input
                    type="text"
                    value={newLessonName}
                    onChange={(e) => setNewLessonName(e.target.value)}
                    placeholder="Nhập tên bài học (VD: Bài 2: Từ vựng mở rộng)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs md:text-sm focus:border-indigo-500 outline-none"
                    autoFocus
                  />
                ) : (
                  <select
                    value={selectedLesson}
                    onChange={(e) => setSelectedLesson(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs md:text-sm focus:border-indigo-500 outline-none font-medium"
                  >
                    {(activeCourse?.lessons && activeCourse.lessons.length > 0 ? activeCourse.lessons : ['Bài 1']).map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            /* CHẾ ĐỘ 2: Tạo nhanh bộ từ mới */
            <div className="space-y-3.5 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus size={14} className="text-indigo-500" /> Tạo bộ từ cá nhân mới
                </span>
                {myCourses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewCourse(false)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Quay lại chọn bộ từ có sẵn
                  </button>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Tên bộ từ:
                </label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="VD: Từ vựng yêu thích, Từ khó N3..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs md:text-sm focus:border-indigo-500 outline-none font-medium"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Ngôn ngữ:
                  </label>
                  <select
                    value={newCourseTemplate}
                    onChange={(e) => setNewCourseTemplate(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:border-indigo-500 outline-none"
                  >
                    <option value="japanese">Tiếng Nhật</option>
                    <option value="english">Tiếng Anh</option>
                    <option value="generic">Thuật ngữ tự do</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Bài học mặc định:
                  </label>
                  <input
                    type="text"
                    value={sourceLessonName || 'Bài 1'}
                    disabled
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-500 text-xs cursor-not-allowed font-mono"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors disabled:opacity-50"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || (!isCreatingNewCourse && !selectedCourseId)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Đang sao chép...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Sao chép ngay</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

export default CopyWordsModal;
