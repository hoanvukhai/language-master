import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Headphones,
  Layers,
  Sparkles,
  Trophy,
} from "lucide-react";

const upcomingLanguages = [
  {
    code: "en",
    flag: "🇬🇧",
    name: "English · Tiếng Anh",
    exams: "TOEIC · IELTS Academic & General",
    desc: "Ngân hàng đề luyện Reading, Listening, Use of English & Từ vựng học thuật theo chuẩn quốc tế.",
    skills: ["Reading", "Listening", "Grammar & Vocab", "Mock Test"],
    badge: "Đang phát triển",
  },
  {
    code: "zh",
    flag: "🇨🇳",
    name: "中文 · Tiếng Trung",
    exams: "HSK 1 – HSK 6 & HSKK",
    desc: "Hệ thống đề luyện Nghe hiểu, Đọc hiểu, Viết câu Hán tự và từ vựng trọng tâm theo khung HSK mới.",
    skills: ["听力 · Nghe", "阅读 · Đọc", "书写 · Viết", "Từ vựng HSK"],
    badge: "Đang phát triển",
  },
  {
    code: "ko",
    flag: "🇰🇷",
    name: "한국어 · Tiếng Hàn",
    exams: "TOPIK I & TOPIK II (Cấp 1 – 6)",
    desc: "Kho đề luyện Từ vựng, Ngữ pháp, Đọc hiểu và Nghe hiểu bám sát cấu trúc đề thi TOPIK chính thức.",
    skills: ["어휘 · Từ vựng", "문법 · Ngữ pháp", "읽기 · Đọc", "듣기 · Nghe"],
    badge: "Đang phát triển",
  },
];

export default function ExamLanguageHub() {
  return (
    <div className="exam-shell space-y-8">
      {/* Hero Banner */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider border border-white/20">
            <GraduationCap size={15} />
            <span>Trung tâm Luyện đề & Khảo thí Đa Ngôn Ngữ</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Bạn muốn luyện ngôn ngữ nào?
          </h1>
          <p className="text-indigo-100 text-base sm:text-lg leading-relaxed">
            Chọn tài liệu, luyện theo dạng hoặc thi thử bấm giờ với bộ công cụ
            tra từ đa sách tích hợp trực tiếp. Không cần đăng nhập.
          </p>
          <div className="flex flex-wrap gap-3 pt-1 text-xs font-bold text-indigo-100">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
              <Trophy size={14} className="text-amber-300" />
              <span>Thi thử chuẩn cấu trúc đề</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
              <Layers size={14} className="text-emerald-300" />
              <span>Ôn tự do theo từng dạng (Mondai)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
              <Sparkles size={14} className="text-sky-300" />
              <span>Bôi đen tra từ & dịch câu tức thì</span>
            </span>
          </div>
        </div>
      </header>

      {/* Grid 4 Ngôn Ngữ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Tiếng Nhật JLPT (Active) */}
        <section className="exam-card relative overflow-hidden border-2 border-indigo-500/80 dark:border-indigo-500/70 bg-gradient-to-br from-white via-indigo-50/20 to-violet-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-indigo-950/30 flex flex-col justify-between gap-6 shadow-md">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shadow-indigo-500/25">
                  🇯🇵
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      日本語 · Tiếng Nhật
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700">
                      Hiện có N2 · N5–N1 đang mở rộng
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Kỳ thi Năng lực Nhật ngữ JLPT · 1.080+ câu hỏi đã số hóa
                  </p>
                </div>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Bài luyện JLPT theo sách: chữ, từ vựng và ngữ pháp. Hỗ trợ cả 3
              chế độ: Thi thử đề chuẩn ngẫu nhiên 54 câu, Ôn tập tự do chữa từng
              câu ngay, và Học theo từng bài ngày trong sách.
            </p>

            {/* Skill Status Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-start gap-2.5">
                <CheckCircle2
                  size={16}
                  className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Chữ Hán · Từ vựng · Ngữ pháp
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Mondai 1 – 9 · Đang hoạt động (1.080 câu)
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-800/40 flex items-start gap-2.5">
                <Headphones
                  size={16}
                  className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Đọc hiểu (読解) & Nghe hiểu (聴解)
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                    Đang phát triển · Sắp cập nhật
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <BookOpen size={14} className="text-indigo-500" />
              <span>20 Ngày · Đủ đáp án, lời giải & đối chiếu bản gốc</span>
            </div>
            <Link className="exam-primary" to="/exams/jlpt">
              <span>Vào kho JLPT →</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        {/* Cards 2, 3, 4: English, Chinese, Korean (In Development) */}
        {upcomingLanguages.map((lang) => (
          <section
            key={lang.code}
            className="exam-card flex flex-col justify-between gap-5 bg-slate-50/70 dark:bg-slate-800/60 border-dashed border-slate-300 dark:border-slate-700 opacity-95"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-2xl">
                    {lang.flag}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {lang.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                        <Clock size={12} />
                        <span>{lang.badge}</span>
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang.exams}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {lang.desc}
              </p>

              <div className="flex flex-wrap gap-2">
                {lang.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Đang biên soạn & chuẩn hóa ngân hàng câu hỏi
              </span>
              <button
                type="button"
                disabled
                className="exam-secondary !min-h-9 text-xs"
              >
                Đang phát triển
              </button>
            </div>
          </section>
        ))}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        Các ngôn ngữ khác sẽ được bổ sung khi có nội dung.
      </p>
    </div>
  );
}
