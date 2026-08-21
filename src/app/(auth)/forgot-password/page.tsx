"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const email = new FormData(e.currentTarget).get("email") as string;
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (error) {
      setError(error.message ?? "Couldn't send the reset email.");
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="auth">
      <div className="auth-main">
        <div className="auth-kicker">Reset password</div>
        <h1 className="auth-title-sm">{sent ? "Check your email" : "Forgot your password?"}</h1>

        {sent ? (
          <p className="auth-lede text-muted">
            If that email has an account, a link to choose a new password is on its way. It expires
            in an hour.
          </p>
        ) : (
          <>
            <p className="auth-lede text-muted">
              Enter your email and we&rsquo;ll send you a link to set a new one.
            </p>
            <hr className="auth-rule" />
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required autoComplete="email" className="input" />
              </div>
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <div className="auth-alt">
          <Link href="/sign-in">Back to sign in</Link>
        </div>
      </div>
      <div className="auth-foot">Fornetto</div>
    </div>
  );
}
