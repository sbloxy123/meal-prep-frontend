"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useMenu } from "@/lib/menu";
import { GoPremiumLink } from "@/components/ai-allowance";

// A slim, dismissible upsell strip that appears ONLY when a free household is
// nearly (or fully) out of its weekly AI pool — earned attention, not an
// always-on banner. Dismissal is keyed to the current week's reset time, so it
// reappears next week but stays gone for the rest of this one.

const THRESHOLD = 3; // show once remaining ≤ this
const KEY = "fornetto:premiumBannerDismissed";

export function PremiumBanner() {
  const { loaded, allowance } = useMenu();
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we read storage (avoids a flash)

  const weekKey = allowance.resetsAt ?? "";
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(KEY) === weekKey && weekKey !== "");
    } catch {
      setDismissed(false);
    }
  }, [weekKey]);

  const show =
    loaded && !allowance.isPremium && allowance.remaining <= THRESHOLD && !dismissed;
  if (!show) return null;

  const out = allowance.remaining <= 0;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, weekKey);
    } catch {
      // Non-fatal — the banner just won't remember the dismissal.
    }
  }

  return (
    <div className="premium-banner" role="region" aria-label="Premium offer">
      <Sparkles size={16} className="premium-banner-spark" aria-hidden />
      <p className="premium-banner-text">
        {out ? (
          <>You’re out of AI actions until Monday. </>
        ) : (
          <>
            Only {allowance.remaining} AI action{allowance.remaining === 1 ? "" : "s"} left this
            week.{" "}
          </>
        )}
        <GoPremiumLink source="low_balance_banner" className="premium-banner-link">
          Go Premium
        </GoPremiumLink>{" "}
        for unlimited — less than a coffee a month.
      </p>
      <button
        type="button"
        className="premium-banner-close"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}
