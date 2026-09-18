import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Plus, FolderPlus, BookmarkCheck, Check, AlertCircle, LogIn } from 'lucide-react';
import { useCustomCourses } from '../../context/customCourses/useCustomCourses';
import { addWordToCustomCourse, createCustomCourse } from '../../lib/customCourses/customCourseService';
import { useAuth } from '../../context/auth/useAuth';
import type { DictionaryEntry } from '../../lib/dictionary/localDictionaryIndex';
import type { CustomCourseDoc } from '../../lib/customCourses/customCourseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entry: DictionaryEntry | null;
  onSuccess?: (courseName: string) => void;
  courses?: CustomCourseDoc[];
}

export default function AddToDeckModal({ isOpen, onClose, entry, onSuccess, courses }: Props) {
  const { user } = useAuth();
  const { customCourses = [], myCourses: hookCourses } = useCustomCourses();
  const myCourses = (courses && courses.length > 0) ? courses : (hookCourses || customCourses || []);
  const navigate = useNavigate();

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [isCreatingNewLesson, setIsCreatingNewLesson] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');

  // Tạo nhanh bộ từ mới nếu chưa có
  const [isCreatingNewCourse, setIsCreatingNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('Từ vựng yêu thích');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Khởi tạo bộ từ được chọn
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
      setCourseSearch('');
      setIsCreatingNewLesson(false);
      setNewLessonName('');

      if (Array.isArray(myCourses) && myCourses.length > 0) {
        setIsCreatingNewCourse(false);
        const defaultCourse = myCourses[0];
        setSelectedCourseId(defaultCourse.id);
        setSelectedLesson((defaultCourse.lessons && defaultCourse.lessons[0]) || 'Bài 1');
      } else {
        setIsCreatingNewCourse(true);
      }
    }
  }, [isOpen, myCourses]);

  const activeCourse = (myCourses || []).find(c => c.id === selectedCourseId);

  const filteredCourses = (myCourses || []).filter(c => {
    if (!courseSearch.trim()) return true;
    return c.title.toLowerCase().includes(courseSearch.trim().toLowerCase());
  });

  const isDuplicate = Boolean(
    activeCourse?.words?.some(
      w => (w.kanji || '').trim().toLowerCase() === (entry?.term || '').trim().toLowerCase()
    )
  );

  // Khi đổi course, cập nhật lesson đầu tiên
  const handleCourseChange = (cId: string) => {
    setSelectedCourseId(cId);
    const target = (myCourses || []).find(c => c.id === cId);
    if (target && target.lessons && target.lessons.length > 0) {
      setSelectedLesson(target.lessons[0]);
    } else {
      setSelectedLesson('Bài 1');
    }
  };

  if (!isOpen || !entry) return null;

  const handleSave = async () => {
    if (!entry) return;
    if (!user) {
      setError('Vui lòng đăng nhập để lưu từ vựng vào bộ thẻ cá nhân của bạn.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let targetCourseId = selectedCourseId;
      let targetLessonName = isCreatingNewLesson ? newLessonName.trim() || 'Bài 1' : selectedLesson;

      // Nếu người dùng tạo nhanh bộ từ mới
      if (isCreatingNewCourse || myCourses.length === 0) {
        if (!newCourseTitle.trim()) {
          setError('Vui lòng nhập tên cho bộ từ mới.');
          setSaving(false);
          return;
        }

        const created = await createCustomCourse(user?.uid, user, {
          title: newCourseTitle.trim(),
          description: 'Bộ từ được tạo nhanh từ tra cứu Từ điển.',
          template: 'generic',
          color: 'indigo',
          lessons: ['Bài 1'],
          words: [],
        });
        targetCourseId = created.id;
        targetLessonName = 'Bài 1';
      }

      // Thêm từ vào bộ từ (Chỉ lấy Từ, Nghĩa, Reading; bỏ ví dụ để người dùng tự nhập)
      const wordToAdd = {
        kanji: entry.term,
        hiragana: entry.reading || '',
        meaning: entry.meaning,
        exampleKanji: '',
        exampleMeaning: '',
        lesson: targetLessonName,
      };

      await addWordToCustomCourse(targetCourseId, user?.uid, wordToAdd, targetLessonName);

      setSuccess(true);
      const courseName = isCreatingNewCourse ? newCourseTitle : (activeCourse?.title || 'Bộ từ của bạn');
      if (onSuccess) onSuccess(courseName);

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Error adding word to deck:', err);
      setError(err?.message || 'Không thể lưu từ vào bộ thẻ. Vui lòng thử lại.');
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
        className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
      >
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Thêm vào bộ từ của bạn</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lưu từ vựng để ôn luyện SRS độc lập</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Card preview of the word */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white">{entry.term}</span>
              {entry.reading && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">({entry.reading})</span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{entry.meaning}</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isCreatingNewCourse && isDuplicate && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2 border border-amber-200 dark:border-amber-800/40">
              <AlertCircle size={16} className="shrink-0 text-amber-500" />
              <span>Từ "{entry.term}" đã có trong bộ từ này (vẫn có thể lưu thêm).</span>
            </div>
          )}

          {/* Selection form */}
          {!isCreatingNewCourse && myCourses.length > 0 ? (
            <div className="space-y-3">
              {/* Chọn bộ từ */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chọn bộ từ vựng:</label>
                  <button 
                    type="button"
                    onClick={() => setIsCreatingNewCourse(true)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Tạo bộ từ mới
                  </button>
                </div>

                {myCourses.length > 3 && (
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Tìm bộ từ..."
                    className="w-full mb-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none focus:border-indigo-500"
                  />
                )}

                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:border-indigo-500 outline-none"
                >
                  {filteredCourses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.words?.length || 0} từ)
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn bài học */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chọn bài học:</label>
                  <button 
                    type="button"
                    onClick={() => setIsCreatingNewLesson(!isCreatingNewLesson)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isCreatingNewLesson ? 'Chọn bài có sẵn' : '+ Thêm bài mới'}
                  </button>
                </div>

                {isCreatingNewLesson ? (
                  <input
                    type="text"
                    placeholder="VD: Bài 3: Từ vựng mở rộng"
                    value={newLessonName}
                    onChange={(e) => setNewLessonName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:border-indigo-500 outline-none"
                  />
                ) : (
                  <select
                    value={selectedLesson}
                    onChange={(e) => setSelectedLesson(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:border-indigo-500 outline-none"
                  >
                    {(activeCourse?.lessons && activeCourse.lessons.length > 0 ? activeCourse.lessons : ['Bài 1']).map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            /* Form tạo nhanh bộ từ mới */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Tên bộ từ vựng mới:
                </label>
                <input
                  type="text"
                  placeholder="VD: Từ vựng giao tiếp, Tiếng Anh Nâng cao..."
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:border-indigo-500 outline-none font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Bài học đầu tiên sẽ được đặt mặc định là <strong>"Bài 1"</strong>.
              </p>
              {myCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCourse(false)}
                  className="text-xs text-slate-500 hover:text-indigo-600 underline font-medium"
                >
                  Quay lại chọn bộ từ có sẵn
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-sm font-semibold transition-colors"
          >
            Hủy
          </button>
          {!user ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/login');
              }}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 flex items-center gap-2"
            >
              <LogIn size={16} /> Đăng nhập để lưu
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || success}
              className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md ${
                success
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-95'
              }`}
            >
              {success ? (
                <>
                  <Check size={16} /> Đã lưu vào bộ từ!
                </>
              ) : saving ? (
                'Đang lưu...'
              ) : (
                <>
                  <BookmarkCheck size={16} /> Lưu từ ngay
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
