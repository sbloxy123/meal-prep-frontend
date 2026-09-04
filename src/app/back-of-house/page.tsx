"use client";

// Admin "back of house" — read-only usage-analytics dashboard.
//
// Standalone route (outside the (app) group) so it carries no shell/nav and
// isn't discoverable through app chrome. The route name is obscurity only; the
// real lock is server-side: every /admin/* endpoint is gated by an email
// allowlist and returns 403 to anyone else. This page holds NO admin identity —
// it just calls the API and redirects away on 401/403, so nothing leaks to the
// bundle. Inert-safe before the backend ships (no endpoint → redirect).

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MAX_VERIFIED_IOS } from "@/lib/ios-layouts";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import type {
  AdminAiStats,
  AdminConfig,
  AdminCreditStats,
  AdminRetentionPoint,
  AdminOverview,
  AdminTotals,
  AdminSeriesPoint,
  AdminUserRow,
  AdminUsersResponse,
} from "@/lib/types";

const RANGES = [7, 30, 90, 365] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABEL: Record<Range, string> = { 7: "7d", 30: "30d", 90: "90d", 365: "1y" };

// Every action the AI ledger records (backend AI_ACTIONS). The last four were
// invisible to the old dashboard — social + aisle-sort drew the allowance
// without being counted, and parse / usuals were never logged at all.
const AI_ACTIONS = [
  "import", "estimate", "generate", "photo", "improve", "suggest", "social", "aisle", "parse", "usuals",
] as const;
type AiAction = (typeof AI_ACTIONS)[number];
const AI_LABEL: Record<AiAction, string> = {
  import: "Import",
  estimate: "Estimate",
  generate: "Generate",
  photo: "Photo",
  improve: "Improve",
  suggest: "Suggest",
  social: "Social",
  aisle: "Aisle sort",
  parse: "Paste to list",
  usuals: "My usuals",
};

