import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, BookOpen, AlertCircle } from 'lucide-react';
import { calcExp, LEVEL_CONFIG } from './KanjiCommon';
import type { Level, AttemptRecord } from './KanjiCommon';
import { getRankModifier, getStorageKey, getStorageKeyGlobal, saveBestRecord, getBestExp } from '../../../lib/rankSystem';
import { syncPersonalHighScore } from '../../../lib/srs/firestoreSync';
import { useAuth } from '../../../context/auth/useAuth';
import { useEffect } from 'react';

interface KanjiResultProps {
  score: number;
  correct: number;
  total: number;
  streak: number;
  timeLeft?: number;
  level: Level;
  hintCount: number;
  maxExp: number;
  attempts: AttemptRecord[];
  onRetry: () => void;
  onBack: () => void;
  runMode: 'vocab' | 'character';
}

export default function KanjiResult({
  score,
  correct,
  total,
  streak,
  timeLeft,
  level,
  hintCount,
  maxExp,
  attempts,
  onRetry,
  onBack,
  runMode,
}: KanjiResultProps) {
  const { user } = useAuth();
  const exp = calcExp(score, streak, timeLeft ?? 0, level, correct, total);
  const { rank, modifier, isPerfect } = getRankModifier(exp, level, correct === total, maxExp);
  
  const storageKey = getStorageKey('kanji', level) + (runMode === 'character' ? '_char' : '');
  const globalKey = getStorageKeyGlobal('kanji');
  
  const isNewBest = saveBestRecord(storageKey, exp, level, total, maxExp, correct === total);
  const isNewGlobalBest = saveBestRecord(globalKey, exp, level, total, maxExp, correct === total);
  
  const bestExp = getBestExp(storageKey);
  const globalBestExp = getBestExp(globalKey);

  useEffect(() => {
    if (user) {
      if (isNewBest) syncPersonalHighScore(user.uid, storageKey, exp).catch(console.error);
      if (isNewGlobalBest) syncPersonalHighScore(user.uid, globalKey, exp).catch(console.error);
    }
  }, [user, isNewBest, isNewGlobalBest, storageKey, globalKey, exp]);

  // Review state
  const [showReview, setShowReview] = useState(false);

  const getQTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz': return 'Từ vựng';
      case 'hanviet_quiz': return 'Hán Việt';
      case 'typing': return 'Nhập liệu';
      case 'flashcard': return 'Lật thẻ';
      case 'error': return 'Tìm lỗi sai';
      case 'matching': return 'Nối từ';
      default: return type;
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-start p-4 py-8">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Core Result Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 250, damping: 22 }}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700"
        >
          <div className={`${rank.bgColor} p-6 text-center relative`}>
            {isNewGlobalBest ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute top-3 right-3 bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] text-xs font-black px-2 py-1 rounded-full animate-bounce"
              >
                KỶ LỤC TỔNG! 👑
              </motion.div>
            ) : isNewBest ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-black px-2 py-1 rounded-full shadow-sm"
              >
                KỶ LỤC MỚI! 🎉
              </motion.div>
            ) : null}
            <div className="flex justify-center mb-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="text-6xl mb-2 flex justify-center"
              >
                {isPerfect ? <span className="drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">🌟</span> : rank.emoji}
              </motion.div>
            </div>
            <div className={`text-4xl font-black ${isPerfect ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 animate-pulse' : rank.color}`}>
              {rank.badge}{modifier}
            </div>
            <div className={`text-sm font-bold ${rank.color} opacity-80 mt-1`}>{rank.nameVi} ({rank.kanji})</div>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <motion.div className="text-4xl font-black text-slate-800 dark:text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                {exp} <span className="text-xl text-slate-400">EXP</span>
              </motion.div>
              <p className={`text-sm mt-1 ${rank.color} font-medium`}>{rank.descVi}</p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <div className="text-center bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-2 border border-emerald-100/50 dark:border-emerald-800/30">
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{correct}/{total}</div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500">Đúng</div>
              </div>
              <div className="text-center bg-red-50 dark:bg-red-900/30 rounded-xl p-2 border border-red-100/50 dark:border-red-800/30">
                <div className="text-lg font-black text-red-500 dark:text-red-400">{total - correct}</div>
                <div className="text-[10px] font-bold text-red-500 dark:text-red-400">Sai</div>
              </div>
              <div className="text-center bg-orange-50 dark:bg-orange-900/30 rounded-xl p-2 border border-orange-100/50 dark:border-orange-800/30">
                <div className="text-lg font-black text-orange-500 dark:text-orange-400">{streak}🔥</div>
                <div className="text-[10px] font-bold text-orange-500 dark:text-orange-400">Streak</div>
              </div>
              <div className="text-center bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2 border border-slate-200/50 dark:border-slate-700/50">
                <div className="text-lg font-black text-slate-600 dark:text-slate-300">{hintCount}💡</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Gợi ý</div>
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="text-xs text-slate-400 dark:text-slate-500">
                🏆 Kỷ lục {LEVEL_CONFIG[level].label}: <strong className="text-slate-600 dark:text-slate-200">{bestExp} EXP</strong>
              </div>
              {globalBestExp > 0 && (
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  🌟 Kỷ lục Tổng: <strong className="text-amber-500">{globalBestExp} EXP</strong>
                </div>
              )}
              {user && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-1">
                  ☁️ Kỷ lục đã tự động đồng bộ lên Cloud
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onBack} className="flex-1 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:border-slate-400 dark:hover:border-slate-500 transition-all">
                Về Dashboard
              </button>
              <button onClick={onRetry} className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20">
                <RefreshCw size={14} /> Chơi lại
              </button>
            </div>
          </div>
        </motion.div>

        {/* Detailed Answer Review Card */}
        {attempts.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* Header / Toggle Button */}
            <button
              onClick={() => setShowReview(s => !s)}
              className="w-full flex items-center justify-between p-5 text-left font-extrabold text-slate-800 dark:text-white text-base hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-all focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="text-amber-500" size={20} />
                <span>Xem lại chi tiết bài làm</span>
              </div>
              <div className="text-slate-400">
                {showReview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {showReview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {attempts.map((record, idx) => {
                      const isTimeout = !record.isCorrect && (record.userAnswer.includes('Hết giờ') || record.userAnswer === '');
                      return (
                        <div key={record.qId + '-' + idx} className="py-4 first:pt-2 last:pb-0 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                Câu {idx + 1}: {getQTypeLabel(record.type)}
                              </span>
                              
                              {record.isCorrect ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={10} /> Đúng
                                </span>
                              ) : isTimeout ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                                  <Clock size={10} /> Hết giờ
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                                  <XCircle size={10} /> Sai
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-sm text-slate-800 dark:text-white whitespace-pre-wrap">
                              {record.prompt}
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                            {/* Answers comparision */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <div className="text-slate-400 dark:text-slate-500 font-medium">Bạn đã trả lời:</div>
                                <div className={`font-bold mt-0.5 ${record.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : isTimeout ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                                  {isTimeout ? 'Không có câu trả lời (Quá giờ)' : record.userAnswer || 'Không chọn'}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400 dark:text-slate-500 font-medium">Đáp án chính xác:</div>
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  {record.correctAnswer}
                                </div>
                              </div>
                            </div>

                            {/* Detailed Explanation */}
                            {record.explanation && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="font-bold text-amber-500 flex items-center gap-1.5 mb-1">
                                  <AlertCircle size={12} /> Giải thích chi tiết:
                                </div>
                                <div className="leading-relaxed whitespace-pre-wrap">
                                  {record.explanation}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
