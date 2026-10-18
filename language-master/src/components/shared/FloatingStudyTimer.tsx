// src/components/shared/FloatingStudyTimer.tsx
// Tiện ích Học tập nổi (Compact Floating Study Dock)
// - Thanh nổi mini siêu gọn (Đồng hồ + Công tắc tra từ 1-chạm) kéo thả cực nhẹ 120 FPS
// - Modal Popup layout ngang (2 cột side-by-side) phong cách Glassmorphism & Pastel cao cấp
// - Hỗ trợ phím tắt Bật/Tắt nhanh toàn hệ thống: F9 hoặc Alt + T
// - Đứng trên mọi lớp (zIndex: 99999)

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck,
  Zap
} from 'lucide-react';
import SelectionLookupPopover from './SelectionLookupPopover';

type TimerMode = 'pomodoro' | 'stopwatch';

export function FloatingStudyTimer() {
  const location = useLocation();
  const isExcludedRoute = location.pathname.startsWith('/exams') || location.pathname.startsWith('/learn');

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [mobileTab, setMobileTab] = useState<'timer' | 'lookup'>('timer');

  // Pomodoro settings (seconds)
  const [pomoPreset, setPomoPreset] = useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Stopwatch
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);

  // Chế độ Bôi đen tra từ (Mặc định: BẬT SẴN để dùng được ngay, lưu vào localStorage)
  const [isLookupEnabled, setIsLookupEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('nihongo_selection_lookup_enabled');
    return saved !== 'false';
  });

  // Toast thông báo nhỏ
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  }, []);

  const handleToggleLookup = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLookupEnabled(prev => {
      const next = !prev;
      localStorage.setItem('nihongo_selection_lookup_enabled', String(next));
      showToast(next ? 'Đã BẬT tra từ khi bôi đen (F9) 📖' : 'Đã TẮT tra từ khi bôi đen (F9) 💤');
      return next;
    });
  }, [showToast]);

  // Phím tắt Bật/Tắt nhanh toàn hệ thống: F9 hoặc Alt + T
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Bấm F9 hoặc Alt + T (hoặc Cmd + T)
      if (e.key === 'F9' || ((e.altKey || e.metaKey) && (e.key === 't' || e.key === 'T'))) {
        e.preventDefault();
        handleToggleLookup();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleLookup]);

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
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none flex items-center gap-2"
          style={{ zIndex: 999999 }}
        >
          <Sparkles size={14} className="text-amber-400" />
          <span>{toastMsg}</span>
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
        className="fixed flex items-center p-1 rounded-full shadow-2xl backdrop-blur-md border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 select-none touch-none transition-shadow hover:shadow-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-600"
      >
        {/* Khối 1: Nút kéo và Đồng hồ (Bấm mở Modal) */}
        <div
          onPointerDown={handlePointerDown}
          className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full cursor-grab active:cursor-grabbing transition-all ${
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
          title={isLookupEnabled ? 'Tra từ khi bôi đen: ĐANG BẬT (Bấm để tắt hoặc nhấn F9)' : 'Tra từ khi bôi đen: ĐÃ TẮT (Bấm để bật hoặc nhấn F9)'}
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
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
          style={{ zIndex: 999999 }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white tracking-wide uppercase">
                    Tiện Ích Học Tập & Tra Từ
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Đồng hồ tập trung Pomodoro & Trợ lý tra cứu vựng đa sách
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Tab Switcher (Chỉ hiển thị trên điện thoại < md) */}
            <div className="flex md:hidden p-2 bg-slate-100 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700/80 gap-1.5">
              <button
                type="button"
                onClick={() => setMobileTab('timer')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileTab === 'timer'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Timer size={14} />
                <span>Đồng hồ</span>
                {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('lookup')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileTab === 'lookup'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Languages size={14} />
                <span>Tra từ bôi đen</span>
                <span className={`w-2 h-2 rounded-full ${isLookupEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              </button>
            </div>

            {/* Body: LAYOUT SANG NGANG 2 CỘT CÂN ĐỐI TRÊN DESKTOP, CHUYỂN TAB TRÊN MOBILE */}
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch bg-slate-100/50 dark:bg-slate-900 max-h-[82vh] overflow-y-auto">
              {/* CỘT TRÁI: ĐỒNG HỒ TẬP TRUNG (POMODORO / BẤM GIỜ) */}
              <div className={`${mobileTab === 'timer' ? 'flex' : 'hidden md:flex'} space-y-4 flex-col justify-between p-4.5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm`}>
                {/* Mode Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('pomodoro');
                      setIsRunning(false);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'pomodoro'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                            ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700/60'
                        }`}
                      >
                        {p.isBreak && <Coffee size={12} className="inline mr-1 -mt-0.5 text-amber-500" />}
                        {p.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium py-1">
                    Bấm giờ đếm thời gian học tập tự do
                  </div>
                )}

                {/* Big Timer Display */}
                <div className="text-center py-5 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-inner">
                  <div
                    className={`text-5xl font-black font-mono tracking-tight transition-colors ${
                      isRunning
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {displayTime}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
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
                    className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Đặt lại thời gian"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRunning(r => !r)}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm active:scale-95 cursor-pointer ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
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

              {/* CỘT PHẢI: TRỢ LÝ TRA TỪ KHI BÔI ĐEN */}
              <div className={`${mobileTab === 'lookup' ? 'flex' : 'hidden md:flex'} space-y-4 flex-col justify-between p-4.5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm`}>
                {/* Header Tra Từ & Nút Switch chuẩn Apple (không bao giờ bị bẹp) */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-50/70 dark:bg-slate-900/90 border border-indigo-100 dark:border-slate-700/80">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Languages size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Tra từ khi bôi đen
                      </h3>
                      <span 
                        className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isLookupEnabled 
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isLookupEnabled ? '● ĐANG BẬT' : '○ ĐÃ TẮT'}
                      </span>
                    </div>
                  </div>

                  {/* Nút Switch chuẩn phong cách Apple (dùng inline style chống bẹp 100%) */}
                  <button
                    type="button"
                    onClick={() => handleToggleLookup()}
                    className={`relative flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      isLookupEnabled 
                        ? 'bg-indigo-600' 
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    style={{ width: '52px', height: '28px', minWidth: '52px' }}
                    title={isLookupEnabled ? 'Bấm để Tắt tra từ (F9)' : 'Bấm để Bật tra từ (F9)'}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out"
                      style={{
                        transform: isLookupEnabled ? 'translateX(24px)' : 'translateX(0px)',
                      }}
                    />
                  </button>
                </div>

                {/* Banner phím tắt Bật/Tắt nhanh F9 hoặc Alt + T */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Zap size={16} className="text-amber-500" />
                    <span>Phím tắt Bật / Tắt:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs shadow-2xs">
                      F9
                    </kbd>
                    <span className="text-slate-400 text-[11px]">hoặc</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs shadow-2xs">
                      Alt + T
                    </kbd>
                  </div>
                </div>

                {/* Danh sách tính năng nổi bật: màu sắc tương phản cao, dễ đọc */}
                <div className="space-y-2.5 bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                  <div className="flex items-start gap-2.5">
                    <BookOpen size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Gom Đa Sách trong hệ thống:</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        Quét toàn bộ giáo trình chứa từ bôi đen kèm ví dụ và cấp độ.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Globe size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Dịch từ vựng & câu ví dụ dài:</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        Tự động dịch cả từ đơn và cả câu ví dụ dài sang tiếng Việt.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <PlusCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">1-Chạm lưu vào Sổ tay:</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        Lưu từ kèm ngữ cảnh gốc vào Sổ tay từ vựng của bạn.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chế độ an toàn phòng thi */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 px-1">
                  <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                  <span>Tự động bảo mật: Tắt trong bài thi thử để chống gian lận.</span>
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
