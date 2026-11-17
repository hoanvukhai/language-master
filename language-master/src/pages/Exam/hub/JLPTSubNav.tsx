import { Link, useLocation } from "react-router-dom";

export type JLPTTabId = "overview" | "practice" | "books";

export const JLPT_TABS: { id: JLPTTabId; label: string; to: string }[] = [
  { id: "overview", label: "Tổng quan", to: "/exams/jlpt" },
  { id: "practice", label: "Luyện tập", to: "/exams/jlpt/practice" },
  { id: "books", label: "Kho sách đề", to: "/exams/jlpt/books" },
];

export function tabFromPath(pathname: string): JLPTTabId {
  if (pathname.startsWith("/exams/jlpt/practice")) return "practice";
  if (pathname.startsWith("/exams/jlpt/books")) return "books";
  return "overview";
}

/** Thanh tab con của khu Luyện đề JLPT: ba tab liền nhau, mỗi tab một địa chỉ riêng. */
export default function JLPTSubNav({ active }: { active?: JLPTTabId }) {
  const location = useLocation();
  const current = active ?? tabFromPath(location.pathname);
  return (
    <nav aria-label="Các mục Luyện đề JLPT">
      <ul className="grid grid-cols-3 sm:inline-grid gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800">
        {JLPT_TABS.map((t) => {
          const on = t.id === current;
          return (
            <li key={t.id} className="contents">
              <Link
                to={t.to}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center justify-center min-h-10 sm:px-5 rounded-lg text-[13px] sm:text-sm whitespace-nowrap transition-colors ${
                  on
                    ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm"
                    : "text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
