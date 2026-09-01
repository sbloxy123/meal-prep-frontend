"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMenu } from "@/lib/menu";
import { useSession } from "@/lib/auth-client";
import { isConsumingInvite } from "@/components/pending-invite";
import { isConsumingShare } from "@/components/pending-share";
import { OnboardingWizard, SNOOZE_KEY } from "@/components/onboarding-wizard";

// Decides whether to open the onboarding questionnaire. Mounted once per
// authenticated app entry, beside PendingInvite/PendingShare.
//
// The decision costs no extra request: onboardingNeeded rides GET /shopping-list,
// which MenuProvider already fetches, and the "does this account have recipes"
// half is an EXISTS on the server rather than a guess out here.

/** Per-user so a shared device doesn't suppress the questionnaire for a second
    account. The server's onboarded_at is the real cross-device answer; this is
    only for the window before that write lands, or if it fails. */
const dismissedKey = (userId: string) => `fornetto:onboardingDismissed:${userId}`;

// Routes where the questionnaire would land on top of something more important.
const DENY = ["/household/join", "/premium", "/shared"];

export function OnboardingGate() {
  const menu = useMenu();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const decided = useRef(false);

  const userId = session?.user.id;

  useEffect(() => {
    // Latch: once open, the wizard owns its own lifetime. MenuProvider refetches
    // on focus and visibility, and the wizard itself writes preferences partway
    // through — either would flip onboardingNeeded and yank the dialog out from
    // under someone on step 3.
    if (decided.current) return;
    if (!menu.loaded || !menu.onboardingNeeded || !userId) return;
    if (DENY.some((p) => pathname.startsWith(p))) return;
    // An invite or share hand-off is mid-flight and about to change what the
    // account looks like (or navigate away) — not this load.
    if (isConsumingInvite() || isConsumingShare()) return;

    try {
      if (sessionStorage.getItem(SNOOZE_KEY)) return;
      if (localStorage.getItem(dismissedKey(userId))) return;
    } catch {
      // Private mode — fall through and offer it.
    }

    // Deferred past paint, matching the ios-install-hint convention (and
    // keeping the state update out of the effect body).
    const id = requestAnimationFrame(() => {
      decided.current = true;
      setShow(true);
    });
    return () => cancelAnimationFrame(id);
  }, [menu.loaded, menu.onboardingNeeded, pathname, userId]);

  if (!show) return null;

  return (
    <OnboardingWizard
      entry="auto"
      onClose={(outcome) => {
        setShow(false);
        if (outcome === "skipped" && userId) {
          try {
            localStorage.setItem(dismissedKey(userId), "1");
          } catch {
            /* ignore */
          }
        }
      }}
    />
  );
}
