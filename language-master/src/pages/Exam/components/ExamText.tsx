import { parseExamText } from "../../../lib/jlpt/examText";
type BlankLinks = {
  idPrefix: string;
  answered?: (blankId: string) => boolean;
  active?: (blankId: string) => boolean;
  onClick?: (blankId: string) => void;
};

/** blanks: (Mondai 9) mỗi ô trống thành nút có id, bấm để tới thẻ câu (JL-13). */
export default function ExamText({
  text,
  blanks,
}: {
  text: string;
  blanks?: BlankLinks;
}) {
  return (
    <span className="whitespace-pre-wrap break-words">
      {parseExamText(text).map((t, i) => {
        if (t.kind === "underline")
          return (
            <u
              key={i}
              className="underline-offset-[6px] decoration-2 decoration-indigo-600 dark:decoration-indigo-400 font-semibold"
            >
              <ExamText text={t.text} />
            </u>
          );
        if (t.kind === "blank" && blanks) {
          const isActive = Boolean(blanks.active?.(t.text));
          const isAnswered = Boolean(blanks.answered?.(t.text));
          return (
            <button
              key={i}
              type="button"
              id={`${blanks.idPrefix}${t.text}`}
              onClick={() => blanks.onClick?.(t.text)}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Ô trống ${t.text}${isAnswered ? ", đã chọn" : ""}, tới câu hỏi`}
              className={`inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 border-2 rounded-lg font-bold text-base transition-colors scroll-mt-28 cursor-pointer ${
                isActive
                  ? "border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-700"
                  : "border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900"
              }`}
            >
              {t.text}
              {isAnswered && (
                <span
                  aria-hidden="true"
                  className={
                    isActive
                      ? "text-emerald-200"
                      : "text-emerald-700 dark:text-emerald-400"
                  }
                >
                  ✓
                </span>
              )}
            </button>
          );
        }
        if (t.kind === "blank")
          return (
            <span
              key={i}
              className="inline-block mx-1 px-2.5 py-0.5 border-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 rounded-lg font-bold text-base text-indigo-800 dark:text-indigo-200"
            >
              {t.text}
            </span>
          );
        if (t.kind === "ruby")
          return (
            <ruby key={i}>
              {t.text}
              <rt className="text-[0.65em] text-indigo-600 dark:text-indigo-300 font-medium">
                {t.reading}
              </rt>
            </ruby>
          );
        if (t.kind === "star")
          return (
            <span
              key={i}
              className="inline-flex items-center justify-center mx-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 font-black border border-amber-300 dark:border-amber-700"
            >
              ★
            </span>
          );
        return <span key={i}>{t.text}</span>;
      })}
    </span>
  );
}
