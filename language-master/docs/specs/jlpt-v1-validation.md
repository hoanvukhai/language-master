# Báo cáo kiểm tra bản luyện đề đầy đủ 20 ngày

## Cập nhật 06/11/2026: thay ảnh bằng text

- Đối chiếu đủ 160 trang đề, sửa OCR và đưa toàn bộ 1.080 câu/bốn lựa chọn, 20 đoạn và chú thích Nhật sang `delivery: text`, revision 4. Có bản sửa lưu riêng để tái tạo JSON. Ảnh chỉ mở trong mục đối chiếu.
- Giữ nguyên đáp án đã đối chiếu cuối sách. Chuẩn hóa gạch chân, ô trống, ★ và liên kết a/b/c; bỏ số trang, dấu gạch OCR thừa khỏi phương án. Sửa một lời giải sắp xếp ngày 2 câu 45 cho khớp đề gốc.
- Chọn chữ trong nhãn radio không đổi đáp án; tra từ chọn hoạt động trong luyện/lướt/xem lại, không mở khi Mock đang làm. Có kiểm thử lựa chọn, vùng chọn xuyên câu, Escape/cuộn và chế độ không trợ giúp.
- Kết quả đợt text: 55/55 kiểm tra logic/dữ liệu, 88/88 kiểm tra giao diện qua; TypeScript và build qua; ESLint phạm vi phần đề và test qua. Cảnh báo kích thước gói chung và import SRS vẫn còn như bản trước.
- Công cụ trình duyệt kết thúc kiểm tra vì không xác định chắc địa chỉ Chrome để áp quy tắc truy cập; đợt text này chưa được xác nhận trực tiếp thao tác kéo chọn trên trình duyệt thật. Các ghi nhận trình duyệt ở mục cũ bên dưới thuộc đợt trước.

## Cập nhật 06/11/2026: luyện chung theo dạng và lời giải

- Luyện theo dạng gom đủ 20 ngày/1.080 câu trong cùng sách và cấp độ. Chọn Mondai hoặc trộn tất cả, 10/20/50/tất cả câu; các đoạn chung luôn nguyên nhóm.
- Thứ tự trộn giữ qua tải lại, không lặp câu trong lượt, không đảo phương án. Mỗi câu ghi ngày và số gốc. Trộn lượt mới lấy từ toàn bộ ngân hàng; đổi cấu hình chưa xóa bài đang làm.
- Đủ 1.080 lời giải tham khảo tiếng Việt, hiển thị sau Kiểm tra/Nộp hoặc khi chủ động mở ở Lướt đề. Có nhãn AI biên soạn và không phải lời giải nhà xuất bản. OCR đã đối chiếu trong cập nhật text ở trên.
- 55/55 kiểm tra logic/dữ liệu qua, gồm đủ lời giải và đối chiếu số đáp án ở ô sao trong lời giải với khóa đáp án. 84/84 kiểm tra UI qua, gồm hai kiểm tra đường dẫn vào ngân hàng và giữ phạm vi luyện lại sau thi thử.
- Sau sửa đường quay lại màn chọn dạng khi xóa phiên, chạy lại riêng 16/16 kiểm tra ngân hàng đều qua; 68 trường hợp còn lại đã qua trong lượt 84/84. ESLint, TypeScript, bản dựng và kiểm tra whitespace đều qua trên bản cuối.
- Trình duyệt thật: bắt đầu một lượt Mondai 1 lấy câu từ ngày 1 rồi ngày 8, chốt đáp án, mở lời giải, tải lại giữ câu/đáp án đã chốt, kết thúc qua hộp xác nhận và xem kết quả 2 đúng/8 bỏ trống. Ảnh tại `docs/qa/jlpt-pooled-explanation.png`.
- Kiểm tra cấu trúc/tự động không thay thế duyệt sư phạm độc lập từng lời giải. Không tuyên bố nội dung tham khảo là lời giải chính thức đã được nhà xuất bản duyệt.

