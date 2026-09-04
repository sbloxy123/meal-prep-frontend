"use client";

import { useMemo } from "react";
import type { AdminAiStats, AdminOverview, AdminUserRow } from "@/lib/types";
import { Chart, Breakdown, Stat } from "../components/primitives";
import { fmtPence, fmtMs, fmtTokens, cap } from "../lib/format";
import { AI_ACTIONS, AI_LABEL, RANGE_LABEL, type AiAction, type Range } from "../lib/constants";
import { useAdminData } from "../lib/use-admin-data";

export function AiTab({ series, users, days }: { series: NonNullable<AdminOverview["series"]>; users: AdminUserRow[]; days: Range }) {
  const { data: stats } = useAdminData<AdminAiStats>(`/admin/ai?days=${days}`, [days]);
  return <AiSection series={series} users={users} days={days} stats={stats} />;
}

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
