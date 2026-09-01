"use client";

import { useEffect, type RefObject } from "react";

// Shared modal accessibility (§11): move focus into the modal, trap Tab within
// it, close on Escape, lock body scroll, and return focus to the trigger on
// close. Used by the stock check and the confirmation dialog.
// Modals can stack — the AI-spend confirmation opens over the inspiration sheet,
// for example. Only the topmost one answers Escape and traps Tab, and body
// scroll stays locked until the last one closes.
const openModals: object[] = [];

export function useModalA11y(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const token = {};
    const isTopmost = () => openModals[openModals.length - 1] === token;
    // Only the first modal in a stack knows what the page's scroll state was.
    const prevOverflow = openModals.length === 0 ? document.body.style.overflow : null;
    openModals.push(token);

    const trigger = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      Array.from(
        node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (!isTopmost()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      const i = openModals.indexOf(token);
      if (i >= 0) openModals.splice(i, 1);
      document.removeEventListener("keydown", onKey, true);
      if (openModals.length === 0) document.body.style.overflow = prevOverflow ?? "";
      trigger?.focus?.();
    };
  }, [ref, onClose]);
}
