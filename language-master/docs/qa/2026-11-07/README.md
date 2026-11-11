# Báo cáo kiểm thử JLPT — 07–08/11/2026

Mốc kiểm tra: **df1754723de972c0a52bfeb8b7dc5ccf574c8f3d**. Kiểm tra bản local, không đăng nhập. Không sửa mã ứng dụng, dữ liệu đề hoặc bộ test. Chỉ bổ sung tài liệu và ảnh QA.

**Kết luận:** giữ ba chế độ hiện tại là hợp lý: Luyện theo dạng, Làm bài có giờ, Xem đề & lời giải. Các luồng chính đã chạy được. Chưa nên coi bản này đã hoàn thiện: có **7 lỗi đã tái hiện trực tiếp** và **1 lỗi nhánh dịch thất bại xác định từ code**. Ưu tiên sửa tính nhất quán và trải nghiệm màn hình nhỏ; chưa cần thiết kế lại toàn bộ.

## Kết quả kiểm tra

| Nhóm | Kết quả và giới hạn |
|---|---|
| Bộ test logic hiện có | **55/55 đạt** |
| Bộ test giao diện mô phỏng | **93/93 đạt**, 2 file; gồm các ca cho đủ 20 ngày |
| Kiểm tra bổ sung bộ chọn câu | **6.849 cấu hình đạt** quy tắc chọn câu/giữ cụm; không đồng nghĩa nhãn xem trước trên UI đúng |
| Luyện lại câu trong đoạn | **100 trường hợp đạt** giữ đủ cụm và khôi phục phiên |
| Biên dịch / bản đóng gói | **Đạt**, TypeScript và Vite hoàn thành; có cảnh báo kích thước gói |
| ESLint phạm vi JLPT | **Đạt**, không có lỗi; chưa coi là lint toàn bộ repository |
| Trình duyệt thực | Đã thao tác cả ba chế độ, kho sách, chọn dạng/ngày, nhóm đoạn, nộp bài, kết quả, luyện lại, tra cứu và sổ tay |
| Giao diện | Đã xem màn hình rộng 1280×900, 1440×900; màn hình hẹp khoảng 347–390 px; ngang 844×390. Đây là thay đổi kích thước viewport, chưa phải thử trên thiết bị iOS/Android thật |
| Nội dung | Có kiểm tra cấu trúc dữ liệu, đáp án và cách dựng câu qua test; **chưa đọc đối chiếu ngữ nghĩa toàn bộ 1.080 lời giải với PDF** |

Ảnh và báo cáo có trong thư mục này. [Mở thư viện ảnh](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/gallery.html). [Kết quả logic chi tiết](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/logic-results.json).

## Lỗi đã tái hiện trên trình duyệt

### QA-01 · P2 · Tìm trong một cuốn sách không có kết quả vẫn hiện đủ 20 bài

**Cách lặp:** mở sách N2 → nhập “zzznomatch” trong ô tìm kiếm. URL và ô tìm kiếm nhận đúng chuỗi nhưng danh sách vẫn ghi 20 bài và hiện mọi ngày.

**Mong đợi:** 0 bài, thông báo không tìm thấy và nút xóa từ khóa. Cần giữ thông tin sách độc lập với danh sách bài sau lọc.

Vị trí: [JLPTExamHub.tsx:89](F:/Workspace/learn-language/language-master/src/pages/Exam/JLPTExamHub.tsx:89). Ảnh: [03-search-no-match.jpg](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/03-search-no-match.jpg).

### QA-02 · P2 · Thiết lập báo 54 câu nhưng lượt luyện chỉ có 52

**Cách lặp:** chọn Ngày 1 → cả 9 Mondai → Số câu bằng nhau mỗi Mondai → 10 câu/dạng. Ô tổng báo **54**, sau Bắt đầu chỉ có **52**. Phân bố thực tế là 5, 5, 5, 7, 5, 5, 10, 5, 5.

Bộ chọn câu xử lý hạn mức từng dạng đúng; UI tính tổng bằng công thức khác. Chế độ tổng số câu cũng có trường hợp tăng số câu để giữ nguyên đoạn văn, nhưng phần xem trước chưa giải thích rõ.

**Mong đợi:** dùng chung quy tắc tính với bộ chọn câu; nếu số câu phụ thuộc cụm ngẫu nhiên, báo số thực tế hoặc khoảng rõ ràng trước khi bắt đầu.

Vị trí: [ExamWorkspace.tsx:710](F:/Workspace/learn-language/language-master/src/pages/Exam/ExamWorkspace.tsx:710). Ảnh: [trước khi bắt đầu](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/04-setup-promises54.jpg), [lượt được tạo](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/05-round-actual52.jpg).

