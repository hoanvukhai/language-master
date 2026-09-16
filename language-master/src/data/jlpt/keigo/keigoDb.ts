// src/data/keigoDb.ts
import type { KeigoVerb } from '../../../types/keigo';

export const keigoVerbs: KeigoVerb[] = [
  // ────────── NHÓM ĐẶC BIỆT HOÀN TOÀN ──────────

  // 1. いく (Đi)
  {
    id: 'k_v01',
    jisho: '行く', kanji: '行く', hiragana: 'いく', group: 1, prefix: 'none',
    meaning: { vi: 'Đi', en: 'Go' },
    sonkei: { type: 'special', words: [{ word: 'いらっしゃる', hiragana: 'いらっしゃる' }, { word: 'おいでになる', hiragana: 'おいでになる' }] },
    kenjou: { type: 'special', words: [{ word: '参る', hiragana: 'まいる' }, { word: '伺う', hiragana: 'うかがう' }] },
    teinei: { type: 'rule', words: [] },
    note: { vi: '伺う dùng khi đi đến nơi liên quan đến người bề trên', en: '伺う is used when going to a place related to a superior' },
  },
  // 2. くる (Đến)
  {
    id: 'k_v02',
    jisho: '来る', kanji: '来る', hiragana: 'くる', group: 3, prefix: 'none',
    meaning: { vi: 'Đến', en: 'Come' },
    sonkei: { type: 'special', words: [{ word: 'いらっしゃる', hiragana: 'いらっしゃる' }, { word: 'おいでになる', hiragana: 'おいでになる' }] },
    kenjou: { type: 'special', words: [{ word: '参る', hiragana: 'まいる' }, { word: '伺う', hiragana: 'うかがう' }] },
    teinei: { type: 'rule', words: [] },
  },
  // 3. いる (Ở)
  {
    id: 'k_v03',
    jisho: 'いる', kanji: 'いる', hiragana: 'いる', group: 2, prefix: 'none',
    meaning: { vi: 'Có mặt / Ở', en: 'Be / Stay' },
    sonkei: { type: 'special', words: [{ word: 'いらっしゃる', hiragana: 'いらっしゃる' }, { word: 'おいでになる', hiragana: 'おいでになる' }] },
    kenjou: { type: 'special', words: [{ word: 'おる', hiragana: 'おる' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 4. 食べる (Ăn)
  {
    id: 'k_v04',
    jisho: '食べる', kanji: '食べる', hiragana: 'たべる', group: 2, prefix: 'none',
    meaning: { vi: 'Ăn', en: 'Eat' },
    sonkei: { type: 'special', words: [{ word: '召し上がる', hiragana: 'めしあがる' }] },
    kenjou: { type: 'special', words: [{ word: 'いただく', hiragana: 'いただく' }] },
    teinei: { type: 'rule', words: [] },
  },
  // 5. 飲む (Uống)
  {
    id: 'k_v05',
    jisho: '飲む', kanji: '飲む', hiragana: 'のむ', group: 1, prefix: 'none',
    meaning: { vi: 'Uống', en: 'Drink' },
    sonkei: { type: 'special', words: [{ word: '召し上がる', hiragana: 'めしあがる' }] },
    kenjou: { type: 'special', words: [{ word: 'いただく', hiragana: 'いただく' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 6. 言う (Nói)
  {
    id: 'k_v06',
    jisho: '言う', kanji: '言う', hiragana: 'いう', group: 1, prefix: 'none',
    meaning: { vi: 'Nói', en: 'Say' },
    sonkei: { type: 'special', words: [{ word: 'おっしゃる', hiragana: 'おっしゃる' }] },
    kenjou: { type: 'special', words: [{ word: '申す', hiragana: 'もうす' }, { word: '申し上げる', hiragana: 'もうしあげる' }] },
    teinei: { type: 'rule', words: [] },
  },
  // 7. 聞く (Hỏi / Nghe)
  {
    id: 'k_v07',
    jisho: '聞く', kanji: '聞く', hiragana: 'きく', group: 1, prefix: 'o',
    meaning: { vi: 'Hỏi / Nghe', en: 'Ask / Listen' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'special', words: [{ word: '伺う', hiragana: 'うかがう' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 8. 見る (Nhìn / Xem)
  {
    id: 'k_v08',
    jisho: '見る', kanji: '見る', hiragana: 'みる', group: 2, prefix: 'none',
    meaning: { vi: 'Nhìn / Xem', en: 'See / Watch' },
    sonkei: { type: 'special', words: [{ word: 'ご覧になる', hiragana: 'ごらんになる' }] },
    kenjou: { type: 'special', words: [{ word: '拝見する', hiragana: 'はいけんする' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 9. 知っている (Biết)
  {
    id: 'k_v09',
    jisho: '知っている', kanji: '知っている', hiragana: 'しっている', group: 2, prefix: 'none',
    meaning: { vi: 'Biết', en: 'Know' },
    sonkei: { type: 'special', words: [{ word: 'ご存知だ', hiragana: 'ごぞんじだ' }] },
    kenjou: { type: 'special', words: [{ word: '存じている', hiragana: 'ぞんじている' }, { word: '存じております', hiragana: 'ぞんじております' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 10. あげる (Cho người khác)
  {
    id: 'k_v10',
    jisho: 'あげる', kanji: 'あげる', hiragana: 'あげる', group: 2, prefix: 'none',
    meaning: { vi: 'Cho (người khác)', en: 'Give (to others)' },
    sonkei: { type: 'none', words: [] },
    kenjou: { type: 'special', words: [{ word: '差し上げる', hiragana: 'さしあげる' }] },
    teinei: { type: 'rule', words: [] },
  },
  // 11. もらう (Nhận)
  {
    id: 'k_v11',
    jisho: 'もらう', kanji: 'もらう', hiragana: 'もらう', group: 1, prefix: 'none',
    meaning: { vi: 'Nhận (từ người khác)', en: 'Receive' },
    sonkei: { type: 'none', words: [] },
    kenjou: { type: 'special', words: [{ word: 'いただく', hiragana: 'いただく' }, { word: '頂戴する', hiragana: 'ちょうだいする' }] },
    teinei: { type: 'rule', words: [] },
  },
  // 12. くれる (Cho mình)
  {
    id: 'k_v12',
    jisho: 'くれる', kanji: 'くれる', hiragana: 'くれる', group: 2, prefix: 'none',
    meaning: { vi: 'Cho (mình)', en: 'Give (to me)' },
    sonkei: { type: 'special', words: [{ word: 'くださる', hiragana: 'くださる' }] },
    kenjou: { type: 'none', words: [] },
    teinei: { type: 'rule', words: [] },
  },

  // 13. する (Làm)
  {
    id: 'k_v13',
    jisho: 'する', kanji: 'する', hiragana: 'する', group: 3, prefix: 'none',
    meaning: { vi: 'Làm / Thực hiện', en: 'Do' },
    sonkei: { type: 'special', words: [{ word: 'なさる', hiragana: 'なさる' }] },
    kenjou: { type: 'special', words: [{ word: 'いたす', hiragana: 'いたす' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 14. 会う (Gặp)
  {
    id: 'k_v14',
    jisho: '会う', kanji: '会う', hiragana: 'あう', group: 1, prefix: 'o',
    meaning: { vi: 'Gặp', en: 'Meet' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'special', words: [{ word: 'お目にかかる', hiragana: 'おめにかかる' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 15. 尋ねる / 訪問する (Thăm hỏi)
  {
    id: 'k_v15',
    jisho: '尋ねる', kanji: '尋ねる', hiragana: 'たずねる', group: 2, prefix: 'o',
    meaning: { vi: 'Thăm / Hỏi thăm', en: 'Visit' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'special', words: [{ word: '伺う', hiragana: 'うかがう' }, { word: 'お邪魔する', hiragana: 'おじゃまする' }] },
    teinei: { type: 'rule', words: [] },
  },

  // 16. 死ぬ (Chết)
  {
    id: 'k_v16',
    jisho: '死ぬ', kanji: '死ぬ', hiragana: 'しぬ', group: 1, prefix: 'none',
    meaning: { vi: 'Chết / Mất', en: 'Die' },
    sonkei: { type: 'special', words: [{ word: 'お亡くなりになる', hiragana: 'おなくなりになる' }] },
    kenjou: { type: 'none', words: [] },
    teinei: { type: 'rule', words: [] },
  },

  // 17. ある (Có đồ vật)
  {
    id: 'k_v17',
    jisho: 'ある', kanji: 'ある', hiragana: 'ある', group: 1, prefix: 'none',
    meaning: { vi: 'Có (đồ vật)', en: 'Have / Exist' },
    sonkei: { type: 'none', words: [] },
    kenjou: { type: 'none', words: [] },
    teinei: { type: 'special', words: [{ word: 'ござる', hiragana: 'ござる' }] },
  },

  // 18. です (Là)
  {
    id: 'k_v18',
    jisho: 'です', kanji: 'です', hiragana: 'です', group: 3, prefix: 'none',
    meaning: { vi: 'Là (to be)', en: 'Is/Am/Are' },
    sonkei: { type: 'none', words: [] },
    kenjou: { type: 'none', words: [] },
    teinei: { type: 'special', words: [{ word: 'でございます', hiragana: 'でございます' }] },
  },

  // 19. 分かる (Hiểu)
  {
    id: 'k_v19',
    jisho: '分かる', kanji: '分かる', hiragana: 'わかる', group: 1, prefix: 'none',
    meaning: { vi: 'Hiểu / Nhận lời', en: 'Understand' },
    sonkei: { type: 'none', words: [] },
    kenjou: { type: 'special', words: [{ word: 'かしこまる', hiragana: 'かしこまる' }] },
    teinei: { type: 'rule', words: [] },
  },

  // ────────── THEO QUY TẮC NHÓM 1, 2, 3 ──────────
  {
    id: 'k_v20',
    jisho: '書く', kanji: '書く', hiragana: 'かく', group: 1, prefix: 'o',
    meaning: { vi: 'Viết', en: 'Write' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  },
  {
    id: 'k_v21',
    jisho: '待つ', kanji: '待つ', hiragana: 'まつ', group: 1, prefix: 'o',
    meaning: { vi: 'Chờ', en: 'Wait' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  },
  {
    id: 'k_v22',
    jisho: '読む', kanji: '読む', hiragana: 'よむ', group: 1, prefix: 'o',
    meaning: { vi: 'Đọc', en: 'Read' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  },
  {
    id: 'k_v23',
    jisho: '教える', kanji: '教える', hiragana: 'おしえる', group: 2, prefix: 'o',
    meaning: { vi: 'Dạy / Cho biết', en: 'Teach / Tell' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  },
  {
    id: 'k_v24',
    jisho: '見せる', kanji: '見せる', hiragana: 'みせる', group: 2, prefix: 'o',
    meaning: { vi: 'Cho xem', en: 'Show' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  },
  {
    id: 'k_v25',
    jisho: '案内する', kanji: '案内する', hiragana: 'あんないする', group: 3, prefix: 'go',
    meaning: { vi: 'Hướng dẫn', en: 'Guide' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  },
  {
    id: 'k_v26',
    jisho: '連絡する', kanji: '連絡する', hiragana: 'れんらくする', group: 3, prefix: 'go',
    meaning: { vi: 'Liên lạc', en: 'Contact' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  },
  {
    id: 'k_v27',
    jisho: '説明する', kanji: '説明する', hiragana: 'せつめいする', group: 3, prefix: 'go',
    meaning: { vi: 'Giải thích', en: 'Explain' },
    sonkei: { type: 'rule', words: [] },
    kenjou: { type: 'rule', words: [] },
    teinei: { type: 'rule', words: [] },
  }
];
