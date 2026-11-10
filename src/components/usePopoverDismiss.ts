import { useEffect, type RefObject } from "react";

// Closes an open popover on a mousedown outside `wrapperRef` or on Escape
// (returning focus to the trigger). A nested dropdown still open inside the
// popover gets the Escape first.
export function usePopoverDismiss(
  open: boolean,
  close: () => void,
  wrapperRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (wrapperRef.current?.querySelector("[data-popover], [role='listbox']")) return;
      close();
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, wrapperRef, triggerRef]);
}
