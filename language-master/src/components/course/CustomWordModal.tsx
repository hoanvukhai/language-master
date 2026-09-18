// src/components/course/CustomWordModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, Plus, Check, AlertCircle, HelpCircle } from 'lucide-react';
import type { CustomWord } from '../../lib/customCourses/customCourseService';

interface CustomWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wordData: Partial<CustomWord>) => Promise<void>;
  editingWord?: { id: string; title: string; sub?: string; meaning: string; example?: string } | null;
  lessonName: string;
  template?: string;
}

export default function CustomWordModal({
  isOpen,
  onClose,
  onSave,
  editingWord,
  lessonName,
  template = 'generic',
}: CustomWordModalProps) {
  const [term, setTerm] = useState('');
  const [reading, setReading] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingWord) {
      setTerm(editingWord.title || '');
      setReading(editingWord.sub || '');
      setMeaning(editingWord.meaning || '');
      setExample(editingWord.example || '');
      if (editingWord.example) setShowAdvanced(true);
    } else {
      setTerm('');
      setReading('');
      setMeaning('');
      setExample('');
      setShowAdvanced(false);
    }
    setError('');
  }, [editingWord, isOpen]);

  const handlePlayVoice = (text: string) => {
    if (!text.trim() || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.trim());
    const isJp = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
    const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
    u.lang = isJp ? 'ja-JP' : (isVi ? 'vi-VN' : 'en-US');
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!term.trim()) {
      setError('Vui lòng nhập Thuật ngữ / Khái niệm / Từ.');
      return;
    }
    if (!meaning.trim()) {
      setError('Vui lòng nhập Định nghĩa / Nghĩa của từ.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        id: editingWord?.id,
        kanji: term.trim(),
        hiragana: reading.trim(),
        meaning: meaning.trim(),
        exampleKanji: example.trim(),
        exampleMeaning: '',
        lesson: lessonName,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving custom word:', err);
      setError(err.message || 'Có lỗi xảy ra khi lưu từ vựng.');
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

  const isJapanese = template === 'japanese';
  const isEnglish = template === 'english';

  const modalContent = (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg flex flex-col my-auto overflow-hidden animate-scale-up"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              {editingWord ? 'Chỉnh Sửa Từ Vựng' : 'Thêm Từ Vựng Mới'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bài học: <strong className="text-indigo-600 dark:text-indigo-400">{lessonName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh] custom-scrollbar">

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Thuật ngữ / Từ vựng */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>{isJapanese ? 'Từ vựng / Hán tự *' : isEnglish ? 'Từ vựng tiếng Anh *' : 'Thuật ngữ / Khái niệm / Từ *'}</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={isJapanese ? 'VD: 勉強, 約束, 猫...' : isEnglish ? 'VD: Resilient, Serendipity...' : 'VD: API, Photosynthesis, ROI...'}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                autoFocus
              />
              {term.trim() && (
                <button
                  type="button"
                  onClick={() => handlePlayVoice(term)}
                  className="absolute right-2 text-indigo-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                  title="Nghe phát âm thử"
                >
                  <Volume2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Nghĩa / Định nghĩa */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Định nghĩa / Nghĩa tiếng Việt *
            </label>
            <input
              type="text"
              placeholder="VD: Học tập, Giao diện lập trình ứng dụng, Kiên cường..."
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Ví dụ minh họa mở rộng */}
          {!showAdvanced ? (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 pt-1"
            >
              <HelpCircle size={14} /> + Thêm câu ví dụ minh họa
            </button>
          ) : (
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Câu ví dụ minh họa (tùy chọn)
                </label>
                <button
                  type="button"
                  onClick={() => { setShowAdvanced(false); setExample(''); }}
                  className="text-[11px] text-slate-400 hover:text-red-500 font-medium"
                >
                  Ẩn
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="VD: React makes it easy to build user interfaces. (React giúp tạo giao diện dễ dàng hơn.)"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          )}

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
            {saving ? 'Đang lưu...' : editingWord ? (
              <>
                <Check size={15} />
                <span>Cập nhật</span>
              </>
            ) : (
              <>
                <Plus size={15} />
                <span>Thêm từ vựng</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
