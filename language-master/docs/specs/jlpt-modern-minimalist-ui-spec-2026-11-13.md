# Đặc tả Thiết kế Giao diện Modern Minimalist (Calm Focus) — Hệ thống Luyện đề JLPT

- **Ngày lập:** 2026-11-13
- **Phạm vi tuyến (Routes):**
  - `/exams` (`ExamLanguageHub.tsx`)
  - `/exams/jlpt` (Trang chính 3 cổng vào), `/exams/jlpt/books` / `/exams/jlpt?view=books` (Trang Kho Sách & Bộ Đề riêng), và `/exams/jlpt?book=...` (Trang 20 bài theo sách) (`JLPTExamHub.tsx`, `src/App.tsx`)
  - `/exams/jlpt/:examId`, `/exams/jlpt/:examId/drill`, `/exams/jlpt/:examId/mock`, `/exams/jlpt/:examId/result`, `/exams/jlpt/:examId/review` (`ExamWorkspace.tsx`, `ExamQuestionCard.tsx`, `QuestionPalette.tsx`)
- **Hệ thống Design Tokens:** `src/index.css` (`@layer components`)
- **Nguyên tắc bất biến:** Giữ nguyên **100%** logic nghiệp vụ (`FIX-01`..`FIX-08`, `B1`..`B4`), dữ liệu đề thi (`src/data/exams/jlpt/n2/kokusho-20days/`), nhãn văn bản (`text`), `aria-label`, `role`, `id`, và `data-exam-selectable` đang được kiểm thử bởi `tests/jlpt.test.mjs` (56 tests), `tests/jlpt.ui.test.tsx` (98 tests), và `tests/selection-lookup.ui.test.tsx`.

---

## 1. Phân tích Thực trạng & Vấn đề Giao diện Hiện tại

Qua khảo sát toàn bộ mã nguồn UI (`ExamLanguageHub.tsx`, `JLPTExamHub.tsx`, `ExamWorkspace.tsx`, `ExamQuestionCard.tsx`, `QuestionPalette.tsx`, `src/index.css`), giao diện hiện tại đã có đầy đủ luồng chức năng vững chắc nhưng đang gặp 5 vấn đề về **tải trọng thị giác (visual clutter)**:

1. **Khối Hero Gradient tím đậm lặp lại quá nhiều:**
   - Từ `/exams` → `/exams/jlpt` → `/exams/jlpt/:examId/...` (cả màn hình cấu hình lẫn thanh tiêu đề khi đang làm bài) đều dùng `bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl`.
   - Khối màu đậm chiếm 35–45% màn hình đầu tiên, tạo cảm giác nặng nề khi học lâu, đặc biệt trong phòng làm bài cần sự tập trung vào chữ Nhật.
2. **Độ dày viền, bóng đổ và bo góc quá lớn:**
   - Nhiều thẻ dùng `border-2`, `rounded-3xl`, `shadow-lg`/`shadow-xl` (trong thẻ sách, thẻ 20 bài theo ngày, khung đoạn văn, nút chọn đáp án), khiến bố cục bị chia ô dày đặc.
3. **Cạnh tranh nút CTA trên thẻ bài ngày (`Day 01` – `Day 20`) & màn Kết quả:**
   - Trên mỗi thẻ ngày trong `JLPTExamHub.tsx`, cả 2 nút `"Luyện theo dạng"` (gradient xanh ngọc) và `"Làm bài có giờ"` (gradient tím) đều dùng `.exam-primary`. Với 20 thẻ trên một màn hình, có tới **40 nút đặc màu** cạnh tranh sự chú ý.
   - Tương tự, phần đầu trang `/exams/jlpt` có 2 thẻ chế độ cũng dùng 2 màu CTA đặc khác nhau.
