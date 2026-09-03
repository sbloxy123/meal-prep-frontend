"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { Walkthrough } from "@/lib/ios-layouts";

// The last mile of the iPhone walkthrough: the sheet gets out of the way and
// this slim card sits on the screen edge where the browser's real control is,
// with a bouncing arrow aimed at it and the three taps in one line. Non-modal
// so the page and the browser bar stay fully usable. Goes away on "Got it",
// when the page is hidden (they're in the share sheet or on the Home Screen),
// or after 90 s. While it's up, body[data-install-coach] hides the banner so
// nothing stacks.
export function InstallCoach({
  walkthrough,
  onDone,
}: {
  walkthrough: Walkthrough;
  onDone: () => void;
}) {
  const { edge, taps } = walkthrough.coach;
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    document.body.dataset.installCoach = "1";
    const timer = setTimeout(() => onDoneRef.current(), 90_000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onDoneRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      delete document.body.dataset.installCoach;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const arrowUp = edge === "top-right";
  const arrow =
    edge === "none" ? null : arrowUp ? (
      <ArrowUp className="install-coach-arrow" size={28} aria-hidden />
    ) : (
      <ArrowDown className="install-coach-arrow" size={28} aria-hidden />
    );

  return (
    <div className={`install-coach install-coach--${edge}`} role="status">
      {arrowUp && arrow}
      <div className="install-coach-card">
        <ol className="install-coach-taps">
          {taps.map((t, i) => (
            <li key={i}>
              <b>{i + 1}</b> {t}
            </li>
          ))}
        </ol>
        <button type="button" className="install-coach-done" onClick={onDone} aria-label="Got it">
          <X size={16} aria-hidden />
        </button>
      </div>
      {!arrowUp && arrow}
    </div>
  );
}

/** Owners of an InstallSheet render `coachElement` beside it and pass
    `requestCoach` as the sheet's onCoach. */
export function useInstallCoach() {
  const [walk, setWalk] = useState<Walkthrough | null>(null);
  const requestCoach = useCallback((w: Walkthrough) => setWalk(w), []);
  const coachElement = walk ? <InstallCoach walkthrough={walk} onDone={() => setWalk(null)} /> : null;
  return { requestCoach, coachElement };
}
