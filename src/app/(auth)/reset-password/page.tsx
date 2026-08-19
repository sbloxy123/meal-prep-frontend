"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // The reset link was invalid or expired (BetterAuth redirects with ?error).
  if (!token || linkError) {
    return (
      <div className="auth">
        <div className="auth-main">
          <div className="auth-kicker">Reset password</div>
          <h1 className="auth-title-sm">This link has expired</h1>
          <p className="auth-lede text-muted">
            Reset links are single-use and expire after an hour. Request a fresh one to continue.
          </p>
          <hr className="auth-rule" />
          <Link href="/forgot-password" className="btn btn-primary btn-block auth-submit" style={{ marginTop: 0 }}>
            Send a new link
          </Link>
        </div>
        <div className="auth-foot">Mise en Place</div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const newPassword = form.get("password") as string;
    if (newPassword !== form.get("confirm")) {
      setError("Those passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword, token: token! });
    if (error) {
      setError(error.message ?? "Couldn't reset your password.");
      setLoading(false);
      return;
    }
    setDone(true);
  }

  return (
    <div className="auth">
      <div className="auth-main">
        <div className="auth-kicker">Reset password</div>
        <h1 className="auth-title-sm">{done ? "Password updated" : "Choose a new password"}</h1>

        {done ? (
          <>
            <p className="auth-lede text-muted">
              Your password has been changed. You can sign in with it now.
            </p>
            <hr className="auth-rule" />
            <button
              type="button"
              className="btn btn-primary btn-block auth-submit"
              style={{ marginTop: 0 }}
              onClick={() => router.push("/sign-in")}
            >
              Go to sign in
            </button>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <hr className="auth-rule" />
            <div className="field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
              />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input"
              />
            </div>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={loading}>
              {loading ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
      </div>
      <div className="auth-foot">Mise en Place</div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
