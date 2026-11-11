// Tra trong lexicon thu gọn của phần Luyện đề (JL-04). Không phụ thuộc runtime nào.
import type { DictionaryEntry } from "./localDictionaryIndex";
import type { DictionarySearch } from "../jlpt/sentenceAnalyzer";

/**
 * Tìm trong lexicon. Truy vấn đã ghi sẵn trả đúng thứ tự như từ điển đầy đủ;
 * truy vấn khác khớp chính xác theo term hoặc reading.
 */
export function createLexiconSearch(
  entries: DictionaryEntry[],
  queries: Record<string, string[]> = {},
): DictionarySearch {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const byKey = new Map<string, DictionaryEntry[]>();
  const add = (key: string | undefined, e: DictionaryEntry) => {
    if (!key) return;
    const list = byKey.get(key);
    if (list) list.push(e);
    else byKey.set(key, [e]);
  };
  for (const e of entries) {
    add(e.term, e);
    if (e.reading && e.reading !== e.term) add(e.reading, e);
  }
  return ({ query, subject, limit = 25 }) => {
    const q = query.trim();
    const ids = queries[`${q}|${subject || ""}`];
    if (ids) {
      const list = ids.map((id) => byId.get(id)).filter((e): e is DictionaryEntry => !!e);
      return { results: list.slice(0, limit) };
    }
    const list = byKey.get(q) || [];
    const filtered = subject ? list.filter((e) => e.subject === subject) : list;
    return { results: filtered.slice(0, limit) };
  };
}
