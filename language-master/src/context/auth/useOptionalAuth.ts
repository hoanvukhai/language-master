// src/context/auth/useOptionalAuth.ts
import { useContext } from "react";
import { AuthContext, type AuthContextType } from "./AuthContext";

/** Như useAuth nhưng trả null khi không có AuthProvider (test, trang nhúng). */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext);
}
