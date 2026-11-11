// Lưu từ trọng tâm vào sổ tay (mục 9.6); module multiBookLookup chỉ tải khi bấm lưu.
import type { JLPTTargetWord } from "../../../data/exams/jlpt/types";

export type TargetWordSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "added"; courseTitle: string }
  | { status: "already_exists" }
  | { status: "conflict" }
  | { status: "failed" };

export type TargetWordSaveInput = {
  word: JLPTTargetWord;
  example?: string | null;
  exampleMeaning?: string | null;
};

type AuthUser = { uid: string } | null;

/** Gọi quickSaveWordToNotebook (hàng đợi tuần tự có sẵn); module chỉ tải khi bấm lưu. */
export async function saveTargetWord(
  input: TargetWordSaveInput,
  user: AuthUser,
): Promise<TargetWordSaveState> {
  try {
    const mod = await import("../../../lib/dictionary/multiBookLookup");
    const res = await mod.quickSaveWordToNotebook({
      term: input.word.term,
      reading: input.word.reading,
      meaning: input.word.meaningVi,
      exampleKanji: input.example || "",
      exampleMeaning: input.exampleMeaning || "",
      userId: user?.uid ?? null,
      userProfile: user,
      lookupStatus: "success",
    });
    if (res.status === "added") return { status: "added", courseTitle: res.courseTitle };
    if (res.status === "already_exists") return { status: "already_exists" };
    if (res.status === "conflict") return { status: "conflict" };
    return { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

export function targetWordLine(word: JLPTTargetWord): string {
  const reading = word.reading && word.reading !== word.term ? ` (${word.reading})` : "";
  const hv = word.hanViet ? ` · ${word.hanViet}` : "";
  return `${word.term}${reading}${hv} · ${word.meaningVi}`;
}

