// src/components/course/CourseEditorModal.tsx
import { useState, useEffect } from 'react';
import { 
  X, 
  Volume2, 
  Plus, 
  Trash2, 
  FileText, 
  ListPlus, 
  Globe, 
  Lock, 
  Check, 
  AlertCircle,
  HelpCircle,
  BookOpen,
  FolderPlus,
  Edit2
} from 'lucide-react';
import type { CustomWord, CustomCourseDoc, CreateCustomCourseInput } from '../../lib/customCourses/customCourseService';

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
  // Course info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<'japanese' | 'english' | 'generic'>('generic');
  const [color, setColor] = useState('indigo');
  const [isPublished, setIsPublished] = useState(false);

  // Lesson management
  const [lessons, setLessons] = useState<string[]>(['Bài 1']);
  const [selectedLesson, setSelectedLesson] = useState<string>('Bài 1');
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [editingLessonIdx, setEditingLessonIdx] = useState<number | null>(null);
  const [editingLessonName, setEditingLessonName] = useState('');

  // Filter in words list
  const [filterLesson, setFilterLesson] = useState<string>('all');

  // Words list
  const [words, setWords] = useState<CustomWord[]>([]);

  // Tab mode for word entry: 'single' | 'bulk'
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');

  // Single word form inputs
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);

  // Bulk import text
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');

  // Saving state
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
      
      const loadedWords = editingCourse.words || [];
      setWords(loadedWords);

      // Lấy danh sách lessons
      const initialLessons = Array.isArray(editingCourse.lessons) && editingCourse.lessons.length > 0
        ? Array.from(new Set(editingCourse.lessons))
        : Array.from(new Set(loadedWords.map(w => w.lesson || 'Bài 1')));
      
      const safeLessons = initialLessons.length > 0 ? initialLessons : ['Bài 1'];
      setLessons(safeLessons);
      setSelectedLesson(safeLessons[0] || 'Bài 1');
      setFilterLesson('all');
    } else {
      setTitle('');
      setDescription('');
      setTemplate('generic');
      setColor('indigo');
      setIsPublished(false);
      setLessons(['Bài 1']);
      setSelectedLesson('Bài 1');
      setFilterLesson('all');
      setWords([]);
    }
    setTerm('');
    setMeaning('');
    setExample('');
    setBulkText('');
    setBulkError('');
    setFormError('');
    setIsAddingLesson(false);
    setEditingLessonIdx(null);
    setEditingWordId(null);
  }, [editingCourse, isOpen]);

  // Test Speech Synthesis (Tự động nhận diện ngôn ngữ thông minh)
  const handlePlayVoice = (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(textToSpeak.trim());
    const isJp = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(textToSpeak);
    const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(textToSpeak);
    u.lang = isJp ? 'ja-JP' : (isVi ? 'vi-VN' : 'en-US');
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  // Add a new custom lesson
  const handleCreateLesson = () => {
    const name = newLessonName.trim();
    if (!name) return;
    if (lessons.includes(name)) {
      setSelectedLesson(name);
      setIsAddingLesson(false);
      setNewLessonName('');
      return;
    }
    const updated = [...lessons, name];
    setLessons(updated);
    setSelectedLesson(name);
    setNewLessonName('');
    setIsAddingLesson(false);
  };

  // Rename a lesson
  const handleSaveRenameLesson = (idx: number) => {
    const oldName = lessons[idx];
    const newName = editingLessonName.trim();
    if (!newName || newName === oldName) {
      setEditingLessonIdx(null);
      return;
    }

    const updated = [...lessons];
    updated[idx] = newName;
    setLessons(updated);

    if (selectedLesson === oldName) {
      setSelectedLesson(newName);
    }
    if (filterLesson === oldName) {
      setFilterLesson(newName);
    }

    // Cập nhật tất cả từ thuộc bài cũ sang tên bài mới
    setWords(prev => prev.map(w => w.lesson === oldName ? { ...w, lesson: newName } : w));
    setEditingLessonIdx(null);
    setEditingLessonName('');
  };

  // Delete a lesson
  const handleDeleteLesson = (lessonToDelete: string) => {
    if (lessons.length <= 1) {
      alert('Phải có ít nhất 1 bài học trong bộ từ.');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa bài "${lessonToDelete}"? Các từ vựng thuộc bài này sẽ được chuyển sang bài đầu tiên.`)) {
      return;
    }
    const remaining = lessons.filter(l => l !== lessonToDelete);
    const fallbackLesson = remaining[0];
    setLessons(remaining);
    if (selectedLesson === lessonToDelete) setSelectedLesson(fallbackLesson);
    if (filterLesson === lessonToDelete) setFilterLesson('all');

    setWords(prev => prev.map(w => w.lesson === lessonToDelete ? { ...w, lesson: fallbackLesson } : w));
  };

  // Start editing an existing word
  const handleStartEditWord = (w: CustomWord) => {
    setEditingWordId(w.id);
    setTerm(w.kanji || '');
    setMeaning(w.meaning || '');
    setExample(w.exampleKanji || '');
    if (w.lesson && lessons.includes(w.lesson)) {
      setSelectedLesson(w.lesson);
    }
    if (w.exampleKanji) {
      setShowAdvancedFields(true);
    }
    setEntryMode('single');
    setFormError('');
  };

  // Cancel editing
  const handleCancelEditWord = () => {
    setEditingWordId(null);
    setTerm('');
    setMeaning('');
    setExample('');
    setFormError('');
  };

  // Add or Update single word
  const handleAddSingleWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!term.trim()) {
      setFormError('Vui lòng nhập Thuật ngữ / Khái niệm / Từ');
      return;
    }
    if (!meaning.trim()) {
      setFormError('Vui lòng nhập Định nghĩa / Ý nghĩa');
      return;
    }

    const currentTargetLesson = selectedLesson || lessons[0] || 'Bài 1';

    if (editingWordId) {
      setWords(prev => prev.map(w => w.id === editingWordId ? {
        ...w,
        kanji: term.trim(),
        hiragana: '',
        meaning: meaning.trim(),
        exampleKanji: example.trim(),
        exampleMeaning: '',
        lesson: currentTargetLesson,
      } : w));
      handleCancelEditWord();
      return;
    }

    const newWord: CustomWord = {
      id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      kanji: term.trim(),
      hiragana: '',
      meaning: meaning.trim(),
      exampleKanji: example.trim(),
      exampleMeaning: '',
      lesson: currentTargetLesson,
    };

    setWords(prev => [...prev, newWord]);
    // Reset form
    setTerm('');
    setMeaning('');
    setExample('');
    setFormError('');
  };

  // Remove word from list safely by ID
  const handleRemoveWord = (wordId: string) => {
    setWords(prev => prev.filter(w => w.id !== wordId));
    if (editingWordId === wordId) {
      handleCancelEditWord();
    }
  };

  // Bulk import parser
  const handleParseBulk = () => {
    setBulkError('');
    if (!bulkText.trim()) {
      setBulkError('Vui lòng dán danh sách từ vào ô bên dưới.');
      return;
    }

    const lines = bulkText.split('\n');
    const parsed: CustomWord[] = [];
    let currentParsedLesson = selectedLesson || lessons[0] || 'Bài 1';
    const detectedLessons = new Set<string>(lessons);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Nhận diện header bài học: bắt đầu bằng # (vd: # Bài 1: Chào hỏi) hoặc [Bài 1]
      if (line.startsWith('#') || (line.startsWith('[') && line.endsWith(']'))) {
        const headerName = line.replace(/^[#\s]+/, '').replace(/^\[/, '').replace(/\]$/, '').trim();
        if (headerName) {
          currentParsedLesson = headerName;
          detectedLessons.add(headerName);
          continue;
        }
      }

      // Hỗ trợ dấu ngăn cách: |, Tab, dấu phẩy, dấu gạch ngang (-)
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
        const firstSpaceIdx = line.indexOf(' ');
        if (firstSpaceIdx !== -1) {
          parts = [line.substring(0, firstSpaceIdx).trim(), line.substring(firstSpaceIdx + 1).trim()];
        } else {
          parts = [line];
        }
      }

      if (parts.length >= 2) {
        const wTerm = parts[0];
        const wMeaning = parts[1];
        const wEx = parts.length >= 3 ? parts[2] : '';

        parsed.push({
          id: `w_bulk_${Date.now()}_${i}`,
          kanji: wTerm,
          hiragana: '',
          meaning: wMeaning,
          exampleKanji: wEx,
          exampleMeaning: '',
          lesson: currentParsedLesson,
        });
      }
    }

    if (parsed.length === 0) {
      setBulkError('Không tìm thấy dòng từ vựng hợp lệ. Hãy kiểm tra lại định dạng (vd: Từ | Nghĩa).');
      return;
    }

    setLessons(Array.from(detectedLessons));
    setWords(prev => [...prev, ...parsed]);
    setBulkText('');
    setEntryMode('single');
    if (parsed.length > 0 && parsed[0].lesson) {
      setSelectedLesson(parsed[0].lesson);
    }
  };

  // Filtered words
  const displayedWords = filterLesson === 'all' 
    ? words 
    : words.filter(w => (w.lesson || 'Bài 1') === filterLesson);

  // Submit complete course
  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError('Vui lòng đặt tên cho bộ từ vựng.');
      return;
    }

    if (words.length === 0) {
      setFormError('Vui lòng thêm ít nhất 1 từ vựng vào bộ thẻ.');
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
        lessons: lessons.length > 0 ? lessons : ['Bài 1'],
        words,
      }, editingCourse ? editingCourse.id : undefined);
      onClose();
    } catch (err: any) {
      console.error('Error saving custom course:', err);
      setFormError(err.message || 'Có lỗi xảy ra khi lưu bộ từ vựng.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
                {editingCourse ? 'Chỉnh Sửa Bộ Từ Vựng' : 'Tạo Bộ Từ Vựng Cá Nhân'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự biên soạn bài học, thẻ từ và tích hợp trực tiếp vào lộ trình ôn tập SRS
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* Error banner */}
          {formError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Course Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Tên bộ từ */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Tên bộ thẻ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: 50 Thuật ngữ IT, Từ vựng giao tiếp, Khái niệm Marketing..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Màu sắc thẻ */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Màu sắc chủ đạo
                </label>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-7 h-7 rounded-xl ${c.bg} transition-all flex items-center justify-center ${
                        color === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {color === c.id && <Check size={14} className="text-white font-bold" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mô tả tùy chọn */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả tóm tắt nội dung của bộ thẻ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* Public Publish Switch */}
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
                      ? 'Khóa học sẽ hiển thị ở mục Cộng đồng để mọi người có thể tìm và học.'
                      : 'Chỉ hiển thị trong tài khoản của bạn, người khác không thể xem.'}
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
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* QUẢN LÝ BÀI HỌC (CUSTOM LESSONS MANAGEMENT) */}
          <div className="space-y-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FolderPlus size={16} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Bài học / Chủ đề ({lessons.length} bài)
                </span>
              </div>
              {!isAddingLesson && (
                <button
                  type="button"
                  onClick={() => setIsAddingLesson(true)}
                  className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1"
                >
                  <Plus size={13} /> Thêm bài mới
                </button>
              )}
            </div>

            {/* Form thêm bài mới */}
            {isAddingLesson && (
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl border border-indigo-300 dark:border-indigo-700">
                <input
                  type="text"
                  placeholder="VD: Bài 1: Chào hỏi, Unit 2: Food & Drinks..."
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLesson(); } }}
                  className="flex-1 px-2.5 py-1 text-xs font-bold bg-transparent text-slate-800 dark:text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateLesson}
                  className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                >
                  Lưu bài
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingLesson(false); setNewLessonName(''); }}
                  className="p-1 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Hủy
                </button>
              </div>
            )}

            {/* Danh sách các bài & Đang chọn */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Đang thêm từ vào:</span>
              {lessons.map((les, idx) => {
                const isSelected = selectedLesson === les;
                const isEditing = editingLessonIdx === idx;

                if (isEditing) {
                  return (
                    <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-indigo-500">
                      <input
                        type="text"
                        value={editingLessonName}
                        onChange={(e) => setEditingLessonName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveRenameLesson(idx); } }}
                        className="text-xs font-bold bg-transparent text-slate-800 dark:text-white w-28 focus:outline-none"
                        autoFocus
                      />
                      <button type="button" onClick={() => handleSaveRenameLesson(idx)} className="text-emerald-500 text-xs font-bold">
                        ✓
                      </button>
                      <button type="button" onClick={() => setEditingLessonIdx(null)} className="text-slate-400 text-xs">
                        ✕
                      </button>
                    </div>
                  );
                }

                const wordCountInLesson = words.filter(w => (w.lesson || 'Bài 1') === les).length;

                return (
                  <div
                    key={idx}
                    className={`group/chip flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                    onClick={() => setSelectedLesson(les)}
                  >
                    <span>{les}</span>
                    <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                      {wordCountInLesson}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingLessonIdx(idx);
                        setEditingLessonName(les);
                      }}
                      className="opacity-0 group-hover/chip:opacity-100 hover:scale-110 transition-opacity p-0.5"
                      title="Đổi tên bài"
                    >
                      <Edit2 size={11} />
                    </button>
                    {lessons.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLesson(les);
                        }}
                        className="opacity-0 group-hover/chip:opacity-100 hover:text-red-300 p-0.5"
                        title="Xóa bài này"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabs for Word Entry Mode */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span>Nội dung từ vựng</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
                  {words.length} từ
                </span>
              </span>

              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEntryMode('single')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    entryMode === 'single'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <ListPlus size={14} />
                  Nhập từng từ
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('bulk')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    entryMode === 'bulk'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText size={14} />
                  Nhập hàng loạt (Copy/Paste)
                </button>
              </div>
            </div>

            {/* Mode 1: Single Word Entry Form */}
            {entryMode === 'single' ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1">
                  <span>
                    Đang thêm vào bài: <strong className="text-indigo-600 dark:text-indigo-400">{selectedLesson}</strong>
                  </span>
                </div>

                {/* Form Thuật ngữ & Định nghĩa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Thuật ngữ / Khái niệm / Từ *</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="VD: Photosynthesis, API, 勉強, Resilient..."
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSingleWord(); } }}
                        className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {term.trim() && (
                        <button
                          type="button"
                          onClick={() => handlePlayVoice(term)}
                          className="absolute right-2 text-indigo-500 hover:text-indigo-600 p-1 rounded-md transition-colors"
                          title="Bấm để nghe phát âm thử"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                      Định nghĩa / Ý nghĩa / Diễn giải *
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Giao diện lập trình ứng dụng, Quá trình quang hợp..."
                      value={meaning}
                      onChange={(e) => setMeaning(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSingleWord(); } }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Tùy chọn câu ví dụ mở rộng */}
                {!showAdvancedFields ? (
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFields(true)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <HelpCircle size={13} /> + Thêm câu ví dụ
                  </button>
                ) : (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                          Câu ví dụ minh họa
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdvancedFields(false);
                            setExample('');
                          }}
                          className="text-[10px] text-slate-400 hover:text-red-500 font-medium"
                        >
                          Ẩn
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="VD: Cây xanh quang hợp chuyển hóa năng lượng mặt trời..."
                        value={example}
                        onChange={(e) => setExample(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  {editingWordId && (
                    <button
                      type="button"
                      onClick={handleCancelEditWord}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAddSingleWord()}
                    className={`px-4 py-2 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                      editingWordId
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                    }`}
                  >
                    {editingWordId ? <Check size={15} /> : <Plus size={15} />}
                    {editingWordId ? 'Cập nhật thay đổi' : 'Thêm vào danh sách'}
                  </button>
                </div>
              </div>
            ) : (
              /* Mode 2: Bulk Import Form */
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Dán danh sách từ vựng (Hỗ trợ phân bài tự động)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Phân bài: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-500"># Tên bài</code> | Định dạng: <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">Thuật ngữ | Định nghĩa</code>
                  </span>
                </div>

                <textarea
                  rows={6}
                  placeholder={`Ví dụ phân chia theo bài:\n# Bài 1: Thuật ngữ cơ bản\nAPI | Giao diện lập trình ứng dụng\nPhotosynthesis | Quá trình quang hợp ở thực vật\nROI | Tỷ suất hoàn vốn đầu tư\n\n# Bài 2: Mở rộng\nDatabase | Cơ sở dữ liệu`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {bulkError && (
                  <p className="text-xs text-red-500 font-semibold">{bulkError}</p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleParseBulk}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                  >
                    <Plus size={15} /> Phân tích & Nạp vào danh sách
                  </button>
                </div>
              </div>
            )}

            {/* List of Added Words with Lesson Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Danh sách từ hiện tại ({words.length})
                </div>

                {/* Filter by lesson */}
                {lessons.length > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-medium">Lọc:</span>
                    <select
                      value={filterLesson}
                      onChange={(e) => setFilterLesson(e.target.value)}
                      className="text-xs bg-slate-100 dark:bg-slate-700 border-none rounded-lg px-2 py-1 font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="all">Tất cả bài ({words.length})</option>
                      {lessons.map(l => (
                        <option key={l} value={l}>
                          {l} ({words.filter(w => (w.lesson || 'Bài 1') === l).length})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {words.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 text-xs">
                  Chưa có từ nào trong bộ thẻ. Hãy nhập từ ở trên hoặc dán danh sách hàng loạt.
                </div>
              ) : displayedWords.length === 0 ? (
                <div className="p-4 text-center border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
                  Không có từ nào trong bài này.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {displayedWords.map((w, idx) => (
                    <div
                      key={w.id || idx}
                      className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs group hover:border-indigo-400 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-5 text-center text-[10px] font-bold text-slate-400 shrink-0">
                          {idx + 1}
                        </span>

                        <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded shrink-0">
                          {w.lesson || 'Bài 1'}
                        </span>

                        <div className="truncate">
                          <span className="font-bold text-slate-800 dark:text-white">
                            {w.kanji}
                          </span>
                          {w.hiragana && (
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              ({w.hiragana})
                            </span>
                          )}
                          <span className="text-slate-600 dark:text-slate-300 ml-2">
                            — {w.meaning}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePlayVoice(w.kanji)}
                          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Nghe phát âm"
                        >
                          <Volume2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditWord(w)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Sửa từ này"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveWord(w.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Xóa từ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tổng cộng: <strong className="text-slate-800 dark:text-white">{words.length}</strong> từ vựng ({lessons.length} bài)
          </div>

          <div className="flex items-center gap-2.5">
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
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Đang lưu...' : editingCourse ? 'Cập nhật bộ từ' : 'Tạo bộ từ ngay'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
