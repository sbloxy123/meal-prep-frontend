"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const { error } = await signIn.email({
      email,
      password: form.get("password") as string,
    });

    if (error) {
      // When email verification is enforced (households release), an
      // unverified user can't sign in — send them to check their inbox.
      if (error.status === 403 || /verif/i.test(error.message ?? "")) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(error.message ?? "That email and password didn't match.");
      setLoading(false);
      return;
    }

    // Full-page navigation, not router.push: better-auth's signIn doesn't
    // update the client useSession store, so an SPA push would land on the
    // (app) layout with a stale "no session" and bounce back to /sign-in. A
    // hard load makes useSession refetch and read the fresh session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/recipes";
  }

  return (
    <div className="auth">
      <div className="auth-main">
        <div className="auth-kicker">Est. 2024</div>
        <h1 className="auth-title">
          The week&rsquo;s
          <br />
          shopping,
          <br />
          in order.
        </h1>
        <p className="auth-lede text-muted">
          Your recipes, the ingredients you actually need, and a list that reads aisle by aisle.
        </p>

        <hr className="auth-rule" />

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
            />
          </div>
          <Link href="/forgot-password" className="auth-forgot">
            Forgot password?
          </Link>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-alt">
          <span className="text-muted">No account yet?</span>
          <Link href="/sign-up">Create one</Link>
        </div>
      </div>

      <div className="auth-foot">Fornetto</div>
    </div>
  );
}
