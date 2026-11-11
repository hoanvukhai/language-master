const LEGACY_HISTORY_STORAGE_KEY = "jlpt_exam_history_v1";

/** Xoá một lần khoá lịch sử cũ trong localStorage (lịch sử mới nằm ở Firestore). */
export function clearLegacyExamHistory(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LEGACY_HISTORY_STORAGE_KEY);
    }
  } catch {
    // Bỏ qua lỗi storage
  }
}
