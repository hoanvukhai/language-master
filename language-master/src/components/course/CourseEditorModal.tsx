// src/components/course/CourseEditorModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Globe, 
  Lock, 
  Check, 
  AlertCircle,
  BookOpen,
  Sparkles,
  Info
} from 'lucide-react';
import type { CustomCourseDoc, CreateCustomCourseInput } from '../../lib/customCourses/customCourseService';

interface CourseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateCustomCourseInput, courseId?: string) => Promise<void>;
  editingCourse?: CustomCourseDoc | null;
}

const COLOR_OPTIONS = [
  { id: 'indigo', bg: 'bg-indigo-500', hex: '#6366f1' },
  { id: 'emerald', bg: 'bg-emerald-500', hex: '#10b981' },
  { id: 'rose', bg: 'bg-rose-500', hex: '#f43f5e' },
  { id: 'amber', bg: 'bg-amber-500', hex: '#f59e0b' },
  { id: 'sky', bg: 'bg-sky-500', hex: '#0284c7' },
  { id: 'violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  { id: 'orange', bg: 'bg-orange-500', hex: '#f97316' },
];



export function CourseEditorModal({ isOpen, onClose, onSave, editingCourse }: CourseEditorModalProps) {
  // Course basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<'japanese' | 'english' | 'generic'>('generic');
  const [color, setColor] = useState('indigo');
  const [isPublished, setIsPublished] = useState(false);

  // Saving & error states
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Load editing course data or reset
  useEffect(() => {
    if (editingCourse) {
      setTitle(editingCourse.title || '');
      setDescription(editingCourse.description || '');
      setTemplate(editingCourse.template || 'generic');
      setColor(editingCourse.color || 'indigo');
      setIsPublished(Boolean(editingCourse.isPublished));
    } else {
      setTitle('');
      setDescription('');
      setTemplate('generic');
      setColor('indigo');
      setIsPublished(false);
    }
    setFormError('');
  }, [editingCourse, isOpen]);

  // Submit course metadata
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      setFormError('Vui lòng nhập tên cho bộ từ vựng.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        template,
        color,
        isPublished,
        lessons: editingCourse?.lessons && editingCourse.lessons.length > 0 ? editingCourse.lessons : ['Bài 1'],
        words: editingCourse?.words || [],
      }, editingCourse ? editingCourse.id : undefined);
      onClose();
    } catch (err: any) {
      console.error('Error saving custom course:', err);
      setFormError(err.message || 'Có lỗi xảy ra khi lưu bộ từ vựng.');
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

  if (!isOpen) return null;

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg flex flex-col my-auto overflow-hidden animate-scale-up"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                {editingCourse ? 'Chỉnh Sửa Bộ Từ Vựng' : 'Tạo Bộ Từ Vựng Mới'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingCourse ? 'Cập nhật thông tin và cài đặt hiển thị' : 'Khởi tạo bộ thẻ để bắt đầu thêm bài học & từ vựng'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">

          {/* Error banner */}
          {formError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Tên bộ từ */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
              Tên bộ thẻ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: 50 Thuật ngữ IT, Giao tiếp hàng ngày, Khái niệm Marketing..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              autoFocus
            />
          </div>


          {/* Màu sắc chủ đạo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Màu sắc chủ đạo
            </label>
            <div className="flex items-center gap-2.5 pt-1 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-8 h-8 rounded-xl ${c.bg} transition-all flex items-center justify-center ${
                    color === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {color === c.id && <Check size={15} className="text-white font-bold" />}
                </button>
              ))}
            </div>
          </div>

          {/* Mô tả tùy chọn */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Mô tả ngắn gọn (tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Mô tả tóm tắt mục tiêu hoặc nội dung của bộ thẻ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Công khai / Khám phá Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isPublished ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
              }`}>
                {isPublished ? <Globe size={18} /> : <Lock size={18} />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                  Xuất bản lên Khám phá (Công khai)
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isPublished
                    ? 'Hiển thị ở mục Khám phá để cộng đồng cùng học.'
                    : 'Chỉ riêng bạn nhìn thấy và học bộ thẻ này.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${
                isPublished ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  isPublished ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Gợi ý quy trình */}
          {!editingCourse && (
            <div className="flex items-start gap-2.5 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs">
              <Info size={16} className="shrink-0 mt-0.5 text-indigo-500" />
              <span>
                Sau khi tạo, bạn sẽ được đưa vào trang chi tiết khóa học để thoải mái tạo bài học, thêm từng từ vựng hoặc dán danh sách hàng loạt.
              </span>
            </div>
          )}

        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              'Đang lưu...'
            ) : editingCourse ? (
              'Lưu thay đổi'
            ) : (
              <>
                <Sparkles size={15} />
                <span>Tạo bộ từ ngay</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
