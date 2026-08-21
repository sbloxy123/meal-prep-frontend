"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function VerifyEmailInner() {
  const email = useSearchParams().get("email") ?? "";
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function resend() {
    if (!email || sending) return;
    setSending(true);
    setError("");
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/recipes",
    });
    if (error) setError(error.message ?? "Couldn't resend the email.");
    else setSent(true);
    setSending(false);
  }

  return (
    <div className="auth">
      <div className="auth-main">
        <div className="auth-kicker">Almost there</div>
        <h1 className="auth-title-sm">Check your email</h1>
        <p className="auth-lede text-muted">
          We&rsquo;ve sent a verification link to {email ? <strong>{email}</strong> : "your inbox"}.
          Open it to confirm your address and you&rsquo;re in.
        </p>

        <hr className="auth-rule" />

        {email && (
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={resend}
            disabled={sending || sent}
          >
            {sent ? "Email sent" : sending ? "Sending…" : "Resend the email"}
          </button>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <div className="auth-alt">
          <span className="text-muted">Wrong address?</span>
          <Link href="/sign-up">Start again</Link>
        </div>
      </div>
      <div className="auth-foot">Fornetto</div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
