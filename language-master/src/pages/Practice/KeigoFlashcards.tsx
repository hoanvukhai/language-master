import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Volume2, RotateCcw, ChevronRight, ChevronLeft,
  Shuffle, Settings2, BookOpen, Crown, Heart, Star,
} from 'lucide-react';
import { keigoVerbs } from '../../data/jlpt/keigo/keigoDb';
import type { KeigoVerb } from '../../types/keigo';
import { keigoVocabList } from '../../data/jlpt/keigo/keigoVocabDb';
import type { KeigoVocab } from '../../data/jlpt/keigo/keigoVocabDb';
import { getKeigoResult } from '../../lib/keigoEngine';
import { useSettings } from '../../context/global/useSettings';

// ── Helpers ──────────────────────────────────────────────────
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type KeigoFormSetting = 'all' | 'sonkei' | 'kenjou' | 'teinei' | 'bikago';
type FormType = 'base' | 'sonkei' | 'kenjou' | 'teinei' | 'bikago';

const FORM_META: Record<FormType, { label: string; labelEn: string; color: string; icon: React.ReactNode }> = {
  base: {
    label: 'Từ gốc',
    labelEn: 'Base Word',
    color: 'from-slate-500 to-slate-600',
    icon: <BookOpen size={16} className="text-slate-300" />,
  },
  sonkei: {
    label: '尊敬語 (Tôn kính)',
    labelEn: '尊敬語 (Sonkei)',
    color: 'from-violet-500 to-purple-600',
    icon: <Crown size={16} className="text-violet-300" />,
  },
  kenjou: {
    label: '謙譲語 (Khiêm nhường)',
    labelEn: '謙譲語 (Kenjou)',
    color: 'from-blue-500 to-indigo-600',
    icon: <Heart size={16} className="text-blue-300" />,
  },
  teinei: {
    label: '丁寧語 (Lịch sự)',
    labelEn: '丁寧語 (Teinei)',
    color: 'from-emerald-500 to-teal-600',
    icon: <Star size={16} className="text-emerald-300" />,
  },
  bikago: {
    label: '美化語 (Mỹ hóa ngữ お/ご)',
    labelEn: '美化語 (Bikago)',
    color: 'from-amber-500 to-orange-600',
    icon: <Star size={16} className="text-amber-300" />,
  }
};

// ── Keigo Card Component ──────────────────────────────────────
type FlashcardEntry = 
  | { type: 'verb'; verb: KeigoVerb; sourceForm: FormType; targetForm: FormType }
  | { type: 'vocab'; vocab: KeigoVocab; };

interface KeigoCardProps {
  entry: FlashcardEntry;
  isFlipped: boolean;
  language: 'vi' | 'en';
  onFlip: () => void;
}

