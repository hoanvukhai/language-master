# Mẫu kiểm tra nội dung AI — 27 câu

Ba câu cho mỗi dạng Mondai, lấy ngẫu nhiên từ các ngày khác nhau (seed 27). Mỗi câu ghi: đề, đáp án, bản dịch, từ trọng tâm và ghi chú phương án. Câu nào sai, hãy ghi mã câu vào dòng Ghi chú; sửa trong `imports/jlpt/kokusho-20days/enrichment/src/dayXX.txt` rồi chạy lại compile/apply. Câu đã duyệt xong có thể đổi `enrichmentStatus` thành `"reviewed"`.

## Mondai 1 — Cách đọc Kanji

### Ngày 14 · câu 2 · `kokusho_n2_d14_m1_02`

- **Đề:** 来週父は心臓の[手術]をしなければならない。
- **Phương án:** 1. じゅじゅつ / 2. じゅしゅつ / 3. しゅしゅつ / 4. しゅじゅつ — **đáp án 4**
- **Dịch:** Tuần sau bố tôi phải phẫu thuật tim.
- **Từ trọng tâm:** 手術 (しゅじゅつ) · THỦ THUẬT — phẫu thuật
  - PA 1: じゅじゅつ: 手 đọc しゅ.
  - PA 2: じゅしゅつ: sai cả hai âm.
  - PA 3: しゅしゅつ: 術 đọc じゅつ.
  - PA 4: しゅじゅつ: 手 しゅ + 術 じゅつ.
- **Ghi chú:** 

### Ngày 15 · câu 2 · `kokusho_n2_d15_m1_02`

- **Đề:** 天候が悪く、救助活動は[困難]をきわめた。
- **Phương án:** 1. こんなん / 2. かんなん / 3. そんなん / 4. ろんなん — **đáp án 1**
- **Dịch:** Thời tiết xấu, hoạt động cứu hộ gặp vô cùng khó khăn.
- **Từ trọng tâm:** 困難 (こんなん) · KHỐN NAN — khó khăn
  - PA 1: こんなん: 困 こん + 難 なん.
  - PA 2: かんなん là 艱難 (gian nan); khác chữ.
  - PA 3: そんなん: cách nói thân mật "như thế"; không phải cách đọc.
  - PA 4: ろんなん không phải cách đọc.
- **Ghi chú:** 

### Ngày 20 · câu 3 · `kokusho_n2_d20_m1_03`

- **Đề:** 1日10分でも運動を続ければ、成人病予防に[効果]がある。
- **Phương án:** 1. ごうか / 2. こうか / 3. ぎょうか / 4. きょうか — **đáp án 2**
- **Dịch:** Dù chỉ 10 phút mỗi ngày, nếu duy trì vận động sẽ có hiệu quả phòng bệnh người lớn.
- **Từ trọng tâm:** 効果 (こうか) · HIỆU QUẢ — hiệu quả
  - PA 1: ごうか là 豪華 (xa hoa); khác chữ.
  - PA 2: こうか: 効 こう + 果 か.
  - PA 3: ぎょうか không phải cách đọc.
  - PA 4: きょうか là 強化 (tăng cường); khác chữ.
- **Ghi chú:** 

## Mondai 2 — Viết Kanji

### Ngày 5 · câu 6 · `kokusho_n2_d05_m2_06`

- **Đề:** 中国の青島へのチケットはソウル[けいゆ]だと安くなる。
- **Phương án:** 1. 経由 / 2. 径由 / 3. 系由 / 4. 係由 — **đáp án 1**
- **Dịch:** Vé đi Thanh Đảo, Trung Quốc, nếu quá cảnh ở Seoul thì rẻ hơn.
- **Từ trọng tâm:** 経由 (けいゆ) · KINH DO — đi qua, quá cảnh
  - PA 1: 経由: 経 (KINH, đi qua) + 由 (DO).
  - PA 2: 径 (KÍNH) là đường kính; 径由 không phải từ có thật.
  - PA 3: 系 (HỆ) là hệ thống; 系由 không phải từ có thật.
  - PA 4: 係 (HỆ) là phụ trách; 係由 không phải từ có thật.
