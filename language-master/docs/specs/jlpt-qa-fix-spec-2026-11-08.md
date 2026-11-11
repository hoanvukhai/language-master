# Đặc tả sửa lỗi và hoàn thiện trải nghiệm JLPT sau kiểm thử

- Ngày lập: **08/11/2026**.
- Phiên bản: **1.0**.
- Trạng thái: **Đặc tả để triển khai ở bước sau; chưa sửa mã ứng dụng**.
- Mốc hiện trạng: commit **df1754723de972c0a52bfeb8b7dc5ccf574c8f3d**.
- Cơ sở: [báo cáo QA 07–08/11](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/README.md), [21 ảnh kiểm thử](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/gallery.html), [kết quả tự động](F:/Workspace/learn-language/language-master/docs/qa/2026-11-07/automated-results.md).
- Tài liệu nền: [đặc tả chức năng V1](F:/Workspace/learn-language/language-master/docs/specs/jlpt-practice-v1.md), [đặc tả giao diện trước đây](F:/Workspace/learn-language/language-master/docs/specs/jlpt-ui-redesign.md).

Tài liệu này quy định **sửa như thế nào và kiểm tra bằng gì**, không xác nhận việc sửa đã hoàn thành. Những mô tả cũ như chỉ có Ngày 1, cần thêm 19 ngày, hoặc lỗi đã được khắc phục không được dùng làm hiện trạng mới. Đối với các mục được nêu ở đây, quy tắc của tài liệu này thay thế mô tả mâu thuẫn trong tài liệu cũ; ngoài phạm vi này, giữ hành vi đã được kiểm chứng.

## 1. Mục tiêu, phạm vi và các quyết định giữ nguyên

### 1.1. Mục tiêu

1. Người học nhìn thấy đúng số câu, trạng thái và kết quả của lượt mình thực sự làm.
2. Tìm kiếm, bộ lọc và mục lục thống nhất với nội dung đang hiển thị.
3. Tra cứu và lưu từ không tạo dữ liệu trùng hoặc dữ liệu chứa thông báo lỗi.
4. Giao diện dùng được trên màn hình nhỏ, không ép chữ hoặc che thao tác chính.
5. Mọi sửa đổi giữ nguyên quyền dùng không đăng nhập và cách lưu phiên tạm đã được người dùng chốt.

### 1.2. Quyết định sản phẩm bắt buộc giữ

| Nội dung | Quy tắc |
|---|---|
| Ba chế độ | Giữ **Luyện theo dạng**, **Làm bài có giờ**, **Xem đề & lời giải**; không thêm chế độ chính thứ tư |
| Nguồn luyện theo dạng | Mặc định là ngân hàng toàn sách, hiện có 20 ngày; lọc ngày là tùy chọn |
| Người dùng | Khách và người đăng nhập đều vào được các chức năng JLPT |
| Phiên bài làm | Chỉ một lượt hiện tại trong tab, lưu bằng sessionStorage; giữ TTL 24 giờ đang có |
| Không lưu được phiên | Cho làm bằng bộ nhớ, thông báo khả năng mất bài khi tải lại; không bắt đăng nhập |
| Kết quả | Không ghi lịch sử dài hạn, điểm tài khoản, xếp hạng hoặc đồng bộ bài làm |
| Câu đơn trong luyện | Chọn đáp án là chốt câu, khóa lựa chọn và mở phản hồi |
| Đoạn văn trong luyện | Giữ nháp đến Kiểm tra nhóm; không tách mất câu/ngữ cảnh |
| Bài có giờ | Đáp án đổi được trước nộp/hết giờ; thời gian tiếp tục chạy khi rời màn hình |
| Xem đề/lời giải | Chỉ đọc; không tạo lượt mới và không thay bài đang dở |
| Đề và lựa chọn | Text là nội dung chính, chọn chữ được; ảnh quét là phần đối chiếu mở chủ động |
| Định danh | Giữ ID câu, nguồn ngày, passage, thứ tự lựa chọn và đáp án gốc |
| Chấm điểm | Giữ công thức hiện tại trong đợt sửa này; nếu hiện /60 phải ghi rõ **điểm tham khảo nội bộ**, không gọi là điểm JLPT chính thức |
| Sổ tay | Là chức năng lưu từ riêng đã có; không được dùng nó để lưu bài làm/điểm JLPT |

sessionStorage không phải bảo đảm xóa tuyệt đối ngay khi người dùng đóng tab: một số trình duyệt có thể phục hồi tab/phiên. Thông báo sản phẩm dùng “giữ tạm trong tab, có thể mất khi đóng tab hoặc hết hạn”, không hứa đồng bộ hoặc khôi phục lâu dài. Giữ cơ chế TTL và xóa phiên hiện tại, không thêm cơ chế lưu dự phòng dài hạn.

### 1.3. Phạm vi của đợt sửa

- **Gói A — bắt buộc:** tám mục FIX-01 đến FIX-08 bên dưới, các kiểm tra hồi quy và cập nhật tài liệu tương ứng.
- **Gói B — cải tiến đề xuất:** thu gọn phòng làm bài, xử lý hai đồng hồ, nhóm tiêu đề ở màn xem đề, đo/giảm chi phí tải từ điển. Các mục này có đặc tả riêng nhưng không được đánh đồng với tám lỗi bắt buộc.
- Không nhập thêm PDF, sửa 1.080 lời giải, thay đáp án, thêm đề/ngôn ngữ, thay cơ chế tài khoản hoặc tái cấu trúc toàn bộ ứng dụng trong đợt này.
- Tất cả thay đổi hiện tại chỉ là tài liệu. Phân chia trên không phải yêu cầu triển khai code ngay trong lượt viết đặc tả.

## 2. Danh mục giữ, sửa, thêm, bỏ

| Hành động | Hạng mục |
|---|---|
| Giữ | Ba chế độ, ngân hàng toàn sách, lọc ngày/Mondai, nhóm đoạn, phiên tạm, công cụ tra cứu |
| Sửa | Tìm kiếm rỗng, tổng câu xem trước, thông tin bài có giờ, thống kê trợ giúp, lưu từ, mục lục, thanh tiếp tục trên điện thoại, trạng thái lỗi dịch |
| Thêm | Lượt dự kiến trong bộ nhớ; kết quả lưu từ có trạng thái rõ; phân biệt thành công/không tìm thấy/lỗi khi dịch; kiểm tra hồi quy cho các lỗi này |
| Bỏ hành vi | Bốc lại câu sau khi đã hiện số xem trước; lấy sách chưa lọc để thay danh sách rỗng; ghi trợ giúp sau chốt; ghi nối từ trùng; coi thông báo lỗi là bản dịch; liên kết tới câu không được render |
| Không tự xóa | PDF, JSON đề, phiên hợp lệ, bộ từ hiện có, các mục trùng đã được người dùng lưu trước đây |

## 3. Bản đồ lỗi và ưu tiên triển khai

Cả tám mục được xếp P2 trong đợt QA. “Thứ tự” dưới đây là thứ tự triển khai theo quan hệ phụ thuộc, không phải đánh giá lại mức độ nghiêm trọng.

