import { useCallback, useEffect, useRef, useState } from "react";

import Confirmation from "./ConfirmationDialog";

export function useConfirmation() {
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef<((value: boolean) => void) | null>(null);
  const cancel = useCallback(() => {
    pending.current?.(false);
    pending.current = null;
    setMessage(null);
  }, []);
  const ask = useCallback((text: string) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setMessage(text);
    });
  }, []);
  useEffect(
    () => () => {
      pending.current?.(false);
      pending.current = null;
    },
    [],
  );
  const settle = (answer: boolean) => {
    pending.current?.(answer);
    pending.current = null;
    setMessage(null);
  };
  return {
    ask,
    cancel,
    confirmation: message ? (
      <Confirmation message={message} onAnswer={settle} />
    ) : null,
  };
}
