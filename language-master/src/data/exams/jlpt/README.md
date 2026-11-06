# Hướng Dẫn & Cấu Trúc Dữ Liệu Đề Thi JLPT (Mock Tests)

Thư mục này dùng để lưu trữ các đề thi thử / tài liệu luyện đề JLPT (từ N5 đến N1).

## 1. Cấu trúc thư mục:
```
src/data/exams/jlpt/
├── types.ts                    <-- Hệ thống Type định nghĩa
├── index.ts                    <-- Tự động quét và nạp MỌI file JSON bằng import.meta.glob
├── n1/                         <-- Đề thi N1
├── n2/
│   ├── kokusho-20days/         <-- Đề theo sách cụ thể
│   │   ├── day01.json
│   │   └── ...
│   └── general/                <-- Đề thi thử tổng hợp / Sưu tầm
├── n3/                         <-- Đề thi N3
├── n4/                         <-- Đề thi N4
└── n5/                         <-- Đề thi N5
```

## 2. Định dạng JSON chuẩn (1 File = 1 Đề / 1 Ngày học):
```json
{
  "id": "kokusho-n2-20days-d01",
  "bookId": "kokusho-n2-20days",
  "bookTitle": "日本語能力試験 20日で合格 N2 文字・語彙・文法",
  "level": "N2",
  "day": 1,
  "title": "第1日 (Day 1)",
  "subtitle": "文字・語彙・文法",
  "timeLimitMinutes": 50,
  "totalQuestions": 54,
  "mondais": [
    {
      "number": 1,
      "type": "kanji_reading",
      "title": "漢字読み",
      "titleVi": "Cách đọc Kanji",
      "instruction": "_____の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。",
      "questions": [
        {
          "number": 1,
          "id": "kokusho_n2_d01_m1_01",
          "stem": "道に迷っても、ちゃんと戻って来るとは[賢い]犬だ。",
          "options": ["えらい", "かしこい", "すごい", "するどい"],
          "answer": 2,
          "translationVi": "Dù bị lạc đường mà vẫn quay về được đúng chỗ, quả là chú chó khôn ngoan.",
          "targetWord": {
            "kanji": "賢い",
            "hanViet": "HIỀN",
            "meaningVi": "Thông minh, khôn ngoan"
          },
          "explanation": {
            "summary": "賢い có cách đọc là かしこい.",
            "rule": "Âm Kun-yomi của chữ 賢 (HIỀN) là かしこ・い.",
            "vi": "賢い đọc là かしこい (HIỀN: thông minh, khôn ngoan).",
            "optionNotes": [
              "えらい = 偉い (vĩ đại, giỏi giang)",
              "かしこい = 賢い (thông minh)",
              "すごい = 凄い (tuyệt vời)",
              "するどい = 鋭い (sắc bén)"
            ]
          },
          "sentenceBreakdown": [
            { "text": "道に迷う", "reading": "みちにまよう", "hanViet": "ĐẠO MÊ", "meaning": "Lạc đường", "type": "vocab" },
            { "text": "〜ても", "type": "grammar", "meaning": "Dù... nhưng..." },
            { "text": "ちゃんと", "reading": "ちゃんと", "meaning": "Cẩn thận, đàng hoàng", "type": "adverb" },
            { "text": "戻って来る", "reading": "もどってくる", "hanViet": "LỆ LAI", "meaning": "Quay trở lại", "type": "vocab" },
            { "text": "〜とは", "type": "grammar", "meaning": "Quả thật là..." },
            { "text": "賢い", "reading": "かしこい", "hanViet": "HIỀN", "meaning": "Thông minh, khôn ngoan", "type": "vocab" },
            { "text": "犬", "reading": "いぬ", "hanViet": "KHUYỂN", "meaning": "Con chó", "type": "vocab" }
          ]
        }
      ]
    }
  ]
}
```

> **Lưu ý**:
> - Trường `sentenceBreakdown` là **tùy chọn (optional)**: Nếu file không có, hệ thống sẽ **tự động bóc tách và tra cứu bằng kho từ điển nội bộ** của ứng dụng!
> - Với Mondai 8 (xếp sao ★): Thêm `order: [4, 1, 3, 2]` để lưu thứ tự đúng cả 4 ô.
> - Với Mondai 9 (đoạn văn): Đặt mảng `passages` bên trong mondai, mỗi câu trỏ bằng `passageId` và `blank`.