| Mã đặc tả | Mã QA | Nội dung | Bằng chứng hiện có | Thứ tự |
|---|---|---|---|---|
| FIX-01 | QA-01 | Tìm trong sách không có kết quả | Trình duyệt, ảnh 03 | 4 |
| FIX-02 | QA-02 | Xem trước 54, thực tế 52 | Trình duyệt, logic, ảnh 04–05 | 1 |
| FIX-03 | QA-03 | Chuẩn bị 1.080 câu thay vì 54 | Trình duyệt, ảnh 12 | 1, cùng FIX-02 |
| FIX-04 | QA-04 | Trợ giúp sau chốt bị tính trước chốt | Trình duyệt, ảnh 08 | 2 |
| FIX-05 | QA-05 | Lưu trùng từ | Trình duyệt, ảnh 20 | 3 |
| FIX-06 | QA-06 | Mục lục không theo bộ lọc | Trình duyệt, đối chiếu phần tử đích | 4 |
| FIX-07 | QA-07 | Thanh tiếp tục ép chữ trên điện thoại | Trình duyệt, ảnh 17 | 5 |
| FIX-08 | QA-08 | Thông báo lỗi dịch có thể được lưu thành nghĩa | Đường đi code; chưa mô phỏng mạng lỗi bằng UI | 2–3, trước hoàn tất FIX-04/05 |

FIX-08 phải được xác nhận bằng ca lỗi có kiểm soát khi triển khai. Không mô tả nó là lỗi đã tái hiện trên trình duyệt ở báo cáo cũ.

## 4. FIX-01 — Tìm kiếm đúng trong cuốn sách đang mở

### 4.1. Vấn đề

Mở sách N2 và tìm “zzznomatch” vẫn hiện 20 bài. Phần chọn sách dùng bản sách chưa lọc làm phương án dự phòng khi không có kết quả; danh sách bị khôi phục ngoài ý muốn.

### 4.2. Hành vi yêu cầu

1. Tách **thông tin sách đang mở** khỏi **tập bài phù hợp từ khóa**. Sách hợp lệ vẫn giữ tiêu đề, mô tả và cấp độ dù không có bài khớp.
2. Khi đang trong sách, chỉ render các bài khớp thuộc sách đó. Tổng ở đầu danh sách phải bằng số thẻ đang hiển thị.
3. Không có kết quả: hiện “Không tìm thấy bài phù hợp trong sách này.” và nút **Xóa từ khóa**; không tự quay về toàn bộ 20 bài.
4. Xóa từ khóa chỉ bỏ tham số q, giữ book và level. “Tất cả sách/Quay lại danh sách sách” bỏ book, giữ level và q như hành vi điều hướng hiện tại.
5. Ở kho tổng, sách không có bài khớp không được tính vào số sách kết quả.
6. Dùng một quy tắc so khớp chung: không phân biệt hoa/thường, bỏ khoảng trắng đầu/cuối. Giữ cơ chế tìm chuỗi hiện có; đợt này không thêm tìm gần đúng hoặc bộ tách từ tiếng Nhật.
7. ID sách không hợp lệ phải hiện thông báo riêng và lối về kho, không nhầm thành “không có bài khớp”.
8. URL là nguồn trạng thái cho q/book/level. Tải lại, Back/Forward phải cho cùng bộ lọc và kết quả, không hiển thị bộ lọc cũ với danh sách mới.
9. Tìm kiếm không sửa hoặc xóa phiên đang làm.

### 4.3. Ca nghiệm thu

| ID | Thao tác | Kết quả |
|---|---|---|
| S01 | Mở sách N2, tìm zzznomatch | 0 bài, có trạng thái rỗng, sách vẫn mở |
| S02 | Xóa từ khóa từ S01 | Khôi phục 20 bài, giữ book/level |
| S03 | Tìm “Day 20” | Chỉ hiện bài khớp Ngày 20; thử thêm khoảng trắng đầu/cuối vẫn cùng kết quả |
| S04 | Tìm “N2” | Khớp thông tin tên sách, có thể hiện đủ 20 bài; đây là kết quả hợp lệ |
| S05 | Tìm không khớp rồi reload/Back/Forward | Ô tìm, URL, tổng và thẻ nhất quán |
| S06 | Đang có bài dở, tìm/xóa từ khóa | Đáp án, deadline và attempt ID không đổi |

Vùng mã dự kiến: JLPTExamHub.tsx; chỉ tách dữ liệu lọc và render, không thay cấu trúc JSON sách.

## 5. FIX-02 — Một nguồn tính số câu cho xem trước và bắt đầu

### 5.1. Các số lượng phải phân biệt

| Khái niệm | Ý nghĩa | Ví dụ |
|---|---|---|
| Tổng ngân hàng | Tất cả câu trong nguồn sách | 1.080 |
| Câu phù hợp | Sau lọc nguồn/ngày/Mondai | 54 ở Ngày 1, đủ chín dạng |
| Mục tiêu | Người dùng yêu cầu theo chế độ phân bổ | 10 câu mỗi dạng hoặc tổng 20 |
| Câu thực tế của lượt | Danh sách cuối sau hạn mức và giữ cụm | 52 ở cấu hình đã tái hiện |
| Câu cần ôn | Câu sai/bỏ trống/đánh dấu dẫn tới lượt luyện lại | 1 |
| Câu thực hành | Câu cần ôn cộng các câu cùng đoạn để đủ ngữ cảnh | 5 |

Không dùng tổng ngân hàng hoặc tổng câu phù hợp thay cho số câu thực tế.

### 5.2. Quy tắc tạo lượt dự kiến

Chọn phương án triển khai **lượt dự kiến trong bộ nhớ**:

1. Cấu hình hợp lệ tạo một kế hoạch gồm cấu hình đã chuẩn hóa, nguồn/phiên bản nội dung, danh sách ID câu cuối và phân bố thực tế theo Mondai.
2. Các câu cùng đoạn là đơn vị chọn nguyên cụm. Không chia cụm, không lặp ID, không đưa câu ngoài bộ lọc vào để bù số.
3. Tổng xem trước lấy trực tiếp từ danh sách cuối. Phải tính sau mọi bước mở rộng cụm của luồng tạo lượt; không chỉ lấy độ dài danh sách yêu cầu ban đầu.
4. Bắt đầu dùng chính danh sách đó. Không gọi bộ chọn ngẫu nhiên lần nữa làm đổi tổng hoặc đổi câu sau khi xác nhận.
5. Render lại, mở/đóng tùy chọn nâng cao và cập nhật đồng hồ của bài cũ không được bốc lại kế hoạch.
6. Đổi nguồn/ngày/Mondai/chế độ phân bổ/số lượng làm mất hiệu lực kế hoạch cũ và tạo kế hoạch mới. Không thay phiên đang làm cho tới khi người dùng bấm Bắt đầu và xác nhận thay lượt nếu có.
7. Kế hoạch không phải Attempt: không có đồng hồ đang chạy, đáp án, điểm hay lịch sử; không ghi sessionStorage/localStorage.
8. Reload khi chỉ ở bước thiết lập được phép tạo kế hoạch mới. Phiên đang làm đã lưu vẫn khôi phục như cũ.
9. Hủy xác nhận thay lượt giữ nguyên phiên cũ và kế hoạch đang xem. Nếu nguồn hoặc cấu hình đã đổi trong lúc hộp mở, phải cập nhật lại tổng và yêu cầu người dùng bấm bắt đầu với kế hoạch mới, không dùng bản cũ.
10. Bấm bắt đầu nhiều lần chỉ tạo một Attempt cho lần xác nhận đó. Sau khi tạo, số thứ tự và tổng trong phòng làm bài phải khớp kế hoạch.
11. Nếu tạo kế hoạch thất bại, báo lỗi và cho thử lại; không dùng một tổng dự đoán để mở một lượt không khớp.
12. Không cần thêm nút “bốc lại” ở thiết lập chỉ để phục vụ sửa lỗi này. “Trộn lượt mới” hiện có tiếp tục tạo kế hoạch/lượt mới theo luồng được phép.

