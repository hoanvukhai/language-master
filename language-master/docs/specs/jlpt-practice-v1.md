# Đặc tả chức năng và thiết kế phần luyện đề JLPT — V1

Ngày lập: 05/11/2026; cập nhật: 06/11/2026. Trạng thái: **đã triển khai V1, đủ 20 ngày dạng text đã đối chiếu; xem bổ sung mục 24**.

Tài liệu này chốt phạm vi, hành vi, dữ liệu, giao diện và điều kiện nghiệm thu để triển khai phần luyện đề JLPT đang phát triển. Các yêu cầu bên dưới mô tả sản phẩm cần đạt, không phải các chức năng đã hoàn thành. Việc lập tài liệu không sửa mã ứng dụng, không nhập thêm đề và không thực hiện OCR toàn bộ sách.

**Quyết định đã được người dùng chốt:** mọi người sử dụng được mà không cần đăng nhập; dùng sessionStorage để lưu tạm trong tab; không có lịch sử lâu dài, lưu kết quả theo tài khoản hoặc đồng bộ. Quyết định này thay thế đề xuất IndexedDB và phân vùng user/guest trong bản nháp trước.

## 1. Mục tiêu và phạm vi

### 1.1. Mục tiêu sản phẩm

Người học có thể chọn bài từ sách, luyện từng dạng, tự kiểm tra có giờ, hiểu lỗi sai và luyện lại, không cần đăng nhập. Khi trình duyệt cho phép, bài hiện tại được lưu tạm để tải lại hoặc đi về giữa các trang trong cùng tab vẫn tiếp tục được. Kết quả chỉ phục vụ lượt đang làm/xem trong tab, không tạo hồ sơ thành tích lâu dài.

Luồng học chính:

**Chọn bài → luyện theo dạng → làm bài có giờ → xem kết quả → chữa câu sai → luyện lại.**

Giữ ba chế độ chính:

1. **Luyện theo dạng (Mondai)**: làm bài và nhận phản hồi để học.
2. **Làm bài có giờ**: tự kiểm tra một bài với thời lượng xác định.
3. **Xem đề & lời giải**: đọc tài liệu, không tạo lượt làm bài.

“Xem lại kết quả hiện tại” và “Luyện lại câu sai” là các luồng hỗ trợ ba chế độ trên; không tạo chế độ chính thứ tư. Không có màn Lịch sử trong V1.

### 1.2. Phạm vi bắt buộc của V1

- Tiếng Nhật, ưu tiên sách N2 “20日で合格 — 文字・語彙・文法”.
- Hoàn thiện ngày 1 hiện có: 54 câu, 9 Mondai, một đoạn văn dùng chung cho câu 50–54.
- Ba chế độ, hiển thị đủ ngữ cảnh và định dạng đề.
- Truy cập đầy đủ ba chế độ cho cả người chưa đăng nhập và người đã đăng nhập, không khác quyền sử dụng.
- Lưu tạm một lượt hiện tại trong sessionStorage của tab; khôi phục, xem kết quả và luyện lại câu sai khi phiên tạm còn hiệu lực.
- Cho làm bằng bộ nhớ nếu không lưu tạm được; báo giới hạn rõ, không chặn bắt đầu.
- Phân biệt dữ liệu gốc, nội dung bổ sung và dữ liệu người học.
- Kiểm định dữ liệu trước khi đưa vào danh mục chính.
- Giao diện dùng được trên máy tính và điện thoại, hỗ trợ nền sáng/tối hiện có.

V1 được nghiệm thu bằng ngày 1. Hoàn thành 19 ngày còn lại không phải điều kiện để nghiệm thu phần chức năng V1.

### 1.3. Ngoài phạm vi V1

- Mô phỏng JLPT đủ đọc hiểu/nghe hiểu và chấm điểm chuẩn hóa JLPT.
- Đề thích ứng, xếp hạng thi, chống gian lận hoặc giám sát người làm bài.
- Lịch sử nhiều lượt, tiến độ lâu dài, điểm hồ sơ, xếp hạng, lưu câu để ôn lâu dài.
- Lưu lượt làm bằng localStorage/IndexedDB, phân vùng user/guest, ghi Firestore hoặc đồng bộ nhiều thiết bị.
- Tải trọn sách kèm ảnh/audio để bảo đảm sử dụng ngoại tuyến từ lần mở đầu.
- Tự động đưa câu sai vào SRS, tự giảm độ thành thạo của từ/ngữ pháp.
- Sinh lời giải tự động ngay trong phiên học; trình nhập/OCR PDF dành cho người dùng cuối.
- Mở thêm tiếng Anh, Trung, Hàn; mini-game, huy hiệu và hoạt ảnh mới.
- Thay toàn bộ kiến trúc hoặc hệ thống thiết kế của ứng dụng.

## 2. Cơ sở hiện trạng và giới hạn xác minh

| Hạng mục | Hiện trạng đã xác minh |
|---|---|
| Điều hướng | Có mục Luyện đề, trang chọn ngôn ngữ, kho JLPT và ba chế độ |
| Dữ liệu N2 | Ngày 1 có 54 câu, 9 Mondai, đoạn văn và đáp án |
| Dữ liệu N3 | Bản mẫu 3 câu, 2 Mondai; chưa đủ để gọi là đề đầy đủ |
| Đáp án ngày 1 | Đã đối chiếu cả 54 đáp án với bảng đáp án PDF trang 167; tất cả khớp |
| Nội dung bổ sung | Có lời giải 54 câu; một câu có phân tích thủ công; chưa xác minh toàn bộ bản dịch/lời giải |
| PDF | 176 trang; không có lớp chữ trích xuất được; OCR cần xử lý ảnh |
| Vị trí ngày 1 | PDF trang 5–12, tương ứng trang sách 6–13; đáp án PDF trang 167 |
| Tích hợp | Có đăng nhập, từ điển, phát âm, thống kê thời gian và nền tảng cache dùng chung |
| Bài làm | Chưa có kho lượt làm đề bền vững; trạng thái hiện tại chủ yếu ở bộ nhớ trang |
| Kiểm tra mã | TypeScript không báo lỗi ở lần rà soát; kiểm tra quy tắc mã phạm vi liên quan còn 8 lỗi |

Rà soát dựa trên mã, dữ liệu, PDF và tài liệu tham khảo. Chưa hoàn thành kiểm tra trực quan trong trình duyệt do công cụ điều khiển trình duyệt bị dừng. Các kích thước/bố cục bên dưới là mục tiêu thiết kế cần kiểm chứng khi triển khai, không phải kết quả đo giao diện hiện tại.

## 3. Danh mục giữ, thêm, sửa, bỏ

| Hành động | Hạng mục | Quyết định V1 |
|---|---|---|
| Giữ | Ba mục đích học | Giữ luyện theo dạng, làm bài có giờ, xem đề/lời giải |
| Giữ | Sách → ngày → Mondai → câu | Giữ cấu trúc nội dung và một JSON cho một ngày |
| Giữ | Định danh | Giữ examId, bookId, questionId, số câu và thứ tự phương án hiện có |
| Giữ | Giao diện chung | Dùng màu chủ đạo, nền sáng/tối, kiểu nút và điều hướng chung của ứng dụng |
| Giữ | Hạ tầng hiện có | Tận dụng từ điển, phát âm và giao diện chung; không tạo phụ thuộc đăng nhập |
| Thêm | Trang chi tiết bài | Nêu phạm vi, số câu, thời lượng, phiên hiện tại trong tab và lối vào ba chế độ |
| Thêm | Quản lý lượt hiện tại | Bắt đầu, tiếp tục, chốt, xem kết quả, thay lượt hoặc xóa phiên tạm |
| Thêm | Đơn vị câu/nhóm | Một câu độc lập hoặc cả nhóm cùng đoạn văn; không làm mất ngữ cảnh |
| Thêm | Luyện lại | Tạo lượt mới từ câu sai, bỏ trống hoặc câu chưa chắc của lượt nguồn |
| Thêm | Kiểm định dữ liệu | Schema, parser định dạng, kiểm tra liên kết và trạng thái duyệt |
| Thêm | Lưu tạm theo tab | sessionStorage, hết hạn, xóa đúng key và chuyển sang bộ nhớ khi lưu lỗi |
| Sửa | Tên chế độ | Luyện theo dạng; Làm bài có giờ; Xem đề & lời giải |
| Sửa | Làm bài | Tách lựa chọn nháp, kiểm tra/chốt và xem lời giải |
| Sửa | Chấm kết quả | Đếm đúng/sai/bỏ trống; giữ bất biến sau khi nộp |
| Sửa | Đồng hồ | Dùng hạn kết thúc thực tế, không trừ theo số lần bộ đếm chạy |
| Sửa | Hiển thị đề | Render đoạn văn, chú thích, gạch chân, ô trống và vị trí sao đúng |
| Sửa | Trợ giúp | Một chính sách chung điều khiển cả công cụ trong câu và công cụ toàn cục |
| Sửa | Kho đề | Giảm phần giới thiệu, ưu tiên nội dung đang có, bài dở và bộ lọc |
| Sửa | Tra từ tự động | Gọi là gợi ý tra từ; giữ từ gốc, phân biệt khớp chính xác và gợi ý |
| Bỏ | Kết luận không có cơ sở | Bỏ “đạt chuẩn JLPT”, quy đổi tuyến tính ra /60 và nhãn toàn đề cho bài ngày |
| Bỏ | Sửa kết quả đã chốt | Không cho đổi đáp án của cùng lượt sau chốt; làm lại tạo lượt mới thay phiên hiện tại có thông báo |
| Bỏ | Lưu trữ vượt phạm vi | Bỏ IndexedDB, kho lịch sử, bookmarks, ownerKey và xử lý ghi đè giữa tab khỏi thiết kế V1 |
| Bỏ | Nội dung mẫu trong kho chính | N3 sample chuyển sang dữ liệu mẫu nội bộ; giữ file phục vụ phát triển |
| Bỏ | Quảng bá chưa được chứng minh | Bỏ “100% Native”, “Offline-first”, “Không độ trễ” khỏi luồng người học |
| Bỏ | Trạng thái giao diện sai | Sửa mở sách cần hai lần bấm, mở lời giải từng câu và tổng số câu khi lọc |

“Bỏ” ở đây là bỏ hành vi hoặc nội dung khỏi sản phẩm chính. Không tự xóa PDF, dữ liệu nguồn, dữ liệu mẫu hay các chức năng học khác.

## 4. Thuật ngữ và quy tắc chung

- **Bài**: một ngày hoặc một tập câu có định danh, phạm vi và phiên bản nội dung.
- **Mondai**: nhóm câu cùng dạng; số Mondai chỉ có ý nghĩa trong bài/nguồn đó.
- **Đơn vị luyện**: một câu độc lập hoặc toàn bộ các câu dùng chung passageId.
- **Lượt làm (attempt)**: một lần luyện hoặc làm bài có giờ; có ID riêng.
- **Lựa chọn nháp**: đáp án có thể đổi trước khi kiểm tra/chốt.
- **Đáp án đã chốt**: lựa chọn được ghi nhận khi bấm Kiểm tra hoặc nộp bài.
- **Cờ chưa chắc**: dấu tạm trong lượt làm; không đồng nghĩa sai hoặc chưa làm.
- **Phiên tạm của tab**: một vùng lưu chứa lượt hiện tại, gồm bài đang làm hoặc kết quả vừa nộp; không có danh sách các lượt cũ.
- **Phiên bản nội dung**: bản đề, thứ tự lựa chọn, đáp án và nội dung học dùng khi bắt đầu lượt.

