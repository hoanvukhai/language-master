import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen, EyeOff, Eye, List, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../context/global/useSettings';
import LearningCard from '../../components/shared/LearningCard';
import { useCourseData } from '../../hooks/useCourseData';

export default function CourseTheory() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useSettings();
  
  const [showToc, setShowToc] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);

  // Use our new polymorphic data hook
  const { course, rawDataset } = useCourseData(courseId);

  // Extract lessons list
  const lessons = useMemo(() => {
    return Array.from(new Set(rawDataset.map((k: any) => k.lesson || 'Bài 1'))).filter(Boolean) as string[];
  }, [rawDataset]);

  const [selectedLesson, setSelectedLesson] = useState(lessons[0] || '');

  // Reset selected lesson if dataset changes
  useEffect(() => {
    if (lessons.length > 0 && !lessons.includes(selectedLesson)) {
      setSelectedLesson(lessons[0]);
    }
  }, [lessons, selectedLesson]);

  // Filter items by lesson
  const filteredData = useMemo(() => {
    if (!selectedLesson) return [];
    return rawDataset.filter((item: any) => (item.lesson || 'Bài 1') === selectedLesson);
  }, [rawDataset, selectedLesson]);

  if (!course || rawDataset.length === 0) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="text-4xl">📚</div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Dữ liệu đang cập nhật</h2>
          <button onClick={() => navigate(courseId ? `/course/${courseId}` : '/')} className="text-blue-500 font-medium">
            Quay lại Khóa học
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 font-sans pb-24 max-w-6xl mx-auto relative">
      
      {/* HEADER (Dictionary Style) */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(courseId ? `/course/${courseId}` : '/', { state: { from: location.state?.from } })}
          className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700 self-start"
          title={language === 'en' ? 'Back to Course' : 'Về khóa học'}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="text-blue-500" /> Sách {course.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
              {course.description}
            </p>
          </div>
          
          {/* Furigana Toggle (Only show if template is japanese) */}
          {course.template === 'japanese' && (
            <button
              onClick={() => setShowFurigana(v => !v)}
              title={showFurigana ? 'Tắt Furigana' : 'Bật Furigana'}
              className={`flex-shrink-0 self-start md:self-auto flex items-center justify-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border font-bold text-xs md:text-sm transition-all ${
                showFurigana
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-300'
              }`}
            >
              {showFurigana ? <Eye size={16} /> : <EyeOff size={16} />}
              <span className="hidden sm:inline">Furigana</span>
            </button>
          )}
        </div>
      </div>

      {/* Chapter Title */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white border-l-4 border-blue-500 pl-3">
          {selectedLesson}
        </h2>
        <span className="text-sm font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
          {filteredData.length} mục
        </span>
      </div>

      {/* Polymorphic List */}
      <div className="flex flex-col gap-2.5">
        {filteredData.map((item, index) => (
          <LearningCard 
            key={item.id} 
            item={item} 
            language={language} 
            index={index + 1} 
            showFurigana={showFurigana} 
          />
        ))}
        {filteredData.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            Không có dữ liệu cho bài học này.
          </div>
        )}
      </div>

      {filteredData.length > 0 && (
        <div className="mt-8 text-center text-slate-400 text-sm font-medium">
          Hết {selectedLesson.split(':')[0]}. Nhấn vào nút Danh sách ở góc dưới để chuyển bài.
        </div>
      )}

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => setShowToc(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 p-4 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-40"
        title="Mục lục bài học"
      >
        <List size={26} />
      </button>

      {/* TOC MODAL */}
      <AnimatePresence>
        {showToc && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowToc(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <List className="text-blue-500" size={24} />
                  Mục lục ({lessons.length} bài)
                </h3>
                <button 
                  onClick={() => setShowToc(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Modal Body (Scrollable List) */}
              <div className="overflow-y-auto p-4 flex flex-col gap-2 bg-slate-50 dark:bg-slate-800">
                {lessons.map((lesson) => {
                  const itemsCount = rawDataset.filter((k: any) => (k.lesson || 'Bài 1') === lesson).length;
                  return (
                    <button
                      key={lesson}
                      onClick={() => {
                        setSelectedLesson(lesson);
                        setShowToc(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`text-left w-full px-4 py-4 rounded-2xl font-bold transition-all border flex items-center justify-between ${
                        selectedLesson === lesson
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      <span>{lesson}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${selectedLesson === lesson ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500'}`}>{itemsCount} mục</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
