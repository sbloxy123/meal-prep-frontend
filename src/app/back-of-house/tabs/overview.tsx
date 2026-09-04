"use client";

import type { AdminHistory, AdminHistoryMonth, AdminOverview } from "@/lib/types";
import { DataTable, type Column } from "../components/data-table";
import { Kpi, Section, Empty } from "../components/primitives";
import { StaleLayoutNotice } from "../components/stale-layout-notice";
import { fmtPence, pct, sum } from "../lib/format";
import { RANGE_LABEL, type Range } from "../lib/constants";
import { useAdminData } from "../lib/use-admin-data";

// The six numbers that decide things, any alerts, and the month-by-month
// record. Everything deeper lives in its own tab.

export function OverviewTab({ overview, days }: { overview: AdminOverview | null; days: Range }) {
  const totals = overview?.totals ?? {};
  const series = overview?.series ?? {};
  const { data: history, loading } = useAdminData<AdminHistory>("/admin/history?months=12");
  const newInRange = sum(series.signups);
  const paying = totals.paidHouseholds ?? 0;
  const costPerPaying = paying > 0 && totals.aiCost?.pence != null ? totals.aiCost.pence / paying : null;
  const trial = overviewTrial(history);

  return (
    <>
      {totals.install && <StaleLayoutNotice install={totals.install} />}
      <div className="admin-kpis">
        <Kpi label="Users" value={totals.users} sub={`+${newInRange} in ${RANGE_LABEL[days]}`} />
        <Kpi label="Active 7d" value={totals.activeUsers7d} sub={`${totals.activeUsers30d ?? "—"} in 30d`} />
        <Kpi label="Day-7 retention" text={pct(totals.retention?.d7?.rate)} sub={totals.retention?.d7?.eligible ? `of ${totals.retention.d7.eligible} eligible` : "no cohort yet"} />
        <Kpi label="Paying households" value={paying} sub={history?.months.at(-1)?.mrr_pence != null ? `${fmtPence(history.months.at(-1)!.mrr_pence)} MRR` : `${totals.compedHouseholds ?? 0} comped`} />
        <Kpi label={`AI cost · ${RANGE_LABEL[days]}`} text={fmtPence(totals.aiCost?.pence)} sub={costPerPaying != null ? `${fmtPence(costPerPaying)} per paying household` : undefined} />
        <Kpi label="Trial → paid" text={trial.rate} sub={trial.sub} />
      </div>

      <Section
        title="Month by month"
        note={
          <>
            One row per month from the nightly snapshots. Stocks (users, paying, MRR, active) are the month&rsquo;s last
            day; everything else is the month&rsquo;s total. Greyed cells were reconstructed after the fact for some days.
            The current month is partial.{" "}
            <a className="admin-link" href="/backend/admin/history?months=24&format=csv" download>
              Download CSV
            </a>
          </>
        }
      >
        {loading ? <Empty>Loading…</Empty> : !history || history.months.length === 0 ? <Empty>No snapshots yet — the first one is written after midnight.</Empty> : (
          <DataTable columns={HISTORY_COLUMNS} rows={[...history.months].reverse()} rowKey={(m) => m.month} layout="scroll" compact />
        )}
      </Section>
    </>
  );
}

function overviewTrial(history: AdminHistory | null): { rate: string; sub?: string } {
  const months = history?.months ?? [];
  const started = months.reduce((a, m) => a + m.trials_started, 0);
  const converted = months.reduce((a, m) => a + m.trials_converted, 0);
  if (!started) return { rate: "—", sub: "no trials yet" };
  return { rate: `${Math.round((converted / started) * 100)}%`, sub: `${converted} of ${started} trials, all time` };
}

const grey = (m: AdminHistoryMonth, key: string) => (m.reconstructed.includes(key) ? "admin-muted" : undefined);
const n = (v: number | null | undefined) => (v == null ? "—" : String(v));

const HISTORY_COLUMNS: Column<AdminHistoryMonth>[] = [
  { key: "month", label: "Month", render: (m) => <>{m.month}{m.partial && <span className="admin-pill" style={{ marginLeft: 6 }}>partial</span>}</> },
  { key: "users", label: "Users", numeric: true, render: (m) => <span className={grey(m, "users")}>{n(m.users)}</span> },
  { key: "signups", label: "Signups", numeric: true, render: (m) => m.signups },
  { key: "active_7d", label: "Active 7d", numeric: true, render: (m) => <span className={grey(m, "active_7d")}>{n(m.active_7d)}</span> },
  { key: "d7", label: "D7 %", numeric: true, render: (m) => (m.d7 == null ? "—" : `${m.d7}% (${m.d7_cohort})`) },
  { key: "paid_households", label: "Paying", numeric: true, render: (m) => <span className={grey(m, "paid_households")}>{n(m.paid_households)}</span> },
  { key: "mrr_pence", label: "MRR", numeric: true, render: (m) => <span className={grey(m, "mrr_pence")}>{m.mrr_pence == null ? "—" : fmtPence(m.mrr_pence)}</span> },
  { key: "cancellations", label: "Cancels", numeric: true, render: (m) => m.cancellations },
  { key: "trials", label: "Trials → paid", numeric: true, render: (m) => `${m.trials_started} → ${m.trials_converted}` },
  { key: "ai_cost_pence", label: "AI cost", numeric: true, render: (m) => fmtPence(m.ai_cost_pence) },
  { key: "cost_per_paying_pence", label: "Cost / paying", numeric: true, render: (m) => (m.cost_per_paying_pence == null ? "—" : fmtPence(m.cost_per_paying_pence)) },
  { key: "recipes_created", label: "Recipes", numeric: true, render: (m) => m.recipes_created },
  { key: "lists_generated", label: "Lists", numeric: true, render: (m) => m.lists_generated },
  { key: "shops_finished", label: "Shops", numeric: true, render: (m) => m.shops_finished },
  { key: "seat_hits", label: "Seat hits", numeric: true, render: (m) => m.seat_hits },
  { key: "onboarding", label: "Onboarding done / skipped", numeric: true, render: (m) => `${m.onboarding_completed} / ${m.onboarding_skipped}` },
];
