import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, RefreshCw, Heart, X, Check, Lightbulb, Type } from 'lucide-react';
import { keigoVerbs } from '../../data/jlpt/keigo/keigoDb';
import keigoN3Questions from '../../data/jlpt/keigo/keigoQuestions.json';
import type { KeigoVerb, KeigoFormKey } from '../../types/keigo';
import { getKeigoResult, generateDistractors } from '../../lib/keigoEngine';
import { useSettings } from '../../context/global/useSettings';

// ── UTILS ─────────────────────────────────────────────────────
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);
const LABELS = ['A', 'B', 'C', 'D'];
const TOTAL = 15;

type FormType = 'base' | 'sonkei' | 'kenjou' | 'teinei';

const FORM_NAMES = {
  base: { vi: 'Từ gốc', en: 'Base verb' },
  sonkei: { vi: 'Tôn kính ngữ', en: 'Honorific form' },
  kenjou: { vi: 'Khiêm nhường ngữ', en: 'Humble form' },
  teinei: { vi: 'Lịch sự ngữ', en: 'Polite form' }
};

interface Question {
  id: string;
  isScenario: boolean;
  questionTextVi: string;
  questionTextEn: string;
  hintVi?: string;
  hintEn?: string;
  correct: string;
  choices: { text: string; furigana?: string }[];
  correctIdx: number;
  exVi: string;
  exEn: string;
  sentenceKanji?: string;
  sentenceHiragana?: string;
}

const getWordAndFurigana = (verb: KeigoVerb, form: FormType): { word: string, furigana?: string } => {
  if (form === 'base') return { word: verb.kanji, furigana: verb.kanji !== verb.hiragana ? verb.hiragana : undefined };
  const res = getKeigoResult(verb, form as KeigoFormKey, 'masu');
  const txt = res[Math.floor(Math.random() * res.length)];
  return { word: txt };
};

