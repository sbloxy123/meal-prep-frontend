"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { detectPlatform } from "@/lib/install";
import { InstallSheet } from "@/components/install-sheet";
import { useInstallCoach } from "@/components/install-coach";

// Key kept from the old iOS-only hint so anyone who dismissed that stays
// dismissed.
const DISMISS_KEY = "fornetto:iosInstallDismissed";

// A one-line, dismissible reminder above the app on phones that aren't running
// the installed app yet. Tapping it opens the install sheet — this is the
// always-there fallback for the auto-open (install-gate.tsx), which only fires
// once and then snoozes.
function shouldShowBanner(): boolean {
  try {
    if (localStorage.getItem(DISMISS_KEY)) return false;
  } catch {
    /* private mode / storage blocked — fall through and still evaluate */
  }
  const p = detectPlatform();
  return (p.os === "ios" || p.os === "android") && !p.standalone;
}

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const { requestCoach, coachElement } = useInstallCoach();

  useEffect(() => {
    // Deferred to after paint: the check reads client-only APIs, and this keeps
    // the state update out of the effect body (avoids cascading-render lint).
    const id = requestAnimationFrame(() => {
      setShow(shouldShowBanner());
      setIos(detectPlatform().os === "ios");
    });
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
    <>
      <div className="install-banner" role="note">
        <button type="button" className="install-banner-text" onClick={() => setOpen(true)}>
          <Share size={14} aria-hidden />
          <span>
            {ios ? "Add Fornetto to your Home Screen" : "Put Fornetto on your home screen"} —{" "}
            <strong>show me how</strong>
          </span>
        </button>
        <button type="button" className="install-banner-close" aria-label="Dismiss" onClick={dismiss}>
          <X size={16} aria-hidden />
        </button>
      </div>
      {open && <InstallSheet source="banner" onClose={() => setOpen(false)} onCoach={requestCoach} />}
      {coachElement}
    </>
  );
}