- **Ghi chú:** 

### Ngày 9 · câu 6 · `kokusho_n2_d09_m2_06`

- **Đề:** 駅の[かいさつ]を出て、左に行くとカラオケ店がある。
- **Phương án:** 1. 開札 / 2. 改札 / 3. 回札 / 4. 階札 — **đáp án 2**
- **Dịch:** Ra khỏi cổng soát vé ở nhà ga, rẽ trái là có quán karaoke.
- **Từ trọng tâm:** 改札 (かいさつ) · CẢI TRÁT — cổng soát vé
  - PA 1: 開札: mở thầu; không phải cổng soát vé.
  - PA 2: 改札: soát vé.
  - PA 3: 回 (HỒI); 回札 không phải từ có thật.
  - PA 4: 階 (GIAI); 階札 không phải từ có thật.
- **Ghi chú:** 

### Ngày 17 · câu 6 · `kokusho_n2_d17_m2_06`

- **Đề:** チームの[しゅよう]なメンバーがけがをして、大会に不参加となった。
- **Phương án:** 1. 主容 / 2. 主要 / 3. 主用 / 4. 主洋 — **đáp án 2**
- **Dịch:** Thành viên chủ chốt của đội bị thương nên không tham gia giải đấu.
- **Từ trọng tâm:** 主要 (しゅよう) · CHỦ YẾU — chủ chốt
  - PA 1: 容 (DUNG); 主容 không phải từ có thật.
  - PA 2: 主要: chủ yếu.
  - PA 3: 主用 không phải từ thông dụng.
  - PA 4: 洋 (DƯƠNG); 主洋 không phải từ có thật.
- **Ghi chú:** 

## Mondai 3 — Cấu tạo từ (tiền tố, hậu tố)

### Ngày 16 · câu 15 · `kokusho_n2_d16_m3_15`

- **Đề:** この小説は武士の生活を描いた時代（　）だ。
- **Phương án:** 1. 巻 / 2. 級 / 3. 物 / 4. 編 — **đáp án 3**
- **Dịch:** Cuốn tiểu thuyết này là tác phẩm lịch sử miêu tả đời sống của võ sĩ.
- **Dịch trước khi trả lời:** Cuốn tiểu thuyết này là … miêu tả đời sống của võ sĩ.
- **Từ trọng tâm:** 時代物 (じだいもの) · THỜI ĐẠI VẬT — tác phẩm (bối cảnh) lịch sử
  - PA 1: 〜巻: quyển, tập; không chỉ thể loại.
  - PA 2: 〜級: cấp; không hợp.
  - PA 3: 〜物: loại tác phẩm (時代物).
  - PA 4: 〜編: phần, thiên; không hợp.
- **Ghi chú:** 

### Ngày 19 · câu 15 · `kokusho_n2_d19_m3_15`

- **Đề:** 政治家は言葉より実行（　）が大切だろう。
- **Phương án:** 1. 権 / 2. 力 / 3. 性 / 4. 見 — **đáp án 2**
- **Dịch:** Với chính trị gia, năng lực thực hiện quan trọng hơn lời nói.
- **Dịch trước khi trả lời:** Với chính trị gia, … quan trọng hơn lời nói.
- **Từ trọng tâm:** 実行力 (じっこうりょく) · THỰC HÀNH LỰC — năng lực thực hiện
  - PA 1: 〜権: quyền; 実行権 không hợp.
  - PA 2: 〜力: năng lực (実行力).
  - PA 3: 〜性: tính; 実行性 không thông dụng.
  - PA 4: 〜見 không làm hậu tố như vậy.
- **Ghi chú:** 

### Ngày 20 · câu 15 · `kokusho_n2_d20_m3_15`

