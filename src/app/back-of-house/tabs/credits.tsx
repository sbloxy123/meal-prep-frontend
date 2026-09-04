"use client";

import type { AdminCreditStats } from "@/lib/types";
import { Stat } from "../components/primitives";
import { cap } from "../lib/format";
import { RANGE_LABEL, PLAN_LABEL, type Range } from "../lib/constants";
import { useAdminData } from "../lib/use-admin-data";

export function CreditsTab({ days }: { days: Range }) {
  const { data: stats } = useAdminData<AdminCreditStats>(`/admin/credits?days=${days}`, [days]);
  return <CreditsSection stats={stats} days={days} />;
}

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
        <Stat label={`Invite blocked by seats · ${RANGE_LABEL[days]}`} value={stats?.householdLimitHits} />
        <Stat label="Paying monthly" value={stats?.subscriptions?.monthly} />
        <Stat label="Paying yearly" value={stats?.subscriptions?.annual} />
        <Stat label="Founders" value={stats?.subscriptions?.founders} />
      </div>
    </section>
  );
}