Quy tắc chung:

1. Mỗi câu có một lựa chọn đúng theo dữ liệu đã duyệt. V1 giữ nguyên thứ tự phương án.
2. Câu 52 dù có ba ô 52-a/b/c vẫn là một câu, một lựa chọn và một đơn vị tính kết quả.
3. Không tự đánh dấu “đã thuộc” từ việc chọn đúng hoặc xem lời giải.
4. Xem tài liệu không tạo lượt thi và không làm tăng số bài hoàn thành.
5. Đề gốc, chú thích và furigana có sẵn trong đề được giữ; phiên âm/dịch bổ sung của ứng dụng là trợ giúp.
6. Sách hiện tại thuộc phạm vi Chữ – Từ vựng – Ngữ pháp. Ngữ pháp trong đoạn văn không biến bài này thành đề đủ phần Đọc hiểu.
7. Trạng thái đăng nhập không ảnh hưởng quyền vào bài, dữ liệu phiên hoặc kết quả. Không ghi điểm/tiến độ đề vào tài khoản.

## 5. Kiến trúc điều hướng và các màn hình

### 5.1. Luồng chính

Kho JLPT → sách/ngày → chi tiết bài → chọn chế độ → làm/đọc → kết quả nếu có → chữa bài hoặc luyện lại.

Trang chi tiết bài là nơi tập trung thông tin; các nút truy cập nhanh ở danh sách vẫn được giữ. Mở đường dẫn trực tiếp vào chế độ phải đi qua cùng quy tắc chuẩn bị/khôi phục, không tự tạo nhiều lượt hoặc chạy đồng hồ.

### 5.2. Đường dẫn dự kiến

| Đường dẫn | Trách nhiệm |
|---|---|
| /exams | Chọn/đổi ngôn ngữ; người đã chọn có thể vào lại kho gần nhất |
| /exams/jlpt | Kho sách/ngày, bộ lọc, bài đang làm dở |
| /exams/jlpt/:examId | Chi tiết bài, tiến độ và ba lựa chọn |
| /exams/jlpt/:examId/drill | Chuẩn bị phiên luyện hoặc tiếp tục lượt được chỉ định |
| /exams/jlpt/:examId/mock | Chuẩn bị bài có giờ hoặc tiếp tục lượt được chỉ định |
| /exams/jlpt/:examId/review | Xem đề/lời giải tự do, không tạo hoặc thay phiên làm bài |
| /exams/jlpt/:examId/result | Kết quả đã nộp còn trong tab; có chế độ xem lại chi tiết |

Giữ tương thích các URL chế độ hiện có. Không tạo route history hoặc kho truy xuất attempt theo ID. Route result chỉ mở kết quả khi phiên hiện tại khớp examId và đã nộp; nếu không, hiện “Không có kết quả của bài này trong tab hiện tại” và lối vào bài. ID bài sai phải có thông báo và đường quay về, không tạo trang trắng.

Bộ lọc cấp độ, sách, từ khóa được giữ khi quay về kho. Trạng thái mở sách và vị trí cuộn được phục hồi trong phiên điều hướng. Không dùng trạng thái bộ lọc làm dữ liệu bài làm.

### 5.3. Kho và chi tiết bài

- Đầu trang: tên kho, chọn cấp độ và tìm kiếm; không có lối vào lịch sử.
- Có lượt dở còn hiệu lực: hiện khối Làm tiếp trong tab này, tên bài, chế độ, số câu đã làm và hạn kết thúc nếu có.
- Có kết quả hiện tại: hiện Xem kết quả trong tab này; không gọi là kết quả gần nhất trong lịch sử.
- Danh sách: sách → các ngày đã có. Hiện số bài thực sự phát hành, không coi đủ 20 ngày chỉ từ tên sách.
- Ngôn ngữ chưa hoạt động: nhãn chưa có nội dung ở khu vực phụ, không quảng bá như tính năng sẵn sàng.
- Lọc không có kết quả: “Không tìm thấy bài phù hợp” và nút xóa bộ lọc. Phân biệt với “Chưa có bài ở cấp độ này”.
- Chi tiết bài: sách, ngày, phạm vi, số câu, các dạng, thời lượng luyện đề xuất và trạng thái phiên hiện tại nếu khớp bài.
- Ba lựa chọn có một câu mô tả; bài dở ưu tiên Làm tiếp. Không dùng ba nút nổi bật ngang nhau trong mọi trạng thái.
- Không hiển thị tiến độ dài hạn/nhãn đã học của từng ngày. Nếu có tiến độ phiên, ghi rõ phạm vi của lượt hiện tại; hoàn thành một Mondai không làm cả ngày thành hoàn tất.
- Thiếu thời lượng hoặc thời lượng không hợp lệ: vô hiệu hóa làm bài có giờ và nêu lý do; không tự gán 60 phút.

## 6. Quyền thao tác và trợ giúp theo chế độ

| Hành vi | Luyện trước kiểm tra | Luyện sau kiểm tra | Bài có giờ đang làm | Xem lại lượt đã nộp | Xem đề/lời giải |
|---|---|---|---|---|---|
| Chọn/đổi phương án | Có | Không | Có trước hạn | Không | Không |
| Hiện đúng/sai | Không | Có | Không | Có | Chỉ đáp án chuẩn, không có kết quả cá nhân |
| Mở lời giải | Không | Có | Không | Có | Có theo yêu cầu |
| Dịch/tra từ/phát âm bổ sung | Có theo yêu cầu, ghi nhận hỗ trợ | Có | Không | Có | Có |
| Đề gốc, bài đọc, chú thích gốc | Có | Có | Có | Có | Có |
| Cờ chưa chắc trong lượt | Có | Có | Có | Chỉ xem cờ đã nộp | Không |
| Lưu câu để ôn lâu dài | Không | Không | Không | Không | Không |
| Ghi kết quả lượt làm | Khi chốt/kết thúc | Giữ kết quả đã chốt | Khi nộp/hết giờ | Không tính lại | Không |

Chính sách phải áp dụng tới nút loa, Hán Việt, dịch, popup bôi đen, phím tắt và các sự kiện mở tra từ toàn cục. Khi vào bài có giờ, đóng trợ giúp đang mở và dừng âm thanh trợ giúp đang phát. Khi rời chế độ, trả về sở thích trước đó; không sửa vĩnh viễn cài đặt người học.

Trong luyện tập, trợ giúp dùng trước lúc chốt phải được ghi nhận. Trợ giúp dùng trong đoạn văn chung đánh dấu cả đơn vị đó là có hỗ trợ. Mở công tắc nhưng chưa thực sự dùng không tính là đã hỗ trợ. Nếu công cụ toàn cục chưa ghi nhận được việc sử dụng, tắt nó trong phiên luyện và dùng công cụ trong phiên có theo dõi.

## 7. Đặc tả Luyện theo dạng

### 7.1. Chuẩn bị

- Chọn một Mondai hoặc trộn tất cả dạng trong toàn bộ sách/cấp độ đang chọn. Chọn 10, 20, 50 hoặc tất cả câu; không trộn nhiều sách/cấp độ trong một lượt hiện tại.
- Hiện số câu thực tế, số nhóm có đoạn văn và quy tắc phản hồi.
- Trộn ngẫu nhiên các đơn vị câu/nhóm đoạn văn, không lặp câu trong lượt. Giữ thứ tự câu trong nhóm chung đoạn và giữ nguyên thứ tự bốn phương án vì chúng khớp ảnh gốc. Số câu thực tế có thể cao hơn mức chọn nếu cần giữ trọn nhóm.
- Chỉ sau khi bấm Bắt đầu luyện và xác nhận thay phiên nếu cần mới tạo attempt. Cùng bài/chế độ có lượt dở trong tab thì ưu tiên tiếp tục. Mọi lượt Drill/Mock mới thay phiên hiện tại của tab, kể cả khi chọn bài khác; yêu cầu xác nhận nếu tab đang có bài làm hoặc kết quả, nêu rõ bản cũ sẽ không còn được giữ.

### 7.2. Câu độc lập

1. Hiện hướng dẫn Mondai, câu hỏi và phương án.
2. Chọn phương án chỉ là nháp; được sửa và được lưu ngay.
3. Bấm Kiểm tra để chốt. Nút chỉ hoạt động khi đã có lựa chọn.
4. Chốt một lần: lưu đáp án, đúng/sai, dấu hỗ trợ; khóa lựa chọn.
5. Hiện phản hồi, đáp án và nút mở lời giải. Không tự chuyển khi người học chưa đọc.
6. Bấm Câu tiếp để đi tiếp.

“Lần đầu” là lần chốt đầu trong lượt hiện tại. Không theo dõi lần đầu từng nhìn thấy câu qua nhiều phiên.

### 7.3. Nhóm có đoạn văn

- Hiện toàn đoạn, chú thích và mọi câu cùng passageId.
- Chọn/sửa nháp cho tất cả câu; không phản hồi từng câu trước khi kiểm tra nhóm.
- Nút Kiểm tra nhóm hoạt động khi đã chọn đủ cả nhóm.
- Chốt toàn nhóm bằng một lần chuyển trạng thái, thử ghi cả phiên tạm rồi mới hiện đáp án/lời giải; không phản hồi từng phần của nhóm.
- Bỏ qua nhóm giữ lựa chọn nháp, không tiết lộ đáp án; có thể quay lại.
- Nút kết thúc phiên cảnh báo các câu chưa chốt. Nếu người học vẫn kết thúc, chốt các lựa chọn nháp đã có cùng lúc, câu chưa chọn thành bỏ trống và chỉ mở lời giải sau kết thúc.

### 7.4. Bỏ qua, kết thúc và luyện lại

- Bỏ qua không lập tức tính sai; trong phiên nó vẫn là chưa chốt.
- Kết thúc: báo số chưa chốt/bỏ trống; sau xác nhận tạo kết quả cố định.
- Câu đã chốt không được đổi để làm tăng điểm của lượt đó. Luyện lại tạo attempt mới và thay phiên hiện tại; không lưu sourceAttemptId hoặc bản lưu trữ của lượt cũ.
- Luyện lại câu sai/bỏ trống/chưa chắc chỉ lấy phạm vi từ kết quả đang còn trong tab. Tính danh sách câu đích và phạm vi nhóm trước khi thay phiên; cho xem số câu và xác nhận bắt đầu, kèm thông báo kết quả cũ sẽ bị thay thế.
- Nếu câu đích thuộc đoạn văn, đưa cả nhóm vào lượt mới. Hiện rõ, ví dụ “1 câu cần ôn; 5 câu thực hành để giữ ngữ cảnh”. Chấm cả 5 câu ở lượt mới, giữ targetQuestionIds để nhận biết câu đích.
- Các loại lọc được hợp nhất theo questionId, không thêm câu trùng.
- Không có câu phù hợp: vô hiệu hóa nút luyện lại tương ứng và nêu lý do.

