# Nhập sách N2 20日で合格

## Lời giải biên soạn và ngân hàng trộn

- `explanations/day01.txt` đến `day20.txt`: đủ 54 lời giải mỗi ngày, dạng `số câu|lời giải tiếng Việt`; nội dung do AI biên soạn tham khảo, không phải bản lời giải từ nhà xuất bản.
- `scripts/publish_explanations.py` kiểm tra đủ số câu và gắn nội dung vào JSON ứng dụng với `explanationStatus=authored`, revision 3. Chạy sau `publish_kokusho.py` khi nhập lại để giữ lớp lời giải.
- Không đổi đáp án nguồn, không nâng OCR lên verified, không coi bản dịch/phân tích cũ là reviewed. Mỗi câu sắp sao có thứ tự ghép và giải thích vị trí sao.
- Luyện theo dạng gom dữ liệu của tất cả ngày trong cùng sách/cấp độ, chọn câu ngẫu nhiên theo nhóm, giữ nguyên ảnh/ID/phương án và nhãn ngày gốc. Phiên chỉ lưu tập con đã chọn; `questionIds` giữ thứ tự trộn.
- Có đối chiếu thêm hai điểm dễ lẫn bằng mục từ của từ điển 小学館: [持ち堪える](https://kotobank.jp/word/持ち堪える-645724), [早速](https://kotobank.jp/word/早速-510799). Đây là tham chiếu nghĩa từ, không phải nguồn sao chép toàn bộ lời giải.

Đã tách 20 ngày, mỗi ngày 54 câu/9 Mondai: tổng 1.080 câu. Đáp án nằm tại PDF trang 167–176, hai ngày trên một trang. Mỗi JSON ngày và câu chứa liên kết trang nguồn, trang đáp án và trích ảnh.

## Các lớp dữ liệu

- `source-manifest.json`: tên tài liệu, SHA-256, số trang và vùng trang đã xử lý.
- `raw/page-NNN.json`: OCR Windows tiếng Nhật, có vị trí từ; trang 5–164 và 167–176.
- `raw/tess-NNN.json`: OCR Tesseract độc lập cho đủ 160 trang đề. `tess-167` là thử nghiệm bảng dọc, không dùng làm nguồn đáp án.
- `text/dayNN.txt`: text OCR theo ngày, giữ ranh giới và số trang PDF/sách.
- `drafts/dayNN.json`: bản chuẩn hóa câu và lựa chọn, chưa duyệt toàn bộ chữ.
- `answers-reviewed.json` và `answers/dayNN.json`: 1.080 đáp án đọc trực tiếp từ bảng cuối sách, tách theo ngày.
- `answer-crosscheck.json`: kiểm tra độc lập bằng OCR vị trí chữ số: 789 chữ số đọc được, không có lệch; 291 vị trí OCR không đọc được được đối chiếu bằng ảnh, không tự điền bằng suy đoán.
- `question-boxes.json` và `import-report.json`: vị trí khung số câu, trang và vùng ảnh từng câu; hai trang bị nghiêng của ngày 14 được hiệu chỉnh bằng nhận diện lại và xem ảnh.
- `day01-editorial.json`: bảo toàn bản nội dung ngày 1 có sẵn trước khi nhập, gồm phần biên soạn chưa duyệt.

Ảnh OCR tạm và mô hình được bỏ qua trong Git. Trích ảnh WebP dùng trong ứng dụng nằm tại `public/exams/kokusho-20days/dayNN/`; 1.080 ảnh câu và 20 ảnh đoạn văn, khoảng 20 MB.

## Bản text đã đối chiếu — 06/11/2026

Đã xem và đối chiếu đủ 160 trang đề (PDF 5–164), sửa câu hỏi và bốn phương án của 1.080 câu, chép lại 20 đoạn văn và chú thích. JSON hiện dùng `delivery: text`, `transcriptionStatus: verified`, `contentRevision: 4`; ảnh gốc chỉ còn là tài liệu đối chiếu thu gọn. Giữ nguyên phương án nhiễu, thứ tự phương án và 1.080 đáp án từ bảng cuối sách.

- `transcription/dayNN-seed.json`: bản tách OCR ban đầu, chưa duyệt.
- `transcription/dayNN-review.txt`: sửa theo ảnh; dòng `!` liệt kê tám trang đã xem, dòng `@` ghi 15 phần gạch chân. Dấu `~` giữ ô OCR; các ô ngăn bởi `|`.
- `transcription/dayNN-passage.txt`: đoạn văn, mã ô trống và phần chú thích Nhật sau `---NOTES---`.
- `transcription/review-report.json`: danh sách đủ 20 ngày đã xuất bản text.
- `scripts/transcribe_kokusho.py`: tạo bản tách ban đầu. `scripts/publish_transcription.py`: áp sửa và kiểm tra số lựa chọn, gạch chân, ô trống, liên kết câu/đoạn; chạy cuối sau lớp lời giải.

Ghi chú biên tập: đoạn văn ngày 5 in nhầm hai mã 54; ô thứ nhất được đặt là 53 theo vị trí và nhóm lựa chọn tương ứng. Ngày 18, chú thích Chaplin có niên đại bất thường `1989-1979`; giữ đúng bản in, không tự sửa kiến thức ngoài phạm vi OCR. Lời giải câu 45 ngày 2 đã sửa thứ tự 4→1→3→2, sao là phương án 3, khớp bảng đáp án.

Người học bôi đen chữ trong đề, lựa chọn hoặc đoạn văn/chú thích để mở tra từ khi luyện/lướt/xem lại. Tra từ trong ứng dụng bị tắt trong lượt làm bài có giờ chưa nộp. Các mục chưa có trong từ điển hiện rõ chưa tìm thấy; không tự tạo nghĩa.

## Cách hiển thị trước khi duyệt (chỉ còn dùng cho phiên cũ)

`delivery: source_scan` dùng ảnh gốc làm nội dung chính. Text OCR có trạng thái `needs_review`, hiển thị trong vùng thu gọn với nhãn chờ đối chiếu. Không coi điểm tin cậy OCR là xác nhận chữ đúng. Không đọc TTS hoặc tự phân tích ngữ pháp từ text chưa duyệt.

Chọn một trong bốn số tương ứng phương án in trên ảnh; điểm dựa trên bảng đáp án đã đọc và đối chiếu. Giữ toàn bộ đoạn văn cho nhóm câu 50–54. Không biến số chỗ trống của câu 52 thành nhiều câu tính điểm.

Đây là cách đưa toàn bộ sách vào luyện tập mà vẫn bảo toàn nguyên văn, gạch chân, furigana và vị trí ★. Chuyển sang hiển thị text chính chỉ sau khi duyệt câu chữ, phương án và định dạng. Các trường `stem/options` của OCR không được quảng bá là bản chép đã xác minh.

## Chạy lại tại dự án

1. Dùng Python có `pypdfium2`, `numpy`, `Pillow`: `python scripts/render_jlpt.py "đường dẫn PDF"`.
2. OCR Windows: `powershell -File scripts/ocr-jlpt.ps1 -Pages ((5..164)+(167..176)) -RawDir "đường dẫn tuyệt đối tới raw"` trong môi trường hỗ trợ Windows OCR tiếng Nhật.
3. Tải mô hình `jpn.traineddata` từ kho chính thức `tesseract-ocr/tessdata_best` vào `imports/jlpt/models` (không đưa vào ứng dụng).
4. `node scripts/ocr-tesseract.cjs 5 6 ... 164` nhận danh sách số trang; có thể chia các tập không trùng để chạy độc lập. Công cụ dùng scalar core để tránh lỗi SIMD của runtime đã quan sát trên máy.
5. `python scripts/import_kokusho.py` xác định khung; `python scripts/import_kokusho.py --build` tạo text, bản nháp và trích ảnh.
6. Kiểm tra nguồn/đáp án trước `python scripts/publish_kokusho.py`. Script bảo toàn bản ngày 1 ban đầu, không tự đánh dấu OCR thành verified.
7. `python scripts/publish_explanations.py`; sau khi đối chiếu đủ trang, chạy `python scripts/publish_transcription.py`. Không chạy lại lớp OCR lên JSON đã duyệt mà bỏ qua hai bước này.
8. `npm run test:jlpt:all`, kiểm tra TypeScript, lint và build.

Không tự đẩy PDF hoặc dữ liệu này lên dịch vụ ngoài. Quy trình OCR hiện tại chạy cục bộ; tải mô hình không gửi nội dung sách lên mạng.
