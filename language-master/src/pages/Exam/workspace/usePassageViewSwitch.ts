import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type PassagePanelView = "question" | "passage";

type ScrollMap = Record<string, { passage?: number; question?: number }>;

type PendingScrollAction =
  | { type: "restore"; passageId: string; target: PassagePanelView }
  | { type: "focusBlank"; elementId: string };

type Options = {
  passageId?: string;
  scopeKey?: string;
};

/**
 * Quản lý chuyển đổi Đoạn văn ⇄ Câu hỏi và ghi nhớ vị trí scroll theo từng đoạn văn.
 */
export function usePassageViewSwitch({ passageId, scopeKey }: Options) {
  const effectiveScope = scopeKey ?? passageId;
  const [state, setState] = useState<{
    scopeKey: string;
    mode: PassagePanelView;
  } | null>(null);
  const [actionTick, setActionTick] = useState(0);

  const scrollMapRef = useRef<ScrollMap>({});
  const pendingRef = useRef<PendingScrollAction | null>(null);

  const view: PassagePanelView =
    passageId && effectiveScope && state?.scopeKey === effectiveScope
      ? state.mode
      : "question";

  const switchTo = useCallback(
    (nextView: PassagePanelView, focusElementId?: string) => {
      if (!passageId || !effectiveScope) return;
      if (nextView === view && !focusElementId) return;

      const currentY = typeof window !== "undefined" ? window.scrollY || 0 : 0;
      if (nextView !== view) {
        const entry = scrollMapRef.current[passageId] ?? {};
        entry[view] = currentY;
        scrollMapRef.current[passageId] = entry;
      }

      pendingRef.current = focusElementId
        ? { type: "focusBlank", elementId: focusElementId }
        : { type: "restore", passageId, target: nextView };

      setState({ scopeKey: effectiveScope, mode: nextView });
      setActionTick((t) => t + 1);
    },
    [passageId, effectiveScope, view],
  );

  const showPassage = useCallback(
    (focusElementId?: string) => switchTo("passage", focusElementId),
    [switchTo],
  );

  const showQuestion = useCallback(() => switchTo("question"), [switchTo]);

  const toggleView = useCallback(
    () => switchTo(view === "passage" ? "question" : "passage"),
    [switchTo, view],
  );

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;

    if (pending.type === "focusBlank") {
      const el = document.getElementById(pending.elementId);
      if (!el) return;
      el.scrollIntoView?.({ behavior: "smooth", block: "center" });
      el.classList.add("exam-blank-flash");
      window.setTimeout(() => el.classList.remove("exam-blank-flash"), 1500);
      return;
    }

    const saved = scrollMapRef.current[pending.passageId]?.[pending.target];
    const targetY = typeof saved === "number" ? saved : 0;
    window.scrollTo?.({ top: targetY, behavior: "auto" });
  }, [view, effectiveScope, actionTick]);

  return {
    view,
    showPassage,
    showQuestion,
    toggleView,
  };
}

