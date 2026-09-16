// src/components/common/Pagination.tsx
// Component Phân Trang Chuẩn Đẹp — Dùng chung cho Vocab, Kanji, Grammar study pages

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mt-6 font-sans">
      {/* Items info */}
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        Hiển thị <span className="font-bold text-slate-800 dark:text-white">{startItem} - {endItem}</span> / <span className="font-bold text-blue-600 dark:text-blue-400">{totalItems}</span> mục (Trang {currentPage}/{totalPages})
      </div>

      {/* Page Controls */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* First & Prev */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
          title="Trang đầu"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Buttons */}
        {getPageNumbers().map((p, idx) => (
          typeof p === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(p)}
              className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
                currentPage === p
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-1 text-slate-400 font-bold text-xs">...</span>
          )
        ))}

        {/* Next & Last */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition-colors"
          title="Trang cuối"
        >
          <ChevronsRight size={16} />
        </button>
      </div>

      {/* Page size selector if handler provided */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Hiển thị:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1 text-slate-800 dark:text-white font-bold outline-none cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
        </div>
      )}
    </div>
  );
}