## 8. Đặc tả Làm bài có giờ

### 8.1. Trước khi bắt đầu

Hiện tên, phạm vi, số câu và thời lượng. Với ngày 1, 50 phút là thời lượng luyện tập cấu hình trong dữ liệu, không gắn nhãn thời lượng chuẩn của toàn đề N2.

Thông báo ngắn: “Thời gian không tạm dừng khi bạn rời trang. Bài được lưu tạm trong tab này; không bảo đảm khôi phục sau khi đóng tab.”

- Có thể tải và kiểm tra nội dung trước, nhưng chỉ sau khi người học bấm Bắt đầu và xác nhận thay phiên nếu cần mới tạo attempt, cập nhật RAM, thử ghi sessionStorage và khởi động đồng hồ. Lấy cùng một thời điểm cho createdAt = startedAt; deadlineAt = startedAt + durationSeconds × 1000; expiresAt = createdAt + 24 giờ. Các timestamp dùng epoch milliseconds. Không tạo/ghi phiên khi mới mở màn chuẩn bị; không phụ thuộc đăng nhập hoặc kết nối tài khoản.
- V1 dùng thời lượng của bài, chưa có tùy chỉnh thời gian trong luồng này.
- Không lưu được: vẫn cho bắt đầu bằng bộ nhớ; hiện “Phiên này không được lưu tạm; tải lại trang có thể mất bài.” Đồng hồ chạy theo cùng quy tắc, không yêu cầu người học sửa cài đặt mới được dùng.
- Thiếu câu/đáp án/đoạn liên quan hoặc dữ liệu chưa phát hành: không bắt đầu bài có giờ.

### 8.2. Trong khi làm

- Hiển thị theo Mondai/nhóm; có chuyển trước/sau và phiếu câu hỏi.
- Được đổi lựa chọn và cắm/bỏ cờ khi chưa nộp và chưa hết giờ.
- Cho bỏ trống; không bắt trả lời hết mới nộp.
- Phiếu thể hiện số câu gốc, đã chọn/chưa chọn/cắm cờ. Không tiết lộ đúng/sai.
- Không có nút tạm dừng. Rời trang không kết thúc lượt và không dừng đồng hồ.
- Trước điều hướng chủ động ra khỏi bài: lưu các thay đổi đang chờ; thông báo ngắn về đồng hồ và cho tiếp tục rời trang. Không phụ thuộc hộp thoại đóng tab để bảo vệ dữ liệu.
- Đăng nhập/đăng xuất không đổi phiên, không đặt lại đồng hồ và không gắn đáp án với tài khoản. Nếu quá trình đó tải lại trang, khôi phục theo cùng quy tắc sessionStorage.

### 8.3. Đồng hồ và hạn kết thúc

- Lưu startedAt, durationSeconds, deadlineAt đúng một lần lúc bắt đầu.
- Thời gian còn lại = max(0, deadlineAt − thời điểm hiện tại).
- Bộ đếm chỉ cập nhật màn hình; không ghi vào kho mỗi giây.
- Kiểm tra hạn lúc khôi phục, trở lại tab, nhận thao tác chọn đáp án và trước khi nộp.
- Sau hạn: không nhận lựa chọn mới dù màn hình đồng hồ chưa kịp cập nhật.
- Khi chuyển tab/máy ngủ, thời gian vẫn trôi đúng theo hạn đã lưu.
- Khi ứng dụng hoạt động lại và phiên tạm vẫn còn hợp lệ, nếu đã quá deadline thì chốt timeout. Nếu đóng tab làm mất phiên hoặc phiên đã quá hạn lưu tạm, thông báo không còn phiên để khôi phục; không hứa có tiến trình nền tự nộp hoặc giữ kết quả sau đóng tab.
- Client clock phục vụ tự luyện; không được quảng bá chống sửa giờ máy hoặc bảo đảm độ tin cậy như hệ thống thi có giám sát.

### 8.4. Nộp và hết giờ

- Nộp sớm: hộp xác nhận hiện đã chọn, chưa chọn và cắm cờ; có quay lại bài.
- Hết giờ: khóa nhập, đóng hộp nộp đang mở và tự chốt; không đòi thêm xác nhận.
- Nộp một lần cho mỗi attempt. Nộp tay, bấm lặp và timeout đồng thời không tạo nhiều kết quả.
- Chốt các sự kiện trả lời hợp lệ đã nhận trước hạn vào bộ nhớ một lần, rồi thử ghi toàn bộ phiên vào một key sessionStorage. Không cần giao dịch cơ sở dữ liệu.
- Sau chốt: giữ kết quả, thời điểm kết thúc hiệu lực và lý do manual/timeout trong phiên hiện tại.
- Timeout có thời điểm kết thúc hiệu lực bằng deadline; lưu riêng thời điểm xử lý nếu chốt muộn khi khôi phục phiên còn hiệu lực.
- Kết quả và đáp án của lượt đã nộp chỉ đọc. Làm lại tạo attemptId mới thay phiên hiện tại sau xác nhận, nêu rõ kết quả cũ sẽ không còn được giữ; không lưu thêm lịch sử.

## 9. Kết quả và xem lại trong phiên hiện tại

### 9.1. Quy tắc kết quả

- Mỗi câu đúng tính một câu đúng; không áp dụng trọng số giả định.
- Sai: đã chọn nhưng khác đáp án chuẩn. Bỏ trống: không có lựa chọn khi kết thúc.
- Đúng + sai + bỏ trống = tổng câu thuộc lượt.
- Tỷ lệ đúng cuối lượt = đúng / tổng câu × 100, làm tròn số nguyên để hiển thị.
- Trong phiên luyện, nếu hiển thị tỷ lệ tạm phải ghi rõ mẫu số là số câu đã chốt. Không dùng nó thay tỷ lệ cuối lượt.
- Hiện kết quả theo Mondai: đúng, sai, bỏ trống và tỷ lệ; không ép tất cả cấp độ vào chín Mondai.
- Drill hiển thị thêm số câu có hỗ trợ; không dùng kết quả đó để suy ra đỗ JLPT.
- Thời gian bài có giờ = thời điểm kết thúc hiệu lực − startedAt, giới hạn trong 0..durationSeconds.
- Drill V1 không báo “thời gian học thực tế” từ chênh lệch mở/đóng vì có thể có khoảng nghỉ; chỉ cần thời điểm làm và số câu.
- Bỏ quy đổi /60 và nhãn đạt/trượt chuẩn JLPT. Không đặt ngưỡng đạt tùy tiện thay cho chúng.

### 9.2. Màn kết quả

Theo thứ tự: tên bài/phạm vi → số đúng/tổng → đúng/sai/bỏ trống → thời gian nếu có → kết quả theo dạng → hành động học tiếp.

Hành động chính: Xem câu sai, Luyện lại câu sai. Hành động phụ: Xem toàn bài đã làm, Luyện câu chưa chắc/bỏ trống, Làm lại, Về bài học.

### 9.3. Vòng đời kết quả tạm

- Tab giữ tối đa một lượt: đang làm hoặc đã nộp. Không có danh sách lịch sử, bộ lọc các lần làm hoặc thành tích lâu dài.
- Nộp bài không xóa ngay: giữ kết quả để xem lại, lọc câu sai và chuẩn bị luyện lại trong thời hạn phiên tạm.
- Kết quả mất khi thay bằng lượt mới, người học xóa phiên, phiên hết hạn hoặc dữ liệu tab không còn.
- Xem đề/lời giải tự do hoặc quay về kho không tự xóa kết quả hiện tại.
- Refresh chỉ khôi phục được dữ liệu đã ghi thành công và còn hiệu lực. Không hứa khôi phục phần chỉ có trong bộ nhớ.
- Nếu nội dung đề trên website thay đổi, lượt còn trong tab dùng bản nội dung đã giữ cùng phiên, không tự đổi đáp án/điểm. Hết phiên không giữ bản nội dung đó thành kho lịch sử.

### 9.4. Xem lại một lượt

- Hiện đáp án người học đã chốt và đáp án chuẩn tại thời điểm đó.
- Bộ lọc: Tất cả, Sai, Bỏ trống, Cắm cờ; Drill có thể thêm Có hỗ trợ.
- Lọc câu vẫn giữ bài đọc/chú thích của nhóm. Các câu liên quan không thuộc bộ lọc có thể thu gọn, không làm mất ngữ cảnh.
- Phương án chỉ đọc; không gắn handler chọn đáp án ở chế độ này.
- Được mở trợ giúp và luyện lại từ kết quả hiện tại; không sửa cờ, điểm hoặc đáp án đã nộp. Không có dấu lưu câu lâu dài.

## 10. Xem đề & lời giải

- Không tạo attempt, không đồng hồ, không có “đáp án của bạn”.
- Giữ mục lục Mondai và chuyển nhanh đến câu/nhóm.
- Mặc định hiện đề và phương án; đáp án/lời giải, bản dịch và tra từ mở theo yêu cầu.
- Mỗi câu có trạng thái mở riêng. Mở/đóng tất cả là thao tác đặt trạng thái các câu, không khóa khả năng mở/đóng từng câu sau đó.
- Bài đọc và chú thích gốc luôn hiện ở nhóm tương ứng; bản dịch đoạn văn là phần bổ sung riêng.
- Nội dung bổ sung thiếu/chưa duyệt: không hiện đoạn rỗng hoặc dữ liệu nháp. Hiện “Chưa có lời giải đã duyệt” nếu người dùng mở phần đó.
- Không có Lưu để ôn hoặc bộ sưu tập câu lâu dài. Cờ chưa chắc chỉ có trong phiên Drill/Mock.
- Xem lại kết quả hiện tại dùng bản nội dung giữ cùng phiên; xem đề tự do từ kho dùng bản phát hành hiện tại. Không trộn hai nguồn khi website cập nhật nội dung.

## 11. Thiết kế hiển thị và tương tác

### 11.1. Nguyên tắc

- Giữ ngôn ngữ thiết kế hiện có; giảm số lớp viền, gradient, nhãn và khẩu hiệu cạnh câu hỏi.
- Nội dung tiếng Nhật và thao tác làm bài được ưu tiên hơn thông tin trang trí.
- Không dùng màu làm tín hiệu duy nhất: đúng/sai/chưa làm/cắm cờ có nhãn hoặc biểu tượng.
- Nút chỉ có biểu tượng phải có tên truy cập rõ; toàn bộ lựa chọn dùng được bằng bàn phím.
- Hỗ trợ tiếng Việt/tiếng Anh theo cài đặt ứng dụng cho các nhãn chức năng sửa/thêm; nội dung đề Nhật giữ nguyên. Không hứa dịch tiếng Anh các lời giải chỉ có tiếng Việt.

### 11.2. Bố cục mục tiêu

