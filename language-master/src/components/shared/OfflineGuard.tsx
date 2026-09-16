// src/components/shared/OfflineGuard.tsx
// Component bảo vệ các trang yêu cầu mạng (Online-Only Guard)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, ArrowLeft, Home, BookOpen } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineGuardProps {
  children: React.ReactNode;
  featureName?: string;
  backUrl?: string;
}

export default function OfflineGuard({
  children,
  featureName = 'Tính năng này',
  backUrl,
}: OfflineGuardProps) {
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();

  if (isOnline) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
          <WifiOff size={36} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            Yêu cầu kết nối Internet
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-700 dark:text-slate-200">{featureName}</strong> cần có mạng để đồng bộ dữ liệu đám mây và bảng xếp hạng trực tuyến.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 text-left text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <BookOpen size={14} className="text-indigo-500" /> Bạn vẫn có thể học ngoại tuyến:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1">
            <li>Tra cứu Từ điển khóa học</li>
            <li>Đọc Sách Lý thuyết</li>
            <li>Luyện tập (Nhập liệu, Trắc nghiệm, Thẻ...)</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (backUrl) navigate(backUrl);
              else if (window.history.length > 1) navigate(-1);
              else navigate('/');
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Home size={16} /> Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
