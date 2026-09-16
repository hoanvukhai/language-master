// src/pages/StudyRoadmap.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPinned, BookOpen, WandSparkles, Languages, ALargeSmall,
  BookMarked, MessagesSquare, Clock, CheckCircle2, ChevronDown,
  Flame, Target, Info, Star,
} from 'lucide-react';
import { tracks, NOTE_CONFIG } from '../data/jlpt/core/roadmapData';
import type { Phase, PhaseItem } from '../data/jlpt/core/roadmapData';

// ──────────────────────────────────────────────────────────────────────────────
// COLOR SYSTEM
// ──────────────────────────────────────────────────────────────────────────────
const COLOR: Record<string, { bg: string; border: string; badge: string; text: string; dot: string }> = {
  rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',    border: 'border-rose-200 dark:border-rose-700',    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',    text: 'text-rose-600 dark:text-rose-400',    dot: 'bg-rose-500'    },
  orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',border: 'border-orange-200 dark:border-orange-700',badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',text: 'text-orange-600 dark:text-orange-400',dot: 'bg-orange-500'  },
  teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20',    border: 'border-teal-200 dark:border-teal-700',    badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',    text: 'text-teal-600 dark:text-teal-400',    dot: 'bg-teal-500'    },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-200 dark:border-blue-700',    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',    text: 'text-blue-600 dark:text-blue-400',    dot: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20',border: 'border-violet-200 dark:border-violet-700',badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',text: 'text-violet-600 dark:text-violet-400',dot: 'bg-violet-500'  },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-700',  badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',  text: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500'   },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20',border:'border-emerald-200 dark:border-emerald-700',badge:'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',text:'text-emerald-600 dark:text-emerald-400',dot:'bg-emerald-500'},
  cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    border: 'border-cyan-200 dark:border-cyan-700',    badge: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',    text: 'text-cyan-600 dark:text-cyan-400',    dot: 'bg-cyan-500'    },
};

const TRACK_HERO: Record<string, string> = {
  '1m': 'from-rose-500 to-pink-600',
  '3m': 'from-teal-500 to-cyan-500',
  '6m': 'from-emerald-500 to-green-600',
};

const TRACK_BADGE: Record<string, string> = {
  '1m': 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
  '3m': 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  '6m': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
};

// ──────────────────────────────────────────────────────────────────────────────
// PHASE ITEM ROW
// ──────────────────────────────────────────────────────────────────────────────
function ItemRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-3 items-start py-2 border-b border-slate-100 dark:border-slate-700/60 last:border-0">
      <span className="text-sm w-5 flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{value}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE ITEM BLOCK (1 tuần/block)
