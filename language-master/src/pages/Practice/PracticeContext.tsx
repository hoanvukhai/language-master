// src/pages/Practice/PracticeContext.tsx
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Course } from '../../data/courses/registry';

interface PracticeContextType {
  courseId: string;
  course: Course;
}

const PracticeContext = createContext<PracticeContextType | undefined>(undefined);

export function PracticeProvider({
  courseId,
  course,
  children,
}: {
  courseId: string;
  course: Course;
  children: ReactNode;
}) {
  return (
    <PracticeContext.Provider value={{ courseId, course }}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePracticeContext() {
  const context = useContext(PracticeContext);
  if (context === undefined) {
    throw new Error('usePracticeContext must be used within a PracticeProvider');
  }
  return context;
}