### 5.3. Ba cách phân bổ

- **Theo tỷ lệ bài mẫu:** dùng định mức đang có 5–5–5–7–5–5–12–5–5. Đây là cấu trúc của phần bài luyện hiện tại. Chọn ít Mondai thì chỉ cộng các dạng đã chọn; không luôn ghi 54.
- **Số câu mỗi Mondai:** áp hạn mức riêng từng dạng rồi giữ nguyên cụm. Dạng thiếu câu chỉ lấy phần có sẵn, không lặp câu và không lấy thêm ở dạng khác.
- **Tổng số câu mỗi lượt:** giữ cách trộn chung các đơn vị hiện tại. Không hứa phân bổ đều hoặc mọi Mondai đã chọn đều xuất hiện. Chỉ dừng sau khi đủ mục tiêu và vẫn giữ nguyên đơn vị cuối; vì vậy tổng thực tế có thể vượt mục tiêu.
- **Tất cả câu phù hợp:** lấy đúng toàn bộ các đơn vị trong phạm vi, không nhân số lượng theo số dạng và không giới hạn ngầm về 54.

### 5.4. Nội dung hiển thị

- Trường hợp khớp: **“Lượt này: 20 câu”**.
- Vượt do giữ cụm: **“Mục tiêu: 20 câu · Lượt này: 23 câu”**, kèm “Giữ nguyên nhóm câu trong đoạn văn nên số câu tăng thêm.”
- Thiếu câu từng dạng: **“Lượt này: 52 câu”**, kèm “Một số dạng không có đủ 10 câu trong nguồn đã chọn.”
- Có thể xem phân bố “M1: 5 · M2: 5 …” ngay trong khối tóm tắt nâng cao.
- Không có dạng/câu phù hợp: số thực tế 0, nút Bắt đầu bị khóa, có hướng dẫn chọn lại.
- Không thêm trang trung gian cho các nút vào nhanh đang có.

### 5.5. Ca nghiệm thu

| ID | Cấu hình / tình huống | Kết quả |
|---|---|---|
| C01 | Ngày 1, chín dạng, 10 câu/dạng | Xem trước và lượt đều **52**, phân bố 5,5,5,7,5,5,10,5,5 |
| C02 | Toàn sách, chín dạng, tỷ lệ bài mẫu | Cả xem trước và lượt là 54 |
| C03 | Chỉ Mondai 1, tỷ lệ bài mẫu | 5 câu, không ghi 54 |
| C04 | Tổng 20, thứ tự ngẫu nhiên kiểm soát khiến cụm cuối vượt 20 | Tổng thực tế và lý do tăng hiển thị trước; Bắt đầu giữ đúng IDs/tổng đã xem |
| C05 | Ngày 1, chín dạng, tất cả | 54, không trùng ID |
| C06 | Toàn sách, tất cả | 1.080, không mất nhóm đoạn hoặc nguồn ngày |
| C07 | Bỏ hết Mondai / nguồn rỗng | 0, không tạo phiên và không chạy đồng hồ |
| C08 | Đổi cấu hình rồi hủy thay lượt | Phiên cũ không đổi; kế hoạch mới chưa thành Attempt |
| C09 | Render lại hoặc đóng/mở tùy chọn | Kế hoạch giữ nguyên |
| C10 | Bấm bắt đầu hai lần liên tiếp | Một Attempt, deadline không bị làm mới lần thứ hai |

Vùng mã: practicePool.ts, ExamWorkspace.tsx và luồng vào nhanh ở JLPTExamHub.tsx. Không tạo công thức tổng riêng ở từng trang.

## 6. FIX-03 — Thông tin bài có giờ phải nói về lượt sẽ làm

### 6.1. Hành vi

1. Tách rõ nhãn nguồn **“Ngân hàng 20 ngày · 1.080 câu”** và nhãn lượt **“54 câu · 50 phút”**.
2. Mở trực tiếp trang mock khi chưa có phiên: hiện chuẩn bị đúng 54 câu và thời lượng cấu hình, chưa chạy đồng hồ.
3. Nút “Vào làm ngay (54 câu)” dùng cùng quy tắc chọn câu với trang chuẩn bị, tạo lượt ngay sau xác nhận nếu cần; không thêm trang chờ.
4. Khi đã có phiên khớp, khôi phục tổng câu và deadline từ phiên đó, không tạo lại hoặc đặt thời gian về 50 phút.
5. Bài theo ngày lấy thông tin của bài ngày. Nguồn pool dùng thông tin lượt dự kiến, không dùng totalQuestions của toàn pool.
6. Không đủ dữ liệu để tạo bài có giờ đúng cấu trúc được quảng bá: khóa nút tương ứng, báo “Nguồn hiện tại chưa đủ câu để tạo bài 54 câu.”; người học vẫn có thể chọn luyện theo dạng với số thực tế.
7. Số 54 và 50 là giá trị của cấu hình hiện tại, không hard-code như quy luật cho mọi sách/cấp độ tương lai.

### 6.2. Ca nghiệm thu

- M01: liên kết trực tiếp /mock mới → tiêu đề, tóm tắt và Attempt đều 54; ngân hàng vẫn có thể ghi 1.080 ở nhãn nguồn.
- M02: vào nhanh từ kho → 54 câu, không qua màn hình chuẩn bị.
- M03: reload sau khi đã làm vài câu → giữ câu, đáp án, dấu và hạn kết thúc, không bắt đầu lại.
- M04: nguồn giả lập thiếu một Mondai → không mở một bài thiếu câu nhưng mang nhãn 54.
- M05: trang chuẩn bị chưa bấm → không phát sinh Attempt, điểm hoặc deadline.

## 7. FIX-04 — Ghi nhận trợ giúp đúng thời điểm và đúng câu

### 7.1. Định nghĩa bắt buộc

**Có hỗ trợ trước khi chốt** nghĩa là thông tin trợ giúp hợp lệ đã được hiển thị cho người học, hoặc âm thanh trợ giúp đã bắt đầu phát, trong khi câu chưa chốt và lượt vẫn đang làm.

Không tính việc chỉ bôi đen chữ, mở hộp rỗng, yêu cầu dịch thất bại, bấm đóng/ẩn bản dịch, hoặc âm thanh không bắt đầu. Không gọi số liệu này là bằng chứng chống gian lận; đây chỉ là thông tin trong lượt luyện.

