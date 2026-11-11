import type { Attempt } from "../../../lib/jlpt/examCore";
import { buildCompletedSentence } from "../../../lib/jlpt/examText";
import type { TargetWordSaveInput } from "../components/saveTargetWord";

const VOCAB_MONDAI = new Set([1, 2, 3, 4, 5, 6]);

export function reviewWordInputs(attempt: Attempt): { id: string; input: TargetWordSaveInput }[] {
  const selected = new Set(attempt.questionIds);
  const out: { id: string; input: TargetWordSaveInput }[] = [];
  const seen = new Set<string>();
  for (const m of attempt.exam.mondais) {
    if (!VOCAB_MONDAI.has(m.number)) continue;
    for (const q of m.questions) {
      if (!selected.has(q.id) || attempt.answers[q.id] === q.answer) continue;
      const w = q.targetWord;
      if (!w?.term || !w.meaningVi || seen.has(w.term)) continue;
      seen.add(w.term);
      out.push({
        id: q.id,
        input: {
          word: w,
          example: buildCompletedSentence(q, m.type),
          exampleMeaning: q.translationVi || null,
        },
      });
      if (out.length >= 20) return out;
    }
  }
  return out;
}

