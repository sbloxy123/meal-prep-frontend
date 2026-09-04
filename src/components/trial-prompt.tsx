"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useMenu } from "@/lib/menu";
import { logEvent } from "@/lib/analytics";
import { GoPremiumLink } from "@/components/ai-allowance";

// The in-app half of the trial prompts. Exactly three moments, each shown
// once per household (keyed to the trial's end so a new trial elsewhere
// wouldn't be muted by an old dismissal):
//   ending_soon – four days before the trial ends
//   last_day    – its final day
//   ended       – the first visit after it has ended (free plan, not converted)
// The backend sends the matching emails for the first two (lib/trial.js) and
// records every card shown as a trial_prompt event, deduped by the database.

type Stage = "ending_soon" | "last_day" | "ended";
const ENDED_WINDOW_DAYS = 14;

function keyFor(stage: Stage, endsAt: string) {
  return `fornetto:trialPrompt:${stage}:${endsAt}`;
}

function stageFor(a: ReturnType<typeof useMenu>["allowance"]): Stage | null {
  if (!a.trialEndsAt) return null;
  if (a.isTrial) {
    const days = a.trialDaysLeft ?? 0;
    if (days <= 1) return "last_day";
    if (days <= 4) return "ending_soon";
    return null;
  }
  if (a.plan === "free") {
    const endedMs = Date.now() - new Date(a.trialEndsAt).getTime();
    if (endedMs > 0 && endedMs < ENDED_WINDOW_DAYS * 86_400_000) return "ended";
  }
  return null;
}

export function TrialPrompt() {
  const { loaded, allowance } = useMenu();
  const stage = loaded ? stageFor(allowance) : null;
  const endsAt = allowance.trialEndsAt ?? "";
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!stage) return;
    let seen = false;
    try {
      seen = localStorage.getItem(keyFor(stage, endsAt)) === "1";
    } catch {
      seen = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(seen);
    if (!seen) logEvent("trial_prompt", { stage, channel: "app" });
  }, [stage, endsAt]);

  if (!stage || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(keyFor(stage as Stage, endsAt), "1");
    } catch {
      // Non-fatal — the card just won't remember the dismissal.
    }
  }

  const days = allowance.trialDaysLeft ?? 0;
  const lead =
    stage === "ended"
      ? "Your Premium trial has ended."
      : stage === "last_day"
        ? "Last day of your Premium trial."
        : `${days} days left on your Premium trial.`;
  const body =
    stage === "ended"
      ? ` Everything you made is still here — you’re now on ${allowance.limit} AI credits a month. `
      : " Keep it and you won’t pay until the trial would have ended anyway. ";

  return (
    <div className="premium-banner" role="region" aria-label="Premium trial">
      <Sparkles size={16} className="premium-banner-spark" aria-hidden />
      <p className="premium-banner-text">
        <strong>{lead}</strong>
        {body}
        <GoPremiumLink source={`trial_prompt_${stage}`} className="premium-banner-link">
          {stage === "ended" ? "Go Premium" : "Keep Premium"}
        </GoPremiumLink>
        {" — £3.99 a month for the whole household."}
      </p>
      <button type="button" className="premium-banner-close" onClick={dismiss} aria-label="Dismiss">
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}
