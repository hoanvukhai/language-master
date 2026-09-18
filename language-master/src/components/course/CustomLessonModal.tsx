// src/components/course/CustomLessonModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Check, AlertCircle } from 'lucide-react';

interface CustomLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lessonName: string) => Promise<void>;
  initialName?: string;
  isEditing?: boolean;
}

export default function CustomLessonModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  isEditing = false,
}: CustomLessonModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initialName);
    setError('');
  }, [initialName, isOpen]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên bài học.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(trimmed);
      setName('');
      onClose();
    } catch (err: any) {
      console.error('Error saving lesson:', err);
      setError(err.message || 'Có lỗi xảy ra khi lưu bài học.');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md flex flex-col my-auto overflow-hidden animate-scale-up"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                {isEditing ? 'Đổi Tên Bài Học' : 'Thêm Bài Học Mới'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phân chia chủ đề và bài học cho bộ từ vựng
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Tên bài học / Chủ đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Bài 2: Đời sống hàng ngày, Unit 3: Technology..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              autoFocus
            />
          </div>
        </form>

        {/* Footer */}
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
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Đang lưu...' : (
              <>
                <Check size={15} />
                <span>{isEditing ? 'Lưu thay đổi' : 'Tạo bài học'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
