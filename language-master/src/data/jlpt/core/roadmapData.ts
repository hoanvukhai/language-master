// src/data/roadmapData.ts
// Dữ liệu lộ trình học JLPT N3
// Khớp hoàn toàn với DB thực tế:
//   Từ vựng: 12 bài, 882 từ
//   Kanji:   35 bài, ~320 chữ
//   Ngữ pháp: 20 bài, 122 mẫu (Bài 10 = Kính ngữ toàn bộ)
//   Chia thể: module riêng (11 thể)

export interface PhaseItem {
  week: string;
  conjugation?: string;
  vocab?: string;
  kanji?: string;
  grammar?: string;
  note?: string;
  noteType?: 'review' | 'checkpoint' | 'practice' | 'keigo';
  timeMin: number;
}

export interface Phase {
  id: string;
  phaseLabel: string;
  title: string;
  subtitle: string;
  dayRange: [number, number];
  accentColor: string;
  items: PhaseItem[];
}

export interface Track {
  id: '1m' | '3m' | '6m';
  emoji: string;
  label: string;
  days: number;
  tagline: string;
  audience: string;
  dailyTime: string;
  phases: Phase[];
}

export const tracks: Track[] = [
  // ════════════════════════════════════════════════════════════════
  // CẤP TỐC 1 THÁNG (30 ngày) — ~90 phút/ngày
  // ════════════════════════════════════════════════════════════════
  {
    id: '1m',
    emoji: '⚡',
    label: 'Cấp tốc 1 tháng',
    days: 30,
    tagline: 'Cường độ cao — ôn gấp trước kỳ thi',
    audience: 'Đã biết N4, muốn tăng tốc lên N3 hoặc ôn thi gấp',
    dailyTime: '80–100 phút/ngày',
    phases: [
      {
        id: '1m-p1', phaseLabel: 'Chặng 1', title: 'Nền tảng chia thể',
        subtitle: 'Toàn bộ chia thể + từ vựng & kanji nền',
        dayRange: [1, 5], accentColor: 'rose',
        items: [
          {
            week: 'Ngày 1–3',
            conjugation: '11 thể chia động từ (Nhóm 1 → 2 → 3)',
            vocab: 'Từ vựng Bài 1 (120 từ)',
            kanji: 'Kanji Bài 1–2 (20 chữ)',
            timeMin: 90,
          },
          {
            week: 'Ngày 4–5',
            conjugation: 'Ôn chia thể qua game (ConjugationGame)',
            vocab: 'Từ vựng Bài 2 (100 từ)',
            kanji: 'Kanji Bài 3–4 (21 chữ)',
            note: '⚡ Bắt buộc nắm vững chia thể trước khi học ngữ pháp',
            noteType: 'review',
            timeMin: 80,
          },
        ],
      },
      {
        id: '1m-p2', phaseLabel: 'Chặng 2', title: 'Từ vựng & Ngữ pháp khối 1',
        subtitle: 'Bài 1–10: Mẫu câu nền tảng → Kính ngữ',
        dayRange: [6, 16], accentColor: 'orange',
        items: [
          {
            week: 'Ngày 6–8',
            vocab: 'Từ vựng Bài 3–4 (190 từ)',
            kanji: 'Kanji Bài 5–8 (37 chữ)',
            grammar: 'Ngữ pháp Bài 1–3 (22 mẫu: Cảm xúc, Thói quen, Suy luận)',
            timeMin: 100,
          },
          {
            week: 'Ngày 9–11',
            vocab: 'Từ vựng Bài 5–6 (140 từ)',
            kanji: 'Kanji Bài 9–12 (35 chữ)',
            grammar: 'Ngữ pháp Bài 4–7 (26 mẫu: Lời khuyên, Trạng thái, Ghép động từ)',
            timeMin: 100,
          },
          {
            week: 'Ngày 12–14',
            vocab: 'Từ vựng Bài 7–8 (85 từ)',
            kanji: 'Kanji Bài 13–16 (36 chữ)',
            grammar: 'Ngữ pháp Bài 8–9 (10 mẫu: Cảm xúc, Ghép động từ nâng cao)',
            timeMin: 95,
          },
          {
            week: 'Ngày 15–16',
            vocab: 'Từ vựng Bài 9 (80 từ)',
            kanji: 'Kanji Bài 17–18 (20 chữ)',
            grammar: 'Ngữ pháp Bài 10 (4 mẫu — TRỌNG TÂM KÍNH NGỮ)',
            note: '🎓 Bài 10 = toàn bộ Kính ngữ N3 (Sonkei, Kenjou, Teinei). Luyện ngay game Kính ngữ!',
            noteType: 'keigo',
            timeMin: 95,
          },
        ],
      },
      {
        id: '1m-p3', phaseLabel: 'Chặng 3', title: 'Từ vựng & Ngữ pháp khối 2',
        subtitle: 'Bài 11–20: Ngữ pháp nâng cao + hoàn thành Kanji',
        dayRange: [17, 25], accentColor: 'violet',
        items: [
          {
            week: 'Ngày 17–19',
            vocab: 'Từ vựng Bài 10–11 (132 từ)',
            kanji: 'Kanji Bài 19–23 (44 chữ)',
            grammar: 'Ngữ pháp Bài 11–13 (16 mẫu: Suy luận, Nguyên nhân)',
            timeMin: 100,
          },
          {
            week: 'Ngày 20–22',
            vocab: 'Từ vựng Bài 12 (35 từ)',
            kanji: 'Kanji Bài 24–28 (44 chữ)',
            grammar: 'Ngữ pháp Bài 14–17 (27 mẫu: Đối lập, Hạt từ, Trích dẫn)',
            timeMin: 100,
          },
          {
            week: 'Ngày 23–25',
            kanji: 'Kanji Bài 29–35 (55 chữ — hoàn thành)',
            grammar: 'Ngữ pháp Bài 18–20 (18 mẫu: Cảm xúc, Giả định, Thời gian)',
            note: '✅ Hoàn thành 35 bài Kanji (320 chữ) & 20 bài Ngữ pháp (122 mẫu)',
            noteType: 'checkpoint',
            timeMin: 90,
          },
        ],
      },
      {
        id: '1m-p4', phaseLabel: 'Chặng 4', title: 'Tổng ôn luyện',
        subtitle: 'Flashcard + Quiz + Arena để củng cố tất cả',
        dayRange: [26, 30], accentColor: 'amber',
        items: [
          {
            week: 'Ngày 26–27',
            note: '🔄 Flashcard Từ vựng + Kanji toàn bộ 12 bài, lọc từ sai để ôn lại',
            noteType: 'review',
            timeMin: 80,
          },
          {
            week: 'Ngày 28–29',
            note: '⚔️ Quiz Ngữ pháp + Arena Bẫy đối kháng (ôn confusedWith từng mẫu)',
            noteType: 'practice',
            timeMin: 80,
          },
          {
            week: 'Ngày 30',
            note: '🏆 Đánh giá cuối: Quiz tổng hợp Từ vựng + Kanji + Ngữ pháp',
            noteType: 'checkpoint',
            timeMin: 60,
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // TIÊU CHUẨN 3 THÁNG (90 ngày) — ~50 phút/ngày  [MẶC ĐỊNH]
  // ════════════════════════════════════════════════════════════════
  {
    id: '3m',
    emoji: '⭐',
    label: 'Tiêu chuẩn 3 tháng',
    days: 90,
    tagline: 'Tốc độ lý tưởng — hấp thụ sâu, không bị ngợp',
    audience: 'Phù hợp đại đa số người tự học (đề xuất mặc định)',
    dailyTime: '45–60 phút/ngày',
    phases: [
      {
        id: '3m-p1', phaseLabel: 'Chặng 1', title: 'Nền tảng',
        subtitle: 'Chia thể + Từ vựng Bài 1–4 + Kanji Bài 1–8 + Ngữ pháp Bài 1–5',
        dayRange: [1, 25], accentColor: 'teal',
        items: [
          {
            week: 'Tuần 1 (Ngày 1–7)',
            conjugation: '11 thể chia động từ Nhóm 1, 2, 3',
            vocab: 'Từ vựng Bài 1 (120 từ)',
            kanji: 'Kanji Bài 1–3 (30 chữ)',
            timeMin: 50,
          },
          {
            week: 'Tuần 2 (Ngày 8–14)',
            vocab: 'Từ vựng Bài 2 (100 từ)',
            kanji: 'Kanji Bài 4–6 (29 chữ)',
            grammar: 'Ngữ pháp Bài 1–2 (14 mẫu: Cảm xúc, Mong muốn)',
            timeMin: 50,
          },
          {
            week: 'Tuần 3 (Ngày 15–21)',
            vocab: 'Từ vựng Bài 3 (90 từ)',
            kanji: 'Kanji Bài 7–8 (19 chữ)',
            grammar: 'Ngữ pháp Bài 3–4 (14 mẫu: Suy luận, Lời khuyên)',
            timeMin: 55,
          },
          {
            week: 'Tuần 4 — Checkpoint (Ngày 22–25)',
            vocab: 'Từ vựng Bài 4 (100 từ)',
            grammar: 'Ngữ pháp Bài 5 (5 mẫu: Ghép động từ)',
            note: '📊 Kiểm tra Chặng 1: Flashcard + Quiz Bài 1–4',
            noteType: 'checkpoint',
            timeMin: 50,
          },
        ],
      },
      {
        id: '3m-p2', phaseLabel: 'Chặng 2', title: 'Mở rộng',
        subtitle: 'Từ vựng Bài 5–8 + Kanji Bài 9–18 + Ngữ pháp Bài 6–10 (Kính ngữ!)',
        dayRange: [26, 55], accentColor: 'blue',
        items: [
          {
            week: 'Tuần 5 (Ngày 26–32)',
            vocab: 'Từ vựng Bài 5 (100 từ)',
            kanji: 'Kanji Bài 9–11 (24 chữ)',
            grammar: 'Ngữ pháp Bài 6–7 (15 mẫu: Trạng thái, Thời gian)',
            timeMin: 55,
          },
          {
            week: 'Tuần 6 (Ngày 33–39)',
            vocab: 'Từ vựng Bài 6 (40 từ)',
            kanji: 'Kanji Bài 12–14 (25 chữ)',
            grammar: 'Ngữ pháp Bài 8–9 (10 mẫu: Cảm xúc, Ghép động từ nâng cao)',
            timeMin: 50,
          },
          {
            week: 'Tuần 7 (Ngày 40–46)',
            vocab: 'Từ vựng Bài 7 (40 từ)',
            kanji: 'Kanji Bài 15–17 (31 chữ)',
            grammar: 'Ngữ pháp Bài 10 (4 mẫu — KÍNH NGỮ: Sonkei, Kenjou, Teinei)',
            note: '🎓 Tuần trọng tâm Kính ngữ! Học Ngữ pháp Bài 10 + luyện game Kính ngữ ngay trong tuần này',
            noteType: 'keigo',
            timeMin: 55,
          },
          {
            week: 'Tuần 8 — Checkpoint (Ngày 47–55)',
            vocab: 'Từ vựng Bài 8 (45 từ)',
            kanji: 'Kanji Bài 18 (8 chữ)',
            grammar: 'Ngữ pháp Bài 11 (3 mẫu)',
            note: '📊 Kiểm tra Chặng 2: Quiz Ngữ pháp Bài 1–11 + Quiz Từ vựng Bài 1–8',
            noteType: 'checkpoint',
            timeMin: 50,
          },
        ],
      },
      {
        id: '3m-p3', phaseLabel: 'Chặng 3', title: 'Nâng cao',
        subtitle: 'Từ vựng Bài 9–12 + Kanji Bài 19–28 + Ngữ pháp Bài 12–17',
        dayRange: [56, 78], accentColor: 'violet',
        items: [
          {
            week: 'Tuần 9 (Ngày 56–62)',
            vocab: 'Từ vựng Bài 9 (80 từ)',
            kanji: 'Kanji Bài 19–21 (26 chữ)',
            grammar: 'Ngữ pháp Bài 12–13 (13 mẫu: Suy luận, Nguyên nhân)',
            timeMin: 55,
          },
          {
            week: 'Tuần 10 (Ngày 63–69)',
            vocab: 'Từ vựng Bài 10 (82 từ)',
            kanji: 'Kanji Bài 22–24 (26 chữ)',
            grammar: 'Ngữ pháp Bài 14–15 (13 mẫu: Đối lập, Hạt từ, Nguyên nhân)',
            timeMin: 55,
          },
          {
            week: 'Tuần 11 — Checkpoint (Ngày 70–78)',
            vocab: 'Từ vựng Bài 11–12 (85 từ — hoàn thành)',
            kanji: 'Kanji Bài 25–28 (38 chữ)',
            grammar: 'Ngữ pháp Bài 16–17 (14 mẫu: Thói quen, Trích dẫn)',
            note: '✅ Hoàn thành toàn bộ 12 bài Từ vựng — 882 từ!',
            noteType: 'checkpoint',
            timeMin: 55,
          },
        ],
      },
      {
        id: '3m-p4', phaseLabel: 'Chặng 4', title: 'Hoàn thiện & Luyện',
        subtitle: 'Kanji Bài 29–35 + Ngữ pháp Bài 18–20 + Ôn tổng hợp',
        dayRange: [79, 90], accentColor: 'amber',
        items: [
          {
            week: 'Tuần 12 (Ngày 79–85)',
            kanji: 'Kanji Bài 29–35 (55 chữ — hoàn thành)',
            grammar: 'Ngữ pháp Bài 18–20 (18 mẫu: Cảm xúc, Giả định, Thời gian)',
            note: '✅ Hoàn thành 35 bài Kanji (320 chữ) & 20 bài Ngữ pháp (122 mẫu)',
            noteType: 'checkpoint',
            timeMin: 55,
          },
          {
            week: 'Tuần 13 — Tổng luyện (Ngày 86–90)',
            note: '🏆 Tổng ôn: Flashcard tổng hợp → Quiz → Arena → Xếp câu. Đánh giá cuối khoá.',
            noteType: 'checkpoint',
            timeMin: 50,
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // THONG THẢ 6 THÁNG (180 ngày) — ~35 phút/ngày
  // ════════════════════════════════════════════════════════════════
  {
    id: '6m',
    emoji: '☕',
    label: 'Thong thả 6 tháng',
    days: 180,
    tagline: 'Nhẹ nhàng, bền vững — dành cho người bận rộn',
    audience: 'Người đi làm, chỉ có 30–45 phút/ngày',
    dailyTime: '30–45 phút/ngày',
    phases: [
      {
        id: '6m-p1', phaseLabel: 'Chặng 1', title: 'Nhập môn',
        subtitle: 'Chia thể + Từ vựng Bài 1–3 + Kanji Bài 1–7 + Ngữ pháp Bài 1–4',
        dayRange: [1, 45], accentColor: 'emerald',
        items: [
          {
            week: 'Tháng 1, Tuần 1–2 (Ngày 1–14)',
            conjugation: '11 thể chia động từ — học từng nhóm, 3–4 thể/tuần',
            vocab: 'Từ vựng Bài 1 (120 từ, ~8 từ/ngày)',
            timeMin: 35,
          },
          {
            week: 'Tháng 1, Tuần 3–4 (Ngày 15–30)',
            vocab: 'Từ vựng Bài 2 (100 từ)',
            kanji: 'Kanji Bài 1–4 (41 chữ, ~3 chữ/ngày)',
            grammar: 'Ngữ pháp Bài 1–2 (14 mẫu)',
            timeMin: 38,
          },
          {
            week: 'Tháng 1, Tuần 5–Ôn (Ngày 31–45)',
            vocab: 'Từ vựng Bài 3 (90 từ)',
            kanji: 'Kanji Bài 5–7 (27 chữ)',
            grammar: 'Ngữ pháp Bài 3–4 (14 mẫu: Suy luận, Lời khuyên)',
            note: '🔄 Ôn tập tháng 1: Flashcard Từ vựng Bài 1–3',
            noteType: 'review',
            timeMin: 38,
          },
        ],
      },
      {
        id: '6m-p2', phaseLabel: 'Chặng 2', title: 'Nền tảng',
        subtitle: 'Từ vựng Bài 4–6 + Kanji Bài 8–14 + Ngữ pháp Bài 5–9',
        dayRange: [46, 90], accentColor: 'cyan',
        items: [
          {
            week: 'Tháng 2, Tuần 1–2 (Ngày 46–60)',
            vocab: 'Từ vựng Bài 4 (100 từ)',
            kanji: 'Kanji Bài 8–10 (26 chữ)',
            grammar: 'Ngữ pháp Bài 5–6 (13 mẫu: Ghép động từ, Trạng thái)',
            timeMin: 38,
          },
          {
            week: 'Tháng 2, Tuần 3 (Ngày 61–75)',
            vocab: 'Từ vựng Bài 5 (100 từ)',
            kanji: 'Kanji Bài 11–13 (25 chữ)',
            grammar: 'Ngữ pháp Bài 7–8 (12 mẫu: Thời gian, Cảm xúc)',
            timeMin: 38,
          },
          {
            week: 'Tháng 2, Tuần 4–Ôn (Ngày 76–90)',
            vocab: 'Từ vựng Bài 6 (40 từ)',
            kanji: 'Kanji Bài 14 (8 chữ)',
            grammar: 'Ngữ pháp Bài 9 (5 mẫu: Ghép động từ nâng cao)',
            note: '🔄 Ôn tập tháng 2: Quiz Ngữ pháp Bài 1–9 + Flashcard Kanji Bài 1–14',
            noteType: 'review',
            timeMin: 35,
          },
        ],
      },
      {
        id: '6m-p3', phaseLabel: 'Chặng 3', title: 'Kính ngữ & Nâng cao',
        subtitle: 'Từ vựng Bài 7–9 + Kanji Bài 15–21 + Ngữ pháp Bài 10–13',
        dayRange: [91, 135], accentColor: 'blue',
        items: [
          {
            week: 'Tháng 3, Tuần 1–2 (Ngày 91–105)',
            vocab: 'Từ vựng Bài 7 (40 từ)',
            kanji: 'Kanji Bài 15–17 (31 chữ)',
            grammar: 'Ngữ pháp Bài 10 (4 mẫu — KÍNH NGỮ)',
            note: '🎓 Tuần Kính ngữ: Ngữ pháp Bài 10 + luyện game Kính ngữ ngay trong tuần này!',
            noteType: 'keigo',
            timeMin: 38,
          },
          {
            week: 'Tháng 3, Tuần 3 (Ngày 106–120)',
            vocab: 'Từ vựng Bài 8 (45 từ)',
            kanji: 'Kanji Bài 18–20 (27 chữ)',
            grammar: 'Ngữ pháp Bài 11–12 (10 mẫu: Suy luận, Nguyên nhân)',
            timeMin: 38,
          },
          {
            week: 'Tháng 3, Tuần 4–Ôn (Ngày 121–135)',
            vocab: 'Từ vựng Bài 9 (80 từ)',
            kanji: 'Kanji Bài 21 (8 chữ)',
            grammar: 'Ngữ pháp Bài 13 (6 mẫu: Cảm xúc, Đối lập)',
            note: '📊 Checkpoint tháng 3: Quiz Ngữ pháp Bài 1–13 + Arena Bẫy đối kháng',
            noteType: 'checkpoint',
            timeMin: 38,
          },
        ],
      },
      {
        id: '6m-p4', phaseLabel: 'Chặng 4', title: 'Mở rộng',
        subtitle: 'Từ vựng Bài 10–12 + Kanji Bài 22–29 + Ngữ pháp Bài 14–17',
        dayRange: [136, 160], accentColor: 'violet',
        items: [
          {
            week: 'Tháng 4, Tuần 1–2 (Ngày 136–150)',
            vocab: 'Từ vựng Bài 10–11 (132 từ)',
            kanji: 'Kanji Bài 22–26 (45 chữ)',
            grammar: 'Ngữ pháp Bài 14–15 (13 mẫu: Đối lập, Hạt từ)',
            timeMin: 40,
          },
          {
            week: 'Tháng 4, Tuần 3 (Ngày 151–160)',
            vocab: 'Từ vựng Bài 12 (35 từ — hoàn thành)',
            kanji: 'Kanji Bài 27–29 (25 chữ)',
            grammar: 'Ngữ pháp Bài 16–17 (14 mẫu: Thói quen, Trích dẫn)',
            note: '✅ Hoàn thành 12 bài Từ vựng — 882 từ trong túi!',
            noteType: 'checkpoint',
            timeMin: 40,
          },
        ],
      },
      {
        id: '6m-p5', phaseLabel: 'Chặng 5', title: 'Hoàn thiện & Luyện',
        subtitle: 'Kanji Bài 30–35 + Ngữ pháp Bài 18–20 + Tổng ôn game',
        dayRange: [161, 180], accentColor: 'amber',
        items: [
          {
            week: 'Tháng 5, Tuần 1 (Ngày 161–170)',
            kanji: 'Kanji Bài 30–35 (55 chữ — hoàn thành)',
            grammar: 'Ngữ pháp Bài 18–20 (18 mẫu: Cảm xúc, Giả định, Thời gian)',
            note: '✅ Hoàn thành 35 bài Kanji (320 chữ) & 20 bài Ngữ pháp (122 mẫu)',
            noteType: 'checkpoint',
            timeMin: 40,
          },
          {
            week: 'Tháng 5, Tuần 2–3 (Ngày 171–180)',
            note: '🏆 Tổng luyện: Flashcard → Quiz → Nối từ → Xếp câu → Arena. Đánh giá toàn khoá.',
            noteType: 'checkpoint',
            timeMin: 40,
          },
        ],
      },
    ],
  },
];

export const NOTE_CONFIG: Record<string, { icon: string; bg: string; text: string }> = {
  review:     { icon: '🔄', bg: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',     text: 'text-blue-700 dark:text-blue-300'     },
  checkpoint: { icon: '🎯', bg: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300'   },
  practice:   { icon: '⚔️', bg: 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300' },
  keigo:      { icon: '🎓', bg: 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300'   },
};
