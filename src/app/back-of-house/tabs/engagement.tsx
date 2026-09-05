"use client";

import type { AdminOverview } from "@/lib/types";
import { Chart, Breakdown, Stat } from "../components/primitives";
import { StaleLayoutNotice } from "../components/stale-layout-notice";
import { pct, retentionText, toItems } from "../lib/format";
import { RANGE_LABEL, type Range } from "../lib/constants";
import { useAdminData } from "../lib/use-admin-data";
import { DataTable, type Column } from "../components/data-table";
import { Section, SubTitle, Empty } from "../components/primitives";
import { cap, fmtDate } from "../lib/format";
import type { AdminRecipesOverview } from "@/lib/types";

export function EngagementTab({ totals, series, days }: { totals: NonNullable<AdminOverview["totals"]>; series: NonNullable<AdminOverview["series"]>; days: Range }) {
  return (
    <>
      <EngagementSection totals={totals} series={series} days={days} />
      <WhatPeopleAdd days={days} />
      <GrowthSection totals={totals} />
    </>
  );
}

// Anonymous by construction: sources, shape, titles that recur across
// households, and the last fifty titles with a short household key. Nobody is
// named; the Users tab is where a person is looked at, and that is logged.
function WhatPeopleAdd({ days }: { days: Range }) {
  const { data, loading } = useAdminData<AdminRecipesOverview>(`/admin/recipes/overview?days=${days}`, [days]);
  if (loading) return <Section title="What people add"><Empty>Loading…</Empty></Section>;
  if (!data) return null;
  const s = data.shape;
  const pctOf = (a: number) => (s.recipes ? `${Math.round((a / s.recipes) * 100)}%` : "—");
  const recentColumns: Column<AdminRecipesOverview["recent"][number]>[] = [
    { key: "title", label: "Recipe", mobile: "title", render: (r) => r.title || "Untitled" },
    { key: "source", label: "Source", mobile: "pill", render: (r) => <span className="admin-pill">{cap(r.source ?? "unknown")}</span> },
    { key: "tags", label: "Collections", render: (r) => (r.tags.length ? r.tags.join(", ") : "—") },
    { key: "created_at", label: "Added", render: (r) => fmtDate(r.created_at) },
    { key: "household_key", label: "Household", mobile: "hide", render: (r) => <code>{r.household_key}</code> },
    { key: "flags", label: "", mobile: "hide", render: (r) => <>{r.has_photo && "📷 "}{r.favourite && "★ "}{r.on_menu && "this week"}</> },
  ];
  return (
    <Section
      title={`What people add · ${RANGE_LABEL[days]}`}
      note="Anonymous: where recipes come from, what they look like, which dishes recur across households, and the latest titles. Nobody is named here — look someone up on the Users tab if you need to, and that is logged."
    >
      <div className="admin-stat-grid" style={{ marginBottom: 16 }}>
        <Stat label="Recipes added" value={s.recipes} />
        <Stat label="With a photo" text={pctOf(s.withPhoto)} />
        <Stat label="From a link" text={pctOf(s.withLink)} />
        <Stat label="Put on a week" text={pctOf(s.everOnMenu)} />
        <Stat label="Favourited" text={pctOf(s.favourited)} />
        <Stat label="Ingredients / steps (avg)" text={`${s.avgIngredients} / ${s.avgSteps}`} />
      </div>
      <SubTitle top={0}>Where they come from</SubTitle>
      <Breakdown items={Object.entries(data.sources).filter(([, v]) => v > 0).map(([k, v]) => ({ label: cap(k), value: v }))} />
      {data.repeats.length > 0 && (<><SubTitle>Dishes several households have</SubTitle><Breakdown items={data.repeats.map((r) => ({ label: `${cap(r.title)} · ${r.households} households`, value: r.count }))} /></>)}
      {data.topTags.length > 0 && (<><SubTitle>Collections used · {RANGE_LABEL[days]}</SubTitle><Breakdown items={data.topTags.map((t) => ({ label: `${t.name} · ${t.households} households`, value: t.count }))} /></>)}
      <SubTitle>Latest recipes · titles only</SubTitle>
      <DataTable columns={recentColumns} rows={data.recent} rowKey={(r) => r.id} compact empty="No recipes yet." />
    </Section>
  );
}

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
