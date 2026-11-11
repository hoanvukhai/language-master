# QA giao diện và luồng JLPT — rà soát code hiện tại

Ngày kiểm tra bổ sung: 08/11/2026 (Asia/Bangkok). Mốc code: `df17547` — `feat(jlpt-exam): complete N2 20-day exam bank, multi-book lookup, UI redesign & audit fixes`, commit ngày 07/11/2026. Khi kiểm tra, không có thay đổi source chưa commit; chỉ thư mục bằng chứng QA chưa được theo dõi. Không sửa source hoặc test.

Tài liệu này ghi kết quả đọc code và chạy logic nhỏ. Những mục chưa thao tác trên trình duyệt được ghi rõ; ảnh và kết quả thao tác trực tiếp do báo cáo QA tổng hợp bổ sung.

**Cập nhật sau kiểm thử trình duyệt:** các mục 2, 3 và 4 dưới đây cũng đã được tái hiện trực tiếp. Xem README.md để đọc kết luận cuối, ảnh 04/05, 12 và 08; README bổ sung lỗi lưu trùng từ, mục lục không theo bộ lọc và bố cục thanh phiên trên điện thoại. Các câu “cần đối chiếu” bên dưới mô tả thời điểm rà soát code ban đầu.

## Các vấn đề xác định được

### 1. P2 — Tìm kiếm trong sách không trả về trạng thái rỗng

- **Tái hiện trên trình duyệt đã có:** mở sách N2 → nhập `zzznomatch` vào “Tìm sách hoặc bài” → vẫn thấy danh sách đủ 20 bài. Ảnh: `03-search-no-match.jpg`.
- **Nguyên nhân:** `JLPTExamHub.tsx:57–66` lọc bỏ cuốn sách khi không còn bài khớp, nhưng `89–92` lại lấy cuốn sách chưa lọc làm giá trị dự phòng. Giao diện ở `520` lặp trực tiếp `selectedBook.exams`, nên toàn bộ bài xuất hiện lại.
- **Ảnh hưởng:** người học không phân biệt được “không có kết quả” với “tìm được tất cả”; tìm sai từ khóa vẫn thấy đề không liên quan.
- **Hướng sửa:** giữ thông tin cuốn sách đang mở độc lập với tập bài đã lọc. Khi tập bài rỗng, hiển thị 0 bài, trạng thái không tìm thấy và nút xóa tìm kiếm.
- **Tiêu chí kiểm tra lại:** tìm `Day 2` trả đúng các bài phù hợp; tìm chuỗi không khớp trả 0; xóa từ khóa khôi phục 20 bài; quay lại danh sách sách vẫn giữ hoặc xóa bộ lọc theo hành vi đã chọn rõ ràng.

### 2. P2 — Xem trước số câu không khớp lượt luyện được tạo

- **Đã xác nhận bằng thực thi picker trên dữ liệu thật:** chọn Ngày 1, đủ 9 Mondai, “Số câu bằng nhau mỗi Mondai”, 10 câu/dạng. Xem trước tính **54**, nhưng lượt được tạo có **52** câu, phân bố `5,5,5,7,5,5,10,5,5`.
- **Nguyên nhân:** `ExamWorkspace.tsx:710–722` dùng `min(tổng câu phù hợp, số dạng × số câu mỗi dạng)`. Picker ở `practicePool.ts:165–180` áp hạn mức riêng cho từng Mondai. Hai cách tính khác nhau khi từng dạng có lượng câu khác nhau.
- **Trường hợp liên quan:** chế độ tổng số câu lấy nguyên cụm đoạn văn nên số câu thực tế có thể vượt mục tiêu; xem trước `719–722` luôn ghi đúng con số mục tiêu mà không nói đây là số tối thiểu hoặc có thể tăng để giữ cụm. Việc giữ nguyên cụm là đúng; vấn đề nằm ở cách báo số lượng.
- **Ảnh hưởng:** người học chọn lượng bài để phù hợp thời gian nhưng được số câu khác với phần xác nhận trước khi bắt đầu.
- **Hướng sửa:** dùng chung quy tắc tính số lượng với picker. Với lựa chọn có yếu tố ngẫu nhiên/cụm, có thể chuẩn bị lượt trước rồi báo số câu thực tế, hoặc ghi rõ khoảng/khả năng tăng vì giữ đoạn văn.
- **Tiêu chí kiểm tra lại:** số câu xem trước bằng số câu sau Bắt đầu trong cấu hình theo từng Mondai; trường hợp tổng số câu gặp cụm 5 câu có thông báo chính xác; các cấu hình thiếu câu trong một dạng vẫn báo số lượng thật.

### 3. P2 — Trang chuẩn bị thi trộn hiển thị 1.080 câu thay vì 54

- **Đã xác nhận bằng code + chạy picker; cần đối chiếu ảnh đường dẫn trực tiếp:** khi chưa có lượt đang làm, mở `/exams/jlpt/pool-N2-kokusho-n2-20days/mock`.
- `ExamWorkspace.tsx:1253` hiển thị `exam.totalQuestions` cho chế độ mock; `buildPracticePool()` tạo ngân hàng có `totalQuestions=1080` (`practicePool.ts:69`). Khi bấm Bắt đầu, `ExamWorkspace.tsx:419–427` chỉ lấy 54 câu theo tỷ lệ chuẩn. Chạy picker thực tế trả đúng 54.
- **Ảnh hưởng:** một người mở liên kết trực tiếp hoặc quay lại liên kết khi lượt đã mất sẽ thấy “1080 câu · 50 phút”, dù nút vào nhanh từ kho đề chạy bài 54 câu đúng.
- **Hướng sửa:** phân biệt tổng câu của ngân hàng với số câu của lượt chuẩn bị làm, dùng số câu dự kiến của lượt ở ô xác nhận.
- **Tiêu chí kiểm tra lại:** cả vào nhanh từ kho và mở đường dẫn trực tiếp đều mô tả cùng lượt thi 54 câu; ngân hàng 1.080 câu chỉ hiển thị trong thông tin nguồn.

