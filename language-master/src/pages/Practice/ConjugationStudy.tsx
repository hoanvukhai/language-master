// src/pages/Practice/ConjugationStudy.tsx
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Gamepad2 } from 'lucide-react';
import { useSettings } from '../../context/global/useSettings';
import { motion } from 'framer-motion';

export default function ConjugationStudy() {
  const { language } = useSettings();
  const lang = (language ?? 'vi') as 'vi' | 'en';

  const t = {
    vi: {
      title: 'Học Chia Thể (Từ Vます)',
      desc: 'Tổng hợp quy tắc chia 11 thể động từ cơ bản trong tiếng Nhật theo giáo trình Minna no Nihongo.',
    },
    en: {
      title: 'Conjugation Rules (From V-masu)',
      desc: 'Summary of 11 basic verb conjugation rules in Japanese based on Minna no Nihongo.',
    }
  }[lang];

  const forms = [
    {
      id: 'jisho',
      name: '1. Thể Từ điển (Jisho)',
      usage: 'Dùng trong câu thông thường, trước danh từ hoặc các mẫu ngữ pháp (thường, tsumori, koto ga dekiru...)',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [う]',
      group1Ex: 'かきます ➔ かく',
      group2: 'Bỏ ます, thêm る',
      group2Ex: 'たべます ➔ たべる',
      group3: 'します ➔ する, きます ➔ くる',
    },
    {
      id: 'nai',
      name: '2. Thể Phủ định (Nai)',
      usage: 'Diễn tả ý phủ định trong câu thông thường, hoặc dùng trong mẫu (nakereba narimasen, naide kudasai...)',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [あ] + ない. (Ngoại lệ: chữ い ➔ わ + ない)',
      group1Ex: 'かきます ➔ かかない | かいます ➔ かわない',
      group2: 'Bỏ ます, thêm ない',
      group2Ex: 'たべます ➔ たべない',
      group3: 'します ➔ しない, きます ➔ こない',
    },
    {
      id: 'te-ta',
      name: '3. Thể Te (て) & Thể Quá khứ (た)',
      usage: 'Nối câu, sai khiến (Te) hoặc diễn tả việc đã xảy ra (Ta).',
      isTable: true,
      group1: '', // Rỗng vì dùng bảng
      group1Ex: '',
      group2: 'Bỏ ます, thêm て / た',
      group2Ex: 'たべます ➔ たべて / たべた',
      group3: 'します ➔ して / した, きます ➔ きて / きた',
    },
    {
      id: 'ikoh',
      name: '4. Thể Ý chí (Ikoh)',
      usage: 'Mời rủ, rủ rê (giống ~mashou) hoặc định làm gì (to omoimasu).',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [お] + う',
      group1Ex: 'かきます ➔ かこう',
      group2: 'Bỏ ます, thêm よう',
      group2Ex: 'たべます ➔ たべよう',
      group3: 'します ➔ しよう, きます ➔ こよう',
    },
    {
      id: 'ba',
      name: '5. Thể Điều kiện (Ba)',
      usage: 'Diễn tả điều kiện "Nếu... thì".',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [え] + ば',
      group1Ex: 'かきます ➔ かけば',
      group2: 'Bỏ ます, thêm れば',
      group2Ex: 'たべます ➔ たべれば',
      group3: 'します ➔ すれば, きます ➔ くれば',
    },
    {
      id: 'kanou',
      name: '6. Thể Khả năng (Kanou)',
      usage: 'Diễn tả khả năng "Có thể làm gì". Trợ từ を chuyển thành が.',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [え] + る',
      group1Ex: 'かきます ➔ かける',
      group2: 'Bỏ ます, thêm られる',
      group2Ex: 'たべます ➔ たべられる',
      group3: 'します ➔ できる, きます ➔ こられる',
    },
    {
      id: 'ukemi',
      name: '7. Thể Bị động (Ukemi)',
      usage: 'Diễn tả hành động bị tác động bởi người khác "Bị / Được".',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [あ] + れる',
      group1Ex: 'かきます ➔ かかれる',
      group2: 'Bỏ ます, thêm られる',
      group2Ex: 'たべます ➔ たべられる',
      group3: 'します ➔ される, きます ➔ こられる',
    },
    {
      id: 'shieki',
      name: '8. Thể Sai khiến (Shieki)',
      usage: 'Diễn tả việc bắt buộc hoặc cho phép ai đó làm gì "Bắt / Cho phép".',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [あ] + せる',
      group1Ex: 'かきます ➔ かかせる',
      group2: 'Bỏ ます, thêm させる',
      group2Ex: 'たべます ➔ たべさせる',
      group3: 'します ➔ させる, きます ➔ こさせる',
    },
    {
      id: 'shieki-ukemi',
      name: '9. Thể Bị động Sai khiến (Shieki-Ukemi)',
      usage: 'Diễn tả việc "Bị bắt phải làm gì" (Thường mang sắc thái khó chịu).',
      group1: 'Bỏ ます, cột [い] ➔ cột [あ] + せられる (thường rút gọn thành される trừ chữ し)',
      group1Ex: 'かきます ➔ かかされる (rút gọn) | はなします ➔ はなさせられる',
      group2: 'Bỏ ます, thêm させられる',
      group2Ex: 'たべます ➔ たべさせられる',
      group3: 'します ➔ させられる, きます ➔ こさせられる',
    },
    {
      id: 'meirei',
      name: '10. Thể Mệnh lệnh (Meirei)',
      usage: 'Dùng để ra lệnh một cách mạnh mẽ (thường dùng ở nam giới hoặc trong quân đội, nguy hiểm).',
      group1: 'Bỏ ます, chuyển cột [い] ➔ cột [え]',
      group1Ex: 'かきます ➔ かけ',
      group2: 'Bỏ ます, thêm ろ',
      group2Ex: 'たべます ➔ たべろ',
      group3: 'します ➔ しろ, きます ➔ こい',
    },
    {
      id: 'kinshi',
      name: '11. Thể Cấm chỉ (Kinshi)',
      usage: 'Ra lệnh cấm không được làm gì "Cấm / Không được".',
      group1: 'Thể Từ điển (Jisho) + な',
      group1Ex: 'かく ➔ かくな',
      group2: 'Thể Từ điển (Jisho) + な',
      group2Ex: 'たべる ➔ たべるな',
      group3: 'Thể Từ điển (Jisho) + な',
      group3Ex: 'する ➔ するな, くる ➔ くるな',
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            <Link to="/course/verb-conjugation" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-4 transition-colors font-medium">
              <ArrowLeft size={18} /> Quay lại Học Tập
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <BookOpen className="text-blue-500" /> {t.title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">{t.desc}</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-3">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-full font-medium text-sm shadow-sm">
              11 thể chính
            </div>
            <Link 
              to="/practice/conjugation" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <Gamepad2 size={16} />
              Thực hành ngay
            </Link>
          </div>
        </header>

        {/* Khung giới thiệu 3 nhóm */}
        <section className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 border-l-4 border-blue-500 pl-3">Nhận biết 3 nhóm động từ (Dựa vào ~ます)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="font-bold text-blue-700 dark:text-blue-400 mb-2">Nhóm 1</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Trước ~ます là chữ cái thuộc cột <strong className="text-blue-600">い</strong>.</p>
              <div className="mt-2 text-xs text-slate-500 font-mono">Ví dụ: かきます, のみます, あそびます</div>
            </div>
            <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl border border-teal-100 dark:border-teal-900/30">
              <div className="font-bold text-teal-700 dark:text-teal-400 mb-2">Nhóm 2</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Trước ~ます là chữ cái thuộc cột <strong className="text-teal-600">え</strong> (hoặc 1 chữ Hán + ます). Ngoài ra có một số từ đặc biệt cột い.</p>
              <div className="mt-2 text-xs text-slate-500 font-mono">Ví dụ: たべます, ねます, みます (ĐB)</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <div className="font-bold text-rose-700 dark:text-rose-400 mb-2">Nhóm 3</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Gồm động từ <strong>します</strong> (làm), <strong>きます</strong> (đến) và Danh động từ (N + します).</p>
              <div className="mt-2 text-xs text-slate-500 font-mono">Ví dụ: べんきょうします</div>
            </div>
          </div>
        </section>

        {/* Danh sách 11 Thể */}
        <div className="space-y-6">
          {forms.map((form) => (
            <motion.section 
              key={form.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-slate-100 dark:bg-slate-900/80 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{form.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{form.usage}</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Nhóm 1 */}
                  <div className="md:col-span-3">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold px-3 py-1 rounded text-sm whitespace-nowrap">Nhóm 1</div>
                      <div className="flex-1">
                        {form.isTable ? (
                          <div className="overflow-x-auto w-full">
                            <table className="w-full text-sm text-left border-collapse mt-2">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                                  <th className="py-2 pr-4 font-normal">Trước ~ます</th>
                                  <th className="py-2 px-4 font-normal">Đổi thành Thể Te / Ta</th>
                                  <th className="py-2 pl-4 font-normal">Ví dụ</th>
                                </tr>
                              </thead>
                              <tbody className="text-slate-700 dark:text-slate-300 font-mono">
                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                  <td className="py-2 pr-4 font-bold text-blue-600 dark:text-blue-400">い、ち、り</td>
                                  <td className="py-2 px-4">➔ って / った</td>
                                  <td className="py-2 pl-4">か<span className="text-rose-500">い</span>ます ➔ か<span className="text-blue-500">って</span></td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                  <td className="py-2 pr-4 font-bold text-blue-600 dark:text-blue-400">み、び、に</td>
                                  <td className="py-2 px-4">➔ んで / んだ</td>
                                  <td className="py-2 pl-4">の<span className="text-rose-500">み</span>ます ➔ の<span className="text-blue-500">んで</span></td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                  <td className="py-2 pr-4 font-bold text-blue-600 dark:text-blue-400">き</td>
                                  <td className="py-2 px-4">➔ いて / いた <span className="text-xs text-rose-500 ml-2 block sm:inline">(Ngoại lệ: 行きます ➔ 行って)</span></td>
                                  <td className="py-2 pl-4">か<span className="text-rose-500">き</span>ます ➔ か<span className="text-blue-500">いて</span></td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                  <td className="py-2 pr-4 font-bold text-blue-600 dark:text-blue-400">ぎ</td>
                                  <td className="py-2 px-4">➔ いで / いだ</td>
                                  <td className="py-2 pl-4">およ<span className="text-rose-500">ぎ</span>ます ➔ およ<span className="text-blue-500">いで</span></td>
                                </tr>
                                <tr>
                                  <td className="py-2 pr-4 font-bold text-blue-600 dark:text-blue-400">し</td>
                                  <td className="py-2 px-4">➔ して / した</td>
                                  <td className="py-2 pl-4">はな<span className="text-rose-500">し</span>ます ➔ はな<span className="text-blue-500">して</span></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <>
                            <p className="text-slate-800 dark:text-slate-200 font-medium">{form.group1}</p>
                            <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-2">{form.group1Ex}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nhóm 2 */}
                  <div className="md:col-span-3">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start bg-teal-50/50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100 dark:border-teal-900/30">
                      <div className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-bold px-3 py-1 rounded text-sm whitespace-nowrap">Nhóm 2</div>
                      <div className="flex-1">
                        <p className="text-slate-800 dark:text-slate-200 font-medium">{form.group2}</p>
                        <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-2">{form.group2Ex}</p>
                      </div>
                    </div>
                  </div>

                  {/* Nhóm 3 */}
                  <div className="md:col-span-3">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
                      <div className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold px-3 py-1 rounded text-sm whitespace-nowrap">Nhóm 3</div>
                      <div className="flex-1">
                        <p className="text-slate-800 dark:text-slate-200 font-medium">{form.group3}</p>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  );
}
