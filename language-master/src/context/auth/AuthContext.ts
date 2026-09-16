// src/context/auth/AuthContext.ts
import { createContext } from 'react';
import type { User } from 'firebase/auth';

export interface UserProfile {
  totalExp: number;
  currentStreak: number;
  level: number;
  nextLevelExp: number;
}

export interface AuthContextType {
  user: User | null;
  role: 'user' | 'admin';
  loading: boolean;
  userProfile: UserProfile | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
