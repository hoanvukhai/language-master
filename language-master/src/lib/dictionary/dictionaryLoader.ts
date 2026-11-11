// Nạp từ điển theo nhu cầu cho phần Luyện đề (JL-04).
// - Lexicon thu gọn (chỉ các mục khớp 1.080 câu) dùng cho phần phân tích từ trong lời giải.
// - Từ điển đầy đủ (gói registry ~22,5 MB) chỉ tải khi mở hộp tra từ hoặc lexicon không đủ.
import { useSyncExternalStore } from "react";
import type { DictionaryEntry } from "./localDictionaryIndex";
import { setDictionarySearch } from "../jlpt/sentenceAnalyzer";
import { createLexiconSearch } from "./lexiconSearch";

export { createLexiconSearch };

export type DictionaryLevel = "none" | "lexicon" | "full";

type LexiconFile = {
  version: number;
  entries: DictionaryEntry[];
  /** "truy vấn|subject" → id theo đúng thứ tự xếp hạng của từ điển đầy đủ */
  queries?: Record<string, string[]>;
};

let level: DictionaryLevel = "none";
let lexiconPromise: Promise<void> | null = null;
let fullPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setLevel(next: DictionaryLevel) {
  level = next;
  listeners.forEach((fn) => fn());
}

export function loadLexicon(): Promise<void> {
  if (!lexiconPromise) {
    lexiconPromise = import(
      "../../data/dictionary/jlpt-n2-kokusho-lexicon.json"
    ).then((mod) => {
      const file = (mod.default || mod) as LexiconFile;
      if (level === "none") {
        setDictionarySearch(createLexiconSearch(file.entries, file.queries));
        setLevel("lexicon");
      }
    });
    lexiconPromise.catch(() => {
      lexiconPromise = null;
    });
  }
  return lexiconPromise;
}

export function loadFullDictionary(): Promise<void> {
  if (!fullPromise) {
    fullPromise = import("./localDictionaryIndex").then((mod) => {
      setDictionarySearch((filter) => mod.searchGlobalDictionary(filter));
      setLevel("full");
    });
    fullPromise.catch(() => {
      fullPromise = null;
    });
  }
  return fullPromise;
}

/** Nạp sẵn lexicon lúc trình duyệt rảnh (chế độ luyện, xem đề, kết quả). */
export function prefetchLexicon() {
  const run = () => void loadLexicon().catch(() => undefined);
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run, { timeout: 5000 });
  else setTimeout(run, 2000);
}

export function getDictionaryLevel(): DictionaryLevel {
  return level;
}

/** Component render lại khi mức từ điển thay đổi (lexicon → đầy đủ). */
export function useDictionaryLevel(): DictionaryLevel {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => level,
    () => level,
  );
}
