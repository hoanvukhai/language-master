import { ArrowLeft, Trophy, Flame, BookOpen, Languages } from 'lucide-react';
import { LEVEL_CONFIG, RankTooltip } from './KanjiCommon';
import type { Level } from './KanjiCommon';
import { getStorageKey, getBestExp, getRankForRecord } from '../../../lib/rankSystem';

interface KanjiSetupProps {
  level: Level;
  setLevel: (l: Level) => void;
  runMode: 'vocab' | 'character';
  setRunMode: (m: 'vocab' | 'character') => void;
  startGame: () => void;
  onBack: () => void;
}

export default function KanjiSetup({
  level,
  setLevel,
  runMode,
  setRunMode,
  startGame,
  onBack,
}: KanjiSetupProps) {
  const storageKey = getStorageKey('kanji', level) + (runMode === 'character' ? '_char' : '');
  const currentBestExp = getBestExp(storageKey);
  const currentBestInfo = getRankForRecord(storageKey);
  const currentBestLabel = runMode === 'character' ? 'Kỷ lục Ôn tập' : 'Kỷ lục';

  return (
    <div className="bg-slate-50 dark:bg-slate-900 py-5 px-4 md:px-8 font-sans transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 transition-colors font-semibold text-sm">
            <ArrowLeft size={16} /> Quay lại
          </button>
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-black rounded-full uppercase tracking-wider">JLPT N3</span>
        </div>

        <div className="text-center md:text-left mb-1">
          <div className="flex items-center justify-center md:justify-start gap-2.5 mb-1">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">⚡ Toàn Diện — Chữ Hán</h1>
            <RankTooltip level={level} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Thử thách tổng hợp toàn diện các kỹ năng tiếng Nhật.</p>
        </div>

        {/* Setup Panel Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 md:p-6 shadow-xl border border-slate-100 dark:border-slate-700/80 space-y-5">
          
          {/* Record Summary */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 dark:from-amber-500/5 dark:via-orange-500/5 dark:to-amber-600/5 border border-amber-200/50 dark:border-amber-700/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Trophy size={20} />
              </div>
              <div>
                <div className="text-xs uppercase font-black tracking-wider text-amber-600 dark:text-amber-500">{currentBestLabel} - Mức {LEVEL_CONFIG[level].label}</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Thành tích cao nhất được lưu trữ tại thiết bị này</div>
              </div>
            </div>
            {currentBestInfo && currentBestExp > 0 ? (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm self-start sm:self-auto">
                <span className="text-lg">{currentBestInfo.rank.emoji}</span>
                <span className="font-extrabold text-sm text-slate-800 dark:text-white">
                  {currentBestInfo.rank.kanji}
                </span>
                <span className="text-xs font-black tracking-widest text-amber-600 dark:text-amber-400 ml-1">
                  [ {currentBestInfo.rank.badge}{currentBestInfo.modifier} ]
                </span>
                <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-600 mx-1.5" />
                <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">{currentBestExp} EXP</span>
              </div>
            ) : (
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 italic px-2 py-1">
                Chưa có kỷ lục nào được ghi nhận
              </div>
            )}
          </div>

          {/* Step 1: Mode Selection */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-xs">1</span>
              Nội dung luyện tập
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button type="button" onClick={() => setRunMode('vocab')}
                className={`group p-5 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${runMode === 'vocab' ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-slate-800 dark:text-white shadow-md ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-300'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${runMode === 'vocab' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600'}`}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-sm mb-1">Từ vựng chữ Hán (Từ ghép)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Luyện tập từ vựng ghép chứa Kanji qua 5 dạng game. Tính EXP và bảng xếp hạng cấp độ.</div>
                </div>
              </button>
              <button type="button" onClick={() => setRunMode('character')}
                className={`group p-5 rounded-2xl border-2 transition-all text-left flex items-start gap-4 ${runMode === 'character' ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-slate-800 dark:text-white shadow-md ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-300'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${runMode === 'character' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600'}`}>
                  <Languages size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-sm mb-1">Hán Việt & Bộ thủ (Chữ đơn)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Luyện nhận diện mặt chữ Kanji và âm Hán Việt tương ứng (hỏi chiều xuôi). Điểm tính riêng.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Difficulty Selection */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center font-bold text-xs">2</span>
              Cấp độ thử thách
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Level selector list */}
              <div className="md:col-span-1 flex flex-col gap-2 bg-slate-100/60 dark:bg-slate-900/40 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/30">
                {(['easy', 'normal', 'hard'] as Level[]).map(l => {
                  const cfg = LEVEL_CONFIG[l];
                  const isSelected = level === l;
                  const emoji = l === 'easy' ? '🌱' : l === 'normal' ? '⚔️' : '🔥';
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs md:text-sm font-black transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-md border border-slate-200/40 dark:border-slate-700/40 scale-[1.01]'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{emoji}</span>
                        <span>Mức {cfg.label}</span>
                      </div>
                      <span className="text-[9px] uppercase font-black opacity-60 tracking-wider px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-md">
                        {cfg.kanji}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic level info card */}
              <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 flex flex-col justify-center min-h-[120px] space-y-1.5">
                <div className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>⚙️ Luật chơi Mức {LEVEL_CONFIG[level].label}:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                  {level === 'easy' && (
                    <>
                      <li><strong>Số lượng câu hỏi:</strong> {LEVEL_CONFIG.easy.questions} câu.</li>
                      <li><strong>Thời gian:</strong> Vô hạn (không giới hạn thời gian chạy).</li>
                      <li><strong>Gợi ý:</strong> Hoàn toàn miễn phí, không bị phạt trừ điểm.</li>
                    </>
                  )}
                  {level === 'normal' && (
                    <>
                      <li><strong>Số lượng câu hỏi:</strong> {LEVEL_CONFIG.normal.questions} câu.</li>
                      <li><strong>Thời gian giới hạn:</strong> {LEVEL_CONFIG.normal.blitzSecs} giây ({Math.floor(LEVEL_CONFIG.normal.blitzSecs / 60)} phút) cho toàn bộ bài chơi.</li>
                      <li><strong>Điểm cộng tốc độ:</strong> Trả lời càng nhanh và chính xác càng được cộng nhiều EXP.</li>
                      <li><strong>Gợi ý:</strong> Trừ {LEVEL_CONFIG.normal.hintPenalty}% điểm số câu đó mỗi lần xem gợi ý (tối đa -10% tổng điểm).</li>
                    </>
                  )}
                  {level === 'hard' && (
                    <>
                      <li><strong>Số lượng câu hỏi:</strong> {LEVEL_CONFIG.hard.questions} câu.</li>
                      <li><strong>Sinh tồn:</strong> Bạn chỉ có tối đa <strong>3 Mạng (Lượt sai)</strong>. Hết mạng game kết thúc lập tức!</li>
                      <li><strong>Thời gian giới hạn từng câu:</strong> Bị áp đặt thời gian giới hạn nghiêm ngặt cho mỗi câu hỏi (Flashcard: 5s, Quiz: 8s, Typing: 15s...). Trả lời nhanh được cộng điểm tốc độ.</li>
                      <li><strong>Gợi ý:</strong> Bị phạt nặng! Trừ {LEVEL_CONFIG.hard.hintPenalty}% điểm của câu đó cho mỗi lần dùng gợi ý.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button onClick={startGame}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white font-black rounded-2xl transition-all text-base shadow-lg hover:shadow-orange-500/20 active:scale-[0.99] flex items-center justify-center gap-2">
            <Flame size={18} className="animate-pulse" /> Bắt đầu thách đấu
          </button>

        </div>
      </div>
    </div>
  );
}
