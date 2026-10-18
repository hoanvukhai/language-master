// src/components/shared/FloatingStudyTimer.tsx
// Tiện ích Học tập nổi (Draggable Floating Study Dock)
// - Hỗ trợ kéo thả (drag & drop) tự do khắp màn hình, lưu vị trí
// - Tích hợp Đồng hồ Pomodoro / Bấm giờ tập trung
// - Tích hợp Công tắc Bật/Tắt chế độ Bôi đen tra từ vựng toàn hệ thống (Đa sách + Tra ngoài)

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
    }, 2200);
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
          x: Math.min(Math.max(12, x), window.innerWidth - 260),
          y: Math.min(Math.max(12, y), window.innerHeight - 70),
        };
      }
    }
    // Default position: bottom-right
    return {
      x: Math.max(16, window.innerWidth - 270),
      y: Math.max(16, window.innerHeight - 80),
    };
  });

  const buttonRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const buttonStartPosRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Keep button within bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => ({
        x: Math.min(Math.max(12, prev.x), window.innerWidth - 260),
        y: Math.min(Math.max(12, prev.y), window.innerHeight - 70),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when modal is open
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
              // Audio beep chime when pomodoro finishes
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

  // Drag Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    buttonStartPosRef.current = { x: pos.x, y: pos.y };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEv.clientX - dragStartPosRef.current.x;
      const dy = moveEv.clientY - dragStartPosRef.current.y;

      if (Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
      }

      const buttonWidth = buttonRef.current?.offsetWidth || 250;
      const buttonHeight = buttonRef.current?.offsetHeight || 50;

      const nextX = Math.min(Math.max(8, buttonStartPosRef.current.x + dx), window.innerWidth - buttonWidth - 8);
      const nextY = Math.min(Math.max(8, buttonStartPosRef.current.y + dy), window.innerHeight - buttonHeight - 8);

      setPos({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      setPos(current => {
        localStorage.setItem('timer_pos_x', String(current.x));
        localStorage.setItem('timer_pos_y', String(current.y));
        return current;
      });

      // Nếu nhấp vào vùng đồng hồ mà không kéo, mở modal
      if (!hasDraggedRef.current) {
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <>
      {/* Toast thông báo nhanh trạng thái */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2 rounded-2xl bg-slate-900/90 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMsg}
        </div>
      )}

      {/* ================= DRAGGABLE FLOATING STUDY DOCK ================= */}
      <div
        ref={buttonRef}
        data-no-selection-lookup="true"
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        className="fixed z-40 flex items-center p-1.5 rounded-full shadow-2xl backdrop-blur-md border transition-all duration-200 select-none touch-none bg-white/95 dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-slate-900/15 group"
      >
        {/* Phần 1: Nút kéo và Đồng hồ (Bấm mở Modal) */}
        <div
          onPointerDown={handlePointerDown}
          className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full cursor-grab active:cursor-grabbing transition-all ${
            isRunning
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
          title="Kéo để di chuyển • Bấm để mở Hẹn giờ tập trung"
        >
          <GripVertical size={13} className="text-slate-400 dark:text-slate-500 opacity-60 shrink-0 pointer-events-none" />
          <Timer 
            size={16} 
            className={isRunning ? 'text-amber-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'} 
          />
          <span className="font-mono font-bold text-xs tracking-wider">
            {displayTime}
          </span>
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
          )}
        </div>

        {/* Vạch ngăn cách dọc */}
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

        {/* Phần 2: Công tắc Tra từ Bôi đen (Toggle Bật/Tắt tức thì) */}
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={handleToggleLookup}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            isLookupEnabled
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }`}
          title={isLookupEnabled ? 'Chế độ Tra từ bôi đen: ĐANG BẬT (Bấm để tắt)' : 'Chế độ Tra từ bôi đen: ĐANG TẮT (Bấm để bật)'}
        >
          <Languages 
            size={14} 
            className={isLookupEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} 
          />
          <span className="text-[11px] font-medium hidden sm:inline">
            {isLookupEnabled ? 'Tra từ: Bật' : 'Tra từ: Tắt'}
          </span>
          <span 
            className={`w-2 h-2 rounded-full transition-colors shrink-0 ${
              isLookupEnabled 
                ? 'bg-emerald-500 shadow-xs shadow-emerald-400' 
                : 'bg-slate-300 dark:bg-slate-600'
            }`} 
          />
        </button>
      </div>

      {/* ================= CENTERED POPUP MODAL ================= */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50/80 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Timer size={18} />
                <span>Tiện Ích Học Tập Nổi</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Đóng (Thu nhỏ)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Mode Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl">
                <button
                  onClick={() => {
                    setMode('pomodoro');
                    setIsRunning(false);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'pomodoro'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Pomodoro
                </button>
                <button
                  onClick={() => {
                    setMode('stopwatch');
                    setIsRunning(false);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    mode === 'stopwatch'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
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
                      onClick={() => handleSelectPreset(p.min)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        pomoPreset === p.min * 60
                          ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-700/30 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
                      }`}
                    >
                      {p.isBreak && <Coffee size={13} className="inline mr-1 -mt-0.5" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Big Timer Display */}
              <div className="text-center py-3 bg-slate-50/60 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                <div
                  className={`text-6xl font-black font-mono tracking-tight transition-colors ${
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
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  onClick={handleReset}
                  className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Đặt lại thời gian"
                >
                  <RotateCcw size={18} />
                </button>
                <button
                  onClick={() => setIsRunning(r => !r)}
                  className={`flex-1 py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm active:scale-95 cursor-pointer ${
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

              {/* Cài đặt Bôi đen Tra từ vựng toàn hệ thống */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-700/40 border border-indigo-100/80 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
                      <Languages size={16} />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        Tra cứu từ vựng khi bôi đen
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Nhả chuột để tra cứu Đa Sách & Trực tuyến khắp hệ thống
                      </p>
                    </div>
                  </div>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleLookup()}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      isLookupEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isLookupEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-indigo-100/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Keyboard size={12} className="text-indigo-500" />
                    <span>Phím tắt phiên học: <b>F2</b> hoặc <b>`</b></span>
                  </span>
                  <span>Đóng tra từ: <b>Esc</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Component Popover tra cứu khi bôi đen (hoạt động toàn hệ thống khi BẬT, tự tắt trong phòng thi & trang learn) */}
      <SelectionLookupPopover
        enabled={isLookupEnabled && !isExcludedRoute}
      />
    </>
  );
}
export default FloatingStudyTimer;
