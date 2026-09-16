// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/global/SettingsProvider';
import { FlashcardSettingsProvider } from './context/features/flashcard/FlashcardSettingsProvider';
import { AuthProvider } from './context/auth/AuthProvider';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import { TimeTracker } from './components/shared/TimeTracker';
import { FloatingStudyTimer } from './components/shared/FloatingStudyTimer';

import Dictionary from './pages/Dictionary';

import Settings from './pages/Settings';
import LoginScreen from './components/auth/LoginScreen';

// Legacy imports removed

// Courses Hub
import MyCourses from './pages/Course/MyCourses';
import Explore from './pages/Course/Explore';
import CourseHub from './pages/Course/CourseHub';
import StudyRoadmap from './pages/StudyRoadmap';
import Profile from './pages/Profile/Profile';

// Learn (SRS)
import LearnSession from './pages/Learn/LearnSession';

import OfflineGuard from './components/shared/OfflineGuard';
import { AudioProvider } from './context/audio/useAudio';

export default function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <SettingsProvider>
          <FlashcardSettingsProvider>
            <BrowserRouter>
              <ScrollToTop />
              <TimeTracker />
              <FloatingStudyTimer />
          <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
            <Navbar />
            <main className="flex-1">
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
                <Route path="/course/:courseId/*" element={<CourseHub />} />

                {/* === STUDY HUB === */}
                <Route path="/study/roadmap" element={<StudyRoadmap />} />
                <Route path="/study/dictionary" element={<Dictionary />} />

                {/* === LEARN (SRS) === */}
                <Route
                  path="/learn/session"
                  element={
                    <OfflineGuard featureName="Phiên Học SRS">
                      <LearnSession />
                    </OfflineGuard>
                  }
                />

                {/* === LOGIN === */}
                <Route path="/login" element={<LoginScreen />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </FlashcardSettingsProvider>
    </SettingsProvider>
    </AudioProvider>
  </AuthProvider>
  );
}