| Màn | Máy tính | Điện thoại |
|---|---|---|
| Kho | Bộ lọc gọn, sách/ngày, khối làm tiếp | Bộ lọc gói gọn, danh sách một cột |
| Câu ngắn | Một đơn vị hiện tại; có vị trí và trước/sau | Một cột, phương án lớn và dễ bấm |
| Nhóm đoạn văn | Đoạn bên trái, câu bên phải khi đủ rộng; giữ chung ngữ cảnh | Đoạn trên, câu dưới, có nút quay lại đoạn |
| Bài có giờ | Đồng hồ và phiếu câu hỏi cạnh bài hoặc cố định trong vùng nhìn | Thanh gọn có giờ/số đã làm; nút mở phiếu dạng bảng trượt |
| Chữa bài | Kết quả và nội dung tương ứng; lời giải mở theo câu | Thu gọn các phần bổ sung; không tràn ngang |

- Mục tiêu thử nghiệm: rộng 360, 390, 768 và 1280 CSS px; thử phóng to trình duyệt 200%.
- Cỡ chữ nội dung Nhật mục tiêu từ 18px trên điện thoại, giãn dòng khoảng 1.7–1.9; điều chỉnh bằng kiểm tra trực quan.
- Vùng bấm chính mục tiêu ít nhất 44 × 44 CSS px; phương án dài dùng một cột.
- Mục tiêu tương phản chữ thường 4.5:1 và chữ lớn 3:1; kiểm tra cả nền sáng/tối.
- Thanh cố định không che câu/phương án khi cuộn, không che bàn phím hoặc nút cuối màn.
- Không có cuộn ngang toàn trang ở kích thước mục tiêu. Bảng/phương án nhiều thành phần được xuống dòng có chủ đích.
- Focus rõ ràng; mở modal đưa focus vào, đóng trả về nút mở; không để modal giữ focus khi đã đóng.
- Chuyển câu đưa điểm nhìn tới tiêu đề đơn vị mới. Không tự cuộn về đầu trang khi người học chỉ mở lời giải.

### 11.3. Những dạng cần renderer đúng

- Đọc/viết Kanji: giữ đúng phần gạch chân ở câu và phương án.
- Điền từ/ngữ pháp: giữ ô trống, dấu câu, phủ định và đơn vị câu.
- Xếp câu ★: có bốn vị trí, đúng vị trí ngôi sao; chữa bài hiện thứ tự và câu hoàn chỉnh khi phần biên soạn đã duyệt. V1 chưa làm kéo thả.
- Ngữ pháp đoạn văn: giữ đoạn, xuống dòng, chú thích và liên kết ô trống → câu. Câu 52 hiển thị rõ ba thành phần a/b/c trong mỗi lựa chọn.
- Furigana thuộc bản gốc vẫn hiện khi thi; không tự bổ sung furigana làm lộ câu hỏi cách đọc Kanji.

## 12. Hợp đồng dữ liệu nội dung V1

### 12.1. Quyết định về cấu trúc

Giữ một ngày/một JSON, chưa chuẩn hóa thành cơ sở dữ liệu quan hệ hoặc ngân hàng câu hỏi độc lập. Mã hóa UTF-8. Không thay ID hiện có khi chỉ sửa cấu trúc hoặc bổ sung nguồn.

| Cấp | Trường/chính sách |
|---|---|
| Bài | schemaVersion = 1 cho hợp đồng mới; dữ liệu hiện tại được coi là legacy chưa có version |
| Bài | contentRevision: số nguyên tăng khi nội dung phát hành thay đổi; khác schemaVersion |
| Bài | status: draft hoặc published; isSample: boolean |
| Bài | kind: practice_set hoặc section_mock; V1 không phát hành loại full_mock |
| Bài | skills: mảng phạm vi; ngày 1 là vocabulary và grammar, chữ/Kanji thuộc vocabulary |
| Bài | Giữ id, bookId, bookTitle, level, day, title, subtitle, timeLimitMinutes, mondais |
| Bài | totalQuestions tính từ dữ liệu; nếu giữ trường khai báo thì bắt buộc bằng số tính được |
| Nguồn | sourceRef: documentId, fileName, sha256; tên sách/nguồn để hiển thị giữ riêng |
| Câu/đoạn | sourcePages: danh sách pdfPage bắt đầu từ 1, printedPage là chuỗi tùy chọn |
| Câu | answerPages hoặc nguồn đáp án được dẫn chiếu rõ |
| Mondai | number, type, title, titleVi, instruction, questions; passages khi có |
| Câu | id, number, stem, options, answer; passageId/blankIds/order theo dạng |
| Đoạn | id, text, chú thích gốc có định danh; không trộn bản dịch vào chú thích gốc |
| Xác minh | verification.transcription và verification.answer: pending, verified hoặc needs_fix |
| Bổ sung | enrichment chứa phiên âm bổ sung, dịch, từ trọng tâm, lời giải, phân tích và ghi chú phương án |
| Nguồn bổ sung | origin: manual, ai_assisted hoặc legacy_unknown; không tự đoán lịch sử biên soạn |
| Duyệt bổ sung | reviewStatus: draft hoặc reviewed; V1 chỉ hiển thị enrichment đã reviewed |

Nếu chỉ một phần bổ sung được duyệt, chỉ đưa phần đã duyệt vào enrichment phát hành; phần còn lại giữ trong bản biên soạn. Không đánh dấu toàn bộ đã duyệt dựa trên việc một lời giải đúng.

Không đưa đường dẫn máy cá nhân như F:/Downloads vào dữ liệu phát hành. Manifest nội bộ có thể lưu đường dẫn tìm nguồn, nhưng ứng dụng chỉ cần định danh/tên tài liệu và trang.

### 12.2. Loại câu hỗ trợ

Enum gồm chín loại hiện có: kanji_reading, kanji_writing, word_formation, context, synonym, usage, grammar_form, sentence_order, text_grammar.

Loại chưa hỗ trợ phải báo lỗi kiểm định hoặc hiện chưa hỗ trợ ở bản xem trước nội bộ; không tự đoán renderer. Không mặc định mọi bài JLPT đều có chín Mondai hoặc 54 câu.

### 12.3. Lựa chọn và đáp án

- V1 dùng options là mảng bốn chuỗi; answer là 1, 2, 3 hoặc 4.
- Không xáo trộn phương án để tránh làm sai đáp án và order.
- Các lựa chọn nhiều thành phần như câu 52 vẫn nằm trong một lựa chọn, trình bày có nhãn a/b/c.
- Ghi chú giải thích từng lựa chọn phải tham chiếu số phương án rõ ràng, không dựa vào mảng thiếu phần tử để suy đoán.
- Những định dạng không có bốn lựa chọn thuộc mở rộng sau V1; không sửa dữ liệu gốc để ép chúng vào V1.

### 12.4. Đoạn văn và ô trống

- passageId xác định đơn vị nhóm trong phạm vi bài; ID không trùng trong bài.
- blankIds là danh sách ID ô trống mà câu quản lý. Câu 52: 52-a, 52-b, 52-c.
- Chuẩn hóa và bỏ các trường chồng chéo blank, blankId, blankLabel sau migration.
- Mọi blankId phải xuất hiện trong đoạn được tham chiếu; mỗi ô có đúng một câu quản lý.
- Không tách câu khỏi ngữ cảnh khi lọc, luyện lại hoặc chuyển trang.
- Chú thích gốc tiếng Nhật được lưu riêng với bản dịch chú thích. Phần dịch chỉ mở theo quyền trợ giúp.

### 12.5. Chuẩn định dạng văn bản

Để hạn chế migration, giữ nội dung dạng chuỗi có markup được quy định. Một parser chung tạo token hiển thị; không lưu thêm token array trùng nội dung trong JSON.

| Cú pháp nội dung | Ý nghĩa |
|---|---|
| Văn bản thường | Nội dung chữ |
| [屋外] | Gạch chân |
| [[50]], [[52-a]] | Ô trống có ID |
| ____ | Một vị trí xếp câu; nhập liệu chuẩn hóa các dãy gạch dưới thành dạng này |
| ★ | Vị trí ngôi sao ở câu xếp câu |
| {{漢字\|かんじ}} | Furigana có trong nguồn; dấu phân cách là ký tự \| |

- Nhận diện ô trống hai ngoặc trước gạch chân một ngoặc.
- Dùng cùng parser cho hướng dẫn, câu, phương án, đoạn và chú thích nơi có markup.
- Dấu ngoặc hoặc ký tự đặc biệt dùng theo nghĩa đen phải được escape bằng dấu gạch chéo ngược; importer xử lý việc escape nhất quán. Không diễn giải HTML tùy ý.
- Cho phép ruby trong phần gạch chân; không cho phép lồng ô trống hoặc cấu trúc sai nghĩa.
- Đối với sentence_order, phải có đúng bốn vị trí gồm ba slot và một star. Vị trí star lấy từ nội dung, không mặc định luôn là vị trí 3.
- order là hoán vị 1..4; answer phải bằng phần tử order tại vị trí star.
- Câu thường có ô điền từ không bắt buộc phải có bốn slot. Chỉ áp quy tắc bốn vị trí cho sentence_order.
- Marker kỹ thuật không được đưa vào tra từ/phát âm: không đọc “52-a”, dấu ngoặc hoặc gạch dưới như từ vựng.
- Không suy ra furigana bổ sung rồi coi là chữ có sẵn trong bản gốc.

## 13. Lưu tạm theo tab bằng sessionStorage

### 13.1. Phạm vi lưu và một bản ghi hiện tại

Dùng đúng một key có tiền tố riêng: **language-master:jlpt:v1:session**. Giá trị chứa storageSchemaVersion, updatedAt, expiresAt và currentAttempt. currentAttempt là lượt đang làm hoặc kết quả vừa nộp, không phải một mảng lịch sử.

- Một tab chỉ có một currentAttempt cho toàn phần luyện đề, dùng chung Drill và Mock.
- Không dùng localStorage, IndexedDB, Firestore, cookie hoặc tài khoản để lưu bài làm này.
- Không tạo kho snapshots, bảng bookmarks, phân vùng owner hoặc hàng đợi đồng bộ.
- Giữ bản nội dung cần dùng ngay trong currentAttempt.examSnapshot, đủ để render/chấm phạm vi lượt khi tải lại. Đây chỉ là bản chụp của phiên tạm, không phải kho lưu lâu dài.
- Mở kho, xem chi tiết hoặc Xem đề & lời giải không tự tạo/thay currentAttempt.
- Trạng thái bộ nhớ của phiên phải tồn tại ở cấp ứng dụng/module, không bị mất chỉ vì component trang làm bài bị tháo khi chuyển trang nội bộ.
- Nội dung catalog và cài đặt chung hiện có của ứng dụng không thuộc cơ chế lưu bài này.

### 13.2. Dữ liệu tối thiểu