### QA-03 · P2 · Trang chuẩn bị bài có giờ ghi “1080 câu · 50 phút”

**Cách lặp:** khi không có phiên, mở trực tiếp đường dẫn /exams/jlpt/pool-N2-kokusho-n2-20days/mock. Tiêu đề nói 54 câu, ô xác nhận phía dưới nói 1080 câu. Bấm Bắt đầu tạo đúng 54 câu.

**Mong đợi:** 1.080 chỉ là quy mô ngân hàng; ô xác nhận bài làm phải ghi 54 câu. Nút vào nhanh từ kho hiện tạo bài 54 câu đúng.

Vị trí: [ExamWorkspace.tsx:1253](F:/Workspace/learn-language/language-master/src/pages/Exam/ExamWorkspace.tsx:1253). Ảnh: [12-mock-setup1080.jpg](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/12-mock-setup1080.jpg).

### QA-04 · P2 · Dùng dịch sau khi đã trả lời vẫn bị tính là trợ giúp trước khi kiểm tra

**Cách lặp:** trong luyện theo dạng, chọn đáp án câu đơn → câu đã khóa, hiện đúng/sai → bấm Dịch câu → kết thúc lượt. Kết quả ghi **1 câu có hỗ trợ trước khi kiểm tra**, dù lúc trả lời chưa dùng trợ giúp.

**Mong đợi:** chỉ ghi nhận hỗ trợ trước khi câu được chốt. Học lời giải sau khi trả lời không làm thay đổi thống kê này; nếu cần đo hoạt động học sau đáp án, tách thành chỉ số khác.

Vị trí: [ExamWorkspace.tsx:471](F:/Workspace/learn-language/language-master/src/pages/Exam/ExamWorkspace.tsx:471). Ảnh: [08-assisted-after-answer.jpg](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/08-assisted-after-answer.jpg).

### QA-05 · P2 · Lưu cùng một từ nhiều lần tạo bản trùng

**Cách lặp:** bôi đen 勝敗 → tra trực tuyến → Lưu vào sổ tay → đợi thông báo thành công → bấm Lưu vào sổ tay lần nữa. Trong từ điển của sổ tay có **hai dòng 勝敗**, cùng “Shōhai” và “Chiến thắng hay thất bại”.

Đây là hai lần bấm riêng biệt, không phải chỉ lỗi do bấm liên tục lúc đang lưu. Nút chỉ vô hiệu hóa trong thời gian chờ, hàm thêm từ luôn nối thêm mục mới.

**Mong đợi:** báo “Đã lưu”, chặn lưu lại cùng mục hoặc hỏi cập nhật khi nghĩa mới khác. Cần xử lý cả ở luồng lưu dữ liệu, không chỉ khóa nút. Ngoài ra, phiên âm Latin đang được đặt trong cột “Hiragana”; nên phân biệt hai loại phiên âm.

Vị trí: [WordLookupModal.tsx:112](F:/Workspace/learn-language/language-master/src/pages/Exam/components/WordLookupModal.tsx:112), [multiBookLookup.ts:262](F:/Workspace/learn-language/language-master/src/lib/dictionary/multiBookLookup.ts:262), [customCourseService.ts:528](F:/Workspace/learn-language/language-master/src/lib/customCourses/customCourseService.ts:528).
Ảnh: [20-duplicate-notebook.jpg](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/20-duplicate-notebook.jpg).

### QA-06 · P2 · Mục lục vẫn trỏ tới câu đã bị bộ lọc ẩn đi

**Cách lặp:** Xem đề Ngày 7 → lọc Mondai 7 → mục lục vẫn có đủ 1–54 → bấm 1. Đường dẫn đổi sang #q-kokusho_n2_d07_m1_01 nhưng câu đó không tồn tại trong phần đang hiển thị, trang không đưa người dùng tới câu 1.

**Mong đợi:** mục lục dùng cùng tập câu với bộ lọc, hoặc bấm câu ngoài bộ lọc thì chủ động đổi bộ lọc rồi chuyển tới câu. Lỗi cùng dạng có thể xuất hiện ở xem kết quả sau lọc Sai/Bỏ trống.

Vị trí: [ExamWorkspace.tsx:1910](F:/Workspace/learn-language/language-master/src/pages/Exam/ExamWorkspace.tsx:1910), [ExamWorkspace.tsx:1936](F:/Workspace/learn-language/language-master/src/pages/Exam/ExamWorkspace.tsx:1936). Đã kiểm tra DOM sau bấm: hash đúng câu 1, nhưng không có phần tử đích. Ảnh bố cục liên quan: [19-review-desktop.jpg](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/19-review-desktop.jpg).