- **Đề:** 病気の問題を一般（　）で片づけることはできない。
- **Phương án:** 1. 性 / 2. 論 / 3. 化 / 4. 風 — **đáp án 2**
- **Dịch:** Không thể giải quyết vấn đề bệnh tật chỉ bằng lý thuyết chung chung.
- **Dịch trước khi trả lời:** Không thể giải quyết vấn đề bệnh tật chỉ bằng … .
- **Từ trọng tâm:** 一般論 (いっぱんろん) · NHẤT BAN LUẬN — lý luận chung chung
  - PA 1: 一般性: tính phổ biến; không hợp で片づける.
  - PA 2: 一般論: lý luận chung chung.
  - PA 3: 一般化: khái quát hóa; không đi với で片づける.
  - PA 4: 〜風: phong cách; không hợp.
- **Ghi chú:** 

## Mondai 4 — Điền từ theo ngữ cảnh

### Ngày 2 · câu 18 · `kokusho_n2_d02_m4_18`

- **Đề:** 舞台の上手から（　）したのが沖縄出身の有名な俳優だ。
- **Phương án:** 1. 歩道 / 2. 登場 / 3. 発見 / 4. 流行 — **đáp án 2**
- **Dịch:** Người xuất hiện từ phía bên phải sân khấu là một diễn viên nổi tiếng người Okinawa.
- **Dịch trước khi trả lời:** Người … từ phía bên phải sân khấu là một diễn viên nổi tiếng người Okinawa.
- **Từ trọng tâm:** 登場 (とうじょう) · ĐĂNG TRƯỜNG — xuất hiện (trên sân khấu)
  - PA 1: 歩道: vỉa hè; là danh từ, không thêm する.
  - PA 2: 登場する: xuất hiện, ra sân khấu.
  - PA 3: 発見する: phát hiện; không dùng cho diễn viên ra sân khấu.
  - PA 4: 流行する: thịnh hành; không hợp nghĩa.
- **Ghi chú:** 

### Ngày 10 · câu 22 · `kokusho_n2_d10_m4_22`

- **Đề:** ここの浜辺は（　）的に造られたものだ。
- **Phương án:** 1. 人造 / 2. 加工 / 3. 建造 / 4. 人工 — **đáp án 4**
- **Dịch:** Bãi biển ở đây là do con người tạo ra.
- **Dịch trước khi trả lời:** Bãi biển ở đây được tạo ra một cách … .
- **Từ trọng tâm:** 人工 (じんこう) · NHÂN CÔNG — nhân tạo
  - PA 1: 人造的 không phải từ thông dụng; 人造 bổ nghĩa trực tiếp (人造湖).
  - PA 2: 加工的 không phải từ thông dụng.
  - PA 3: 建造的 không phải từ thông dụng.
  - PA 4: 人工的: một cách nhân tạo.
- **Ghi chú:** 

### Ngày 13 · câu 16 · `kokusho_n2_d13_m4_16`

- **Đề:** この果物は（　）ハウスで栽培している。
- **Phương án:** 1. ストーブ / 2. ビニール / 3. シャワー / 4. ビタミン — **đáp án 2**
- **Dịch:** Loại trái cây này được trồng trong nhà kính phủ nhựa.
- **Dịch trước khi trả lời:** Loại trái cây này được trồng trong … .
- **Từ trọng tâm:** ビニールハウス (ビニールハウス) — nhà kính phủ nhựa
  - PA 1: ストーブ: lò sưởi; không tạo từ chỉ nhà trồng cây.
  - PA 2: ビニールハウス: nhà kính phủ nhựa.
  - PA 3: シャワー: vòi sen; không hợp.
  - PA 4: ビタミン: vitamin; không hợp.
- **Ghi chú:** 

## Mondai 5 — Từ đồng nghĩa

### Ngày 7 · câu 26 · `kokusho_n2_d07_m5_26`

- **Đề:** 留学生のパーティーは[うちとけた]雰囲気だった。
- **Phương án:** 1. 目立った / 2. 親しんだ / 3. 澄んだ / 4. 乱れた — **đáp án 2**
- **Dịch:** Bữa tiệc của du học sinh có bầu không khí thân mật.
- **Từ trọng tâm:** 打ち解ける (うちとける) · ĐẢ GIẢI — cởi mở, thân mật
  - PA 1: 目立った: nổi bật; khác nghĩa.
  - PA 2: 親しんだ: thân thiết.
  - PA 3: 澄んだ: trong trẻo; dùng cho nước, âm thanh.
  - PA 4: 乱れた: hỗn loạn; ngược nghĩa.
