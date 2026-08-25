"use client";

import { useRouter } from "next/navigation";
import { apiSend, ApiError } from "@/lib/api";
import { useMenu, type AiAllowance } from "@/lib/menu";

// Shared UI for the weekly AI allowance (see design/README.md "Allowance row").
// All AI surfaces read the allowance from MenuProvider and render these bits, so
// the copy + upsell live in one place.

/** Fire-and-forget funnel logging for a "Go premium" tap. */
export function logPremiumCta(source: string) {
  void apiSend("/premium/cta", {
    method: "POST",
    body: JSON.stringify({ source }),
  }).catch(() => {
    // Best-effort — never block the upsell on a logging hiccup.
  });
}

/** Did an AI call 429 because the free weekly pool is spent (vs a 6h burst)? */
export function isWeeklyLimit(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 429) return false;
  try {
    return JSON.parse(err.body)?.error === "WEEKLY_LIMIT";
  } catch {
    return false;
  }
}

/** The message to show when the weekly pool is spent. */
export const WEEKLY_LIMIT_MESSAGE =
  "You’ve used all 15 free AI actions this week. Upgrade to Premium for unlimited — or add a recipe by hand any time, that’s always free.";

/** A "Go premium" link that logs the tap, then routes to /premium. */
export function GoPremiumLink({
  source,
  className = "ai-allowance-link",
  children = "Go premium",
}: {
  source: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        logPremiumCta(source);
        router.push("/premium");
      }}
    >
      {children}
    </button>
  );
}

/** Header pill: "{n} left" (free) or "Premium". */
export function AllowanceTag({ allowance }: { allowance?: AiAllowance }) {
  const menu = useMenu();
  const a = allowance ?? menu.allowance;
  return (
    <span className="ai-allowance-tag">
      {a.isPremium ? "Premium" : `${a.remaining} left`}
    </span>
  );
}

/** Footer row inside the Fornetto AI card: allowance sentence + Go premium. */
export function AllowanceRow({ source }: { source: string }) {
  const { allowance: a } = useMenu();

  let sentence: string;
  if (a.isPremium) {
    sentence = "Premium — unlimited AI.";
  } else if (a.remaining > 0) {
    sentence = `${a.remaining} of ${a.limit} AI actions left this week.`;
  } else {
    sentence = "No AI actions left until Monday. Writing a recipe by hand is always free.";
  }

  return (
    <div className="ai-allowance-row">
      <p className="ai-allowance-sentence">{sentence}</p>
      {!a.isPremium && <GoPremiumLink source={source} />}
    </div>
  );
}

/** Compact inline note for AI buttons outside the Add-recipe panel (estimate /
    improve / inspiration / aisle). Renders nothing for premium households. */
export function AllowanceNote({ source }: { source: string }) {
  const { allowance: a } = useMenu();
  if (a.isPremium) return null;
  return (
    <span className="ai-allowance-note">
      {a.remaining > 0
        ? `${a.remaining} of ${a.limit} AI actions left this week.`
        : "No AI actions left this week."}
      <GoPremiumLink source={source} />
    </span>
  );
}
