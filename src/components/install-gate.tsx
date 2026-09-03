"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMenu } from "@/lib/menu";
import { useSession } from "@/lib/auth-client";
import { isConsumingInvite } from "@/components/pending-invite";
import { isConsumingShare } from "@/components/pending-share";
import { InstallSheet } from "@/components/install-sheet";
import { autoPromptAllowed, logStandaloneOpen, markAutoPromptShown } from "@/lib/install";

// Opens the install sheet by itself, once, on a phone — the closest thing to
// an install prompt iOS will ever give us. Mounted after OnboardingGate.
//
// It never stacks on the questionnaire: if onboarding was wanted at any point
// this session, the install offer waits for the next one. Everything else
// (already installed, snoozed, "don't show again", desktop) lives in
// autoPromptAllowed().

/** Set when the questionnaire had the first load; the install sheet then
    stays out of the way until the next session. */
const SKIP_KEY = "fornetto:installGateSkip";

// Same as the onboarding gate: routes where a dialog would land on top of
// something more important.
const DENY = ["/household/join", "/premium", "/shared"];

export function InstallGate() {
  const menu = useMenu();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const decided = useRef(false);

  const userId = session?.user.id;

  // The real install metric — a launch from the home screen. Needs a session
  // (POST /events is auth-guarded), which is why it lives here and not in the
  // root layout.
  useEffect(() => {
    logStandaloneOpen();
  }, []);

  useEffect(() => {
    if (decided.current) return;
    if (!menu.loaded || !userId) return;
    if (menu.onboardingNeeded) {
      try {
        sessionStorage.setItem(SKIP_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      if (sessionStorage.getItem(SKIP_KEY)) return;
    } catch {
      /* private mode — fall through */
    }
    if (DENY.some((p) => pathname.startsWith(p))) return;
    if (isConsumingInvite() || isConsumingShare()) return;
    if (!autoPromptAllowed()) return;

    // Let the page paint and settle first; the sheet is an offer, not a wall.
    const id = setTimeout(() => {
      decided.current = true;
      markAutoPromptShown();
      setShow(true);
    }, 1200);
    return () => clearTimeout(id);
  }, [menu.loaded, menu.onboardingNeeded, pathname, userId]);

  if (!show) return null;

  return <InstallSheet source="auto" onClose={() => setShow(false)} />;
}
