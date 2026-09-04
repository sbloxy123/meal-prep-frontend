"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useMenu } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";
import { resetDay } from "@/components/ai-allowance";

// Upgrade flow: the button starts Stripe Checkout (a redirect); on return with
// ?upgraded=1 we refresh so the newly-unlocked plan shows once the webhook has
// flipped household.plan. Entitlement is household-wide. A household still on
// its trial can convert early: the backend passes the trial end to Checkout, so
// billing only starts when the free days would have run out anyway.

const MONTHLY = "£3.99";

const INCLUDED = [
  "300 AI credits a month — six times the free plan",
  "Recipe drafts from a link, a title, a photo or a social post",
  "“Improve recipe”, “Estimate macros” and “Give me inspiration”",
  "Shared across your whole household",
];

function longDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });
}

export default function PremiumPage() {
  const { allowance, refresh } = useMenu();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUpgraded, setJustUpgraded] = useState(false);

  // Back from Checkout: refresh so the unlocked plan lands (webhook-driven, so
  // it may take a moment) and show a thank-you.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("upgraded") === "1") {
      setJustUpgraded(true);
      void refresh();
      window.history.replaceState(null, "", "/premium");
    }
  }, [refresh]);

  async function upgrade() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { error: upErr } = await authClient.subscription.upgrade({
        plan: "premium",
        successUrl: `${window.location.origin}/premium?upgraded=1`,
        cancelUrl: `${window.location.origin}/premium`,
      });
      // On success the call redirects to Stripe; reaching here with an error
      // means checkout couldn't start.
      if (upErr) {
        setError("We couldn’t start checkout just now. Please try again in a moment.");
        setPending(false);
      }
    } catch {
      setError("We couldn’t start checkout just now. Please try again in a moment.");
      setPending(false);
    }
  }

  const paid = allowance.plan === "premium";
  const trial = allowance.isTrial;

  return (
    <>
      <PageHeader title="Fornetto Premium" />
      <div className="account">
        <section className="account-card">
          <span className="card-kicker">
            <Sparkles size={14} aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Fornetto AI
          </span>

          {paid ? (
            <>
              <h2>You’re on Premium</h2>
              <p className="text-muted" style={{ fontSize: 14 }}>
                {allowance.unlimited
                  ? "Your household has unlimited AI."
                  : `Your household has ${allowance.limit} AI credits a month (${allowance.remaining} left, tops up on ${resetDay(allowance.resetsAt)}).`}{" "}
                Thank you for supporting Fornetto. You can manage or cancel your subscription from
                your{" "}
                <Link href="/account" className="recipes-empty-link">
                  Account
                </Link>{" "}
                page.
              </p>
            </>
          ) : (
            <>
              {justUpgraded && (
                <p className="premium-thanks" role="status">
                  Payment received — unlocking Premium for your household. This can take a few
                  seconds to appear.
                </p>
              )}
              {trial ? (
                <>
                  <h2 style={{ marginBottom: 4 }}>
                    Premium trial — {allowance.trialDaysLeft} day{allowance.trialDaysLeft === 1 ? "" : "s"} left
                  </h2>
                  <p className="text-muted" style={{ fontSize: 14, marginTop: 0 }}>
                    Keep everything you have now for{" "}
                    <strong style={{ fontSize: 20, color: "var(--color-text)" }}>{MONTHLY}</strong> / month
                    — you won’t pay anything until {longDate(allowance.trialEndsAt)}. Cancel anytime.
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ marginBottom: 4 }}>Six times the AI for your kitchen</h2>
                  <p className="text-muted" style={{ fontSize: 14, marginTop: 0 }}>
                    <strong style={{ fontSize: 20, color: "var(--color-text)" }}>{MONTHLY}</strong> / month
                    — cancel anytime.
                  </p>
                </>
              )}

              <ul className="premium-features">
                {INCLUDED.map((line) => (
                  <li key={line}>
                    <Check size={16} aria-hidden className="premium-tick" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {!trial && (
                <p className="text-muted" style={{ fontSize: 13 }}>
                  Free accounts keep every feature — you get {allowance.limit} AI credits a month
                  {allowance.remaining < allowance.limit
                    ? ` (${allowance.remaining} left, tops up on ${resetDay(allowance.resetsAt)}).`
                    : "."}{" "}
                  The shopping list never costs a credit, and writing a recipe by hand is always free.
                </p>
              )}

              <button type="button" className="btn btn-ai" onClick={upgrade} disabled={pending}>
                <Sparkles size={15} className="btn-ai-spark" aria-hidden />
                {pending
                  ? "Starting checkout…"
                  : trial
                    ? `Keep Premium — ${MONTHLY}/month`
                    : `Go Premium — ${MONTHLY}/month`}
              </button>
              {error && (
                <p className="rf-error" role="alert" style={{ marginTop: 8 }}>
                  {error}
                </p>
              )}
              <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                Secure payment by Stripe. One member pays, your whole household gets Premium.
              </p>
            </>
          )}

          <p style={{ marginTop: 12 }}>
            <Link href="/recipes" className="btn btn-ghost">
              Back to recipes
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
