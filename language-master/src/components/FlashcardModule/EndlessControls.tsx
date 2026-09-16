// src/components/FlashcardModule/EndlessControls.tsx
import { Shuffle, Settings } from 'lucide-react';
import { useSettings } from '../../context/global/useSettings';

interface EndlessControlsProps {
  onNext: () => void;
  onOpenSettings: () => void;
}

export default function EndlessControls({ onNext, onOpenSettings }: EndlessControlsProps) {
  const { language } = useSettings();
  return (
    <div className="flex items-center gap-4 mt-4">
      <button
        onClick={onNext}
        className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-lg hover:shadow-blue-500/30"
      >
        <Shuffle size={24} />
        {language === 'en' ? 'Next Card' : 'Từ ngẫu nhiên'}
      </button>

      <button
        onClick={onOpenSettings}
        className="p-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-md border border-slate-200 dark:border-slate-700"
        title={language === 'en' ? 'Open settings' : 'Mở cài đặt'}
      >
        <Settings size={20} />
      </button>
    </div>
  );
}