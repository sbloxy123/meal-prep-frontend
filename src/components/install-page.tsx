"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Logo } from "@/components/logo";
import { InstallGuide } from "@/components/install-guide";
import { InstallEmailButton } from "@/components/install-email-button";
import { logInstall, promptNativeInstall, useNativeInstall, usePlatform } from "@/lib/install";

// The public step-by-step guide: where the post-verification email and the
// Account / rail links land. Works signed out — the person may well be
// arriving from an email on a phone that has never signed in — and adapts to
// the phone it's opened on.
export function InstallPage() {
  const platform = usePlatform();
  const native = useNativeInstall();
  const { data: session } = useSession();
  const from = useSearchParams().get("from") ?? "direct";
  const [pending, setPending] = useState(false);

  const viewLogged = useRef(false);
  useEffect(() => {
    if (!platform || viewLogged.current) return;
    viewLogged.current = true;
    logInstall("install_page_view", platform, { from });
  }, [platform, from]);

  async function install() {
    setPending(true);
    const result = await promptNativeInstall();
    setPending(false);
    logInstall("install_prompt_outcome", platform, {
      outcome: result === "accepted" ? "native_accepted" : "native_dismissed",
    });
  }

  return (
    <div className="install-page">
      <header className="install-header">
        <Link href="/" className="install-brand">
          <Logo size={26} />
          <span className="install-wordmark">Fornetto</span>
        </Link>
        {session ? (
          <Link href="/recipes" className="btn btn-secondary">
            Back to app
          </Link>
        ) : (
          <Link href="/sign-in" className="btn btn-secondary">
            Sign in
          </Link>
        )}
      </header>

      <main className="install-main">
        <div className="install-kicker">On your phone</div>
        <InstallGuide platform={platform} nativeAvailable={native.available} variant="page" />

        {native.available && (
          <div className="install-actions">
            <button type="button" className="btn btn-primary" onClick={install} disabled={pending}>
              {pending ? "Installing…" : "Install Fornetto"}
            </button>
          </div>
        )}
        {native.installed && (
          <p className="install-note">Installed — open Fornetto from your home screen.</p>
        )}

        {session && !platform?.standalone && (
          <section className="install-card">
            <h2>Send the link to your phone</h2>
            <p className="text-muted">
              Reading this on a computer? Email yourself this guide and open it on your phone.
            </p>
            <InstallEmailButton />
          </section>
        )}

        <p className="install-links">
          <Link href="/about">How to use Fornetto</Link>
          {session ? <Link href="/recipes">Back to the app</Link> : <Link href="/sign-up">Create an account</Link>}
        </p>
      </main>
    </div>
  );
}