const buildQ = (): Question | null => {
  const isScenario = Math.random() < 0.8; // 80% chance for scenario

  if (isScenario) {
    const qData = keigoN3Questions[Math.floor(Math.random() * keigoN3Questions.length)];
    const correct = qData.correct_answer_text;

    // Find the base verb to generate good distractors
    const targetVerbBase = qData.target_verb.split(' / ')[0].trim();
    const verbObj = keigoVerbs.find(v => v.kanji === targetVerbBase || v.jisho === targetVerbBase);

    // Map the answer type to KeigoFormKey
    let formKey: KeigoFormKey = 'sonkei';
    if (qData.correct_answer_type.startsWith('kenjougo')) formKey = 'kenjou';
    if (qData.correct_answer_type === 'teineigo') formKey = 'teinei';

    let distractors: string[] = [];
    if (qData.correct_answer_type === 'bikago') {
      const pool = new Set<string>();
      const baseWord = qData.target_verb;
      
      if (correct.startsWith('お')) pool.add('ご' + baseWord);
      else if (correct.startsWith('ご')) pool.add('お' + baseWord);

      pool.add(baseWord);
      pool.add('み' + baseWord);
      pool.add('大' + baseWord);
      
      distractors = Array.from(pool).filter(d => d !== correct && d.length > 0);
    } else {
      if (verbObj) {
        distractors = generateDistractors(verbObj, formKey, 3, 'masu');
      } else {
        // Fallback string-based distractors for verbs not in DB
        const pool = new Set<string>();

        if (correct.startsWith('お')) pool.add('ご' + correct.slice(1));
        else if (correct.startsWith('ご')) pool.add('お' + correct.slice(1));

        if (correct.endsWith('になります')) {
          pool.add(correct.replace('になります', 'します'));
          pool.add(correct.replace('になります', 'いたします'));
          pool.add(correct.replace('になります', 'されます'));
        } else if (correct.endsWith('します')) {
          pool.add(correct.replace('します', 'になります'));
          pool.add(correct.replace('します', 'されます'));
          pool.add(correct.replace('します', 'いたします'));
        } else if (correct.endsWith('いたします')) {
          pool.add(correct.replace('いたします', 'になります'));
          pool.add(correct.replace('いたします', 'されます'));
        } else if (correct.endsWith('れます') || correct.endsWith('られます')) {
          pool.add(correct.replace('れます', 'ます').replace('られます', 'ます'));
          pool.add('お' + correct.replace('れます', 'します').replace('られます', 'します'));
        } else {
          // Just append some standard wrong suffixes if nothing matches
          pool.add(correct + 'になります');
          pool.add(correct + 'いたします');
        }

        if (correct.startsWith('お') || correct.startsWith('ご')) {
          const withoutPrefix = correct.slice(1);
          if (correct.endsWith('になります')) pool.add(withoutPrefix.replace('になります', 'ます'));
          else if (correct.endsWith('します')) pool.add(withoutPrefix.replace('します', 'ます'));
          else if (correct.endsWith('いたします')) pool.add(withoutPrefix.replace('いたします', 'ます'));
          else pool.add(withoutPrefix);
        }

        distractors = Array.from(pool).filter(d => d !== correct && d.length > 0);
      }
    }

    // Ensure no exact duplicates in distractors
    const uniqueDistractors = Array.from(new Set(distractors)).filter(d => d !== correct);
    
    // If we STILL don't have enough distractors, do NOT pull random verbs.
    // Instead, do some basic string manipulation on the correct answer.
    if (uniqueDistractors.length < 3) {
      if (qData.correct_answer_type === 'bikago') {
        uniqueDistractors.push('み' + qData.target_verb);
        uniqueDistractors.push('貴' + qData.target_verb);
      } else {
        uniqueDistractors.push(correct.replace(/ます$/, 'ません'));
        uniqueDistractors.push(correct.replace(/ます$/, 'ました'));
        uniqueDistractors.push(correct.replace(/ます$/, 'ましたら'));
      }
    }

    const choiceStrings = shuffle([correct, ...uniqueDistractors]).slice(0, 4);

    let hintVi = '';
    let hintEn = '';
    if (qData.correct_answer_type === 'bikago') {
      hintVi = 'Dùng tiền tố お cho từ Thuần Nhật, ご cho từ Hán Nhật.';
      hintEn = 'Use prefix お for Wago (Native Japanese), ご for Kango (Sino-Japanese).';
    } else {
      hintVi = qData.speaker === 'self' 
        ? 'Hành động của Bản thân / Phe mình ➔ Dùng Khiêm Nhường Ngữ' 
        : 'Hành động của Đối phương / Bề trên ➔ Dùng Tôn Kính Ngữ';
      hintEn = qData.speaker === 'self' 
        ? 'Action of yourself / In-group ➔ Use Humble Form' 
        : 'Action of the other person / Superior ➔ Use Honorific Form';
    }

    const typeVi = qData.correct_answer_type === 'sonkeigo' ? 'Tôn kính ngữ' : 
                   qData.correct_answer_type === 'teineigo' ? 'Lịch sự ngữ' : 
                   qData.correct_answer_type === 'bikago' ? 'Mỹ hóa ngữ (お/ご)' : 'Khiêm nhường ngữ';

    return {
      id: Math.random().toString(),
      isScenario: true,
      questionTextVi: qData.context_vi,
      questionTextEn: qData.context_en,
      sentenceKanji: qData.sentence_kanji,
      sentenceHiragana: qData.sentence_hiragana,
      hintVi,
      hintEn,
      correct,
      choices: choiceStrings.map(c => ({ text: c })),
      correctIdx: choiceStrings.indexOf(correct),
      exVi: `“${correct}” là ${typeVi} phù hợp nhất.`,
      exEn: `“${correct}” is the correct answer.`,
    };

  } else {
    // Direct Cross-Form Question
    const verb = keigoVerbs[Math.floor(Math.random() * keigoVerbs.length)];
    const forms: FormType[] = ['base'];
    if (verb.sonkei.type !== 'none') forms.push('sonkei');
    if (verb.kenjou.type !== 'none') forms.push('kenjou');
    if (verb.teinei.type === 'special') forms.push('teinei');

    const validPairs = forms.length > 2 || (forms.length === 2 && !(forms.includes('base') && forms.includes('teinei')));
    if (!validPairs) return null;

    const source = forms[Math.floor(Math.random() * forms.length)];
    let target = forms[Math.floor(Math.random() * forms.length)];
    let loopCount = 0;
    while ((target === source || (source === 'base' && target === 'teinei') || (source === 'teinei' && target === 'base')) && loopCount < 50) {
      target = forms[Math.floor(Math.random() * forms.length)];
      loopCount++;
    }
    if (loopCount >= 50) return null;

    const srcObj = getWordAndFurigana(verb, source);
    const tgtObj = getWordAndFurigana(verb, target);
    if (!srcObj.word || !tgtObj.word || srcObj.word === '(なし)' || tgtObj.word === '(なし)') return null;

    const correct = tgtObj.word;
    let choiceStrings: string[] = [];

    if (target === 'base') {
      const crossPool = shuffle(keigoVerbs.filter(v => v.id !== verb.id)).slice(0, 3);
      choiceStrings = shuffle([correct, ...crossPool.map(v => v.kanji)]);
    } else {
      const distractors = generateDistractors(verb, target as KeigoFormKey, 3, 'masu');
      choiceStrings = shuffle([correct, ...distractors]);
    }

    return {
      id: Math.random().toString(),
      isScenario: false,
      questionTextVi: `${FORM_NAMES[target].vi} của 【${srcObj.word}】 (${FORM_NAMES[source].vi}) là gì?`,
      questionTextEn: `What is the ${FORM_NAMES[target].en} of 【${srcObj.word}】 (${FORM_NAMES[source].en})?`,
      correct,
      choices: choiceStrings.map(c => ({ text: c })),
      correctIdx: choiceStrings.indexOf(correct),
      exVi: `“${correct}” là ${FORM_NAMES[target].vi} chuẩn xác!`,
      exEn: `“${correct}” is the correct ${FORM_NAMES[target].en}!`,
    };
  }
};

