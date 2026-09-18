// src/components/course/ReorderLessonsModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUp, ArrowDown, Check, GripVertical, ArrowUpDown } from 'lucide-react';

interface ReorderLessonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessons: string[];
  onSave: (newOrder: string[]) => Promise<void>;
}

export default function ReorderLessonsModal({
  isOpen,
  onClose,
  lessons: initialLessons,
  onSave,
}: ReorderLessonsModalProps) {
  const [lessons, setLessons] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLessons([...initialLessons]);
  }, [initialLessons, isOpen]);

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

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const updated = [...lessons];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setLessons(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(lessons);
      onClose();
    } catch (err) {
      console.error('Error saving lesson order:', err);
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
              <ArrowUpDown size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                Sắp Xếp Thứ Tự Bài Học
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhấn mũi tên để di chuyển vị trí hiển thị các bài học
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

        {/* List of lessons */}
        <div className="p-4 sm:p-6 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {lessons.map((lessonName, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === lessons.length - 1;

            return (
              <div
                key={`${lessonName}_${idx}`}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors">
                    <GripVertical size={18} />
                  </div>
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                    {lessonName}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={isFirst || saving}
                    onClick={() => moveItem(idx, 'up')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
                    title="Di chuyển lên trên"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={isLast || saving}
                    onClick={() => moveItem(idx, 'down')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
                    title="Di chuyển xuống dưới"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

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
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Đang lưu...' : (
              <>
                <Check size={16} />
                <span>Lưu thứ tự</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
