"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

export default function JoinHouseholdPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [status, setStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [message, setMessage] = useState("");

  async function join() {
    setStatus("joining");
    setMessage("");
    try {
      const res = await apiFetch<{ household_name?: string }>("/household/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setStatus("joined");
      setMessage(
        res?.household_name ? `You've joined ${res.household_name}.` : "You've joined the household.",
      );
      setTimeout(() => router.push("/recipes"), 1200);
    } catch (err) {
      setStatus("error");
      let msg = "This invite can't be used.";
      if (err instanceof ApiError) {
        try {
          msg = (JSON.parse(err.body) as { error?: string })?.error || msg;
        } catch {
          /* keep default */
        }
      }
      setMessage(msg);
    }
  }

  return (
    <div className="auth">
      <div className="auth-main">
        <div className="auth-kicker">Mise en Place</div>
        <h1 className="auth-title-sm">Join a household</h1>

        {isPending ? (
          <p className="auth-lede text-muted">Checking your invite…</p>
        ) : !session ? (
          <>
            <p className="auth-lede text-muted">
              You&rsquo;ve been invited to share a kitchen on Mise en Place. Sign in or create an
              account, then open this invite link again to join.
            </p>
            <hr className="auth-rule" />
            <Link href="/sign-up" className="btn btn-primary btn-block auth-submit">
              Create an account
            </Link>
            <Link
              href="/sign-in"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8 }}
            >
              Sign in
            </Link>
          </>
        ) : status === "joined" ? (
          <p className="auth-lede" style={{ color: "var(--color-accent-700)" }}>
            {message} Taking you to your recipes…
          </p>
        ) : (
          <>
            <p className="auth-lede text-muted">
              Accept this invite to share recipes, weekly menus and shopping lists with the rest of
              the household. Your own recipes come with you.
            </p>
            {status === "error" && (
              <p className="auth-error" role="alert">
                {message}
              </p>
            )}
            <hr className="auth-rule" />
            <button
              type="button"
              className="btn btn-primary btn-block auth-submit"
              onClick={join}
              disabled={status === "joining"}
            >
              {status === "joining" ? "Joining…" : "Join household"}
            </button>
            <Link href="/recipes" className="btn btn-ghost btn-block" style={{ marginTop: 6 }}>
              Not now
            </Link>
          </>
        )}
      </div>
      <div className="auth-foot">Mise en Place</div>
    </div>
  );
}