4. **Hộp lồng hộp (Box-in-Box Nesting):**
   - Trong `ExamQuestionCard.tsx` (khối lời giải), `ExamWorkspace.tsx` (màn hình kết quả, màn hình cấu hình nâng cao) có 3–4 lớp nền màu khác nhau lồng vào nhau (nền card → nền Slate → nền Emerald/Amber/Indigo), làm mắt người học khó xác định điểm neo.
5. **Khung đọc đoạn văn tương phản chưa tối ưu:**
   - Khối đoạn văn (`showGroup`) dùng `border-2 border-indigo-200/80 bg-amber-50/20`, dễ gây nhiễu thị giác so với kiểu bề mặt giấy/sách trung tính dịu mắt.
6. **Chữ thừa và chú thích lặp lại (Đợt 2 - Content Decluttering):**
   - Các đoạn văn mô tả dài 2–3 dòng trong Header, thẻ Sách, thẻ Chế độ, hộp Preview cấu hình và nhãn lặp (`Tất cả sách`, `Bộ đề N2`, emoji trong nút chọn phân bổ) làm trang vẫn có cảm giác nhiều chữ dù màu sắc đã dịu lại. Đợt 2 cắt gọn triệt để các câu giải thích thừa này mà vẫn bảo toàn 100% nhãn kiểm thử.

---

## 2. Triết lý Thiết kế Mục tiêu: Modern Minimalist / Calm Focus

> Lấy cảm hứng từ trải nghiệm đọc & học tập hiện đại (Linear, Notion, Readwise): **Giao diện lùi lại làm nền, để nội dung tiếng Nhật và hành động chính nổi bật rõ ràng.**

### 4 Nguyên tắc Thiết kế Cốt lõi

| Nguyên tắc | Mô tả thực thi |
| :--- | :--- |
| **1. Surface over Boxes (Bề mặt sáng phẳng, viền mảnh 1px)** | Dùng nền trắng sạch (`bg-white dark:bg-slate-900`) kết hợp viền mảnh `1px` (`border-slate-200/80 dark:border-slate-800`) và bóng siêu nhẹ (`shadow-2xs`). Loại bỏ toàn bộ khối gradient tím đậm ở header và `border-2 rounded-3xl` thừa thãi. |
| **2. Single Accent & One Primary Action** | Chuẩn hóa về **1 màu nhấn duy nhất (Indigo `#4F46E5`)** cho hành động chính, kết hợp thang màu trung tính Slate cho nền/viền/chữ. Mỗi thẻ bài hoặc màn hình chỉ có **tối đa 1 nút Primary đặc màu**, các nút phụ dùng Secondary viền mảnh. |
| **3. Dividers over Nested Boxes** | Thay các lớp hộp lồng nhau bằng đường ngăn mảnh (`border-t border-slate-100 dark:border-slate-800/80`) và khoảng trắng hợp lý (`space-y-4`), giúp mắt đọc tự nhiên từ trên xuống dưới. |
| **4. Japanese Typography First** | Tăng độ tương phản đọc chữ Nhật (`text-slate-900 dark:text-slate-100`), giữ `leading-[1.9]`–`leading-[1.95]`, dùng nền đọc sách trung tính (`bg-slate-50/70 dark:bg-slate-900/90`) cho đoạn văn Mondai 9. |

---

## 3. Hệ thống Design Tokens (`src/index.css`)

Bảng quy chuẩn chuyển đổi các lớp `@layer components` trong `src/index.css`:

