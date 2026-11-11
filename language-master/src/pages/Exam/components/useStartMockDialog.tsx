// Mở hộp StartMockDialog và chờ câu trả lời (mục 8.2).
import { useCallback, useEffect, useRef, useState } from "react";
import StartMockDialog, { type StartMockRequest } from "./StartMockDialog";

/** askStartMock(...) mở hộp và trả { strict } khi bấm Bắt đầu, null khi Hủy. */
export function useStartMockDialog() {
  const [request, setStartMockRequest] = useState<StartMockRequest | null>(null);
  const pending = useRef<((v: { strict: boolean } | null) => void) | null>(null);
  const askStartMock = useCallback((req: StartMockRequest) => {
    if (pending.current) return Promise.resolve(null);
    return new Promise<{ strict: boolean } | null>((resolve) => {
      pending.current = resolve;
      setStartMockRequest(req);
    });
  }, []);
  useEffect(
    () => () => {
      pending.current?.(null);
      pending.current = null;
    },
    [],
  );
  const settle = (v: { strict: boolean } | null) => {
    pending.current?.(v);
    pending.current = null;
    setStartMockRequest(null);
  };
  return {
    askStartMock,
    startMockDialog: request ? <StartMockDialog request={request} onAnswer={settle} /> : null,
  };
}
