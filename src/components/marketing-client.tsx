"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

/**
 * Client bits for the marketing page (used at `/` and `/about`). The page markup
 * itself is a server component (`MarketingHome`); only these interactive pieces
 * need the session or the browser.
 *
 * The auth-dependent parts default to the signed-out state so the server-rendered
 * HTML is correct for the common (SEO / new-visitor) case; they swap to a
 * "Back to app" affordance after hydration when a session is present.
 */

const BURGER_LINKS: [string, string][] = [
  ["How it works", "#how"],
  ["In the shop", "#shop"],
  ["Features", "#features"],
  ["Questions", "#faq"],
];

const panelRow = {
  display: "flex",
  alignItems: "center",
  minHeight: 44,
  padding: "0 12px",
  borderRadius: "var(--radius-sm)",
  fontSize: 15,
} as const;

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
    <div data-actions style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {signedIn ? (
        <Link
          href="/recipes"
          className="btn btn-primary"
          style={{ height: 44, textDecoration: "none" }}
        >
          Back to app
        </Link>
      ) : (
        <>
          <Link data-signin href="/sign-in" style={{ fontSize: 14 }}>
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="btn btn-primary"
            style={{ height: 44, textDecoration: "none" }}
          >
            Get started
          </Link>
        </>
      )}
      <details data-burger style={{ position: "relative" }}>
        <summary
          aria-label="Menu"
          style={{
            width: 44,
            height: 44,
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text)",
          }}
        >
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
        <nav
          data-burger-panel
          style={{
            position: "absolute",
            top: "calc(100% + 13px)",
            right: -20,
            width: 240,
            background: "var(--color-bg)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            zIndex: 30,
          }}
        >
          {BURGER_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              style={{ ...panelRow, color: "var(--color-text)" }}
            >
              {label}
            </a>
          ))}
          <span
            style={{
              height: 1,
              background: "var(--color-divider)",
              margin: "6px 12px",
            }}
          />
          <Link
            href={signedIn ? "/recipes" : "/sign-in"}
            style={{ ...panelRow, color: "var(--color-accent-700)" }}
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
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 14,
        marginTop: 32,
      }}
    >
      {session ? (
        <Link
          href="/recipes"
          className="btn btn-primary"
          style={{
            height: 50,
            paddingInline: 32,
            fontSize: 16,
            textDecoration: "none",
          }}
        >
          Back to app
        </Link>
      ) : (
        <>
          <Link
            href="/sign-up"
            className="btn btn-primary"
            style={{
              height: 50,
              paddingInline: 32,
              fontSize: 16,
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
          <Link
            href="/sign-in"
            className="btn btn-ghost"
            style={{ height: 50, textDecoration: "none" }}
          >
            Sign in
          </Link>
        </>
      )}
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install it like an app" button. Uses the browser's install flow where one
 * exists: on Chrome/Edge/Android it captures `beforeinstallprompt` and fires the
 * native prompt on click; on iOS Safari (which has no such event) it reveals the
 * Share -> Add to Home Screen steps; otherwise it points at the browser menu.
 * Shows an installed state once done (or when already running standalone).
 */
export function MarketingInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hint, setHint] = useState<"ios" | "generic" | null>(null);

  useEffect(() => {
    // Deferred to after paint (reads client-only APIs), keeping the state
    // updates out of the effect body.
    const raf = requestAnimationFrame(() => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone) setInstalled(true);

      const ua = navigator.userAgent;
      setIsIOS(
        /iPad|iPhone|iPod/.test(ua) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
      );
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setHint(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setHint(isIOS ? "ios" : "generic");
  }

  if (installed) {
    return (
      <div style={{ marginTop: 28 }}>
        <span className="text-muted" style={{ fontSize: 14 }}>
          Fornetto is installed on this device — open it from your home screen.
        </span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: 46, paddingInline: 26 }}
          onClick={install}
        >
          Install app
        </button>
        <span className="text-muted" style={{ fontSize: 13 }}>
          Works on iPhone and Android
        </span>
      </div>
      {hint && (
        <p
          className="text-muted"
          style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.55, maxWidth: 420 }}
        >
          {hint === "ios"
            ? "On iPhone or iPad: tap the Share button in Safari, then choose “Add to Home Screen”."
            : "If nothing pops up, open your browser menu and choose “Install app” (or “Add to Home Screen”)."}
        </p>
      )}
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