function KeigoCard({ entry, isFlipped, language, onFlip }: KeigoCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => { setIsRevealed(false); }, [entry]);
  
  const isVerb = entry.type === 'verb';
  
  const getWordText = (verb: KeigoVerb, form: FormType): string => {
    if (form === 'base') return verb.kanji;
    if (form === 'bikago') return '';
    const res = getKeigoResult(verb, form as any, 'masu');
    return res[0] === '(なし)' ? '(không có)' : res.join(' / ');
  };
  
  const sourceText = isVerb ? getWordText(entry.verb, entry.sourceForm) : entry.vocab.word;
  const targetText = isVerb ? getWordText(entry.verb, entry.targetForm) : `${entry.vocab.prefix === 'o' ? 'お' : 'ご'}${entry.vocab.word}`;
  const sourceMeta = isVerb ? FORM_META[entry.sourceForm] : FORM_META['base'];
  const targetMeta = isVerb ? FORM_META[entry.targetForm] : FORM_META['bikago'];

  const playAudio = useCallback((e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    // Thay / bằng dấu phẩy để đọc tự nhiên hơn
    const cleanedText = text.replace(/ \/ /g, '、');
    const u = new SpeechSynthesisUtterance(cleanedText);
    u.lang = 'ja-JP'; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }, []);

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: '1200px', minHeight: '22rem' }}
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d', minHeight: '22rem' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* ── FRONT (SOURCE) ── */}
        <div
          className="absolute inset-0 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col p-5 shadow-xl overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Gradient top bar */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r ${sourceMeta.color}`} />

          {/* Header */}
          <div className="flex items-start justify-between mt-2 mb-3 relative z-10">
            <div className="flex flex-col gap-1">
              <div 
                onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer ${
                  isRevealed 
                    ? `bg-gradient-to-r ${sourceMeta.color} text-white` 
                    : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 backdrop-blur'
                }`}
              >
                {isRevealed ? sourceMeta.icon : <BookOpen size={16} />}
                {isRevealed 
                  ? (language === 'en' ? sourceMeta.labelEn : sourceMeta.label)
                  : (language === 'en' ? 'Tap to reveal form' : 'Chạm để xem Thể')}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1 mt-1 font-bold">
                Hỏi: {language === 'en' ? targetMeta.labelEn : targetMeta.label}?
              </span>
            </div>
            <button
              onClick={(e) => playAudio(e, sourceText)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-slate-200 dark:border-slate-600 shrink-0"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {/* Main word */}
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-4">
            <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">
              {isVerb ? (entry.sourceForm === 'base' ? entry.verb.hiragana : '') : entry.vocab.hiragana}
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-800 dark:text-white text-center leading-tight break-all px-2">
              {sourceText}
            </h2>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 text-center">
              {language === 'en' ? (isVerb ? entry.verb.meaning.en : entry.vocab.meaning.en) : (isVerb ? entry.verb.meaning.vi : entry.vocab.meaning.vi)}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-center items-center gap-2 text-slate-400 dark:text-slate-500 text-sm animate-pulse mt-2">
            <RotateCcw size={14} />
            <span>{language === 'en' ? 'Tap to flip' : 'Chạm để lật thẻ'}</span>
          </div>
        </div>

        {/* ── BACK (TARGET) ── */}
        <div
          className={`absolute inset-0 w-full rounded-2xl flex flex-col p-5 shadow-xl overflow-hidden bg-gradient-to-br ${targetMeta.color}`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col gap-1">
              <span className="text-white/70 text-xs font-medium">
                {language === 'en' ? targetMeta.labelEn : targetMeta.label}
              </span>
              <span className="text-white text-base font-bold">
                Từ gốc: {isVerb ? entry.verb.kanji : entry.vocab.word} ({language === 'en' ? (isVerb ? entry.verb.meaning.en : entry.vocab.meaning.en) : (isVerb ? entry.verb.meaning.vi : entry.vocab.meaning.vi)})
              </span>
            </div>
            <button
              onClick={(e) => playAudio(e, targetText)}
              className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors shrink-0"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {/* Answer */}
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-4">
            <div className="text-3xl sm:text-4xl font-bold text-yellow-300 text-center leading-tight break-all px-2">
              {targetText}
            </div>
            {isVerb && entry.targetForm !== 'base' && entry.targetForm !== 'bikago' && (
              <div className="px-3 py-1 rounded-full bg-white/20 text-white/90 text-xs font-bold">
                {(entry.verb as any)[entry.targetForm].type === 'special'
                  ? (language === 'en' ? '⚡ Special form' : '⚡ Từ đặc biệt')
                  : (language === 'en' ? '📐 Rule-based' : '📐 Theo quy tắc')}
              </div>
            )}
            {!isVerb && (
              <div className="px-3 py-1 rounded-full bg-white/20 text-white/90 text-xs font-bold">
                {entry.vocab.isException
                  ? (language === 'en' ? '⚡ Exception' : '⚡ Ngoại lệ')
                  : (language === 'en' ? '📐 Rule-based' : '📐 Theo quy tắc')}
              </div>
            )}
          </div>

          {/* Note */}
          {isVerb && entry.verb.note && (
            <div className="bg-white/10 rounded-xl p-3 text-white/80 text-xs leading-relaxed mt-2">
              <BookOpen size={12} className="inline mr-1 opacity-70" />
              {language === 'en' ? entry.verb.note.en : entry.verb.note.vi}
            </div>
          )}
          {!isVerb && entry.vocab.note && (
            <div className="bg-white/10 rounded-xl p-3 text-white/80 text-xs leading-relaxed mt-2">
              <BookOpen size={12} className="inline mr-1 opacity-70" />
              {language === 'en' ? entry.vocab.note.en : entry.vocab.note.vi}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function KeigoFlashcards() {
  const navigate = useNavigate();
  const { language } = useSettings();

  // Settings
  const [formSetting, setFormSetting] = useState<KeigoFormSetting>('all');
  const [showSettings, setShowSettings] = useState(false);

  // Queue state
  const [queue, setQueue] = useState<FlashcardEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Build queue
  const buildQueue = useCallback(() => {
    const entries: FlashcardEntry[] = [];
    
    if (formSetting !== 'bikago') {
      keigoVerbs.forEach(verb => {
        const forms: FormType[] = ['base'];
        if (verb.sonkei.type !== 'none') forms.push('sonkei');
        if (verb.kenjou.type !== 'none') forms.push('kenjou');
        if (verb.teinei.type === 'special') forms.push('teinei');

        // Tạo các cặp Hỏi chéo
        for (const s of forms) {
          for (const t of forms) {
            if (s === t) continue;
            
            // Lọc theo formSetting
            if (formSetting !== 'all') {
               // Nếu user chọn 1 form cụ thể, thì targetForm hoặc sourceForm phải liên quan
               if (s !== formSetting && t !== formSetting) continue;
            }

            entries.push({ type: 'verb', verb, sourceForm: s, targetForm: t });
          }
        }
      });
    }

    if (formSetting === 'all' || formSetting === 'bikago') {
      keigoVocabList.forEach(vocab => {
        entries.push({ type: 'vocab', vocab });
      });
    }

    setQueue(shuffle(entries));
    setIndex(0);
    setIsFlipped(false);
  }, [formSetting]);

  useEffect(() => { buildQueue(); }, [buildQueue]);

  const current = queue[index];

  const goNext = useCallback(() => {
    setDirection(1);
    setIsFlipped(false);
    setTimeout(() => {
      setIndex(prev => (prev + 1 < queue.length ? prev + 1 : 0));
    }, 150);
  }, [queue.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIsFlipped(false);
    setTimeout(() => {
      setIndex(prev => (prev - 1 >= 0 ? prev - 1 : queue.length - 1));
    }, 150);
  }, [queue.length]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(p => !p); }
      else if (e.code === 'ArrowRight' || e.code === 'Enter') { e.preventDefault(); goNext(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  // Animation variants
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.9 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.9 }),
  };

  if (queue.length === 0) return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors overflow-hidden">
      {/* ── HEADER ── */}
      <header className="px-4 md:px-8 py-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/course/keigo-master/practice')}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-white">
              {language === 'en' ? 'Keigo Flashcards' : 'Lật thẻ Kính Ngữ'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {language === 'en' ? 'Cross-form Drills' : 'Hỏi chéo đa chiều'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2.5 rounded-full transition-all ${
            showSettings
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings2 size={20} />
        </button>
      </header>

      {/* ── SETTINGS PANEL ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 overflow-hidden shadow-sm z-0"
          >
            <div className="px-4 md:px-8 py-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider">
                {language === 'en' ? 'Card Focus' : 'Tập trung học'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(['all', 'sonkei', 'kenjou', 'teinei', 'bikago'] as KeigoFormSetting[]).map(s => {
                  const active = formSetting === s;
                  const labels = {
                    all: language === 'en' ? 'Mix All' : 'Trộn tất cả',
                    sonkei: language === 'en' ? 'Sonkei' : 'Tôn kính',
                    kenjou: language === 'en' ? 'Kenjou' : 'Khiêm nhường',
                    teinei: language === 'en' ? 'Teinei (Special)' : 'Lịch sự (ĐB)',
                    bikago: language === 'en' ? 'O/Go Prefix' : 'Mỹ hóa ngữ (お/ご)',
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => setFormSetting(s)}
                      className={`py-3 px-4 rounded-xl font-semibold text-sm transition-all border-2 ${
                        active
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN STAGE ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative">
        <div className="w-full max-w-md">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-slate-400 w-8 text-right">{index + 1}</span>
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                style={{ width: `${((index + 1) / queue.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-400 w-8">{queue.length}</span>
          </div>

          {/* Cards container */}
          <div className="relative w-full" style={{ minHeight: '22rem' }}>
            <AnimatePresence custom={direction} mode="popLayout">
              <motion.div
                key={index}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
                className="absolute inset-0"
              >
                {current && (
                  <KeigoCard
                    entry={current}
                    isFlipped={isFlipped}
                    language={language as 'vi' | 'en'}
                    onFlip={() => setIsFlipped(!isFlipped)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={goPrev}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 shadow-md border border-slate-100 dark:border-slate-700 transition-colors"
            >
              <ChevronLeft size={28} />
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex-1 max-w-[200px] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 active:translate-y-1 transition-all"
            >
              {isFlipped
                ? (language === 'en' ? 'Hide Answer' : 'Ẩn đáp án')
                : (language === 'en' ? 'Show Answer' : 'Xem đáp án')}
            </button>

            <button
              onClick={goNext}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 shadow-md border border-slate-100 dark:border-slate-700 transition-colors"
            >
              <ChevronRight size={28} />
            </button>
          </div>
          
          <div className="flex justify-center mt-4">
             <button
              onClick={buildQueue}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Shuffle size={14} />
              {language === 'en' ? 'Shuffle Deck' : 'Trộn lại thẻ'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
