// src/pages/Learn/LearnSession.tsx
// Phiên học SRS Queue-Based: Batch 5 từ -> Preview -> Quiz -> Typing
// Auto-save sau mỗi từ đúng. Visual feedback rõ ràng. Đan xen đúng chuẩn.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/auth/useAuth';
import { useSettings } from '../../context/global/useSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, RotateCcw, Sparkles, ChevronRight, X, ChevronsUp, MousePointerClick, Keyboard, Check, Swords } from 'lucide-react';


import * as wanakana from 'wanakana';
import { formatDualIpa, checkEnglishWordMatch, formatWordVariantsDisplay } from '../../lib/english/ipaHelper';
import {
  saveWordProgress,
  getLearnedItemIds,
  getNewItemIds,

  fetchDueItems,
} from '../../lib/srs/firestoreSync';
import {
  createGraduatedProgress,
  onCorrectLongTerm,
  onWrongLongTerm,
  markAsMasteredUser,
} from '../../lib/srs/srsEngine';
import { shuffleArray, generateQuizOptions, cleanQuizMeaning } from '../../lib/srs/sessionManager';
import MasteryIcon from '../../components/srs/MasteryIcon';
import type { SRSSubject, WordProgress } from '../../lib/srs/srsTypes';
import { type Course } from '../../data/courses/registry';
import { useCourseData } from '../../hooks/useCourseData';

// ── Types ────────────────────────────────────────────────────────────

interface RawItem {
  id: string;
  kanji: string;
  hiragana: string;
  meaning: string;
  lesson?: string;
  exampleKanji?: string;
  exampleMeaning?: string;
  isSingleKanjiChar?: boolean;
  originalData?: any;
}

type QueuePhase = 'preview' | 'quiz' | 'typing';
type FeedbackState = 'none' | 'correct' | 'wrong';

interface QueueItem {
  raw: RawItem;
  phase: QueuePhase;
  direction: 'fwd' | 'rev'; // fwd: kanji� meaning/hanviet, rev: meaning� kanji/hanviet
  attempt: number; // S� lần thử, sai �  tĒng 1 và re-insert
}

// ���� Helpers ��������������������������������������������������������������������������������������������������������������������������������

/** Xây danh sách raw items từ course data */
function buildRawList(course: Course, language: string = 'vi'): RawItem[] {
  const { subject, data } = course;

  if (subject === 'vocab') {
    // ── English template ────────────────────────────────────────────
    if (course.template === 'english') {
      return data.map((w: any) => ({
        id: w.id || w.word,
        kanji: w.word,           // 'kanji' slot = English word
        hiragana: formatDualIpa(w) || w.ipa || '',   // 'hiragana' slot = IPA (not typed, just for display)
        meaning: typeof w.meaning === 'object' ? (language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi) : w.meaning,
        lesson: w.lesson || 'Unit 1',
        exampleKanji: w.examples?.[0]?.en || w.examples?.[0]?.jp,
        exampleMeaning: language === 'en' && w.examples?.[0]?.en ? w.examples[0].en : (w.examples?.[0]?.vi || w.examples?.[0]?.en),
        isSingleKanjiChar: false,
        originalData: w,
      }));
    }
    // ── Generic template (Thuật ngữ & Định nghĩa) ───────────────────
    if (course.template === 'generic') {
      return data.map((w: any) => ({
        id: w.id || w.kanji || w.word || w.term,
        kanji: w.term || w.kanji || w.word || '',
        hiragana: '',
        meaning: typeof w.meaning === 'object' ? (language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi) : (w.definition || w.meaning || ''),
        lesson: w.lesson || 'Bài 1',
        exampleKanji: w.exampleKanji || w.example?.kanji || w.examples?.[0]?.jp || w.examples?.[0]?.en || '',
        exampleMeaning: w.exampleMeaning || (typeof w.example?.meaning === 'object' ? (language === 'en' && w.example.meaning.en ? w.example.meaning.en : w.example.meaning.vi) : (w.example?.meaning || w.examples?.[0]?.vi || '')),
        isSingleKanjiChar: false,
        originalData: w,
      }));
    }
    // ── Japanese template ────────────────────────────────────────────
    return data.map((w: any) => ({
      id: w.id || w.kanji || w.hiragana,
      kanji: w.kanji || w.hiragana,
      hiragana: w.hiragana,
      meaning: typeof w.meaning === 'object' ? (language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi) : w.meaning,
      lesson: w.lesson || 'Bài 1',
      exampleKanji: w.examples?.[0]?.jp || w.example?.kanji || w.examples?.[0]?.en || w.exampleKanji,
      exampleMeaning: typeof w.examples?.[0] === 'object'
        ? (language === 'en' && w.examples[0].en ? w.examples[0].en : (w.examples[0].vi || w.examples[0].en))
        : (typeof w.example?.meaning === 'object'
            ? (language === 'en' && w.example.meaning.en ? w.example.meaning.en : w.example.meaning.vi)
            : (w.example?.meaning || w.exampleMeaning)),
      isSingleKanjiChar: false,
      originalData: w,
    }));
  }

  if (subject === 'kanji_single') {
    const items: RawItem[] = [];
    data.forEach((k: any) => {
      items.push({ id: k.id || k.character, kanji: k.character, hiragana: k.hanViet, meaning: `Âm Hán Việt: ${k.hanViet}`, lesson: k.lesson || 'Bài 1', isSingleKanjiChar: true, originalData: k });
      if (k.words) k.words.forEach((w: any) => {
        const m = typeof w.meaning === 'object' ? (language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi) : w.meaning;
        items.push({ id: w.id || `${k.character}_${w.word}`, kanji: w.word, hiragana: w.hanVietWord || k.hanViet, meaning: `Từ Ghép: ${w.hanVietWord || k.hanViet} · ${m}`, lesson: k.lesson || 'Bài 1', isSingleKanjiChar: true, originalData: w });
      });
    });
    return items;
  }

  if (subject === 'kanji_words') {
    const items: RawItem[] = [];
    data.forEach((k: any) => {
      if (k.words) k.words.forEach((w: any) => {
        items.push({
          id: w.id || `${k.character}_${w.word}`,
          kanji: w.word,
          hiragana: w.hiragana,
          meaning: typeof w.meaning === 'object' ? (language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi) : w.meaning,
          lesson: k.lesson || 'Bài 1',
          exampleKanji: w.examples?.[0]?.jp || w.examples?.[0]?.en,
          exampleMeaning: typeof w.examples?.[0] === 'object'
            ? (language === 'en' && w.examples[0].en ? w.examples[0].en : (w.examples[0].vi || w.examples[0].en))
            : '',
          isSingleKanjiChar: false,
          originalData: w
        });
      });
    });
    return items;
  }

  if (subject === 'grammar') {
    return data.map((g: any) => ({
      id: g.id || g.structure,
      kanji: g.structure,
      hiragana: g.structure,
      meaning: typeof g.meaning === 'object' ? (language === 'en' && g.meaning.en ? g.meaning.en : g.meaning.vi) : g.meaning,
      lesson: g.lesson || 'Bài 1',
      isSingleKanjiChar: false,
      originalData: g
    }));
  }

  return [];
}

