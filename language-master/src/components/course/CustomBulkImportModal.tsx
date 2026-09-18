// src/components/course/CustomBulkImportModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Plus, AlertCircle } from 'lucide-react';
import type { CustomWord } from '../../lib/customCourses/customCourseService';

interface CustomBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (words: Partial<CustomWord>[]) => Promise<void>;
  lessonName: string;
}

export default function CustomBulkImportModal({
  isOpen,
  onClose,
  onImport,
  lessonName,
}: CustomBulkImportModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleParseAndImport = async () => {
    setError('');
    if (!text.trim()) {
      setError('Vui lòng dán danh sách từ vựng vào ô bên dưới.');
      return;
    }

    const lines = text.split('\n');
    const parsed: Partial<CustomWord>[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let parts: string[] = [];
      if (line.includes('|')) {
        parts = line.split('|').map(p => p.trim());
      } else if (line.includes('\t')) {
        parts = line.split('\t').map(p => p.trim());
      } else if (line.includes(' - ')) {
        parts = line.split(' - ').map(p => p.trim());
      } else if (line.includes(';')) {
        parts = line.split(';').map(p => p.trim());
      } else {
        const firstSpace = line.indexOf(' ');
        if (firstSpace !== -1) {
          parts = [line.substring(0, firstSpace).trim(), line.substring(firstSpace + 1).trim()];
        } else {
          parts = [line];
        }
      }

      if (parts.length >= 2) {
        const term = parts[0];
        const meaning = parts[1];
        const example = parts.length >= 3 ? parts[2] : '';

        parsed.push({
          kanji: term,
          hiragana: '',
          meaning: meaning,
          exampleKanji: example,
          exampleMeaning: '',
          lesson: lessonName,
        });
      }
    }

    if (parsed.length === 0) {
      setError('Không tìm thấy dòng từ vựng hợp lệ. Mỗi dòng cần có: Từ | Nghĩa.');
      return;
    }

    setSaving(true);
    try {
      await onImport(parsed);
      setText('');
      onClose();
    } catch (err: any) {
      console.error('Error in bulk import:', err);
      setError(err.message || 'Có lỗi xảy ra khi nạp từ vựng.');
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
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl flex flex-col my-auto overflow-hidden animate-scale-up"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                Nhập Hàng Loạt Từ Vựng (Copy/Paste)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhập vào bài: <strong className="text-indigo-600 dark:text-indigo-400">{lessonName}</strong>
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
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh] custom-scrollbar">

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300">Định dạng mỗi dòng:</span>
            <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
              Từ | Nghĩa | Ví dụ (tùy chọn)
            </span>
          </div>

          <textarea
            rows={8}
            placeholder={`Ví dụ:\nAPI | Giao diện lập trình ứng dụng | RESTful API rất phổ biến\nDatabase | Cơ sở dữ liệu\nAlgorithm | Thuật toán\nFramework | Bộ khung phát triển ứng dụng`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            autoFocus
          />

          <div className="text-[11px] text-slate-400 space-y-1">
            <p>💡 Hỗ trợ các dấu ngăn cách: Dấu gạch đứng (<code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">|</code>), dấu Tab, dấu gạch ngang (<code className="bg-slate-100 dark:bg-slate-700 px-1 rounded"> - </code>), hoặc dấu chấm phẩy (<code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">;</code>).</p>
          </div>

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
            onClick={handleParseAndImport}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Đang nạp...' : (
              <>
                <Plus size={15} />
                <span>Phân tích & Thêm vào bài</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