| Phạm vi | Dữ liệu |
|---|---|
| Bản ghi tạm | storageSchemaVersion = 1, updatedAt, expiresAt, currentAttempt |
| Định danh lượt | attemptId, examId, contentRevision; không có userId/ownerKey |
| Nội dung | examSnapshot gồm nội dung gốc, đáp án và phần bổ sung đã duyệt cần dùng |
| Phạm vi luyện | mode: drill hoặc mock; questionIds, unitIds theo thứ tự; selectedMondai |
| Luyện lại | targetQuestionIds nếu cần, không giữ bản lượt nguồn hoặc liên kết lịch sử |
| Trạng thái | in_progress hoặc submitted; không giữ bản abandoned |
| Đáp án | Lựa chọn nháp, lựa chọn đã chốt và thời điểm chốt khi áp dụng |
| Hỗ trợ | Câu/nhóm có dùng trợ giúp trước chốt và loại trợ giúp cần cho hiển thị |
| Điều hướng | Cờ chưa chắc, đơn vị/câu đang xem |
| Thời điểm | createdAt, startedAt, deadlineAt/durationSeconds khi mock |
| Kết thúc | endedAt hiệu lực, finalizedAt, submissionReason: manual, timeout hoặc completed |
| Kết quả | Đúng/sai/bỏ trống, tỷ lệ, theo Mondai và dữ liệu đã chốt |

storageSchemaVersion là định dạng bản lưu tạm; schemaVersion/contentRevision thuộc nội dung đề. Không thêm revision để giải quyết xung đột ghi giữa tab vì các tab không ghi chung bản này.

### 13.3. Vòng đời và thao tác thay/xóa

| Từ | Sự kiện | Đến |
|---|---|---|
| Chưa có phiên | Bấm Bắt đầu | in_progress; thử lưu tạm, dùng RAM nếu lưu lỗi |
| in_progress | Chọn/cắm cờ/chốt câu/đổi vị trí | Cập nhật phiên hiện tại |
| in_progress | Nộp hoặc kết thúc luyện | submitted; kết quả được giữ tạm để chữa bài |
| in_progress | Quá deadline nhưng phiên còn hiệu lực | submitted, lý do timeout |
| Có phiên | Đồng ý bắt đầu lượt mới/luyện lại | Lượt mới thay phiên cũ; không tạo bản lưu trữ |
| Có phiên | Kết thúc và xóa phiên | Xóa RAM và key của module; về màn chi tiết/chuẩn bị |
| Có phiên | Quá expiresAt | Loại phiên tạm, thông báo hết hạn; không tự bắt đầu bài mới |

- Khi đã có phiên, nút Bắt đầu lượt mới phải nêu rõ sẽ thay bài/kết quả hiện tại trong tab; yêu cầu xác nhận trước khi thay. Không yêu cầu xác nhận lặp cho các cập nhật đáp án bình thường.
- Với luyện lại câu sai, tính tập câu đích, mở rộng nhóm đoạn văn, chuẩn bị nội dung lượt mới rồi mới thay bản hiện tại. Nếu không chuẩn bị được nội dung, giữ phiên cũ và báo lỗi.
- Sau khi đã xác nhận bắt đầu, lỗi ghi storage không chặn lượt mới: dùng RAM theo mục 13.6. Không khôi phục phiên cũ đè lên RAM của lượt mới.
- Nút Kết thúc và xóa phiên khác nút Kết thúc luyện/Nộp bài: nút xóa không tạo kết quả, bỏ cả bài và kết quả tạm sau xác nhận.
- Hủy hộp xác nhận giữ nguyên phiên và deadline. Xóa/thay phiên có giờ phải dừng bộ đếm cũ để callback cũ không nộp hoặc ghi đè phiên mới.
- Không có nút trở về kết quả lượt trước sau khi đã bắt đầu luyện lại. Kết quả lượt trước chỉ được dùng để xác định phạm vi mới.

### 13.4. Hạn lưu tạm và đóng/khôi phục tab

Mặc định thiết kế V1: **expiresAt = createdAt của lượt hiện tại + 24 giờ**, là hạn cố định. Reload, xem bài, cập nhật đáp án hoặc nộp không gia hạn. Bắt đầu một lượt mới tạo hạn mới vì bản cũ đã được thay.

- Đây là giới hạn lưu tạm của ứng dụng, tách biệt với deadline làm bài. Thời lượng bài có giờ V1 phải nhỏ hơn 24 giờ.
- Kiểm tra hạn khi khôi phục, quay lại trang, tab hoạt động lại và trước khi xử lý hành động cập nhật/chốt. Khi trang đang hoạt động, cập nhật UI khi đến hạn.
- Quá hạn lưu tạm: bỏ phiên, không chấm hay phục hồi thêm. Hiện “Phiên tạm đã hết hạn. Bạn có thể bắt đầu bài mới.”
- Còn hạn lưu tạm nhưng quá deadline thi: chốt timeout bằng đáp án đã lưu/đang có hợp lệ; không cấp thêm thời gian.
- Trong cùng tab, refresh hoặc chuyển trang nội bộ có thể khôi phục nếu lần ghi trước thành công và dữ liệu chưa hết hạn.
- Đóng tab thường kết thúc phiên trình duyệt, nhưng tính năng phục hồi tab có thể giữ lại dữ liệu. Không hứa chắc chắn khôi phục, cũng không hứa dữ liệu bị xóa tuyệt đối ngay khi đóng tab.
- Ứng dụng chỉ có thể dọn bản quá hạn khi được chạy lại; TTL là quy tắc từ chối sử dụng và dọn dữ liệu khi có thể, không phải tiến trình nền khi trình duyệt đóng.
- Khi phát hiện mất/quá hạn phiên tại route kết quả hoặc làm tiếp, về màn chuẩn bị với thông báo; không chạy đồng hồ mới âm thầm.

### 13.5. Ghi, khôi phục và nội dung được cập nhật

- Bộ nhớ ứng dụng là trạng thái hiện tại trong khi đang chạy. Sau mỗi thay đổi đáp án/cờ/chốt/vị trí, serialize và ghi toàn bản vào key bằng một lần setItem.
- Không ghi theo mỗi nhịp đồng hồ; không phụ thuộc beforeunload để lưu đáp án cuối.
- Ghi sessionStorage là đồng bộ; không cần giao dịch IndexedDB hoặc hàng đợi ghi bất đồng bộ. Logic chốt vẫn phải bảo vệ khỏi bấm lặp/timeout trùng.
- Chỉ hiện “Đã lưu tạm trong tab này” khi ghi thành công. Không dùng “Đã đồng bộ”, “Đã lưu vào tài khoản” hoặc lời hứa lưu lâu dài.
- Khôi phục phải kiểm tra JSON, storageSchemaVersion, hạn lưu, cấu trúc attempt, phạm vi câu, deadline và snapshot trước khi dùng. Timestamp phải là epoch milliseconds hữu hạn; expiresAt phải khớp createdAt + 24 giờ, deadlineAt phải khớp startedAt + durationSeconds × 1000 đối với mock và nằm trước expiresAt. Drill cũng tạo createdAt/startedAt cùng lúc sau xác nhận bắt đầu.
- Bản đề mới phát hành không được thay đáp án trong phiên đã bắt đầu. Dùng examSnapshot của phiên cho cả render và chấm; kết quả đã nộp chỉ đọc.
- Bắt đầu bài thông thường từ kho lấy nội dung phát hành hiện tại. Luyện lại từ kết quả hiện tại dùng bản nội dung của kết quả đó để đúng các câu cần ôn.
- Nếu bản lưu/snapshot không còn được phần mềm hỗ trợ, báo không khôi phục được, bỏ đúng bản tạm và cho bắt đầu mới; không tự chuyển đáp án sang đề khác. V1 không cần hệ thống di trú lịch sử.

### 13.6. Storage bị chặn, đầy hoặc dữ liệu hỏng

- Bọc xử lý lỗi cho đọc, parse, ghi và xóa; dữ liệu có sẵn trong storage vẫn phải được kiểm tra, không mặc nhiên tin là đúng.
- Lỗi đọc/ghi ngay từ đầu: vẫn cho làm bằng RAM. Thông báo “Đang giữ bài trong bộ nhớ. Tải lại hoặc đóng tab có thể làm mất bài.”
- Lỗi giữa phiên: giữ lựa chọn/kết quả mới trên RAM và báo chưa lưu tạm được; không đổi đúng/sai hay đặt lại deadline vì lỗi lưu.
- Nếu một bản cũ đã lưu trước đó, có thể còn tồn tại khi ghi mới thất bại. Thử xóa đúng key để tránh khôi phục bản lỗi thời; nếu xóa cũng lỗi, nêu rõ refresh có thể mất thay đổi hoặc khôi phục trạng thái đã lưu trước đó.
- Không đọc lại bản cũ để đè lên RAM trong cùng lượt đang chạy. Nút Thử lưu lại chỉ thử ghi trạng thái RAM hiện tại với deadline/expiresAt cũ.
- JSON hỏng/định dạng không hỗ trợ: không khôi phục một phần hoặc trắng trang; bỏ bản lỗi trong RAM, thử xóa đúng key, báo ngắn rồi cho bắt đầu bình thường.
- Nộp bài khi lưu lỗi vẫn chốt và cho xem kết quả trong RAM; giữ chỉ đọc. Thử lưu lại không chấm lần hai hoặc tạo lượt mới.
- Chuyển trang nội bộ vẫn giữ RAM ở cấp module. Reload/đóng tab không được bảo đảm khi đã chuyển sang RAM.

### 13.7. Quy tắc xóa dữ liệu

- Chỉ gọi removeItem với key do module sở hữu. Tuyệt đối không dùng sessionStorage.clear(), localStorage.clear() hoặc xóa storage của chức năng khác.
- Không đụng đến key currentRaceId, cài đặt, tiến độ khóa học, phiên đăng nhập hoặc dữ liệu tài khoản.
- Xóa phiên: xóa trạng thái RAM, đóng kết quả/trợ giúp thuộc phiên, dừng timer và thử xóa key. Chỉ báo “Đã xóa phiên tạm” khi thao tác xóa key đã thành công hoặc xác nhận không có key.
- Nếu xóa key thất bại, không khôi phục lại vào RAM trong vòng đời trang hiện tại; báo chưa xóa được bản lưu trong tab và cho thử lại. Không tuyên bố đã xóa tuyệt đối.
- Nút Làm lại không gọi xóa tất cả storage; chuẩn bị rồi thay key bằng lượt mới sau xác nhận.
- Không cần màn quản lý dung lượng/lịch sử: số bản được giới hạn ở một và có TTL. Nếu bản hiện tại quá lớn gây lỗi ghi, áp dụng RAM thay vì chặn người học.

### 13.8. Nhiều tab và trạng thái đăng nhập

- Mỗi tab có vùng sessionStorage riêng. Không khóa tab khác, không CAS/expectedRevision, không BroadcastChannel để đồng bộ đáp án.
- Tab mới/nhân bản có thể nhận bản sao ban đầu từ tab mở nó theo hành vi trình duyệt; sau đó hoạt động độc lập. Không yêu cầu mọi tab mới luôn trống.
- Bản sao phải giữ deadline và expiresAt đang có, không đặt lại thời gian khi nhận bản sao. attemptId chỉ dùng trong phiên cục bộ, không cần duy nhất giữa các tab nhân bản.
- Chọn/nộp/làm lại/xóa ở tab A không làm thay đổi dữ liệu tab B. Người dùng muốn dọn tab nào thao tác tại tab đó.
- Không đọc userId để chọn phiên. Người chưa đăng nhập, người đăng nhập A/B dùng cùng quy tắc trong tab; đăng nhập/đăng xuất không xóa, chuyển chủ hoặc gộp phiên.
- Không ghi điểm, đáp án, cờ, độ thành thạo hoặc hoàn thành bài vào tài khoản. Giữ nguyên hạ tầng đăng nhập của các phần khác.