/** Xây queue test cho 1 batch: Quiz Fwd �  Quiz Rev �  Typing Rev (�an xen ngẫu nhiên) */
function buildBatchQueue(items: RawItem[], mode: string): QueueItem[] {
  if (mode === 'review') {
    // Review: just 1 random test per item (quiz or typing)
    return shuffleArray(items.map(r => {
      const phase = Math.random() > 0.5 ? 'quiz' : 'typing';
      return {
        raw: r,
        phase,
        direction: phase === 'typing' ? 'rev' : (Math.random() > 0.5 ? 'fwd' : 'rev'),
        attempt: 0
      };
    }));
  }
  // New: 6 tests per item
  const q1: QueueItem[] = items.map(r => ({ raw: r, phase: 'quiz', direction: 'fwd', attempt: 0 }));
  const q2: QueueItem[] = items.map(r => ({ raw: r, phase: 'quiz', direction: 'rev', attempt: 0 }));
  const q3: QueueItem[] = items.map(r => ({ raw: r, phase: 'quiz', direction: 'fwd', attempt: 0 }));
  const q4: QueueItem[] = items.map(r => ({ raw: r, phase: 'quiz', direction: 'rev', attempt: 0 }));
  const q5: QueueItem[] = items.map(r => ({ raw: r, phase: 'typing', direction: 'rev', attempt: 0 }));
  const q6: QueueItem[] = items.map(r => ({ raw: r, phase: 'typing', direction: 'rev', attempt: 0 }));
  return shuffleArray([...q1, ...q2, ...q3, ...q4, ...q5, ...q6]);
}

// ���� Component ����������������������������������������������������������������������������������������������������������������������������




