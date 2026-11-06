import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Globe,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import type { DictionaryEntry } from "../../../lib/dictionary/localDictionaryIndex";
import type {
  BookWordGroup,
  ExternalLookupResult,
} from "../../../lib/dictionary/multiBookLookup";
import { speakWithVoiceEngine } from "../../../lib/audio/voiceEngine";

type Props = {
  isOpen?: boolean;
  word: string;
  entry: DictionaryEntry | null;
  onClose: () => void;
};

export default function WordLookupModal({
  isOpen = true,
  word,
  entry,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const externalReqIdRef = useRef(0);
  const [groups, setGroups] = useState<BookWordGroup[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [externalResult, setExternalResult] =
    useState<ExternalLookupResult | null>(null);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [isOpen]);

  useEffect(() => {
    // Invalidate any in-flight online translation request when word or modal state changes
    externalReqIdRef.current += 1;
    setIsLoadingExternal(false);

    if (!isOpen || !word.trim()) {
      setGroups([]);
      setTotalBooks(0);
      setExternalResult(null);
      setSavedNotice(null);
      return;
    }

    let cancelled = false;
    setSavedNotice(null);
    setExternalResult(null);

    import("../../../lib/dictionary/multiBookLookup")
      .then((mod) => {
        if (cancelled) return;
        const res = mod.lookupInSystemMultiBook(word.trim());
        setGroups(res.groups);
        setTotalBooks(res.totalBooks);
      })
      .catch(() => {
        // Fallback quietly if dynamic import fails in isolated test env
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, word]);

  const handleLookupOnline = async () => {
    const targetWord = word.trim();
    if (!targetWord) return;
    const reqId = ++externalReqIdRef.current;
    setIsLoadingExternal(true);
    try {
      const mod = await import("../../../lib/dictionary/multiBookLookup");
      const res = await mod.lookupExternal(targetWord, "japanese");
      if (externalReqIdRef.current !== reqId) return;
      setExternalResult(res);
    } catch {
      if (externalReqIdRef.current !== reqId) return;
      setExternalResult({
        term: targetWord,
        translation: "Không thể kết nối dịch trực tuyến lúc này.",
        source: "google",
      });
    } finally {
      if (externalReqIdRef.current === reqId) {
        setIsLoadingExternal(false);
      }
    }
  };

  const handleQuickSave = async (params: {
    key: string;
    term: string;
    reading?: string;
    meaning: string;
    example?: string;
    exampleMeaning?: string;
  }) => {
    setSavingKey(params.key);
    try {
      const mod = await import("../../../lib/dictionary/multiBookLookup");
      const res = await mod.quickSaveWordToNotebook({
        term: params.term,
        reading: params.reading,
        meaning: params.meaning,
        exampleKanji: params.example,
        exampleMeaning: params.exampleMeaning,
      });
      if (res.success) {
        setSavedNotice(`Đã lưu "${params.term}" vào "${res.courseTitle}"`);
      }
    } catch {
      setSavedNotice("Chưa lưu được vào sổ tay.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      className="w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-0 shadow-2xl border border-slate-200 dark:border-slate-700 backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs overflow-hidden"
      aria-labelledby="lookup-title"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/90 via-violet-50/60 to-white dark:from-indigo-950/50 dark:via-slate-800 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Search size={18} />
          </div>
          <div className="min-w-0">
            <h2
              id="lookup-title"
              className="font-black text-lg sm:text-xl text-slate-900 dark:text-white truncate"
            >
              Tra từ: {word}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Từ điển hệ thống đa giáo trình & dịch trực tuyến
            </p>
          </div>
        </div>
        <button
          autoFocus
          className="exam-secondary !px-3 !py-1.5 !min-h-9"
          onClick={onClose}
          aria-label="Đóng tra từ"
        >
          <X size={15} />
          <span>Đóng</span>
        </button>
      </div>

      {/* Body */}
      <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
        {savedNotice && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check size={15} className="shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {entry ? (
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {entry.term}
                  </p>
                  {entry.level && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-600 text-white">
                      {entry.level}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mt-1">
                  {entry.subject === "kanji"
                    ? "Âm / thông tin từ điển"
                    : "Cách đọc tiếng Nhật"}
                  : {entry.reading}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="exam-primary !px-3 !py-2 !min-h-9 text-xs"
                  onClick={() =>
                    speakWithVoiceEngine(
                      entry.subject === "kanji"
                        ? entry.term
                        : entry.reading || entry.term,
                      { lang: "ja-JP" },
                    )
                  }
                >
                  <Volume2 size={15} />
                  <span>Nghe phát âm</span>
                </button>
                <button
                  type="button"
                  disabled={savingKey === "primary"}
                  onClick={() =>
                    handleQuickSave({
                      key: "primary",
                      term: entry.term,
                      reading: entry.reading,
                      meaning: entry.meaning,
                      example: entry.example,
                      exampleMeaning: entry.exampleMeaning,
                    })
                  }
                  className="exam-secondary !px-2.5 !py-2 !min-h-9 text-xs"
                  title="Lưu vào Sổ tay từ vựng"
                >
                  <Plus size={14} />
                  <span>Lưu sổ tay</span>
                </button>
              </div>
            </div>
            <p className="leading-7 font-semibold text-slate-800 dark:text-slate-100">
              {entry.meaning}
            </p>
            {entry.example && (
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-slate-700 text-xs space-y-1">
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  VD: {entry.example}
                </p>
                {entry.exampleMeaning && (
                  <p className="text-slate-500 dark:text-slate-400">
                    → {entry.exampleMeaning}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen size={13} className="text-indigo-500" />
              <span>Nguồn: {entry.courseName}</span>
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 space-y-3">
            <p className="leading-7 text-sm text-slate-600 dark:text-slate-300">
              Chưa có mục từ khớp chính xác trong từ điển hiện tại.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="exam-secondary !min-h-9 text-xs"
                onClick={() =>
                  speakWithVoiceEngine(word, {
                    lang: "ja-JP",
                  })
                }
              >
                <Volume2 size={14} />
                <span>Nghe phát âm</span>
              </button>
              <button
                type="button"
                disabled={isLoadingExternal}
                onClick={handleLookupOnline}
                className="exam-primary !min-h-9 text-xs"
              >
                {isLoadingExternal ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Globe size={14} />
                )}
                <span>Tra cứu & dịch trực tuyến</span>
              </button>
            </div>
          </div>
        )}

        {/* Multi-book matches */}
        {groups.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-500" />
                <span>Tìm thấy trong {totalBooks} giáo trình hệ thống</span>
              </span>
              {!externalResult && (
                <button
                  type="button"
                  disabled={isLoadingExternal}
                  onClick={handleLookupOnline}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <Globe size={12} />
                  <span>Dịch thêm bằng Google</span>
                </button>
              )}
            </div>
            <div className="space-y-2">
              {groups.slice(0, 4).map((group) => (
                <div
                  key={group.courseId}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {group.courseName}
                    </span>
                    {group.level && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {group.level}
                      </span>
                    )}
                  </div>
                  {group.matches.slice(0, 2).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800 first:border-t-0 first:pt-0"
                    >
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {m.term}{" "}
                          {m.reading && m.reading !== m.term && (
                            <span className="font-normal text-indigo-600 dark:text-indigo-400">
                              [{m.reading}]
                            </span>
                          )}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          {m.meaning}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={savingKey === m.id}
                        onClick={() =>
                          handleQuickSave({
                            key: m.id,
                            term: m.term,
                            reading: m.reading,
                            meaning: m.meaning,
                            example: m.example,
                            exampleMeaning: m.exampleMeaning,
                          })
                        }
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 transition-colors shrink-0"
                        title="Lưu vào sổ tay"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Translation Result */}
        {externalResult && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Globe size={13} />
                <span>Bản dịch trực tuyến</span>
              </span>
              <button
                type="button"
                disabled={savingKey === "external"}
                onClick={() =>
                  handleQuickSave({
                    key: "external",
                    term: externalResult.term,
                    reading: externalResult.phonetic,
                    meaning: externalResult.translation,
                  })
                }
                className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Lưu vào sổ tay</span>
              </button>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {externalResult.translation}
            </p>
            {externalResult.phonetic && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phiên âm: {externalResult.phonetic}
              </p>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