## 14. Tra từ, phân tích và tích hợp ứng dụng

- Tái sử dụng từ điển và engine phát âm, nhưng mọi trợ giúp trong phần đề phải chịu cùng policy.
- Phân tích tự động đổi nhãn thành Gợi ý tra từ trong câu. Giữ token gốc và thứ tự xuất hiện; không giả là phân tích ngữ pháp đầy đủ.
- Khớp gần đúng không được tự thay từ gốc. Hiện “Có thể bạn muốn tra…” và để người học chọn.
- Không tự bỏ từ lặp/trợ từ rồi gọi kết quả là phân tích toàn câu.
- Phân biệt cách đọc tiếng Nhật và Hán Việt. Không gắn Hán Việt vào nhãn Furigana hoặc đưa Hán Việt cho giọng đọc Nhật.
- Phiên âm bổ sung chưa duyệt không dùng để phát âm thay cho nội dung gốc.
- Mất mạng/TTS không có giọng phù hợp: báo không phát được; không chặn việc làm bài.
- Không thêm ghi thống kê/điểm tài khoản từ module đề. TimeTracker toàn ứng dụng hiện có giữ hành vi chung; không lấy nó làm đồng hồ thi hoặc cộng thêm thời lượng attempt vào tài khoản.
- Kết quả tạm của lượt làm không cập nhật SRS. Sai một câu không tự giảm mastery của các từ/ngữ pháp trong câu.
- V1 chỉ dùng cờ chưa chắc và kết quả hiện tại để luyện lại trong tab; không lưu câu lâu dài. Chuyển từ/ngữ pháp sang khóa học/SRS thuộc giai đoạn sau.
- Trong bài có giờ, ẩn dock học nổi để tránh hai đồng hồ/công cụ; không sửa chức năng của dock ở các trang học khác.

## 15. Tổ chức tài liệu và quy trình PDF → dữ liệu

### 15.1. Vị trí dự kiến

| Khu vực | Mục đích |
|---|---|
| docs/specs | Đặc tả chức năng và hợp đồng dữ liệu |
| data-sources/jlpt/<documentId> | Manifest nguồn, ánh xạ trang và ghi chú đối chiếu; file gốc có thể giữ ở vị trí hiện tại |
| imports/jlpt/<documentId>/raw | Bản OCR theo trang và thông tin vùng trang |
| imports/jlpt/<documentId>/drafts | Dữ liệu chuẩn hóa đang biên soạn/chờ duyệt |
| src/data/exams/jlpt | Chỉ nội dung phát hành và mã kiểu/bộ nạp liên quan |
| tests/fixtures/jlpt | Dữ liệu mẫu/lỗi dùng kiểm tra, gồm N3 sample khi di chuyển |

Đây là bố trí đề xuất cho triển khai, không phải chỉ thị sao chép PDF hay tạo toàn bộ thư mục ngay khi lập đặc tả. Không tự đẩy PDF/bản OCR lên GitHub. Tài liệu nội bộ, file nguồn và nội dung được phát hành là các đầu ra khác nhau.

### 15.2. Pipeline

1. Nhận diện tài liệu: documentId, tên, checksum, số trang, cách đánh số trang sách.
2. Render đúng vùng trang hiển thị (CropBox) trước OCR; không lấy thừa phần ảnh ngoài vùng trang.
3. OCR theo trang; giữ bản thô, thứ tự đọc và liên kết về ảnh/vùng nguồn.
4. Chuẩn hóa theo ngày → Mondai → câu/đoạn; giữ câu chữ, phương án, thứ tự, ký hiệu và chú thích.
5. Nhận dạng bảng đáp án riêng rồi ghép theo ngày/Mondai/số câu.
6. Đưa sang JSON nháp đúng schema; phần không rõ gắn needs_fix, không tự điền bằng suy luận.
7. Chạy kiểm định cấu trúc và liên kết.
8. Đối chiếu nội dung gốc và đáp án bằng mắt. Điểm tin cậy OCR không thay thế duyệt.
9. Biên soạn/duyệt riêng bản dịch và lời giải nếu có.
10. Đặt published sau khi qua các điều kiện; loader chỉ đưa nội dung đủ điều kiện vào sản phẩm.

Không sửa bản OCR thô để mất dấu vết. Sửa lỗi trong bản chuẩn hóa và có ghi chú đối chiếu. Mọi lần sửa nội dung đã phát hành phải tăng contentRevision.

### 15.3. Pilot ngày 1

- Dùng dữ liệu hiện có làm điểm xuất phát; không nhập lại rồi ghi đè toàn bộ một cách mù quáng.
- Giữ 54 đáp án đã đối chiếu, bổ sung answerPages = PDF 167.
- Đối chiếu 100% câu chữ, phương án, gạch chân, chú thích, đoạn văn và vị trí sao với PDF 5–12.
- Xác minh riêng order đầy đủ của câu xếp sao: bảng đáp án chỉ xác nhận phương án ở vị trí sao, không tự xác nhận cả thứ tự biên soạn.
- Chuẩn hóa câu 50–54, ba ô câu 52, markup và các trường trùng nghĩa.
- Bản dịch/lời giải/phiên âm chưa kiểm tra giữ draft; không đánh dấu reviewed chỉ vì đáp án chuẩn khớp.
- Sau khi nghiệm thu dữ liệu và giao diện ngày 1, mới áp dụng quy trình cho ngày 2–20.

## 16. Bộ kiểm định dữ liệu và điều kiện phát hành

### 16.1. Lỗi phải chặn phát hành/bắt đầu làm

1. JSON không hợp lệ, schemaVersion không hỗ trợ, trường bắt buộc thiếu/sai kiểu.
2. Trùng ID bài, câu hoặc đoạn trong phạm vi cần duy nhất; questionId cần duy nhất giữa các bài được nạp.
3. Level/type/kind không hỗ trợ; bài rỗng hoặc Mondai rỗng.
4. Không đủ bốn lựa chọn, lựa chọn rỗng, answer không thuộc 1..4.
5. totalQuestions hoặc numberRange khai báo không khớp thực tế.
6. Câu trỏ tới đoạn không tồn tại; ô trống mồ côi/trùng chủ; blankIds không khớp đoạn.
7. Markup không hợp lệ, token chưa xử lý, câu ★ sai số vị trí hoặc order/answer không nhất quán.
8. Nguồn đáp án hoặc trang nguồn thiếu theo hợp đồng phát hành; pdfPage vượt số trang tài liệu.
9. Phần gốc/đáp án chưa verified nhưng bài được đặt published.
10. isSample=true nhưng xuất hiện trong danh mục chính.
11. Cùng contentRevision nhưng nội dung thay đổi so với bản đã phát hành; kiểm tra trong quy trình biên soạn/phát hành, không tạo kho lịch sử bài làm để kiểm tra việc này.

Thiếu thời lượng chỉ chặn chế độ có giờ, không chặn xem tài liệu/luyện nếu các dữ liệu còn lại hợp lệ. Thời lượng nếu có phải là số phút nguyên dương, nhỏ hơn 24 giờ để deadline nằm trước hạn lưu tạm V1.

### 16.2. Cảnh báo chất lượng

- Thiếu bản dịch, lời giải hoặc ghi chú phương án: không giả nội dung; có thể phát hành đề gốc nếu đã duyệt.
- Hai lựa chọn giống nhau sau chuẩn hóa: yêu cầu kiểm tra bằng mắt, không tự sửa.
- Thiếu/đứt dãy số câu theo nguồn: yêu cầu đối chiếu; không mặc định mọi bài phải đánh số 1..54.
- Chữ dễ nhầm, phần phủ định, số, kana nhỏ, trường âm, dấu trích dẫn và furigana: đưa vào danh sách kiểm tra OCR.

Lỗi kiểm định phải nêu tên bài, Mondai, questionId và trường lỗi. Môi trường phát triển báo rõ lỗi; bản chạy không được vì một file sai mà làm trắng toàn kho. File sai bị loại khỏi danh mục có thông báo phù hợp, không âm thầm coi là hợp lệ.

## 17. Kiến trúc triển khai dự kiến

Giữ React/TypeScript hiện có; chưa thêm backend hoặc framework quản lý trạng thái mới.

| Thành phần | Trách nhiệm |
|---|---|
| examRepository | Danh mục và tải nội dung đã phát hành theo ID/phiên bản |
| contentValidator | Kiểm định cấu trúc, liên kết, marker và điều kiện phát hành |
| examTextParser | Parse markup thành token và tạo plain text an toàn cho tra từ/TTS |
| tabSessionStore | Một bản sessionStorage + RAM: đọc/ghi, kiểm tra TTL, thay/xóa phiên và xử lý lỗi; không phụ thuộc đăng nhập |
| examSession | Chuyển trạng thái, nhận đáp án, kiểm tra nhóm, deadline và nộp một lần |
| scoring | Hàm tính đúng/sai/bỏ trống/theo dạng từ dữ liệu đã chốt |
| studyAssistancePolicy | Quyền trợ giúp chung, điều khiển cả dock/popup toàn cục |
| Renderer câu/nhóm | Trình bày câu ngắn, xếp sao, đoạn văn và trạng thái chỉ đọc |
| CurrentResult/Review | Kết quả tạm chỉ đọc, chữa bài và chuẩn bị luyện lại từ phiên hiện tại |

Các trang chế độ điều phối UI; không tự sao chép logic chấm, parse và lưu vào mỗi trang. Nên chia ExamQuestionCard theo trách nhiệm thay vì thêm nhiều boolean chồng chéo cho mọi trường hợp.

Bộ nạp phải tách danh mục nhẹ khỏi nội dung đầy đủ để tải bài theo nhu cầu. Không nạp mọi lời giải của toàn kho chỉ để hiển thị danh sách. V1 chưa cần dịch vụ tìm kiếm từ xa.

Điểm thay đổi chính trong mã hiện có:

- src/pages/Exam: kho, chi tiết, ba chế độ, nhóm đoạn văn, kết quả hiện tại và hành động xóa/thay phiên.
- src/data/exams/jlpt/types.ts và index.ts: hợp đồng dữ liệu, kiểm định và bộ nạp.
- src/lib/jlpt: parser, tra từ, session/scoring/persistence hoặc các thư mục con tương ứng.
- src/App.tsx: các route và policy/provider cần thiết.
- FloatingStudyTimer/SelectionLookupPopover: chỉ thêm điểm tích hợp policy; không viết lại chức năng ngoài phần đề.
- Không đổi dữ liệu/tính điểm/SRS của khóa học khác trong phạm vi này.

## 18. Tiêu chí nghiệm thu

Mỗi yêu cầu dưới đây phải có bằng chứng kiểm tra tự động hoặc thao tác trực tiếp phù hợp. Kiểm tra trạng thái dữ liệu không chỉ dựa vào màu giao diện.

