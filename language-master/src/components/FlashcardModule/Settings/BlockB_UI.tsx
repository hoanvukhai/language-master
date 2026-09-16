// src/components/FlashcardModule/Settings/BlockB_UI.tsx
import { useFlashcardSettings } from '../../../context/features/flashcard/useFlashcardSettings';
import { useSettings } from '../../../context/global/useSettings';
import type { CardUIToggles } from '../../../context/features/flashcard/FlashcardSettingsContext';
import { Eye, EyeOff, LayoutTemplate } from 'lucide-react';

const ToggleRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  showLabel?: string;
  hideLabel?: string;
}) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
        value ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
      }`}
    >
      {value ? <><Eye size={14} /> SHOW</> : <><EyeOff size={14} /> HIDE</>}
    </button>
  </div>
);

export default function BlockB_UI() {
  const { settings, updateSettings } = useFlashcardSettings();
  const { language } = useSettings();
  const { uiFront, uiBack } = settings;

  const updateFront = (key: keyof CardUIToggles, val: boolean) =>
    updateSettings({ uiFront: { ...uiFront, [key]: val } });
  const updateBack = (key: keyof CardUIToggles, val: boolean) =>
    updateSettings({ uiBack: { ...uiBack, [key]: val } });

  const t = language === 'en'
    ? {
        title: 'Card Display',
        frontCol: 'Front (Question)',
        backCol: 'Back (Answer)',
        japanese: 'Japanese Text',
        furigana: 'Furigana (Reading)',
        meaning: 'Meaning',
        tip: '*Tip: Hide "Japanese Text" on Front and show on Back to practise translating from meaning → Japanese.',
      }
    : {
        title: 'Hiển Thị Hai Mặt Thẻ',
        frontCol: 'Mặt Trước (Câu hỏi)',
        backCol: 'Mặt Sau (Đáp án)',
        japanese: 'Chữ Tiếng Nhật',
        furigana: 'Furigana (Cách đọc)',
        meaning: 'Nghĩa',
        tip: '*Mẹo: Ẩn "Chữ Tiếng Nhật" ở Mặt Trước và bật ở Mặt Sau để luyện dịch từ Tiếng Việt sang Tiếng Nhật.',
      };

  return (
    <div className="space-y-6 mb-8 pb-8 border-b border-gray-100 dark:border-slate-700">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <LayoutTemplate size={16} /> {t.title}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FRONT */}
        <div className="space-y-2 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-xl">
          <div className="text-center font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase text-xs tracking-widest">
            {t.frontCol}
          </div>
          <ToggleRow label={t.japanese} value={uiFront.showConjugation} onChange={(v) => updateFront('showConjugation', v)} />
          <ToggleRow label={t.furigana} value={uiFront.showFurigana} onChange={(v) => updateFront('showFurigana', v)} />
          <ToggleRow label={t.meaning}  value={uiFront.showMeaning}   onChange={(v) => updateFront('showMeaning', v)} />
        </div>

        {/* BACK */}
        <div className="space-y-2 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
          <div className="text-center font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase text-xs tracking-widest">
            {t.backCol}
          </div>
          <ToggleRow label={t.japanese} value={uiBack.showConjugation} onChange={(v) => updateBack('showConjugation', v)} />
          <ToggleRow label={t.furigana} value={uiBack.showFurigana}    onChange={(v) => updateBack('showFurigana', v)} />
          <ToggleRow label={t.meaning}  value={uiBack.showMeaning}     onChange={(v) => updateBack('showMeaning', v)} />
        </div>
      </div>
      <p className="text-xs text-gray-400 italic text-center">{t.tip}</p>
    </div>
  );
}