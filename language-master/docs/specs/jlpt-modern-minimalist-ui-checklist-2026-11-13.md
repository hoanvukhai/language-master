# Checklist Triển khai Giao diện Modern Minimalist (Calm Focus) — JLPT Exam

Tài liệu tham chiếu: [jlpt-modern-minimalist-ui-spec-2026-11-13.md](file:///f:/Workspace/learn-language/language-master/docs/specs/jlpt-modern-minimalist-ui-spec-2026-11-13.md)

## A. Tài liệu & Chuẩn bị
- [x] Khởi tạo đặc tả chi tiết `docs/specs/jlpt-modern-minimalist-ui-spec-2026-11-13.md`
- [x] Khởi tạo checklist thực thi `docs/specs/jlpt-modern-minimalist-ui-checklist-2026-11-13.md`

## B. Triển khai Thiết kế theo Từng File
- [x] **UI-01 (`src/index.css`):** Chuẩn hóa Design Tokens (`Neutral Canvas + Indigo Accent`) cho `.exam-shell`, `.exam-card`, `.exam-primary`, `.exam-secondary`, `.exam-input`, `.exam-option`, `.exam-selected`, `.exam-correct`, `.exam-wrong`, `.exam-toolbar` (viền `1px`, bỏ gradient nặng, thống nhất bo góc `rounded-2xl` / `rounded-xl`).
- [x] **UI-02 (`src/pages/Exam/ExamLanguageHub.tsx`):**
  - [x] Chuyển Hero Banner từ gradient tím đậm sang header bề mặt sáng phẳng, viền `1px`.
  - [x] Tinh gọn thẻ Tiếng Nhật (JLPT) về bề mặt trắng/viền mảnh, 2 thẻ kỹ năng nền dịu mắt, 1 nút Primary rõ ràng.
- [x] **UI-03 (`src/pages/Exam/JLPTExamHub.tsx`):**
  - [x] Làm dịu Banner khôi phục phiên (`attempt`).
  - [x] Chuyển Hero Banner chính sang bề mặt sáng phẳng (`bg-white dark:bg-slate-900 border-slate-200/80 rounded-2xl`), tích hợp Segmented Control (`ALL | N1..N5`) sắc nét.
  - [x] Thiết kế lại 2 thẻ chế độ (`Làm Bài Có Giờ` & `Luyện Theo Dạng`) theo phân cấp rõ: chỉ `"Vào làm ngay (54 câu)"` dùng Primary đặc màu Indigo, `"Luyện theo dạng →"` dùng Secondary viền nhấn.
  - [x] Chuẩn hóa lưới Sách (`filtered`) về `rounded-2xl border` mảnh, bỏ `border-2` và hiệu ứng nảy nặng.
  - [x] Chuẩn hóa lưới 20 Bài (`matchedBookExams`) & kết quả tìm kiếm nhanh: mỗi thẻ chỉ giữ tối đa **1 nút Primary đặc màu**, loại bỏ nút gradient thứ 2 cạnh tranh thị giác; giữ nguyên Mobile grid + `BottomSheet`.
- [x] **UI-04 (`src/pages/Exam/ExamWorkspace.tsx`):**
  - [x] Thay Header gradient tím ở cả trạng thái `in_progress` lẫn cấu hình/kết quả/xem lại bằng Header bề mặt sáng phẳng viền mảnh.
  - [x] Tinh gọn màn hình Cấu hình (`DrillSetupPanel`): nút nhóm nhanh, lưới 9 thẻ Mondai (`rounded-xl`), khối `Tùy chọn nâng cao`, và thanh Preview bắt đầu luyện.
  - [x] Tinh gọn phòng làm bài (`in_progress`) & Khối đoạn văn (`showGroup`): chuyển Banner Mondai và Khung Đoạn văn chung từ nền vàng/gradient sang bề mặt đọc sách trung tính (`bg-slate-50/70 dark:bg-slate-900/90 border`), đồng bộ nút `"Kiểm tra nhóm"` sang Indigo Primary.
  - [x] Tinh gọn màn hình Kết quả (`mode === "result"`): bố cục các ô số liệu, thanh tiến độ Mondai mảnh (`h-1.5`), khối ước lượng `/60` dịu mắt, và thanh nút hành động đúng thứ tự test contract.
  - [x] Tinh gọn màn hình Xem lại (`mode === "review"` / post-submit): đồng bộ lưới ô số trong `aside` `"Mục lục chuyển nhanh câu hỏi"`.
- [x] **UI-05 (`src/pages/Exam/components/ExamQuestionCard.tsx`):**
  - [x] Làm dịu badge header (`Câu X`, `Ngày X · Câu Y`, `Giữ ngữ cảnh đoạn văn`) sang `rounded-lg`.
  - [x] Phân tách thanh công cụ hành động (`Nghe câu`, `Dịch câu`, `Xem đáp án & lời giải`, `Đối chiếu bản quét gốc`) bằng đường ngăn mảnh `border-t`.
  - [x] Tinh gọn khối lời giải (`showFeedback && expanded`) bằng khung sạch thống nhất và đường ngăn mảnh thay vì hộp lồng hộp nặng nề.
- [x] **UI-06 (`src/pages/Exam/workspace/QuestionPalette.tsx`):**
  - [x] Chuẩn hóa nút lọc (`Tất cả`, `Chưa làm`, `Chưa chắc`) và các ô số câu sang `rounded-lg` viền mảnh, trạng thái màu rõ ràng, dễ quét bằng mắt.
- [x] **UI-07 (Đợt 2 — Content Decluttering / Cắt giảm chữ thừa trên 4 trang):**
  - [x] `ExamLanguageHub.tsx`: Xóa 3 pill quảng cáo dài và đoạn mô tả 3 dòng thừa trong thẻ JLPT.
  - [x] `JLPTExamHub.tsx`: Xóa eyebrow và mô tả dài ở Header; gộp 2 nút nhanh khi mở sách lên Header; bỏ thẻ toolbar lặp `"Tất cả sách"`; rút gọn mô tả trên 2 thẻ chế độ, thẻ Sách, và thẻ 20 bài theo ngày.
  - [x] `ExamWorkspace.tsx`: Thu gọn Header thành 1 thanh ngang, bỏ khối tiêu đề `"Chuẩn bị luyện theo dạng"` lặp lại, rút gọn thẻ Mondai xuống 2 dòng, bỏ emoji và chữ thừa ở Tùy chọn nâng cao, thanh Preview, và hộp `/60`.
  - [x] `ExamQuestionCard.tsx`: Rút gọn dòng chú thích AI cuối lời giải xuống 1 dòng ngắn.
- [x] **UI-08 (Đợt 3 — Kiến trúc 3 Hàng Ngang Bố Cục 3 Vùng & Tách Trang Kho Sách Riêng):**
  - [x] `src/App.tsx`: Bổ sung route `/exams/jlpt/books` ánh xạ vào `<JLPTExamHub initialView="books" />`.
  - [x] `JLPTExamHub.tsx` (View 1 — Trang chính `/exams/jlpt`): Tái cấu trúc thành 3 Hàng Ngang Bố Cục 3 Vùng bấm toàn khối (`Làm bài có giờ` → `Luyện theo dạng` → `Kho sách & Bộ đề` dưới cùng), bổ sung cụm 3 ô thông số ở giữa giúp cân đối, không bị trống.
  - [x] `JLPTExamHub.tsx` (View 2 — Trang Kho Sách `/exams/jlpt?view=books` & `/exams/jlpt/books`): Có nút `"← Trang chính JLPT"`, bộ lọc cấp độ, tiêu đề `"Sách & Bộ Đề Luyện Thi"`, ô tìm kiếm và danh sách Sách dạng hàng ngang 3 vùng bấm toàn khối.
  - [x] `JLPTExamHub.tsx` (View 3 — Trang Chi Tiết Sách `/exams/jlpt?book=...`): Nút `"Quay lại danh sách sách"` điều hướng về View 2 (`view=books`), giữ nguyên tương thích bài test `FIX-01`.
- [x] **UI-09 (Tinh chỉnh Responsive cho Điện thoại / Mobile-First Polish):**
  - [x] `JLPTExamHub.tsx`: Ẩn 3 hộp thông số lớn trên `< md` thay bằng dải chip thông số gọn 1 dòng (`renderMobileChips`), thu gọn padding/icon trên `< sm`, chuyển thanh chọn cấp độ sang `grid-cols-6` đều trên mobile, thanh pill kỹ năng cuộn ngang không gãy dòng, và bổ sung nhãn `Day` vào lưới 20 ngày trên mobile.
  - [x] `ExamWorkspace.tsx`: Thêm `flex-wrap` cho `<summary>` của khối `"Tùy chọn nâng cao"`.
  - [x] `ExamLanguageHub.tsx`: Mở rộng nút `"Vào kho JLPT →"` thành `w-full sm:w-auto` trên mobile.

## C. Kiểm thử & Nghiệm thu
- [x] **VERIFY-01:** Chạy `npm run test:jlpt` — đạt **91/91** tests (PASS, 0 fail).
- [x] **VERIFY-02:** Chạy `npm run test:jlpt:ui` — đạt **120/120** tests (`tests/selection-lookup.ui.test.tsx`: 4/4, `tests/jlpt.ui.test.tsx`: 116/116) (PASS, 0 fail).
- [x] **VERIFY-03:** Chạy `npx eslint src/pages/Exam src/App.tsx` — thoát mã 0 (0 lỗi).
- [x] **VERIFY-04:** Chạy `npm run build` (`tsc -b && vite build`) — build production thành công.
- [x] Cập nhật toàn bộ trạng thái `[x]` trong file checklist và báo cáo kết quả cuối cùng.