| Class | Hiện tại (Before) | Mới (After — Modern Minimalist) |
| :--- | :--- | :--- |
| `.exam-shell` | `max-w-7xl ... py-6 pb-28` | `max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-28 text-slate-900 dark:text-slate-100 antialiased` |
| `.exam-card` | `rounded-3xl border-slate-200/80 bg-white dark:bg-slate-800 shadow-sm` | `p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-colors` |
| `.exam-primary` | `rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 font-bold shadow-indigo-500/20` | `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 min-h-10 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-2xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none` |
| `.exam-secondary` | `rounded-2xl border-slate-200 bg-white font-semibold` | `inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 min-h-10 border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none` |
| `.exam-input` | `rounded-2xl bg-slate-50` | `min-h-10 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 shadow-2xs transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20` |
| `.exam-option` | `w-full rounded-2xl border-2 p-4` | `w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-3.5 sm:p-4 text-left text-lg leading-7 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/50` |
| `.exam-selected` | `border-indigo-600 bg-indigo-50/80` | `border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-600/20 dark:ring-indigo-500/25 bg-indigo-50/40 dark:bg-indigo-950/30` |
| `.exam-correct` | `border-emerald-600 bg-emerald-50/90` | `border-emerald-500/90 dark:border-emerald-500/80 ring-1 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/25` |
| `.exam-wrong` | `border-rose-600 bg-rose-50/90` | `border-rose-500/90 dark:border-rose-500/80 ring-1 ring-rose-500/20 bg-rose-50/50 dark:bg-rose-950/25` |
| `.exam-toolbar` | `sticky top-16 rounded-2xl p-3.5` | `sticky top-16 z-20 flex flex-wrap items-center gap-3 px-3.5 py-2.5 mb-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-2xs` |

---

## 4. Đặc tả Chi tiết Từng Màn hình & Thành phần

### 4.1. `ExamLanguageHub.tsx` (`/exams`)
- **Header phẳng biên tập (Editorial Header):**
  - Thay gradient tím đậm bằng khung `rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xs`.
  - Eyebrow badge dùng `bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60`.
  - 3 pill tính năng dùng `bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-200`.
- **Thẻ Tiếng Nhật (JLPT):**
  - Chuyển `border-2` + gradient nền sang `exam-card hover:border-indigo-300 dark:hover:border-indigo-700`, giữ icon 🇯🇵 gọn trong ô `rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/70` hoặc `bg-indigo-600 text-white`.
  - 2 ô trạng thái kỹ năng dùng nền sáng trung tính `bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl`.

### 4.2. `JLPTExamHub.tsx` (`/exams/jlpt` & `?book=...`)
- **Banner khôi phục phiên (`attempt`):**
  - Dùng `exam-card border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/25`, chữ sắc nét, 2 nút `"Làm tiếp..."` (`exam-primary`) và `"Kết thúc và xóa phiên"` (`exam-secondary`).
- **Header chính của Kho JLPT:**
  - Chuyển sang bề mặt sáng: `rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-5`.
  - **Hàng trên:**
    - Trái: link `"← Đổi ngôn ngữ"` hoặc nút `"Quay lại danh sách sách"` dùng pill mảnh trung tính (`border border-slate-200/90 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:text-slate-200`).
    - Phải: Segmented Control `Tất cả | N1..N5` đặt trong rãnh `bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60`. Nút đang chọn có nền `bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-2xs`.
  - **Hàng tiêu đề & kỹ năng:**
    - `h1`: `"Kho bài luyện JLPT"` / `openedBook.title` dùng `text-slate-900 dark:text-white font-bold tracking-tight`.
    - 3 nút/pill kỹ năng (`Chữ Hán · Từ vựng · Ngữ pháp`, `Đọc hiểu · 読解`, `Nghe hiểu · 聴解`) dùng viền mảnh sạch sẽ (`rounded-xl border`).
  - **2 Thẻ Chế độ Ngân hàng Tổng hợp:**
    - Đặt trong nền phụ nhẹ `rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/35 p-5`.
    - **Thẻ 1 (`Làm Bài Có Giờ (Đề Trộn 54 Câu)`):** Nút `"Vào làm ngay (54 câu)"` dùng `exam-primary`.
    - **Thẻ 2 (`Luyện Theo Dạng (Mondai)`):** Nút `"Luyện theo dạng →"` dùng `exam-secondary !border-indigo-200 dark:!border-indigo-800/80 !text-indigo-700 dark:!text-indigo-300 hover:!bg-indigo-50/60 font-semibold` (tránh hai nút gradient đậm cạnh tranh nhau).