/** Pence → "£1.23" / "0.45p". The ledger stores 4 dp; two is plenty here. */
function fmtPence(p?: number | null): string {
  if (p == null) return "—";
  if (p >= 100) return `£${(p / 100).toFixed(2)}`;
  return `${p.toFixed(2)}p`;
}
function fmtMs(ms?: number | null): string {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
function fmtTokens(n?: number | null): string {
  if (n == null) return "—";
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function pct(v?: number | null): string {
  return v == null ? "—" : `${v}%`;
}

type Segment = "all" | "active" | "inactive" | "unverified" | "recipes" | "premium";
type SortKey = "name" | "joined" | "active" | "recipes" | "ai" | "household" | "plan";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active (30d)" },
  { key: "inactive", label: "Inactive" },
  { key: "unverified", label: "Unverified" },
  { key: "recipes", label: "Has recipes" },
  { key: "premium", label: "Premium" },
];

/** How a user's plan reads in the table: comped, paid, or free. */
function planLabel(u: AdminUserRow): { text: string; premium: boolean } {
  if (u.plan === "premium") return { text: u.paid ? "Premium" : "Comp", premium: true };
  return { text: "Free", premium: false };
}

function sum(points: AdminSeriesPoint[] | undefined, keys?: readonly string[]): number {
  if (!points) return 0;
  return points.reduce((acc, p) => {
    if (keys) return acc + keys.reduce((s, k) => s + (p.values?.[k] ?? 0), 0);
    return acc + (p.count ?? 0);
  }, 0);
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function relative(iso?: string | null): string {
  const d = daysSince(iso);
  if (d == null) return "never";
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default function BackOfHousePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [days, setDays] = useState<Range>(30);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [aiStats, setAiStats] = useState<AdminAiStats | null>(null);
  const [creditStats, setCreditStats] = useState<AdminCreditStats | null>(null);
  const [error, setError] = useState("");

  // Not signed in at all → straight to sign-in.
  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  function handleErr(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      router.replace("/sign-in");
      return;
    }
    // 403 = signed in but not an admin. Reveal nothing; bounce to the app.
    if (err instanceof ApiError && err.status === 403) {
      router.replace("/recipes");
      return;
    }
    if (err instanceof ApiError && err.status === 404) {
      // Backend not deployed yet — treat like "no access", don't expose the page.
      router.replace("/recipes");
      return;
    }
    setError("Couldn’t load the dashboard.");
  }

  // Users (once auth resolves) — the priority section, all-time aggregates.
  useEffect(() => {
    if (isPending || !session) return;
    let cancelled = false;
    apiFetch<AdminUsersResponse>("/admin/users")
      .then((d) => {
        if (!cancelled) setUsers(d.users ?? []);
      })
      .catch((err) => {
        if (!cancelled) handleErr(err);
      });
    return () => {
      cancelled = true;
    };
    // handleErr is stable enough; router/session drive it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session]);

  // Overview (re-fetches when the date range changes) — totals + daily series.
  useEffect(() => {
    if (isPending || !session) return;
    let cancelled = false;
    apiFetch<AdminOverview>(`/admin/overview?days=${days}`)
      .then((d) => {
        if (!cancelled) setOverview(d);
      })
      .catch((err) => {
        if (!cancelled) handleErr(err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, days]);

  // AI ledger (cost, tokens, latency) — same range. A 404 here just means an
  // older backend; the section shows its empty state rather than bouncing.
  useEffect(() => {
    if (isPending || !session) return;
    let cancelled = false;
    apiFetch<AdminAiStats>(`/admin/ai?days=${days}`)
      .then((d) => {
        if (!cancelled) setAiStats(d);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) return;
        handleErr(err);
      });
    apiFetch<AdminCreditStats>(`/admin/credits?days=${days}`)
      .then((d) => {
        if (!cancelled) setCreditStats(d);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) return;
        handleErr(err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session, days]);

  if (isPending || !session) {
    return <div className="admin-loading">Loading…</div>;
  }
  if (error) {
    return <div className="admin-loading">{error}</div>;
  }
  if (!users) {
    return <div className="admin-loading">Loading…</div>;
  }

  return (
    <Dashboard
      users={users}
      overview={overview}
      aiStats={aiStats}
      creditStats={creditStats}
      days={days}
      onRange={setDays}
    />
  );
}

function Dashboard({
  users,
  overview,
  aiStats,
  creditStats,
  days,
  onRange,
}: {
  users: AdminUserRow[];
  overview: AdminOverview | null;
  aiStats: AdminAiStats | null;
  creditStats: AdminCreditStats | null;
  days: Range;
  onRange: (d: Range) => void;
}) {
  const totals = overview?.totals ?? {};
  const series = overview?.series ?? {};

  const newInRange = sum(series.signups);
  const aiInRange = sum(series.aiCalls, AI_ACTIONS);

  return (
    <div className="admin">
      <div className="admin-top">
        <div>
          <h1 className="admin-title">Back of house</h1>
          <p className="admin-sub">Read-only usage overview · Fornetto</p>
        </div>
        <div className="admin-range" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={r === days ? "is-active" : ""}
              onClick={() => onRange(r)}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ① KPI strip */}
      <div className="admin-kpis">
        <Kpi label="Users" value={totals.users ?? users.length} sub={`+${newInRange} in ${RANGE_LABEL[days]}`} />
        <Kpi label="Active" value={totals.activeUsers7d} sub={`${totals.activeUsers30d ?? "—"} in 30d`} />
        <Kpi
          label="Premium"
          value={totals.premiumHouseholds}
          sub={`${totals.paidHouseholds ?? 0} paid · ${totals.compedHouseholds ?? 0} comp`}
        />
        <Kpi label={`AI actions · ${RANGE_LABEL[days]}`} value={aiInRange} sub={aiSubtitle(series.aiCalls)} />
        <Kpi
          label={`AI cost · ${RANGE_LABEL[days]}`}
          text={fmtPence(totals.aiCost?.pence)}
          sub={totals.aiCost?.usd != null ? `$${totals.aiCost.usd.toFixed(3)} billed` : undefined}
        />
        <Kpi label="Recipes" value={totals.recipes} />
        <Kpi label="Shares" value={totals.shares} />
      </div>

      {/* Premium grants (comp friends & family) */}
      <PremiumGrantsSection />

      {/* ② Per-user drill-down */}
      <UsersSection users={users} />

      {/* ③ Engagement & active users */}
      <EngagementSection totals={totals} series={series} days={days} />

      {/* ④ AI usage & cost */}
      <AiSection series={series} users={users} days={days} stats={aiStats} />

      {/* ④b Credits, trial funnel, config */}
      <CreditsSection stats={creditStats} days={days} />
      <ConfigSection />

      {/* ⑤ Growth & adoption (secondary) */}
      <GrowthSection totals={totals} />
    </div>
  );
}

function Kpi({ label, value, text, sub }: { label: string; value?: number | null; text?: string; sub?: string }) {
  return (
    <div className="admin-kpi">
      <span className="admin-kpi-label">{label}</span>
      <span className="admin-kpi-value">{text ?? value ?? "—"}</span>
      {sub && <span className="admin-kpi-sub">{sub}</span>}
    </div>
  );
}

function aiSubtitle(points?: AdminSeriesPoint[]): string {
  if (!points) return "";
  const parts = AI_ACTIONS.map((a) => `${AI_LABEL[a][0]} ${sum(points, [a])}`);
  return parts.join(" · ");
}

// ── Premium grants ───────────────────────────────────────────────────────────

type Comp = { id: string; emails: string[]; created_at: string | null };

function adminErrMsg(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    try {
      return (JSON.parse(err.body)?.error as string) || fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function PremiumGrantsSection() {
  const [comps, setComps] = useState<Comp[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function load() {
    apiFetch<{ comps: Comp[] }>("/admin/premium/comps")
      .then((d) => setComps(d.comps ?? []))
      .catch(() => setComps([]));
  }
  // Load once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  async function grant(e: FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await apiFetch("/admin/premium/grant", {
        method: "POST",
        body: JSON.stringify({ email: addr }),
      });
      setNote({ kind: "ok", text: `${addr} is now Premium.` });
      setEmail("");
      load();
    } catch (err) {
      setNote({ kind: "err", text: adminErrMsg(err, "Couldn’t grant Premium.") });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(addr: string) {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await apiFetch("/admin/premium/revoke", {
        method: "POST",
        body: JSON.stringify({ email: addr }),
      });
      setNote({ kind: "ok", text: `${addr} reverted to free.` });
      load();
    } catch (err) {
      setNote({ kind: "err", text: adminErrMsg(err, "Couldn’t revoke.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-section">
      <h2>Premium grants</h2>
      <p className="admin-section-note">
        Comp a household to Premium (unlimited AI, no charge, no expiry) by a member’s email. Revoke
        drops it back to free. Paid subscribers aren’t listed here — manage those in Stripe.
      </p>
      <form className="admin-controls" onSubmit={grant}>
        <input
          className="input admin-search"
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-ai" disabled={busy || !email.trim()}>
          Grant Premium
        </button>
      </form>
      {note && (
        <p className={note.kind === "err" ? "admin-note-err" : "admin-note-ok"} role="status">
          {note.text}
        </p>
      )}
      {comps == null ? null : comps.length === 0 ? (
        <p className="admin-empty" style={{ marginTop: 12 }}>
          No comped households yet.
        </p>
      ) : (
        <div className="admin-rows" style={{ marginTop: 12 }}>
          {comps.map((c) => (
            <div key={c.id} className="admin-grant-row">
              <span className="admin-row-label">{c.emails.join(", ") || "(no members)"}</span>
              <button
                type="button"
                className="btn btn-ghost admin-revoke"
                onClick={() => revoke(c.emails[0] ?? "")}
                disabled={busy || c.emails.length === 0}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── ② Users ─────────────────────────────────────────────────────────────────

function UsersSection({ users }: { users: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = users.filter((u) => {
      if (needle) {
        const hay = `${u.name ?? ""} ${u.email}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      const since = daysSince(u.last_active);
      switch (segment) {
        case "active":
          return since != null && since <= 30;
        case "inactive":
          return since == null || since > 30;
        case "unverified":
          return !u.email_verified;
        case "recipes":
          return (u.recipe_count ?? 0) > 0;
        case "premium":
          return u.plan === "premium";
        default:
          return true;
      }
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => dir * cmp(a, b, sortKey));
    return list;
  }, [users, q, segment, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "household" ? "asc" : "desc");
    }
  }

  const cols: { key: SortKey; label: string; num?: boolean }[] = [
    { key: "name", label: "User" },
    { key: "joined", label: "Joined" },
    { key: "active", label: "Last active" },
    { key: "recipes", label: "Recipes", num: true },
    { key: "ai", label: "AI", num: true },
    { key: "plan", label: "Plan" },
    { key: "household", label: "Household" },
  ];

  return (
    <section className="admin-section">
      <h2>Users</h2>
      <div className="admin-controls">
        <input
          className="input admin-search"
          type="search"
          placeholder="Search name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="admin-segments">
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`admin-seg ${segment === s.key ? "is-active" : ""}`}
              onClick={() => setSegment(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="admin-empty">No users match.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="admin-table-wrap admin-only-wide">
            <table className="admin-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={`${c.num ? "admin-td-num" : ""} ${sortKey === c.key ? "is-sorted" : ""}`}
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label}
                      {sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div>{u.name || "—"}</div>
                      <div className="admin-user-email">{u.email}</div>
                    </td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>
                      {relative(u.last_active)}
                      {!u.email_verified && <span className="admin-pill" style={{ marginLeft: 6 }}>unverified</span>}
                    </td>
                    <td className="admin-td-num">{u.recipe_count ?? 0}</td>
                    <td className="admin-td-num">{u.ai_usage?.total ?? 0}</td>
                    <td>
                      {planLabel(u).premium ? (
                        <span className="admin-pill is-premium">{planLabel(u).text}</span>
                      ) : (
                        <span className="admin-muted">Free</span>
                      )}
                    </td>
                    <td>
                      {u.household_name || "—"}
                      {(u.household_member_count ?? 1) > 1 && (
                        <span className="admin-pill is-ok" style={{ marginLeft: 6 }}>
                          {u.household_member_count}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="admin-user-cards admin-only-narrow">
            {rows.map((u) => (
              <div key={u.id} className="admin-user-card">
                <div className="admin-user-card-head">
                  <span className="admin-user-card-name">{u.name || u.email}</span>
                  {planLabel(u).premium && (
                    <span className="admin-pill is-premium">{planLabel(u).text}</span>
                  )}
                  <span className="admin-pill">{relative(u.last_active)}</span>
                </div>
                <div className="admin-user-email">{u.email}</div>
                <div className="admin-user-card-stats">
                  <span>Joined <b>{fmtDate(u.created_at)}</b></span>
                  <span>Recipes <b>{u.recipe_count ?? 0}</b></span>
                  <span>AI <b>{u.ai_usage?.total ?? 0}</b></span>
                  <span>{u.household_name || "—"}</span>
                  {!u.email_verified && <span className="admin-pill">unverified</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function cmp(a: AdminUserRow, b: AdminUserRow, key: SortKey): number {
  switch (key) {
    case "name":
      return (a.name || a.email).localeCompare(b.name || b.email);
    case "household":
      return (a.household_name || "").localeCompare(b.household_name || "");
    case "joined":
      return time(a.created_at) - time(b.created_at);
    case "active":
      return time(a.last_active) - time(b.last_active);
    case "recipes":
      return (a.recipe_count ?? 0) - (b.recipe_count ?? 0);
    case "ai":
      return (a.ai_usage?.total ?? 0) - (b.ai_usage?.total ?? 0);
    case "plan": {
      // free < comped premium < paid premium
      const rank = (u: AdminUserRow) => (u.plan === "premium" ? (u.paid ? 2 : 1) : 0);
      return rank(a) - rank(b);
    }
    default:
      return 0;
  }
}
function time(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// ── ③ Engagement ─────────────────────────────────────────────────────────────

function EngagementSection({
  totals,
  series,
  days,
}: {
  totals: NonNullable<AdminOverview["totals"]>;
  series: NonNullable<AdminOverview["series"]>;
  days: Range;
}) {
  return (
    <section className="admin-section">
      <h2>Engagement</h2>
      <div className="admin-stat-grid" style={{ marginBottom: 16 }}>
        <Stat label="Active this week" value={totals.activeUsers7d} />
        <Stat label="Active 30 days" value={totals.activeUsers30d} />
      </div>
      <div className="admin-charts admin-charts-2">
        <Chart title={`Active users · ${RANGE_LABEL[days]}`} points={series.activeUsers} />
        <Chart title={`Signups · ${RANGE_LABEL[days]}`} points={series.signups} />
      </div>

      <p className="admin-chart-title" style={{ marginTop: 16 }}>
        Retention · signups in {RANGE_LABEL[days]}
        {totals.retention?.cohort != null && ` · cohort ${totals.retention.cohort}`}
      </p>
      <p className="admin-section-note">
        Came back on exactly day 1 / 7 / 30 after signing up (classic), and at any point in the
        first 7 / 30 days (rolling). Only users whose day N has already passed count. Collection
        started with the ledger update, so early cohorts are small.
      </p>
      <div className="admin-stat-grid">
        <Stat label="Day 1" text={retentionText(totals.retention?.d1)} />
        <Stat label="Day 7" text={retentionText(totals.retention?.d7)} />
        <Stat label="Day 30" text={retentionText(totals.retention?.d30)} />
        <Stat label="Within 7 days" text={pct(totals.retention?.d7?.rolling)} />
        <Stat label="Within 30 days" text={pct(totals.retention?.d30?.rolling)} />
      </div>

      {(totals.householdSizes?.length ?? 0) > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Household size</p>
          <Breakdown
            items={(totals.householdSizes ?? []).map((h) => ({
              label: `${h.size} member${h.size === 1 ? "" : "s"}`,
              value: h.households,
            }))}
          />
        </>
      )}

      {totals.deviceSplit && Object.keys(totals.deviceSplit).length > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Devices</p>
          <Breakdown items={toItems(totals.deviceSplit)} />
        </>
      )}
    </section>
  );
}

function retentionText(p?: AdminRetentionPoint | null): string {
  if (!p || !p.eligible) return "—";
  return `${pct(p.rate)} · ${p.retained ?? 0}/${p.eligible}`;
}

/** The stale-layout alarm: phones on an iOS newer than the Add to Home Screen
    walkthrough has been verified on. Clears itself once a frontend build with a
    higher MAX_VERIFIED_IOS (src/lib/ios-layouts.ts) has been seen. */
function StaleLayoutNotice({ install }: { install: NonNullable<AdminTotals["install"]> }) {
  const verified = install.maxVerifiedIos ?? MAX_VERIFIED_IOS;
  const newer = (install.unverifiedIos ?? []).filter((r) => r.major > Math.max(verified, MAX_VERIFIED_IOS));
  if (newer.length === 0) return null;
  return (
    <div className="admin-notice" role="alert">
      <strong>Check the Add to Home Screen walkthrough.</strong>{" "}
      {newer.map((r) => (
        <span key={r.major}>
          iOS {r.major} seen on {r.devices} device{r.devices === 1 ? "" : "s"} since{" "}
          {new Date(r.firstSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.{" "}
        </span>
      ))}
      The walkthrough is verified up to iOS {Math.max(verified, MAX_VERIFIED_IOS)} — those users get the
      generic wording. Open Fornetto on the new iOS in Safari and Chrome, check where Share / ••• /
      Add to Home Screen are, then update <code>src/lib/ios-layouts.ts</code>.
    </div>
  );
}

function Stat({ label, value, text }: { label: string; value?: number | null; text?: string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{text ?? value ?? "—"}</div>
    </div>
  );
}

// ── ④ AI usage ───────────────────────────────────────────────────────────────

function AiSection({
  series,
  users,
  days,
  stats,
}: {
  series: NonNullable<AdminOverview["series"]>;
  users: AdminUserRow[];
  days: Range;
  stats: AdminAiStats | null;
}) {
  const topAi = useMemo(
    () =>
      [...users]
        .filter((u) => (u.ai_usage?.total ?? 0) > 0)
        .sort((a, b) => (b.ai_usage?.total ?? 0) - (a.ai_usage?.total ?? 0))
        .slice(0, 6)
        .map((u) => ({ label: u.household_name || u.name || u.email, value: u.ai_usage?.total ?? 0 })),
    [users],
  );

  const t = stats?.totals;
  const byAction = stats?.byAction ?? [];
  const byModel = stats?.byModel ?? [];
  const topCost = (stats?.topHouseholds ?? []).filter((h) => h.costPence > 0).slice(0, 8);
  const outcomes = stats?.outcomes ?? [];
  const label = (a: string) => AI_LABEL[a as AiAction] ?? cap(a);

  return (
    <section className="admin-section">
      <h2>AI usage &amp; cost</h2>
      <p className="admin-section-note">
        Every AI action is a row in the ledger: what it cost (list price × tokens, in pence at the
        rate in force that day), how long it took, and whether it was charged, refunded (the model
        answered but there was nothing to give back), failed (no answer) or rejected (allowance
        said no). Free households share <strong>15 AI actions per week</strong>; Premium is
        unlimited. Per-action 6-hour burst ceilings still apply to everyone.
      </p>

      <div className="admin-stat-grid" style={{ marginBottom: 16 }}>
        <Stat label={`Cost · ${RANGE_LABEL[days]}`} text={fmtPence(t?.costPence)} />
        <Stat label="Model calls" value={t?.modelCalls} />
        <Stat label="Charged actions" value={t?.credits} />
        <Stat label="Refunded" value={t?.refunded} />
        <Stat label="Failed" value={t?.failed} />
        <Stat label="Hit the limit" value={t?.rejected} />
      </div>

      <Chart title={`Actions by type · ${RANGE_LABEL[days]}`} points={series.aiCalls} stacked={AI_ACTIONS} />
      <div className="admin-legend">
        {AI_ACTIONS.map((a) => (
          <span key={a}>
            <i className={`admin-bar-seg--${a}`} />
            {AI_LABEL[a]}
          </span>
        ))}
      </div>

      {byAction.length > 0 ? (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>By action · {RANGE_LABEL[days]}</p>
          <div className="admin-table-wrap">
            <table className="admin-table admin-table-compact">
              <thead>
                <tr>
                  <th>Action</th>
                  <th className="admin-td-num">Actions</th>
                  <th className="admin-td-num">Calls</th>
                  <th className="admin-td-num">Cost</th>
                  <th className="admin-td-num">Per action</th>
                  <th className="admin-td-num">Tokens in / out</th>
                  <th className="admin-td-num">p50</th>
                  <th className="admin-td-num">p95</th>
                  <th className="admin-td-num">Refund</th>
                  <th className="admin-td-num">Fail</th>
                  <th className="admin-td-num">Limit</th>
                </tr>
              </thead>
              <tbody>
                {byAction.map((r) => (
                  <tr key={r.action}>
                    <td>
                      <i className={`admin-swatch admin-bar-seg--${r.action}`} />
                      {label(r.action)}
                    </td>
                    <td className="admin-td-num">{r.actions}</td>
                    <td className="admin-td-num">{r.modelCalls}</td>
                    <td className="admin-td-num">{fmtPence(r.costPence)}</td>
                    <td className="admin-td-num">{r.actions ? fmtPence(r.costPence / r.actions) : "—"}</td>
                    <td className="admin-td-num">
                      {fmtTokens(r.inputTokens)} / {fmtTokens(r.outputTokens)}
                    </td>
                    <td className="admin-td-num">{fmtMs(r.p50Ms)}</td>
                    <td className="admin-td-num">{fmtMs(r.p95Ms)}</td>
                    <td className="admin-td-num">{r.refunded}</td>
                    <td className="admin-td-num">{r.failed}</td>
                    <td className="admin-td-num">{r.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(stats?.legacyRows ?? 0) > 0 && (
            <p className="admin-section-note" style={{ marginTop: 8 }}>
              {stats?.legacyRows} older action{stats?.legacyRows === 1 ? "" : "s"} in this range
              predate the ledger and carry no tokens, cost or latency; they are counted in the
              chart above but left out of this table.
            </p>
          )}
        </>
      ) : (
        <p className="admin-empty" style={{ padding: "16px 4px" }}>
          No AI actions in this range yet.
        </p>
      )}

      {byModel.length > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Cost by model</p>
          <Breakdown
            items={byModel.map((m) => ({ label: `${m.model} · ${m.modelCalls} calls`, value: m.costPence }))}
            format={fmtPence}
          />
        </>
      )}

      {outcomes.length > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Refunded outcomes</p>
          <Breakdown
            items={outcomes.map((o) => ({ label: `${label(o.action)} · ${o.outcome.replace(/_/g, " ")}`, value: o.count }))}
          />
        </>
      )}

      {topCost.length > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Top households by cost · {RANGE_LABEL[days]}</p>
          <Breakdown
            items={topCost.map((h) => ({
              label: `${h.name || h.emails || h.id}${h.plan === "premium" ? " · Premium" : ""}`,
              value: h.costPence,
            }))}
            format={fmtPence}
          />
        </>
      )}

      {topAi.length > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Top households by AI actions · all time</p>
          <Breakdown items={topAi} />
        </>
      )}
    </section>
  );
}

// ── ⑤ Growth & adoption (secondary) ──────────────────────────────────────────

function GrowthSection({ totals }: { totals: NonNullable<AdminOverview["totals"]> }) {
  const verified = totals.verifiedUsers ?? 0;
  const allUsers = totals.users ?? 0;
  const macros = totals.macrosSource ? toItems(totals.macrosSource) : [];
  const tags = (totals.topTags ?? []).map((t) => ({ label: t.name, value: t.count }));

  const hasInvite =
    totals.invitesSent != null || totals.invitesAccepted != null || totals.invitesPending != null;
  // Forward-only: absent until the questionnaire has been shown to someone.
  const ob = totals.onboarding;

  return (
    <section className="admin-section">
      <h2>Growth &amp; adoption</h2>
      <div className="admin-stat-grid">
        <Stat label="Verified users" value={verified} />
        <Stat
          label="Verification rate"
          value={allUsers > 0 ? Math.round((verified / allUsers) * 100) : undefined}
        />
        <Stat label="Households" value={totals.households} />
        <Stat label="Shared households" value={totals.multiMemberHouseholds} />
      </div>

      {(totals.premiumHouseholds ?? 0) > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Premium households</p>
          <Breakdown
            items={[
              { label: "Paid", value: totals.paidHouseholds ?? 0 },
              { label: "Comped", value: totals.compedHouseholds ?? 0 },
            ]}
          />
        </>
      )}

      {ob && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Onboarding funnel</p>
          <Breakdown
            items={[
              { label: "Shown", value: ob.shown ?? 0 },
              { label: "Started", value: ob.started ?? 0 },
              { label: "Completed", value: ob.completed ?? 0 },
              { label: "Skipped", value: ob.skipped ?? 0 },
              { label: "To AI", value: ob.aiHandoff ?? 0 },
              { label: "Recipes seeded", value: ob.recipesSeeded ?? 0 },
            ]}
          />
        </>
      )}

      {/* Forward-only, like the funnel above: absent until someone has run it.
          Watch title-only against dishes — if it climbs, the prompt is failing
          on real UK shorthand. */}
      {(ob?.usualsRuns ?? 0) > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>My usuals</p>
          <Breakdown
            items={[
              { label: "Typed", value: ob?.usualsTyped ?? 0 },
              { label: "Runs", value: ob?.usualsRuns ?? 0 },
              { label: "Dishes", value: ob?.usualsDishes ?? 0 },
              { label: "Written", value: ob?.usualsWritten ?? 0 },
              { label: "Title only", value: ob?.usualsTitleOnly ?? 0 },
            ]}
          />
        </>
      )}

      {totals.install && <StaleLayoutNotice install={totals.install} />}

      {totals.install && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Install funnel</p>
          <Breakdown
            items={[
              { label: "Sheet shown", value: totals.install.shown ?? 0 },
              { label: "Native accepted", value: totals.install.nativeAccepted ?? 0 },
              { label: "To guide", value: totals.install.guide ?? 0 },
              { label: "Later", value: totals.install.later ?? 0 },
              { label: "Never", value: totals.install.never ?? 0 },
              { label: "Pointed at it", value: totals.install.coach ?? 0 },
              { label: "Guide views", value: totals.install.pageViews ?? 0 },
              { label: "Emails sent", value: totals.install.emailsSent ?? 0 },
              { label: "Using installed app", value: totals.install.standaloneUsers ?? 0 },
            ]}
          />
        </>
      )}

      {hasInvite && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Invites</p>
          <Breakdown
            items={[
              { label: "Sent", value: totals.invitesSent ?? 0 },
              { label: "Accepted", value: totals.invitesAccepted ?? 0 },
              { label: "Pending", value: totals.invitesPending ?? 0 },
            ]}
          />
        </>
      )}

      {macros.length > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Nutrition source</p>
          <Breakdown items={macros} />
        </>
      )}

      {tags.length > 0 && (
        <>
          <p className="admin-chart-title" style={{ marginTop: 16 }}>Top tags</p>
          <Breakdown items={tags} />
        </>
      )}
    </section>
  );
}

// ── Chart primitives (hand-rolled, no dependency) ────────────────────────────

function Chart({
  title,
  points,
  stacked,
}: {
  title: string;
  points?: AdminSeriesPoint[];
  stacked?: readonly AiAction[];
}) {
  if (!points || points.length === 0) {
    return (
      <div>
        <p className="admin-chart-title">{title}</p>
        <p className="admin-empty" style={{ padding: "24px 4px" }}>
          No data yet — collection starts after the tracking update ships.
        </p>
      </div>
    );
  }

  const totalsPer = points.map((p) =>
    stacked ? stacked.reduce((s, k) => s + (p.values?.[k] ?? 0), 0) : p.count ?? 0,
  );
  const max = Math.max(1, ...totalsPer);

  return (
    <div>
      <p className="admin-chart-title">{title}</p>
      <div className="admin-bars">
        {points.map((p, i) => {
          const t = totalsPer[i];
          const label = `${fmtShort(p.date)}: ${t}`;
          if (t <= 0) {
            return (
              <div key={i} className="admin-bar" title={label}>
                <div className="admin-bar-empty" />
              </div>
            );
          }
          return (
            <div key={i} className="admin-bar" title={label}>
              {stacked ? (
                stacked.map((k) => {
                  const v = p.values?.[k] ?? 0;
                  if (!v) return null;
                  return (
                    <div
                      key={k}
                      className={`admin-bar-seg admin-bar-seg--${k}`}
                      style={{ height: `${(v / max) * 100}%` }}
                    />
                  );
                })
              ) : (
                <div
                  className="admin-bar-seg admin-bar-seg--solid"
                  style={{ height: `${(t / max) * 100}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="admin-chart-foot">
        <span>{fmtShort(points[0]?.date)}</span>
        <span>{fmtShort(points[points.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function Breakdown({
  items,
  format,
}: {
  items: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="admin-rows">
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`} className="admin-row">
          <span className="admin-row-label">{it.label}</span>
          <div className="admin-row-track">
            <div className="admin-row-fill" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="admin-row-value">{format ? format(it.value) : it.value}</span>
        </div>
      ))}
    </div>
  );
}

function toItems(rec: Record<string, number>): { label: string; value: number }[] {
  return Object.entries(rec)
    .map(([label, value]) => ({ label: cap(label), value }))
    .sort((a, b) => b.value - a.value);
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── ④b Credits & trial ───────────────────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = { free: "Free", trial: "Trial", premium: "Premium" };

function CreditsSection({ stats, days }: { stats: AdminCreditStats | null; days: Range }) {
  const plans = stats?.byPlan ? Object.entries(stats.byPlan) : [];
  const t = stats?.trial;
  return (
    <section className="admin-section">
      <h2>Credits &amp; trial</h2>
      <p className="admin-section-note">
        Each household&rsquo;s credit period runs from its signup anniversary. &ldquo;At ceiling&rdquo;
        means used ≥ allowance this period; the percentiles are credits used per household, all
        households (and only those that used any).
      </p>

      {plans.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table-compact">
            <thead>
              <tr>
                <th>Plan</th>
                <th className="admin-td-num">Households</th>
                <th className="admin-td-num">Used any</th>
                <th className="admin-td-num">At ceiling</th>
                <th className="admin-td-num">≥ 80%</th>
                <th className="admin-td-num">Avg</th>
                <th className="admin-td-num">p50</th>
                <th className="admin-td-num">p75</th>
                <th className="admin-td-num">p90</th>
                <th className="admin-td-num">p95</th>
                <th className="admin-td-num">Max</th>
                <th className="admin-td-num">p50 / p90 (active)</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(([plan, r]) => (
                <tr key={plan}>
                  <td>{PLAN_LABEL[plan] ?? cap(plan)}</td>
                  <td className="admin-td-num">{r.households}</td>
                  <td className="admin-td-num">{r.active}</td>
                  <td className="admin-td-num">
                    {r.atCeiling}
                    {r.households > 0 && ` (${Math.round((r.atCeiling / r.households) * 100)}%)`}
                  </td>
                  <td className="admin-td-num">{r.nearCeiling}</td>
                  <td className="admin-td-num">{r.avgUsed}</td>
                  <td className="admin-td-num">{r.p50}</td>
                  <td className="admin-td-num">{r.p75}</td>
                  <td className="admin-td-num">{r.p90}</td>
                  <td className="admin-td-num">{r.p95}</td>
                  <td className="admin-td-num">{r.max}</td>
                  <td className="admin-td-num">
                    {r.p50Active} / {r.p90Active}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-empty" style={{ padding: "16px 4px" }}>
          No credit data yet.
        </p>
      )}

      <p className="admin-chart-title" style={{ marginTop: 16 }}>Trial funnel</p>
      <div className="admin-stat-grid">
        <Stat label="On trial now" value={t?.active} />
        <Stat label="Ending within 4 days" value={t?.endingSoon} />
        <Stat label="Expired → free" value={t?.expiredFree} />
        <Stat label="Paying (had a trial)" value={t?.paying} />
        <Stat label={`Trials started · ${RANGE_LABEL[days]}`} value={t?.startedInRange} />
        <Stat label={`Converted · ${RANGE_LABEL[days]}`} value={t?.convertedInRange} />
        <Stat label={`Prompt emails · ${RANGE_LABEL[days]}`} value={t?.emailsInRange} />
        <Stat label={`Prompt cards · ${RANGE_LABEL[days]}`} value={t?.cardsInRange} />
        <Stat label={`Refused for credits · ${RANGE_LABEL[days]}`} value={stats?.rejections?.count} />
        <Stat label="Households refused" value={stats?.rejections?.households} />
      </div>
    </section>
  );
}

// ── ④c Config ───────────────────────────────────────────────────────────────
// The app_config knobs. Saving writes one key; the backend validates and logs
// it. Applies to households created from now on — nobody existing changes.

const CONFIG_FIELDS: {
  key: keyof AdminConfig["config"];
  label: string;
  help: string;
  kind: "int" | "int-or-null" | "json" | "string-or-null";
}[] = [
  { key: "trial_days", label: "Trial length (days)", help: "Full Premium from signup, no card. New signups only.", kind: "int" },
  { key: "free_credit_allowance", label: "Free credits / month", help: "Per household, on the signup anniversary. Blank = unlimited.", kind: "int-or-null" },
  { key: "premium_credit_allowance", label: "Premium & trial credits / month", help: "Soft cap. Blank = unlimited (what a comp gets).", kind: "int-or-null" },
  { key: "credit_weights", label: "Credits per action", help: "JSON, action → credits. 0 = free (the shopping list must stay 0).", kind: "json" },
  { key: "member_limit_free", label: "Free household size", help: "Members a free household can have. Existing households keep theirs.", kind: "int" },
  { key: "founders_coupon", label: "Founders’ coupon id", help: "Stripe coupon applied to annual checkouts while it has redemptions left. Blank = off.", kind: "string-or-null" },
  { key: "founders_cap", label: "Founders’ cap", help: "For display only — Stripe enforces max_redemptions.", kind: "int" },
];

function ConfigSection() {
  const [data, setData] = useState<AdminConfig | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function load() {
    apiFetch<AdminConfig>("/admin/config")
      .then((d) => {
        setData(d);
        const next: Record<string, string> = {};
        for (const f of CONFIG_FIELDS) {
          const v = d.config[f.key];
          next[f.key] = v == null ? "" : f.kind === "json" ? JSON.stringify(v) : String(v);
        }
        setDrafts(next);
      })
      .catch(() => setData(null));
  }
  // Load once on mount.
  useEffect(load, []);

  async function save(f: (typeof CONFIG_FIELDS)[number]) {
    const raw = (drafts[f.key] ?? "").trim();
    let value: unknown;
    try {
      if (f.kind === "int") value = Number.parseInt(raw, 10);
      else if (f.kind === "int-or-null") value = raw === "" ? null : Number.parseInt(raw, 10);
      else if (f.kind === "string-or-null") value = raw === "" ? null : raw;
      else value = JSON.parse(raw);
      if ((f.kind === "int" || (f.kind === "int-or-null" && raw !== "")) && !Number.isInteger(value)) {
        throw new Error("not a whole number");
      }
    } catch {
      setNote({ kind: "err", text: `${f.label}: that isn’t valid.` });
      return;
    }
    setBusy(f.key);
    setNote(null);
    try {
      const d = await apiFetch<AdminConfig>("/admin/config", {
        method: "PUT",
        body: JSON.stringify({ key: f.key, value }),
      });
      setData((prev) => ({ ...(prev ?? {}), ...d }));
      setNote({ kind: "ok", text: `${f.label} saved — applies to new households.` });
    } catch (e) {
      let text = `Couldn’t save ${f.label}.`;
      if (e instanceof ApiError) {
        try {
          text = JSON.parse(e.body)?.error ?? text;
        } catch {
          // keep default
        }
      }
      setNote({ kind: "err", text });
    } finally {
      setBusy(null);
    }
  }

  if (!data) return null;

  return (
    <section className="admin-section">
      <h2>Plan settings</h2>
      <p className="admin-section-note">
        Changes here apply to households created from now on. Every existing household keeps the
        allowances, weights and member limit it was created with, so early users are never moved.
      </p>
      <div className="admin-config">
        {CONFIG_FIELDS.map((f) => {
          const m = data.meta?.[f.key];
          return (
            <div key={f.key} className="admin-config-row">
              <label htmlFor={`cfg-${f.key}`} className="admin-config-label">
                {f.label}
                <span className="admin-config-help">{f.help}</span>
              </label>
              <input
                id={`cfg-${f.key}`}
                className="input admin-config-input"
                value={drafts[f.key] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
                spellCheck={false}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => save(f)}
                disabled={busy === f.key}
              >
                {busy === f.key ? "Saving…" : "Save"}
              </button>
              {m?.updatedAt && (
                <span className="admin-config-meta">
                  {fmtDate(m.updatedAt)}
                  {m.updatedBy ? ` · ${m.updatedBy}` : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {note && (
        <p className={note.kind === "ok" ? "admin-note-ok" : "admin-note-err"} role="status">
          {note.text}
        </p>
      )}
    </section>
  );
}
