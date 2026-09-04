"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, signOut, useSession } from "@/lib/auth-client";
import { apiFetch, apiSend } from "@/lib/api";
import type { RecipesResponse } from "@/lib/types";
import { useMenu } from "@/lib/menu";
import { GoPremiumLink } from "@/components/ai-allowance";
import { useToast } from "@/lib/toast";
import { PageHeader } from "@/components/page-header";
import { HouseholdCard } from "@/components/household-card";
import { PreferencesCard } from "@/components/preferences-card";
import { DietaryCard } from "@/components/dietary-card";
import { MarketingInstallButton } from "@/components/marketing-client";
import { InstallEmailButton } from "@/components/install-email-button";
import { useModalA11y } from "@/lib/use-modal";

function formatJoined(value?: string | Date | null) {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  return (
    <>
      <PageHeader
        title="Account"
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => signOut().then(() => router.push("/sign-in"))}
          >
            Sign out
          </button>
        }
      />
      <div className="account">
        {isPending || !user ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <>
            <ProfileCard key={user.id} name={user.name ?? ""} email={user.email} joined={formatJoined(user.createdAt)} />
            <PremiumCard />
            <PreferencesCard />
            <DietaryCard />
            <InstallAppCard />
            <AboutCard />
            <StarterRecipesCard />
            <HouseholdCard />
            <PasswordCard />
            <ResetRecipesCard />
            <DangerCard />
          </>
        )}
      </div>
    </>
  );
}

function ProfileCard({ name, email, joined }: { name: string; email: string; joined: string | null }) {
  const [value, setValue] = useState(name);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = value.trim() !== name && value.trim().length > 0;

  async function save() {
    if (!dirty || status === "saving") return;
    setStatus("saving");
    const { error } = await authClient.updateUser({ name: value.trim() });
    setStatus(error ? "error" : "saved");
  }

  return (
    <section className="account-card">
      <h2>Profile</h2>
      <form
        className="field account-inline"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label htmlFor="account-name">Display name</label>
        <div className="account-inline-row">
          <input
            id="account-name"
            className="input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
          />
          <button type="submit" className="btn btn-secondary" disabled={!dirty || status === "saving"}>
            {status === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
        {status === "saved" && <p className="account-ok">Name updated.</p>}
        {status === "error" && <p className="account-err">Couldn&rsquo;t update your name.</p>}
      </form>

      <div className="account-readonly">
        <span className="account-readonly-label">Email</span>
        <span className="account-readonly-value">{email}</span>
      </div>
      {joined && (
        <div className="account-readonly">
          <span className="account-readonly-label">Member since</span>
          <span className="account-readonly-value">{joined}</span>
        </div>
      )}
    </section>
  );
}

function PremiumCard() {
  const { allowance } = useMenu();
  const [managing, setManaging] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);

  async function manage() {
    if (managing) return;
    setManaging(true);
    setManageError(null);
    try {
      const { error } = await authClient.subscription.billingPortal({
        returnUrl: `${window.location.origin}/account`,
      });
      if (error) throw new Error();
      // On success this redirects to Stripe's hosted portal.
    } catch {
      setManageError("Only the household member who set up Premium can manage billing here.");
      setManaging(false);
    }
  }

  return (
    <section className="account-card">
      <h2>Premium</h2>
      {allowance.isTrial ? (
        <>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
            Your household is on a <strong>Premium trial</strong> — {allowance.trialDaysLeft} day
            {allowance.trialDaysLeft === 1 ? "" : "s"} left, {allowance.remaining} of {allowance.limit} credits this
            month. After that it&rsquo;s the free plan with 50 credits a month, unless you keep Premium.
          </p>
          <GoPremiumLink source="account_card_trial" className="btn btn-ai">
            Keep Premium — £3.99/month
          </GoPremiumLink>
        </>
      ) : allowance.isPremium ? (
        <>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
            Your household is on <strong>Premium</strong>
            {allowance.unlimited
              ? " — unlimited AI across every feature."
              : ` — ${allowance.remaining} of ${allowance.limit} AI credits left this month, shared across every feature.`}
            {allowance.billingInterval === "year" && " Billed yearly."}
            {allowance.founder && " Founders’ price, locked in."}
          </p>
          <button type="button" className="btn btn-secondary" onClick={manage} disabled={managing}>
            {managing ? "Opening…" : "Manage subscription"}
          </button>
          {manageError && (
            <p className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>
              {manageError}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
            You’re on the free plan — {allowance.remaining} of {allowance.limit} AI credits left this
            month. Go Premium for 300 a month across your whole household, £3.99/month.
          </p>
          <GoPremiumLink source="account_card" className="btn btn-ai">
            See Premium
          </GoPremiumLink>
        </>
      )}
    </section>
  );
}

function AboutCard() {
  return (
    <section className="account-card">
      <h2>How to use Fornetto</h2>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
        A quick tour of what Fornetto does — handy to revisit, or to share with
        anyone thinking of joining.
      </p>
      <Link href="/about" className="btn btn-secondary">
        View the guide
      </Link>
    </section>
  );
}

function InstallAppCard() {
  return (
    <section className="account-card">
      <h2>Install the app</h2>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
        Add Fornetto to your home screen for a full-screen app with its own icon
        that opens even when the signal doesn&rsquo;t. On iPhone it&rsquo;s Share, then
        Add to Home Screen — the button walks you through it.
      </p>
      <MarketingInstallButton source="account" />
      <p className="text-muted" style={{ fontSize: 14, margin: "18px 0 8px" }}>
        On a computer? Send the guide to your phone instead.
      </p>
      <InstallEmailButton />
    </section>
  );
}

function StarterRecipesCard() {
  return (
    <section className="account-card">
      <h2>Starter recipes</h2>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
        Add a ready-made set of everyday meals to your collection — pick the ones
        you want, edit or delete them anytime.
      </p>
      <Link href="/recipes?starters=1" className="btn btn-secondary">
        Add starter recipes
      </Link>
    </section>
  );
}

function PasswordCard() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = new FormData(e.currentTarget);
    const currentPassword = form.get("currentPassword") as string;
    const newPassword = form.get("newPassword") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match");
      setStatus("error");
      return;
    }

    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    if (error) {
      setErrorMsg(error.message ?? "Failed to change password");
      setStatus("error");
    } else {
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <section className="account-card">
      <h2>Change password</h2>
      <form onSubmit={handleSubmit} className="account-form">
        <div className="field">
          <label htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" required className="input" />
        </div>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} className="input" />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} className="input" />
        </div>

        {status === "error" && <p className="account-err">{errorMsg}</p>}
        {status === "success" && <p className="account-ok">Password changed.</p>}

        <button type="submit" className="btn btn-primary" disabled={status === "loading"}>
          {status === "loading" ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

function ResetRecipesCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="account-card">
      <h2>Start from scratch</h2>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
        Delete all your recipes so you can start over. Your account, household and shopping list stay.
        This can&rsquo;t be undone.
      </p>
      <button type="button" className="btn account-danger-btn" onClick={() => setOpen(true)}>
        Delete all recipes
      </button>
      {open && <ResetDialog onClose={() => setOpen(false)} />}
    </section>
  );
}

function ResetDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const menu = useMenu();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useModalA11y(ref, onClose);

  async function confirmReset() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      // No bulk endpoint — fetch the recipes and delete them one by one.
      const data = await apiFetch<RecipesResponse>("/recipes");
      for (const r of data.recipes) {
        await apiSend(`/recipes/${r.id}`, { method: "DELETE" });
      }
      await menu.refresh();
      toast.show("All recipes deleted.");
      onClose();
    } catch {
      setError("Couldn’t delete everything — some recipes may remain. Please try again.");
      setPending(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 70 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" ref={ref}>
        <h2 id="reset-title" className="dialog-title">
          Delete all recipes?
        </h2>
        <div className="dialog-body">
          <p style={{ margin: 0 }}>
            This permanently deletes{" "}
            {menu.householdShared ? "every recipe in your household (for all members)" : "all your recipes"}{" "}
            and takes them off this week. Your shopping list, household and account are kept. It
            can&rsquo;t be undone.
          </p>
        </div>
        {error && (
          <p className="account-err" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn account-danger-btn" onClick={confirmReset} disabled={pending}>
            {pending ? "Deleting…" : "Delete all recipes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DangerCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="account-card account-danger">
      <h2>Delete account</h2>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
        Permanently deletes your account and everything in it — recipes, photos and shopping lists.
        This can&rsquo;t be undone.
      </p>
      <button type="button" className="btn account-danger-btn" onClick={() => setOpen(true)}>
        Delete account
      </button>
      {open && <DeleteDialog onClose={() => setOpen(false)} />}
    </section>
  );
}

function DeleteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useModalA11y(ref, onClose);

  async function confirmDelete() {
    if (pending || !password) return;
    setPending(true);
    setError("");
    const { error: err } = await authClient.deleteUser({ password });
    if (err) {
      setError(err.message ?? "Couldn’t delete your account.");
      setPending(false);
      return;
    }
    // Session is gone — head to sign-in with a clean load.
    router.push("/sign-in");
  }

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 70 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-title" ref={ref}>
        <h2 id="del-title" className="dialog-title">
          Delete your account?
        </h2>
        <div className="dialog-body">
          <p style={{ margin: "0 0 12px" }}>
            This permanently deletes your account and all your recipes, photos and shopping lists. It
            can&rsquo;t be undone. Enter your password to confirm.
          </p>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            disabled={pending}
          />
        </div>
        {error && (
          <p className="account-err" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            className="btn account-danger-btn"
            onClick={confirmDelete}
            disabled={pending || !password}
          >
            {pending ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}
