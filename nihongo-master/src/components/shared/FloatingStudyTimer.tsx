// src/components/shared/FloatingStudyTimer.tsx
// Tiện ích Hẹn giờ học tập nổi (Floating Docked Study Timer)
// Popup cố định đứng im, có xử lý click ngoài để đóng, hỗ trợ đổi góc neo

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Coffee, Settings2 } from 'lucide-react';

type TimerMode = 'pomodoro' | 'stopwatch';
type CornerPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export function FloatingStudyTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  
  // Dock position preference
  const [corner, setCorner] = useState<CornerPosition>(() => {
    return (localStorage.getItem('timer_dock_pos') as CornerPosition) || 'bottom-right';
  });

  // Pomodoro settings (seconds)
  const [pomoPreset, setPomoPreset] = useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  // Stopwatch
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close expanded popup
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
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

  const cycleCorner = (e: React.MouseEvent) => {
    e.stopPropagation();
    const corners: CornerPosition[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];
    const nextIdx = (corners.indexOf(corner) + 1) % corners.length;
    const next = corners[nextIdx];
    setCorner(next);
    localStorage.setItem('timer_dock_pos', next);
  };

  // Position classes
  const getCornerClasses = () => {
    switch (corner) {
      case 'bottom-left':
        return 'bottom-6 left-6 items-start';
      case 'top-right':
        return 'top-20 right-6 items-end';
      case 'top-left':
        return 'top-20 left-6 items-start';
      case 'bottom-right':
      default:
        return 'bottom-6 right-6 items-end';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed z-[9999] flex flex-col pointer-events-auto select-none ${getCornerClasses()}`}
    >
      {/* Expanded Popup (Stationary / Đứng im) */}
      {isOpen && (
        <div
          className={`w-72 sm:w-80 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200 mb-3 ${
            corner.startsWith('top') ? 'order-2 mt-3 mb-0' : 'order-1'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Timer size={16} />
              <span>Đồng Hồ Tập Trung</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={cycleCorner}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
                title={`Vị trí: ${corner} (Bấm để đổi góc)`}
              >
                <Settings2 size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
                title="Thu nhỏ"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Mode Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
              <button
                onClick={() => { setMode('pomodoro'); setIsRunning(false); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'pomodoro'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Pomodoro
              </button>
              <button
                onClick={() => { setMode('stopwatch'); setIsRunning(false); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  mode === 'stopwatch'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Bấm Giờ
              </button>
            </div>

            {/* Presets (for Pomodoro) */}
            {mode === 'pomodoro' && (
              <div className="flex items-center justify-center gap-2">
                {[
                  { label: '25p', min: 25 },
                  { label: '50p', min: 50 },
                  { label: '5p nghỉ', min: 5, isBreak: true },
                ].map(p => (
                  <button
                    key={p.min}
                    onClick={() => handleSelectPreset(p.min)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      pomoPreset === p.min * 60
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700'
                        : 'bg-slate-50 dark:bg-slate-700/30 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    {p.isBreak && <Coffee size={12} className="inline mr-1 -mt-0.5" />}
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Big Timer Display */}
            <div className="text-center py-2">
              <div className={`text-5xl font-black font-mono tracking-tight transition-colors ${
                isRunning ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-white'
              }`}>
                {displayTime}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isRunning
                  ? (mode === 'pomodoro' ? 'Đang trong phiên tập trung...' : 'Đang đếm thời gian...')
                  : 'Đã tạm dừng'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={handleReset}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                title="Đặt lại"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={() => setIsRunning(r => !r)}
                className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all ${
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
                    <span>Bắt đầu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed Docked Pill Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md border transition-all cursor-pointer ${
          corner.startsWith('top') ? 'order-1' : 'order-2'
        } ${
          isRunning
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400/50 ring-4 ring-indigo-500/20 animate-pulse'
            : 'bg-white/95 dark:bg-slate-800/95 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-slate-900/10'
        }`}
        title="Bấm để mở / đóng bảng Hẹn giờ tập trung"
      >
        <Timer size={16} className={isRunning ? 'text-amber-300' : 'text-indigo-600 dark:text-indigo-400'} />
        <span className="font-mono font-bold text-sm tracking-wider">{displayTime}</span>
        {isRunning && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </button>
    </div>
  );
}
