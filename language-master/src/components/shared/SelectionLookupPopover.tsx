// src/components/shared/SelectionLookupPopover.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  BookOpen, 
  Globe, 
  Plus, 
  Check, 
  X, 
  Loader2,
  Bookmark,
  Sparkles,
  Info,
  Languages
} from 'lucide-react';
import { 
  lookupInSystemMultiBook, 
  lookupExternal, 
  quickSaveWordToNotebook,
  type BookWordGroup,
  type ExternalLookupResult
} from '../../lib/dictionary/multiBookLookup';
import { useAuth } from '../../context/auth/useAuth';

interface SelectionLookupPopoverProps {
  enabled?: boolean;
  currentSentence?: string;
  currentSentenceTranslation?: string;
  languageTemplate?: 'japanese' | 'english' | 'generic';
}

export const SelectionLookupPopover: React.FC<SelectionLookupPopoverProps> = ({
  enabled = true,
  currentSentence = '',
  currentSentenceTranslation = '',
  languageTemplate = 'japanese',
}) => {
  const { user } = useAuth();
  
  const [selectedText, setSelectedText] = useState<string>('');
  const [coords, setCoords] = useState<{ x: number; y: number; placeAbove: boolean; width?: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'external'>('system');

  // Dữ liệu tra cứu
  const [systemGroups, setSystemGroups] = useState<BookWordGroup[]>([]);
  const [externalResult, setExternalResult] = useState<ExternalLookupResult | null>(null);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);

  // Trạng thái nút chạm thông minh trên Điện thoại (Smart Touch Action Button)
  const [touchTrigger, setTouchTrigger] = useState<{
    x: number;
    y: number;
    placeAbove: boolean;
    text: string;
    rect: DOMRect;
  } | null>(null);

  // Trạng thái lưu từ
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedCoursesMap, setSavedCoursesMap] = useState<Record<string, string>>({});

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const touchTriggerRef = useRef<HTMLDivElement | null>(null);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);

  // Phát âm TTS
  const speakText = useCallback((text: string) => {
    if (!text || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = languageTemplate === 'english' ? 'en-US' : 'ja-JP';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }, [languageTemplate]);

  // Đóng popover
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedText('');
    setCoords(null);
    setTouchTrigger(null);
  }, []);

  // Thực thi mở Popover tra cứu với văn bản được chỉ định
  const executeLookup = useCallback((text: string, sourceRect?: DOMRect) => {
    const isMobile = window.innerWidth < 640;
    const popoverWidth = isMobile ? Math.min(360, window.innerWidth - 24) : 380;
    const popoverHeight = 340;

    let x = isMobile
      ? (window.innerWidth - popoverWidth) / 2
      : sourceRect 
        ? sourceRect.left + sourceRect.width / 2 - popoverWidth / 2
        : (window.innerWidth - popoverWidth) / 2;
    x = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, x));

    const placeAbove = sourceRect ? sourceRect.top >= popoverHeight + 20 : true;
    const y = sourceRect 
      ? (placeAbove ? sourceRect.top - 10 : sourceRect.bottom + 10)
      : 80;

    setSelectedText(text);
    setCoords({ x, y, placeAbove, width: popoverWidth });
    setIsOpen(true);
    setSavedCoursesMap({});
    setTouchTrigger(null);

    // 1. Tra cứu Trong Hệ Thống (Đa Sách)
    const sysLookup = lookupInSystemMultiBook(text);
    setSystemGroups(sysLookup.groups);

    if (sysLookup.groups.length === 0) {
      setActiveTab('external');
    } else {
      setActiveTab('system');
    }

    // 2. Tra cứu Ngoài Hệ Thống (Online)
    setIsLoadingExternal(true);
    setExternalResult(null);
    lookupExternal(text, languageTemplate)
      .then(res => {
        setExternalResult(res);
      })
      .finally(() => {
        setIsLoadingExternal(false);
      });
  }, [languageTemplate]);

  // Bắt sự kiện bôi đen:
  // - PC (Chuột): Nhả chuột (mouseup) -> Tự động mở Popover ngay lập tức
  // - Điện thoại (Cảm ứng): Khi bôi đen -> Nổi nút Chạm Thông Minh [🔍 Tra từ: "text"] ngay trên chữ (Touch Action Bubble)
  useEffect(() => {
    if (!enabled) {
      setTouchTrigger(null);
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const evaluateSelection = (targetEl: HTMLElement | null, isTouchDevice: boolean) => {
      // 1. Không can thiệp nếu thao tác trong chính Popover hoặc nút Chạm
      if (popoverRef.current && targetEl && popoverRef.current.contains(targetEl)) {
        return;
      }
      if (touchTriggerRef.current && targetEl && touchTriggerRef.current.contains(targetEl)) {
        return;
      }

      // 2. Không kích hoạt nếu đang nhả chuột/tay trong input / textarea
      if (
        targetEl && (
          targetEl.closest('[data-no-selection-lookup]') ||
          ['input', 'textarea', 'select'].includes(targetEl.tagName.toLowerCase())
        )
      ) {
        return;
      }

      const selection = window.getSelection();
      const text = selection?.toString().trim();

      // Kiểm tra độ dài hợp lệ (1 - 350 ký tự)
      if (!text || text.length < 1 || text.length > 350) {
        setTouchTrigger(null);
        if (isOpen && targetEl && !popoverRef.current?.contains(targetEl)) {
          handleClose();
        }
        return;
      }

      // Bỏ qua nếu toàn số và ký tự vô nghĩa
      if (/^[\d\s.,\/#!$%\^&\*;:{}=\-_`~()]+$/.test(text)) {
        setTouchTrigger(null);
        return;
      }

      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      let rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        const rects = range.getClientRects();
        if (rects.length > 0) {
          rect = rects[0];
        } else if (lastTouchPosRef.current) {
          rect = {
            left: lastTouchPosRef.current.x - 20,
            right: lastTouchPosRef.current.x + 20,
            top: lastTouchPosRef.current.y - 20,
            bottom: lastTouchPosRef.current.y + 20,
            width: 40,
            height: 40,
          } as DOMRect;
        }
      }
      if (rect.width === 0 && rect.height === 0) return;

      const isMobile = window.innerWidth < 768 || isTouchDevice;

      if (isMobile) {
        // TRÊN ĐIỆN THOẠI: Hiển thị Nút Chạm Thông Minh (Touch Action Pill)
        const placeAbove = rect.top >= 48;
        let x = rect.left + rect.width / 2;
        x = Math.max(65, Math.min(window.innerWidth - 65, x));
        const y = placeAbove ? rect.top - 8 : rect.bottom + 8;

        setTouchTrigger({
          x,
          y,
          placeAbove,
          text,
          rect,
        });
      } else {
        // TRÊN MÁY TÍNH: Mở ngay Popover
        executeLookup(text, rect);
      }
    };

    // 1. Sự kiện TouchStart (Ghi nhận tọa độ chạm ngón tay)
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    // 2. Sự kiện MouseUp (Desktop PC chuột)
    const handleMouseUp = (e: MouseEvent) => {
      evaluateSelection(e.target as HTMLElement | null, false);
    };

    // 3. Sự kiện SelectionChange (Chuẩn W3C trên Mobile cho cả iOS Safari và Android Chrome)
    const handleSelectionChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const isTouch = window.innerWidth < 768 || ('ontouchstart' in window);
        if (isTouch) {
          evaluateSelection(null, true);
        }
      }, 200);
    };

    // 4. Sự kiện TouchEnd (Mobile)
    const handleTouchEnd = (e: TouchEvent) => {
      setTimeout(() => {
        const touch = e.changedTouches[0];
        let targetEl = e.target as HTMLElement | null;
        if (touch && (!targetEl || targetEl === document.body)) {
          targetEl = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
        }
        evaluateSelection(targetEl, true);
      }, 100);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // 5. Sự kiện Tra Cứu Trực Tiếp từ Nút Thanh Nổi hoặc Phím tắt F9
    const handleTriggerLookupEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ text?: string }>;
      let text = customEvent.detail?.text;
      if (!text) {
        text = window.getSelection()?.toString().trim();
      }

      if (text && text.length >= 1 && text.length <= 350) {
        const selection = window.getSelection();
        let rect: DOMRect | undefined;
        if (selection && selection.rangeCount > 0) {
          const r = selection.getRangeAt(0);
          const b = r.getBoundingClientRect();
          if (b.width > 0 && b.height > 0) {
            rect = b;
          } else {
            const rects = r.getClientRects();
            if (rects.length > 0) rect = rects[0];
          }
        }
        executeLookup(text, rect);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('app:trigger-selection-lookup', handleTriggerLookupEvent);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('app:trigger-selection-lookup', handleTriggerLookupEvent);
    };
  }, [enabled, isOpen, handleClose, executeLookup]);

  // Lưu từ vào sổ tay (1 chạm)
  const handleSaveWord = async (params: {
    term: string;
    reading?: string;
    meaning: string;
    key: string;
    exampleKanji?: string;
    exampleMeaning?: string;
  }) => {
    const { term, reading = '', meaning, key, exampleKanji, exampleMeaning } = params;
    try {
      setSavingKey(key);
      const res = await quickSaveWordToNotebook({
        term,
        reading,
        meaning,
        exampleKanji: exampleKanji || currentSentence || '',
        exampleMeaning: exampleMeaning || currentSentenceTranslation || '',
        userId: user?.uid,
        userProfile: user,
      });

      setSavedCoursesMap(prev => ({ ...prev, [key]: res.courseTitle }));
    } catch (err) {
      console.error('Lỗi lưu từ vựng:', err);
    } finally {
      setSavingKey(null);
    }
  };

  if ((!isOpen || !coords) && !touchTrigger) return null;

  return createPortal(
    <>
      {/* NÚT CHẠM THÔNG MINH TRÊN ĐIỆN THOẠI (Smart Touch Action Button) */}
      {touchTrigger && !isOpen && (
        <div
          ref={touchTriggerRef}
          className="fixed pointer-events-auto animate-in zoom-in-95 duration-150"
          style={{
            left: `${touchTrigger.x}px`,
            top: `${touchTrigger.y}px`,
            transform: touchTrigger.placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            zIndex: 999998,
          }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              executeLookup(touchTrigger.text, touchTrigger.rect);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-xl shadow-indigo-500/40 text-xs font-bold active:scale-95 transition-all cursor-pointer border border-white/25 select-none whitespace-nowrap"
          >
            <Languages size={15} className="text-indigo-200 animate-pulse" />
            <span>Tra từ</span>
            <span className="max-w-[100px] truncate opacity-90 font-normal">"{touchTrigger.text}"</span>
          </button>
        </div>
      )}

      {/* POPOVER TRA CỨU CHI TIẾT */}
      {isOpen && coords && (
        <AnimatePresence>
          <div 
            ref={popoverRef}
            className="fixed text-slate-800 dark:text-slate-100 font-sans pointer-events-auto"
            style={{
              left: `${coords.x}px`,
              top: coords.placeAbove ? 'auto' : `${coords.y}px`,
              bottom: coords.placeAbove ? `${window.innerHeight - coords.y}px` : 'auto',
              width: coords.width ? `${coords.width}px` : '380px',
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 999999,
            }}
            onMouseDown={e => e.stopPropagation()}
          >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: coords.placeAbove ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '420px' }}
        >
          {/* Header Popover */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400 tracking-wide truncate">
                {selectedText}
              </span>
              <button
                type="button"
                onClick={() => speakText(selectedText)}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors shadow-2xs cursor-pointer"
                title="Phát âm"
              >
                <Volume2 className="w-4 h-4 text-indigo-500" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 px-2 pt-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`flex-1 py-1.5 px-3 rounded-t-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border-t border-x border-slate-200 dark:border-slate-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Trong hệ thống</span>
              {systemGroups.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold rounded-full">
                  {systemGroups.length} sách
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('external')}
              className={`flex-1 py-1.5 px-3 rounded-t-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'external'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border-t border-x border-slate-200 dark:border-slate-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ngoài hệ thống</span>
              {isLoadingExternal && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
            </button>
          </div>

          {/* Body Content */}
          <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar text-xs">
            {activeTab === 'system' ? (
              // TAB 1: TRA TRONG HỆ THỐNG (ĐA SÁCH)
              systemGroups.length === 0 ? (
                <div className="py-6 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  <p className="text-xs">Chưa có sách nào trong hệ thống chứa từ này.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('external')}
                    className="mt-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-medium rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    Xem tra cứu ngoài hệ thống
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                    <span>Tìm thấy trong {systemGroups.length} giáo trình / sách:</span>
                  </div>

                  {systemGroups.map(group => (
                    <div 
                      key={group.courseId}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                    >
                      {/* Tiêu đề sách */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-1.5">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <Bookmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {group.courseName}
                          </span>
                        </div>
                        {group.level && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
                            {group.level}
                          </span>
                        )}
                      </div>

                      {/* Các định nghĩa trong sách */}
                      <div className="space-y-2">
                        {group.matches.map(m => {
                          const itemKey = `sys_${m.id}`;
                          const isSaved = Boolean(savedCoursesMap[itemKey]);

                          return (
                            <div key={m.id} className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{m.term}</span>
                                    {m.reading && (
                                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                        [{m.reading}]
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                                    {m.meaning}
                                  </div>
                                </div>

                                {/* Nút thêm nhanh 1-chạm */}
                                <button
                                  type="button"
                                  disabled={savingKey === itemKey || isSaved}
                                  onClick={() => handleSaveWord({
                                    term: m.term,
                                    reading: m.reading,
                                    meaning: m.meaning,
                                    key: itemKey,
                                    exampleKanji: m.example || currentSentence,
                                    exampleMeaning: m.exampleMeaning || currentSentenceTranslation,
                                  })}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all cursor-pointer inline-flex items-center gap-1 ${
                                    isSaved
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 text-slate-700 dark:text-slate-200 hover:text-indigo-600'
                                  }`}
                                  title="Lưu từ này vào Sổ tay cá nhân"
                                >
                                  {savingKey === itemKey ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                  ) : isSaved ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-500" />
                                      <span>Đã lưu</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3 h-3 text-indigo-500" />
                                      <span>Lưu vào kho</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Ví dụ trong sách nếu có */}
                              {m.example && (
                                <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                                  <div className="italic text-slate-700 dark:text-slate-300">
                                    {m.example}
                                  </div>
                                  {m.exampleMeaning && (
                                    <div className="text-slate-500 dark:text-slate-400">
                                      → {m.exampleMeaning}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // TAB 2: TRA NGOÀI HỆ THỐNG
              isLoadingExternal ? (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <p className="text-xs">Đang tra cứu từ điển trực tuyến...</p>
                </div>
              ) : externalResult ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {externalResult.term}
                          </span>
                          {externalResult.phonetic && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                              /{externalResult.phonetic}/
                            </span>
                          )}
                          {externalResult.partOfSpeech && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                              {externalResult.partOfSpeech}
                            </span>
                          )}
                        </div>

                        <div className="text-emerald-950 dark:text-emerald-200 font-medium text-xs mt-1 leading-relaxed">
                          {externalResult.translation}
                        </div>
                      </div>

                      {/* Nút thêm từ kết quả tra ngoài */}
                      {(() => {
                        const itemKey = `ext_${externalResult.term}`;
                        const isSaved = Boolean(savedCoursesMap[itemKey]);

                        return (
                          <button
                            type="button"
                            disabled={savingKey === itemKey || isSaved}
                            onClick={() => handleSaveWord({
                              term: externalResult.term,
                              reading: externalResult.phonetic || '',
                              meaning: externalResult.translation,
                              key: itemKey,
                              exampleKanji: currentSentence,
                              exampleMeaning: currentSentenceTranslation,
                            })}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all cursor-pointer inline-flex items-center gap-1 ${
                              isSaved
                                ? 'bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                            }`}
                            title="Lưu từ vựng tra ngoài này vào Sổ tay"
                          >
                            {savingKey === itemKey ? (
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            ) : isSaved ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
                                <span>Đã lưu</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 text-white" />
                                <span>Thêm vào kho</span>
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {/* Các định nghĩa mở rộng nếu có */}
                    {externalResult.definitions && externalResult.definitions.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-800/40 space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Định nghĩa bổ sung:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                          {externalResult.definitions.map((def, idx) => (
                            <li key={idx} className="leading-snug">{def}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Ngữ cảnh gốc đang học nếu có */}
                  {currentSentence && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-[11px] space-y-1">
                      <div className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Ngữ cảnh câu bạn đang học:</span>
                      </div>
                      <div className="italic text-slate-800 dark:text-slate-200">
                        "{currentSentence}"
                      </div>
                      {currentSentenceTranslation && (
                        <div className="text-slate-500 dark:text-slate-400">
                          → {currentSentenceTranslation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <p className="text-xs">Không thể kết nối đến máy chủ từ điển ngoài.</p>
                </div>
              )
            )}
          </div>

          {/* Footer Popover */}
          <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Phím tắt Bật / Tắt: <kbd className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px]">F9</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px]">Alt+T</kbd></span>
            </span>
            <span className="text-slate-400 font-medium text-[10px]">
              Tự động lưu Sổ tay
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )}
</>,
document.body
);
};

export default SelectionLookupPopover;
