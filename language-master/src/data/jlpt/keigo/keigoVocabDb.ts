// src/data/jlpt/keigo/keigoVocabDb.ts

export interface KeigoVocab {
  id: string;
  word: string; // The base word, e.g. 名前, 住所, 茶
  hiragana: string; // なまえ, じゅうしょ, ちゃ
  prefix: 'o' | 'go'; 
  isException: boolean; // True if Kango with 'o' or Wago with 'go'
  type: 'wago' | 'kango'; // Wago = thuần Nhật (thường Kun-yomi), Kango = Hán Nhật (thường On-yomi)
  meaning: { vi: string; en: string };
  note?: { vi: string; en: string };
}

export const keigoVocabList: KeigoVocab[] = [
  // ── 1. WAGO + お (Thuần Nhật - 12 từ) ──
  {
    id: 'kv_w01', word: '名前', hiragana: 'なまえ', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Tên', en: 'Name' }
  },
  {
    id: 'kv_w02', word: '仕事', hiragana: 'しごと', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Công việc', en: 'Job / Work' }
  },
  {
    id: 'kv_w03', word: '家', hiragana: 'うち', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Nhà', en: 'House' }
  },
  {
    id: 'kv_w04', word: '話', hiragana: 'はなし', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Câu chuyện', en: 'Story / Talk' }
  },
  {
    id: 'kv_w05', word: '手紙', hiragana: 'てがみ', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Bức thư', en: 'Letter' }
  },
  {
    id: 'kv_w06', word: '席', hiragana: 'せき', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Chỗ ngồi', en: 'Seat' }
  },
  {
    id: 'kv_w07', word: '車', hiragana: 'くるま', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Xe ô tô', en: 'Car' }
  },
  {
    id: 'kv_w08', word: '水', hiragana: 'みず', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Nước', en: 'Water' }
  },
  {
    id: 'kv_w09', word: '金', hiragana: 'かね', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Tiền bạc', en: 'Money' }
  },
  {
    id: 'kv_w10', word: '土産', hiragana: 'みやげ', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Quà lưu niệm', en: 'Souvenir' }
  },
  {
    id: 'kv_w11', word: '客', hiragana: 'きゃく', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Khách hàng', en: 'Customer / Guest' }
  },
  {
    id: 'kv_w12', word: '心', hiragana: 'こころ', prefix: 'o', isException: false, type: 'wago',
    meaning: { vi: 'Tấm lòng / Trái tim', en: 'Heart / Mind' }
  },

  // ── 2. KANGO + ご (Hán Nhật - 10 từ) ──
  {
    id: 'kv_k01', word: '住所', hiragana: 'じゅうしょ', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Địa chỉ', en: 'Address' }
  },
  {
    id: 'kv_k02', word: '連絡', hiragana: 'れんらく', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Liên lạc', en: 'Contact' }
  },
  {
    id: 'kv_k03', word: '質問', hiragana: 'しつもん', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Câu hỏi', en: 'Question' }
  },
  {
    id: 'kv_k04', word: '説明', hiragana: 'せつめい', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Giải thích', en: 'Explanation' }
  },
  {
    id: 'kv_k05', word: '注文', hiragana: 'ちゅうもん', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Đặt hàng (Order)', en: 'Order' }
  },
  {
    id: 'kv_k06', word: '報告', hiragana: 'ほうこく', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Báo cáo', en: 'Report' }
  },
  {
    id: 'kv_k07', word: '家族', hiragana: 'かぞく', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Gia đình', en: 'Family' }
  },
  {
    id: 'kv_k08', word: '都合', hiragana: 'つごう', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Sự thuận tiện (thời gian)', en: 'Convenience' }
  },
  {
    id: 'kv_k09', word: '理解', hiragana: 'りかい', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Sự thấu hiểu', en: 'Understanding' }
  },
  {
    id: 'kv_k10', word: '協力', hiragana: 'きょうりょく', prefix: 'go', isException: false, type: 'kango',
    meaning: { vi: 'Sự hợp tác', en: 'Cooperation' }
  },

  // ── 3. NGOẠI LỆ (Exceptions - 11 từ) ──
  {
    id: 'kv_e01', word: '茶', hiragana: 'ちゃ', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Trà', en: 'Tea' },
    note: { vi: 'Từng là từ Hán nhưng đã hòa nhập vào đời sống Nhật Bản nên dùng お.', en: 'Integrated so deeply into Japanese life that it takes お.' }
  },
  {
    id: 'kv_e02', word: '電話', hiragana: 'でんわ', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Điện thoại', en: 'Phone' },
    note: { vi: 'Từ Hán Nhật phổ biến hàng ngày, luôn dùng お.', en: 'A daily word that always takes お.' }
  },
  {
    id: 'kv_e03', word: '食事', hiragana: 'しょくじ', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Bữa ăn', en: 'Meal' }
  },
  {
    id: 'kv_e04', word: '料理', hiragana: 'りょうり', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Món ăn / Nấu ăn', en: 'Cooking / Dish' }
  },
  {
    id: 'kv_e05', word: '写真', hiragana: 'しゃしん', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Bức ảnh', en: 'Photo' }
  },
  {
    id: 'kv_e06', word: '化粧', hiragana: 'けしょう', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Trang điểm', en: 'Makeup' }
  },
  {
    id: 'kv_e07', word: '勉強', hiragana: 'べんきょう', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Học tập', en: 'Study' }
  },
  {
    id: 'kv_e08', word: '時間', hiragana: 'じかん', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Thời gian', en: 'Time' }
  },
  {
    id: 'kv_e09', word: '散歩', hiragana: 'さんぽ', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Đi dạo', en: 'Stroll' }
  },
  {
    id: 'kv_e10', word: '天気', hiragana: 'てんき', prefix: 'o', isException: true, type: 'kango',
    meaning: { vi: 'Thời tiết', en: 'Weather' },
    note: { vi: 'Thời tiết là tự nhiên, không thể kính trọng thời tiết nên dùng お để "mỹ hóa" (làm đẹp) câu nói.', en: 'Used for beautification (bikago) rather than respect.' }
  },
  {
    id: 'kv_e11', word: 'ゆっくり', hiragana: 'ゆっくり', prefix: 'go', isException: true, type: 'wago',
    meaning: { vi: 'Thong thả / Chậm rãi', en: 'Slowly / Relaxing' },
    note: { vi: 'Từ thuần Nhật nhưng đi với ご (VD: ごゆっくりお休みください).', en: 'Wago but takes ご.' }
  }
];