| Chế độ | Mốc chốt |
|---|---|
| Luyện câu đơn | Lúc lựa chọn được nhận và câu bị khóa |
| Luyện nhóm đoạn | Lúc Kiểm tra nhóm chốt cả đơn vị |
| Làm bài có giờ | Lúc nộp hoặc hết hạn |
| Xem đề / xem kết quả | Không ghi sự kiện trợ giúp vào Attempt |

### 7.2. Phạm vi ghi nhận

1. Câu đơn: ghi ID câu nơi trợ giúp phát sinh.
2. Đơn vị có đoạn dùng chung: giữ quy tắc theo cụm của sản phẩm hiện tại; trợ giúp từ đoạn hoặc một câu trong đơn vị gắn cho cả cụm chưa chốt, vì thông tin có thể giúp các câu liên quan. Thông báo kết quả không diễn giải đây là số lần bấm.
3. Mỗi ID chỉ xuất hiện một lần trong tập assisted, dù dùng nghe, dịch, tra từ hoặc F9 nhiều lần.
4. Tra từ ngoài nội dung bài hoặc trong trang Xem đề độc lập không được gán cho bài khác đang dở.
5. Các điểm vào phải dùng chung quy tắc: Dịch câu, Dịch nghĩa cả câu, Nghe câu/phát âm có tính trợ giúp, tra từ đã chọn, từ vựng liên quan và F9. Không để một điểm vào bỏ qua kiểm tra.
6. Không bỏ khả năng tra cứu trong bài có giờ; chỉ ghi nhận chính xác.

### 7.3. Quy tắc bất đồng bộ

- Khi mở yêu cầu, giữ ngữ cảnh phát sinh: attempt ID, mode, ID câu/cụm, nguồn trợ giúp và yêu cầu cụ thể.
- Khi thông tin thực sự hiển thị/âm thanh bắt đầu, lấy phiên mới nhất, kiểm tra deadline/TTL, đúng attempt ID, đang làm và các câu chưa committed.
- Đánh dấu theo ngữ cảnh đã giữ, không theo câu đang mở tại thời điểm phản hồi mạng về.
- Nếu người học chuyển câu A sang B, phản hồi A không được đánh dấu B.
- Nếu phần dịch của A đã đóng, bị ẩn hoặc không còn được render khi phản hồi về, chỉ được giữ kết quả để dùng lại trong bộ nhớ, chưa đánh dấu A. Khi người học mở lại và nhìn thấy nội dung hợp lệ, kiểm tra trạng thái chốt/deadline ở thời điểm đó rồi mới ghi nhận. Kết quả lấy từ cache phải đi qua cùng quy tắc với kết quả mạng mới.
- Nếu A đã chốt trước khi dịch về, không đánh dấu A. Kết quả có thể hiện như nội dung chữa bài nếu vẫn đúng nơi hiển thị, nhưng không đổi thống kê trước chốt.
- Nếu đổi lượt, đóng hộp trước khi dữ liệu xuất hiện, hoặc kết quả thuộc yêu cầu cũ bị bỏ qua, không ghi nhận.
- Lượt đã nộp phải bất biến. Không gọi lại persist để “chỉnh thống kê” từ phản hồi về muộn.
- Không tự sửa assisted của phiên cũ bằng suy đoán: dữ liệu cũ không có đủ thời điểm sự kiện. Quy tắc mới áp dụng cho sự kiện mới; phiên cũ vẫn khôi phục bình thường.

Nhãn kết quả: **“{n} câu đã dùng trợ giúp trước khi chốt đáp án.”** Nếu n > 0, badge dùng “Có dùng trợ giúp”; không chỉ gọi là tra cứu vì có cả dịch/nghe.

### 7.4. Ca nghiệm thu

| ID | Tình huống | Kết quả |
|---|---|---|
| A01 | Dịch hiện thành công trước khi chọn câu đơn | +1 câu hỗ trợ |
| A02 | Chọn câu đơn xong mới nghe/dịch/tra | Không tăng |
| A03 | Gọi dịch trước, chốt trước khi phản hồi về | Không tăng |
| A04 | Gọi dịch A, chuyển B, phản hồi A về khi A chưa chốt | Chỉ A được ghi nếu trợ giúp A thực sự được hiển thị; B không bị ghi |
| A05 | Trợ giúp trong nhóm năm câu trước Kiểm tra nhóm | Đúng năm ID chưa chốt, không nhân lên theo số lần bấm |
| A06 | Trợ giúp sau Kiểm tra nhóm | Không tăng |
| A07 | Bài có giờ đã chọn nhưng chưa nộp, dùng trợ giúp | Được tính vì đáp án chưa chốt |
| A08 | Hết giờ/đổi lượt trong khi đang tra | Không thay kết quả/lượt mới |
| A09 | Tra từ từ trang xem đề khác khi có bài dở | Bài dở không đổi assisted |
| A10 | Dịch lỗi, hộp rỗng, âm thanh lỗi, ẩn bản dịch | Không tăng |
| A11 | F9 và nút Tra từ với cùng ngữ cảnh | Cùng quy tắc và cùng số ID |
| A12 | Luyện lại từ kết quả cũ | Lượt mới bắt đầu với tập assisted rỗng |
| A13 | Kết quả A về lúc đang ẩn; mở lại trước hoặc sau chốt | Lúc đang ẩn không tăng; mở trước chốt tăng đúng A/cụm A; mở sau chốt không tăng |

## 8. FIX-05 — Lưu từ có kiểm tra trùng và trạng thái rõ

### 8.1. Phạm vi

Sửa luồng **lưu nhanh từ tra cứu vào sổ tay**. Không áp đặt quy tắc mới lên mọi thao tác thêm từ thủ công trong ứng dụng, vì cùng từ có thể được người học chủ động đưa vào các bài khác nhau.

### 8.2. Quy tắc so khớp

1. Xác định sổ tay đích bằng ID hợp lệ hoặc quy tắc chọn sổ tay hiện có. Không dùng khóa học tự tạo đầu tiên làm phương án dự phòng.
2. So khớp trong sổ tay đích và cùng ngôn ngữ. Chuẩn hóa Unicode NFC, khoảng trắng đầu/cuối và khoảng trắng lặp; giữ nguyên bản chữ để hiển thị.
3. Không tự bỏ dấu, chuyển kanji thành kana, dịch nghĩa, hoặc coi hai nghĩa khác nhau là giống nhau.
4. Khi từ, cách đọc hợp lệ và nghĩa chuẩn hóa đều trùng: trả **đã tồn tại**, không thêm, không thay nội dung hay wordCount. Kiểm tra khớp đầy đủ này được ưu tiên trước nhánh mơ hồ: dù dữ liệu cũ có nhiều bản trùng hoàn toàn, chỉ cần có ít nhất một bản khớp là trả đã tồn tại; không thêm bản nữa và không tự gộp/xóa bản cũ.
5. Hai cách đọc kana đã biết khác nhau là hai mục hợp lệ khác nhau, không tự gộp.
6. Nếu một nguồn thiếu cách đọc, chỉ coi là bản trùng khi có đúng một ứng viên cùng từ/nghĩa phù hợp; không dùng một phiên âm Latin như bằng chứng hai cách đọc kana khác nhau.
7. Khi không có bản khớp đầy đủ: nếu thiếu cách đọc và có nhiều ứng viên không giống nhau, hoặc cùng từ/cách đọc nhưng nghĩa khác, không ghi đè và không tự nối mục mới. Thông báo “Từ này đã có trong sổ tay với nội dung khác.”, có lối mở sổ tay để người dùng xem/chỉnh sửa. Thêm giao diện gộp nhiều nghĩa riêng là ngoài gói sửa bắt buộc.
8. Không tự quét, gộp hoặc xóa các mục trùng đã tồn tại trước đợt sửa.

