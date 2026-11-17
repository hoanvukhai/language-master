// Phân loại lỗi Firebase để báo đúng nguyên nhân thay cho câu chung chung "Kiểm tra mạng".
export type FirebaseErrorKind = "permission" | "offline" | "index" | "quota" | "unknown";

export function classifyFirebaseError(e: unknown): FirebaseErrorKind {
  const code = String((e as { code?: unknown } | null)?.code ?? "");
  const message = String((e as { message?: unknown } | null)?.message ?? "");
  if (code.includes("permission-denied") || /insufficient permissions|permission-denied/i.test(message))
    return "permission";
  if (code.includes("failed-precondition") && /index/i.test(message)) return "index";
  if (code.includes("resource-exhausted")) return "quota";
  if (
    code.includes("unavailable") ||
    code.includes("deadline-exceeded") ||
    /network|offline|failed to fetch/i.test(message) ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  )
    return "offline";
  return "unknown";
}

export function describeFirebaseError(kind: FirebaseErrorKind | string | undefined): string {
  switch (kind) {
    case "permission":
      return "Không có quyền ghi dữ liệu (thử đăng nhập lại; nếu vẫn lỗi, quy tắc Firestore có thể chưa được cập nhật)";
    case "offline":
      return "Mất kết nối mạng";
    case "index":
      return "Firestore thiếu chỉ mục cho truy vấn này";
    case "quota":
      return "Firebase đang quá tải hoặc hết hạn mức";
    default:
      return "Lỗi không xác định (xem Console để biết chi tiết)";
  }
}