- **Ghi chú:** 

### Ngày 15 · câu 27 · `kokusho_n2_d15_m5_27`

- **Đề:** 今月は2回の祝日、[つまり]「文化の日」と「勤労感謝の日」がある。
- **Phương án:** 1. だいいち / 2. 結局 / 3. すなわち / 4. もちろん — **đáp án 3**
- **Dịch:** Tháng này có 2 ngày lễ, tức là "Ngày Văn hóa" và "Ngày Cảm tạ Lao động".
- **Từ trọng tâm:** つまり (つまり) — tức là
  - PA 1: だいいち: trước hết; khác nghĩa.
  - PA 2: 結局: rốt cuộc; khác nghĩa.
  - PA 3: すなわち: tức là.
  - PA 4: もちろん: dĩ nhiên; khác nghĩa.
- **Ghi chú:** 

### Ngày 19 · câu 27 · `kokusho_n2_d19_m5_27`

- **Đề:** 先生が質問すると、学生たちは[そろって]手をあげた。
- **Phương án:** 1. すぐに / 2. いっせいに / 3. はっきり / 4. 急に — **đáp án 2**
- **Dịch:** Thầy hỏi thì các học sinh đồng loạt giơ tay.
- **Từ trọng tâm:** 揃う (そろう) · TIỄN — đồng loạt, cùng nhau
  - PA 1: すぐに: ngay lập tức; không nhấn "cùng lúc".
  - PA 2: いっせいに: đồng loạt.
  - PA 3: はっきり: rõ ràng; khác nghĩa.
  - PA 4: 急に: đột ngột; khác nghĩa.
- **Ghi chú:** 

## Mondai 6 — Cách dùng từ

### Ngày 2 · câu 28 · `kokusho_n2_d02_m6_28`

- **Đề:** 皮肉
- **Phương án:** 1. 誕生日に試験に落ちるとは、なんて[皮肉]なんだ。 / 2. 彼はお酒を飲むと、1人で[皮肉]を言うくせがある。 / 3. レインコートを着ていたのに、[皮肉]にも雨が降った。 / 4. 彼女はいつも[皮肉]だから、友だちが少ない。 — **đáp án 1**
- **Dịch:** Thi trượt đúng vào ngày sinh nhật, thật là trớ trêu.
- **Từ trọng tâm:** 皮肉 (ひにく) · BÌ NHỤC — trớ trêu; mỉa mai
  - PA 1: なんて皮肉: thật trớ trêu, sự việc trái ngược mong muốn.
  - PA 2: 皮肉を言う (nói mỉa) đúng, nhưng "say rượu rồi nói một mình" không phải nói mỉa ai.
  - PA 3: Mặc áo mưa mà trời mưa là may; 皮肉にも cần kết quả trái ý.
  - PA 4: Tính hay mỉa mai dùng 皮肉屋, không nói người "là 皮肉".
- **Ghi chú:** 

### Ngày 4 · câu 30 · `kokusho_n2_d04_m6_30`

- **Đề:** いよいよ
- **Phương án:** 1. 私の祖父は元気で、[いよいよ]の日々を送っている。 / 2. そんなに1人で[いよいよ]先に行かないでください。 / 3. 待ち望まれていた図書館が[いよいよ]来週完成する。 / 4. かわいがっていた小鳥が昨日[いよいよ]死んでしまった。 — **đáp án 3**
- **Dịch:** Thư viện được mong chờ cuối cùng sẽ hoàn thành vào tuần sau.
- **Từ trọng tâm:** いよいよ (いよいよ) — cuối cùng thì (thời điểm mong chờ)
  - PA 1: いよいよ không làm danh từ bổ nghĩa cho 日々.
  - PA 2: Đi trước một mình dùng どんどん; いよいよ không hợp.
  - PA 3: いよいよ完成する: cuối cùng sắp hoàn thành.
  - PA 4: Chết đột ngột dùng とうとう・ついに; いよいよ chỉ điều sắp đến.