### 8.3. Trạng thái thao tác

| Trạng thái | Hiển thị | Tác động dữ liệu |
|---|---|---|
| Chưa lưu | Lưu vào sổ tay | Chưa ghi |
| Đang lưu | Đang lưu…, khóa thao tác cho cùng mục | Một yêu cầu đang xử lý |
| Đã thêm | Đã lưu, thông báo đích | Tăng đúng một mục |
| Đã tồn tại | Đã có trong sổ tay | Không thay dữ liệu |
| Có nội dung khác / chưa rõ ứng viên | Thông báo và Mở sổ tay | Không tự ghi |
| Lỗi lưu | Chưa lưu được. Thử lại | Không báo thành công giả |

- Kiểm tra trùng phải có trong lớp lưu nhanh, không chỉ ở nút giao diện.
- Đọc dữ liệu mới nhất trước ghi; các lời gọi đồng thời trong cùng trang với cùng mục phải dùng chung thao tác hoặc cơ chế tuần tự tương đương.
- Hai thao tác lưu đầu tiên cùng cần tạo sổ tay không được tạo hai sổ tay mặc định trong cùng trang.
- Đóng/mở lại hộp, chuyển nguồn tra hoặc reload không làm mất khả năng nhận ra từ đã lưu.
- Thông báo lưu chậm của từ A không được xuất hiện như thông báo của từ B đang mở.
- Sau lưu thành công, cập nhật hoặc vô hiệu hóa cache từ điển liên quan để lần tra sau nhận được dữ liệu mới.
- Không thêm đồng bộ sổ tay giữa thiết bị hoặc giao dịch cloud trong đợt này. Kiểm tra cạnh tranh bắt buộc là các thao tác trong cùng trang; không tuyên bố bảo đảm ghi nguyên tử giữa nhiều tab bằng localStorage.

### 8.4. Phiên âm và quyền dùng

- “Shōhai” là phiên âm Latin: hiển thị dưới nhãn **Phiên âm**, không lưu vào trường hiragana.
- Chỉ lưu kana đã xác định đúng loại vào trường cách đọc kana. Nếu mô hình từ hiện tại chưa có trường riêng cho Latin, để kana trống và chỉ hiển thị phiên âm Latin ở kết quả tra; không mở rộng toàn bộ schema chỉ để sửa nhãn.
- Khách vẫn lưu nhanh được vào kho cục bộ hiện có.
- Trong hộp tra, đặt ghi chú ngắn: **“Từ đã lưu nằm trong sổ tay trên trình duyệt này; bài làm JLPT chỉ giữ tạm trong tab.”**
- Xóa phiên JLPT không xóa sổ tay; tạo sổ tay không tạo lịch sử điểm/bài làm.

### 8.5. Ca nghiệm thu

- N01: lưu 勝敗 cùng bản dịch hai lần cách nhau sau thông báo thành công → chỉ một mục, wordCount tăng một.
- N02: bấm nhanh hai lần → một mục, không xuất hiện hai sổ tay mới.
- N03: đóng/mở hộp, đổi nguồn tra, rồi lưu lại cùng nội dung → đã tồn tại.
- N04: reload rồi lưu lại → vẫn một mục.
- N05: cùng từ/cách đọc nhưng nghĩa khác → không ghi đè hoặc thêm ngầm; có lối xem mục cũ.
- N06: cùng cách viết nhưng hai cách đọc kana khác nhau → không chặn nhầm mục hợp lệ.
- N07: bản ghi nguồn có Roman “Shōhai” → không ghi “Shōhai” vào Hiragana.
- N08: lỗi lưu → không báo đã lưu; thử lại thành công tạo đúng một mục.
- N09: người dùng có khóa học tự tạo khác → lưu vào đúng sổ tay, khóa học kia không đổi.
- N10: tồn tại các bản trùng cũ → không tự xóa/gộp khi tải trang hoặc khi lưu từ khác; lưu lại đúng nội dung đã trùng trả đã tồn tại, không tạo thêm bản mới.

## 9. FIX-06 — Mục lục và nội dung dùng chung tập câu hiển thị

### 9.1. Quy tắc render và điều hướng

1. Tính một tập đơn vị hiển thị sau bộ lọc, dùng chung cho thân trang và mục lục.
2. Xem đề lọc Mondai 7: chỉ có các câu của Mondai 7 trong mục lục. Không còn liên kết tới câu 1 thuộc Mondai 1.
3. Xem kết quả lọc Sai/Bỏ trống/Chưa chắc: mục lục phản ánh đúng các đơn vị đang render.
4. Nếu một câu khớp thuộc nhóm đoạn, giữ cả nhóm như hiện tại. Mục lục có thể chứa các câu giữ thêm vì chúng thực sự hiển thị; phân biệt câu khớp và câu giữ ngữ cảnh bằng nhãn hỗ trợ, không chỉ bằng màu.
5. Ví dụ: một câu sai trong nhóm năm câu → thông báo “1 câu sai · Hiển thị 5 câu để giữ ngữ cảnh”. Tổng câu sai vẫn là 1.
6. Giữ số câu của bài/lượt gốc khi lọc. Không đổi câu 41 thành câu 1 chỉ vì chỉ còn Mondai 7.
7. Không có kết quả: hiện trạng thái rỗng, mục lục không có nút vô tác dụng.
8. Bấm mục lục phải đưa đúng thẻ câu vào vùng thấy được, chừa khoảng cho thanh cố định và có trạng thái focus phù hợp cho bàn phím.
9. URL có hash trỏ tới câu không nằm trong bộ lọc: không âm thầm đổi bộ lọc. Hiện lời nhắc “Câu này không nằm trong bộ lọc hiện tại” và nút **Xem tất cả câu** nếu câu tồn tại trong bài; nút này xóa bộ lọc rồi chuyển tới đích.
10. Hash/ID câu không có trong bài: bỏ qua đích không hợp lệ, giữ trang hoạt động và có lối trở về đầu danh sách.
11. Thay bộ lọc không thay đáp án, cờ, điểm hoặc trạng thái chốt.

### 9.2. Ca nghiệm thu

- J01: Ngày 7, chỉ Mondai 7 → thân và mục lục cùng 12 câu 33–44; mọi liên kết có đích.
- J02: lọc Sai có một câu sai trong nhóm → giữ năm câu, tổng sai vẫn một, các liên kết đều tới câu có thật.
- J03: lọc không khớp → trạng thái rỗng, không để mục lục toàn bài bên cạnh.
- J04: đổi lọc nhiều lần → không sót link từ bộ lọc cũ.
- J05: tải URL chứa hash ngoài bộ lọc → có lựa chọn Xem tất cả câu, không cuộn vào khoảng trống hoặc đổi lọc âm thầm.
- J06: dùng bàn phím/chạm mục lục → đúng thẻ câu không bị thanh cố định che hoàn toàn.
- J07: lượt pool đã trộn có vị trí số 5 là câu nguồn Ngày X, câu 50 → thẻ và mục lục vẫn ghi số thứ tự lượt là 5, nhãn nguồn vẫn ghi Ngày X · Câu 50 và ô trống trong đoạn vẫn là 50; lọc/xem lại không đổi các ý nghĩa này.

