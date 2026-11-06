# Kiểm tra bản chạy JLPT V1

Bản triển khai có đủ 20 ngày N2: 1.080 câu, mỗi ngày 54 câu/9 Mondai. Đề, bốn lựa chọn, đoạn văn và chú thích hiện bằng chữ đã đối chiếu ảnh PDF. Bôi đen chữ để tra từ khi luyện/lướt/xem lại; ảnh nguồn nằm trong mục đối chiếu thu gọn. Không cần đăng nhập. Đáp án giữ theo bảng cuối sách.

## Các luồng nên thử

1. Mở `/exams/jlpt`, tìm sách/ngày 1, vào chi tiết và ba chế độ.
2. Luyện Mondai: dùng nút cấp sách để gom câu của cả 20 ngày; chọn dạng và 10/20/50/tất cả câu. Không lặp trong lượt, nhãn ngày/số gốc đúng, tải lại không trộn lại. Chọn đáp án rồi đổi trước khi Kiểm tra; sau Kiểm tra phải khóa. Tra từ trước chốt ghi dấu hỗ trợ.
3. Chọn Mondai 9: thấy toàn đoạn, chú thích gốc và câu 50–54; kiểm tra cả nhóm. Câu 52 có ba ô nhưng chỉ một lựa chọn.
4. Làm bài có giờ: mở trang chưa chạy đồng hồ; bấm Bắt đầu mới chạy. Chọn đáp án/cắm cờ, tải lại: khôi phục và không cấp thêm thời gian.
5. Nộp rồi xem lại: đáp án/điểm chỉ đọc; lọc câu sai/bỏ trống/cờ. Luyện lại sẽ thay kết quả hiện tại sau xác nhận; câu thuộc đoạn kéo theo cả nhóm.
6. Xem đề tự do: không thay phiên đang làm. Mở tất cả rồi đóng từng lời giải vẫn hoạt động.
7. Đổi bài/chế độ: xác nhận trước thay phiên. Hủy xác nhận giữ nguyên bài cũ.
8. Xóa phiên: chỉ mất bài JLPT của tab, không mất dữ liệu khóa học/thi đua/cài đặt khác.
9. Thử màn hẹp: phiếu câu hỏi, nút nộp, phương án và đoạn văn không bị che hoặc tràn ngang; bàn phím và đóng popup tra từ hoạt động.
10. Kéo chọn một từ trong câu hỏi, lựa chọn, bài đọc hoặc chú thích; bấm Tra từ đã chọn. Kéo chọn không làm đổi đáp án. Chọn xuyên hai vùng không mở nút tra; Escape hoặc cuộn trang đóng nút. Trong Mock chưa nộp không có trợ giúp tra từ của ứng dụng.
11. Mở Đối chiếu bản quét gốc và phóng to nếu cần. Nếu đang dùng phiên cũ dạng ảnh, bắt đầu lượt mới để lấy text; tải lại phiên cũ vẫn bảo toàn lựa chọn.

## Những giới hạn được giữ rõ

- Chỉ một bài/kết quả tạm trong tab, TTL cố định 24 giờ; không có hồ sơ điểm hoặc lịch sử lâu dài.
- Trình duyệt chặn/đầy storage: vẫn làm bằng bộ nhớ với cảnh báo; refresh có thể mất bài.
- Bản sao tab độc lập và giữ deadline nếu trình duyệt sao chép phiên ban đầu.
- Đủ 1.080 lời giải tham khảo tiếng Việt với `explanationStatus=authored`: hiện sau Kiểm tra/Nộp hoặc khi mở ở Lướt đề, có nhãn AI biên soạn. Không coi là lời giải chính thức của nhà xuất bản. Bản dịch/phân tích cũ chưa duyệt vẫn ẩn; công tắc xem nháp chỉ có ở bản chạy phát triển và không có lúc thi thử.
- Đã đối chiếu chữ trên 160 trang đề. Phương án nhiễu sai chính tả/ngữ pháp có chủ ý được giữ nguyên. Ghi chú biên tập cho lỗi in nguồn nằm trong README nhập sách.

## Kiểm tra kỹ thuật

- `npm run test:jlpt`: kiểm tra logic câu/nhóm, chấm, khóa đáp án, deadline, TTL, dữ liệu lỗi, sessionStorage/RAM và bản sao tab.
- `npm run build`: TypeScript và bản dựng.
- ESLint phạm vi thay đổi: `npx eslint src/pages/Exam src/lib/jlpt src/data/exams/jlpt src/App.tsx`.

Đã có kiểm thử giao diện bằng DOM mô phỏng cho từng ngày, cùng kiểm tra dữ liệu/ảnh/chấm điểm. Các kiểm tra tự động không thay thế việc thao tác thực tế trên trình duyệt. Chưa xác nhận toàn bộ 51 AC bằng kiểm tra giao diện trực tiếp.
