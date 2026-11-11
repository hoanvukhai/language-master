import type { JLPTExam } from "../../data/exams/jlpt/types";

/** Chuẩn hóa từ khóa: NFKC (số toàn góc → số thường), chữ thường, gộp khoảng trắng. */
export function normalizeExamQuery(query: string): string {
  return query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

const DAY_QUERY = /^(?:day|ngày|ngay|d)?\s*0*(\d{1,2})$/;

/**
 * So khớp một bài với từ khóa tìm kiếm (JL-23).
 * - "Day 1", "day 01", "Ngày 12", "12" → so đúng số ngày.
 * - Còn lại: tìm chuỗi con trong tiêu đề bài, tên sách và phụ đề đã bỏ số trang.
 */
export function matchExamQuery(
  exam: Pick<JLPTExam, "day" | "title" | "subtitle">,
  bookTitle: string,
  query: string,
): boolean {
  const q = normalizeExamQuery(query);
  if (!q) return true;
  const day = q.match(DAY_QUERY);
  if (day) return exam.day === Number(day[1]);
  const subtitle = (exam.subtitle || "").replace(/·?\s*Trang\s*[\d–-]+/gi, "");
  return normalizeExamQuery(`${exam.title} ${bookTitle} ${subtitle}`).includes(q);
}
