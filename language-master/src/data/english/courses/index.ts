export * from './essential-words';
export * from './toeic';
export * from './expressions';
export * from './vocab-in-use';
export * from './oxford';
export * from './ielts';
export * from './destination';

/**
 * Ghi chú kỹ thuật:
 * Toàn bộ các khóa học tiếng Anh được phân nhóm theo thư mục chuyên biệt:
 *  - essential-words/: Bộ 7 cuốn 4000 Essential English Words (Starter -> Book 6)
 *  - destination/: Bộ 3 cuốn Macmillan Destination B1, B2, C1 & C2
 *  - oxford/: Bộ 5 cấp độ The Oxford 3000 & Oxford 5000 (A1 -> C1)
 *  - vocab-in-use/: Bộ 4 cuốn Cambridge English Vocabulary in Use (Elementary -> Advanced)
 *  - ielts/: Bộ 2 cuốn Cambridge Vocabulary for IELTS (Intermediate -> Advanced)
 *  - toeic/: 600 Essential Words for the TOEIC Test
 *  - expressions/: Real English Expressions Book 1
 * 
 * Mỗi thư mục có file index.ts riêng để dễ quản lý, mở rộng và import độc lập khi cần.
 * Chi tiết cấu trúc dữ liệu xem tại: src/data/english/COURSES_NOTE.md
 */