| ID | Tình huống | Kết quả bắt buộc |
|---|---|---|
| AC-01 | Mở kho | Chỉ thấy bài hợp lệ đã phát hành; mẫu N3 không bị gọi là đề chuẩn |
| AC-02 | Mở sách thứ hai | Một lần bấm mở được; tìm kiếm có tổng bài/câu khớp |
| AC-03 | Vào màn chuẩn bị mock | Đồng hồ chưa chạy, chưa tạo attempt ngoài ý muốn |
| AC-04 | Storage bị chặn/hết dung lượng khi bắt đầu | Vẫn vào Drill/Mock bằng RAM, báo không lưu tạm được; không yêu cầu đăng nhập |
| AC-05 | Ngày 1 đủ nội dung | 54 câu/9 Mondai, 54 đáp án khớp nguồn đã duyệt |
| AC-06 | Câu 50–54 | Đoạn văn và chú thích gốc hiện đủ ở cả ba chế độ |
| AC-07 | Câu 52 | Ba ô a/b/c liên kết đúng, vẫn một câu và một lựa chọn |
| AC-08 | Gạch chân/ô trống/★ | Không còn marker thô, dấu ngoặc thừa hoặc vị trí sao sai |
| AC-09 | Drill chọn rồi đổi trước kiểm tra | Chưa hiện đúng/sai; lựa chọn nháp mới nhất được lưu |
| AC-10 | Drill chọn sai → kiểm tra → bấm đúng | Kết quả đã chốt vẫn sai; không ghi đè |
| AC-11 | Drill nhóm chưa kiểm tra | Không lộ lời giải từng câu trong nhóm |
| AC-12 | Dùng trợ giúp trước kiểm tra | Đánh dấu hỗ trợ đúng câu/nhóm; bật công tắc suông không bị tính |
| AC-13 | Bỏ qua rồi kết thúc | Câu có nháp được chốt khi kết thúc; câu chưa chọn là bỏ trống |
| AC-14 | Đã lưu tạm, còn TTL rồi refresh cùng tab | Khôi phục lựa chọn, cờ, vị trí, deadline và expiresAt cũ |
| AC-15 | Chuyển tab/sleep vài phút | Giờ còn lại giảm theo thời gian thực, không theo callback |
| AC-16 | Quay lại phiên tạm còn TTL nhưng quá deadline | Chốt timeout; không nhận đáp án mới hoặc cấp lại thời gian |
| AC-17 | Nộp tay trùng timeout/bấm lặp | Chỉ một kết quả cuối của attempt |
| AC-18 | Đã nộp rồi xem lại/bấm phương án | Đáp án và điểm không đổi |
| AC-19 | Tra từ/loa khi mock đang làm | Mọi đường mở trợ giúp của app đều bị khóa; nội dung gốc vẫn đủ |
| AC-20 | Rời mock/sau nộp | Trợ giúp hoạt động đúng lại, không đổi sở thích người học vĩnh viễn |
| AC-21 | Luyện lại một câu sai trong đoạn | Lượt mới có đủ nhóm và ngữ cảnh, số câu thực tế được báo rõ |
| AC-22 | Xem tài liệu tự do khi đang có bài/kết quả | Không tạo, thay hoặc xóa phiên hiện tại; không ghi hoàn thành |
| AC-23 | Mở tất cả rồi đóng riêng một lời giải | Điều khiển riêng vẫn hoạt động |
| AC-24 | Nội dung đề cập nhật khi phiên vẫn còn | Phiên hiện tại render/chấm từ bản nội dung giữ cùng phiên; lượt thông thường bắt đầu từ kho lấy bản mới |
| AC-25 | Làm lại/luyện lại câu sai | Sau xác nhận có attemptId mới thay slot; không còn lối vào kết quả trước hoặc bản lưu lịch sử |
| AC-26 | Chưa đăng nhập → đăng nhập → đăng xuất | Đều dùng đủ ba chế độ; phiên/deadline không đổi theo tài khoản, không ghi điểm/đáp án vào tài khoản |
| AC-27 | Hai tab có bản phiên riêng | Thay đổi ở tab A không cập nhật hoặc ghi đè tab B; không có cảnh báo khóa/xung đột tab |
| AC-28 | Nhân bản tab đang thi rồi nộp một bản | Nếu trình duyệt sao chép phiên, bản sao giữ deadline/expiresAt cũ; việc nộp không tác động tab kia |
| AC-29 | Lưu lỗi giữa phiên hoặc lúc nộp | Hiện chưa lưu, giữ dữ liệu tạm; không báo đã đồng bộ/đã lưu sai |
| AC-30 | Mất mạng sau khi trang và đề đã tải | Vẫn làm/chấm được; lưu sessionStorage nếu khả dụng, RAM nếu lỗi; TTS lỗi không chặn bài |
| AC-31 | Các kích thước màn hình mục tiêu | Không tràn ngang/che phương án; phiếu câu hỏi luôn tiếp cận được |
| AC-32 | Bàn phím, modal, focus | Chọn/nộp/mở/đóng được; focus hợp lý, không bị kẹt |
| AC-33 | Nền sáng/tối, chữ dài, phóng to | Nội dung và trạng thái đọc được, nhãn không che nhau |
| AC-34 | Từ điển chỉ có từ gần đúng/Hán Việt | Không thay từ gốc hoặc coi Hán Việt là furigana |
| AC-35 | Chạy validator với dữ liệu lỗi | Báo đúng trường/câu, chặn phát hành; một file sai không làm trắng kho |
| AC-36 | Điểm theo dạng và tổng | Đúng + sai + bỏ trống bằng tổng; tỷ lệ dùng đúng mẫu số |
| AC-37 | Quay về kho/URL trực tiếp | Giữ ngữ cảnh tìm bài; ID sai có đường quay về; không tự chạy đồng hồ |
| AC-38 | Dữ liệu chưa duyệt | Không hiển thị enrichment draft như lời giải chính thức |
| AC-39 | Trang học khác | Đăng nhập, từ điển, dock học, khóa học và SRS không bị hồi quy |
| AC-40 | Chưa đăng nhập, mở trực tiếp mọi route đề | Không có yêu cầu đăng nhập hoặc quyền khác biệt; result không có phiên thì báo không còn kết quả |
| AC-41 | Quá hạn lưu tạm 24 giờ | Loại phiên và báo hết hạn; không tự chạy lượt mới hoặc gia hạn khi reload |
| AC-42 | Đóng tab rồi mở lại mà không còn dữ liệu | Về màn chuẩn bị; không hứa có lịch sử/kết quả hoặc dựng lại bài giả |
| AC-43 | Kết thúc và xóa phiên | Sau xác nhận xóa RAM/key đúng phạm vi, dừng timer cũ; key currentRaceId và các key khác giữ nguyên |
| AC-44 | JSON hỏng hoặc schema lưu tạm không hỗ trợ | Báo không khôi phục được, chỉ loại key của module khi có thể; vẫn bắt đầu bài mới được |
| AC-45 | Lưu thất bại sau khi đã từng lưu thành công | RAM giữ bản mới; không để bản cũ đè lại trong lúc chạy; thông báo nguy cơ khôi phục trạng thái cũ khi reload |
| AC-46 | Xóa key thất bại | Không tuyên bố đã xóa; bỏ phiên khỏi RAM, báo giới hạn và cho thử lại |
| AC-47 | Rời trang rồi quay lại khi đang dùng RAM | Phiên RAM còn ở cấp module; deadline tiếp tục; tải lại không được hứa bảo toàn |
| AC-48 | Bắt đầu bài khác/chế độ khác trong cùng tab | Xác nhận thay thế; chỉ giữ một lượt; hủy xác nhận giữ nguyên bài và deadline |
| AC-49 | Luyện lại có thay thế thành công trong RAM nhưng ghi lỗi | Lượt mới vẫn làm được với cảnh báo; không tự quay về kết quả cũ; không tạo history ngầm |
| AC-50 | Nộp và refresh khi lưu thành công | Kết quả tạm vẫn chỉ đọc trong cùng TTL; không chấm lại hoặc tạo attempt mới |
| AC-51 | Hủy/thay/xóa lượt sát lúc hết giờ | Callback của lượt cũ không nộp hoặc ghi đè phiên mới |

Các bài kiểm tra tự động ưu tiên parser, validator, scoring, chuyển trạng thái, deadline, TTL và đọc/ghi/xóa sessionStorage có fallback RAM. Không xây bộ kiểm tra giao dịch tài khoản hoặc đồng bộ nhiều tab ngoài phạm vi. Kiểm tra trình duyệt tập trung vào hành trình thực, nhóm đoạn văn, trợ giúp, mobile và bàn phím; không chỉ kiểm tra ảnh chụp hoặc sao chép logic triển khai vào test.

## 19. Kế hoạch triển khai và điều kiện chuyển bước

| Giai đoạn | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 0 — Đặc tả | Hoàn thành tài liệu này, xác định phạm vi và các quyết định mặc định | Có cơ sở triển khai rõ; chưa sửa ứng dụng |
| 1 — Hợp đồng nội dung | Schema, parser, validator, migration ngày 1 trên bản làm việc; tách mẫu/nháp | Dữ liệu qua kiểm định, ID không đổi, đủ cấu trúc nhóm |
| 2 — Hiển thị đề | Renderer câu/nhóm, đoạn/chú thích, ★, dấu gạch chân, sửa mở lời giải | Ngày 1 đọc đúng ở ba chế độ trên desktop/mobile |
| 3 — Phiên tạm | tabSessionStore, RAM, TTL, bản nội dung phiên, đồng hồ, nộp, policy trợ giúp | Refresh/timeout/fallback/thay/xóa phiên đúng; không phụ thuộc đăng nhập |
| 4 — Vòng học và giao diện | Kho/chi tiết, chuẩn bị, kết quả trong tab, chữa/luyện lại, tra từ đúng nhãn | Luồng chọn bài → làm → chữa → luyện lại chạy liền mạch, không có kho lịch sử |
| 5 — Duyệt pilot | Đối chiếu nội dung gốc, bổ sung đã duyệt, kiểm tra chức năng và hồi quy | Các AC áp dụng đạt, TypeScript/lint/build thành công |
| 6 — Mở rộng nội dung | OCR và chuẩn hóa ngày 2–20 theo pipeline đã nghiệm thu | Mỗi ngày có kiểm định/đối chiếu riêng trước published |

Không nhập hàng loạt trước khi pilot đạt. Không dùng việc thêm nhiều câu để bù cho lỗi hiển thị/lưu/chấm.

Mỗi giai đoạn sửa mã phải có phạm vi thay đổi rõ, giữ nguyên thay đổi chưa commit của người dùng và không tự push/deploy. Bộ kiểm tra chất lượng phải phân biệt lỗi mới với lỗi có sẵn ngoài phạm vi, đồng thời không để lại các lỗi hiện có trong module đang được sửa.

## 20. Các quyết định mặc định để bắt đầu triển khai sau đặc tả

