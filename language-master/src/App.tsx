import { lazy, Suspense } from "react";
// src/App.tsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SettingsProvider } from "./context/global/SettingsProvider";
import { FlashcardSettingsProvider } from "./context/features/flashcard/FlashcardSettingsProvider";
import { AuthProvider } from "./context/auth/AuthProvider";
import Navbar from "./components/Navbar";
import ScrollToTop from "./components/ScrollToTop";
import { TimeTracker } from "./components/shared/TimeTracker";
import { FloatingStudyTimer } from "./components/shared/FloatingStudyTimer";

import LoginScreen from "./components/auth/LoginScreen";

const Dictionary = lazy(() => import("./pages/Dictionary"));
const Settings = lazy(() => import("./pages/Settings"));

// Courses Hub
const MyCourses = lazy(() => import("./pages/Course/MyCourses"));
const Explore = lazy(() => import("./pages/Course/Explore"));
const CourseHub = lazy(() => import("./pages/Course/CourseHub"));
const StudyRoadmap = lazy(() => import("./pages/StudyRoadmap"));
const Profile = lazy(() => import("./pages/Profile/Profile"));

// Learn (SRS)
const LearnSession = lazy(() => import("./pages/Learn/LearnSession"));

// Exam Practice (Multi-Language)
const ExamWorkspace = lazy(() => import("./pages/Exam/ExamWorkspace"));
const ExamLanguageHub = lazy(() => import("./pages/Exam/ExamLanguageHub"));
const JLPTExamHub = lazy(() => import("./pages/Exam/JLPTExamHub"));
const DrillSession = lazy(() => import("./pages/Exam/sessions/DrillSession"));
const MockExamSession = lazy(
  () => import("./pages/Exam/sessions/MockExamSession"),
);
const FlashReviewSession = lazy(
  () => import("./pages/Exam/sessions/FlashReviewSession"),
);

import OfflineGuard from "./components/shared/OfflineGuard";
import { AudioProvider } from "./context/audio/useAudio";

function StudyTools() {
  return <FloatingStudyTimer />;
}

export default function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <SettingsProvider>
          <FlashcardSettingsProvider>
            <BrowserRouter>
              <ScrollToTop />
              <TimeTracker />
              <StudyTools />
              <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
                <Navbar />
                <main className="flex-1">
                  <Suspense
                    fallback={
                      <div className="p-8 text-center" role="status">
                        Đang tải bài học…
                      </div>
                    }
                  >
                    <Routes>
                      {/* === CORE === */}
                      <Route path="/" element={<MyCourses />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/dictionary" element={<Dictionary />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/profile"
                        element={
                          <OfflineGuard featureName="Hồ Sơ Cá Nhân">
                            <Profile />
                          </OfflineGuard>
                        }
                      />

                      {/* === COURSES === */}
                      <Route
                        path="/course/:courseId/*"
                        element={<CourseHub />}
                      />

                      {/* === STUDY HUB === */}
                      <Route path="/study/roadmap" element={<StudyRoadmap />} />
                      <Route
                        path="/study/dictionary"
                        element={<Dictionary />}
                      />

                      {/* === LEARN (SRS) === */}
                      <Route
                        path="/learn/session"
                        element={
                          <OfflineGuard featureName="Phiên Học SRS">
                            <LearnSession />
                          </OfflineGuard>
                        }
                      />

                      {/* === EXAM PRACTICE (MULTI-LANGUAGE & JLPT) === */}
                      <Route path="/exams" element={<ExamLanguageHub />} />
                      <Route path="/exams/jlpt" element={<JLPTExamHub />} />
                      <Route
                        path="/exams/jlpt/:examId"
                        element={<ExamWorkspace mode="detail" />}
                      />
                      <Route
                        path="/exams/jlpt/:examId/result"
                        element={<ExamWorkspace mode="result" />}
                      />
                      <Route
                        path="/exams/jlpt/:examId/drill"
                        element={<DrillSession />}
                      />
                      <Route
                        path="/exams/jlpt/:examId/mock"
                        element={<MockExamSession />}
                      />
                      <Route
                        path="/exams/jlpt/:examId/review"
                        element={<FlashReviewSession />}
                      />
                      <Route
                        path="/exams/:examId"
                        element={<Navigate to="/exams/jlpt" replace />}
                      />

                      {/* === PRACTICE FALLBACK REDIRECTS === */}
                      <Route
                        path="/practice/grammar/*"
                        element={
                          <Navigate
                            to="/course/n3-grammar-core/practice"
                            replace
                          />
                        }
                      />
                      <Route
                        path="/practice/keigo/*"
                        element={
                          <Navigate
                            to="/course/keigo-master/practice"
                            replace
                          />
                        }
                      />
                      <Route
                        path="/practice/conjugation/*"
                        element={
                          <Navigate
                            to="/course/verb-conjugation/practice"
                            replace
                          />
                        }
                      />

                      {/* === LOGIN === */}
                      <Route path="/login" element={<LoginScreen />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
            </BrowserRouter>
          </FlashcardSettingsProvider>
        </SettingsProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