- **Lưới Sách (`filtered`) & Lưới 20 Bài Theo Ngày (`matchedBookExams`):**
  - **Thẻ Sách:** Đổi `border-2 rounded-3xl shadow-sm hover:-translate-y-1` sang `rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-indigo-400/80 hover:shadow-md transition-all`.
  - **Thẻ 20 Bài (`Day 01`..`Day 20`):**
    - Đổi `border-2 rounded-3xl` sang `rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all`.
    - **Phân cấp 3 nút hành động (Mỗi thẻ tối đa 1 nút đặc màu):**
      - Nếu có phiên đang làm (`isInTab`): nút `"Làm tiếp..."` dùng `exam-primary`, cả `"Luyện theo dạng"`, `"Làm bài có giờ"`, `"Xem đề & lời giải"` đều dùng `exam-secondary`.
      - Nếu chưa có phiên (`!isInTab`): `"Luyện theo dạng"` giữ vai trò Primary (`exam-primary`), `"Làm bài có giờ"` và `"Xem đề & lời giải"` dùng `exam-secondary`.
    - **Kết quả tìm kiếm nhanh ngoài sách (`query.trim().length > 0`):** Áp dụng cùng quy chuẩn: `"Luyện theo dạng"` là `exam-primary`, `"Làm bài có giờ"` là `exam-secondary`.

### 4.2.1. `UI-08` (Đợt 3): Kiến trúc 3 Hàng Ngang Bố Cục 3 Vùng (Trái – Giữa – Phải) & Tách Trang Kho Sách Riêng
- **Trang Chính `/exams/jlpt` (View 1 — Main 3-Row Bento Hub):**
  - Header tinh gọn với nút `"← Đổi ngôn ngữ"`, Segmented Control cấp độ (`Tất cả | N1..N5`), tiêu đề `"Kho bài luyện JLPT"` và 3 pill kỹ năng.
  - Phía dưới là đúng **3 Hàng Ngang Bố Cục 3 Vùng (`grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto]`)** có viền nhấn trái (`border-l-4`), cụm **3 ô thông số ở giữa (`renderMetricTiles`)** giúp lấp đầy khoảng trống cân đối và ấn toàn khối để mở:
    1. **Hàng 1 (Trên cùng) — Làm bài có giờ (`Timed Mock`, Indigo):** Thông số `54 câu | 50 phút | Mondai 1–9`, bấm khối để vào thẳng phòng thi (`/exams/jlpt/:poolId/mock`).
    2. **Hàng 2 (Ở giữa) — Luyện theo dạng (`Mondai Drill`, Emerald):** Thông số `Chữ Hán (Mondai 1–2) | Từ vựng (Mondai 3–6) | Ngữ pháp (Mondai 7–9)`, bấm khối để vào trang chọn dạng bài (`/exams/jlpt/:poolId/drill`).
    3. **Hàng 3 (Dưới cùng) — Kho sách & Bộ đề (`Book Repository`, Violet):** Thông số `Số bộ sách | Số bài học | Số câu`, bấm khối để mở View 2 (`?view=books` hoặc `/exams/jlpt/books`).
- **Trang Kho Sách & Bộ Đề Riêng `/exams/jlpt?view=books` hoặc `/exams/jlpt/books` (View 2):**
  - Header có nút `"← Trang chính JLPT"`, Segmented Control cấp độ, tiêu đề `"Sách & Bộ Đề Luyện Thi (N)"` và ô tìm kiếm sách/bài học.
  - Thân trang hiển thị danh sách Bộ Sách theo bố cục hàng ngang 3 vùng bấm toàn khối và kết quả bài học khớp từ khóa khi có tìm kiếm.
- **Trang Chi Tiết Bộ Sách `/exams/jlpt?book=<bookId>` (View 3):**
  - Nút `"Quay lại danh sách sách"` quay về View 2 (`view=books`), giữ 100% tương thích với bài kiểm thử `FIX-01`.

