// src/components/FlashcardModule/Settings/BlockD_Extra.tsx
import type { ReactNode } from 'react';
import { useFlashcardSettings } from '../../../context/features/flashcard/useFlashcardSettings';
import { useSettings } from '../../../context/global/useSettings';
import { Settings, Keyboard, PlayCircle, Volume2, ChevronDown, ChevronUp, Sliders } from 'lucide-react';

interface ToggleItemProps {
  icon: ReactNode;
  title: string;
  desc: string;
  value: boolean;
  onChange: (val: boolean) => void;
  color: string;
}

const ToggleItem = ({ icon, title, desc, value, onChange, color }: ToggleItemProps) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
    <div>
      <p className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
        {icon} {title}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-3 ${value ? color : 'bg-gray-300 dark:bg-slate-600'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const StepControl = ({
  label,
  desc,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
      >−</button>
      <span className="w-6 text-center font-bold text-slate-700 dark:text-slate-200 text-sm">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
      >+</button>
    </div>
  </div>
);

export default function BlockD_Extra() {
  const { settings, updateSettings } = useFlashcardSettings();
  const { language } = useSettings();
  const {
    autoPlayFront, autoPlayAudio, handsFree, keybindsEnabled,
    showAdvanced, quizInsertRange, playMode,
    handsFreeFlipDelay, handsFreeNextDelay,
  } = settings;

  const t = language === 'en'
    ? {
      sectionTitle: 'Utilities & Accessibility',
      autoFront: 'Auto-read Front',
      autoFrontDesc: 'Play audio when a new card appears',
      autoBack: 'Auto-read Back',
      autoBackDesc: 'Play audio immediately when card flips',
      keybinds: 'Keyboard Shortcuts',
      handsFreeTitle: 'Hands-Free Mode',
      handsFreeDesc: 'Auto-flip and auto-advance cards',
      advanced: 'Advanced settings',
      advHeader: '🔧 Algorithm Parameters',
      insertLabel: 'Insert range for "Forgot" cards',
      insertDesc: (n: number) => `"Forgot" card reinserted within next ${n} cards`,
      insertNote: '* Higher = more repetitions before seeing the card again.',
      flipDelayLabel: 'Auto-flip delay',
      flipDelayDesc: (n: number) => `Flip card after ${n}s`,
      nextDelayLabel: 'Auto-advance delay',
      nextDelayDesc: (n: number) => `Next card after ${n}s after flip`,
    }
    : {
      sectionTitle: 'Tiện Ích & Trợ Năng',
      autoFront: 'Tự đọc Mặt Trước',
      autoFrontDesc: 'Phát âm khi thẻ mới xuất hiện',
      autoBack: 'Tự đọc Mặt Sau',
      autoBackDesc: 'Phát âm ngay khi lật thẻ',
      keybinds: 'Phím Tắt',
      handsFreeTitle: 'Chế Độ Rảnh Tay',
      handsFreeDesc: 'Tự lật và tự sang thẻ mới',
      advanced: 'Cài đặt nâng cao',
      advHeader: '🔧 Thông Số Thuật Toán',
      insertLabel: 'Phạm vi chèn thẻ "Quên"',
      insertDesc: (n: number) => `Thẻ quên sẽ chèn trong ${n} thẻ tiếp theo`,
      insertNote: '* Giá trị cao = luyện nhiều lần hơn trước khi gặp lại thẻ quên.',
      flipDelayLabel: 'Thời gian tự lật',
      flipDelayDesc: (n: number) => `Lật thẻ sau ${n}s`,
      nextDelayLabel: 'Thời gian tự sang thẻ',
      nextDelayDesc: (n: number) => `Sang thẻ mới sau ${n}s khi đã lật`,
    };

  const keybindHint = playMode === 'quiz'
    ? 'Space · 1 · 2 · Z'
    : 'Space · →/Enter';

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Settings size={14} /> {t.sectionTitle}
      </h3>

      {/* Audio */}
      <ToggleItem
        icon={<Volume2 size={16} />}
        title={t.autoFront}
        desc={t.autoFrontDesc}
        value={autoPlayFront}
        onChange={(v) => updateSettings({ autoPlayFront: v })}
        color="bg-cyan-500"
      />
      <ToggleItem
        icon={<Volume2 size={16} />}
        title={t.autoBack}
        desc={t.autoBackDesc}
        value={autoPlayAudio}
        onChange={(v) => updateSettings({ autoPlayAudio: v })}
        color="bg-blue-600"
      />

      <ToggleItem
        icon={<Keyboard size={16} />}
        title={t.keybinds}
        desc={keybindHint}
        value={keybindsEnabled}
        onChange={(v) => updateSettings({ keybindsEnabled: v })}
        color="bg-green-600"
      />

      {/* Hands-free – endless only */}
      {playMode === 'endless' && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <ToggleItem
            icon={<PlayCircle size={16} />}
            title={t.handsFreeTitle}
            desc={t.handsFreeDesc}
            value={handsFree}
            onChange={(v) => updateSettings({ handsFree: v })}
            color="bg-orange-500"
          />
        </div>
      )}

      {/* ── ADVANCED TOGGLE ── */}
      <button
        onClick={() => updateSettings({ showAdvanced: !showAdvanced })}
        className="w-full flex items-center justify-between p-3 mt-2 rounded-lg border border-dashed border-gray-200 dark:border-slate-600 text-xs text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sliders size={14} /> {t.advanced}
        </span>
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* ── ADVANCED PANEL ── */}
      {showAdvanced && (
        <div className="animate-in fade-in slide-in-from-top-2 space-y-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t.advHeader}
          </p>

          {/* Quiz insert range — quiz only */}
          {playMode === 'quiz' && (
            <>
              <StepControl
                label={t.insertLabel}
                desc={t.insertDesc(quizInsertRange)}
                value={quizInsertRange}
                min={1}
                max={10}
                onChange={(v) => updateSettings({ quizInsertRange: v })}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t.insertNote}</p>
            </>
          )}

          {/* Hands-free delays — endless only */}
          {playMode === 'endless' && (
            <>
              <StepControl
                label={t.flipDelayLabel}
                desc={t.flipDelayDesc(handsFreeFlipDelay ?? 3)}
                value={handsFreeFlipDelay ?? 3}
                min={1}
                max={8}
                onChange={(v) => updateSettings({ handsFreeFlipDelay: v })}
              />
              <StepControl
                label={t.nextDelayLabel}
                desc={t.nextDelayDesc(handsFreeNextDelay ?? 4)}
                value={handsFreeNextDelay ?? 4}
                min={1}
                max={10}
                onChange={(v) => updateSettings({ handsFreeNextDelay: v })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}