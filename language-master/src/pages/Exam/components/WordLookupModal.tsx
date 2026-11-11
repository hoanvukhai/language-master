import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import type { DictionaryEntry } from "../../../lib/dictionary/localDictionaryIndex";
import type {
  BookWordGroup,
  ExternalLookupResult,
  QuickSaveStatus,
} from "../../../lib/dictionary/multiBookLookup";
import { speakWithVoiceEngine } from "../../../lib/audio/voiceEngine";

type MultiBookModule = typeof import("../../../lib/dictionary/multiBookLookup");
let cachedMultiBookMod: MultiBookModule | null = null;
const preloadMultiBookPromise = import(
  "../../../lib/dictionary/multiBookLookup"
)
  .then((m) => {
    cachedMultiBookMod = m;
    return m;
  })
  .catch(() => null);

type ItemSaveState = {
  status: "unsaved" | "saving" | QuickSaveStatus;
  courseId?: string;
  courseTitle?: string;
  message?: string;
};

type SaveBannerState = {
  type: QuickSaveStatus;
  message: string;
  courseId?: string;
  courseTitle?: string;
} | null;

type Props = {
  isOpen?: boolean;
  word: string;
  entry: DictionaryEntry | null;
  onClose: () => void;
  onAssistProvided?: () => void;
};

