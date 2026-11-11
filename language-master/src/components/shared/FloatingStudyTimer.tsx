// src/components/shared/FloatingStudyTimer.tsx
// Tiện ích Học tập nổi (Compact Floating Study Dock)
// - Thanh nổi mini siêu gọn (Đồng hồ + Công tắc tra từ 1-chạm) kéo thả cực nhẹ 120 FPS
// - Modal Popup layout ngang (2 cột side-by-side) phong cách hiện đại, cân đối, kèm ô tra từ nhanh
// - Hỗ trợ phím tắt Bật/Tắt & Tra cứu nhanh toàn hệ thống: F9 hoặc Alt + T
// - Đứng trên mọi lớp (zIndex: 99999)

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Zap,
  Search,
} from 'lucide-react';
import SelectionLookupPopover from './SelectionLookupPopover';

type TimerMode = 'pomodoro' | 'stopwatch';

export function FloatingStudyTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [mobileTab, setMobileTab] = useState<'timer' | 'lookup'>('timer');
  const [quickWord, setQuickWord] = useState('');

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

  // Nhận diện trạng thái văn bản đang được bôi đen trên trang để phát sáng nút
  const [hasSelectedText, setHasSelectedText] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState('');
  const [isJlptMockActive, setIsJlptMockActive] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.body.dataset.jlptMockActive === 'true';
  });

  useEffect(() => {
    const onJlptMockActive = (e: Event) => {
      const custom = e as CustomEvent<{ active?: boolean }>;
      if (typeof custom.detail?.active === 'boolean') {
        setIsJlptMockActive(custom.detail.active);
      } else {
        setIsJlptMockActive(document.body.dataset.jlptMockActive === 'true');
      }
    };
    window.addEventListener('app:jlpt-mock-active', onJlptMockActive);
    return () =>
      window.removeEventListener('app:jlpt-mock-active', onJlptMockActive);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onSelectionChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        const t = sel?.toString().trim() || '';
        const isValid =
          t.length >= 1 &&
          t.length <= 350 &&
          !/^[\d\s.,/#!$%^&*;:{}=\-_`~()]+$/.test(t);
        setHasSelectedText(isValid);
        setSelectedSnippet(isValid ? t : '');
      }, 120);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, []);

  // NÚT TRA CỨU TRỰC TIẾP (Cho cả Điện thoại và Máy tính)
  const handleTriggerLookupNow = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!isLookupEnabled) {
        setIsLookupEnabled(true);
        localStorage.setItem('nihongo_selection_lookup_enabled', 'true');
        window.dispatchEvent(
          new CustomEvent('app:selection-lookup-toggle', {
            detail: { enabled: true },
          }),
        );
        showToast('Đã tự động BẬT tra từ khi bôi đen 📖');
      }

      const selection = window.getSelection();
      let text = selection?.toString().trim();
      if (!text && selectedSnippet) {
        text = selectedSnippet;
      }

      if (
        text &&
        text.length >= 1 &&
        text.length <= 350 &&
        !/^[\d\s.,/#!$%^&*;:{}=\-_`~()]+$/.test(text)
      ) {
        window.dispatchEvent(
          new CustomEvent('app:trigger-selection-lookup', {
            detail: { text },
          }),
        );
      } else {
        setIsOpen(true);
        setMobileTab('lookup');
      }
    },
    [isLookupEnabled, selectedSnippet, showToast],
  );

  const handleToggleLookup = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setIsLookupEnabled(prev => {
        const next = !prev;
        localStorage.setItem('nihongo_selection_lookup_enabled', String(next));
        window.dispatchEvent(
          new CustomEvent('app:selection-lookup-toggle', {
            detail: { enabled: next },
          }),
        );
        showToast(
          next
            ? 'Đã BẬT tra từ khi bôi đen (F9) 📖'
            : 'Đã TẮT tra từ khi bôi đen (F9) 💤',
        );
        return next;
      });
    },
    [showToast],
  );

  const handleQuickLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickWord.trim();
    if (!q) return;
    if (!isLookupEnabled) {
      setIsLookupEnabled(true);
      localStorage.setItem('nihongo_selection_lookup_enabled', 'true');
      window.dispatchEvent(
        new CustomEvent('app:selection-lookup-toggle', {
          detail: { enabled: true },
        }),
      );
    }
    setIsOpen(false);
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('app:trigger-selection-lookup', {
          detail: { text: q },
        }),
      );
    }, 60);
  };

  // Phím tắt Bật/Tắt hoặc Tra Cứu Trực Tiếp toàn hệ thống: F9 hoặc Alt + T
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F9' ||
        ((e.altKey || e.metaKey) && (e.key === 't' || e.key === 'T'))
      ) {
        e.preventDefault();
        const sel = window.getSelection()?.toString().trim();
        if (sel) {
          handleTriggerLookupNow();
        } else {
          handleToggleLookup();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleTriggerLookupNow, handleToggleLookup]);

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

  useEffect(() => {
    currentPosRef.current = pos;
  }, [pos]);

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
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'pomodoro') {
          setTimeLeft(prev => {
            if (prev <= 1) {
              setIsRunning(false);
              try {
                const AudioCtx =
                  window.AudioContext ||
                  (window as unknown as { webkitAudioContext: typeof AudioContext })
                    .webkitAudioContext;
                const ctx = new AudioCtx();
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
              } catch {
                // ignore audio errors
              }
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

  const displayTime =
    mode === 'pomodoro' ? formatSeconds(timeLeft) : formatStopwatch(stopwatchSeconds);

  const pomoProgress =
    mode === 'pomodoro' && pomoPreset > 0
      ? Math.min(100, Math.max(0, Math.round(((pomoPreset - timeLeft) / pomoPreset) * 100)))
      : 0;

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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    buttonStartPosRef.current = {
      x: currentPosRef.current.x,
      y: currentPosRef.current.y,
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isDraggingRef.current || !buttonRef.current) return;
      const dx = moveEv.clientX - dragStartPosRef.current.x;
      const dy = moveEv.clientY - dragStartPosRef.current.y;

      if (Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
      }

      const buttonWidth = buttonRef.current.offsetWidth || 135;
      const buttonHeight = buttonRef.current.offsetHeight || 38;

      const nextX = Math.min(
        Math.max(8, buttonStartPosRef.current.x + dx),
        window.innerWidth - buttonWidth - 8,
      );
      const nextY = Math.min(
        Math.max(8, buttonStartPosRef.current.y + dy),
        window.innerHeight - buttonHeight - 8,
      );

      buttonRef.current.style.left = `${nextX}px`;
      buttonRef.current.style.top = `${nextY}px`;
      currentPosRef.current = { x: nextX, y: nextY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (hasDraggedRef.current) {
        setPos(currentPosRef.current);
        localStorage.setItem('timer_pos_x', String(currentPosRef.current.x));
        localStorage.setItem('timer_pos_y', String(currentPosRef.current.y));
      } else {
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
        {/* Khối 1: Nút kéo và Đồng hồ (Ẩn mặt số Pomodoro khi đang thi thử bấm giờ JLPT - B2) */}
        {!isJlptMockActive && (
          <>
            <div
              onPointerDown={handlePointerDown}
              className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full cursor-grab active:cursor-grabbing transition-all ${
                isRunning
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Kéo để di chuyển • Nhấp để mở Bảng tiện ích học tập & tra từ"
            >
              <GripVertical
                size={11}
                className="text-slate-400 dark:text-slate-500 opacity-60 shrink-0 pointer-events-none"
              />
              <Timer
                size={14}
                className={
                  isRunning
                    ? 'text-amber-500 animate-pulse'
                    : 'text-indigo-600 dark:text-indigo-400'
                }
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
          </>
        )}

        {/* Khối 2: Nút Tra Cứu Trực Tiếp */}
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={handleTriggerLookupNow}
          className={`p-1.5 rounded-full transition-all cursor-pointer relative flex items-center justify-center active:scale-95 ${
            hasSelectedText
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/40 ring-2 ring-indigo-300 dark:ring-indigo-700'
              : isLookupEnabled
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-75'
          }`}
          title={
            hasSelectedText
              ? `Chạm để tra ngay: "${selectedSnippet}" (F9)`
              : isLookupEnabled
                ? 'Tra cứu trực tiếp: Bôi đen chữ rồi chạm vào đây (F9)'
                : 'Chế độ tra từ đang tắt — bấm để bật hoặc mở bảng tra từ'
          }
        >
          <Languages size={15} className={hasSelectedText ? 'animate-pulse' : ''} />
          <span
            className={`absolute top-0.5 right-0.5 w-2 h-2 rounded-full transition-colors ${
              hasSelectedText
                ? 'bg-emerald-400 ring-2 ring-white dark:ring-slate-900 animate-ping'
                : isLookupEnabled
                  ? 'bg-emerald-500 ring-1.5 ring-white dark:ring-slate-900'
                  : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
        </button>
      </div>

      {/* ================= CENTERED POPUP MODAL (REDESIGNED 2-COLUMN PREMIUM LAYOUT) ================= */}
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200"
          style={{ zIndex: 999999 }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/80 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                  <Sparkles size={19} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                      TIỆN ÍCH HỌC TẬP & TRA TỪ
                    </h2>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      Toàn hệ thống
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Đồng hồ tập trung Pomodoro & Trợ lý tra cứu từ vựng đa sách
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

            {/* Mobile Tab Switcher */}
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
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
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
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLookupEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Body: 2-Column Balanced Grid */}
            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch bg-slate-50/70 dark:bg-slate-900/90 max-h-[82vh] overflow-y-auto">
              {/* CỘT TRÁI (5/12): ĐỒNG HỒ TẬP TRUNG */}
              <div
                className={`${
                  mobileTab === 'timer' ? 'flex' : 'hidden md:flex'
                } md:col-span-5 flex-col gap-4 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-sm`}
              >
                {/* Mode Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('pomodoro');
                      setIsRunning(false);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'pomodoro'
                        ? 'bg-indigo-600 text-white shadow-sm'
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
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      mode === 'stopwatch'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Bấm Giờ
                  </button>
                </div>

                {/* Presets */}
                {mode === 'pomodoro' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '25 phút', min: 25 },
                      { label: '50 phút', min: 50 },
                      { label: '5p nghỉ', min: 5, isBreak: true },
                    ].map(p => (
                      <button
                        key={p.min}
                        type="button"
                        onClick={() => handleSelectPreset(p.min)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                          pomoPreset === p.min * 60
                            ? 'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-400 dark:border-indigo-500 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60'
                        }`}
                      >
                        {p.isBreak && (
                          <Coffee
                            size={12}
                            className="inline mr-1 -mt-0.5 text-amber-500"
                          />
                        )}
                        {p.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                    Đếm thời gian học tập & luyện đề tự do
                  </div>
                )}

                {/* Big Timer Display + Progress Bar */}
                <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 bg-gradient-to-b from-slate-50 to-indigo-50/30 dark:from-slate-900/90 dark:to-indigo-950/20 rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
                  <div
                    className={`text-5xl font-black font-mono tracking-tight transition-colors ${
                      isRunning
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {displayTime}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold flex items-center gap-1.5">
                    {isRunning ? (
                      mode === 'pomodoro' ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>Đang trong phiên tập trung...</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                          <span>Đang đếm thời gian học...</span>
                        </>
                      )
                    ) : (
                      <span>Đã tạm dừng · Sẵn sàng bắt đầu</span>
                    )}
                  </p>
                  {mode === 'pomodoro' && (
                    <div className="w-full mt-4 space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                          style={{ width: `${pomoProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-right font-bold text-slate-400 dark:text-slate-500">
                        Tiến độ: {pomoProgress}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2.5">
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
                    className={`flex-1 py-3.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm active:scale-95 cursor-pointer ${
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

              {/* CỘT PHẢI (7/12): TRỢ LÝ TRA TỪ ĐA SÁCH & TRA NHANH */}
              <div
                className={`${
                  mobileTab === 'lookup' ? 'flex' : 'hidden md:flex'
                } md:col-span-7 flex-col justify-between gap-3.5 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-sm`}
              >
                {/* Header Tra Từ & Nút Switch */}
                <div
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-colors ${
                    isLookupEnabled
                      ? 'bg-gradient-to-r from-indigo-50/90 to-emerald-50/50 dark:from-indigo-950/50 dark:to-emerald-950/30 border-indigo-200 dark:border-indigo-800/80'
                      : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-2xl shrink-0 ${
                        isLookupEnabled
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Languages size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                          Tra từ khi bôi đen
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isLookupEnabled
                              ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isLookupEnabled ? '● ĐANG BẬT' : '○ ĐÃ TẮT'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {isLookupEnabled
                          ? 'Bôi đen từ bất kỳ trên trang để xem nghĩa & lưu sổ tay'
                          : 'Bật công tắc bên phải để tự động tra từ khi bôi đen'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleLookup()}
                    className={`relative flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      isLookupEnabled
                        ? 'bg-indigo-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    style={{ width: '52px', height: '28px', minWidth: '52px' }}
                    title={
                      isLookupEnabled
                        ? 'Bấm để Tắt tra từ (F9)'
                        : 'Bấm để Bật tra từ (F9)'
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out"
                      style={{
                        transform: isLookupEnabled
                          ? 'translateX(24px)'
                          : 'translateX(0px)',
                      }}
                    />
                  </button>
                </div>

                {/* Ô Nhập Tra Từ Trực Tiếp ngay trong Popup */}
                <form onSubmit={handleQuickLookupSubmit} className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={quickWord}
                      onChange={e => setQuickWord(e.target.value)}
                      placeholder="Nhập hoặc dán từ/câu cần tra ngay..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!quickWord.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    Tra ngay
                  </button>
                </form>

                {/* Banner phím tắt */}
                <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <Zap size={15} className="text-amber-500" />
                    <span>Phím tắt Bật / Tắt & Tra nhanh:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                      F9
                    </kbd>
                    <span className="text-slate-400 text-[11px]">hoặc</span>
                    <kbd className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                      Alt + T
                    </kbd>
                  </div>
                </div>

                {/* Danh sách 3 tính năng */}
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/50">
                    <div className="p-2 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <BookOpen size={15} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Gom Đa Sách trong hệ thống:
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Quét toàn bộ giáo trình chứa từ bôi đen kèm ví dụ và cấp độ.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/50">
                    <div className="p-2 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Globe size={15} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Dịch từ vựng & câu ví dụ dài:
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Tự động dịch cả từ đơn và câu dài sang tiếng Việt trực tuyến.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/50">
                    <div className="p-2 rounded-xl bg-amber-100/80 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 shrink-0">
                      <PlusCircle size={15} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        1-Chạm lưu vào Sổ tay:
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Lưu từ kèm ngữ cảnh câu gốc vào Sổ tay từ vựng cá nhân.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hỗ trợ toàn hệ thống */}
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold px-1">
                  <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                  <span>
                    Tra từ tự do toàn hệ thống (hoạt động cả trong Luyện đề & Kiểm tra).
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popover tra cứu khi bôi đen */}
      <SelectionLookupPopover enabled={isLookupEnabled} />
    </>
  );
}

export default FloatingStudyTimer;
