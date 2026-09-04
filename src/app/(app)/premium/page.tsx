"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useMenu } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";
import { resetDay, logPremiumCta } from "@/components/ai-allowance";
import { apiFetch, ApiError } from "@/lib/api";

// Upgrade flow: the button starts Stripe Checkout (a redirect); on return with
// ?upgraded=1 we refresh so the newly-unlocked plan shows once the webhook has
// flipped household.plan. Entitlement is household-wide. A household still on
// its trial can convert early: the backend passes the trial end to Checkout, so
// billing only starts when the free days would have run out anyway.

const MONTHLY = "£3.99";
const ANNUAL = "£29.99";
const FOUNDERS = "£19.99";
// Two months free, i.e. £29.99 vs 12 × £3.99.
const ANNUAL_SAVING = "save 37%";

/** GET /premium/offers — what can be bought right now (annual needs the
    yearly Stripe Price; founders' needs places left on its coupon). */
interface Offers {
  monthly: boolean;
  annual: boolean;
  founders: { available: boolean; remaining: number | null; cap: number | null };
}

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
  const [offers, setOffers] = useState<Offers | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("month");

  useEffect(() => {
    let cancelled = false;
    apiFetch<Offers>("/premium/offers")
      .then((o) => {
        if (cancelled) return;
        setOffers(o);
        // Lead with annual while the founders' offer is on — that's the deal.
        if (o.annual && o.founders.available) setInterval("year");
      })
      .catch(() => {
        if (!cancelled) setOffers({ monthly: true, annual: false, founders: { available: false, remaining: null, cap: null } });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Back from Checkout: refresh so the unlocked plan lands (webhook-driven, so
  // it may take a moment) and show a thank-you.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("upgraded") === "1") {
      setJustUpgraded(true);
      void refresh();
      window.history.replaceState(null, "", "/premium");
    }
  }, [refresh]);

  const annual = interval === "year" && Boolean(offers?.annual);
  const founders = annual && Boolean(offers?.founders.available);

  async function upgrade() {
    if (pending) return;
    setPending(true);
    setError(null);
    logPremiumCta(founders ? "premium_page_founders" : annual ? "premium_page_annual" : "premium_page_monthly");
    try {
      const { error: upErr } = await authClient.subscription.upgrade({
        plan: "premium",
        annual,
        successUrl: `${window.location.origin}/premium?upgraded=1`,
        cancelUrl: `${window.location.origin}/premium`,
      });
      // On success the call redirects to Stripe; reaching here with an error
      // means checkout couldn't start.
      if (upErr) {
        setError(
          founders
            ? "The founders’ places have just run out — the standard annual price still applies. Try again."
            : "We couldn’t start checkout just now. Please try again in a moment.",
        );
        setPending(false);
      }
    } catch (err) {
      setError(
        founders && err instanceof ApiError
          ? "The founders’ places have just run out — the standard annual price still applies. Try again."
          : "We couldn’t start checkout just now. Please try again in a moment.",
      );
      setPending(false);
    }
  }

  const priceLine = founders ? FOUNDERS : annual ? ANNUAL : MONTHLY;
  const priceUnit = annual ? "year" : "month";

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
                  : `Your household has ${allowance.limit} AI credits a month (${allowance.remaining} left, tops up on ${resetDay(allowance.resetsAt)}).`}
                {allowance.billingInterval === "year" && " Billed yearly."}
                {allowance.founder && " Founders’ price, locked in for as long as you stay subscribed."}{" "}
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
                    <strong style={{ fontSize: 20, color: "var(--color-text)" }}>{priceLine}</strong> / {priceUnit}
                    — you won’t pay anything until {longDate(allowance.trialEndsAt)}. Cancel anytime.
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ marginBottom: 4 }}>Six times the AI for your kitchen</h2>
                  <p className="text-muted" style={{ fontSize: 14, marginTop: 0 }}>
                    <strong style={{ fontSize: 20, color: "var(--color-text)" }}>{priceLine}</strong> / {priceUnit}
                    — cancel anytime.
                  </p>
                </>
              )}

              {offers?.annual && (
                <div className="premium-interval" role="radiogroup" aria-label="Billing period">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={interval === "month"}
                    className={`premium-option ${interval === "month" ? "is-active" : ""}`}
                    onClick={() => setInterval("month")}
                  >
                    <span className="premium-option-name">Monthly</span>
                    <span className="premium-option-price">
                      {MONTHLY}
                      <span className="premium-option-unit"> / month</span>
                    </span>
                    <span className="premium-option-note">Cancel anytime</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={interval === "year"}
                    className={`premium-option ${interval === "year" ? "is-active" : ""}`}
                    onClick={() => setInterval("year")}
                  >
                    <span className="premium-option-badge">Best value · 2 months free</span>
                    <span className="premium-option-name">Yearly</span>
                    <span className="premium-option-price">
                      {founders ? FOUNDERS : ANNUAL}
                      <span className="premium-option-unit"> / year</span>
                    </span>
                    <span className="premium-option-note">
                      {founders ? "Founders’ price, locked in" : `${ANNUAL_SAVING} vs monthly`}
                    </span>
                  </button>
                </div>
              )}

              {founders && (
                <div className="premium-founders" role="note">
                  <strong>Founders’ price: {FOUNDERS} a year, locked in.</strong> The first{" "}
                  {offers?.founders.cap ?? "few hundred"} households to go yearly keep this price for as
                  long as they stay subscribed
                  {offers?.founders.remaining != null && ` — ${offers.founders.remaining} left`}.
                </div>
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
                  : founders
                    ? `Claim the founders’ price — ${FOUNDERS}/year`
                    : trial
                      ? `Keep Premium — ${priceLine}/${priceUnit}`
                      : `Go Premium — ${priceLine}/${priceUnit}`}
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
