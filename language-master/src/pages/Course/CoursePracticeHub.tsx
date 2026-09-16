import { useParams, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { getCourseById } from '../../data/courses/registry';
import { Layers, CheckSquare, GitMerge, Keyboard, ShieldAlert, Zap, Edit3, ArrowLeft } from 'lucide-react';

// Import Practice components
import VocabFlashcard from '../Vocabulary/VocabFlashcard';
import VocabQuiz from '../Vocabulary/VocabQuiz';
import VocabMatching from '../Vocabulary/VocabMatching';
import VocabTyping from '../Vocabulary/VocabTyping';
import VocabErrorDetect from '../Vocabulary/VocabErrorDetect';
import VocabFullRun from '../Vocabulary/VocabFullRun';

import KanjiFlashcard from '../Kanji/KanjiFlashcard';
import KanjiQuiz from '../Kanji/KanjiQuiz';
import KanjiMatching from '../Kanji/KanjiMatching';
import KanjiTyping from '../Kanji/KanjiTyping';
import KanjiErrorDetect from '../Kanji/KanjiErrorDetect';
import KanjiFullRun from '../Kanji/KanjiFullRun';

import GrammarFlashcard from '../Grammar/GrammarFlashcard';
import GrammarQuiz from '../Grammar/GrammarQuiz';
import GrammarMatching from '../Grammar/GrammarMatching';
import GrammarFillBlank from '../Grammar/GrammarFillBlank';
import GrammarErrorDetect from '../Grammar/GrammarErrorDetect';
import GrammarFullRun from '../Grammar/GrammarFullRun';

import KeigoFlashcards from '../Practice/KeigoFlashcards';
import KeigoQuest from '../Practice/KeigoQuest';
import ConjugationGame from '../Practice/ConjugationGame';

export default function CoursePracticeHub() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const course = getCourseById(courseId || '');

  // Dashboard View (if not playing a game)
  const isDashboard = location.pathname.endsWith('/practice') || location.pathname.endsWith('/practice/');

  if (!course) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-500">Không tìm thấy khóa học!</h2>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-slate-200 rounded-xl">Quay lại</button>
      </div>
    );
  }

  // PRACTICE MODES
  const practiceModes = [
    {
      id: 'flashcard', name: 'Lật thẻ', path: 'flashcard', icon: Layers,
      desc: 'Học thẻ ghi nhớ', color: 'text-violet-500', bgLight: 'bg-violet-100 dark:bg-violet-900/30', border: 'hover:border-violet-500',
    },
    {
      id: 'quiz', name: 'Trắc nghiệm vui', path: 'quiz', icon: CheckSquare,
      desc: 'Luyện tập thảnh thơi', color: 'text-blue-500', bgLight: 'bg-blue-100 dark:bg-blue-900/30', border: 'hover:border-blue-500',
    },
    {
      id: 'matching', name: 'Nối từ', path: 'matching', icon: GitMerge,
      desc: 'Nối câu hỏi với đáp án', color: 'text-emerald-500', bgLight: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'hover:border-emerald-500',
    },
    {
      id: 'typing', name: 'Nhập liệu', path: 'typing', icon: Keyboard,
      desc: 'Luyện gõ đáp án', color: 'text-orange-500', bgLight: 'bg-orange-100 dark:bg-orange-900/30', border: 'hover:border-orange-500',
      hiddenFor: ['grammar']
    },
    {
      id: 'fillblank', name: 'Điền từ', path: 'fillblank', icon: Edit3,
      desc: 'Điền vào chỗ trống', color: 'text-orange-500', bgLight: 'bg-orange-100 dark:bg-orange-900/30', border: 'hover:border-orange-500',
      onlyFor: ['grammar']
    },
    {
      id: 'errordetect', name: 'Tìm lỗi sai', path: 'errordetect', icon: ShieldAlert,
      desc: 'Phát hiện lỗi', color: 'text-rose-500', bgLight: 'bg-rose-100 dark:bg-rose-900/30', border: 'hover:border-rose-500',
    },
    {
      id: 'fullrun', name: 'Toàn Diện', path: 'fullrun', icon: Zap,
      desc: 'Tất cả trong một', color: 'text-indigo-600', bgLight: 'bg-indigo-100 dark:bg-indigo-900/30', border: 'hover:border-indigo-500',
    }
  ];

  if (course.id === 'keigo-master') {
    practiceModes.length = 0;
    practiceModes.push(
      { id: 'keigo-flashcards', name: 'Lật Thẻ', path: 'flashcards', icon: Layers, desc: 'Ôn tập 2 mặt', color: 'text-blue-500', bgLight: 'bg-blue-100 dark:bg-blue-900/30', border: 'hover:border-blue-500' },
      { id: 'keigo-quest', name: 'Nhiệm vụ', path: 'quest', icon: CheckSquare, desc: 'Tình huống thực tế', color: 'text-rose-500', bgLight: 'bg-rose-100 dark:bg-rose-900/30', border: 'hover:border-rose-500' }
    );
  } else if (course.id === 'verb-conjugation') {
    practiceModes.length = 0;
    practiceModes.push(
      { id: 'conjugation-game', name: 'Mini-game', path: 'game', icon: Keyboard, desc: 'Luyện chia thể', color: 'text-blue-500', bgLight: 'bg-blue-100 dark:bg-blue-900/30', border: 'hover:border-blue-500' }
    );
  }

  const filteredPracticeModes = practiceModes.filter(m => {
    if (m.hiddenFor && m.hiddenFor.includes(course.subject)) return false;
    if (m.onlyFor && !m.onlyFor.includes(course.subject)) return false;
    return true;
  });

  return (
    <>
      {isDashboard ? (
        <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate(`/course/${course.id}`, { state: { from: location.state?.from } })}
              className="p-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Layers className="text-indigo-500 w-8 h-8" />
                Luyện Tập: {course.name}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
                Chọn chế độ để luyện tập tự do và nhuần nhuyễn kỹ năng.
              </p>
            </div>
          </div>
          
          <div className="space-y-10">
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPracticeModes.map(mod => (
                  <Link
                    key={mod.id}
                    to={mod.path}
                    className={`group flex flex-col h-full bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 ${mod.border} hover:shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all`}
                  >
                    <div className={`inline-flex p-3 rounded-xl ${mod.bgLight} ${mod.color} mb-3 w-fit group-hover:scale-110 transition-transform`}>
                      <mod.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{mod.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed flex-grow">{mod.desc}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <Routes>
          {course.subject === 'vocab' && (
            <>
              <Route path="flashcard" element={<VocabFlashcard />} />
              <Route path="quiz" element={<VocabQuiz />} />
              <Route path="matching" element={<VocabMatching />} />
              <Route path="typing" element={<VocabTyping />} />
              <Route path="errordetect" element={<VocabErrorDetect />} />
              <Route path="fullrun" element={<VocabFullRun />} />
            </>
          )}
          {(course.subject === 'kanji_single' || course.subject === 'kanji_words') && (
            <>
              <Route path="flashcard" element={<KanjiFlashcard />} />
              <Route path="quiz" element={<KanjiQuiz />} />
              <Route path="matching" element={<KanjiMatching />} />
              <Route path="typing" element={<KanjiTyping />} />
              <Route path="errordetect" element={<KanjiErrorDetect />} />
              <Route path="fullrun" element={<KanjiFullRun />} />
            </>
          )}
          {course.subject === 'grammar' && (
            <>
              <Route path="flashcard" element={<GrammarFlashcard />} />
              <Route path="quiz" element={<GrammarQuiz />} />
              <Route path="matching" element={<GrammarMatching />} />
              <Route path="fillblank" element={<GrammarFillBlank />} />
              <Route path="errordetect" element={<GrammarErrorDetect />} />
              <Route path="fullrun" element={<GrammarFullRun />} />
            </>
          )}
          {course.id === 'keigo-master' && (
            <>
              <Route path="flashcards" element={<KeigoFlashcards />} />
              <Route path="quest" element={<KeigoQuest />} />
            </>
          )}
          {course.id === 'verb-conjugation' && (
            <>
              <Route path="game" element={<ConjugationGame />} />
            </>
          )}
          <Route path="*" element={<Navigate to=".." />} />
        </Routes>
      )}
    </>
  );
}
