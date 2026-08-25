"use client";

import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { useMenu } from "@/lib/menu";
import { PageHeader } from "@/components/page-header";

// Phase 1 stub: pricing + what's included, with the checkout deferred until the
// Stripe wiring ships (Phase 2). The "Go premium" affordance across the app
// routes here and its tap is already logged for the conversion funnel.

const INCLUDED = [
  "Unlimited AI recipe drafts — from a link, a title, a photo or a social post",
  "Unlimited “Improve recipe” and “Estimate macros”",
  "Unlimited “Give me inspiration” ideas",
  "Unlimited “Generate list by aisle”",
  "Shared across your whole household",
];

export default function PremiumPage() {
  const { allowance } = useMenu();

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
                Your household has unlimited AI. Thank you for supporting Fornetto.
              </p>
            </>
          ) : (
            <>
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
                Free accounts keep every feature — you just share{" "}
                {allowance.limit} AI actions a week
                {allowance.remaining < allowance.limit
                  ? ` (you’ve got ${allowance.remaining} left this week).`
                  : "."}{" "}
                Writing a recipe by hand is always free.
              </p>

              <button type="button" className="btn btn-ai" disabled>
                <Sparkles size={15} className="btn-ai-spark" aria-hidden />
                Checkout coming soon
              </button>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                We’re putting the finishing touches on secure payments. Thanks for your interest —
                it’ll be ready here shortly.
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