- **Ghi chú:** 

### Ngày 19 · câu 29 · `kokusho_n2_d19_m6_29`

- **Đề:** 物音
- **Phương án:** 1. 庭で大きな[物音]がしたが、変わった様子はなかった。 / 2. 遠くから雷の[物音]がするので、雨が降るかもしれない。 / 3. 彼の仕事はピアノの[物音]を調整することだそうだ。 / 4. となりで娘が勉強しているので、テレビの[物音]を小さくした。 — **đáp án 1**
- **Dịch:** Ngoài vườn có tiếng động lớn, nhưng không thấy gì khác thường.
- **Từ trọng tâm:** 物音 (ものおと) · VẬT ÂM — tiếng động
  - PA 1: 物音がした: có tiếng động (không rõ nguồn).
  - PA 2: Tiếng sấm dùng 雷の音・雷鳴.
  - PA 3: Âm đàn piano dùng ピアノの音.
  - PA 4: Tiếng tivi dùng テレビの音.
- **Ghi chú:** 

## Mondai 7 — Chọn mẫu ngữ pháp

### Ngày 8 · câu 34 · `kokusho_n2_d08_m7_34`

- **Đề:** 日本文化は武士道を（　）語れない。
- **Phương án:** 1. のみならず / 2. ぬきにしては / 3. かまわず / 4. めぐって — **đáp án 2**
- **Dịch:** Không thể nói về văn hóa Nhật mà bỏ qua võ sĩ đạo.
- **Dịch trước khi trả lời:** Không thể nói về văn hóa Nhật … võ sĩ đạo.
  - PA 1: のみならず: không chỉ; không hợp với 語れない.
  - PA 2: Nをぬきにしては〜ない: bỏ qua N thì không thể.
  - PA 3: かまわず: bất chấp; không hợp.
  - PA 4: めぐって: xoay quanh; không hợp.
- **Ghi chú:** 

### Ngày 11 · câu 40 · `kokusho_n2_d11_m7_40`

- **Đề:** 温暖化が進んでいるからといって、雪が（　）。
- **Phương án:** 1. 降るわけではない / 2. 降らないわけはない / 3. 降るわけではないだろう / 4. 降らないわけではない — **đáp án 4**
- **Dịch:** Dù trái đất đang nóng lên, không phải là sẽ không có tuyết rơi.
- **Dịch trước khi trả lời:** Dù trái đất đang nóng lên, … .
  - PA 1: 降るわけではない: không phải sẽ có tuyết; ngược ý.
  - PA 2: 降らないわけはない: chắc chắn có tuyết; quá mạnh.
  - PA 3: 降るわけではないだろう: ngược ý.
  - PA 4: 降らないわけではない: không phải là không có tuyết.
- **Ghi chú:** 

### Ngày 20 · câu 35 · `kokusho_n2_d20_m7_35`

- **Đề:** あの男ならそんなうそはつき（　）。
- **Phương án:** 1. かねる / 2. かねない / 3. かける / 4. かけない — **đáp án 2**
- **Dịch:** Gã đó thì có thể nói dối như thế lắm.
- **Dịch trước khi trả lời:** Gã đó thì … nói dối như thế.
  - PA 1: かねる: khó mà; ngược nghĩa.
  - PA 2: Vかねない: có thể (điều xấu) xảy ra.
  - PA 3: かける: dở dang; không hợp.
  - PA 4: かけない sai dạng.
- **Ghi chú:** 

## Mondai 8 — Sắp xếp câu (★)

### Ngày 3 · câu 48 · `kokusho_n2_d03_m8_48`

- **Đề:** 住民たちの強い ____ ____ ★ ____ を植えた。
- **Phương án:** 1. 要望 / 2. 桜の木 / 3. に応じて / 4. 公園に — **đáp án 4**
- **Dịch:** Đáp ứng mong muốn mạnh mẽ của cư dân, người ta đã trồng cây anh đào trong công viên.
  - PA 1: 要望 nối ngay sau 強い.
  - PA 2: 桜の木 đứng cuối, trước を植えた.
  - PA 3: に応じて đi sau 要望.
  - PA 4: 公園に đứng ở ô ★, chỉ nơi trồng.
