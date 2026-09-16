import { ArrowLeft, Trophy, Flame, BookOpen, Layers } from 'lucide-react';
import { LEVEL_CONFIG, RankTooltip } from './VocabCommon';
import type { Level } from './VocabCommon';
import { getStorageKey, getBestExp, getRankForRecord } from '../../../lib/rankSystem';

interface VocabSetupProps {
  level: Level;
  setLevel: (l: Level) => void;
  startGame: () => void;
  onBack: () => void;
}

export default function VocabSetup({ level, setLevel, startGame, onBack }: VocabSetupProps) {
  const currentStorageKey = getStorageKey('vocab', level);
  const currentBestExp = getBestExp(currentStorageKey);
  const currentBestInfo = getRankForRecord(currentStorageKey);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 py-5 px-4 md:px-8 font-sans transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-semibold text-sm">
            <ArrowLeft size={16} /> Quay lại
          </button>
          <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-full uppercase tracking-wider">JLPT N3</span>
        </div>

        <div className="text-center md:text-left mb-1">
          <div className="flex items-center justify-center md:justify-start gap-2.5 mb-1">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">⚡ Toàn Diện — Từ Vựng</h1>
            <RankTooltip level={level} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs">Thử thách tổng hợp: 5 loại game trong một phiên luyện tập.</p>
        </div>

        {/* Setup Panel Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 md:p-6 shadow-xl border border-slate-100 dark:border-slate-700/80 space-y-5">
          
          {/* Record Summary */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-600/10 dark:from-indigo-500/5 dark:via-purple-500/5 dark:to-indigo-600/5 border border-indigo-200/50 dark:border-indigo-700/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Trophy size={20} />
              </div>
              <div>
                <div className="text-xs uppercase font-black tracking-wider text-indigo-600 dark:text-indigo-500">Kỷ lục - Mức {LEVEL_CONFIG[level].label}</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Thành tích cao nhất được lưu trữ tại thiết bị này</div>
              </div>
            </div>
            {currentBestInfo && currentBestExp > 0 ? (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm self-start sm:self-auto">
                <span className="text-lg">{currentBestInfo.rank.emoji}</span>
                <span className="font-extrabold text-sm text-slate-800 dark:text-white">
                  {currentBestInfo.rank.kanji}
                </span>
                <span className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 ml-1">
                  [ {currentBestInfo.rank.badge}{currentBestInfo.modifier} ]
                </span>
                <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-600 mx-1.5" />
                <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">{currentBestExp} EXP</span>
              </div>
            ) : (
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 italic px-2 py-1">
                Chưa có kỷ lục nào được ghi nhận
              </div>
            )}
          </div>

          {/* Step 1: Content Selection */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">1</span>
              Nội dung luyện tập
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button type="button"
                className="group p-5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-slate-800 dark:text-white shadow-md ring-2 ring-indigo-500/20 transition-all text-left flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-sm mb-1">Từ vựng tổng hợp</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">Luyện tập ngẫu nhiên từ vựng tiếng Nhật N3 qua 5 dạng game. Tính EXP và xếp hạng cấp độ.</div>
                </div>
              </button>
              <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-left flex items-start gap-4 opacity-65 cursor-not-allowed">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-sm mb-1 flex items-center gap-1.5">
                    <span>Theo chủ đề</span>
                    <span className="text-[9px] font-black tracking-wider uppercase bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">Sắp có</span>
                  </div>
                  <div className="text-[11px] leading-normal">Tự chọn chuyên đề từ vựng cụ thể (đời sống, công việc, tính từ, động từ...) để luyện tập sâu.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Difficulty Selection */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">2</span>
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
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-200/40 dark:border-slate-700/40 scale-[1.01]'
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
                      <li><strong>Thời gian:</strong> Thong thả ôn tập, vô hạn thời gian.</li>
                      <li><strong>Gợi ý:</strong> Hoàn toàn miễn phí, không bị phạt trừ điểm.</li>
                    </>
                  )}
                  {level === 'normal' && (
                    <>
                      <li><strong>Số lượng câu hỏi:</strong> {LEVEL_CONFIG.normal.questions} câu.</li>
                      <li><strong>Thời gian giới hạn:</strong> {LEVEL_CONFIG.normal.blitzSecs} giây ({Math.floor(LEVEL_CONFIG.normal.blitzSecs / 60)} phút) cho toàn bộ bài chơi.</li>
                      <li><strong>Điểm cộng tốc độ:</strong> Trả lời nhanh và liên tiếp chính xác để tích lũy combo điểm EXP.</li>
                      <li><strong>Gợi ý:</strong> Trừ {LEVEL_CONFIG.normal.hintPenalty}% điểm số câu đó mỗi lần xem gợi ý (tối đa -10% tổng điểm).</li>
                    </>
                  )}
                  {level === 'hard' && (
                    <>
                      <li><strong>Số lượng câu hỏi:</strong> {LEVEL_CONFIG.hard.questions} câu.</li>
                      <li><strong>Sinh tồn:</strong> Bạn chỉ có tối đa <strong>3 Mạng (Lượt sai)</strong>. Làm sai 3 câu game kết thúc lập tức!</li>
                      <li><strong>Thời gian giới hạn từng câu:</strong> Áp đặt thời gian giới hạn đếm ngược riêng từng câu (Flashcard: 5s, Quiz: 8s, Typing: 15s...).</li>
                      <li><strong>Gợi ý giới hạn:</strong> Tối đa <strong>2 lần</strong> gợi ý per session, mỗi lần bị trừ 5% điểm của câu đó.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button onClick={startGame}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 text-white font-black rounded-2xl transition-all text-base shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99] flex items-center justify-center gap-2">
            <Flame size={18} className="animate-pulse" /> Bắt đầu thách đấu
          </button>

        </div>
      </div>
    </div>
  );
}