### 4.3. `ExamWorkspace.tsx` — Header, Setup, Active Session, Result & Review
- **Header (`in_progress` & non-`in_progress`):**
  - Khi `in_progress`: `<header className="mb-3 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">`, chữ `h1` dùng `text-slate-900 dark:text-white`, nút `"← Kho JLPT"` dùng `border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200`.
  - Khi không `in_progress`: `<header className="mb-5 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">` với badge mảnh và tiêu đề rõ nét.
- **Màn hình Cấu hình (`DrillSetupPanel`):**
  - Các nút nhóm nhanh (`"✓ Tất cả 9 dạng"`, `"Chữ Hán (M1–2)"`, `"Từ vựng (M3–6)"`, `"Ngữ pháp (M7–9)"`, `"Bỏ chọn"`): thống nhất `rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-colors`.
  - Lưới 9 thẻ Mondai: `rounded-xl p-3.5 border transition-all`, khi chọn dùng `border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-600/15 text-slate-900 dark:text-white`, khi bỏ chọn dùng `border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-slate-300`.
  - Hộp tổng kết Preview (`"Lượt này: X câu"` + nút `"Bắt đầu luyện"`/`"Bắt đầu làm bài"`): dùng `rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5`.
- **Phòng làm bài (`in_progress`) & Đoạn văn (`showGroup`):**
  - Banner đầu Mondai: đổi từ nền gradient tím + `border-l-4` nặng sang `rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 px-5 py-4`.
  - Khung Đoạn văn chung (`passage`): đổi từ `border-2 border-indigo-200/80 bg-amber-50/20` sang bề mặt đọc sách trung tính `rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/90 p-5 sm:p-6`.
  - Nút `"Kiểm tra nhóm"`: dùng `exam-primary w-full` (thay vì `!from-emerald-700 !to-teal-700`), đồng bộ triết lý 1 màu nhấn Indigo.
- **Màn hình Kết quả (`mode === "result"`):**
  - Cụm điểm số chính + 4 ô thống kê (`Đúng`, `Sai`, `Bỏ trống`, `Thời gian làm`): dùng `rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4`.
  - Bảng tiến độ từng Mondai: thẻ gọn `rounded-xl`, thanh tiến độ mảnh `h-1.5 rounded-full`.
  - Khối ước lượng `/60`: đổi sang `rounded-xl border border-indigo-200/70 dark:border-indigo-800/50 bg-indigo-50/30 dark:bg-indigo-950/25 p-4`.
  - Thanh nút hành động cuối thẻ: giữ đúng thứ tự và nhãn theo test contract, nút chính (`"Xem câu sai"` khi có sai, hoặc `"Xem lại bài"` khi không có sai) dùng `exam-primary`, các nút còn lại dùng `exam-secondary`.
- **Màn hình Xem lại (`mode === "review"` hoặc `submitted && reviewing`):**
  - Các ô số nhanh trong `<aside>` `"Mục lục chuyển nhanh câu hỏi"`: `rounded-lg text-xs font-semibold border transition-all`.

### 4.4. `ExamQuestionCard.tsx` & `QuestionPalette.tsx`
- **`ExamQuestionCard.tsx`:**
  - Thẻ `<article>`: `exam-card scroll-mt-28 space-y-4`.
  - Các badge header (`Câu X`, `Ngày X · Câu Y`, `"Giữ ngữ cảnh đoạn văn"`): dùng `rounded-lg px-2.5 py-1 text-xs font-semibold`.
  - Thanh công cụ hành động (`Nghe câu`, `Dịch câu`, `Xem đáp án & lời giải`, `Đối chiếu bản quét gốc`): ngăn cách nhẹ bằng `pt-3 border-t border-slate-100 dark:border-slate-800/80`.
  - Khối lời giải (`showFeedback && expanded`): dùng một khung sạch `mt-3 p-4 sm:p-5 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-4`, phân tách các tầng nội dung bằng đường ngăn `divide-y` hoặc `border-t border-slate-200/60 dark:border-slate-800/70`.
  - Nút `"Câu tiếp"` trong lời giải: dùng `exam-primary !py-1.5 !px-3 !min-h-8 text-xs`.