- **Ghi chú:** 

### Ngày 7 · câu 49 · `kokusho_n2_d07_m8_49`

- **Đề:** 彼は ____ ____ ★ ____ まい。
- **Phương án:** 1. やさしい人だから / 2. する / 3. そんなことは / 4. まじめで — **đáp án 3**
- **Dịch:** Anh ấy là người nghiêm túc, tốt bụng nên chắc sẽ không làm chuyện đó.
  - PA 1: やさしい人だから đi sau まじめで.
  - PA 2: する đứng cuối, trước まい.
  - PA 3: そんなことは đứng ở ô ★.
  - PA 4: まじめで nối ngay sau 彼は.
- **Ghi chú:** 

### Ngày 17 · câu 48 · `kokusho_n2_d17_m8_48`

- **Đề:** 親友が止める ____ ____ ★ ____ へ入っていった。
- **Phương án:** 1. のもかまわず / 2. ジャングルの / 3. 彼は1人で / 4. 中 — **đáp án 2**
- **Dịch:** Bất chấp người bạn thân ngăn cản, anh ấy một mình đi vào giữa rừng rậm.
  - PA 1: のもかまわず nối ngay sau 止める.
  - PA 2: ジャングルの đứng ở ô ★.
  - PA 3: 彼は1人で đi sau のもかまわず.
  - PA 4: 中 đứng cuối, trước へ.
- **Ghi chú:** 

## Mondai 9 — Điền ngữ pháp vào đoạn văn

### Ngày 5 · câu 50 · `kokusho_n2_d05_m9_50`

- **Đề:** [[50]]
- **Phương án:** 1. 泣きながら / 2. 泣いたら / 3. 泣けば / 4. 泣くなら — **đáp án 1**
- **Dịch:** Tuyển thủ Kim Yu-na, người giành huy chương trượt băng nghệ thuật nữ, vừa khóc vừa vẫy tay khi kết thúc bài thi tự do.
- **Dịch trước khi trả lời:** Tuyển thủ Kim Yu-na, người giành huy chương trượt băng nghệ thuật nữ, … vẫy tay khi kết thúc bài thi tự do.
  - PA 1: Vながら: vừa… vừa (cùng lúc).
  - PA 2: たら: nếu, khi; không hợp hành động đồng thời.
  - PA 3: ば: điều kiện; không hợp.
  - PA 4: なら: nếu; không hợp.
- **Ghi chú:** 

### Ngày 8 · câu 50 · `kokusho_n2_d08_m9_50`

- **Đề:** [[50]]
- **Phương án:** 1. は / 2. が / 3. に / 4. で — **đáp án 3**
- **Dịch:** Theo chuyên gia, tế bào da của trẻ sơ sinh 80% là nước, nhưng ở phụ nữ cao tuổi chỉ còn khoảng 50%.
- **Dịch trước khi trả lời:** … chuyên gia, tế bào da của trẻ sơ sinh 80% là nước, nhưng ở phụ nữ cao tuổi chỉ còn khoảng 50%.
  - PA 1: は không tạo mẫu trích nguồn với よれば.
  - PA 2: が không đi với よれば.
  - PA 3: Nによれば: theo N.
  - PA 4: で không đi với よれば.
- **Ghi chú:** 

### Ngày 13 · câu 54 · `kokusho_n2_d13_m9_54`

- **Đề:** [[54]]
- **Phương án:** 1. どこへ通じている / 2. どこか通じない / 3. どこへ通じる / 4. どこかへ通じている — **đáp án 4**
- **Dịch:** Con đường nào cũng dẫn đến một nơi nào đó.
- **Dịch trước khi trả lời:** Con đường nào cũng … .
  - PA 1: どこへ通じている: thành câu hỏi "dẫn đi đâu"; không hợp.
  - PA 2: どこか通じない: không dẫn tới đâu; ngược ý.
  - PA 3: どこへ通じる: câu hỏi; không hợp.
  - PA 4: どこかへ通じている: dẫn tới một nơi nào đó.
- **Ghi chú:** 
