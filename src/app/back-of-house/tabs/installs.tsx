"use client";

import type { AdminInstalls } from "@/lib/types";
import { Breakdown, Empty, Section, Stat, SubTitle } from "../components/primitives";
import { DataTable, type Column } from "../components/data-table";
import { fmtDate, relative } from "../lib/format";
import { PLATFORM_LABEL, RANGE_LABEL, type Range } from "../lib/constants";
import { useAdminData } from "../lib/use-admin-data";

// Who has put Fornetto on a home screen, and how they use it compared with
// people in a browser tab. "Installed" = has launched from the home screen at
// least once (iOS gives no other signal); the per-day split comes from the
// X-Fornetto-Client header every request carries.

const pctOf = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const platform = (p: string | null | undefined) => PLATFORM_LABEL[p ?? "unknown"] ?? (p ?? "Unknown");

type Group = AdminInstalls["compare"]["installed"];
type CompareRow = { key: string; label: string; installed: string; browser: string; note?: string };

function compareRows(a: Group, b: Group): CompareRow[] {
  const ret = (g: Group, k: "d7" | "d30") => (g[k].cohort > 0 ? `${pctOf(g[k].retained, g[k].cohort)} of ${g[k].cohort}` : "—");
  const per = (v: number) => v.toFixed(1);
  return [
    { key: "users", label: "People", installed: String(a.users), browser: String(b.users) },
    { key: "active", label: "Active in the window", installed: `${a.active} (${pctOf(a.active, a.users)})`, browser: `${b.active} (${pctOf(b.active, b.users)})` },
    { key: "days", label: "Active days per active person", installed: per(a.avgActiveDays), browser: per(b.avgActiveDays) },
    { key: "recipes", label: "Recipes added per active person", installed: per(a.avgRecipes), browser: per(b.avgRecipes) },
    { key: "week", label: "Put on the week per active person", installed: per(a.avgWeekAdds), browser: per(b.avgWeekAdds) },
    { key: "lists", label: "Lists generated per active person", installed: per(a.avgLists), browser: per(b.avgLists) },
    { key: "shops", label: "Shops finished per active person", installed: per(a.avgShops), browser: per(b.avgShops) },
    { key: "shopped", label: "Finished at least one shop", installed: pctOf(a.shopped, a.users), browser: pctOf(b.shopped, b.users) },
    { key: "paying", label: "Paying for Premium", installed: pctOf(a.paying, a.users), browser: pctOf(b.paying, b.users) },
    { key: "d7", label: "Still active after 7 days", installed: ret(a, "d7"), browser: ret(b, "d7"), note: "all time" },
    { key: "d30", label: "Still active after 30 days", installed: ret(a, "d30"), browser: ret(b, "d30"), note: "all time" },
  ];
}

const COMPARE_COLUMNS: Column<CompareRow>[] = [
  { key: "label", label: "", mobile: "title", render: (r) => <>{r.label}{r.note && <span className="admin-muted"> · {r.note}</span>}</> },
  { key: "installed", label: "Installed", numeric: true, render: (r) => r.installed },
  { key: "browser", label: "Browser", numeric: true, render: (r) => r.browser },
];

const COHORT_COLUMNS: Column<AdminInstalls["cohorts"][number]>[] = [
  { key: "month", label: "Signed up", mobile: "title", render: (r) => r.month },
  { key: "signups", label: "Signups", numeric: true, render: (r) => r.signups },
  { key: "installed", label: "Installed", numeric: true, render: (r) => `${r.installed} (${pctOf(r.installed, r.signups)})` },
  { key: "installed_1d", label: "Same day", numeric: true, render: (r) => pctOf(r.installed_1d, r.signups) },
  { key: "installed_7d", label: "Within a week", numeric: true, render: (r) => pctOf(r.installed_7d, r.signups) },
];

const WEEKLY_COLUMNS: Column<AdminInstalls["weekly"][number]>[] = [
  { key: "week", label: "Week of", mobile: "title", render: (r) => fmtDate(r.week) },
  { key: "active", label: "Active", numeric: true, render: (r) => r.active },
  { key: "inApp", label: "From the home screen", numeric: true, render: (r) => `${r.inApp} (${pctOf(r.inApp, r.active)})` },
  { key: "browserOnly", label: "Browser only", numeric: true, render: (r) => r.browserOnly },
];

