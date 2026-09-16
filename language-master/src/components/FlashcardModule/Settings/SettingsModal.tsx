// src/components/FlashcardModule/Settings/SettingsModal.tsx
import { X, RefreshCw } from 'lucide-react';
import BlockC_Mode from './BlockC_Mode';
import BlockA_Logic from './BlockA_Logic';
import BlockB_UI from './BlockB_UI';
import BlockD_Extra from './BlockD_Extra';
import { useSettings } from '../../../context/global/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { language } = useSettings();
  if (!isOpen) return null;

  const t = language === 'en'
    ? { title: '⚙️ Practice Settings', saved: 'Settings auto-saved', close: 'Close & Apply' }
    : { title: '⚙️ Cài Đặt Luyện Tập', saved: 'Cài đặt tự động lưu', close: 'Đóng & Áp dụng' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-slate-700 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-5 overflow-y-auto space-y-0 custom-scrollbar">
          <BlockC_Mode />
          <BlockA_Logic />
          <BlockB_UI />
          <BlockD_Extra />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t.saved}</p>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-sm"
          >
            <RefreshCw size={14} /> {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}