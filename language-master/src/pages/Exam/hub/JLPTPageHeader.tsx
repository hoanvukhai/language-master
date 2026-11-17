import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

type Props = {
  /** Mục gốc (bấm để quay về), ví dụ "Luyện đề JLPT" hoặc "Kho sách đề" */
  root: { label: string; to: string };
  /** Tên trang con đang xem, ví dụ "Kết quả" */
  current: string;
  /** Các mục ở giữa (bấm được), ví dụ tên ngày: Kho sách đề › Ngày 01 › Kết quả */
  trail?: { label: string; to: string }[];
  level?: string;
  /** Phần bên phải cùng hàng (ví dụ nút chuyển tab của trang) */
  actions?: ReactNode;
};

/**
 * Đầu trang gọn cho các trang con của khu Luyện đề JLPT: một dòng duy nhất
 * "Mục gốc [N2] › Trang hiện tại". Mục gốc bấm được nên thay luôn nút quay lại.
 * (Ba trang chính Tổng quan / Luyện tập / Kho sách đề dùng đầu trang có thanh tab riêng.)
 */
export default function JLPTPageHeader({ root, current, trail = [], level, actions }: Props) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <nav aria-label="Đường dẫn trang">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li className="inline-flex items-center gap-2.5">
            <Link
              to={root.to}
              className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {root.label}
            </Link>
            {level && (
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 rounded-full px-2.5 py-1">
                {level}
              </span>
            )}
          </li>
          {trail.map((t) => (
            <li key={t.to} className="inline-flex items-center gap-2 min-w-0">
              <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-300 dark:text-slate-600" />
              <Link
                to={t.to}
                className="text-base sm:text-lg font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 truncate"
              >
                {t.label}
              </Link>
            </li>
          ))}
          <li className="inline-flex items-center gap-2 min-w-0">
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-slate-300 dark:text-slate-600" />
            <h1
              aria-current="page"
              className="text-base sm:text-lg font-semibold text-slate-600 dark:text-slate-300 truncate"
            >
              {current}
            </h1>
          </li>
        </ol>
      </nav>
      {actions}
    </header>
  );
}
