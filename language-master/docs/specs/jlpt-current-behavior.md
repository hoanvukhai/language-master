# Luyện đề JLPT — hành vi hiện tại (sau đợt sửa 11/2026)

Tài liệu này mô tả phần Luyện đề **đang chạy thế nào**, để kiểm thử và để lần sửa sau có mốc so sánh.

## 1. Đường dẫn

| Đường dẫn | Nội dung |
|---|---|
| `/exams` | Chọn ngôn ngữ thi |
| `/exams/jlpt` | Trang tổng: tìm kiếm, lọc cấp độ, thẻ bộ đề, lưới 20 ngày, nút tiếp tục bài dở |
| `/exams/jlpt/:examId` | Trang chi tiết một ngày (hoặc ngân hàng luyện theo dạng) |
| `/exams/jlpt/:examId/drill` | Luyện từng câu, xem lời giải ngay |
| `/exams/jlpt/:examId/mock` | Làm bài có giờ |
| `/exams/jlpt/:examId/review` | Xem đề kèm đáp án |
| `/exams/jlpt/:examId/result` | Màn hình kết quả |

## 2. Bài có giờ (mock)

- Bấm “Bắt đầu làm bài” sẽ mở hộp thoại **Bắt đầu bài có giờ**. Ô **Thi nghiêm túc** được bật sẵn.
- Khi thi nghiêm túc:
  - không có nút Nghe câu, không có nút Dịch câu, phím F9 không làm gì;
  - không tải từ điển (không có request `registry-*` hay `lexicon`);
- Trong menu bài thi có mục **Tắt thi nghiêm túc**. Khi đã tắt, kết quả không được tính điểm ước lượng /60.
- Điểm ước lượng /60 chỉ hiện khi bài là đề đủ một ngày, có giờ, nghiêm túc và không dùng trợ giúp (`isEstimateEligible`). Các trường hợp khác hiện một dòng giải thích lý do.

## 3. Luyện từng câu (drill)

- Chọn đáp án thì có **1,5 giây** chờ chốt. Trong lúc đó thanh “đang chốt” hiện nút **Hoàn tác**.
- Sau khi chốt, lời giải gồm:
  - bản dịch câu, có nhãn “AI dịch”;
  - dòng **Từ trọng tâm** (từ, cách đọc, Hán Việt, nghĩa);
  - ghi chú cho từng phương án.
- Trước khi trả lời, chỉ hiện bản dịch câu có chỗ trống (`stemTranslationVi`, dấu “…” thay cho đáp án), để không lộ đáp án.

## 4. Mondai 9 (đọc đoạn văn)

- Mỗi ô trống trong đoạn văn là một nút “Ô trống N, tới câu hỏi”.
- Mỗi câu hỏi hiện câu chứa ô trống, kèm liên kết **Xem trong đoạn văn ↑**. Bấm vào sẽ cuộn tới ô và nhấp nháy (`.exam-blank-flash`).
- Ở màn hình rộng (xl), đoạn văn và câu hỏi chia hai cột.

## 5. Kết quả và lịch sử

- Màn hình kết quả hiện:
  - nhãn loại lượt (đề đầy đủ / luyện lại / tự chọn) và thời gian làm bài;
  - độ chính xác theo từng Mondai;
  - danh sách **Từ cần ôn**, có nút lưu từ vào bộ thẻ.
- Có các nút “Xem câu sai”, “Xem lại bài”, “Luyện câu sai”, “Luyện câu bỏ trống”, “Luyện câu chưa chắc” và “Làm lại toàn bài”. Riêng lượt luyện ở ngân hàng câu có thêm “Trộn lượt mới cùng cấu hình” và “Đổi cấu hình”.
- Lịch sử điểm lưu ở Firestore `users/{uid}/jlpt_attempts` (cần đăng nhập). Rule nằm trong `firestore.rules`.
  - Mỗi lượt chỉ lưu một lần; mã lượt đã lưu được ghi trong sessionStorage.
  - Khoá cũ `jlpt_exam_history_v1` trong localStorage được xoá khi mở trang tổng.
- Lượt làm dở lưu theo tab (sessionStorage, session v2).

## 6. Từ điển

- Từ điển tải lười: mở “Xem đề” không tải registry.
- Trước hết dùng bản rút gọn `src/data/dictionary/jlpt-n2-kokusho-lexicon.json` (khoảng 2.850 mục), chỉ tải bản đầy đủ khi cần.
- Bản rút gọn được dựng lại bằng `node scripts/jlpt/build-lexicon.mjs`.

## 7. Nội dung

- Mỗi câu trong 20 ngày có:
  - `translationVi`, `stemTranslationVi`, `targetWord`;
  - 4 ghi chú phương án;
  - bản dịch đoạn văn Mondai 9.
- Nội dung do AI soạn, gắn `enrichmentStatus: "ai"`. Khi người đã duyệt một câu thì đổi sang `"reviewed"`; script sẽ giữ nguyên các câu đã duyệt.
- Lời bài hát và bài thơ trích trong đoạn văn chỉ được tóm ý, không dịch nguyên văn.
- Quy trình sửa nội dung:
  1. Sửa `imports/jlpt/kokusho-20days/enrichment/src/dayXX.txt`.
  2. Chạy `node scripts/jlpt/compile-enrichment.mjs XX`.
  3. Chạy `node scripts/jlpt/apply-enrichment.mjs dayXX`. Script kiểm tra: đủ 4 ghi chú, mỗi ghi chú tối đa 160 ký tự; cách đọc chỉ có kana; nghĩa tối đa 60 ký tự.

## 8. Kiểm thử

| Lệnh | Phạm vi |
|---|---|
| `npm run test:jlpt` | Logic và dữ liệu (node test runner) |
| `npm run test:jlpt:ui` | Giao diện bằng vitest + jsdom; Firebase được mock trong `tests/setup/firebaseMock.ts` |
| `npm run build && npm run test:e2e` | Playwright, chạy trên desktop và mobile. Lần đầu cần chạy `npx playwright install chromium` |