## 10. FIX-07 — Thanh bài đang dở trên màn hình nhỏ

### 10.1. Bố cục bắt buộc

Ở chiều rộng dưới 640 px:

- Thông tin tên/trạng thái chiếm trọn hàng đầu.
- Tên bài tối đa hai dòng; trạng thái “Đang làm · 6/54 câu” nằm dòng riêng nếu cần.
- Tên đầy đủ vẫn có trong thông tin truy cập; không phụ thuộc tooltip khi rê chuột.
- Nhóm nút nằm hàng tiếp theo, tự xuống dòng. Nếu hai nút không đủ chỗ thì xếp dọc toàn chiều rộng; không co vùng tên thành một cột chữ.
- Mỗi nút thao tác chính có vùng chạm mục tiêu tối thiểu 44×44 px theo quy ước giao diện của đợt sửa.
- Nội dung tên dài được ngắt hợp lý, không gây thanh cuộn ngang toàn trang.
- Nhãn nút phải đủ nghĩa: Làm tiếp/Xem kết quả, Đổi dạng / số câu khi phù hợp, Kết thúc và xóa phiên. Không rút thành icon không có nhãn.

Từ 640 px trở lên được bố trí cùng hàng nếu đủ chỗ; thiếu chỗ thì xuống hàng theo nhóm. Dùng cùng hành vi ở thanh trong Workspace và thẻ bài dở trong kho để tránh hai kiểu hiển thị khác nhau.

Sơ đồ màn hình nhỏ:

    Tên bài đang dở — tối đa hai dòng
    Đang làm · 6/54 câu
    [Làm tiếp]
    [Kết thúc và xóa phiên]

Hai nút có thể cùng một hàng nếu vẫn đủ kích thước và nhãn. Không cố giữ một hàng bằng cách ép tên bài.

### 10.2. Ca nghiệm thu

- U01: ở 320, 347, 375 và 390 px, có bài luyện pool dở rồi mở review ngày khác → tên không xuống gần từng từ như ảnh QA.
- U02: tên sách dài/Japanese không có khoảng trắng → không tràn ngang.
- U03: bài đang làm, đã nộp, đang cấu hình lượt mới → đúng nút đúng trạng thái.
- U04: 768/1280/1440 px → không có khoảng trống bất thường hoặc nút rơi khỏi thẻ.
- U05: tăng cỡ chữ/zoom 200% → vẫn đọc và thao tác được, không chồng lên nhau.
- U06: nền sáng/tối, focus bàn phím → nhìn rõ trạng thái và nút, không dùng riêng màu để diễn đạt.

## 11. FIX-08 — Phân biệt bản dịch thật với lỗi tra cứu

### 11.1. Mô hình trạng thái

Kết quả tra trực tuyến phải mang trạng thái riêng; thông báo lỗi không được đặt trong trường nghĩa/bản dịch.

| Trạng thái | Khi nào | Nội dung UI | Lưu từ |
|---|---|---|---|
| Chưa tra | Chưa yêu cầu | Tra cứu & dịch trực tuyến | Không có |
| Đang tra | Yêu cầu đang chạy | Đang tra cứu… | Không có cho kết quả đang chờ |
| Thành công | Có nội dung hợp lệ, không rỗng | Bản dịch và nguồn | Có |
| Không tìm thấy | Phản hồi hợp lệ nhưng không có nghĩa | Chưa tìm thấy nghĩa phù hợp | Không có |
| Lỗi mạng/dịch vụ | Fetch lỗi, HTTP lỗi, giới hạn dịch vụ | Không thể tra trực tuyến lúc này. Thử lại | Không có |
| Phản hồi không hợp lệ | JSON lỗi/sai cấu trúc | Dịch vụ trả dữ liệu chưa hợp lệ. Thử lại | Không có |
| Quá thời gian | Yêu cầu vượt thời hạn | Tra cứu mất quá lâu. Thử lại | Không có |
| Đã hủy/thay thế | Đóng hộp, đổi từ, yêu cầu mới | Không hiển thị kết quả cũ | Không có |

Thời hạn yêu cầu cho đợt sửa là **12 giây cho toàn bộ một lần tra trực tuyến do người dùng bấm**, cấu hình tập trung và tính từ lúc nhận thao tác; không phải 12 giây cộng dồn cho từng nguồn. Hết thời hạn thì dừng trạng thái chờ và hủy/bỏ qua phần việc còn lại. Đây là giới hạn chờ của sản phẩm, không phải thời hạn bảo đảm của dịch vụ bên ngoài.

### 11.2. Quy tắc dữ liệu và bất đồng bộ

1. Thành công phải có term đúng từ đang tra, nguồn và nghĩa không rỗng sau chuẩn hóa.
2. Chỉ tạo dữ liệu lưu từ từ kết quả thành công. Lớp lưu nhanh cũng phải từ chối kết quả lỗi/không có nghĩa, không chỉ dựa vào việc UI ẩn nút.
3. Không dùng kiểm tra chuỗi thông báo tiếng Việt làm cách phân biệt lỗi chính; dùng trạng thái dữ liệu.
4. Giữ request ID/cơ chế hủy đang có. A về sau khi đã mở B không được ghi đè B; đóng hộp rồi mở lại cũng không nhận phản hồi của phiên modal cũ.
5. Thử lại tạo yêu cầu mới cho từ hiện tại; không tạo nhiều lượt mạng từ các lần bấm trong trạng thái đang tải.
6. Một nguồn trực tuyến lỗi hoặc quá thời gian không xóa kết quả từ điển cục bộ hoặc nội dung hợp lệ từ nguồn đã trả về. Nếu một nguồn đã có nghĩa hợp lệ, giữ phần đó ở trạng thái thành công và cho lưu chính nội dung hợp lệ; chỉ báo nguồn còn lại chưa hoàn tất, không biến toàn bộ lượt tra thành lỗi rỗng.
7. Nếu có nội dung hợp lệ bằng ngôn ngữ khác, phải ghi đúng loại và ngôn ngữ; không đặt định nghĩa tiếng Anh vào vùng mang nhãn bản dịch tiếng Việt. Không âm thầm lưu như bản dịch thành công.
8. Khi bắt đầu thử lại, không để nút Lưu cũ trông như thuộc về phản hồi mới đang chờ. Có thể giữ nội dung cũ ở vùng “Kết quả trước” nếu có nhãn rõ, nhưng không bắt buộc bổ sung vùng này.
9. Thay mô hình kết quả ở hàm dùng chung phải rà các nơi gọi khác để tránh làm hỏng tra cứu ngoài JLPT; không giả định chỉ WordLookupModal dùng nó.
10. Không lưu tự động từ các phản hồi về muộn.

### 11.3. Ca nghiệm thu

