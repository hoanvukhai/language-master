// src/components/shared/FloatingStudyTimer.tsx
// Tiện ích Học tập nổi Siêu Nhỏ Gọn (Compact Floating Study Orb)
// - Kéo thả cực nhẹ, siêu mượt 120 FPS (Direct DOM Update không gây re-render lag)
// - Thiết kế tối giản: Nút tròn 44px thanh lịch, chỉ mở rộng khi đồng hồ đang chạy
// - Đứng trên mọi lớp (zIndex: 99999)
// - Bấm vào mở Popup Chi tiết (Hẹn giờ Pomodoro + Công tắc Tra từ Bôi đen)

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Coffee, 
  Languages, 
  Sparkles,
  Keyboard
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

  const handleToggleLookup = () => {
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
          x: Math.min(Math.max(12, x), window.innerWidth - 80),
          y: Math.min(Math.max(12, y), window.innerHeight - 80),
        };
      }
    }
    // Vị trí mặc định: góc dưới bên phải
    return {
      x: Math.max(16, window.innerWidth - 76),
      y: Math.max(16, window.innerHeight - 86),
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
          x: Math.min(Math.max(12, prev.x), window.innerWidth - 80),
          y: Math.min(Math.max(12, prev.y), window.innerHeight - 80),
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

      const buttonWidth = buttonRef.current.offsetWidth || 44;
      const buttonHeight = buttonRef.current.offsetHeight || 44;

      const nextX = Math.min(Math.max(8, buttonStartPosRef.current.x + dx), window.innerWidth - buttonWidth - 8);
      const nextY = Math.min(Math.max(8, buttonStartPosRef.current.y + dy), window.innerHeight - buttonHeight - 8);

      // Cập nhật trực tiếp lên DOM node -> KHÔNG kích hoạt re-render React -> Siêu mượt 120 FPS
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

      {/* ================= COMPACT FLOATING STUDY ORB ================= */}
      {/* Luôn đứng trên mọi lớp: zIndex: 99999 */}
      <div
        ref={buttonRef}
        data-no-selection-lookup="true"
        onPointerDown={handlePointerDown}
        style={{ 
          left: `${pos.x}px`, 
          top: `${pos.y}px`,
          zIndex: 99999,
        }}
        className={`fixed flex items-center shadow-2xl backdrop-blur-md border cursor-grab active:cursor-grabbing select-none touch-none transition-shadow duration-200 ${
          isRunning
            ? 'px-3 py-2 rounded-full bg-amber-500/15 border-amber-400/80 text-amber-700 dark:text-amber-300 ring-4 ring-amber-500/20 shadow-amber-500/25 gap-2'
            : 'w-11 h-11 justify-center rounded-full bg-white/95 dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:shadow-indigo-500/15 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-slate-900/15'
        }`}
        title="Kéo để di chuyển • Bấm để mở Bảng tiện ích học tập"
      >
        {/* Biểu tượng chính */}
        <div className="relative flex items-center justify-center shrink-0">
          <Timer 
            size={18} 
            className={`transition-colors ${
              isRunning 
                ? 'text-amber-500 animate-pulse' 
                : isLookupEnabled
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400'
            }`} 
          />

          {/* Đèn chỉ báo trạng thái: Khi Chế độ Tra từ đang BẬT */}
          {isLookupEnabled && !isRunning && (
            <span 
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-xs shadow-emerald-400 animate-pulse" 
              title="Chế độ Tra từ bôi đen đang BẬT"
            />
          )}
        </div>

        {/* Khi đồng hồ đang chạy: Mở rộng nhẹ hiển thị số đếm */}
        {isRunning && (
          <div className="flex items-center gap-1.5 font-mono font-bold text-xs tracking-wider">
            <span>{displayTime}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          </div>
        )}
      </div>

      {/* ================= CENTERED POPUP MODAL ================= */}
      {/* Luôn đứng trên mọi lớp: zIndex: 999999 */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          style={{ zIndex: 999999 }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
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

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* PHẦN 1: ĐỒNG HỒ HỌC TẬP */}
              <div className="space-y-4">
                {/* Mode Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('pomodoro');
                      setIsRunning(false);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'pomodoro'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
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
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Bấm Giờ
                  </button>
                </div>

                {/* Presets (Pomodoro only) */}
                {mode === 'pomodoro' && (
                  <div className="flex items-center justify-center gap-2">
                    {[
                      { label: '25p Tập trung', min: 25 },
                      { label: '50p Chuyên sâu', min: 50 },
                      { label: '5p Nghỉ', min: 5, isBreak: true },
                    ].map(p => (
                      <button
                        key={p.min}
                        type="button"
                        onClick={() => handleSelectPreset(p.min)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          pomoPreset === p.min * 60
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        {p.isBreak && <Coffee size={13} className="inline mr-1 -mt-0.5 text-amber-500" />}
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Big Timer Display */}
                <div className="text-center py-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div
                    className={`text-5xl font-black font-mono tracking-tight transition-colors ${
                      isRunning
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-800 dark:text-white'
                    }`}
                  >
                    {displayTime}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                    {isRunning
                      ? mode === 'pomodoro'
                        ? '🔥 Đang trong phiên tập trung...'
                        : '⏱️ Đang đếm thời gian học...'
                      : '⏸️ Đã tạm dừng'}
                  </p>
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Đặt lại thời gian"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRunning(r => !r)}
                    className={`flex-1 py-3 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm active:scale-95 cursor-pointer ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause size={18} />
                        <span>Tạm dừng</span>
                      </>
                    ) : (
                      <>
                        <Play size={18} />
                        <span>Bắt đầu tập trung</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PHẦN 2: CÀI ĐẶT TRA TỪ VỰNG KHI BÔI ĐEN */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                      <Languages size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          Tra từ khi bôi đen
                        </span>
                        <span 
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isLookupEnabled 
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}
                        >
                          {isLookupEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Nhả chuột bôi đen để xem nghĩa Đa Sách & Trực tuyến
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleLookup}
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

                <div className="pt-2 border-t border-indigo-100/70 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Keyboard size={12} className="text-indigo-500" />
                    <span>Phím tắt bài học: <b>F2</b> hoặc <b>`</b></span>
                  </span>
                  <span>Đóng tra từ: <b>Esc</b></span>
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
