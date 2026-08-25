"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useMenu } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";

// Upgrade flow: the button starts Stripe Checkout (a redirect); on return with
// ?upgraded=1 we refresh so the newly-unlocked plan shows once the webhook has
// flipped household.plan. Entitlement is household-wide.

const INCLUDED = [
  "Unlimited AI recipe drafts — from a link, a title, a photo or a social post",
  "Unlimited “Improve recipe” and “Estimate macros”",
  "Unlimited “Give me inspiration” ideas",
  "Unlimited “Generate list by aisle”",
  "Shared across your whole household",
];

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

  return (
    <>
      <PageHeader title="Fornetto Premium" />
      <div className="account">
        <section className="account-card">
          <span className="card-kicker">
            <Sparkles size={14} aria-hidden style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Fornetto AI
          </span>

          {allowance.isPremium ? (
            <>
              <h2>You’re on Premium</h2>
              <p className="text-muted" style={{ fontSize: 14 }}>
                Your household has unlimited AI. Thank you for supporting Fornetto. You can manage
                or cancel your subscription from your{" "}
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
                  Payment received — unlocking unlimited AI for your household. This can take a few
                  seconds to appear.
                </p>
              )}
              <h2 style={{ marginBottom: 4 }}>Unlimited AI for your kitchen</h2>
              <p className="text-muted" style={{ fontSize: 14, marginTop: 0 }}>
                <strong style={{ fontSize: 20, color: "var(--color-text)" }}>£2.99</strong> / month
                — cancel anytime.
              </p>

              <ul className="premium-features">
                {INCLUDED.map((line) => (
                  <li key={line}>
                    <Check size={16} aria-hidden className="premium-tick" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <p className="text-muted" style={{ fontSize: 13 }}>
                Free accounts keep every feature — you just share {allowance.limit} AI actions a
                week
                {allowance.remaining < allowance.limit
                  ? ` (you’ve got ${allowance.remaining} left this week).`
                  : "."}{" "}
                Writing a recipe by hand is always free.
              </p>

              <button type="button" className="btn btn-ai" onClick={upgrade} disabled={pending}>
                <Sparkles size={15} className="btn-ai-spark" aria-hidden />
                {pending ? "Starting checkout…" : "Go Premium — £2.99/month"}
              </button>
              {error && (
                <p className="rf-error" role="alert" style={{ marginTop: 8 }}>
                  {error}
                </p>
              )}
              <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                Secure payment by Stripe. One member pays, your whole household gets unlimited AI.
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
