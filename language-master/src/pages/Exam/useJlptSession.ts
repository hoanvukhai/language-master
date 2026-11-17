// Phiên trong tab + tài khoản: dùng thay cho useTabSession ở các trang Luyện đề.
// - Khách: bài trong tab lưu ở sessionStorage.
// - Đã đăng nhập: bài trong tab chỉ giữ trong RAM của trang; bài dở và lịch sử nằm trên Firebase.
// Bài của tài khoản khác (hoặc của lúc trước khi đăng xuất) không bao giờ hiện nhầm.
import { useLayoutEffect } from "react";
import { useOptionalAuth } from "../../context/auth/useOptionalAuth";
import {
  claimSession,
  purgeAccountLocalData,
  useTabSession,
} from "../../lib/jlpt/tabSession";

export function useJlptSession() {
  const auth = useOptionalAuth() as { user?: { uid?: string } | null; loading?: boolean } | null;
  const uid = auth?.user?.uid ?? null;
  const authLoading = Boolean(auth?.loading);
  const session = useTabSession();
  useLayoutEffect(() => {
    if (authLoading) return;
    claimSession(uid);
    // Đã đăng nhập thì dữ liệu chỉ nằm trên Firebase: dọn bản cũ còn sót trong trình duyệt
    if (uid) purgeAccountLocalData(uid);
  }, [uid, authLoading]);
  return { ...session, uid, authLoading };
}
