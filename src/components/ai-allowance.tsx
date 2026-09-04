"use client";

import { useRouter } from "next/navigation";
import { apiSend, ApiError } from "@/lib/api";
import { useMenu, type AiAllowance } from "@/lib/menu";

// Shared UI for the AI credit allowance (see design/README.md "Allowance row").
// All AI surfaces read the entitlement from MenuProvider and render these bits,
// so the copy + upsell live in one place.

/** Fire-and-forget funnel logging for a "Go premium" tap. */
export function logPremiumCta(source: string) {
  void apiSend("/premium/cta", {
    method: "POST",
    body: JSON.stringify({ source }),
  }).catch(() => {
    // Best-effort — never block the upsell on a logging hiccup.
  });
}

/** Did an AI call 429 because the household's credits are spent (vs a 6h burst)?
    Accepts the pre-credits WEEKLY_LIMIT code too, for the deploy gap. */
export function isCreditLimit(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 429) return false;
  try {
    const code = JSON.parse(err.body)?.error;
    return code === "CREDIT_LIMIT" || code === "WEEKLY_LIMIT";
  } catch {
    return false;
  }
}

/** Fallback when the 429 carries no message of its own. */
export const CREDIT_LIMIT_MESSAGE =
  "You’ve used this month’s free AI credits. Go Premium for more — or add a recipe by hand any time, that’s always free.";

/** The message to show for a credit-limit 429: the server's own sentence (it
    knows the cost, the balance and the reset day) or the generic fallback. */
export function creditLimitMessage(err: unknown): string {
  if (err instanceof ApiError) {
    try {
      const msg = JSON.parse(err.body)?.message;
      if (typeof msg === "string" && msg.trim()) return msg;
    } catch {
      // fall through
    }
  }
  return CREDIT_LIMIT_MESSAGE;
}

/** "the 14th" — the London calendar day a period turns over. */
export function resetDay(iso: string | null | undefined): string {
  if (!iso) return "next month";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "next month";
  const day = Number(d.toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric" }));
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `the ${day}${suffix}`;
}

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

function creditsWord(n: number): string {
  return n === 1 ? "credit" : "credits";
}

/** Header pill: "{n} credits" (free), "Premium trial" or "Premium". */
export function AllowanceTag({ allowance }: { allowance?: AiAllowance }) {
  const menu = useMenu();
  const a = allowance ?? menu.allowance;
  const text = a.isTrial
    ? "Premium trial"
    : a.isPremium
      ? "Premium"
      : `${a.remaining} ${creditsWord(a.remaining)}`;
  return <span className="ai-allowance-tag">{text}</span>;
}

/** Footer row inside the Fornetto AI card: allowance sentence + Go premium. */
export function AllowanceRow({ source }: { source: string }) {
  const { allowance: a } = useMenu();

  let sentence: string;
  if (a.isTrial) {
    const days = a.trialDaysLeft ?? 0;
    sentence = `Premium trial — ${days} day${days === 1 ? "" : "s"} left, ${a.remaining} ${creditsWord(a.remaining)} this month.`;
  } else if (a.isPremium) {
    sentence = a.unlimited
      ? "Premium — unlimited AI."
      : `Premium — ${a.remaining} of ${a.limit} credits left this month.`;
  } else if (a.remaining > 0) {
    sentence = `${a.remaining} of ${a.limit} free credits left this month — tops up on ${resetDay(a.resetsAt)}.`;
  } else {
    sentence = `No credits left until ${resetDay(a.resetsAt)}. Writing a recipe by hand is always free.`;
  }

  return (
    <div className="ai-allowance-row">
      <p className="ai-allowance-sentence">{sentence}</p>
      {!a.isPremium && <GoPremiumLink source={source} />}
    </div>
  );
}

/** Compact inline note for AI buttons outside the Add-recipe panel (estimate /
    improve / inspiration). Renders nothing for premium or trial households. */
export function AllowanceNote({ source, action }: { source: string; action?: import("@/lib/menu").AiAction }) {
  const { allowance: a } = useMenu();
  if (a.isPremium) return null;
  const cost = action ? a.costOf(action) : 1;
  const costNote = cost > 1 ? ` This uses ${cost}.` : "";
  return (
    <span className="ai-allowance-note">
      {a.remaining > 0
        ? `${a.remaining} of ${a.limit} credits left this month.${costNote}`
        : `No credits left until ${resetDay(a.resetsAt)}.`}
      <GoPremiumLink source={source} />
    </span>
  );
}