## Nội dung đã đưa vào

- 20 JSON ngày, 1.080 câu, 180 Mondai; 1.080 định danh câu không trùng.
- Đủ 20 đoạn văn và nhóm câu 50–54; câu 52 giữ một lựa chọn/một điểm.
- 1.100 ảnh WebP nguồn, khoảng 20 MB; các file đều tồn tại và có định dạng WebP hợp lệ.
- Text OCR theo ngày và theo trang, JSON nháp, bảng đáp án riêng từng ngày, báo cáo vị trí cắt và manifest SHA-256.
- Đáp án chép trực tiếp từ 10 trang cuối: OCR vị trí chữ số xác nhận độc lập 789 chữ số, không có chênh lệch; phần còn lại đối chiếu bằng ảnh gốc.

## Kiểm tra đã chạy thành công

| Nhóm | Kết quả |
|---|---|
| Node test: logic phiên và toàn bộ dữ liệu | 55/55 qua |
| Giao diện DOM: ba chế độ mỗi ngày, phiên tạm, hạn giờ, lỗi storage, phóng to ảnh | 65/65 qua |
| Bổ sung hộp xác nhận: hủy giữ bài, hết giờ đóng hộp, luyện lại nhóm chỉ xác nhận một lần | 3/3 qua; chạy riêng sau bộ 65 |
| TypeScript | Qua |
| ESLint phạm vi thay đổi | Qua |
| Bản dựng Vite | Qua; phần đề được tách thành các chunk tải theo route |
| Kiểm tra Git whitespace | Qua |
| HTTP trang chạy cục bộ | 200 tại cổng 5175 |

Cho từng ngày, các kiểm tra dữ liệu gồm: 54 số câu liên tục, 9 dạng, nguồn ảnh và trang đáp án đúng phạm vi, toàn đúng = 100%, toàn sai = 54 sai, bỏ trống = 54 bỏ trống, khôi phục phiên quá deadline thành timeout. Kiểm tra giao diện gồm: chưa bấm thì chưa tạo phiên, nộp xong khóa phương án, nhóm đoạn có đủ năm câu, mở/đóng đáp án riêng và toàn bộ không tạo phiên mới.

Trên trình duyệt thật đã quan sát kho đủ 20 bài khi chưa đăng nhập; bắt đầu, chọn đáp án và tải lại vẫn giữ lựa chọn/deadline. Bước xác nhận mặc định của trình duyệt làm công cụ tự động bị kẹt, nên đã thay bằng hộp thoại trong trang và kiểm tra lại bằng DOM. Chưa coi các bài kiểm tra DOM là kiểm tra hình học/layout trên mọi điện thoại.

## Giới hạn nội dung được giữ rõ

- Text đã đối chiếu là nội dung hiển thị chính; bản quét chỉ dùng tham khảo mở chủ động. Đáp án tính điểm lấy từ bảng đã đối chiếu.
- Đã có bản chép text của đủ 20 ngày; kiểm định cấu trúc tự động bổ sung cho việc đối chiếu nguồn, không chứng minh nội dung miễn mọi lỗi biên tập.
- Sách có bảng đáp án. Đã bổ sung riêng 1.080 lời giải tham khảo; không coi lời giải biên soạn là chính thức. Bản gốc nội dung biên soạn ngày 1 được lưu trong `day01-editorial.json`, bản dịch/phân tích cũ giữ draft.
- Còn cảnh báo bản dựng về gói chung của ứng dụng lớn và import tĩnh/động ở các module SRS. Chưa tái cấu trúc toàn ứng dụng trong phạm vi phần đề.
- npm audit hiện báo các cảnh báo phụ thuộc; chưa tự chạy thay phiên bản hàng loạt bằng audit fix/force trong đợt chức năng này.

Địa chỉ để người dùng kiểm tra: `http://127.0.0.1:5175/exams/jlpt`. Không cần đăng nhập, không lưu lịch sử lâu dài; một phiên tạm theo tab với TTL 24 giờ.