const buildScenarios = (): Question[] => {
  const list: Question[] = [];
  let attempts = 0;
  while (list.length < TOTAL && attempts < 1000) {
    attempts++;
    const q = buildQ();
    if (q) list.push(q);
  }
  return list;
};

// ── MAIN ──────────────────────────────────────────────────────
export default function KeigoQuest() {
  const navigate = useNavigate();
  const { language } = useSettings();
  const lang = (language ?? 'vi') as 'vi' | 'en';

  const [scenarios, setScenarios] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const init = useCallback(() => {
    const s = buildScenarios();
    setScenarios(s);
    setQIdx(0);
    setQuestion(s[0]);
    setSelected(null); setIsCorrect(null); setShowHint(false);
    setScore(0); setStreak(0); setLives(3);
    setIsGameOver(false); setIsFinished(false);
  }, []);
  useEffect(() => { init(); }, [init]);

  const handleSelect = (idx: number) => {
    if (selected !== null || !question) return;
    const ok = idx === question.correctIdx;
    setSelected(idx); setIsCorrect(ok);
    
    if (ok) {
      setScore(s => s + 10 + streak * 2);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
      setLives(l => l - 1);
    }
  };

  const handleNext = () => {
    if (lives <= 0 && !isCorrect) {
      setIsGameOver(true);
      return;
    }
    const ni = qIdx + 1;
    if (ni >= scenarios.length) { setIsFinished(true); return; }
    setQIdx(ni);
    setQuestion(scenarios[ni]);
    setSelected(null); setIsCorrect(null); setShowHint(false);
  };

  if (!question) return null;

  const { isScenario, choices, correctIdx, exVi, exEn, hintVi, hintEn } = question;

  // END SCREENS
  if (isGameOver || isFinished) {
    const won = isFinished && !isGameOver;
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-6">
        <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
          className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-8 text-center shadow-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-5xl mb-3">{won?'🏆':'💀'}</div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">
            {won?(lang==='vi'?'Xuất sắc!':'Excellent!'):(lang==='vi'?'Game Over!':'Game Over!')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-3">{lang==='vi'?`Điểm số: ${score}`:`Score: ${score}`}</p>
          <div className="flex gap-3">
            <button onClick={()=>navigate('/course/keigo-master/practice')} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-white rounded-2xl font-semibold">
              {lang==='vi'?'Quay lại':'Back'}
            </button>
            <button onClick={init} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
              <RefreshCw size={16}/> {lang==='vi'?'Chơi lại':'Retry'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-100 dark:bg-slate-900 flex flex-col">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={()=>navigate('/course/keigo-master/practice')} className="p-2 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 border border-slate-200 shadow-sm">
          <ArrowLeft size={18}/>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[...Array(3)].map((_,i)=>(
              <Heart key={i} size={18} className={i<lives?'text-red-400 fill-red-400':'text-slate-300 dark:text-slate-600'}/>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
            <Star size={13} className="text-yellow-500 fill-yellow-500"/>
            <span className="text-yellow-600 font-bold text-sm">{score}</span>
          </div>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="px-4 mb-3">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{width:`${(qIdx/TOTAL)*100}%`}}/>
        </div>
      </div>

      {/* QUESTION CARD */}
      <div className="mx-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-800 p-5 mb-3 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
            {isScenario ? (lang==='vi' ? 'Nhập vai' : 'Roleplay') : (lang==='vi' ? 'Chuyển đổi' : 'Conversion')}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setShowFurigana(!showFurigana)} className={`p-1.5 rounded-full ${showFurigana ? 'bg-white text-indigo-600' : 'bg-white/20 text-white'}`}>
              <Type size={16} />
            </button>
            {isScenario && (
              <button onClick={() => setShowHint(true)} className="p-1.5 rounded-full bg-yellow-400 text-yellow-900 shadow-sm hover:scale-105 transition-transform">
                <Lightbulb size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 mb-3 min-h-[100px] flex flex-col items-center justify-center text-center gap-3">
          <p className="text-white text-lg font-medium leading-relaxed whitespace-pre-wrap">
            {lang === 'en' ? question.questionTextEn : question.questionTextVi}
          </p>
          {(question.sentenceKanji || question.sentenceHiragana) && (
            <p className="text-amber-100 text-xl font-bold tracking-wide border-t border-white/20 pt-3 w-full">
              {showFurigana ? (question.sentenceHiragana || question.sentenceKanji) : (question.sentenceKanji || question.sentenceHiragana)}
            </p>
          )}
        </div>

        <AnimatePresence>
          {showHint && hintVi && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-lg p-3 text-center border border-yellow-300">
              💡 {lang === 'en' ? hintEn : hintVi}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CHOICES */}
      <div className="px-4 flex flex-col gap-2.5 flex-1">
        {choices.map((choice, i) => {
          let st: 'idle'|'correct'|'wrong'|'dim' = 'idle';
          if (selected!==null) st = i===correctIdx?'correct':i===selected?'wrong':'dim';
          const cls = {
            idle: 'bg-white dark:bg-slate-800 border-slate-200 text-slate-800 dark:text-white',
            correct: 'bg-emerald-50 border-emerald-400 text-emerald-800',
            wrong: 'bg-red-50 border-red-400 text-red-800',
            dim: 'bg-slate-50 border-slate-200 text-slate-400',
          }[st];
          return (
            <button key={i} disabled={selected!==null} onClick={()=>handleSelect(i)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left font-medium transition-all shadow-sm ${cls}`}>
              <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-extrabold border-2 bg-slate-100 text-slate-500">
                {LABELS[i]}
              </span>
              <div className="flex flex-col">
                <span className="text-lg leading-snug">{choice.text}</span>
                {showFurigana && choice.furigana && <span className="text-xs text-slate-400">{choice.furigana}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* FEEDBACK PANEL */}
      <AnimatePresence>
        {selected!==null&&(
          <motion.div initial={{y:90,opacity:0}} animate={{y:0,opacity:1}} exit={{y:90,opacity:0}}
            className={`fixed bottom-0 inset-x-0 rounded-t-3xl p-5 shadow-2xl border-t-2 z-50 ${isCorrect?'bg-emerald-50 border-emerald-400':'bg-red-50 border-red-400'}`}>
            <div className="flex gap-3 items-start mb-3">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCorrect?'bg-emerald-500':'bg-red-500'}`}>
                {isCorrect?<Check size={16} className="text-white"/>:<X size={16} className="text-white"/>}
              </div>
              <div>
                <p className={`font-bold text-sm mb-1 ${isCorrect?'text-emerald-700':'text-red-700'}`}>
                  {isCorrect?(lang==='vi'?'🎉 Chính xác!':'🎉 Correct!'):( lang==='vi'?'❌ Chưa đúng':'❌ Wrong')}
                </p>
                <p className={`text-sm leading-relaxed ${isCorrect?'text-emerald-800':'text-red-800'}`}>
                  ✅ {lang==='en'?exEn:exVi}
                </p>
              </div>
            </div>
            <button onClick={handleNext}
              className={`w-full py-3 rounded-2xl font-bold text-white text-base ${isCorrect?'bg-emerald-500':'bg-red-500'}`}>
              {lang==='vi'?'Tiếp tục →':'Continue →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-32 shrink-0"/>
    </div>
  );
}