const PreviewWordContent = ({
  word,
  speak,
  accent = 'en-US',
  onToggleAccent,
  isEnglish = false,
}: {
  word: any;
  speak: (text: string, overrideAccent?: 'en-US' | 'en-GB') => void;
  accent?: 'en-US' | 'en-GB';
  onToggleAccent?: () => void;
  isEnglish?: boolean;
}) => {
  const { language } = useSettings();
  const data = word.originalData;
  const isKanjiSingle = word.isSingleKanjiChar && data?.character;
  const isKanjiWord = word.isSingleKanjiChar && data?.word; // from kanji.words array
  const isGrammar = !!data?.structure;
  const isVocab = !isKanjiSingle && !isKanjiWord && !isGrammar;

  return (
    <div className="space-y-6">
      {/* ─── HÁN TỰ (Single Kanji) ─── */}
      {isKanjiSingle && (
        <div className="space-y-4">
          <div className="flex gap-6 items-start">
            <div className="shrink-0 flex flex-col items-center">
              <h1 className="text-7xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tight leading-none bg-slate-100 dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                {data.character}
              </h1>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-3">{data.hanViet}</p>
            </div>
            <div className="flex-1 space-y-3 pt-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Âm On</p>
                <p className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-200">{data.onyomi || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Âm Kun</p>
                <p className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-200">{data.kunyomi || '-'}</p>
              </div>
              <button onClick={() => speak(data.character)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                <Volume2 className="w-4 h-4" /> Phát âm
                <kbd className="hidden md:inline bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-[10px] text-slate-500 ml-1">S</kbd>
              </button>
            </div>
          </div>
          {data.mnemonic && (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
              <p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-1">Mẹo nhớ</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.mnemonic}</p>
            </div>
          )}
          {data.words && data.words.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Từ vựng ví dụ</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.words.slice(0, 4).map((w: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <span className="font-black text-slate-800 dark:text-slate-100">{w.word} <span className="text-xs font-normal text-slate-500">({w.hiragana})</span></span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{typeof w.meaning === 'object' ? (language === 'en' && w.meaning.en ? w.meaning.en : w.meaning.vi) : w.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TỪ VỰNG CHỮ HÁN (Kanji Words) ─── */}
      {isKanjiWord && (
        <div className="space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 dark:text-indigo-500">Từ Vựng</p>
          <div className="flex items-end gap-4 flex-wrap">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none break-words">
              {data.word}
            </h1>
            <div className="flex flex-col mb-1">
              <span className="text-lg md:text-xl font-bold text-slate-500 dark:text-slate-400">{data.hiragana}</span>
              {data.hanVietWord && <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">{data.hanVietWord}</span>}
            </div>
          </div>
          <button onClick={() => speak(data.word)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
            <Volume2 className="w-4 h-4" /> Phát âm
            <kbd className="hidden md:inline bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-[10px] text-slate-500 ml-1">S</kbd>
          </button>
          
          <div className="w-12 h-1 rounded-full bg-indigo-300 dark:bg-indigo-700" />
          
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 dark:text-violet-500 mb-1">Nghĩa</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {typeof data.meaning === 'object' ? (language === 'en' && data.meaning.en ? data.meaning.en : data.meaning.vi) : data.meaning}
            </p>
          </div>
          
          {data.examples && data.examples.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ví dụ</p>
              {data.examples.map((ex: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <p className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-300">{ex.jp || ex.en}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'en' && ex.en ? ex.en : ex.vi}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TỪ VỰNG THƯỜNG (Vocab) ─── */}
      {isVocab && (
        <div className="space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 dark:text-indigo-500">Từ Vựng</p>
          <div className="flex items-end gap-4 flex-wrap">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none break-words">
              {data?.kanji || word.kanji}
            </h1>
            {data?.ipaBrE || data?.ipaAmE ? (
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {data?.ipaBrE && (
                  <button
                    type="button"
                    onClick={() => speak(data?.kanji || word.kanji, 'en-GB')}
                    className={`text-xs sm:text-sm font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                      accent === 'en-GB'
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/30 font-bold'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                    }`}
                    title="Nhấn để nghe phát âm Anh (UK)"
                  >
                    🇬🇧 UK: {data.ipaBrE}
                    <Volume2 className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
                {data?.ipaAmE && (
                  <button
                    type="button"
                    onClick={() => speak(data?.kanji || word.kanji, 'en-US')}
                    className={`text-xs sm:text-sm font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                      accent === 'en-US'
                        ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border-sky-400 dark:border-sky-600 ring-2 ring-sky-400/30 font-bold'
                        : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40 hover:bg-sky-100 dark:hover:bg-sky-900/50'
                    }`}
                    title="Nhấn để nghe phát âm Mỹ (US)"
                  >
                    🇺🇸 US: {data.ipaAmE}
                    <Volume2 className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xl md:text-2xl font-bold text-slate-400 dark:text-slate-500 mb-1 tracking-wide">
                {data?.hiragana || word.hiragana}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => speak(data?.kanji || word.kanji)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
              <Volume2 className="w-4 h-4" /> Phát âm
              <kbd className="hidden md:inline bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-[10px] text-slate-500 ml-1">S</kbd>
            </button>
            {isEnglish && onToggleAccent && (
              <button
                type="button"
                onClick={onToggleAccent}
                className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Nhấn để chuyển đổi giữa giọng Anh (UK) và Anh (US)"
              >
                Giọng: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{accent === 'en-US' ? '🇺🇸 US' : '🇬🇧 UK'}</span>
              </button>
            )}
          </div>
          
          <div className="w-12 h-1 rounded-full bg-indigo-300 dark:bg-indigo-700" />
          
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 dark:text-violet-500 mb-1">Nghĩa</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
              {data?.meaning && typeof data.meaning === 'object' ? (language === 'en' && data.meaning.en ? data.meaning.en : data.meaning.vi) : (data?.meaning || word.meaning)}
            </p>
          </div>
          
          {data?.examples && data.examples.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ví dụ</p>
              {data.examples.map((ex: any, i: number) => {
                const exTarget = isEnglish ? (ex.en || ex.jp) : (ex.jp || ex.en);
                const exTrans = isEnglish 
                  ? ex.vi 
                  : (language === 'en' && ex.en ? ex.en : (ex.vi || ex.en));
                return (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <p className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-300">{exTarget}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{exTrans}</p>
                  </div>
                );
              })}
            </div>
          )}
          {(!data?.examples || data.examples.length === 0) && word.exampleKanji && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Ví dụ</p>
              <p className="text-base md:text-lg font-medium text-slate-700 dark:text-slate-300">{word.exampleKanji}</p>
              {word.exampleMeaning && <p className="text-sm text-slate-500 dark:text-slate-400">{word.exampleMeaning}</p>}
            </div>
          )}
        </div>
      )}

      {/* ─── NGỮ PHÁP (Grammar) ─── */}
      {isGrammar && (
        <div className="space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400">Ngữ Pháp</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {data.structure}
          </h1>
          
          <div className="w-12 h-1 rounded-full bg-emerald-400 dark:bg-emerald-600" />
          
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400 dark:text-violet-500 mb-1">Ý nghĩa</p>
            <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
              {typeof data.meaning === 'object' ? (language === 'en' && data.meaning.en ? data.meaning.en : data.meaning.vi) : data.meaning}
            </p>
          </div>
          
          {data.formation && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-2">Cấu trúc</p>
              <p className="text-sm md:text-base font-semibold text-slate-700 dark:text-slate-300 whitespace-pre-line">{data.formation}</p>
            </div>
          )}
          
          {data.examples && data.examples.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ví dụ</p>
              {data.examples.map((ex: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <p className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-300">{ex.jp}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'en' && ex.en ? ex.en : (ex.vi || ex.en)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function LearnSession() {

  const { user, loading: authLoading } = useAuth();
  const { language } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const courseIdParam = searchParams.get('courseId') || searchParams.get('subject') || 'n3-vocab-core';
  const modeParam = searchParams.get('mode') || 'new';
  const lessonParam = searchParams.get('lesson') || null;
  const returnUrl = searchParams.get('returnUrl') || null;

  const { course, loading: courseLoading } = useCourseData(courseIdParam);
  const subjectTitle = course ? course.name : courseIdParam;

  //    Data States                                                         
  const [loading, setLoading] = useState(true);
  const [emptyState, setEmptyState] = useState<'no_due' | 'no_new' | 'no_items' | null>(null);
  const [allRawItems, setAllRawItems] = useState<RawItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionItems, setSessionItems] = useState<RawItem[]>([]);   // 15 từ của phiên
  const [progressMap, setProgressMap] = useState<Map<string, WordProgress>>(new Map()); // for review mode

  //    Session Flow States                                                  
  // batch 0,1,2 (m i batch 5 từ)
  const [phase, setPhase] = useState<'preview' | 'test' | 'done'>('preview');
  const [previewItemIdx, setPreviewItemIdx] = useState(0);        // index trong batch hi!n tại
  const [testQueue, setTestQueue] = useState<QueueItem[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>('none');

  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [userTyping, setUserTyping] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set()); //  ã lưu Firestore
  const [correctCounts, setCorrectCounts] = useState<Map<string, number>>(new Map());


  const [sessionTotalExp, setSessionTotalExp] = useState(0);
  const [isPreviewTransitioning, setIsPreviewTransitioning] = useState(false);
  const [initialTestCount, setInitialTestCount] = useState(0);
  const [correctTestCount, setCorrectTestCount] = useState(0);

  // Khóa đệm chống bấm nhầm câu hỏi tiếp theo khi vừa chuyển câu (300ms)
  const [isInputBlocked, setIsInputBlocked] = useState(false);
  const isInputBlockedRef = useRef(false);
  const inputBlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isInputBlockedRef.current = isInputBlocked;
  }, [isInputBlocked]);

  // Ref để auto-save khi unmount và tracking
  const savedIdsRef = useRef<Set<string>>(new Set());
  const wrongIdsRef = useRef<Set<string>>(new Set());
  const sessionItemsRef = useRef<RawItem[]>([]);
  const progressMapRef = useRef<Map<string, WordProgress>>(new Map());

  // ── Audio ────────────────────────────────────────────────────────────
  const [englishAccent, setEnglishAccent] = useState<'en-US' | 'en-GB'>(() => {
    return (localStorage.getItem('english_accent') as 'en-US' | 'en-GB') || 'en-US';
  });

  const speak = (text: string, overrideAccent?: 'en-US' | 'en-GB') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text ? text.trim() : '';
    if (!cleanText) return;

    const u = new SpeechSynthesisUtterance(cleanText);
    const targetAccent = overrideAccent || englishAccent || localStorage.getItem('english_accent') || 'en-US';
    if (overrideAccent && overrideAccent !== englishAccent) {
      setEnglishAccent(overrideAccent);
      localStorage.setItem('english_accent', overrideAccent);
    }

    const isJp = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(cleanText);
    const isVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleanText);
    const isKo = /[\uac00-\ud7af\u1100-\u11ff]/.test(cleanText);

    if (course?.template === 'english') {
      u.lang = targetAccent;
    } else if (isJp) {
      u.lang = 'ja-JP';
    } else if (isVi) {
      u.lang = 'vi-VN';
    } else if (isKo) {
      u.lang = 'ko-KR';
    } else if (/^[a-zA-Z0-9\s.,!?'"()/-]+$/.test(cleanText)) {
      u.lang = targetAccent;
    } else {
      u.lang = 'ja-JP';
    }
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const toggleEnglishAccent = () => {
    const next = englishAccent === 'en-US' ? 'en-GB' : 'en-US';
    setEnglishAccent(next);
    localStorage.setItem('english_accent', next);
    if (phaseRef2.current === 'preview' && currentBatchRef.current[previewIdxRef2.current]) {
      speak(currentBatchRef.current[previewIdxRef2.current].kanji, next);
    }
  };

  // ���� Navigation ������������������������������������������������������������������������������������������������������������������
  const goBack = () => {
    if (returnUrl) navigate(returnUrl);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/learn');
  };

  // ���� currentBatch (must be before keyboard useEffect to avoid TDZ) ������������
  // NOTE: sessionItems is empty on mount, this is safe because keyboard handler
  // only runs after user interaction, by which time sessionItems is populated.
  const currentBatchRef = useRef<RawItem[]>([]);

  // ���� Keyboard Shortcuts ��������������������������������������������������������������������������������������������������
  const startTestRef = useRef<(batch?: RawItem[]) => void>(() => { });
  const submitQuizRef = useRef<(v: string) => void>(() => { });
  const submitTypingRef = useRef<() => void>(() => { });
  const speakRef = useRef<(t: string) => void>(() => { });

  // Refs for volatile state used in keyboard handler (mount-once effect)
  const phaseRef2 = useRef(phase);
  const previewIdxRef2 = useRef(previewItemIdx);
  const feedbackRef2 = useRef(feedback);
  const currentQRef2 = useRef<typeof currentQ>(null);
  const quizOptionsRef2 = useRef<string[]>([]);

  useEffect(() => { phaseRef2.current = phase; }, [phase]);
  useEffect(() => { previewIdxRef2.current = previewItemIdx; }, [previewItemIdx]);
  useEffect(() => { feedbackRef2.current = feedback; }, [feedback]);
  useEffect(() => { quizOptionsRef2.current = quizOptions; }, [quizOptions]);
  const userTypingRef = useRef(userTyping);
  useEffect(() => { userTypingRef.current = userTyping; }, [userTyping]);

  const currentQIdxRef = useRef(currentQIdx);
  useEffect(() => { currentQIdxRef.current = currentQIdx; }, [currentQIdx]);

  const testQueueRef = useRef(testQueue);
  useEffect(() => { testQueueRef.current = testQueue; }, [testQueue]);

  const handleBatchDoneRef = useRef<() => void>(() => { });

  const setCurrentQIdxRef = useRef(setCurrentQIdx);
  useEffect(() => { setCurrentQIdxRef.current = setCurrentQIdx; }, [setCurrentQIdx]);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      const ph = phaseRef2.current;
      const pidx = previewIdxRef2.current;
      const fb = feedbackRef2.current;
      const cQ = currentQRef2.current;
      const opts = quizOptionsRef2.current;
      const batch = currentBatchRef.current;

      // PREVIEW Phase (Global)
      if (ph === 'preview') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (pidx + 1 < batch.length) setPreviewItemIdx(i => i + 1);
          else startTestRef.current();
        }
        return;
      }

      if (ph !== 'test' || !cQ) return;

      // Nút Tiếp Tục (Khi đang hiện Feedback hoặc Re-learn Preview)
      if (fb !== 'none' || cQ.phase === 'preview') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (cQ.phase === 'preview') {
            // Re-learn preview inside test queue
            const nextIdx = currentQIdxRef.current + 1;
            if (nextIdx >= testQueueRef.current.length) {
              handleBatchDoneRef.current();
            } else {
              setCurrentQIdxRef.current(nextIdx);
            }
          } else {
            advanceNextRef.current();
          }
        }
        return;
      }

      // QUIZ: 1-4 & Enter (chỉ nhận khi không bị khóa đệm 300ms)
      if (cQ.phase === 'quiz' && !isInputBlockedRef.current) {
        const quizOpts = (cQ as any).quizOptions?.length ? (cQ as any).quizOptions : opts;
        if (e.key === 'Enter') {
          e.preventDefault();
          submitQuizRef.current(''); // nộp đáp án trống -> sai
        } else {
          const num = parseInt(e.key);
          if (num >= 1 && num <= quizOpts.length) { e.preventDefault(); submitQuizRef.current(quizOpts[num - 1]); }
        }
      }

      // TYPING: Enter (chỉ nhận khi không bị khóa đệm 300ms)
      if (cQ.phase === 'typing' && e.key === 'Enter' && !isInputBlockedRef.current) {
        e.preventDefault();
        submitTypingRef.current(); // Không cần check trống, submitTyping tự xử lý
      }

      // S: Phát âm (Chỉ cho phép ở Preview hoặc khi đã lật kết quả)
      if ((e.key === 's' || e.key === 'S') && cQ) {
        if (ph === 'test' && fb === 'none') {
          // Block audio during active test
        } else {
          e.preventDefault();
          speakRef.current(cQ.raw.kanji);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // mount once

  // ���� Save 1 từ lên Firestore ����������������������������������������������������������������������������������������
  const saveItem = useCallback(async (raw: RawItem) => {
    if (!user || savedIdsRef.current.has(raw.id)) return;
    try {
      if (modeParam === 'review') {
        const existing = progressMapRef.current.get(raw.id);
        if (existing) {
          const updated = onCorrectLongTerm(existing);
          await saveWordProgress(user.uid, updated);

          const isLevelUp = updated.masteryLevel > existing.masteryLevel;
          let expType: 'review' | 'review_up' | 'maintain_max' = 'review';
          if (existing.masteryLevel === 7 && updated.masteryLevel === 7) {
            expType = 'maintain_max';
          } else if (isLevelUp) {
            expType = 'review_up';
          }
          
          const { recordSrsExp } = await import('../../lib/srs/pointsEngine');
          const exp = await recordSrsExp(user.uid, expType, courseIdParam, existing.masteryLevel);
          setSessionTotalExp(prev => prev + exp);

          savedIdsRef.current.add(raw.id);
          setSavedIds(prev => new Set([...prev, raw.id]));
        }
      }
    } catch (e) {
      console.error('Save error:', e);
    }
  }, [user, modeParam]);

  // ���� Auto-save khi unmount (anti data loss) ��������������������������������������������������������
  useEffect(() => {
    sessionItemsRef.current = sessionItems;
  }, [sessionItems]);

  useEffect(() => {
    progressMapRef.current = progressMap;
  }, [progressMap]);

  useEffect(() => {
    return () => {
      // Khi unmount: save các từ �ã trả lời �úng �0�1 lần nhưng chưa lưu
      if (!user) return;
      correctCounts.forEach((count, id) => {
        if (count >= 1 && !savedIdsRef.current.has(id)) {
          const raw = sessionItemsRef.current.find(r => r.id === id);
          if (raw) saveItem(raw); // fire and forget
        }
      });
    };
  }, [user]); // eslint-disable-line

  // Dọn dẹp âm thanh và timer khi người dùng thoát phiên học
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (inputBlockTimerRef.current) {
        clearTimeout(inputBlockTimerRef.current);
      }
    };
  }, []);

  // ���� Init Session ��������������������������������������������������������������������������������������������������������������
  useEffect(() => {
    if (authLoading) return;
    // Chờ custom course load xong (quan trọng cho courseId = custom_xxx)
    if (courseLoading) return;

    async function init() {
      setLoading(true);
      setEmptyState(null);
      try {
        if (!course) return;
        const rawAll = buildRawList(course, language);
        setAllRawItems(rawAll);

        let scopeList = lessonParam ? rawAll.filter(i => i.lesson === lessonParam) : rawAll;
        if (scopeList.length === 0) { setEmptyState('no_items'); return; }

        if (!user) {
          // Not logged in → stop loading and show empty state
          setLoading(false);
          return;
        }

        // Đọc sessionSize từ user settings
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../lib/firebase');
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const learnSettings = userSnap.exists() ? userSnap.data()?.learnSettings : null;
        const sessionSize = modeParam === 'review' ? (learnSettings?.reviewSessionSize ?? 30) : (learnSettings?.sessionSize ?? 5);


        if (modeParam === 'review') {
          const dueList = await fetchDueItems(user.uid, course.id);
          const scopeIds = new Set(scopeList.map(i => i.id));
          const due = dueList.filter(d => scopeIds.has(d.itemId));
          if (due.length === 0) { setEmptyState('no_due'); return; }

          // Build progressMap for review mode
          const pMap = new Map<string, WordProgress>();
          due.forEach(p => pMap.set(p.itemId, p));
          setProgressMap(pMap);
          progressMapRef.current = pMap;

          const dueIds = new Set(due.map(d => d.itemId));
          let items = scopeList.filter(i => dueIds.has(i.id));
          
          // Shuffle items ngẫu nhiên cho chế độ Ôn tập
          for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
          }
          items = items.slice(0, sessionSize);
          
          setSessionItems(items);
          sessionItemsRef.current = items;

          // Trực tiếp vào test luôn đối với ôn tập (Skip preview)
          currentBatchRef.current = items;
          setPhase('test');
          setTimeout(() => {
            // trigger startTest
            startTestRef.current(items);
          }, 0);
        } else {
          const learnedSet = await getLearnedItemIds(user.uid, course.id);
          const newIds = getNewItemIds(scopeList.map(i => i.id), learnedSet, sessionSize);
          if (newIds.length === 0) { setEmptyState('no_new'); return; }
          const newIdSet = new Set(newIds);
          const items = scopeList.filter(i => newIdSet.has(i.id));
          setSessionItems(items);
          sessionItemsRef.current = items;
        }
      } catch (err) {
        console.error('Init session error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [courseIdParam, modeParam, lessonParam, user, authLoading, courseLoading, refreshKey, language, course]);


  //    Computed: batch hi!n tại                                            
  const currentBatch = useMemo(() => {
    currentBatchRef.current = sessionItems; // sync ref for keyboard handler
    return sessionItems;
  }, [sessionItems]);

  const handleBatchDone = useCallback(async () => {
    setPhase('done');
    if (!user) return;
    if (modeParam === 'new') {
      const { batchSyncProgressToFirestore } = await import('../../lib/srs/firestoreSync');
      const { recordSrsExp } = await import('../../lib/srs/pointsEngine');
      const newProgresses = sessionItemsRef.current.map(raw =>
        createGraduatedProgress(raw.id, courseIdParam, (course?.subject || 'vocab') as SRSSubject)
      );

      await batchSyncProgressToFirestore(user.uid, newProgresses);

      let expGained = 0;
      for (let i = 0; i < newProgresses.length; i++) {
        expGained += await recordSrsExp(user.uid, 'new', courseIdParam, 1);
      }
      setSessionTotalExp(expGained);
      setSavedIds(new Set(newProgresses.map(p => p.itemId)));
      savedIdsRef.current = new Set(newProgresses.map(p => p.itemId));
    }
  }, [user, modeParam, courseIdParam, course]);
  useEffect(() => { handleBatchDoneRef.current = handleBatchDone; }, [handleBatchDone]);

  const handleReviewWrong = useCallback(async (raw: RawItem) => {
    if (!user) return;
    const existing = progressMapRef.current.get(raw.id);
    if (existing) {
      const updated = onWrongLongTerm(existing);
      await saveWordProgress(user.uid, updated);

      try {
        const { doc, updateDoc, increment } = await import('firebase/firestore');
        const { db } = await import('../../lib/firebase');
        const today = new Date().toLocaleDateString('en-CA');
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          [`activityReviews.${today}`]: increment(1)
        });
      } catch (e) {
        console.error('Error recording review wrong count:', e);
      }
    }
  }, [user]);

  //    Preview Phase Handlers                                              
  const startTest = useCallback((batch = currentBatchRef.current) => {
    const q = buildBatchQueue(batch, modeParam || 'new');
    // Sinh quiz options cho từng câu quiz ngay từ  ầu
    const allMeanings = allRawItems.map(i => i.meaning);
    const allKanji = allRawItems.map(i => i.kanji);
    // Attach quizOptions vào từng QueueItem quiz
    const qWithOpts = q.map(qi => {
      if (qi.phase === 'quiz') {
        const correct = qi.direction === 'fwd' ? qi.raw.meaning : qi.raw.kanji;
        const pool = qi.direction === 'fwd' ? allMeanings : allKanji;
        return { ...qi, quizOptions: generateQuizOptions(correct, pool) };
      }
      return qi;
    });
    setTestQueue(qWithOpts as any);
    setInitialTestCount(qWithOpts.length);
    setCorrectTestCount(0);
    setCurrentQIdx(0);
    setPhase('test');
    setFeedback('none');

    setUserTyping('');
  }, [currentBatch, allRawItems]);
  useEffect(() => { startTestRef.current = startTest; }, [startTest]);

  //    Test Phase: lấy câu hi!n tại                                       
  const currentQ: (QueueItem & { quizOptions?: string[] }) | null = testQueue[currentQIdx] ?? testQueue[testQueue.length - 1] ?? null;

  // Sinh quiz options khi mount câu m:i (fallback nếu chưa có)
  useEffect(() => {
    if (!currentQ || currentQ.phase !== 'quiz' || (currentQ as any).quizOptions) return;
    const allMeanings = allRawItems.map(i => i.meaning);
    const allKanji = allRawItems.map(i => i.kanji);
    const correct = currentQ.direction === 'fwd' ? currentQ.raw.meaning : currentQ.raw.kanji;
    const pool = currentQ.direction === 'fwd' ? allMeanings : allKanji;
    setQuizOptions(generateQuizOptions(correct, pool));
  }, [currentQIdx, testQueue]);

  useEffect(() => {
    if (currentQ?.phase === 'quiz') {
      setQuizOptions((currentQ as any).quizOptions || []);
    }
  }, [currentQIdx, testQueue]);

  // ── Auto Play Audio (Preview Only) ──────────────────────────────────
  useEffect(() => {
    if (phase === 'preview' && currentBatch[previewItemIdx]) {
      speak(currentBatch[previewItemIdx].kanji);
    }
  }, [phase, previewItemIdx, currentBatch]);

  // ── Handle Answer ──────────────────────────────────────────────────
  const handleAnswer = useCallback((isCorrect: boolean, raw: RawItem) => {
    setFeedback(isCorrect ? 'correct' : 'wrong');

    // Tự động phát âm thanh của THUẬT NGỮ (raw.kanji) khi biết kết quả đúng/sai
    // Tuyệt đối chỉ đọc thuật ngữ (raw.kanji), không bao giờ đọc định nghĩa/nghĩa tiếng Việt
    if (raw?.kanji) {
      speak(raw.kanji);
    }

    if (isCorrect) {
      setCorrectTestCount(c => c + 1);
    } else {
      wrongIdsRef.current.add(raw.id);
    }

    // Cập nhật correct counts và trigger saveItem một cách an toàn
    setCorrectCounts(prev => {
      const current = prev.get(raw.id) || 0;
      if (isCorrect && current === 0) {
        // Chỉ thưởng EXP và tăng Level (qua saveItem) nếu họ KHÔNG làm sai từ này trong toàn bộ phiên!
        if (!wrongIdsRef.current.has(raw.id)) {
          saveItem(raw);
        }
      }
      const next = new Map(prev);
      next.set(raw.id, current + (isCorrect ? 1 : 0));
      return next;
    });
  }, [saveItem]);


  const advanceNext = useCallback(() => {
    if (!currentQ) return;
    if (feedback === 'none' && currentQ.phase !== 'preview') return;

    // Ngắt ngay lập tức mọi âm thanh đang phát để không bị lọt sang câu sau
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (currentQ.phase === 'preview') {
      const nextIdx = currentQIdx + 1;
      if (nextIdx >= testQueue.length) {
        handleBatchDone();
      } else {
        setCurrentQIdx(nextIdx);
      }
      return;
    }

    // Kích hoạt khóa đệm an toàn 300ms chống bấm nhầm câu sau khi vừa chuyển câu
    setIsInputBlocked(true);
    isInputBlockedRef.current = true;
    if (inputBlockTimerRef.current) clearTimeout(inputBlockTimerRef.current);
    inputBlockTimerRef.current = setTimeout(() => {
      setIsInputBlocked(false);
      isInputBlockedRef.current = false;
    }, 300);

    setFeedback('none');

    setUserTyping('');
    setSelectedOpt(null);

    if (feedback === 'wrong') {
      if (modeParam === 'review') {
        handleReviewWrong(currentQ.raw);
      }
      setTestQueue(prev => {
        const wrongItem = { ...prev[currentQIdx], attempt: (prev[currentQIdx].attempt || 0) + 1 } as any;
        if (wrongItem.phase === 'quiz') {
          const allMeanings = allRawItems.map(i => i.meaning);
          const allKanji = allRawItems.map(i => i.kanji);
          const correct = wrongItem.direction === 'fwd' ? wrongItem.raw.meaning : wrongItem.raw.kanji;
          const pool = wrongItem.direction === 'fwd' ? allMeanings : allKanji;
          wrongItem.quizOptions = generateQuizOptions(correct, pool);
        }
        const previewItem: QueueItem = { ...wrongItem, phase: 'preview' };
        const remaining = [...prev];
        remaining.splice(currentQIdx, 1, previewItem); // Chèn Preview vào ngay vị trí hiện tại
        return [...remaining, wrongItem]; // Đẩy câu hỏi sai xuống cuối
      });
      // Không tăng currentQIdx vì ta muốn hiển thị ngay thẻ Preview vừa chèn
      return;
    }

    const nextIdx = currentQIdx + 1;
    if (nextIdx >= testQueue.length) {
      handleBatchDone();
    } else {
      setCurrentQIdx(nextIdx);
    }
  }, [currentQ, currentQIdx, testQueue, feedback, modeParam, handleReviewWrong, handleBatchDone, allRawItems]);

  // Expose advanceNext to ref for keyboard
  const advanceNextRef = useRef(advanceNext);
  useEffect(() => { advanceNextRef.current = advanceNext; }, [advanceNext]);

  // Auto-advance for feedback: Cả Đúng và Sai đều là 2.0s (2000ms) để nghe trọn vẹn phát âm
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (feedback === 'wrong' || feedback === 'correct') {
      timer = setTimeout(() => {
        advanceNextRef.current();
      }, 2000); // 2.0s
    }
    return () => clearTimeout(timer);
  }, [feedback]);

  // ── Skip Button Logic ──────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (!currentQ || feedback !== 'none' || isInputBlocked) return;
    handleAnswer(false, currentQ.raw);
  }, [currentQ, feedback, isInputBlocked, handleAnswer]);


  // ── Quiz Submit ────────────────────────────────────────────────────
  const submitQuiz = useCallback((selected: string) => {
    if (!currentQ || feedback !== 'none' || isInputBlocked) return;
    setSelectedOpt(selected);
    const correct = currentQ.direction === 'fwd' ? currentQ.raw.meaning : currentQ.raw.kanji;
    handleAnswer(selected === correct, currentQ.raw);
  }, [currentQ, feedback, isInputBlocked, handleAnswer]);
  useEffect(() => { submitQuizRef.current = submitQuiz; }, [submitQuiz]);

  // ── Typing Submit ──────────────────────────────────────────────────
  const submitTyping = useCallback(() => {
    if (!currentQ || feedback !== 'none' || isInputBlocked) return;
    const raw = currentQ.raw;
    let correct = false;

    if (course?.template === 'english') {
      // English: show meaning → type the English word (stored in raw.kanji)
      correct = checkEnglishWordMatch(userTyping, raw.kanji);
    } else if (course?.template === 'generic') {
      // Generic: show definition → type the term
      correct = userTyping.trim().toLowerCase() === raw.kanji.trim().toLowerCase();
    } else if (raw.isSingleKanjiChar) {
      correct = userTyping.trim().toUpperCase() === raw.hiragana.trim().toUpperCase();
    } else {
      const target = raw.hiragana.trim();
      const converted = wanakana.toKana(userTyping.trim());
      correct =
        wanakana.toHiragana(converted) === wanakana.toHiragana(target) ||
        userTyping.trim().toLowerCase() === target.toLowerCase();
    }

    handleAnswer(correct, raw);
  }, [currentQ, feedback, isInputBlocked, course, userTyping, handleAnswer]);
  useEffect(() => { submitTypingRef.current = submitTyping; }, [submitTyping]);
  useEffect(() => { speakRef.current = speak; }, [speak]);
  useEffect(() => { currentQRef2.current = currentQ; }, [currentQ]);

  // ── Mark as Mastered (bỏ qua) ──────────────────────────────────────────
  const handleMarkMastered = async (raw: RawItem) => {
    if (!user) return;
    const prog = markAsMasteredUser(raw.id, courseIdParam, (course?.subject || 'vocab') as SRSSubject);
    await saveWordProgress(user.uid, prog);

    // Đã biết từ này -> level lên thẳng 2 -> nhảy cóc (10 EXP)
    const { recordSrsExp } = await import('../../lib/srs/pointsEngine');
    const exp = await recordSrsExp(user.uid, 'skip_to_lv2', courseIdParam, 2);
    setSessionTotalExp(prev => prev + exp);

    savedIdsRef.current.add(raw.id);
    setSavedIds(prev => new Set([...prev, raw.id]));

    // Xóa item đã Mark Mastered ra khỏi sessionItems để không xuất hiện trong test queue
    setSessionItems(prev => prev.filter(item => item.id !== raw.id));

    // Bỏ qua từ này trong preview, chuyển sang từ tiếp theo
    if (previewItemIdx + 1 < currentBatch.length) {
      setPreviewItemIdx(i => i + 1);
    } else {
      startTest();
    }
  };

  // ── Render Loading ─────────────────────────────────────────────────────
  if (loading || authLoading || courseLoading) {
    return (
      <div className="min-h-[calc(100dvh-57px)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Đang tải phiên học...</p>
        </div>
      </div>
    );
  }

  // ── Render Empty States ────────────────────────────────────────────────
  if (emptyState) {
    const configs = {
      no_due: { icon: '🎉', bg: 'bg-emerald-500', title: 'Chưa có từ đến hạn!', desc: 'Tất cả từ đang được ôn đúng lịch. Hãy học từ mới!', actionLabel: 'Học Từ Mới', actionMode: 'new' },
      no_new: { icon: '🎓', bg: 'bg-amber-500', title: 'Đã học hết từ mới!', desc: 'Bạn đã hoàn thành toàn bộ từ mới. Hãy ôn tập định kỳ!', actionLabel: 'Chuyển Ôn Tập', actionMode: 'review' },
      no_items: { icon: '📭', bg: 'bg-slate-500', title: 'Không tìm thấy từ!', desc: 'Không có từ nào phù hợp.', actionLabel: '', actionMode: null },
    };
    const cfg = configs[emptyState];
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className={`w-20 h-20 mx-auto rounded-2xl ${cfg.bg} flex items-center justify-center text-4xl shadow-lg`}>{cfg.icon}</div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">{cfg.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{cfg.desc}</p>
          </div>
          <div className="flex flex-col gap-3">
            {cfg.actionMode && (
              <button onClick={() => navigate(`/learn/session?courseId=${courseIdParam}${lessonParam ? `&lesson=${encodeURIComponent(lessonParam)}` : ''}&mode=${cfg.actionMode}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-colors">
                <Sparkles className="w-4 h-4" /> {cfg.actionLabel}
              </button>
            )}
            <button onClick={goBack} className="w-full py-3.5 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-medium text-sm rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600/40">
              ← Quay Lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────

  const Header = () => {
    let progressPct = 0;
    let barColor = "bg-indigo-500 dark:bg-indigo-600";
    let text = "";

    if (phase === 'preview') {
      const current = isPreviewTransitioning ? previewItemIdx + 1 : previewItemIdx;
      progressPct = (current / currentBatch.length) * 100;
      barColor = "bg-emerald-500 dark:bg-emerald-600";
      text = `${current} / ${currentBatch.length}`;
    } else if (phase === 'test') {
      // Use correctTestCount instead of currentQIdx to only track correct answers against a fixed total
      const current = correctTestCount;
      progressPct = (current / initialTestCount) * 100;
      barColor = "bg-indigo-500 dark:bg-indigo-600";
      text = `${current} / ${initialTestCount}`;
    } else if (phase === 'done') {
      progressPct = 100;
      barColor = "bg-indigo-500 dark:bg-indigo-600";
    }

    // Allow the progress bar to be exactly 0% at the start
    progressPct = Math.max(0, progressPct);

    return (
      <div className="w-full bg-white dark:bg-slate-950 flex flex-col shrink-0 border-b border-slate-100 dark:border-slate-800">

        <button onClick={goBack} className="w-full block bg-slate-100 dark:bg-slate-900/80 group hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer border-none outline-none relative py-3 px-4 md:px-8">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center font-bold text-sm md:text-base w-[90%]">
              <span className="inline-block pb-1 truncate max-w-full text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors underline decoration-2 underline-offset-4 decoration-slate-400 dark:decoration-slate-600 group-hover:decoration-indigo-500 dark:group-hover:decoration-indigo-400">
                {course?.name || subjectTitle}{lessonParam ? ` · ${lessonParam}` : ''}
              </span>
            </div>

            <div className="flex items-center justify-end w-[10%]">
              <div className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-800 group-hover:bg-slate-300 dark:group-hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
                <X className="w-4 h-4 stroke-[3]" />
              </div>
            </div>
          </div>
        </button>

        {/* Progress bar */}
        <div className="w-full flex justify-center py-2 bg-white dark:bg-slate-950">
          <div className="relative w-full max-w-2xl mx-4 md:mx-auto h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-700/50">
            <div className={`absolute left-0 top-0 h-full transition-all duration-500 ease-out rounded-full ${barColor}`} style={{ width: `${progressPct}%` }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] md:text-xs font-black text-white mix-blend-difference tracking-[0.2em]">
                {text}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (phase === 'preview') {
    const previewWord = currentBatch[previewItemIdx];
    if (!previewWord) { startTest(); return null; }
    const masteryLv = progressMap.get(previewWord.id)?.masteryLevel ?? 0;

    return (
      <div className="h-[calc(100dvh-57px)] flex flex-col bg-white dark:bg-slate-950 overflow-hidden font-sans">
        <Header />

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col px-5 md:px-14 pt-5 pb-5 gap-4">
          <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 min-h-0 gap-3">

            {/* Top toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
              {/* Tag */}
              <div className="flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Học mới</span>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Nhảy cóc (Mobile) */}
              {masteryLv < 2 && (
                <button
                  onClick={() => handleMarkMastered(previewWord)}
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-200/60 dark:border-amber-700/60 active:scale-95 transition-transform"
                  title="Nhảy cóc, bỏ qua việc học và lên thẳng Level 2"
                >
                  <ChevronsUp className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}

              {/* Mastery badge (Mobile) */}
              <div className="md:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <MasteryIcon level={masteryLv} size="md" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center bg-indigo-500 text-white text-[9px] font-black rounded-full shadow-sm border border-white dark:border-slate-900">
                  {masteryLv}
                </div>
              </div>
            </div>

            {/* Main content row */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row md:gap-8 md:items-start pt-2">

              {/* Word content (scrollable) */}
              <motion.div
                key={previewWord.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full pb-12"
              >
                <PreviewWordContent
                  word={previewWord}
                  speak={speak}
                  accent={englishAccent}
                  onToggleAccent={toggleEnglishAccent}
                  isEnglish={course?.template === 'english'}
                />
              </motion.div>

              {/* Right Side Column (Next + Mastered) */}
              <div className="shrink-0 mt-8 md:mt-0 w-full md:w-24 flex flex-col items-center justify-center gap-3">
                <button
                  disabled={isPreviewTransitioning}
                  onClick={() => {
                    if (previewItemIdx + 1 < currentBatch.length) {
                      setPreviewItemIdx(i => i + 1);
                    } else {
                      setIsPreviewTransitioning(true);
                      setTimeout(() => {
                        startTest();
                        setIsPreviewTransitioning(false);
                      }, 800);
                    }
                  }}
                  className="group relative w-full md:w-24 h-14 md:h-24 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-400 text-white transition-all duration-150 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 active:scale-95 flex items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  {previewItemIdx + 1 < currentBatch.length ? (
                    <ChevronRight size={36} className="stroke-[3.5] relative z-10" />
                  ) : (
                    <Swords size={32} className="stroke-[2.5] relative z-10" />
                  )}
                </button>

                {/* Nhảy cóc (Desktop) */}
                {masteryLv < 2 && (
                  <button
                    onClick={() => handleMarkMastered(previewWord)}
                    className="hidden md:flex group relative w-24 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold transition-all duration-150 active:scale-95 items-center justify-center flex-col gap-1 border-2 border-amber-200/60 dark:border-amber-700/60"
                    title="Nhảy cóc, bỏ qua việc học và lên thẳng Level 2"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-center leading-tight">Lv.2</span>
                    <ChevronsUp className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}

                {/* Mastery badge (Desktop) */}
                <div className="hidden md:flex relative items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-sm mt-2">
                  <MasteryIcon level={masteryLv} size="lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center bg-indigo-500 text-white text-[10px] font-black rounded-full shadow-sm border border-white dark:border-slate-900">
                    {masteryLv}
                  </div>
                </div>


              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── TEST Phase ─────────────────────────────────────────────────────────
  if (!currentQ) return null;



  const correctAns = currentQ.direction === 'fwd' ? currentQ.raw.meaning : currentQ.raw.kanji;

  return (
    <div className="h-[calc(100dvh-57px)] bg-white dark:bg-slate-950 text-slate-800 dark:text-white flex flex-col font-sans overflow-hidden">
      <Header />
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="w-full max-w-4xl flex flex-col gap-3">

          {/* Top toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
            {/* Phase tag */}
            <div className={`flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold ${currentQ.phase === 'quiz' ? 'text-indigo-600 dark:text-indigo-400'
                : currentQ.phase === 'preview' ? 'text-amber-600 dark:text-amber-400'
                  : 'text-violet-600 dark:text-violet-400'
              }`}>
              {currentQ.phase === 'preview' ? (
                <><RotateCcw className="w-4 h-4" /> <span>Ôn lại</span></>
              ) : currentQ.phase === 'quiz' ? (
                <><MousePointerClick className="w-4 h-4" /> <span>Trắc nghiệm</span></>
              ) : (
                <><Keyboard className="w-4 h-4" /> <span>Điền từ</span></>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Đã thuộc */}
            {(progressMap.get(currentQ.raw.id)?.masteryLevel ?? 0) < 2 && (
              <button
                onClick={() => handleMarkMastered(currentQ.raw)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-200/60 dark:border-amber-700/60 active:scale-95 transition-transform"
              >
                <ChevronsUp className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            {/* Mastery badge */}
            <div className="md:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
              <MasteryIcon level={progressMap.get(currentQ.raw.id)?.masteryLevel ?? 0} size="md" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center bg-indigo-500 text-white text-[9px] font-black rounded-full shadow-sm border border-white dark:border-slate-900">
                {progressMap.get(currentQ.raw.id)?.masteryLevel ?? 0}
              </div>
            </div>


          </div>


          {/* Main content row */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row md:gap-8 md:items-start pt-2">
            {/* Content (scrollable) */}
            <motion.div
              key={`${currentQ.raw.id}-${currentQIdx}-${currentQ.phase}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex-1 min-h-0 space-y-4 md:space-y-6 pb-6 md:pb-12"
            >
              {/* ─── PREVIEW (Re-learn) ─── */}
              {currentQ.phase === 'preview' ? (
                <PreviewWordContent
                  word={currentQ.raw}
                  speak={speak}
                  accent={englishAccent}
                  onToggleAccent={toggleEnglishAccent}
                  isEnglish={course?.template === 'english'}
                />
              ) : (
                /* ─── QUIZ/TYPING PROMPT ─── */
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 dark:text-indigo-500 mb-1 md:mb-2">
                    {currentQ.direction === 'fwd'
                      ? (course?.template === 'english' ? 'English Word' : (course?.template === 'generic' ? 'Thuật ngữ / Khái niệm' : '日本語 · Japanese'))
                      : (course?.template === 'generic' ? 'Định nghĩa' : 'Nghĩa · Vietnamese')}
                  </p>
                  <div className="flex items-start justify-between gap-3">
                    <h1 className={`font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] break-words flex-1 ${currentQ.direction === 'rev'
                        ? 'text-4xl md:text-5xl'
                        : 'text-6xl md:text-7xl'
                      }`}>
                      {currentQ.direction === 'fwd' ? currentQ.raw.kanji : cleanQuizMeaning(currentQ.raw.meaning, currentQ.raw.kanji)}
                    </h1>
                    {feedback !== 'none' && (
                      <button
                        type="button"
                        onClick={() => speak(currentQ.raw.kanji)}
                        className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/40 transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs animate-in fade-in zoom-in duration-200"
                        title="Nghe lại phát âm thuật ngữ (Phím tắt: S)"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── QUIZ ─── */}
              {currentQ.phase === 'quiz' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 pt-2 md:pt-4">
                  {((currentQ as any).quizOptions?.length ? (currentQ as any).quizOptions : quizOptions).map((opt: string, i: number) => {
                    const isCorrectOpt = feedback !== 'none' && opt === correctAns;
                    const isSelectedWrong = feedback === 'wrong' && opt === selectedOpt;
                    const isDimmed = feedback !== 'none' && !isCorrectOpt && !isSelectedWrong;
                    return (
                      <button key={i} onClick={() => submitQuiz(opt)} disabled={feedback !== 'none' || isInputBlocked}
                        className={`group py-3 md:py-4 px-4 md:px-5 rounded-2xl text-sm font-semibold border-2 transition-all text-left flex items-center gap-3 ${isCorrectOpt
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300'
                          : isSelectedWrong
                            ? 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-500 text-red-700 dark:text-red-300'
                            : isDimmed
                              ? 'opacity-30 border-slate-200 dark:border-slate-700'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm'
                          } disabled:cursor-default`}>
                        <span className={`shrink-0 w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center ${isCorrectOpt ? 'bg-emerald-200 dark:bg-emerald-700/50 text-emerald-700 dark:text-emerald-300'
                          : isSelectedWrong ? 'bg-red-200 dark:bg-red-700/50 text-red-700 dark:text-red-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          }`}>{i + 1}</span>
                        <span className="leading-snug">{currentQ.direction === 'fwd' ? cleanQuizMeaning(opt, currentQ.raw.kanji) : opt}</span>
                      </button>
                    );
                  })}
                  {/* Keyboard hint */}
                  <p className="hidden md:block col-span-full mt-2 text-xs text-slate-400 dark:text-slate-600 text-left font-medium">
                    Phím 1–4 chọn nhanh
                  </p>
                </div>
              )}

              {/* ─── TYPING ─── */}
              {currentQ.phase === 'typing' && (
                <div className="space-y-4 pt-4 max-w-lg">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {currentQ.raw.isSingleKanjiChar
                      ? 'Gõ Âm Hán Việt (VD: NHIỆM)'
                      : course?.template === 'english'
                        ? 'Type the English word'
                        : course?.template === 'generic'
                          ? 'Gõ chính xác thuật ngữ'
                          : 'Gõ Romaji (sẽ tự chuyển Hiragana)'}
                  </p>
                  <input type="text" value={userTyping}
                    onChange={e => {
                      if (!currentQ.raw.isSingleKanjiChar && course?.template !== 'english' && course?.template !== 'generic') {
                        const isExpectedKatakana = /^[\u30A0-\u30FF\u30FC\s]+$/.test(currentQ.raw.hiragana);
                        if (isExpectedKatakana) {
                          setUserTyping(wanakana.toKatakana(e.target.value, { IMEMode: true }));
                        } else {
                          setUserTyping(wanakana.toHiragana(e.target.value, { IMEMode: true }));
                        }
                      } else {
                        setUserTyping(e.target.value);
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') submitTyping(); }}
                    placeholder={currentQ.raw.isSingleKanjiChar
                      ? 'Âm Hán Việt...'
                      : course?.template === 'english'
                        ? 'Type the word...'
                        : course?.template === 'generic'
                          ? 'Nhập thuật ngữ...'
                          : 'Romaji...'}
                    disabled={feedback !== 'none' || isInputBlocked}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full py-4 px-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-left font-black text-2xl text-indigo-600 dark:text-indigo-400 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-all disabled:opacity-60 shadow-sm"
                  />

                  {feedback === 'wrong' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-red-500 dark:text-red-400 mt-2">
                      Đáp án đúng: {course?.template === 'english' ? formatWordVariantsDisplay(currentQ.raw.kanji) : (course?.template === 'generic' ? currentQ.raw.kanji : currentQ.raw.hiragana)}
                    </motion.div>
                  )}
                </div>
              )}


            </motion.div>

            {/* Right Side Column (Next + Mastered) */}
            <div className="shrink-0 mt-8 md:mt-0 w-full md:w-24 flex flex-col items-center justify-center gap-3">

              {currentQ.phase === 'preview' || feedback !== 'none' ? (
                <motion.button
                  key="next-btn"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={advanceNext}
                  className={`group relative w-full md:w-24 h-14 md:h-24 rounded-2xl text-white transition-all duration-150 shadow-md active:scale-95 flex items-center justify-center overflow-hidden ${feedback === 'correct'
                      ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/40'
                      : feedback === 'wrong'
                        ? 'bg-red-500 hover:bg-red-400 active:bg-red-600 shadow-red-200 dark:shadow-red-900/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/40'
                    }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <ChevronRight size={36} className="stroke-[3.5] relative z-10" />
                </motion.button>
              ) : currentQ.phase === 'typing' && userTyping.trim().length > 0 && feedback === 'none' ? (
                <motion.button
                  key="check-btn"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={submitTyping}
                  className="group relative w-full md:w-24 h-14 md:h-24 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all duration-150 shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 active:scale-95 flex items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <Check size={32} className="stroke-[4] relative z-10" />
                </motion.button>
              ) : (
                <motion.button
                  key="skip-btn"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={handleSkip}
                  disabled={feedback !== 'none'}
                  className={`group relative w-full md:w-24 h-14 md:h-24 rounded-2xl border-2 transition-all duration-150 flex items-center justify-center overflow-hidden ${feedback !== 'none'
                      ? 'bg-slate-50/50 border-slate-200/40 text-slate-300 cursor-not-allowed dark:bg-slate-800/30 dark:border-slate-700/40 dark:text-slate-600 opacity-60'
                      : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400 active:scale-95 border-slate-200/60 dark:border-slate-700/60'
                    }`}
                >
                  <span className="text-3xl font-black relative z-10">?</span>
                </motion.button>
              )}

              {/* Đã thuộc (Desktop) */}
              {(progressMap.get(currentQ.raw.id)?.masteryLevel ?? 0) < 2 && (
                <button
                  onClick={() => handleMarkMastered(currentQ.raw)}
                  className="hidden md:flex group relative w-24 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold transition-all duration-150 active:scale-95 items-center justify-center flex-col gap-1 border-2 border-amber-200/60 dark:border-amber-700/60"
                >
                  <span className="text-[10px] uppercase tracking-widest text-center leading-tight">Lv.2</span>
                  <ChevronsUp className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}

              {/* Mastery badge (Desktop) */}
              <div className="hidden md:flex relative items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-sm mt-2">
                <MasteryIcon level={progressMap.get(currentQ.raw.id)?.masteryLevel ?? 0} size="lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center bg-indigo-500 text-white text-[10px] font-black rounded-full shadow-sm border border-white dark:border-slate-900">
                  {progressMap.get(currentQ.raw.id)?.masteryLevel ?? 0}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── DONE Overlay (Blurred) ── */}
      <AnimatePresence>
        {phase === 'done' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 backdrop-blur-md bg-white/50 dark:bg-slate-950/60" />
            
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6 z-10">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-4xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">🎉</div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Tuyệt vời! 🎊</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{modeParam === 'review' ? `Bạn đã ôn tập xong ${savedIds.size} từ vựng.` : `Bạn đã nạp thành công ${savedIds.size} từ vựng vào bộ nhớ.`}</p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Từ đã lưu</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg">{savedIds.size} từ</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">EXP nhận được</span>
                  <span className="text-amber-500 dark:text-amber-400 font-black text-lg">+{sessionTotalExp} ⚡</span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button onClick={goBack} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-2 border-transparent">
                  Quay Về
                </button>
                <button onClick={() => {
                  setPhase('preview');
                  setPreviewItemIdx(0);
                  setCurrentQIdx(0);
                  setTestQueue([]);
                  setSavedIds(new Set());
                  setRefreshKey(k => k + 1);
                }}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 active:scale-95 border-2 border-indigo-600">
                  <RotateCcw size={16} /> {modeParam === 'review' ? 'Ôn Tiếp' : 'Học Tiếp'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
