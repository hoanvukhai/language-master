// src/components/FlashcardModule/Settings/BlockC_Mode.tsx
import { useFlashcardSettings } from '../../../context/features/flashcard/useFlashcardSettings';
import { useSettings } from '../../../context/global/useSettings';

export default function BlockC_Mode() {
  const { settings, updateSettings } = useFlashcardSettings();
  const { language } = useSettings();
  const { playMode } = settings;

  const t = language === 'en'
    ? {
        title: 'Learning Mode',
        randomTitle: 'Endless Random',
        randomDesc: 'Browse unlimited cards to get familiar with vocabulary. No scoring.',
        randomHint: '← → / Enter to next card',
        quizTitle: 'Quiz (Force Recall)',
        quizDesc: '"Forgot" cards are reinserted into the deck. Complete when 100% remembered.',
        quizHint: '1 Forgot · 2 Knew · Z Undo',
      }
    : {
        title: 'Chế Độ Học',
        randomTitle: 'Random Bất Tận',
        randomDesc: 'Lướt không giới hạn, làm quen từ vựng. Không chấm điểm.',
        randomHint: '← → / Enter để sang thẻ',
        quizTitle: 'Quiz (Ép Nhớ)',
        quizDesc: 'Từ "Quên" tự chèn lại vào deck. Hoàn thành khi nhớ 100%.',
        quizHint: '1 Quên · 2 Nhớ · Z Undo',
      };

  return (
    <div className="mb-6 pb-6 border-b border-gray-100 dark:border-slate-700">
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
        {t.title}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* RANDOM */}
        <button
          onClick={() => updateSettings({ playMode: 'endless' })}
          className={`relative flex flex-col items-start p-4 rounded-2xl border-2 cursor-pointer transition-all text-left ${
            playMode === 'endless'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600 shadow-md'
              : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-200 dark:hover:border-slate-500'
          }`}
        >
          {playMode === 'endless' && (
            <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 bg-blue-500 text-white rounded-full">
              ON
            </span>
          )}
          <span className="text-2xl mb-2">🎲</span>
          <p className={`font-bold text-sm leading-tight ${playMode === 'endless' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
            {t.randomTitle}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
            {t.randomDesc}
          </p>
          {playMode === 'endless' && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 font-medium">
              {t.randomHint}
            </p>
          )}
        </button>

        {/* QUIZ */}
        <button
          onClick={() => updateSettings({ playMode: 'quiz' })}
          className={`relative flex flex-col items-start p-4 rounded-2xl border-2 cursor-pointer transition-all text-left ${
            playMode === 'quiz'
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600 shadow-md'
              : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-orange-200 dark:hover:border-slate-500'
          }`}
        >
          {playMode === 'quiz' && (
            <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 bg-orange-500 text-white rounded-full">
              ON
            </span>
          )}
          <span className="text-2xl mb-2">🎯</span>
          <p className={`font-bold text-sm leading-tight ${playMode === 'quiz' ? 'text-orange-700 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300'}`}>
            {t.quizTitle}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
            {t.quizDesc}
          </p>
          {playMode === 'quiz' && (
            <p className="text-xs text-orange-500 dark:text-orange-400 mt-2 font-medium">
              {t.quizHint}
            </p>
          )}
        </button>
      </div>
    </div>
  );
}