export interface KeigoQuestion {
  id: number;
  category: 'normal_rules' | 'special_verbs' | 'business_manners' | 'o_go_prefix';
  context_vi: string;
  context_en: string;
  speaker: 'self' | 'other';
  sentence_kanji: string;
  sentence_hiragana: string;
  target_verb: string;
  correct_answer_type: 'sonkeigo' | 'kenjougo_1' | 'kenjougo_2' | 'teineigo' | 'bikago';
  correct_answer_text: string;
}

export const keigoN3Questions: KeigoQuestion[] = [
  // ── NHÓM 1: TRƯỜNG HỢP BIẾN ĐỔI ĐẶC BIỆT ──
  {
    id: 1, category: 'special_verbs', speaker: 'other', target_verb: '食べる', correct_answer_type: 'sonkeigo', correct_answer_text: '召し上がりました',
    context_vi: 'Hỏi sếp xem sếp đã ăn trưa chưa.', context_en: 'Ask your boss if they have eaten lunch.',
    sentence_kanji: '部長、もう昼ご飯を＿＿＿＿か。', sentence_hiragana: 'ぶちょう、もうひるごはんを＿＿＿＿か。'
  },
  {
    id: 2, category: 'special_verbs', speaker: 'self', target_verb: '食べる', correct_answer_type: 'kenjougo_1', correct_answer_text: 'いただきます',
    context_vi: 'Nói với khách hàng là mình sẽ ăn/nhận món ăn này.', context_en: 'Tell the customer that you will eat/receive this food.',
    sentence_kanji: 'それでは、こちらの料理を＿＿＿＿。', sentence_hiragana: 'それでは、こちらのりょうりを＿＿＿＿。'
  },
  {
    id: 3, category: 'special_verbs', speaker: 'other', target_verb: '知っている', correct_answer_type: 'sonkeigo', correct_answer_text: 'ご存じです',
    context_vi: 'Hỏi khách hàng xem họ có biết lịch trình ngày mai không.', context_en: 'Ask the customer if they know tomorrow schedule.',
    sentence_kanji: '明日のスケジュールは＿＿＿＿か。', sentence_hiragana: 'あしたのスケジュールは＿＿＿＿か。'
  },
  {
    id: 4, category: 'special_verbs', speaker: 'self', target_verb: '知っている', correct_answer_type: 'kenjougo_2', correct_answer_text: '存じております',
    context_vi: 'Nói với sếp là mình biết/hiểu về dự án mới rồi.', context_en: 'Tell your boss that you know/understand the new project.',
    sentence_kanji: '新しいプロジェクトの件、＿＿＿＿。', sentence_hiragana: 'あたらしいプロジェクトのけん、＿＿＿＿。'
  },
  {
    id: 5, category: 'special_verbs', speaker: 'other', target_verb: 'いる', correct_answer_type: 'sonkeigo', correct_answer_text: 'いらっしゃいます',
    context_vi: 'Hỏi sếp xem sếp đang ở đâu.', context_en: 'Ask your boss where they currently are.',
    sentence_kanji: '部長、今どちらに＿＿＿＿か。', sentence_hiragana: 'ぶちょう、いまどちらに＿＿＿＿か。'
  },
  {
    id: 6, category: 'special_verbs', speaker: 'self', target_verb: 'いる', correct_answer_type: 'kenjougo_2', correct_answer_text: 'おります',
    context_vi: 'Nói với khách hàng là mình sẽ ở văn phòng cả ngày.', context_en: 'Tell the customer that you will be at the office all day.',
    sentence_kanji: '本日、私はずっとオフィスに＿＿＿＿。', sentence_hiragana: 'ほんじつ、わたしはずっとオフィスに＿＿＿＿。'
  },
  {
    id: 7, category: 'special_verbs', speaker: 'other', target_verb: '来る', correct_answer_type: 'sonkeigo', correct_answer_text: 'いらっしゃいます',
    context_vi: 'Hỏi sếp xem ngày mai sếp có đến công ty không.', context_en: 'Ask your boss if they will come to the office tomorrow.',
    sentence_kanji: '明日、会社に＿＿＿＿か。', sentence_hiragana: 'あした、かいしゃに＿＿＿＿か。'
  },
  {
    id: 8, category: 'special_verbs', speaker: 'self', target_verb: '来る', correct_answer_type: 'kenjougo_2', correct_answer_text: '参ります',
    context_vi: 'Nói với khách hàng là lát nữa mình sẽ đến văn phòng của họ.', context_en: 'Tell the customer that you will come to their office later.',
    sentence_kanji: '後ほど、そちらのオフィスへ＿＿＿＿。', sentence_hiragana: 'のちほど、そちらのオフィスへ＿＿＿＿。'
  },
  {
    id: 9, category: 'special_verbs', speaker: 'other', target_verb: '見る', correct_answer_type: 'sonkeigo', correct_answer_text: 'ご覧になりました',
    context_vi: 'Hỏi khách hàng xem họ đã xem qua tài liệu chưa.', context_en: 'Ask the customer if they have looked through the document.',
    sentence_kanji: 'こちらの資料はもう＿＿＿＿か。', sentence_hiragana: 'こちらのしりょうはもう＿＿＿＿か。'
  },
  {
    id: 10, category: 'special_verbs', speaker: 'self', target_verb: '見る', correct_answer_type: 'kenjougo_1', correct_answer_text: '拝見しました',
    context_vi: 'Nói với sếp là mình đã xem qua bản báo cáo rồi.', context_en: 'Tell your boss that you have looked at the report.',
    sentence_kanji: 'はい、報告書はすでに＿＿＿＿。', sentence_hiragana: 'はい、ほうこくしょはすでに＿＿＿＿。'
  },
  {
    id: 11, category: 'special_verbs', speaker: 'other', target_verb: '言う', correct_answer_type: 'sonkeigo', correct_answer_text: 'おっしゃいました',
    context_vi: 'Hỏi khách hàng xem vừa rồi họ đã nói gì.', context_en: 'Ask the customer what they just said.',
    sentence_kanji: 'お客様、ただいま何と＿＿＿＿か。', sentence_hiragana: 'おきゃくさま、ただいまなんと＿＿＿＿か。'
  },
  {
    id: 12, category: 'special_verbs', speaker: 'self', target_verb: '言う', correct_answer_type: 'kenjougo_2', correct_answer_text: '申します',
    context_vi: 'Tự giới thiệu tên của mình với khách hàng khi nghe điện thoại.', context_en: 'Introduce your name to a customer over the phone.',
    sentence_kanji: 'フェニカー大学のグエンと＿＿＿＿。', sentence_hiragana: 'フェニカーだいがくのグエンと＿＿＿＿。'
  },
  {
    id: 13, category: 'special_verbs', speaker: 'other', target_verb: 'する', correct_answer_type: 'sonkeigo', correct_answer_text: 'なさいます',
    context_vi: 'Hỏi sếp xem ngày mai sếp có tham gia cuộc họp không.', context_en: 'Ask your boss if they will attend the meeting tomorrow.',
    sentence_kanji: '社長、明日の会議は＿＿＿＿か。', sentence_hiragana: 'しゃちょう、あしたのかいぎは＿＿＿＿か。'
  },
  {
    id: 14, category: 'special_verbs', speaker: 'self', target_verb: 'する', correct_answer_type: 'kenjougo_2', correct_answer_text: 'いたします',
    context_vi: 'Nói với sếp là mình sẽ chịu trách nhiệm chuẩn bị tài liệu.', context_en: 'Tell your boss that you will handle the document preparation.',
    sentence_kanji: '資料の準備は私が＿＿＿＿。', sentence_hiragana: 'しりょうのじゅんびはわたしが＿＿＿＿。'
  },
  {
    id: 15, category: 'special_verbs', speaker: 'other', target_verb: '会う', correct_answer_type: 'sonkeigo', correct_answer_text: 'お会いになります',
    context_vi: 'Hỏi sếp xem sếp có gặp đối tác vào tuần này không.', context_en: 'Ask your boss if they are meeting the partner this week.',
    sentence_kanji: '今週、田中様にお＿＿＿＿か。', sentence_hiragana: 'こんしゅう、たなかさまにお＿＿＿＿か。'
  },
  {
    id: 16, category: 'special_verbs', speaker: 'self', target_verb: '会う', correct_answer_type: 'kenjougo_1', correct_answer_text: 'お目にかかりました',
    context_vi: 'Nói với khách hàng là mình đã gặp sếp của họ ngày hôm qua.', context_en: 'Tell the customer that you met their boss yesterday.',
    sentence_kanji: '昨日、山田社長にお＿＿＿＿。', sentence_hiragana: 'きのう、やまだしゃちょうにお＿＿＿＿。'
  },
  {
    id: 17, category: 'special_verbs', speaker: 'other', target_verb: '買う', correct_answer_type: 'sonkeigo', correct_answer_text: 'お求めになりました',
    context_vi: 'Hỏi sếp xem chiếc áo khoác sếp đang mặc là mua ở đâu.', context_en: 'Ask your boss where they bought the jacket they are wearing.',
    sentence_kanji: 'そのジャケットはどこで＿＿＿＿か。', sentence_hiragana: 'そのジャケットはどこで＿＿＿＿か。'
  },
  {
    id: 18, category: 'special_verbs', speaker: 'self', target_verb: 'もらう', correct_answer_type: 'kenjougo_1', correct_answer_text: 'いただきました',
    context_vi: 'Nói với sếp là mình đã nhận được email phản hồi từ khách hàng.', context_en: 'Tell your boss that you received a reply email from the customer.',
    sentence_kanji: 'お客様からのメールを＿＿＿＿。', sentence_hiragana: 'おきゃくさまからのメールを＿＿＿＿。'
  },
  {
    id: 19, category: 'special_verbs', speaker: 'other', target_verb: '住んでいる', correct_answer_type: 'sonkeigo', correct_answer_text: 'いらっしゃいます',
    context_vi: 'Hỏi xem gia đình của sếp sống ở đâu.', context_en: 'Ask where your boss family resides.',
    sentence_kanji: 'ご家族はどちらに＿＿＿＿か。', sentence_hiragana: 'ごかぞくはどちらに＿＿＿＿か。'
  },
  {
    id: 20, category: 'special_verbs', speaker: 'self', target_verb: 'いる', correct_answer_type: 'kenjougo_2', correct_answer_text: 'おります',
    context_vi: 'Nói với đối tác là sếp của mình hiện tại không có ở văn phòng.', context_en: 'Tell the partner that your boss is currently not in.',
    sentence_kanji: 'あいにく社長の山田は席を外して＿＿＿＿。', sentence_hiragana: 'あいにくしゃちょうのやまだはせきをはずして＿＿＿＿。'
  },
  {
    id: 21, category: 'special_verbs', speaker: 'other', target_verb: '覚えている', correct_answer_type: 'sonkeigo', correct_answer_text: '覚えていらっしゃいます',
    context_vi: 'Hỏi thầy giáo xem thầy có nhớ sinh viên năm ngoái không.', context_en: 'Ask the teacher if they remember the student from last year.',
    sentence_kanji: '先生、去年の留学生を＿＿＿＿か。', sentence_hiragana: 'せんせい、きょねんのりゅうがくせいを＿＿＿＿か。'
  },
  {
    id: 22, category: 'special_verbs', speaker: 'self', target_verb: 'あげる', correct_answer_type: 'kenjougo_1', correct_answer_text: '差し上げます',
    context_vi: 'Nói với khách hàng là mình sẽ tặng họ một cuốn sách.', context_en: 'Tell the customer that you will give them a book.',
    sentence_kanji: 'パンフレットを＿＿＿＿。', sentence_hiragana: 'パンフレットを＿＿＿＿。'
  },
  {
    id: 23, category: 'special_verbs', speaker: 'other', target_verb: '飲む', correct_answer_type: 'sonkeigo', correct_answer_text: '召し上がります',
    context_vi: 'Hỏi khách hàng xem họ có uống cà phê không.', context_en: 'Ask the customer if they would like to drink some coffee.',
    sentence_kanji: 'コーヒーを＿＿＿＿か。', sentence_hiragana: 'コーヒーを＿＿＿＿か。'
  },
  {
    id: 24, category: 'special_verbs', speaker: 'self', target_verb: 'わかる', correct_answer_type: 'kenjougo_2', correct_answer_text: 'かしこまりました',
    context_vi: 'Nói với giáo sư là mình đã hiểu rõ bài giảng.', context_en: 'Tell the professor that you understood the lecture well.',
    sentence_kanji: '本日の講義の件、よく＿＿＿＿。', sentence_hiragana: 'ほんじつのこうぎのけん、よく＿＿＿＿。'
  },
  {
    id: 25, category: 'special_verbs', speaker: 'other', target_verb: 'くれる', correct_answer_type: 'sonkeigo', correct_answer_text: 'くださいます',
    context_vi: 'Hỏi sếp xem sếp có cho phép mình mượn cuốn sách này không.', context_en: 'Ask your boss if they would kindly give/lend you this book.',
    sentence_kanji: 'この本を私に＿＿＿＿か。', sentence_hiragana: 'このほんをわたしに＿＿＿＿か。'
  },
  {
    id: 26, category: 'special_verbs', speaker: 'self', target_verb: '訪ねる', correct_answer_type: 'kenjougo_1', correct_answer_text: 'お邪魔しました',
    context_vi: 'Nói với sếp là mình đã đến nhà sếp chơi ngày hôm qua.', context_en: 'Tell your boss that you visited their house yesterday.',
    sentence_kanji: '昨日、先生のお宅へ＿＿＿＿。', sentence_hiragana: 'きのう、せんせいのおたくへ＿＿＿＿。'
  },
  {
    id: 27, category: 'special_verbs', speaker: 'other', target_verb: 'ある', correct_answer_type: 'teineigo', correct_answer_text: 'ございますか',
    context_vi: 'Hỏi khách hàng xem họ có câu hỏi hoặc thắc mắc gì không.', context_en: 'Ask the customer if they have any questions.',
    sentence_kanji: '何かご質問は＿＿＿＿か。', sentence_hiragana: 'なにかごしつもんは＿＿＿＿か。'
  },
  {
    id: 28, category: 'special_verbs', speaker: 'self', target_verb: 'ある', correct_answer_type: 'teineigo', correct_answer_text: 'ございます',
    context_vi: 'Nói với khách hàng rằng công ty chúng tôi có dịch vụ hỗ trợ 24/7.', context_en: 'Tell the customer that our company has a 24/7 support service.',
    sentence_kanji: '弊社には24時間サポートが＿＿＿＿。', sentence_hiragana: 'へいしゃには24じかんサポートが＿＿＿＿。'
  },
  {
    id: 29, category: 'special_verbs', speaker: 'other', target_verb: '聞く', correct_answer_type: 'sonkeigo', correct_answer_text: 'お聞きになりますか',
    context_vi: 'Hỏi sếp xem sếp có nghe thấy tiếng chuông điện thoại không.', context_en: 'Ask your boss if they hear the phone ringing.',
    sentence_kanji: '部長、電話の音が＿＿＿＿か。', sentence_hiragana: 'ぶちょう、でんわのおとが＿＿＿＿か。'
  },
  {
    id: 30, category: 'special_verbs', speaker: 'self', target_verb: '聞く', correct_answer_type: 'kenjougo_1', correct_answer_text: '伺いました',
    context_vi: 'Nói với sếp là mình đã nghe câu chuyện từ anh Tanaka rồi.', context_en: 'Tell your boss that you have already heard the story from Mr. Tanaka.',
    sentence_kanji: '田中さんからお話を＿＿＿＿。', sentence_hiragana: 'たなかさんからおはなしを＿＿＿＿。'
  },

  // ── NHÓM 2: QUY TẮC THÔNG THƯỜNG (お～になる / お～する) ──
  {
    id: 41, category: 'normal_rules', speaker: 'other', target_verb: '記入する', correct_answer_type: 'sonkeigo', correct_answer_text: 'ご記入',
    context_vi: 'Mời khách hàng ký tên vào mẫu đơn này.', context_en: 'Ask the customer to sign this form.',
    sentence_kanji: 'こちらに名前を＿＿＿＿ください。', sentence_hiragana: 'こちらになまえを＿＿＿＿ください。'
  },
  {
    id: 42, category: 'normal_rules', speaker: 'self', target_verb: '説明する', correct_answer_type: 'kenjougo_1', correct_answer_text: 'ご説明',
    context_vi: 'Nói với khách hàng là mình sẽ giải thích kỹ về hợp đồng này.', context_en: 'Tell the customer that you will explain the contract details.',
    sentence_kanji: '契約について私から＿＿＿＿いたします。', sentence_hiragana: 'けいやくについてわたしから＿＿＿＿いたします。'
  },
  {
    id: 43, category: 'normal_rules', speaker: 'other', target_verb: '読む', correct_answer_type: 'sonkeigo', correct_answer_text: 'お読み',
    context_vi: 'Hỏi sếp xem sếp đã đọc cuốn sách mà mình tặng chưa.', context_en: 'Ask your boss if they have read the book you gave them.',
    sentence_kanji: 'お渡しした本は、もう＿＿＿＿になりましたか。', sentence_hiragana: 'おわたししたほんは、もう＿＿＿＿になりましたか。'
  },
  {
    id: 44, category: 'normal_rules', speaker: 'self', target_verb: '持つ', correct_answer_type: 'kenjougo_1', correct_answer_text: 'お持ち',
    context_vi: 'Nói với sếp là mình sẽ giúp sếp xách hành lý.', context_en: 'Tell your boss that you will help carry their luggage.',
    sentence_kanji: 'その荷物、私が＿＿＿＿します。', sentence_hiragana: 'そのにもつ、わたしが＿＿＿＿します。'
  },
  {
    id: 45, category: 'normal_rules', speaker: 'other', target_verb: '帰国する', correct_answer_type: 'sonkeigo', correct_answer_text: 'ご帰国',
    context_vi: 'Hỏi sếp xem sếp đã quay trở về nước khi nào.', context_en: 'Ask your boss when they returned to their country.',
    sentence_kanji: '部長はいつ＿＿＿＿になりましたか。', sentence_hiragana: 'ぶちょうはいつ＿＿＿＿になりましたか。'
  },
  {
    id: 46, category: 'normal_rules', speaker: 'self', target_verb: '連絡する', correct_answer_type: 'kenjougo_1', correct_answer_text: 'ご連絡',
    context_vi: 'Nói với sếp là mình sẽ liên lạc lại vào ngày mai.', context_en: 'Tell your boss that you will contact them tomorrow.',
    sentence_kanji: '明日、私から＿＿＿＿いたします。', sentence_hiragana: 'あした、わたしから＿＿＿＿いたします。'
  },
  {
    id: 47, category: 'normal_rules', speaker: 'other', target_verb: '選ぶ', correct_answer_type: 'sonkeigo', correct_answer_text: 'お選び',
    context_vi: 'Hỏi khách hàng xem họ muốn mua loại sản phẩm nào.', context_en: 'Ask the customer which product they would like to choose.',
    sentence_kanji: 'どちらの商品を＿＿＿＿になりますか。', sentence_hiragana: 'どちらのしょうひんを＿＿＿＿になりますか。'
  },
  {
    id: 48, category: 'normal_rules', speaker: 'self', target_verb: '案内する', correct_answer_type: 'kenjougo_1', correct_answer_text: 'ご案内',
    context_vi: 'Nói với đối tác là mình sẽ hướng dẫn họ tham quan nhà máy.', context_en: 'Tell the partner that you will guide them through the factory.',
    sentence_kanji: '工場を＿＿＿＿します。', sentence_hiragana: 'こうじょうを＿＿＿＿します。'
  },
  {
    id: 49, category: 'normal_rules', speaker: 'other', target_verb: '待つ', correct_answer_type: 'sonkeigo', correct_answer_text: 'お待ち',
    context_vi: 'Mời giáo sư ngồi đợi một chút ở phòng chờ.', context_en: 'Invite the professor to wait for a moment in the lounge.',
    sentence_kanji: 'どうぞ、こちらで＿＿＿＿ください。', sentence_hiragana: 'どうぞ、こちらで＿＿＿＿ください。'
  },
  {
    id: 50, category: 'normal_rules', speaker: 'self', target_verb: '確かめる', correct_answer_type: 'kenjougo_1', correct_answer_text: 'お確かめ',
    context_vi: 'Nói với khách hàng là mình sẽ xác nhận thông tin này.', context_en: 'Tell the customer that you will confirm this information.',
    sentence_kanji: 'すぐに内容を＿＿＿＿いたします。', sentence_hiragana: 'すぐにないようを＿＿＿＿いたします。'
  },

  // ── NHÓM 3: THỂ BỊ ĐỘNG & BỐI CẢNH BUSINESS ──
  {
    id: 81, category: 'business_manners', speaker: 'other', target_verb: '吸う', correct_answer_type: 'sonkeigo', correct_answer_text: '吸われます',
    context_vi: 'Hỏi sếp xem sếp có hút thuốc không (Dạng thể bị động).', context_en: 'Ask your boss if they smoke (passive form).',
    sentence_kanji: '部長、タバコは＿＿＿＿か。', sentence_hiragana: 'ぶちょう、タバコは＿＿＿＿か。'
  },
  {
    id: 82, category: 'business_manners', speaker: 'other', target_verb: '帰る', correct_answer_type: 'sonkeigo', correct_answer_text: '帰られます',
    context_vi: 'Hỏi sếp xem mấy giờ sếp sẽ rời văn phòng (Dạng thể bị động).', context_en: 'Ask your boss what time they will leave (passive).',
    sentence_kanji: '今日は何時に＿＿＿＿か。', sentence_hiragana: 'きょうはなんじに＿＿＿＿か。'
  },
  {
    id: 85, category: 'business_manners', speaker: 'self', target_verb: '発表する', correct_answer_type: 'kenjougo_1', correct_answer_text: '発表させて',
    context_vi: 'Nói với sếp là mong sếp cho phép mình thuyết trình.', context_en: 'Ask your boss for permission to let you do the presentation.',
    sentence_kanji: '本日のプレゼンは、私が＿＿＿＿いただきます。', sentence_hiragana: 'ほんじつのプレゼンは、わたしが＿＿＿＿いただきます。'
  },
  {
    id: 88, category: 'business_manners', speaker: 'self', target_verb: '帰る', correct_answer_type: 'kenjougo_2', correct_answer_text: '退社いたしました',
    context_vi: 'Nói với đối tác về hành động của sếp mình (Uchi-Soto: hạ sếp mình xuống).', context_en: 'Tell an external client that your manager Tanaka has left for the day.',
    sentence_kanji: '課長の田中は、本日すでに＿＿＿＿。', sentence_hiragana: 'かちょうのたなかは、ほんじつすでに＿＿＿＿。'
  },
  {
    id: 91, category: 'business_manners', speaker: 'other', target_verb: '待つ', correct_answer_type: 'sonkeigo', correct_answer_text: 'お待ち',
    context_vi: 'Nói với khách hàng qua điện thoại là hãy đợi trong giây lát.', context_en: 'Tell the customer over the phone to hold on.',
    sentence_kanji: '少々＿＿＿＿ください。', sentence_hiragana: 'しょうしょう＿＿＿＿ください。'
  },
  {
    id: 92, category: 'business_manners', speaker: 'other', target_verb: 'ある', correct_answer_type: 'teineigo', correct_answer_text: 'ございますか',
    context_vi: 'Hỏi sếp xem sếp có thời gian rảnh vào chiều nay không.', context_en: 'Ask your boss if they have some free time this afternoon.',
    sentence_kanji: '部長、今日の午後、お時間は＿＿＿＿か。', sentence_hiragana: 'ぶちょう、きょうのごご、おじかんは＿＿＿＿か。'
  },
  {
    id: 96, category: 'business_manners', speaker: 'other', target_verb: '飲む', correct_answer_type: 'sonkeigo', correct_answer_text: '召し上がって',
    context_vi: 'Mời sếp nếm thử món rượu đặc sản của quê hương.', context_en: 'Invite your boss to taste the local sake.',
    sentence_kanji: '私の地元の酒です。どうぞ＿＿＿＿ください。', sentence_hiragana: 'わたしのじもとのさけです。どうぞ＿＿＿＿ください。'
  },
  {
    id: 97, category: 'business_manners', speaker: 'self', target_verb: '待たせる', correct_answer_type: 'kenjougo_1', correct_answer_text: 'お待たせいたしました',
    context_vi: 'Xin lỗi khách hàng vì đã bắt họ chờ lâu.', context_en: 'Apologize to the customer for keeping them waiting.',
    sentence_kanji: '大変＿＿＿＿。', sentence_hiragana: 'たいへん＿＿＿＿。'
  },
  {
    id: 98, category: 'business_manners', speaker: 'other', target_verb: 'する', correct_answer_type: 'sonkeigo', correct_answer_text: 'なさって',
    context_vi: 'Khuyên sếp đừng làm việc quá sức.', context_en: 'Advise your boss not to overwork.',
    sentence_kanji: 'あまり無理を＿＿＿＿くださいね。', sentence_hiragana: 'あまりむりを＿＿＿＿くださいね。'
  },
  {
    id: 99, category: 'business_manners', speaker: 'self', target_verb: '借りる', correct_answer_type: 'kenjougo_1', correct_answer_text: '拝借',
    context_vi: 'Nói với khách hàng là mình sẽ mượn phòng họp của họ một chút.', context_en: 'Tell the customer that you will borrow their meeting room.',
    sentence_kanji: 'こちらの会議室を＿＿＿＿してもよろしいですか。', sentence_hiragana: 'こちらのかいぎしつを＿＿＿＿してもよろしいですか。'
  },
  {
    id: 100, category: 'business_manners', speaker: 'other', target_verb: '言う', correct_answer_type: 'sonkeigo', correct_answer_text: 'おっしゃる',
    context_vi: 'Xác nhận lại ý của khách hàng có phải như vậy không.', context_en: 'Confirm if what the customer said is correct.',
    sentence_kanji: 'お客様の＿＿＿＿通りでございます。', sentence_hiragana: 'おきゃくさまの＿＿＿＿とおりでございます。'
  },
  
  // ── NHÓM 4: TIỀN TỐ お / ご (BIKAGO) ──
  {
    id: 101, category: 'o_go_prefix', speaker: 'other', target_verb: '名前', correct_answer_type: 'bikago', correct_answer_text: 'お名前',
    context_vi: 'Hỏi tên của khách hàng một cách lịch sự.', context_en: 'Politely ask for the customer\'s name.',
    sentence_kanji: '恐れ入りますが、＿＿＿＿を教えていただけますか。', sentence_hiragana: 'おそれいりますが、＿＿＿＿をおしえていただけますか。'
  },
  {
    id: 102, category: 'o_go_prefix', speaker: 'other', target_verb: '連絡', correct_answer_type: 'bikago', correct_answer_text: 'ご連絡',
    context_vi: 'Nói với đối tác hãy liên lạc lại sau.', context_en: 'Tell the partner to contact you later.',
    sentence_kanji: 'また後ほど＿＿＿＿ください。', sentence_hiragana: 'またのちほど＿＿＿＿ください。'
  },
  {
    id: 103, category: 'o_go_prefix', speaker: 'other', target_verb: '家族', correct_answer_type: 'bikago', correct_answer_text: 'ご家族',
    context_vi: 'Hỏi thăm sức khỏe gia đình của sếp.', context_en: 'Ask about the health of your boss\'s family.',
    sentence_kanji: '部長の＿＿＿＿はお元気ですか。', sentence_hiragana: 'ぶちょうの＿＿＿＿はおげんきですか。'
  },
  {
    id: 104, category: 'o_go_prefix', speaker: 'other', target_verb: '仕事', correct_answer_type: 'bikago', correct_answer_text: 'お仕事',
    context_vi: 'Hỏi về công việc của một người mới quen.', context_en: 'Ask about the job of someone you just met.',
    sentence_kanji: '鈴木さんの＿＿＿＿は何ですか。', sentence_hiragana: 'すずきさんの＿＿＿＿はなんですか。'
  },
  {
    id: 105, category: 'o_go_prefix', speaker: 'other', target_verb: '茶', correct_answer_type: 'bikago', correct_answer_text: 'お茶',
    context_vi: 'Mời khách uống trà (từ Hán nhưng là ngoại lệ).', context_en: 'Offer tea to a guest (Kango but exception).',
    sentence_kanji: '温かい＿＿＿＿をどうぞ。', sentence_hiragana: 'あたたかい＿＿＿＿をどうぞ。'
  },
  {
    id: 106, category: 'o_go_prefix', speaker: 'other', target_verb: '電話', correct_answer_type: 'bikago', correct_answer_text: 'お電話',
    context_vi: 'Thông báo có điện thoại gọi đến cho sếp (từ Hán ngoại lệ).', context_en: 'Inform the boss of an incoming phone call (Kango exception).',
    sentence_kanji: '社長、木村様から＿＿＿＿です。', sentence_hiragana: 'しゃちょう、きむらさまから＿＿＿＿です。'
  },
  {
    id: 107, category: 'o_go_prefix', speaker: 'other', target_verb: '質問', correct_answer_type: 'bikago', correct_answer_text: 'ご質問',
    context_vi: 'Hỏi xem khán giả có câu hỏi nào không.', context_en: 'Ask if the audience has any questions.',
    sentence_kanji: '何か＿＿＿＿はございますか。', sentence_hiragana: 'なにか＿＿＿＿はございますか。'
  },
  {
    id: 108, category: 'o_go_prefix', speaker: 'other', target_verb: '説明', correct_answer_type: 'bikago', correct_answer_text: 'ご説明',
    context_vi: 'Mời chuyên gia lên giải thích về dự án.', context_en: 'Invite the expert to explain the project.',
    sentence_kanji: 'それでは、専門家から＿＿＿＿していただきます。', sentence_hiragana: 'それでは、せんもんかから＿＿＿＿していただきます。'
  },
  {
    id: 109, category: 'o_go_prefix', speaker: 'other', target_verb: '時間', correct_answer_type: 'bikago', correct_answer_text: 'お時間',
    context_vi: 'Hỏi xem đối tác có thời gian rảnh không (từ Hán ngoại lệ).', context_en: 'Ask if the partner has free time (Kango exception).',
    sentence_kanji: '今、少々＿＿＿＿よろしいでしょうか。', sentence_hiragana: 'いま、しょうしょう＿＿＿＿よろしいでしょうか。'
  },
  {
    id: 110, category: 'o_go_prefix', speaker: 'other', target_verb: 'ゆっくり', correct_answer_type: 'bikago', correct_answer_text: 'ごゆっくり',
    context_vi: 'Khuyên khách hàng cứ thong thả (từ thuần Nhật ngoại lệ).', context_en: 'Tell the customer to take their time (Wago exception).',
    sentence_kanji: 'どうぞ＿＿＿＿お選びください。', sentence_hiragana: 'どうぞ＿＿＿＿おえらびください。'
  },
  {
    id: 111, category: 'o_go_prefix', speaker: 'other', target_verb: '天気', correct_answer_type: 'bikago', correct_answer_text: 'お天気',
    context_vi: 'Nhận xét về thời tiết hôm nay rất đẹp (từ Hán ngoại lệ mỹ hóa).', context_en: 'Comment on today\'s nice weather (Kango exception for beautification).',
    sentence_kanji: '今日は本当にいい＿＿＿＿ですね。', sentence_hiragana: 'きょうはほんとうにいい＿＿＿＿ですね。'
  },
  {
    id: 112, category: 'o_go_prefix', speaker: 'other', target_verb: '手紙', correct_answer_type: 'bikago', correct_answer_text: 'お手紙',
    context_vi: 'Nói về bức thư nhận được từ khách hàng.', context_en: 'Talk about the letter received from the customer.',
    sentence_kanji: 'お客様から丁寧な＿＿＿＿をいただきました。', sentence_hiragana: 'おきゃくさまからていねいな＿＿＿＿をいただきました。'
  },
  {
    id: 113, category: 'o_go_prefix', speaker: 'other', target_verb: '都合', correct_answer_type: 'bikago', correct_answer_text: 'ご都合',
    context_vi: 'Hỏi xem lịch trình/sự thuận tiện của sếp như thế nào.', context_en: 'Ask about your boss\'s schedule/convenience.',
    sentence_kanji: '来週の火曜日の＿＿＿＿はいかがでしょうか。', sentence_hiragana: 'らいしゅうのかようびの＿＿＿＿はいかがでしょうか。'
  },
  {
    id: 114, category: 'o_go_prefix', speaker: 'other', target_verb: '注文', correct_answer_type: 'bikago', correct_answer_text: 'ご注文',
    context_vi: 'Phục vụ bàn hỏi khách đã chọn được món chưa.', context_en: 'Waiter asks if the customer is ready to order.',
    sentence_kanji: '＿＿＿＿はお決まりでしょうか。', sentence_hiragana: '＿＿＿＿はおきまりでしょうか。'
  },
  {
    id: 115, category: 'o_go_prefix', speaker: 'other', target_verb: '食事', correct_answer_type: 'bikago', correct_answer_text: 'お食事',
    context_vi: 'Hỏi xem khách hàng đã dùng bữa chưa (từ Hán ngoại lệ).', context_en: 'Ask if the customer has had their meal (Kango exception).',
    sentence_kanji: '＿＿＿＿はもうお済みですか。', sentence_hiragana: '＿＿＿＿はもうおすみですか。'
  }
];