export default function WordLookupModal({
  isOpen = true,
  word,
  entry,
  onClose,
  onAssistProvided,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const externalReqIdRef = useRef(0);
  const saveReqIdRef = useRef(0);
  const onAssistRef = useRef(onAssistProvided);
  useEffect(() => {
    onAssistRef.current = onAssistProvided;
  }, [onAssistProvided]);

  const [groups, setGroups] = useState<BookWordGroup[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [isPreparingDict, setIsPreparingDict] = useState(false);
  const [externalResult, setExternalResult] =
    useState<ExternalLookupResult | null>(null);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [itemSaveMap, setItemSaveMap] = useState<Record<string, ItemSaveState>>(
    {},
  );
  const [saveBanner, setSaveBanner] = useState<SaveBannerState>(null);

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
    // Hủy mọi yêu cầu dịch hoặc thông báo lưu cũ khi đổi từ hoặc đóng modal
    externalReqIdRef.current += 1;
    saveReqIdRef.current += 1;
    setIsLoadingExternal(false);
    setSaveBanner(null);
    setExternalResult(null);
    setItemSaveMap({});

    const cleanWord = word.trim();
    if (!isOpen || !cleanWord) {
      setGroups([]);
      setTotalBooks(0);
      setIsPreparingDict(false);
      return;
    }

    if (entry) {
      onAssistRef.current?.();
    }

    const applyLocalLookup = (mod: MultiBookModule) => {
      const res = mod.lookupInSystemMultiBook(cleanWord);
      setGroups(res.groups);
      setTotalBooks(res.totalBooks);
      setIsPreparingDict(false);

      if (entry || res.totalMatches > 0) {
        onAssistRef.current?.();
      }

      const nextMap: Record<string, ItemSaveState> = {};
      if (entry) {
        const st = mod.getWordNotebookStatus({
          term: entry.term,
          reading: entry.reading,
          meaning: entry.meaning,
        });
        if (st.status !== "unsaved") {
          nextMap.primary = {
            status: st.status,
            courseId: st.courseId,
            courseTitle: st.courseTitle,
          };
        }
      }
      for (const g of res.groups.slice(0, 4)) {
        for (const m of g.matches.slice(0, 2)) {
          const st = mod.getWordNotebookStatus({
            term: m.term,
            reading: m.reading,
            meaning: m.meaning,
          });
          if (st.status !== "unsaved") {
            nextMap[m.id] = {
              status: st.status,
              courseId: st.courseId,
              courseTitle: st.courseTitle,
            };
          }
        }
      }
      setItemSaveMap(nextMap);
    };

    if (cachedMultiBookMod) {
      applyLocalLookup(cachedMultiBookMod);
      return;
    }

    let cancelled = false;
    setIsPreparingDict(true);
    preloadMultiBookPromise.then((mod) => {
      if (cancelled || !mod) {
        setIsPreparingDict(false);
        return;
      }
      applyLocalLookup(mod);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, word, entry]);

  const handleLookupOnline = async () => {
    const targetWord = word.trim();
    if (!targetWord || isLoadingExternal) return;
    const reqId = ++externalReqIdRef.current;
    setIsLoadingExternal(true);
    // Ẩn kết quả/nút lưu cũ trong lúc đang thử lại để tránh lưu nhầm kết quả cũ
    setExternalResult(null);
    setItemSaveMap((prev) => {
      const copy = { ...prev };
      delete copy.external;
      return copy;
    });

    try {
      const mod =
        cachedMultiBookMod ||
        (await import("../../../lib/dictionary/multiBookLookup"));
      cachedMultiBookMod = mod;
      const res = await mod.lookupExternal(targetWord, "japanese");
      if (externalReqIdRef.current !== reqId) return;
      setExternalResult(res);
      if (res.status === "success" && res.canSave) {
        onAssistRef.current?.();
        const st = mod.getWordNotebookStatus({
          term: res.term,
          reading: res.readingKana,
          meaning: res.translation,
        });
        if (st.status !== "unsaved") {
          setItemSaveMap((prev) => ({
            ...prev,
            external: {
              status: st.status,
              courseId: st.courseId,
              courseTitle: st.courseTitle,
            },
          }));
        }
      }
    } catch {
      if (externalReqIdRef.current !== reqId) return;
      setExternalResult({
        status: "network_error",
        term: targetWord,
        translation: "",
        source: "google",
        errorMessage: "Không thể tra trực tuyến lúc này. Thử lại",
        canSave: false,
      });
    } finally {
      if (externalReqIdRef.current === reqId) {
        setIsLoadingExternal(false);
      }
    }
  };

  const handleSpeak = (textToSpeak: string) => {
    const clean = textToSpeak.trim();
    if (!clean) return;
    try {
      const ok = speakWithVoiceEngine(clean, { lang: "ja-JP" });
      if (ok !== false) {
        onAssistRef.current?.();
      }
    } catch {
      // Bỏ qua nếu môi trường không hỗ trợ âm thanh
    }
  };

  const handleQuickSave = async (params: {
    key: string;
    term: string;
    reading?: string;
    meaning: string;
    example?: string;
    exampleMeaning?: string;
    lookupStatus?: ExternalLookupResult["status"];
  }) => {
    if (itemSaveMap[params.key]?.status === "saving") return;
    const currentSaveReqId = ++saveReqIdRef.current;

    setItemSaveMap((prev) => ({
      ...prev,
      [params.key]: { status: "saving" },
    }));

    try {
      const mod =
        cachedMultiBookMod ||
        (await import("../../../lib/dictionary/multiBookLookup"));
      cachedMultiBookMod = mod;
      const res = await mod.quickSaveWordToNotebook({
        term: params.term,
        reading: params.reading,
        meaning: params.meaning,
        exampleKanji: params.example,
        exampleMeaning: params.exampleMeaning,
        lookupStatus: params.lookupStatus,
      });

      if (saveReqIdRef.current !== currentSaveReqId) return;

      setItemSaveMap((prev) => ({
        ...prev,
        [params.key]: {
          status: res.status,
          courseId: res.courseId,
          courseTitle: res.courseTitle,
          message: res.message,
        },
      }));

      setSaveBanner({
        type: res.status,
        message:
          res.status === "added"
            ? `Đã lưu "${params.term}" vào "${res.courseTitle}"`
            : res.status === "already_exists"
              ? `Đã có trong sổ tay (${res.courseTitle})`
              : res.message,
        courseId: res.courseId,
        courseTitle: res.courseTitle,
      });
    } catch {
      if (saveReqIdRef.current !== currentSaveReqId) return;
      setItemSaveMap((prev) => ({
        ...prev,
        [params.key]: {
          status: "failed",
          message: "Chưa lưu được. Thử lại",
        },
      }));
      setSaveBanner({
        type: "failed",
        message: "Chưa lưu được. Thử lại",
      });
    }
  };

  const renderSaveButtonLabel = (key: string, defaultLabel = "Lưu vào sổ tay") => {
    const st = itemSaveMap[key]?.status;
    if (st === "saving") return "Đang lưu…";
    if (st === "added") return "Đã lưu";
    if (st === "already_exists") return "Đã có trong sổ tay";
    if (st === "failed") return "Chưa lưu được. Thử lại";
    return defaultLabel;
  };

  // Kiểm tra xem mục từ có chứa ký tự Latin để gắn nhãn Phiên âm vs Cách đọc Kana đúng chuẩn
  const isEntryReadingLatin =
    entry?.reading &&
    /[A-Za-zÀ-ỹ\u0100-\u024F]/.test(entry.reading) &&
    entry.subject !== "kanji";

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
        {saveBanner && (
          <div
            role="status"
            className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 flex-wrap ${
              saveBanner.type === "added" || saveBanner.type === "already_exists"
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300"
                : saveBanner.type === "conflict"
                  ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300"
                  : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {saveBanner.type === "added" ||
              saveBanner.type === "already_exists" ? (
                <Check size={15} className="shrink-0" />
              ) : (
                <AlertCircle size={15} className="shrink-0" />
              )}
              <span>{saveBanner.message}</span>
            </div>
            {saveBanner.type === "conflict" && (
              <a
                href={
                  saveBanner.courseId
                    ? `/course/${saveBanner.courseId}`
                    : "/dictionary"
                }
                onClick={onClose}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 hover:underline shrink-0"
              >
                <span>Mở sổ tay</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {isPreparingDict && !entry && groups.length === 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-indigo-500" />
            <span>Đang chuẩn bị chỉ mục từ điển…</span>
          </div>
        )}

        {entry ? (
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
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
                {entry.reading && (
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mt-1">
                    {entry.subject === "kanji"
                      ? "Âm / thông tin từ điển"
                      : isEntryReadingLatin
                        ? "Phiên âm"
                        : "Cách đọc tiếng Nhật"}
                    : {entry.reading}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className="exam-primary !px-3 !py-2 !min-h-9 text-xs"
                  onClick={() =>
                    handleSpeak(
                      entry.subject === "kanji"
                        ? entry.term
                        : entry.reading || entry.term,
                    )
                  }
                >
                  <Volume2 size={15} />
                  <span>Nghe phát âm</span>
                </button>
                <button
                  type="button"
                  disabled={itemSaveMap.primary?.status === "saving"}
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
                  {itemSaveMap.primary?.status === "saving" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : itemSaveMap.primary?.status === "added" ||
                    itemSaveMap.primary?.status === "already_exists" ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span>{renderSaveButtonLabel("primary", "Lưu vào sổ tay")}</span>
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
                onClick={() => handleSpeak(word)}
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
                <span>
                  {isLoadingExternal
                    ? "Đang tra cứu…"
                    : "Tra cứu & dịch trực tuyến"}
                </span>
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
                  {isLoadingExternal ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Globe size={12} />
                  )}
                  <span>
                    {isLoadingExternal
                      ? "Đang tra cứu…"
                      : "Dịch thêm bằng Google"}
                  </span>
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
                  {group.matches.slice(0, 2).map((m) => {
                    const st = itemSaveMap[m.id]?.status;
                    return (
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
                          disabled={st === "saving"}
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
                          aria-label={`Lưu ${m.term} từ ${group.courseName}`}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0 inline-flex items-center gap-1"
                          title={renderSaveButtonLabel(m.id, "Lưu vào sổ tay")}
                        >
                          {st === "saving" ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : st === "added" || st === "already_exists" ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Plus size={13} />
                          )}
                          <span>{renderSaveButtonLabel(m.id, "Lưu")}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Online Translation Result (FIX-08: Distinct states for success vs not_found / network_error / invalid_response / timeout) */}
        {externalResult && (
          <div
            className={`p-4 rounded-2xl border space-y-2.5 ${
              externalResult.status === "success"
                ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/50"
                : "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  externalResult.status === "success"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-800 dark:text-amber-300"
                }`}
              >
                <Globe size={13} />
                <span>
                  {externalResult.status === "success"
                    ? `Bản dịch trực tuyến (${externalResult.source === "combined" ? "Google · FreeDict" : "Google"})`
                    : "Tra cứu trực tuyến"}
                </span>
              </span>

              {externalResult.status === "success" && externalResult.canSave ? (
                <button
                  type="button"
                  disabled={itemSaveMap.external?.status === "saving"}
                  onClick={() =>
                    handleQuickSave({
                      key: "external",
                      term: externalResult.term,
                      // Chỉ truyền cách đọc Kana hợp lệ (nếu có); không truyền phiên âm Latin (Shōhai) vào trường hiragana
                      reading: externalResult.readingKana,
                      meaning: externalResult.translation,
                      lookupStatus: externalResult.status,
                    })
                  }
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {itemSaveMap.external?.status === "saving" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : itemSaveMap.external?.status === "added" ||
                    itemSaveMap.external?.status === "already_exists" ? (
                    <Check size={13} />
                  ) : (
                    <Plus size={13} />
                  )}
                  <span>
                    {renderSaveButtonLabel("external", "Lưu vào sổ tay")}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoadingExternal}
                  onClick={handleLookupOnline}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-800 dark:text-amber-200 hover:border-amber-500"
                >
                  <RefreshCw size={12} />
                  <span>Thử lại</span>
                </button>
              )}
            </div>

            {externalResult.status === "success" ? (
              <>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {externalResult.translation}
                </p>
                {externalResult.readingKana && (
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Cách đọc Kana: {externalResult.readingKana}
                  </p>
                )}
                {externalResult.phonetic &&
                  externalResult.phonetic !== externalResult.readingKana && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Phiên âm: {externalResult.phonetic}
                    </p>
                  )}
                {externalResult.partialWarning && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    {externalResult.partialWarning}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {externalResult.errorMessage || "Chưa tìm thấy nghĩa phù hợp"}
              </p>
            )}

            {externalResult.definitions &&
              externalResult.definitions.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-xs">
                  <p className="font-bold text-slate-600 dark:text-slate-300">
                    Định nghĩa tiếng Anh tham khảo (FreeDict):
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                    {externalResult.definitions.map((d, i) => (
                      <li key={i} lang="en">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {/* Ghi chú phạm vi lưu trữ rõ ràng cho khách & người dùng (FIX-05 Rule 8.4) */}
        <p className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
          Từ đã lưu nằm trong sổ tay trên trình duyệt này; bài làm JLPT chỉ giữ
          tạm trong tab.
        </p>
      </div>
    </dialog>
  );
}