1. Giữ ba chế độ, thay tên hiển thị và ranh giới hành vi như mục 6.
2. Đã mở rộng đủ 20 ngày N2; đây là bài luyện kiến thức ngôn ngữ, không gọi là toàn đề JLPT.
3. Drill dùng nút Kiểm tra để chốt, không chốt ngay khi chạm lựa chọn.
4. Nhóm cùng đoạn văn được kiểm tra cùng lúc; luyện lại mang theo cả nhóm.
5. Drill gom toàn bộ ngày trong cùng sách/cấp độ, chọn số câu và trộn đơn vị luyện. Mock/Lướt đề giữ thứ tự theo ngày; mọi chế độ giữ nguyên thứ tự phương án.
6. Mock giữ thời lượng của bài, không tạm dừng, tính giờ theo deadline.
7. Không cần đăng nhập; một phiên sessionStorage theo tab, không phân vùng user/guest hoặc lưu điểm tài khoản.
8. Kết quả hiện tại chỉ đọc, dùng bản nội dung giữ trong phiên; làm lại thay phiên sau xác nhận, không lưu lượt cũ.
9. Dữ liệu gốc/đáp án phải duyệt trước phát hành; phần bổ sung có thể thiếu nhưng không được giả đã duyệt.
10. Giữ thương hiệu/màu sắc chung; chỉnh bố cục để ưu tiên bài và hành động học.
11. Chỉ hiện số đúng/sai/bỏ trống/tỷ lệ; không tự kết luận đỗ JLPT.
12. Xem kết quả/luyện lại câu sai trong phiên thuộc V1; lịch sử lâu dài, lưu câu, SRS tự động, biểu đồ và nghe hiểu để sau.
13. Hạn lưu tạm cố định 24 giờ; hết hạn, thay lượt hoặc chủ động xóa thì không còn kết quả cũ. Không hứa khôi phục sau đóng tab.
14. Lưu lỗi vẫn làm được bằng RAM; thông báo đúng giới hạn, không chặn vì tài khoản hoặc storage.
15. Chỉ xóa key thuộc module, không xóa storage của các phần khác. Các tab hoạt động độc lập, không khóa/đồng bộ nhau.

Nếu thay một quyết định trong danh sách này khi triển khai, cập nhật đặc tả và các AC liên quan trước khi đổi hành vi. Không cần hỏi lại về các lựa chọn triển khai nhỏ không làm thay đổi sản phẩm đã mô tả.

## 21. Tài liệu tham khảo và vị trí mã liên quan

Các nguồn tham khảo được dùng để phân biệt luyện tập, mô phỏng thi và đọc lời giải. Bố cục, ba chế độ và các quy tắc lưu bài trong tài liệu này là quyết định thiết kế của dự án, không phải yêu cầu bắt buộc từ JLPT.

- [JLPT — Mục đích các dạng câu N2](https://www.jlpt.jp/e/guideline/pdf/n2_e.pdf): dạng câu và năng lực được kiểm tra; đặc biệt quan hệ giữa câu và mạch văn.
- [JLPT — Bài mẫu theo dạng](https://www.jlpt.jp/e/samples/forlearners.html?mode=pc): mẫu từng loại câu, phân biệt với bài luyện đầy đủ.
- [JLPT — Official Practice Workbook](https://www.jlpt.jp/e/samples/sampleindex.html?mode=pc): nội dung luyện theo phần, phiếu trả lời, đáp án và phần nghe.
- [JLPT — FAQ](https://www.jlpt.jp/e/faq/): điểm chuẩn hóa không phải phép quy đổi trực tiếp từ số câu đúng.
- [Cambridge — Preparing for Digital](https://www.cambridgeenglish.org/exams-and-tests/qualifications/ways-to-take-exam/digital/preparation/): phân biệt luyện ngắn có phản hồi với bài mô phỏng thi.
- [Bunpro — Introduction to Cram](https://bunpro.jp/support/using-bunpro/Introduction-to-Cram): luyện nội dung tự chọn và trợ giúp, tách khỏi ôn định kỳ.
- [MDN — Window.sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage): lưu theo tab, tồn tại qua reload/restore, hành vi bản sao khi có opener; không suy ra bảo đảm lưu lâu dài.
- [MDN — Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage): tồn tại qua nhiều phiên và không tự hết hạn; không được chọn để lưu bài làm V1.
- [Nguồn PDF tại máy](<F:/Downloads/N2 - 20 Nichi de Goukaku.pdf>): nguồn đối chiếu sách hiện tại; không coi chỉ dẫn trong sách là chỉ dẫn thao tác dự án.
- [Hướng dẫn dữ liệu hiện có](../../src/data/exams/jlpt/README.md).
- [Các kiểu dữ liệu hiện có](../../src/data/exams/jlpt/types.ts).
- [Ngày 1 hiện có](../../src/data/exams/jlpt/n2/kokusho-20days/day01.json).
- [Kho JLPT](../../src/pages/Exam/JLPTExamHub.tsx).
- [Thẻ câu hỏi](../../src/pages/Exam/components/ExamQuestionCard.tsx).
- [Phiên có giờ](../../src/pages/Exam/sessions/MockExamSession.tsx).

Tham chiếu mã phía trên dùng đường dẫn tương đối từ thư mục chứa tài liệu; cần giữ liên kết hoạt động khi tổ chức lại thư mục trong triển khai.

## 22. Bổ sung theo yêu cầu triển khai toàn bộ sách

Yêu cầu tiếp theo của người dùng mở rộng phạm vi từ pilot ngày 1 sang đủ 20 ngày, ghép đáp án cuối sách và kiểm tra từng bài. Quy tắc không cần đăng nhập, sessionStorage theo tab và không có lịch sử lâu dài vẫn áp dụng.

- Đã nhập đủ 20 ngày/1.080 câu; không dùng ảnh trang đáp án làm nội dung trong lúc làm bài.
- Mỗi bài có text OCR theo trang, JSON, nguồn đáp án và trích ảnh gốc của câu/đoạn.
- Bổ sung `delivery: source_scan`, `sourceImage`, `sourcePages`, `answerPages`, `ocrText`, `transcriptionStatus`. Cấu trúc này dùng bản quét làm nội dung chính khi text chưa duyệt; không gắn nhãn verified cho toàn văn OCR.
- Với delivery này, ảnh gốc bảo toàn gạch chân, ô trống và ★; liên kết nhóm đoạn văn vẫn bắt buộc. Validator kiểm tra nguồn ảnh thay cho yêu cầu marker text đã chuẩn hóa. Câu 52 vẫn một lựa chọn/một điểm.
- Nội dung source_scan được dùng để test/luyện đầy đủ. Xem text OCR là thao tác chủ động với nhãn chờ duyệt; TTS và phân tích tự động không dùng bản text đó làm thông tin chắc chắn.
- Thêm phóng to ảnh gốc trong khung cuộn riêng để đọc trên điện thoại.
- Chỉ chuyển sang `delivery: text` khi đã duyệt văn bản và đầy đủ marker; không suy ra bản chép đúng chỉ từ việc kiểm tra chức năng/chấm điểm thành công.
- Test chức năng tự động dùng DOM mô phỏng cho cả ba chế độ mỗi ngày và các tình huống phiên tạm. Chúng không thay thế kiểm tra trình bày bằng trình duyệt thực.

Xem quy trình và các đầu ra chi tiết tại `imports/jlpt/kokusho-20days/README.md`; không coi các dòng mô tả hiện trạng trước triển khai ở mục 2 là báo cáo nghiệm thu hiện tại.

## 23. Luyện theo dạng toàn ngân hàng và lời giải tham khảo

- Điểm vào Luyện theo dạng đặt ở cấp sách, gom đủ 1.080 câu của 20 ngày. Thi thử và Lướt đề vẫn chọn theo ngày.
- Ngân hàng là dữ liệu dẫn xuất, không nhân bản 20 JSON nguồn. Mỗi câu giữ `origin` gồm bài, ngày và số câu gốc; ID và ảnh nguồn không đổi. Các passage ID được gắn phạm vi bài để không gộp nhầm các ngày.
- Trộn Fisher–Yates theo đơn vị độc lập/đoạn chung. Bắt đầu lượt mới mới trộn; thứ tự nằm trong `questionIds` của phiên và giữ qua reload. Không đảo bốn phương án.
- Phiên chỉ mang bản chụp các câu/đoạn đã chọn. Luyện sai/bỏ trống/cờ giữ đầy đủ đoạn liên quan; đường dẫn luyện lại theo một ngày không bị ép sang toàn ngân hàng.
- Có thể đổi dạng/số câu mà chưa xóa phiên cũ; chỉ khi xác nhận bắt đầu lượt mới mới thay phiên. Trộn lượt mới lấy lại từ toàn ngân hàng, không chỉ tập con của lượt vừa kết thúc.
- Đã bổ sung 1.080 lời giải tiếng Việt. `explanationStatus: authored` cho phép hiện như tham khảo, luôn có nhãn AI biên soạn và không phải lời giải nhà xuất bản. Trạng thái này độc lập `transcriptionStatus` và `enrichmentStatus` của bản dịch/phân tích cũ.
- Lời giải gồm cách đọc/cách viết/ý nghĩa và kết hợp từ, mẫu ngữ pháp, câu ghép đầy đủ và vị trí sao, hoặc liên kết ngữ cảnh bài đọc. Không ép từ gần nghĩa thành thay thế nhau trong mọi trường hợp.
- Chỉ mở lời giải sau chốt trong Drill, sau nộp/hết giờ trong Mock, hoặc chủ động mở ở Lướt đề. Bản nháp dịch/phân tích cũ vẫn ẩn ngoài chế độ xem nháp phát triển.
- Bản nội dung của phiên cũ không tự bị ghi đè; trang báo có phiên bản mới và hướng dẫn bắt đầu lượt mới để nhận lời giải mới.

## 24. Hiển thị đề bằng chữ và chọn từ tra cứu

- Toàn bộ 20 ngày/1.080 câu dùng text chính cho đề, bốn lựa chọn, 20 đoạn văn và chú thích Nhật; ảnh nguồn được mở chủ động qua mục Đối chiếu bản quét gốc. Bản sửa này thay cách hiển thị hiện hành ở mục 22.
- Giữ gạch chân từ đích, ô điền, bốn vị trí sắp xếp với một ★, mã ô trống lặp a/b/c và liên kết năm câu cùng đoạn. Thứ tự phương án và bảng đáp án không đổi.
- Native radio chọn đáp án; chữ trong nhãn lựa chọn vẫn bôi đen được. Kéo chọn chữ không tự đổi đáp án. Có thể chọn bằng bàn phím và tab đến radio.
- Bôi đen một từ/cụm Nhật trong cùng vùng câu/đáp án/đoạn/chú thích để hiện Tra từ đã chọn (tối đa 80 ký tự). Tra từ ghi dấu hỗ trợ ở lượt luyện; không mở trong lượt Mock chưa nộp. Không tự dịch cả đoạn khi chọn vượt phạm vi.
- Text dùng `transcriptionStatus: verified`, `delivery: text`, revision 4, kèm danh sách tám trang đã đối chiếu mỗi ngày. Lớp lời giải AI và lớp dịch/phân tích nháp vẫn có trạng thái riêng.
- Phiên đã tạo trước bản sửa giữ snapshot cũ để bảo toàn bài làm; bắt đầu lượt mới để nhận text. Không cần đăng nhập, không đổi quy tắc sessionStorage/TTL.