- E01: thành công có bản dịch → có nút lưu, lưu được.
- E02: fetch reject/HTTP 4xx–5xx/giới hạn dịch vụ → báo lỗi, không có nút lưu kết quả lỗi.
- E03: HTTP thành công nhưng JSON sai hoặc cấu trúc sai → trạng thái phản hồi không hợp lệ.
- E04: phản hồi hợp lệ nhưng nghĩa rỗng → không tìm thấy, không lưu.
- E05: vượt 12 giây chưa có kết quả hợp lệ → hết tải, có Thử lại; nếu một nguồn đã thành công thì giữ/lưu được kết quả đó và báo nguồn còn lại quá thời gian. Kiểm tra bằng thời gian giả lập, không cần chờ thật trong test.
- E06: lỗi rồi thử lại thành công → chỉ lưu nghĩa thành công.
- E07: A chậm, B nhanh → B giữ nguyên khi A về; đóng hộp trước phản hồi không mở lại hộp.
- E08: gọi thẳng luồng lưu nhanh bằng đối tượng kết quả lỗi → từ chối ghi.
- E09: dịch trực tuyến lỗi nhưng có nghĩa cục bộ → nghĩa cục bộ vẫn dùng/lưu bình thường.
- E10: các nơi tra trực tuyến ngoài JLPT vẫn hiển thị đúng sau thay kiểu kết quả.

## 12. Gói B — Cải tiến đề xuất sau khi sửa các lỗi bắt buộc

Các mục dưới đây là thiết kế đề xuất, không phải kết luận rằng mọi mục đều là lỗi chặn sử dụng.

### B1. Ưu tiên câu hỏi trong phòng làm bài

- Trước khi bắt đầu: giữ thông tin nguồn và mô tả để chọn.
- Khi đang làm: dùng tiêu đề nguồn gọn; thông tin dài có thể xem qua “Thông tin bài”.
- Trên màn hình nhỏ, ưu tiên thứ tự: trạng thái lượt ngắn → thanh đồng hồ/tiến độ/nộp → câu hỏi; không lặp đầy đủ banner lớn của trang giới thiệu.
- Giữ lối về kho và quản lý phiên, không làm người dùng mất đường quay lại.
- Nghiệm thu bằng ảnh trước/sau tại 375×812 và 1280×900; câu đơn đầu tiên phải xuất hiện mà không cần cuộn qua nhiều thẻ giới thiệu.

### B2. Một đồng hồ chính khi làm bài có giờ

- Trong mock đang làm, chỉ trình bày đồng hồ thi như đồng hồ chính.
- Thu gọn phần hiển thị Pomodoro nổi; vẫn giữ lối vào tra từ và phím F9.
- Không tự reset/dừng phiên Pomodoro của người dùng. Khi rời phòng thi, khôi phục cách hiển thị trước đó.
- Widget còn hiển thị phải nằm ngoài vùng nút trả lời, Tiếp và Nộp; kiểm tra cả ngang 844×390.
- Không đổi deadline hoặc cơ chế tự nộp JLPT để giải quyết bố cục.

### B3. Nhóm tiêu đề ở màn Xem đề và xem lại

- Chỉ trong trang liệt kê nhiều câu: gom tiêu đề/hướng dẫn theo Mondai, tránh lặp lại trước từng câu đơn.
- Đoạn văn và chú thích nằm trước các câu thuộc đoạn; không đưa ra ngoài ngữ cảnh nhóm.
- Phòng luyện từng đơn vị vẫn có hướng dẫn tại nơi người học cần.
- Giữ nguyên ID neo câu, số thứ tự, nút mở lời giải riêng, bộ lọc và chính sách chỉ đọc.
- Thay đổi trình bày không được đổi Unit dùng để chọn câu/chốt nhóm.

### B4. Đo rồi tối ưu tải từ điển

Hiện build có gói localDictionaryIndex khoảng 22,52 MB, gzip 5,43 MB. Kích thước này là số đo build, chưa phải số giây chờ người dùng.

- Đo trên bản production: dung lượng tải ở kho JLPT, lần đầu mở tra từ, lần tra tiếp; ghi thiết bị, cấu hình mạng/cache và kết quả.
- Ưu tiên không kéo toàn bộ chỉ mục từ điển vào trang chỉ đang xem kho/chọn bài nếu chưa cần.
- Có trạng thái đang chuẩn bị từ điển ở lần mở đầu; không đóng băng nút trả lời hoặc đồng hồ.
- Tái sử dụng dữ liệu đã nạp trong phiên trang; tránh nạp lại cả chỉ mục mỗi lần đổi từ.
- Chỉ tách nguồn/chunk sau khi xác định đường import và chi phí thực; không đặt mục tiêu phần trăm giảm chưa có số đo nền.
- Không dùng gói tối ưu này để viết lại hệ thống khóa học, SRS hoặc đồng bộ tài khoản.

## 13. Tổ chức mã, dữ liệu và khả năng tương thích

### 13.1. Trách nhiệm dự kiến

| Vùng | Trách nhiệm sau sửa |
|---|---|
| JLPTExamHub.tsx | Tách metadata sách và bài sau lọc; vào nhanh dùng kế hoạch lượt; không tính tổng riêng |
| practicePool.ts | Quy tắc chọn nguyên cụm, hạn mức, danh sách cuối và số lượng thực |
| ExamWorkspace.tsx | Vòng đời thiết lập/Attempt, dùng kế hoạch, ghi trợ giúp theo ngữ cảnh, cùng tập render cho mục lục |
| ExamQuestionCard.tsx / SelectionLookup.tsx | Phát sự kiện trợ giúp tại thời điểm hữu ích, có nguồn câu/cụm; không tự ghi lịch sử |
| WordLookupModal.tsx | Trạng thái mạng/lưu, chống phản hồi cũ, đúng nhãn nghĩa/phiên âm |
| multiBookLookup.ts | Kết quả tra có trạng thái; lưu nhanh có kiểm tra trùng và kết quả phân biệt |
| customCourseService.ts | Chỉ thay đổi nếu cần primitive lưu an toàn; không áp quy tắc quick-save lên mọi thao tác thủ công |
| exam.css / lớp layout | Thanh phiên responsive, cuộn/neo chừa vùng cố định |
| FloatingStudyTimer / StudyTools | Chỉ liên quan gói B2; bảo toàn chức năng tra từ và trạng thái timer khác |

Tên hàm/kiểu cụ thể do người triển khai quyết định. Tránh viết lại cả Workspace chỉ để thay một công thức; tách helper khi nó giúp các điểm vào dùng chung quy tắc.

### 13.2. Hợp đồng nội bộ tối thiểu

- Kế hoạch lượt: cấu hình chuẩn hóa + nguồn/phiên bản + IDs cuối + tổng/phân bố + lý do thiếu/tăng. Chỉ ở RAM.
- Ngữ cảnh trợ giúp: attempt ID + IDs câu/cụm + nguồn yêu cầu + thời điểm nội dung thực sự được cung cấp. Không bắt buộc lưu nhật ký sự kiện dài hạn.
- Kết quả lưu nhanh: phân biệt thêm mới, đã tồn tại, nội dung khác/chưa rõ, thất bại; kèm sổ tay đích khi có.
- Kết quả tra: phân biệt thành công, không tìm thấy, lỗi, hủy; chỉ nhánh thành công mang nghĩa có thể lưu.
- Không đưa nội dung đáp án đúng, danh sách câu dự kiến hoặc tên field kỹ thuật vào thông báo cho người học.