### 4. P2 — Học lời giải sau khi trả lời vẫn bị tính là hỗ trợ trước khi kiểm tra

- **Đã xác nhận đường đi từ code; cần đối chiếu thao tác trực tiếp:** trong luyện theo dạng, trả lời một câu đơn để câu bị khóa và mở lời giải → bấm “Nghe câu” hoặc “Dịch câu” → kết thúc lượt. Câu đó được thêm vào `assisted`, dù trợ giúp chỉ được dùng sau khi đáp án đã khóa.
- `ExamQuestionCard.tsx:313` và `336` luôn gọi `onAssist`. `ExamWorkspace.tsx:471–480` thêm các câu của đơn vị hiện tại mà không loại câu đã `committed`. `update()` chỉ kiểm tra cả lượt đang làm, không kiểm tra câu đã khóa (`236–240`). Kết quả lại diễn giải là “câu có hỗ trợ **trước khi kiểm tra**” (`1401–1403`). Tra từ bằng F9 cũng có cùng thiếu sót (`204–220`).
- **Ảnh hưởng:** việc đọc/nghe/tra từ trong quá trình chữa bài làm giảm độ tin cậy của thống kê học độc lập. Đặc biệt đây là thao tác tự nhiên của chế độ luyện có lời giải ngay.
- **Hướng sửa:** chỉ ghi nhận hỗ trợ cho câu chưa chốt tại thời điểm dùng. Nếu muốn đo cả hoạt động học sau đáp án, nên tách số liệu với tên đúng nghĩa.
- **Tiêu chí kiểm tra lại:** trợ giúp trước khi chốt tăng số hỗ trợ; trợ giúp sau khi chốt không tăng; với nhóm 5 câu, chỉ tăng trước “Kiểm tra nhóm”; trợ giúp sau nộp không sửa kết quả.

### 5. P2 — Lỗi dịch trực tuyến có thể được lưu thành nghĩa từ

- **Xác định từ code, chưa mô phỏng mạng lỗi trên trình duyệt:** tra từ trực tuyến khi mạng/API thất bại hoặc không có nội dung dịch. `lookupExternal()` trả chuỗi “Không tìm thấy bản dịch phù hợp.” trong trường `translation` (`src/lib/dictionary/multiBookLookup.ts:208–215`).
- `WordLookupModal.tsx:380–401` coi mọi `externalResult` là một bản dịch và vẫn hiển thị nút “Lưu vào sổ tay”. Hàm lưu nhận nguyên chuỗi thông báo lỗi làm nghĩa (`395`); `multiBookLookup.ts:262–268` ghi nguyên giá trị đó vào dữ liệu từ vựng.
- **Ảnh hưởng:** người dùng có thể tạo mục từ mang thông báo lỗi thay vì nghĩa; lỗi kết nối đang được trình bày như kết quả hợp lệ.
- **Hướng sửa:** mô hình kết quả cần phân biệt thành công, không tìm thấy và lỗi mạng. Chỉ cho lưu khi có nghĩa hợp lệ; cung cấp nút thử lại cho lỗi mạng.
- **Tiêu chí kiểm tra lại:** mất mạng/HTTP lỗi không hiện nút lưu bản dịch; kết quả thành công mới có nút lưu; thao tác thử lại hiển thị kết quả cho đúng từ hiện đang tra.

## Những lỗi cũ không nên tiếp tục báo là còn tồn tại

Đọc code hiện tại thấy đã có sửa cho: gắn trạng thái chọn vào checkbox Mondai; liên kết nội dung lựa chọn với radio; chặn phím trả lời khi hộp thoại đang mở; bảo vệ kết quả tra từ cũ khi đổi sang từ mới; lưu từ vào sổ tay đúng loại thay vì chọn khóa học đầu tiên; ghi rõ điểm quy đổi là tham khảo nội bộ. Kết quả thực thi logic về nhóm đoạn văn, hai ô trống và lưu phiên được ghi riêng trong `logic-results.json`. Đánh giá cuối cùng phải ưu tiên lần kiểm thử hiện tại thay vì lặp lại nhận xét trước khi sửa.

## Trạng thái chưa kết luận

- Hộp tra từ ở chiều cao màn hình rất thấp: phần ngoài `overflow-hidden`, thân có `max-h-[75vh]` cộng tiêu đề. Cần thử máy ngang/chiều cao thấp để biết có cắt phần cuối hay không; **chưa tính là lỗi**.
- Không xác nhận chất lượng phát âm/giọng nói thực tế bằng việc chỉ đọc code.
- Không xem việc bộ câu hỏi đang có N2 mà chưa có N1/N3/N4/N5 là lỗi chức năng nếu cấp độ rỗng được thông báo rõ.
- Không có kết luận rằng toàn bộ 1.080 lời giải đều đúng ngữ nghĩa chỉ từ kiểm thử chương trình; kiểm chứng học thuật từng câu là một phạm vi khác.

## Nhận định thiết kế

Giữ ba hướng học hiện tại là hợp lý: luyện từng dạng để chữa bài ngay, làm bài có giờ để giữ đáp án đến lúc nộp, và xem đề/lời giải để học tự do. Các vấn đề xác định trên chủ yếu cần làm chính xác trạng thái, số lượng và nhãn thống kê; không đòi hỏi thiết kế lại toàn bộ kiến trúc. Nên sửa tính nhất quán này trước khi bổ sung chế độ mới hoặc thêm mức điểm/lịch sử dài hạn.
