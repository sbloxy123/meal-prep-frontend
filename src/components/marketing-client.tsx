"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { InstallSheet } from "@/components/install-sheet";
import { useInstallCoach } from "@/components/install-coach";
import { logInstall, promptNativeInstall, useNativeInstall, usePlatform } from "@/lib/install";

/**
 * Client bits for the marketing page (used at `/` and `/about`). The page markup
 * itself is a server component (`MarketingHome`); only these interactive pieces
 * need the session or the browser. Styling lives in src/styles/home.css.
 *
 * The auth-dependent parts default to the signed-out state so the server-rendered
 * HTML is correct for the common (SEO / new-visitor) case; they swap to a
 * "Back to app" affordance after hydration when a session is present.
 */

const BURGER_LINKS: [string, string][] = [
  ["How it works", "#how"],
  ["In the shop", "#shop"],
  ["Pricing", "#pricing"],
  ["Features", "#features"],
  ["Questions", "#faq"],
];

/** Header action cluster: adaptive CTAs + the <details> burger, plus the burger's
    progressive-enhancement listeners (outside-click / Escape / resize-close). */
export function MarketingHeaderActions() {
  const { data: session } = useSession();
  const signedIn = !!session;

  useEffect(() => {
    const burger = () =>
      document.querySelector<HTMLDetailsElement>("[data-burger]");

    const onClick = (e: MouseEvent) => {
      const d = burger();
      if (!d || !d.open) return;
      const target = e.target as Element;
      if (target.closest("[data-burger-panel] a")) {
        d.open = false;
        return;
      }
      if (!target.closest("[data-burger]")) d.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      const d = burger();
      if (e.key === "Escape" && d?.open) {
        d.open = false;
        d.querySelector<HTMLElement>("summary")?.focus();
      }
    };
    const onResize = () => {
      const d = burger();
      if (d?.open && window.innerWidth > 900) d.open = false;
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="home-actions">
      {signedIn ? (
        <Link href="/recipes" className="btn btn-primary home-btn-header">
          Back to app
        </Link>
      ) : (
        <>
          <Link href="/sign-in" className="home-signin">
            Sign in
          </Link>
          <Link href="/sign-up" className="btn btn-primary home-btn-header">
            Get started
          </Link>
        </>
      )}
      <details data-burger className="home-burger">
        <summary aria-label="Menu" className="home-burger-btn">
          <svg
            data-burger-bars
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            data-burger-x
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </summary>
        <nav data-burger-panel className="home-burger-panel">
          {BURGER_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="home-panel-link">
              {label}
            </a>
          ))}
          <span className="home-panel-divider" />
          <Link
            href={signedIn ? "/recipes" : "/sign-in"}
            className="home-panel-link home-panel-link--accent"
          >
            {signedIn ? "Back to app" : "Sign in"}
          </Link>
        </nav>
      </details>
    </div>
  );
}

/** Closing CTA buttons: Get started + Sign in when signed out, a single
    Back to app when signed in. Defaults to the signed-out pair (SSR). */
export function MarketingClosingCta() {
  const { data: session } = useSession();
  return (
    <div className="home-cta-actions">
      {session ? (
        <Link href="/recipes" className="btn btn-primary home-cta">
          Back to app
        </Link>
      ) : (
        <>
          <Link href="/sign-up" className="btn btn-primary home-cta">
            Get started
          </Link>
          <Link href="/sign-in" className="btn btn-ghost home-cta-ghost">
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}

/** Pricing-card CTA. Signed out (default SSR): "Get started" → sign-up for both
    plans. Signed in: Premium → /premium, Free → /recipes. */
export function MarketingPriceCta({ plan }: { plan: "free" | "premium" }) {
  const { data: session } = useSession();
  const signedIn = !!session;

  if (plan === "premium") {
    return (
      <Link
        href={signedIn ? "/premium" : "/sign-up"}
        className="btn btn-primary home-pricecard-cta"
      >
        {signedIn ? "Go Premium" : "Get started"}
      </Link>
    );
  }
  return (
    <Link
      href={signedIn ? "/recipes" : "/sign-up"}
      className="btn btn-secondary home-pricecard-cta"
    >
      {signedIn ? "Open Fornetto" : "Get started"}
    </Link>
  );
}

/**
 * "Install app" button (marketing page + Account). On Chrome/Edge it fires the
 * browser's install dialog, held by src/lib/install.ts. Everywhere else — iOS
 * above all, which has no such dialog — it opens the install sheet with the
 * steps for this phone. Shows an installed state once done, or when already
 * running from the home screen.
 */
export function MarketingInstallButton({ source = "button" }: { source?: "button" | "account" }) {
  const platform = usePlatform();
  const native = useNativeInstall();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const { requestCoach, coachElement } = useInstallCoach();
  const installed = accepted || native.installed || platform?.standalone === true;
  const ios = platform?.os === "ios";

  async function install() {
    // iOS never has a native prompt; the check keeps a forced ?platform=ios
    // preview on desktop Chrome from firing Chrome's dialog instead.
    if (native.available && !ios) {
      logInstall("install_prompt_shown", platform, { source });
      const result = await promptNativeInstall();
      logInstall("install_prompt_outcome", platform, {
        outcome: result === "accepted" ? "native_accepted" : "native_dismissed",
      });
      if (result === "accepted") setAccepted(true);
      return;
    }
    setOpen(true);
  }

  if (installed) {
    return (
      <div className="home-install">
        <span className="text-muted home-install-done">
          Fornetto is installed on this device — open it from your home screen.
        </span>
      </div>
    );
  }

  return (
    <div className="home-install">
      <div className="home-install-row">
        <button
          type="button"
          className="btn btn-primary home-btn-install"
          onClick={install}
        >
          {ios ? "Add to Home Screen" : "Install app"}
        </button>
        <span className="text-muted home-install-sub">
          {ios ? "Three taps — we’ll point at each one" : "Works on iPhone, Android and desktop"}
        </span>
      </div>
      <p className="text-muted home-install-hint">
        <Link href={`/install?from=${source}`}>Step-by-step guide</Link>
      </p>
      {open && <InstallSheet source={source} onClose={() => setOpen(false)} onCoach={requestCoach} />}
      {coachElement}
    </div>
  );
}

/** Footer link that adapts to auth: Sign in when signed out, Back to app when in. */
export function MarketingFooterAuthLink() {
  const { data: session } = useSession();
  return session ? (
    <Link href="/recipes">Back to app</Link>
  ) : (
    <Link href="/sign-in">Sign in</Link>
  );
}

/** Sends already-signed-in visitors from `/` to their recipes. Runs after paint,
    so it never gates the signed-out marketing render. Not used on `/about`. */
export function RedirectIfAuthed() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  useEffect(() => {
    if (!isPending && session) router.replace("/recipes");
  }, [session, isPending, router]);
  return null;
}
