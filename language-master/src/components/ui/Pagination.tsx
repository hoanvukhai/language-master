import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useSettings } from '../../context/global/useSettings';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 0,
  onPageChange,
}: PaginationProps) {
  const { language } = useSettings();
  const [jumpPage, setJumpPage] = useState('');

  // Sync internal jump input when external page changes
  useEffect(() => {
    setJumpPage(currentPage.toString());
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const handleFirst = () => {
    if (currentPage > 1) onPageChange(1);
  };

  const handleLast = () => {
    if (currentPage < totalPages) onPageChange(totalPages);
  };

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(jumpPage, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      if (parsed !== currentPage) {
        onPageChange(parsed);
      }
    } else {
      // Revert if invalid
      setJumpPage(currentPage.toString());
    }
  };

  // Calculate item range text
  let rangeText = '';
  if (itemsPerPage > 0 && totalItems > 0) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    rangeText = language === 'en' 
      ? `Showing ${startItem} - ${endItem} of ${totalItems}`
      : `Hiển thị ${startItem} - ${endItem} trên tổng số ${totalItems}`;
  } else {
    rangeText = language === 'en' ? `Total: ${totalItems} items` : `Tổng số: ${totalItems} mục`;
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mt-8 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4 transition-colors">
      {/* Thông tin số lượng */}
      <div className="text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
        {rangeText}
      </div>

      {/* Cụm nút điều hướng */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={handleFirst}
          disabled={currentPage === 1}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={language === 'en' ? "First Page" : "Trang đầu"}
        >
          <ChevronsLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={language === 'en' ? "Previous Page" : "Trang trước"}
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <form 
          onSubmit={handleJumpSubmit} 
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-transparent focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-colors"
          title={language === 'en' ? "Type page number and press Enter" : "Nhập số trang và nhấn Enter"}
        >
          <input 
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onBlur={() => handleJumpSubmit()}
            className="w-12 sm:w-14 text-center text-sm sm:text-base font-bold bg-transparent border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-500 py-0.5 px-1 focus:outline-none focus:border-blue-500 text-slate-800 dark:text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            / {totalPages}
          </span>
        </form>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={language === 'en' ? "Next Page" : "Trang sau"}
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          onClick={handleLast}
          disabled={currentPage === totalPages}
          className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={language === 'en' ? "Last Page" : "Trang cuối"}
        >
          <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}
