// src/pages/Dictionary.tsx
import { useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getCourseById } from '../data/courses/registry';
import { ArrowLeft, BookOpen } from 'lucide-react';

import VocabDictionary from '../components/dictionary/VocabDictionary';
import GrammarDictionary from '../components/dictionary/GrammarDictionary';
import KanjiSingleDictionary from '../components/dictionary/KanjiSingleDictionary';
import KanjiWordsDictionary from '../components/dictionary/KanjiWordsDictionary';
import KeigoDictionary from '../components/dictionary/KeigoDictionary';
import ConjugationDictionary from '../components/dictionary/ConjugationDictionary';

export default function Dictionary() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const navigate = useNavigate();
  const location = useLocation();

  const course = useMemo(() => {
    if (!courseId) return null;
    return getCourseById(courseId);
  }, [courseId]);

  if (!courseId || !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
         <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
         <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">Không tìm thấy Từ điển</h2>
         <p className="text-slate-500 mt-2 text-center">Vui lòng truy cập từ điển thông qua một khóa học cụ thể.</p>
         <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">Về trang chủ</button>
      </div>
    );
  }

  const renderDictionary = () => {
    if (course.subject === 'vocab') return <VocabDictionary data={course.data} template={course.template} />;
    if (course.subject === 'grammar') return <GrammarDictionary data={course.data} />;
    if (course.subject === 'kanji_single') return <KanjiSingleDictionary data={course.data} />;
    if (course.subject === 'kanji_words') return <KanjiWordsDictionary data={course.data} />;
    
    if (course.subject === 'special') {
      if (course.id === 'keigo-master') return <KeigoDictionary data={course.data} />;
      if (course.id === 'verb-conjugation') return <ConjugationDictionary data={course.data} />;
    }

    // Empty state
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-3xl mt-8 border border-slate-200 dark:border-slate-700">
        <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Từ điển trống</h3>
        <p className="text-slate-500 mt-2">Khóa học này hiện không có dữ liệu từ điển.</p>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(`/course/${course.id}`, { state: { from: location.state?.from } })}
          className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="text-blue-500" /> Từ điển: {course.name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
            Tra cứu dữ liệu thuộc khóa học này.
          </p>
        </div>
      </div>

      {renderDictionary()}
    </div>
  );
}