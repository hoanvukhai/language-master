// src/pages/Race/components/RaceMatchingView.tsx
// Sub-component cho Game 2: Nối Từ Speed Matching (Light/Dark mode & Vi/En)

interface MatchingCard {
  id: string;
  text: string;
  pairId: string;
  type: 'prompt' | 'answer';
  isMatched?: boolean;
}

interface RaceMatchingViewProps {
  round: number;
  cards: MatchingCard[];
  selectedCardIdx: number | null;
  onCardClick: (idx: number) => void;
  language?: string;
  focusIdx?: number;
  isKeyboardNavigating?: boolean;
  wrongCards?: [number, number] | null;
  correctCards?: [number, number] | null;
}

export default function RaceMatchingView({
  round,
  cards,
  selectedCardIdx,
  onCardClick,
  language = 'vi',
  focusIdx = 0,
  isKeyboardNavigating = false,
  wrongCards = null,
  correctCards = null,
}: RaceMatchingViewProps) {
  const MATCH_KEYS = ['q','w','e','r','a','s','d','f','z','x','c','v'];

  return (
    <div className="w-full max-w-xl my-auto space-y-4 font-sans">
      <div className="text-center text-xs font-black uppercase tracking-wider text-slate-500 dark:text-indigo-300">
        {language === 'en' ? `Round ${round}/4 — Match the pairs:` : `Màn ${round}/4 — Ghép các cặp tương ứng:`}
        <div className="text-[10px] text-slate-400 mt-1 lowercase font-normal tracking-normal">
          ({language === 'en' ? 'use keyboard shortcuts or click to match' : 'sử dụng phím tắt hoặc click chuột'})
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card, idx) => {
          const isSelected = selectedCardIdx === idx;
          const isFocused = focusIdx === idx && isKeyboardNavigating;
          const isWrong = wrongCards?.includes(idx);
          const isCorrect = correctCards?.includes(idx);
          
          let stateClass = 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:border-indigo-500';
          
          if (card.isMatched) {
            stateClass = 'bg-slate-100 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-dashed border-slate-200 dark:border-slate-700 opacity-50 cursor-default scale-95';
          } else if (isCorrect) {
            stateClass = 'bg-emerald-500 text-white border-emerald-400 scale-105 shadow-lg shadow-emerald-500/40 z-10';
          } else if (isWrong) {
            stateClass = 'bg-red-500 text-white border-red-400 scale-105 shadow-lg shadow-red-500/40 z-10 animate-pulse';
          } else if (isSelected) {
            stateClass = 'bg-amber-500 text-white border-amber-400 scale-105 shadow-lg shadow-amber-500/40 z-10';
          }

          if (isFocused) {
            if (card.isMatched) {
              stateClass += ' ring-4 ring-indigo-400/50 border-indigo-500 opacity-100 z-20 shadow-md';
            } else {
              stateClass += ' ring-4 ring-indigo-400/50 border-indigo-500 scale-105 z-20 shadow-md';
            }
          }

          return (
            <button
              key={card.id}
              onClick={() => onCardClick(idx)}
              disabled={card.isMatched}
              title={card.text}
              className={`relative w-full group p-2.5 sm:p-3 rounded-2xl border-2 transition-all duration-200 text-center flex items-center justify-center min-h-[70px] sm:min-h-[80px] h-full overflow-hidden ${stateClass}`}
            >
              {MATCH_KEYS[idx] && !card.isMatched && (
                <span className="absolute top-0 left-0 w-6 h-6 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-tl-xl rounded-br-xl border-b border-r border-slate-200 dark:border-slate-600 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity z-20">
                  {MATCH_KEYS[idx].toUpperCase()}
                </span>
              )}
              <span 
                className={`break-words w-full max-w-full font-bold line-clamp-3 sm:line-clamp-4 ${
                  card.text.length > 50 
                    ? 'text-[11px] leading-tight' 
                    : card.text.length > 30 
                    ? 'text-xs leading-snug' 
                    : 'text-sm'
                }`}
              >
                {card.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
