"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const { data, error } = await signUp.email({
      name: form.get("name") as string,
      email,
      password: form.get("password") as string,
    });

    if (error) {
      setError(error.message ?? "Couldn't create your account.");
      setLoading(false);
      return;
    }

    // When verification is enforced, sign-up doesn't create a session (no
    // token) — send them to verify. Otherwise they're signed straight in.
    if ((data as { token?: string | null } | null)?.token) {
      // Full-page navigation, not router.push: better-auth's signUp doesn't
      // update the client useSession store, so an SPA push would land on the
      // (app) layout with a stale "no session" and bounce to /sign-in. A hard
      // load makes useSession refetch and read the fresh session cookie.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/recipes";
    } else {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <div className="auth">
      <div className="auth-main">
        <div className="auth-kicker">Get started</div>
        <h1 className="auth-title-sm">Create your account</h1>
        <p className="auth-lede text-muted">
          Plan the week, build the list, shop it aisle by aisle. Every new account starts with 14 days of Premium — no card needed.
        </p>

        <hr className="auth-rule" />

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" required autoComplete="name" className="input" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
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

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="auth-alt">
          <span className="text-muted">Already have an account?</span>
          <Link href="/sign-in">Sign in</Link>
        </div>
      </div>

      <div className="auth-foot">Fornetto</div>
    </div>
  );
}
