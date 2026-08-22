"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "fornetto:iosInstallDismissed";

// iOS Safari has no `beforeinstallprompt` (that's the Android prompt), so
// "Add to Home Screen" is a manual Share-sheet action there. Show a one-line,
// dismissible hint to iOS Safari users who haven't already installed the PWA.
function shouldShowHint(): boolean {
  try {
    if (localStorage.getItem(DISMISS_KEY)) return false;
  } catch {
    /* private mode / storage blocked — fall through and still evaluate */
  }
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ masquerades as macOS — a touch-capable "Mac" is really an iPad.
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const standalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return (isIOS || isIPadOS) && isSafari && !standalone;
}

export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Deferred to after paint: the check reads client-only APIs, and this keeps
    // the state update out of the effect body (avoids cascading-render lint).
    const id = requestAnimationFrame(() => setShow(shouldShowHint()));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="ios-install" role="note">
      <span className="ios-install-text">
        Install Fornetto — tap <Share size={14} aria-label="the Share icon" /> then{" "}
        <strong>Add to Home Screen</strong>.
      </span>
      <button type="button" className="ios-install-close" aria-label="Dismiss" onClick={dismiss}>
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
