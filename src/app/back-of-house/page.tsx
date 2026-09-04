"use client";

// Admin "back of house" — the shell only: auth gate, tab bar, date range.
//
// Standalone route (outside the (app) group) so it carries no app chrome. The
// route name is obscurity only; the real lock is server-side: every /admin/*
// endpoint is gated by an email allowlist and returns 403 to anyone else. This
// page holds NO admin identity — the overview fetch is the gate; a 401/403/404
// bounces away and nothing leaks to the bundle. Each tab (./tabs) fetches its
// own data through useAdminData, which caches per path for the page's life;
// changing the range clears that cache. The active tab lives in the URL hash so
// a view can be bookmarked. Adding a panel = a file in ./tabs + a row in TABS.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import type { AdminOverview, AdminUserRow, AdminUsersResponse } from "@/lib/types";
import { RANGES, RANGE_LABEL, type Range } from "./lib/constants";
import { clearAdminCache } from "./lib/use-admin-data";
import { OverviewTab } from "./tabs/overview";
import { UsersTab } from "./tabs/users";
import { EngagementTab } from "./tabs/engagement";
import { OnboardingTab } from "./tabs/onboarding";
import { AiTab } from "./tabs/ai";
import { CreditsTab } from "./tabs/credits";
import { AislesTab } from "./tabs/aisles";
import { SettingsTab } from "./tabs/settings";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "engagement", label: "Engagement" },
  { key: "onboarding", label: "Onboarding" },
  { key: "ai", label: "AI & cost" },
  { key: "credits", label: "Credits & revenue" },
  { key: "aisles", label: "Aisle cache" },
  { key: "settings", label: "Settings" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const RANGE_KEY = "fornetto:admin:range";

function tabFromHash(): TabKey {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.replace(/^#/, "");
  return (TABS.some((t) => t.key === h) ? h : "overview") as TabKey;
}

function initialRange(): Range {
  try {
    const v = Number(localStorage.getItem(RANGE_KEY));
    return (RANGES as readonly number[]).includes(v) ? (v as Range) : 30;
  } catch {
    return 30;
  }
}

export default function BackOfHousePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [days, setDays] = useState<Range>(30);
  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState("");

  // Hash ↔ tab, range ← storage (client only).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(tabFromHash());
    setDays(initialRange());
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  function handleErr(err: unknown) {
    if (err instanceof ApiError && (err.status === 401)) return router.replace("/sign-in");
    // 403 = signed in but not an admin; 404 = backend without the endpoint. Reveal nothing.
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return router.replace("/recipes");
    setError("Couldn’t load the dashboard.");
  }

  // The gate + the two datasets several tabs share.
  useEffect(() => {
    if (isPending || !session) return;
    let cancelled = false;
    apiFetch<AdminOverview>(`/admin/overview?days=${days}`)
      .then((d) => { if (!cancelled) setOverview(d); })
      .catch((err) => { if (!cancelled) handleErr(err); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, days]);

  useEffect(() => {
    if (isPending || !session) return;
    let cancelled = false;
    apiFetch<AdminUsersResponse>("/admin/users")
      .then((d) => { if (!cancelled) setUsers(d.users ?? []); })
      .catch((err) => { if (!cancelled) handleErr(err); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  function changeRange(r: Range) {
    setDays(r);
    clearAdminCache();
    try { localStorage.setItem(RANGE_KEY, String(r)); } catch { /* fine */ }
  }
  function changeTab(key: TabKey) {
    setTab(key);
    window.history.replaceState(null, "", `#${key}`);
  }

  if (isPending || !session) return <div className="admin-loading">Loading…</div>;
  if (error) return <div className="admin-loading">{error}</div>;
  if (!overview || !users) return <div className="admin-loading">Loading…</div>;

  const totals = overview.totals ?? {};
  const series = overview.series ?? {};

  return (
    <div className="admin">
      <div className="admin-top">
        <div>
          <h1 className="admin-title">Back of house</h1>
          <p className="admin-sub">Fornetto · {RANGE_LABEL[days]} view</p>
        </div>
        <div className="admin-range" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} type="button" className={r === days ? "is-active" : ""} onClick={() => changeRange(r)}>
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <nav className="admin-tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`admin-tab ${tab === t.key ? "is-active" : ""}`} onClick={() => changeTab(t.key)} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab overview={overview} days={days} />}
      {tab === "users" && <UsersTab users={users} />}
      {tab === "engagement" && <EngagementTab totals={totals} series={series} days={days} />}
      {tab === "onboarding" && <OnboardingTab days={days} />}
      {tab === "ai" && <AiTab series={series} users={users} days={days} />}
      {tab === "credits" && <CreditsTab days={days} />}
      {tab === "aisles" && <AislesTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}
