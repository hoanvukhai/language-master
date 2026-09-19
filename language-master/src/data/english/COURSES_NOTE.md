# Tài liệu kỹ thuật: Hệ thống khóa học từ vựng tiếng Anh (Cambridge, Oxford, Macmillan, 4000 Essential Words, TOEIC, Expressions)

Tài liệu này ghi chú cấu trúc thư mục, số lượng bài học và hướng dẫn khai thác các trường dữ liệu nâng cao (`fillBlank`, `distractors`) của toàn bộ 23 khóa học tiếng Anh đã được chuẩn hóa trong hệ thống.

---

## 1. Cấu trúc tổ chức thư mục (`src/data/english/courses/`)

Toàn bộ các khóa học được phân loại thành 7 nhóm thư mục con chuyên biệt để quản lý gọn gàng, độc lập:

```
src/data/english/courses/
├── 4000-essential-words/ (7 giáo trình từ vựng nền tảng)
├── destination/          (3 giáo trình ngữ pháp & từ vựng Macmillan B1, B2, C1&C2)
├── oxford/               (5 cấp độ từ vựng cốt lõi Oxford 3000 & 5000 A1-C1)
├── vocab-in-use/         (4 cấp độ Cambridge English Vocabulary in Use)
├── ielts/                (2 giáo trình từ vựng luyện thi Cambridge IELTS)
├── toeic/                (600 từ vựng cốt lõi cho kỳ thi TOEIC)
├── expressions/          (Cụm từ giao tiếp tiếng Anh đời sống)
└── index.ts              (Export tập trung toàn bộ các khóa học)
```

---

## 2. Danh sách các khóa học chuẩn hóa theo thư mục

### A. Thư mục `vocab-in-use/` (Bộ Cambridge English Vocabulary in Use)
| Tên khóa học | Cấp độ | Số lượng bài | Tổng từ vựng | File dữ liệu |
| :--- | :---: | :---: | :---: | :--- |
| **English Vocabulary in Use - Elementary** | A1 - A2 | 60 Units | 1,192 từ | `src/data/english/courses/vocab-in-use/vocabInUseElementary.json` |
| **English Vocabulary in Use - Pre-intermediate & Intermediate** | B1 | 100 Units | 2,608 từ | `src/data/english/courses/vocab-in-use/vocabInUsePreInt.json` |
| **English Vocabulary in Use - Upper-Intermediate** (4th Edition) | B2 | 101 Units | 3,305 từ | `src/data/english/courses/vocab-in-use/vocabInUseUpperInt.json` |
| **English Vocabulary in Use - Advanced** | C1 - C2 | 100 Units | 2,625 từ | `src/data/english/courses/vocab-in-use/vocabInUseAdvanced.json` |
| **TỔNG CỘNG CAMBRIDGE** | **A1 - C2** | **361 Units** | **9,730 từ** | |

### B. Thư mục `oxford/` (Bộ The Oxford 3000™ & Oxford 5000™)
| Tên khóa học | Cấp độ | Số lượng bài | Tổng từ vựng | File dữ liệu |
| :--- | :---: | :---: | :---: | :--- |
| **Oxford 3000 - Căn bản (A1)** | A1 | 30 Units | 874 từ | `src/data/english/courses/oxford/oxford3000A1.json` |
| **Oxford 3000 - Sơ cấp (A2)** | A2 | 30 Units | 855 từ | `src/data/english/courses/oxford/oxford3000A2.json` |
| **Oxford 3000 - Trung cấp (B1)** | B1 | 28 Units | 795 từ | `src/data/english/courses/oxford/oxford3000B1.json` |
| **Oxford 3000 - Trung cao cấp (B2)** | B2 | 25 Units | 699 từ | `src/data/english/courses/oxford/oxford3000B2.json` |
| **Oxford 5000 - Cao cấp (C1)** | C1 | 45 Units | 1,352 từ | `src/data/english/courses/oxford/oxford5000C1.json` |
| **TỔNG CỘNG OXFORD** | **A1 - C1** | **158 Units** | **4,575 từ** | |

### C. Thư mục `destination/` (Bộ Macmillan Destination B1, B2, C1 & C2)
| Tên khóa học | Cấp độ | Số lượng bài | Tổng từ vựng | Điểm nổi bật | File dữ liệu |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Destination B1: Vocabulary & Phrasal Verbs** | B1 | 14 Units (lộ trình 42 Units) | 527 mục | 420 từ + 107 phrasal verbs, 947 câu đục lỗ fillBlank, 1.581 từ nhiễu song ngữ, 2.072 collocations | `src/data/english/courses/destination/destinationB1.json` |
| **Destination B2: Vocabulary & Phrasal Verbs** | B2 | 14 Units (lộ trình 28 Units) | 594 mục | 417 từ + 177 phrasal verbs, 1.011 câu đục lỗ fillBlank, 1.782 từ nhiễu song ngữ, collocations | `src/data/english/courses/destination/destinationB2.json` |
| **Destination C1 & C2: Advanced Vocabulary** | C1 - C2 | 13 Units (lộ trình 26 Units) | 1,505 từ | Từ vựng cao cấp, 3.010 ví dụ song ngữ, 3.010 câu đục lỗ fillBlank, 7.039 từ gây nhiễu song ngữ | `src/data/english/courses/destination/destinationC1C2.json` |
| **TỔNG CỘNG DESTINATION** | **B1 - C2** | **41 Units từ vựng** | **2,626 từ** | **Toàn diện từ vựng, cụm từ, 4.968 câu đục lỗ & 10.402 từ gây nhiễu** | |