- **`QuestionPalette.tsx`:**
  - Bộ lọc (`Tất cả`, `Chưa làm`, `Chưa chắc`): dùng `rounded-lg px-2.5 py-1 text-xs font-semibold`.
  - Các ô câu hỏi: `h-9 rounded-lg border text-xs font-semibold`, dùng màu dịu hơn (`bg-emerald-600`, `bg-rose-600`, `bg-indigo-600`, `bg-slate-50 dark:bg-slate-800/70`).

---

## 5. Ma trận Bảo toàn Kiểm thử Tự động (Test Contracts)

Các điểm neo sau **bắt buộc giữ nguyên 100%** khi chỉnh sửa JSX:
1. Tất cả chuỗi văn bản chính xác: `"Kho bài luyện JLPT"`, `"Sách & Bộ Đề Luyện Thi"`, `"Quay lại danh sách sách"`, `"Tất cả sách"`, `"Vào làm ngay (54 câu)"`, `"Đề mới (54 câu)"`, `"Luyện theo dạng →"`, `"Lượt mới"`, `"Luyện theo dạng"`, `"Làm bài có giờ"`, `"Xem đề & lời giải"`, `"Đọc hiểu · 読解"`, `"Nghe hiểu · 聴解"`, `"Kết thúc và xóa phiên"`.
2. Toàn bộ các nút/trạng thái trong `ExamWorkspace.tsx`: `"← Kho JLPT"`, `"Nộp bài"`, `"Kết thúc luyện"`, `"Kiểm tra nhóm"`, `"← Trước"`, `"Tiếp / Bỏ qua →"`, `"✓ Tất cả 9 dạng"`, `"Chữ Hán (M1–2)"`, `"Từ vựng (M3–6)"`, `"Ngữ pháp (M7–9)"`, `"Bỏ chọn"`, `"Chọn dạng"`, `"Tùy chọn nâng cao"`, `"Theo tỷ lệ chuẩn đề"`, `"Theo tổng số câu mỗi lượt"`, `"Số câu bằng nhau mỗi Mondai"`, `"Số câu mỗi lượt"`, `"Bắt đầu luyện"`, `"Bắt đầu làm bài"`, `"Xem câu sai"`, `"Xem lại bài"`, `"Thu gọn bài"`, `"Luyện câu sai"`, `"Luyện câu bỏ trống"`, `"Luyện câu chưa chắc"`, `"Trộn lượt mới cùng cấu hình"`, `"Đổi cấu hình"`, `"Thi đề trộn mới (54 câu)"`, `"Làm lại toàn bài"`, `"Về kho JLPT"`, `"Lọc"`, `"Mở tất cả lời giải"`, `"Thu gọn tất cả"`, `"Mục lục chuyển nhanh câu hỏi"`.
3. Toàn bộ thuộc tính DOM trong `ExamQuestionCard.tsx`: `id="q-{q.id}"`, `data-exam-selectable`, `lang="ja"`, `role="group"` `aria-label="Phương án câu {q.number}"`, radio `aria-label="Phương án {i+1}, câu {q.number}"`, nút `"Hoàn tác"`, `"Nghe câu"`, `"Dịch câu"`, `"Ẩn bản dịch"`, `"Xem đáp án & lời giải"`, `"Thu gọn lời giải"`, `"Đối chiếu bản quét gốc"`, `"Đáp án: {q.answer}"`, `"Câu tiếp"`, `ol aria-label="Lời giải từng phương án"`, dòng `"Lời giải tham khảo do AI biên soạn"`.