const RECENT_COLUMNS: Column<AdminInstalls["recent"][number]>[] = [
  { key: "who", label: "Who", mobile: "title", render: (r) => <>{r.name || r.email}<span className="admin-user-email"> {r.name ? r.email : ""}</span></> },
  { key: "platform", label: "Platform", mobile: "pill", render: (r) => <span className="admin-pill">{platform(r.installed_platform)}</span> },
  { key: "installed_at", label: "Installed", render: (r) => fmtDate(r.installed_at) },
  { key: "after", label: "After signup", numeric: true, render: (r) => `${Math.max(0, Math.round((new Date(r.installed_at).getTime() - new Date(r.created_at).getTime()) / 86_400_000))}d` },
  { key: "last", label: "Last used the app", render: (r) => relative(r.last_standalone_at) },
  { key: "share", label: "In the app · 30d", numeric: true, render: (r) => `${r.standalone_days_30} of ${r.active_days_30} days` },
];

export function InstallsTab({ days }: { days: Range }) {
  const { data, loading } = useAdminData<AdminInstalls>(`/admin/installs?days=${days}`, [days]);
  if (loading) return <Empty>Loading…</Empty>;
  if (!data) return <Empty>No install data yet — it starts with the first request from a home-screen launch.</Empty>;
  const t = data.totals;

  return (
    <>
      <Section
        title={`Installed app · ${RANGE_LABEL[days]}`}
        note="Someone counts as installed once they have opened Fornetto from a home screen. Every request says whether it came from the installed app or a browser tab, so the day-level numbers are exact from the tracking update onwards; earlier history is rebuilt from the launch events."
      >
        <div className="admin-stat-grid">
          <Stat label="Installed" text={`${t.installedUsers} of ${t.users} people (${pctOf(t.installedUsers, t.users)})`} />
          <Stat label="New installs" value={t.installedInWindow} />
          <Stat label="Signups in the window who installed" text={`${pctOf(t.signupsInstalled, t.signupsInWindow)} (${t.signupsInstalled} of ${t.signupsInWindow})`} />
          <Stat label="Median time from signup to install" text={t.medianDaysToInstall == null ? "—" : `${t.medianDaysToInstall} days`} />
          <Stat label="Active people using the installed app" text={`${t.standaloneActive} of ${t.activeUsers} (${pctOf(t.standaloneActive, t.activeUsers)})`} />
          <Stat label="Active days spent in the installed app" text={`${pctOf(t.standaloneDays, t.activeDays)} (${t.standaloneDays} of ${t.activeDays})`} />
          <Stat label="Use both app and browser" value={t.mixed} />
        </div>
        <SubTitle>Platform</SubTitle>
        {data.platforms.length === 0 ? <Empty>Nobody has installed yet.</Empty> : (
          <Breakdown items={data.platforms.map((p) => ({ label: platform(p.platform), value: p.n }))} />
        )}
      </Section>

      <Section
        title="Installed vs browser"
        note="How the two groups behave over the window. People who installed are self-selected — they came back at least once — so read this as a comparison, not as the effect of installing."
      >
        <DataTable columns={COMPARE_COLUMNS} rows={compareRows(data.compare.installed, data.compare.browser)} rowKey={(r) => r.key} compact />
      </Section>

      <Section title="Install rate by signup month" note="Of the people who signed up each month, how many have installed, and how quickly.">
        <DataTable columns={COHORT_COLUMNS} rows={data.cohorts} rowKey={(r) => r.month} compact empty="No signups in the last 12 months." />
      </Section>

      <Section title="Week by week" note="Active people each week, split by whether they used the installed app at all that week.">
        <DataTable columns={WEEKLY_COLUMNS} rows={data.weekly} rowKey={(r) => r.week} compact empty="No activity in the window." />
      </Section>

      <Section title="Recent installs" note="The last 25 people to open Fornetto from a home screen. Tap a person on the Users tab for more.">
        <DataTable columns={RECENT_COLUMNS} rows={data.recent} rowKey={(r) => r.id} compact empty="Nobody has installed yet." />
      </Section>
    </>
  );
}