### D. Thư mục `ielts/` (Bộ Cambridge Vocabulary for IELTS)
| Tên khóa học | Cấp độ | Mục tiêu | Số lượng bài | Tổng từ vựng | File dữ liệu |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Cambridge Vocabulary for IELTS (Intermediate)** | B2 | **Band 5.5 - 6.5** | 60 Units | 1,890 từ | `src/data/english/courses/ielts/ieltsIntermediate.json` |
| **Cambridge Vocabulary for IELTS - Advanced** | C1 | **Band 7.0 - 8.5+** | 25 Units | 519 từ | `src/data/english/courses/ielts/ieltsAdvanced.json` |
| **TỔNG CỘNG IELTS** | **B2 - C1** | **Band 5.5 - 8.5+** | **85 Units** | **2,409 từ** | |

### E. Thư mục `essential-words/` (Bộ 4000 Essential English Words - Paul Nation)
| Tên khóa học | Số lượng bài | Tổng từ vựng | File dữ liệu |
| :--- | :---: | :---: | :--- |
| **4000 Essential English Words - Starter** | 30 Units | 600 từ | `src/data/english/courses/essential-words/essentialWordsStarter.json` |
| **4000 Essential English Words - Book 1** | 30 Units | 600 từ | `src/data/english/courses/essential-words/essentialWords1.json` |
| **4000 Essential English Words - Book 2** | 30 Units | 600 từ | `src/data/english/courses/essential-words/essentialWords2.json` |
| **4000 Essential English Words - Book 3** | 30 Units | 600 từ | `src/data/english/courses/essential-words/essentialWords3.json` |
| **4000 Essential English Words - Book 4** | 30 Units | 600 từ | `src/data/english/courses/essential-words/essentialWords4.json` |
| **4000 Essential English Words - Book 5** | 30 Units | 600 từ | `src/data/english/courses/essential-words/essentialWords5.json` |
| **4000 Essential English Words - Book 6** | 30 Units | 600 từ | `src/data/english/courses/essential-words/essentialWords6.json` |
| **TỔNG CỘNG 4000 WORDS** | **210 Units** | **4,200 từ** | |

### F. Thư mục `toeic/` & `expressions/`
| Tên khóa học | Thể loại | Số lượng bài | Tổng từ vựng | File dữ liệu |
| :--- | :---: | :---: | :---: | :--- |
| **600 Essential Words for the TOEIC Test** | Luyện thi TOEIC | 50 Units | 600 từ | `src/data/english/courses/toeic/toeic600.json` |
| **Real English Expressions - Book 1** | Giao tiếp đời sống | 30 Units | 600 từ | `src/data/english/courses/expressions/expressionsBook1.json` |

---

## 3. Cấu trúc dữ liệu chi tiết của từng từ vựng

Mỗi từ vựng được chuẩn hóa với các trường cơ bản (tương thích 100% với hệ thống SRS, Flashcard và Quiz hiện tại), đồng thời bổ sung sẵn 2 trường nâng cao:

```json
{
  "id": "en-viu-upper-0001",
  "template": "english",
  "word": "take sides",
  "ipa": "/teɪk saɪdz/",
  "partOfSpeech": "phrase",
  "meaning": {
    "vi": "chọn phe / đứng về phía ai",
    "en": "to support one person or group against another"
  },
  "lesson": "Unit 1",
  "level": "B2",
  "examples": [
    {
      "en": "It's important not to take sides in their argument.",
      "vi": "Điều quan trọng là không chọn phe trong cuộc tranh cãi của họ."
    },
    {
      "en": "The referee should never take sides.",
      "vi": "Trọng tài không bao giờ nên đứng về phía ai."
    }
  ],
  "fillBlank": [
    "It's important not to _____________ in their argument.",
    "The referee should never _____________."
  ],
  "distractors": [
    { "word": "luggage", "vi": "Hành lý" },
    { "word": "bill", "vi": "hóa đơn thanh toán" },
    { "word": "pantyhose", "vi": "quần tất mỏng" },
    { "word": "toilet", "vi": "bồn cầu, nhà vệ sinh" },
    { "word": "plea", "vi": "lời biện hộ, lời khai tại tòa; lời cầu xin" }
  ]
}
```

---

## 4. Ý nghĩa và Hướng dẫn khai thác các trường nâng cao

### a) Trường `fillBlank` (Bài tập đục lỗ / điền từ)
- **Mục đích**: Chứa các câu ví dụ đã được ẩn từ khóa bằng dấu `_____________` hoặc `________`.
- **Roadmap khai thác**:
  - Dùng cho chế độ **Luyện viết từ vựng (Spelling & Typing)**: Hiển thị câu có chỗ trống và nghĩa tiếng Việt, yêu cầu người học gõ chính xác từ khóa vào ô.
  - Dùng cho chế độ **Trắc nghiệm ngữ cảnh (Sentence Context Quiz)**: Thay vì chỉ hỏi nghĩa của từ, đưa câu đục lỗ lên làm câu hỏi và đưa ra 4 lựa chọn để điền từ đúng vào ngữ cảnh.

### b) Trường `distractors` (Các cặp từ gây nhiễu chuẩn theo chủ đề)
- **Mục đích**: Chứa 5 phương án sai (gồm cả từ tiếng Anh và nghĩa tiếng Việt) thuộc cùng trường từ vựng / bài học của tác giả bộ thẻ Anki.
- **Roadmap khai thác**:
  - Khi sinh câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D) cho từ vựng này:
    - Đáp án đúng: `item.word` (hoặc `item.meaning.vi`).
    - 3 đáp án sai: Bốc ngẫu nhiên 3 phần tử từ mảng `item.distractors`.
  - Giúp câu hỏi trắc nghiệm logic, tự nhiên, đánh giá chính xác độ hiểu bài của người học thay vì bốc ngẫu nhiên từ toàn bộ từ điển.
