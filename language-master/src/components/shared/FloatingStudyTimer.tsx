// src/components/shared/FloatingStudyTimer.tsx
// Tiện ích Học tập nổi (Compact Floating Study Dock)
// - Thanh nổi mini siêu gọn (Đồng hồ + Công tắc tra từ 1-chạm) kéo thả cực nhẹ 120 FPS
// - Modal Popup layout ngang (2 cột side-by-side) hiện đại, cân đối
// - Đứng trên mọi lớp (zIndex: 99999)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Coffee, 
  GripVertical,
  Languages, 
  Sparkles,
  BookOpen,
  Globe,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import SelectionLookupPopover from './SelectionLookupPopover';

type TimerMode = 'pomodoro' | 'stopwatch';

export function FloatingStudyTimer() {
  const location = useLocation();
  const isExcludedRoute = location.pathname.startsWith('/exams') || location.pathname.startsWith('/learn');

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');

  // Pomodoro settings (seconds)
  const [pomoPreset, setPomoPreset] = useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stopwatch
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);

  // Chế độ Bôi đen tra từ (Mặc định: TẮT theo yêu cầu, lưu vào localStorage)
  const [isLookupEnabled, setIsLookupEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('nihongo_selection_lookup_enabled') === 'true';
  });

  // Toast thông báo nhỏ
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2000);
  };

  const handleToggleLookup = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLookupEnabled(prev => {
      const next = !prev;
      localStorage.setItem('nihongo_selection_lookup_enabled', String(next));
      showToast(next ? 'Đã BẬT tra từ khi bôi đen 📖' : 'Đã TẮT tra từ khi bôi đen 💤');
      return next;
    });
  };

  // Draggable position state
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 100, y: 100 };
    const savedX = localStorage.getItem('timer_pos_x');
    const savedY = localStorage.getItem('timer_pos_y');
    if (savedX !== null && savedY !== null) {
      const x = parseFloat(savedX);
      const y = parseFloat(savedY);
      if (!isNaN(x) && !isNaN(y)) {
        return {
          x: Math.min(Math.max(12, x), window.innerWidth - 160),
          y: Math.min(Math.max(12, y), window.innerHeight - 60),
        };
      }
    }
    // Vị trí mặc định: góc dưới bên phải
    return {
      x: Math.max(16, window.innerWidth - 160),
      y: Math.max(16, window.innerHeight - 70),
    };
  });

  const buttonRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const buttonStartPosRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const currentPosRef = useRef({ x: pos.x, y: pos.y });

  // Đồng bộ currentPosRef khi pos thay đổi
  useEffect(() => {
    currentPosRef.current = pos;
  }, [pos]);

  // Giữ nút trong màn hình khi resize window
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => {
        const next = {
          x: Math.min(Math.max(12, prev.x), window.innerWidth - 160),
          y: Math.min(Math.max(12, prev.y), window.innerHeight - 60),
        };
        currentPosRef.current = next;
        return next;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Khóa scroll khi mở modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'pomodoro') {
          setTimeLeft(prev => {
            if (prev <= 1) {
              setIsRunning(false);
              // Tiếng chuông nhẹ khi kết thúc Pomodoro
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
              } catch (e) {}
              return 0;
            }
            return prev - 1;
          });
        } else {
          setStopwatchSeconds(prev => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatStopwatch = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const displayTime = mode === 'pomodoro' ? formatSeconds(timeLeft) : formatStopwatch(stopwatchSeconds);

  const handleSelectPreset = (minutes: number) => {
    const secs = minutes * 60;
    setPomoPreset(secs);
    setTimeLeft(secs);
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'pomodoro') {
      setTimeLeft(pomoPreset);
    } else {
      setStopwatchSeconds(0);
    }
  };

  // Drag Pointer Handlers - CỰC NHẸ & MƯỢT (Direct DOM update)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    buttonStartPosRef.current = { x: currentPosRef.current.x, y: currentPosRef.current.y };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current || !buttonRef.current) return;
      const dx = moveEv.clientX - dragStartPosRef.current.x;
      const dy = moveEv.clientY - dragStartPosRef.current.y;

      if (Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
      }

      const buttonWidth = buttonRef.current.offsetWidth || 135;
      const buttonHeight = buttonRef.current.offsetHeight || 38;

      const nextX = Math.min(Math.max(8, buttonStartPosRef.current.x + dx), window.innerWidth - buttonWidth - 8);
      const nextY = Math.min(Math.max(8, buttonStartPosRef.current.y + dy), window.innerHeight - buttonHeight - 8);

      // Cập nhật trực tiếp lên DOM node -> KHÔNG re-render React -> Siêu mượt 120 FPS
      buttonRef.current.style.left = `${nextX}px`;
      buttonRef.current.style.top = `${nextY}px`;
      currentPosRef.current = { x: nextX, y: nextY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      // Chỉ cập nhật state và localStorage 1 lần khi nhả chuột
      if (hasDraggedRef.current) {
        setPos(currentPosRef.current);
        localStorage.setItem('timer_pos_x', String(currentPosRef.current.x));
        localStorage.setItem('timer_pos_y', String(currentPosRef.current.y));
      } else {
        // Nhấp chuột không kéo -> Mở Modal chi tiết
        setIsOpen(true);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <>
      {/* Toast thông báo nhanh trạng thái */}
      {toastMsg && (
        <div 
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none"
          style={{ zIndex: 999999 }}
        >
          {toastMsg}
        </div>
      )}

      {/* ================= COMPACT FLOATING STUDY CAPSULE ================= */}
      {/* Thanh nổi mini siêu gọn: zIndex: 99999 */}
      <div
        ref={buttonRef}
        data-no-selection-lookup="true"
        style={{ 
          left: `${pos.x}px`, 
          top: `${pos.y}px`,
          zIndex: 99999,
        }}
        className="fixed flex items-center p-1 rounded-full shadow-xl backdrop-blur-md border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 select-none touch-none transition-shadow hover:shadow-2xl hover:border-indigo-300 dark:hover:border-indigo-700"
      >
        {/* Khối 1: Nút kéo và Đồng hồ (Bấm mở Modal) */}
        <div
          onPointerDown={handlePointerDown}
          className={`flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-full cursor-grab active:cursor-grabbing transition-all ${
            isRunning
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Kéo để di chuyển • Nhấp để mở Bảng tiện ích học tập"
        >
          <GripVertical size={11} className="text-slate-400 dark:text-slate-500 opacity-60 shrink-0 pointer-events-none" />
          <Timer 
            size={14} 
            className={isRunning ? 'text-amber-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'} 
          />
          <span className="font-mono font-bold text-xs tracking-tight">
            {displayTime}
          </span>
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          )}
        </div>

        {/* Vạch ngăn cách dọc mảnh */}
        <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" />

        {/* Khối 2: Công tắc Tra từ Bôi đen (Toggle Bật/Tắt tức thì ngoài thanh nổi) */}
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={handleToggleLookup}
          className={`p-1.5 rounded-full transition-all cursor-pointer relative flex items-center justify-center ${
            isLookupEnabled
              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={isLookupEnabled ? 'Tra từ khi bôi đen: ĐANG BẬT (Bấm để tắt)' : 'Tra từ khi bôi đen: ĐÃ TẮT (Bấm để bật)'}
        >
          <Languages size={15} />
          {/* Chấm đèn trạng thái */}
          <span 
            className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full transition-colors ${
              isLookupEnabled 
                ? 'bg-emerald-500 ring-1.5 ring-white dark:ring-slate-900 shadow-xs shadow-emerald-400' 
                : 'bg-slate-300 dark:bg-slate-600'
            }`} 
          />
        </button>
      </div>

      {/* ================= CENTERED POPUP MODAL (LAYOUT SANG NGANG 2 CỘT) ================= */}
      {/* Luôn đứng trên mọi lớp: zIndex: 999999 */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          style={{ zIndex: 999999 }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={16} />
                <span>Tiện Ích Học Tập Nổi</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body: LAYOUT SANG NGANG (2 CỘT CÂN ĐỐI) */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* CỘT TRÁI: ĐỒNG HỒ TẬP TRUNG (POMODORO / BẤM GIỜ) */}
              <div className="space-y-4 flex flex-col justify-between p-4.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                {/* Mode Switcher */}
                <div className="flex bg-slate-200/70 dark:bg-slate-700/60 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('pomodoro');
                      setIsRunning(false);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'pomodoro'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Pomodoro
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('stopwatch');
                      setIsRunning(false);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'stopwatch'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Bấm Giờ
                  </button>
                </div>

                {/* Presets (Pomodoro only) */}
                {mode === 'pomodoro' ? (
                  <div className="flex items-center justify-between gap-1.5">
                    {[
                      { label: '25p', min: 25 },
                      { label: '50p', min: 50 },
                      { label: '5p nghỉ', min: 5, isBreak: true },
                    ].map(p => (
                      <button
                        key={p.min}
                        type="button"
                        onClick={() => handleSelectPreset(p.min)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          pomoPreset === p.min * 60
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                        }`}
                      >
                        {p.isBreak && <Coffee size={12} className="inline mr-1 -mt-0.5 text-amber-500" />}
                        {p.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-400 font-medium py-1">
                    Bấm giờ đếm thời gian học tập tự do
                  </div>
                )}

                {/* Big Timer Display */}
                <div className="text-center py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
                  <div
                    className={`text-5xl font-black font-mono tracking-tight transition-colors ${
                      isRunning
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    {displayTime}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                    {isRunning
                      ? mode === 'pomodoro'
                        ? '🔥 Đang trong phiên tập trung...'
                        : '⏱️ Đang đếm thời gian học...'
                      : '⏸️ Đã tạm dừng'}
                  </p>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Đặt lại thời gian"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRunning(r => !r)}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all text-sm active:scale-95 cursor-pointer ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause size={16} />
                        <span>Tạm dừng</span>
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        <span>Bắt đầu tập trung</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: TRỢ LÝ TRA TỪ KHI BÔI ĐEN (NẰM NGANG) */}
              <div className="space-y-4 flex flex-col justify-between p-4.5 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/50 border border-indigo-100/90 dark:border-slate-700/80">
                {/* Header Tra Từ */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Languages size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Tra từ khi bôi đen
                      </h3>
                      <span 
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLookupEnabled 
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}
                      >
                        {isLookupEnabled ? '● ĐANG BẬT' : '○ ĐÃ TẮT'}
                      </span>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleLookup()}
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      isLookupEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    title={isLookupEnabled ? 'Nhấp để Tắt' : 'Nhấp để Bật'}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform ${
                        isLookupEnabled ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Danh sách tính năng nổi bật */}
                <div className="space-y-2.5 bg-white/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-indigo-100/60 dark:border-slate-700/50 text-xs">
                  <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                    <BookOpen size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Tra Đa Sách trong hệ thống:</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Quét toàn bộ giáo trình chứa từ bôi đen kèm ví dụ và cấp độ.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                    <Globe size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Dịch trực tuyến mở rộng:</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tự động dịch cả từ vựng và câu ví dụ dài sang tiếng Việt.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                    <PlusCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">1-Chạm lưu vào Sổ tay:</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Lưu từ kèm ngữ cảnh gốc vào Sổ tay cá nhân ngay lập tức.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chế độ an toàn phòng thi */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  <span>Tự động bảo mật: Tắt trong các bài thi thử để tránh gian lận.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popover tra cứu khi bôi đen (hoạt động khi BẬT, tự tắt trong phòng thi & bài học learn) */}
      <SelectionLookupPopover
        enabled={isLookupEnabled && !isExcludedRoute}
      />
    </>
  );
}

export default FloatingStudyTimer;
