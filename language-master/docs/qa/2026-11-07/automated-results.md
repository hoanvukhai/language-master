# Kết quả kiểm tra tự động JLPT

Mốc code: df1754723de972c0a52bfeb8b7dc5ccf574c8f3d. Hoàn tất tổng hợp ngày 08/11/2026, Asia/Bangkok.

| Kiểm tra | Kết quả |
|---|---|
| tests/jlpt.test.mjs | 55/55 đạt, kết thúc bình thường; 12,57 giây ở lượt chạy hoàn chỉnh |
| Vitest | 93/93 đạt, 2/2 file, mã kết thúc 0; 149,94 giây |
| tests/jlpt.ui.test.tsx | 89 ca đạt |
| tests/selection-lookup.ui.test.tsx | 4 ca đạt |
| npm run build | Đạt: tsc -b và vite build, mã kết thúc 0; Vite báo 37,70 giây |
| ESLint phạm vi JLPT | Đạt, mã kết thúc 0, không có thông báo lỗi |

Vitest chạy với worker threads, một worker. Một lượt trước chưa hoàn chỉnh bị dừng khi không thấy tiến triển; kết quả trên lấy từ lượt đã chạy đầy đủ. Các timeout ở lượt ngày 07/11 trong lúc chạy đồng thời build không còn tái hiện trong lượt hoàn chỉnh. Không sửa test hay tăng timeout để làm bộ test đạt.

Lệnh ESLint được chạy trên src/pages/Exam, src/lib/jlpt, src/data/exams/jlpt, tests/jlpt.ui.test.tsx và tests/jlpt.test.mjs. Đây không phải khẳng định lint toàn bộ repository.

## Phạm vi test hiện có

- Cấu trúc dữ liệu 20 bài, 54 câu/bài, các cụm đoạn văn.
- Chọn/lưu/khôi phục/nộp lượt; ngăn trả lời sau hạn; tính điểm và tính chỉ đọc sau nộp.
- Luyện theo dạng toàn ngân hàng, lọc ngày và giữ nguồn câu.
- Các ca giao diện cho đủ 20 ngày.
- Chọn chữ tra cứu, hai ô trống, lời dịch trước trả lời, giữ nháp nhóm, luyện lại cụm và phím tắt trong hộp thoại.

Các công cụ dịch, phát âm và một số phần tích hợp được thay thế trong bộ test mô phỏng. Kết quả tra cứu trực tuyến thực nằm trong báo cáo thao tác trình duyệt; không suy ra dịch/phát âm thật từ test mô phỏng.

## Cảnh báo build

- localDictionaryIndex: 22.519,95 kB, gzip 5.425,51 kB.
- useConfirmation chunk: 935,91 kB, gzip 249,71 kB.
- Main index chunk: 1.631,52 kB, gzip 385,07 kB.
- Một số import động của pointsEngine/firestoreSync không tách chunk do cùng module được import tĩnh nơi khác.
- Dữ liệu Browserslist cũ; cảnh báo thời gian plugin build.

Đây là cảnh báo tối ưu hóa, không phải lỗi build. Chưa đo Core Web Vitals hoặc hiệu năng mạng di động của bản production.

## Kiểm tra logic bổ sung

Xem logic-results.json: 6.849 cấu hình picker, 100 ca luyện lại câu trong đoạn, thời hạn/khôi phục cho 20 ngày, các nhánh sessionStorage, lịch sử dài hạn đã tắt và dựng câu nhiều ô trống. Kết quả này kiểm chứng logic; lỗi UI xem trước số câu vẫn tồn tại và đã được báo riêng.

Source/dữ liệu/test ứng dụng giữ nguyên. git status cuối chỉ có thư mục tài liệu QA mới.