### QA-07 · P2 · Thanh bài đang dở bị ép thành cột chữ trên điện thoại

**Cách lặp:** đang có lượt luyện toàn sách → mở Xem đề Ngày 7 ở chiều rộng khoảng 390 px. Thanh đầu trang có tên bài, Làm tiếp và Kết thúc và xóa phiên; tên bài bị ép vào một cột rất hẹp, xuống gần từng từ và chiếm khoảng 230 px chiều cao.

**Mong đợi:** phần tên/trạng thái chiếm một hàng trên màn hình nhỏ, các nút nằm hàng riêng; giới hạn tên dài. Đây là lỗi bố cục có ảnh thực tế, không phải nhận xét từ CSS đơn thuần.

Vị trí: [ExamWorkspace.tsx:770](F:/Workspace/learn-language/language-master/src/pages/Exam/ExamWorkspace.tsx:770).
Ảnh: [17-review-mobile.jpg](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/17-review-mobile.jpg).

## Nhánh lỗi xác định từ code, chưa mô phỏng trên trình duyệt

### QA-08 · P2 · Lỗi dịch có thể được lưu thành nghĩa từ

Khi dịch trực tuyến lỗi/không có kết quả, hàm trả “Không tìm thấy bản dịch phù hợp.” trong trường translation. Modal vẫn coi đây là kết quả và hiện nút lưu; hàm lưu nhận nguyên thông báo lỗi làm nghĩa.

**Mong đợi:** tách thành công / không tìm thấy / lỗi mạng; chỉ cho lưu nghĩa hợp lệ, có nút thử lại. Lần tra trực tuyến thực tế trong đợt QA này thành công; chưa cưỡng bức mất mạng hay HTTP lỗi để xác minh bằng UI.

Vị trí: [multiBookLookup.ts:208](F:/Workspace/learn-language/language-master/src/lib/dictionary/multiBookLookup.ts:208), [WordLookupModal.tsx:380](F:/Workspace/learn-language/language-master/src/pages/Exam/components/WordLookupModal.tsx:380).

## Những luồng đã chạy đúng

| Chức năng | Bằng chứng kiểm tra |
|---|---|
| Dùng không đăng nhập | Toàn bộ thao tác JLPT trong trình duyệt thực thực hiện khi còn nút Đăng nhập |
| Lọc cấp độ không có đề | N1 hiện trạng thái rỗng, Xóa bộ lọc khôi phục sách N2 |
| Chọn Mondai/ngày/phân bổ | Có thể thay cấu hình và bắt đầu; lỗi nhãn tổng tách riêng ở QA-02 |
| Luyện câu đơn | Chọn đáp án chấm ngay, khóa lựa chọn, mở lời giải |
| Luyện đoạn văn | Chọn một câu chưa lộ đúng/sai; chưa đủ 5 câu thì Kiểm tra nhóm bị khóa; đủ nhóm mới chấm và khóa cả 5 |
| Đánh dấu và tải lại | Giữ đáp án đã chọn, trạng thái khóa và dấu chưa chắc sau reload cùng tab |
| Phiếu câu hỏi trên điện thoại | Mở/đóng được; chọn câu thứ 5 trong nhóm đưa tới đúng câu nguồn 54 sau khi cuộn hoàn tất |
| Bản quét | Mở/thu gọn, phóng to được; câu hỏi và đáp án chính là text riêng |
| Thi có giờ | Nút vào nhanh tạo 54 câu lấy từ nhiều ngày; chọn rồi đổi đáp án được, chưa hiện lời giải trước nộp |
| Nộp trước hạn | Hộp xác nhận báo đúng số bỏ trống/đánh dấu; nộp xong khóa kết quả |
| Tự nộp hết giờ | Đã quan sát phiên chuyển sang “Kết quả hiện tại · Hết giờ”, thời gian 50 phút |
| Phím tắt | 1–4, F hoạt động khi làm bài; phím trả lời/chuyển câu không làm thay đổi bài khi hộp xác nhận/tra từ đang mở; Escape đóng hộp |
| Luyện câu sai trong đoạn | Thông báo 1 câu cần ôn nhưng 5 câu thực hành để giữ ngữ cảnh; tạo đủ nhóm 5 |
| Luyện câu bỏ trống | 53 câu bỏ trống tạo lượt mới 53 câu |
| Luyện câu chưa chắc | Một câu đã đánh dấu tạo lượt mới đúng 1 câu; nút bị khóa khi không có câu đánh dấu |
| Thay lượt/xóa phiên | Có xác nhận trước thay bài; xóa phiên đưa về thiết lập/kho và hiện “Đã xóa phiên tạm” |
| Xem đề/lời giải | Lọc Mondai, mở và thu gọn tất cả hoạt động; các lựa chọn là chỉ đọc; việc xem đề khác giữ bài đang dở |
| Hai ô trống | Logic xác nhận Ngày 7 câu 41 và Ngày 8 câu 42 ghép đúng; bản dịch thực tế câu 41 phản ánh câu hoàn chỉnh |
| Bôi đen tra cứu | Đã kéo chọn đúng 勝敗 từ câu hỏi, mở tra từ và nhận bản dịch trực tuyến |
| Từ điển đa sách | 富士山 trả nội dung từ hai giáo trình; hộp tra từ cuộn được ở 844×390 |
| Lưu sổ tay | Lưu được cho khách; lỗi lưu trùng nêu riêng ở QA-05 |
| Nội dung chưa có | Mục Đọc hiểu mở thông báo đang phát triển |