### 13.3. Phiên và dữ liệu cũ

1. Không cần đổi schema phiên chỉ để sửa tổng, bộ lọc, bố cục hoặc tập assisted.
2. Nếu triển khai buộc phải thêm field, field mới phải có mặc định và đọc được phiên v1 hợp lệ; không xóa tất cả phiên như một cách nâng cấp.
3. Giữ snapshot câu/đáp án/thời gian của lượt đang làm; không tính lại từ dữ liệu gốc khi reload.
4. Phiên đã nộp không bị sửa điểm/đáp án/assisted khi mở lại.
5. Không tự di chuyển sổ tay sang sessionStorage hoặc đưa bài làm vào localStorage.
6. Các mục trùng/phiên âm sai có sẵn không tự xóa hay ghi đè; nếu làm công cụ dọn dữ liệu sau này, phải là phạm vi riêng có xem trước.
7. Những hành vi lưu cục bộ vốn có của công cụ ngoài bài làm không được quảng bá là đồng bộ tài khoản.

## 14. Kế hoạch kiểm thử và tiêu chí hoàn thành

### 14.1. Mức kiểm thử

| Mức | Nội dung bắt buộc |
|---|---|
| Logic | Bộ chọn/kế hoạch cuối; trùng từ và cạnh tranh cùng trang; điều kiện ghi hỗ trợ; phân loại kết quả dịch |
| Giao diện mô phỏng | Từng ca S/C/M/A/N/J/U/E liên quan trạng thái, điều hướng, nút và nhãn; giả lập mạng lỗi/thời gian |
| Trình duyệt thực | Ba chế độ khi chưa đăng nhập, bôi đen text, tra cục bộ/trực tuyến, lưu nhanh, reload, nộp/luyện lại, modal/phím tắt |
| Giao diện trực quan | 320/375/390 px, 768 px, 1280/1440 px; ngang 844×390; nền sáng/tối; zoom 200% |
| Kiểm tra nền | Bộ test hiện có, TypeScript, build, lint phạm vi sửa, kiểm tra source/dữ liệu không bị thay ngoài ý muốn |

Không thêm test chỉ lặp lại công thức triển khai. Mỗi test mới cần bảo vệ hành vi đã sai hoặc ranh giới dễ hỏng, đặc biệt xem trước khác số thật, kết quả bất đồng bộ về muộn, lưu hai lần và neo không có đích.

### 14.2. Bộ kịch bản xuyên suốt

1. **Khách luyện toàn sách:** vào kho → chọn nhiều Mondai → xem tổng thật → bắt đầu → trả lời → dùng dịch sau chốt → reload → kết thúc. Tổng giữ đúng, câu khóa giữ nguyên, hỗ trợ sau chốt không bị tính.
2. **Nhóm đoạn:** chọn lượt có đoạn → trả lời một câu → chưa có đúng/sai → trả lời đủ → chấm nhóm → nộp → luyện lại một câu sai. Giữ đủ cụm, phân biệt câu cần ôn/câu thực hành.
3. **Thi có giờ:** vào trực tiếp chuẩn bị và vào nhanh từ kho → tổng giống nhau → đổi đáp án → tra từ có ghi nhận đúng → nộp/hết giờ → kết quả chỉ đọc.
4. **Xem đề khi có bài dở:** mở review ngày khác → thanh tiếp tục gọn trên điện thoại → lọc Mondai → mục lục khớp → tra từ không sửa bài dở.
5. **Tra và lưu:** thành công → lưu hai lần → mở lại → không trùng; lỗi mạng → không lưu lỗi; retry thành công → lưu được.
6. **Lưu trữ:** sessionStorage hoạt động/bị chặn/dữ liệu lỗi/hết hạn → không mất khả năng vào làm; không phát sinh lịch sử localStorage hay ghi tài khoản.

### 14.3. Điều kiện nghiệm thu Gói A

- [ ] FIX-01 đến FIX-08 đáp ứng quy tắc và các ca phù hợp trong đặc tả.
- [ ] Cả tám lỗi có kết quả kiểm tra lại; QA-08 có ca lỗi mô phỏng được ghi rõ.
- [ ] 148 test hiện có không hồi quy; số test mới có thể tăng, không lấy “đúng 148” làm điều kiện.
- [ ] TypeScript/build/lint phạm vi thay đổi đạt; cảnh báo tồn tại được ghi riêng, không gọi cảnh báo là lỗi hoặc bỏ qua lỗi thật.
- [ ] Không cần đăng nhập ở bất kỳ bước JLPT nào; không ghi điểm/lịch sử dài hạn.
- [ ] Phiên đang làm/đã nộp cũ hợp lệ vẫn mở được, không tự sửa kết quả.
- [ ] Dữ liệu 20 ngày, 1.080 câu và đáp án nguồn giữ nguyên.
- [ ] Có ảnh trước/sau cho màn chuẩn bị, kết quả hỗ trợ, mục lục sau lọc và thanh tiếp tục trên điện thoại.
- [ ] Có kiểm tra DOM đích neo và kiểm tra dữ liệu số lượng từ, không chỉ dựa vào toast/screenshot.
- [ ] Báo cáo sau sửa phân biệt tự động, thao tác trình duyệt, thiết bị thật và phần chưa kiểm chứng.

Gói B được nghiệm thu theo từng mục được chọn làm, không dùng thiếu B4 để kết luận tám lỗi bắt buộc chưa được sửa nếu phạm vi triển khai chỉ là Gói A.

## 15. Trình tự triển khai đề nghị

1. Chốt helper kế hoạch lượt, dùng chung cho FIX-02/03; thêm kiểm tra 52/54 và nguyên cụm.
2. Chuẩn hóa trạng thái tra trực tuyến FIX-08, rồi ghi hỗ trợ đúng ngữ cảnh/thời điểm ở FIX-04.
3. Sửa lưu nhanh FIX-05, kiểm tra trùng và cạnh tranh; giữ tương thích các nơi gọi ngoài JLPT.
4. Sửa tìm kiếm FIX-01 và cùng tập render/mục lục FIX-06.
5. Sửa layout FIX-07, chụp ở các kích thước mục tiêu.
6. Chạy kiểm tra hồi quy toàn phần JLPT; xác nhận dữ liệu, phiên cũ và hành vi khách.
7. Triển khai từng mục Gói B nếu nằm trong đợt làm; không trộn refactor hiệu năng lớn vào bản sửa nhỏ khi chưa có số đo.
8. Viết báo cáo hoàn tất theo từng mã FIX, kèm ảnh và giới hạn còn lại để người dùng test một lượt.

## 16. Những điều tài liệu không khẳng định

- Bộ test đạt không chứng minh toàn bộ 1.080 lời giải đúng về ngôn ngữ hoặc sư phạm.
- Viewport điện thoại trên máy tính không thay cho thử thiết bị cảm ứng thật.
- Có nút nghe hoặc sự kiện phát thành công không chứng minh giọng đọc chính xác.
- Điểm nội bộ không phải kết quả chuẩn hóa của kỳ thi thật.
- Tài liệu này chưa triển khai, chưa sửa dữ liệu và chưa tự cho phép mở rộng sang các khu khác của ứng dụng.