// ──────────────────────────────────────────────────────────────────────────────
function PhaseItemBlock({ item, index, accentColor }: { item: PhaseItem; index: number; accentColor: string }) {
  const c = COLOR[accentColor];
  return (
    <div className="flex gap-3">
      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-6 h-6 rounded-full ${c.dot} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm`}>
          {index + 1}
        </div>
        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className={`text-xs font-extrabold mb-2 ${c.text}`}>{item.week}</div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 px-4 py-1">
          {item.conjugation && <ItemRow icon="⚡" label="Chia thể" value={item.conjugation} />}
          {item.vocab       && <ItemRow icon="📚" label="Từ vựng"  value={item.vocab}       />}
          {item.kanji       && <ItemRow icon="⛩️" label="Kanji"    value={item.kanji}       />}
          {item.grammar     && <ItemRow icon="📖" label="Ngữ pháp" value={item.grammar}     />}
          <div className="flex items-center gap-1.5 py-2">
            <Clock size={11} className="text-slate-400" />
            <span className="text-[11px] text-slate-400">
              Dự kiến <strong className="text-slate-600 dark:text-slate-300">{item.timeMin} phút/buổi</strong>
            </span>
          </div>
        </div>

        {item.note && item.noteType && (
          <div className={`mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs leading-relaxed ${NOTE_CONFIG[item.noteType].bg} ${NOTE_CONFIG[item.noteType].text}`}>
            <span className="flex-shrink-0">{NOTE_CONFIG[item.noteType].icon}</span>
            <span>{item.note}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE CARD — inline accordion (no modal)
// ──────────────────────────────────────────────────────────────────────────────
function PhaseCard({ phase, cardIndex, studyLinks }: {
  phase: Phase;
  cardIndex: number;
  studyLinks: { to: string; label: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const c = COLOR[phase.accentColor];

  const hasKeigo = phase.items.some(i => i.noteType === 'keigo');
  const hasMilestone = phase.items.some(i => i.noteType === 'checkpoint');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cardIndex * 0.08, duration: 0.3 }}
    >
      <div className={`border-2 rounded-2xl overflow-hidden transition-shadow ${expanded ? 'shadow-lg' : 'shadow-sm'} ${c.bg} ${c.border}`}>

        {/* ── Header (always visible, clickable) ── */}
        <button
          className="w-full text-left px-5 pt-4 pb-3 flex items-start gap-3 hover:opacity-90 transition-opacity"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Number badge */}
          <div className={`w-9 h-9 rounded-xl ${c.dot} flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-sm mt-0.5`}>
            {cardIndex + 1}
          </div>

          <div className="flex-1 min-w-0">
            {/* Meta badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${c.badge}`}>
                {phase.phaseLabel} · Ngày {phase.dayRange[0]}–{phase.dayRange[1]}
              </span>
              {hasMilestone && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  <Star size={9} /> Milestone
                </span>
              )}
              {hasKeigo && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                  🎓 Kính ngữ
                </span>
              )}
            </div>
            <h3 className={`text-base font-extrabold ${c.text}`}>{phase.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{phase.subtitle}</p>
          </div>

          {/* Toggle arrow */}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 mt-1">
            <ChevronDown size={18} className={c.text} />
          </motion.div>
        </button>

        {/* ── Collapsed preview strip ── */}
        {!expanded && (
          <div className="px-5 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
            {phase.items.map((item, i) => (
              <div key={i} className="flex-shrink-0 bg-white/60 dark:bg-slate-800/50 rounded-xl px-3 py-2 min-w-[130px]">
                <div className={`text-[10px] font-bold mb-1 ${c.text}`}>{item.week.split('(')[0].trim()}</div>
                <div className="space-y-0.5">
                  {item.conjugation && <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">⚡ Chia thể</div>}
                  {item.vocab       && <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">📚 {item.vocab.split('(')[0].trim()}</div>}
                  {item.kanji       && <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">⛩️ {item.kanji.split('(')[0].trim()}</div>}
                  {item.grammar     && <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">📖 {item.grammar.split('(')[0].trim()}</div>}
                  {item.note && !item.vocab && !item.grammar && (
                    <div className="text-[11px] text-slate-400 truncate">{item.note.substring(0, 28)}…</div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 mt-1.5 text-slate-400">
                  <Clock size={9} /><span className="text-[10px]"> {item.timeMin}p</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Expanded detail ── */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pt-2 pb-5">
                {/* Divider */}
                <div className={`h-px mb-5 ${c.border.replace('border-', 'bg-').split(' ')[0]}`} />

                {/* Timeline blocks */}
                <div>
                  {phase.items.map((item, i) => (
                    <PhaseItemBlock key={i} item={item} index={i} accentColor={phase.accentColor} />
                  ))}
                </div>

                {/* Quick-start links */}
                {studyLinks.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Bắt đầu học ngay</p>
                    <div className="flex flex-wrap gap-2">
                      {studyLinks.map(link => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all hover:-translate-y-0.5 hover:shadow-sm ${c.bg} ${c.border} ${c.text}`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────────
export default function StudyRoadmap() {
  const [selectedId, setSelectedId] = useState<'1m' | '3m' | '6m'>('3m');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const track = tracks.find(t => t.id === selectedId)!;

  function getStudyLinks(phase: Phase) {
    return [
      { to: '/study/conjugation', label: '⚡ Chia thể',   show: phase.items.some(i => i.conjugation) },
      { to: '/study/vocabulary',  label: '📚 Từ vựng',   show: phase.items.some(i => i.vocab) },
      { to: '/study/kanji',       label: '⛩️ Kanji',      show: phase.items.some(i => i.kanji) },
      { to: '/study/grammar',     label: '📖 Ngữ pháp',  show: phase.items.some(i => i.grammar) },
      { to: '/practice/keigo',    label: '🎓 Game Kính ngữ', show: phase.items.some(i => i.noteType === 'keigo') },
      { to: '/practice/grammar/arena', label: '⚔️ Arena', show: phase.items.some(i => i.noteType === 'practice') },
    ].filter(l => l.show).map(({ to, label }) => ({ to, label }));
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">

      {/* ── HERO (không có dropdown ở đây) ── */}
      <div className={`bg-gradient-to-br ${TRACK_HERO[selectedId]} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_70%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-5 pt-6 pb-8">
          <Link
            to="/study"
            className="relative z-10 inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors mb-5 text-sm font-medium"
          >
            <ArrowLeft size={15} /> Quay lại Học Tập
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <MapPinned size={20} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Lộ Trình Học JLPT N3</h1>
          </div>
          <p className="text-white/75 text-sm mb-4">
            Dựa trên database thực tế — 882 từ · 320 chữ Hán · 122 mẫu ngữ pháp
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { I: WandSparkles, l: '11 Thể chia' },
              { I: ALargeSmall,  l: '882 Từ vựng (12 bài)' },
              { I: Languages,    l: '320 Kanji (35 bài)' },
              { I: BookMarked,   l: '122 Mẫu ngữ pháp (20 bài)' },
              { I: MessagesSquare, l: 'Kính ngữ (Ngữ pháp Bài 10)' },
            ].map(({ I, l }) => (
              <div key={l} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
                <I size={11} /> {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRACK SELECTOR — ngoài hero, không bị che ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          {/* Track info */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">{track.emoji}</span>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-800 dark:text-white truncate">{track.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">{track.tagline}</div>
            </div>
          </div>

          {/* Dropdown trigger — relative to this bar, NOT inside overflow-hidden */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Đổi lộ trình
              <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <>
                  {/* invisible backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 min-w-[280px]"
                  >
                    {tracks.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedId(t.id); setDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${selectedId === t.id ? 'bg-slate-50 dark:bg-slate-700/60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-extrabold text-slate-800 dark:text-white">{t.emoji} {t.label}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.tagline}</div>
                          </div>
                          {selectedId === t.id && <CheckCircle2 size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TRACK_BADGE[t.id]}`}>{t.days} ngày</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Clock size={9} /> {t.dailyTime}
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-4xl mx-auto px-5 py-5">

        {/* Track summary */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <Target size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Đối tượng</div>
              <div className="text-sm text-slate-700 dark:text-slate-200">{track.audience}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Flame size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Thời gian/ngày</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{track.dailyTime}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BookOpen size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Cấu trúc</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{track.phases.length} chặng · {track.days} ngày</div>
            </div>
          </div>
        </div>

        {/* Keigo note */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <Info size={14} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
            <strong>Về Kính ngữ:</strong> Học qua <strong>Ngữ pháp Bài 10</strong> — đầy đủ お〜になる, お〜する/いたす, 〜られる (kính), 〜ます/ございます. Sau đó luyện củng cố qua game Kính ngữ trong phần Luyện tập.
          </p>
        </div>

        {/* Phase list — key = track id để reset khi đổi lộ trình */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            {track.phases.map((phase, i) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                cardIndex={i}
                studyLinks={getStudyLinks(phase)}
              />
            ))}

            {/* Footer CTA */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Bắt đầu từ bất kỳ chặng nào phù hợp với trình độ hiện tại của bạn 🚀
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { to: '/study/conjugation', label: '⚡ Chia thể',   cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'    },
                  { to: '/study/vocabulary',  label: '📚 Từ vựng',   cls: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700'    },
                  { to: '/study/kanji',       label: '⛩️ Kanji',      cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700' },
                  { to: '/study/grammar',     label: '📖 Ngữ pháp',  cls: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700'   },
                  { to: '/practice/keigo',    label: '🎓 Kính ngữ',  cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' },
                ].map(l => (
                  <Link key={l.to} to={l.to}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-md ${l.cls}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
