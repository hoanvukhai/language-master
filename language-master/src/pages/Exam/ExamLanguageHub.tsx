import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Headphones } from "lucide-react";

const upcomingLanguages = [
  {
    code: "en",
    flag: "🇬🇧",
    name: "English · Tiếng Anh",
    exams: "TOEIC · IELTS Academic & General",
  },
  {
    code: "zh",
    flag: "🇨🇳",
    name: "中文 · Tiếng Trung",
    exams: "HSK 1 – HSK 6 & HSKK",
  },
  {
    code: "ko",
    flag: "🇰🇷",
    name: "한국어 · Tiếng Hàn",
    exams: "TOPIK I & TOPIK II (Cấp 1 – 6)",
  },
];

export default function ExamLanguageHub() {
  // Số liệu tính từ dữ liệu đề (nạp sau để trang này không kéo theo cả kho đề)
  const [stats, setStats] = useState<{ level: string; questions: number; days: number } | null>(null);
  useEffect(() => {
    let alive = true;
    void import("../../data/exams/jlpt").then(({ allJLPTExams }) => {
      if (!alive) return;
      const days = allJLPTExams.filter((e) => !e.isSample && !e.isPracticePool && e.day);
      if (!days.length) return;
      setStats({
        level: days[0].level,
        days: days.length,
        questions: days.reduce((n, e) => n + e.mondais.reduce((m, x) => m + x.questions.length, 0), 0),
      });
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="exam-shell !px-3 sm:!px-6 space-y-5 sm:space-y-8 overflow-x-clip">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Chọn ngôn ngữ
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Luyện theo dạng, thi thử bấm giờ và tra từ đa sách trực tiếp trên bài.
        </p>
      </header>

      {/* Grid 4 Ngôn Ngữ */}
      <div className="grid grid-cols-1 gap-6">
        {/* Card 1: Tiếng Nhật JLPT (Active) */}
        <section className="exam-card hover:border-indigo-300 dark:hover:border-indigo-700 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center text-2xl shrink-0">
                  🇯🇵
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      日本語 · Tiếng Nhật
                    </h2>
                    {stats && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {stats.level} · {stats.questions.toLocaleString("vi-VN")} câu
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    Thi thử 54 câu, luyện theo Mondai & học theo từng ngày
                  </p>
                </div>
              </div>
            </div>

            {/* Skill Status Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <CheckCircle2
                  size={16}
                  className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Chữ Hán · Từ vựng · Ngữ pháp
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Mondai 1–9 · Sẵn sàng
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <Headphones
                  size={16}
                  className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Đọc hiểu & Nghe hiểu
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Đang phát triển
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <BookOpen size={14} className="text-indigo-500" />
              <span>{stats ? `${stats.days} ngày · Đầy đủ lời giải` : "Đầy đủ lời giải"}</span>
            </div>
            <Link className="exam-primary w-full sm:w-auto" to="/exams/jlpt">
              <span>Vào Luyện đề JLPT</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

      </div>

      {/* Ngôn ngữ sắp có: gom một dòng thay vì ba thẻ lớn (JL-25) */}
      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span className="font-semibold">Sắp có:</span>
        {upcomingLanguages.map((lang) => (
          <span
            key={lang.code}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            <span aria-hidden="true">{lang.flag}</span>
            {lang.name.split(" · ")[1] || lang.name} ({lang.exams.split(" · ")[0]})
          </span>
        ))}
      </p>
    </div>
  );
}