## Đề nghị về thiết kế và trải nghiệm

1. **Giữ ba chế độ.** Chúng phục vụ ba nhu cầu khác nhau, hiện không có lý do gộp hoặc bỏ. “Luyện theo dạng” lấy từ toàn ngân hàng là đúng; lọc theo ngày là tùy chọn.
2. **Thống nhất mọi con số trước khi thêm tính năng.** Số câu xem trước, số câu thực tế, số câu cần ôn và số câu giữ ngữ cảnh cần được diễn đạt riêng, rõ ràng.
3. **Thu gọn đầu trang khi đang làm bài.** Trên màn hình nhỏ, thẻ trạng thái + banner + thanh thao tác chiếm phần lớn màn hình đầu. Ưu tiên câu hỏi, đồng hồ thi và nút nộp.
4. **Giảm sự cạnh tranh giữa hai đồng hồ.** Widget 25:00 vẫn nổi cùng đồng hồ thi 50 phút, có lúc che nội dung/nút ở đáy màn hình. Nên tự thu gọn hoặc đặt ra ngoài vùng làm bài trong chế độ có giờ.
5. **Trang xem đề nên gom tiêu đề và hướng dẫn theo Mondai.** Hiện tiêu đề/hướng dẫn lặp lại ở từng câu đơn làm trang rất dài; mục lục cần phản ánh bộ lọc đang chọn.
6. **Làm rõ phạm vi lưu trữ.** Kết quả JLPT chỉ nằm trong tab là đúng. “Lưu vào sổ tay” lại tạo bộ từ lưu cục bộ lâu hơn; đây là hành vi riêng cần nói rõ cho khách, tránh hiểu là mọi thứ đều mất khi đóng tab.
7. **Ưu tiên tốc độ tải từ điển.** Build tạo localDictionaryIndex khoảng 22,52 MB, gzip 5,43 MB; đây là tín hiệu cần tối ưu cách nạp/index từ điển. Chưa có benchmark mạng di động hoặc Core Web Vitals nên chưa quy kết thời gian chờ cụ thể.

## Giới hạn cần giữ đúng khi đọc báo cáo

- “93 test giao diện đạt” là kiểm tra mô phỏng, không có nghĩa đã bấm từng câu của cả 20 ngày trên trình duyệt thật.
- Không đánh giá âm thanh phát ra/độ chuẩn của giọng đọc chỉ từ việc nút nghe có mặt.
- Chưa kiểm tra đủ các trình duyệt, thiết bị cảm ứng thật, chế độ sáng và trình đọc màn hình.
- Chưa có ca UI cưỡng bức lỗi mạng; lỗi QA-08 mới được xác định bằng đường đi code.
- Chưa đối chiếu thủ công toàn bộ 1.080 lời giải với bản gốc PDF; cần một đợt kiểm chứng nội dung riêng nếu muốn khẳng định độ chính xác học thuật.
- Phạm vi này là khu luyện đề JLPT và công cụ nối trực tiếp với nó. Các khu học khác, đăng nhập, đồng bộ tài khoản và bảng xếp hạng chưa được coi là đã QA toàn bộ.
- Sau kiểm thử không còn phiên JLPT thử; kho khóa học thử được quan sát trở về 0. Source và dữ liệu đề giữ nguyên.

## Thứ tự xử lý đề nghị

Sửa QA-02/03/04 và QA-05 trước để số liệu và dữ liệu lưu đúng; tiếp theo QA-01/06/07 để điều hướng và giao diện ổn; bổ sung trạng thái lỗi QA-08. Sau đó chạy lại 148 test hiện có và các kịch bản hồi quy tương ứng trong báo cáo, rồi kiểm tra thêm trên điện thoại thật.

