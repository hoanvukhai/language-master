import { useEffect, useLayoutEffect, useRef } from "react";

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "number",
  "password",
  "url",
  "tel",
]);

/** Ô nhập chữ: phím tắt không được chen vào (JL-01). Radio, checkbox, nút thì không tính. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = ((target as HTMLInputElement).type || "text").toLowerCase();
    return TEXT_INPUT_TYPES.has(type);
  }
  return false;
}

export function isAnswerRadio(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement &&
    target.type === "radio" &&
    target.name.startsWith("answer-")
  );
}

const RADIO_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "1",
  "2",
  "3",
  "4",
]);

/**
 * Đăng ký phím tắt một lần cho lượt đang làm. `onKey` trả về true khi đã xử lý.
 * Khi focus ở radio đáp án, chặn hành vi mặc định của trình duyệt với ←→↑↓ và 1–4
 * để không tự đổi đáp án.
 */
export function useAttemptKeyboard(
  enabled: boolean,
  onKey: (e: KeyboardEvent) => boolean,
) {
  const handlerRef = useRef(onKey);
  useLayoutEffect(() => {
    handlerRef.current = onKey;
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTextEntryTarget(e.target)) return;
      if (document.querySelector('[role="dialog"], dialog[open]')) return;
      const onRadio = isAnswerRadio(e.target);
      if (onRadio && RADIO_KEYS.has(e.key)) e.preventDefault();
      if (handlerRef.current(e)) e.preventDefault();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}
