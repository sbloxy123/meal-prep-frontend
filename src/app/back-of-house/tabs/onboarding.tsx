"use client";

import type { AdminOnboarding } from "@/lib/types";
import { Breakdown, Section, Stat, SubTitle, Empty } from "../components/primitives";
import { cap } from "../lib/format";
import { RANGE_LABEL, type Range } from "../lib/constants";
import { useAdminData } from "../lib/use-admin-data";

// The questionnaire, step by step: where people drop, what they answer, what
// they add, and what they do in the week after. All from events the wizard
// already logs; one person counts once per window.

const pctOf = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const secs = (ms: number | null) => (ms == null ? "—" : ms >= 60_000 ? `${(ms / 60_000).toFixed(1)} min` : `${Math.round(ms / 1000)}s`);

export function OnboardingTab({ days }: { days: Range }) {
  const { data, loading } = useAdminData<AdminOnboarding>(`/admin/onboarding?days=${days}`, [days]);
  if (loading) return <Empty>Loading…</Empty>;
  if (!data) return <Empty>No onboarding data.</Empty>;
  const f = data.funnel;
  const shown = f.shown || 0;
  const steps = [
    { label: "Shown", value: f.shown },
    { label: "Started", value: f.started },
    { label: "Reached proteins (2)", value: f.step2 },
    { label: "Reached diets (3)", value: f.step3 },
    { label: "Reached My usuals (4)", value: f.step4 },
    { label: "Reached preview (5)", value: f.step5 },
    { label: "Completed", value: f.completed },
  ];
  const completedRow = data.followThrough.find((r) => r.outcome === "completed");
  const skippedRow = data.followThrough.find((r) => r.outcome === "skipped");

  return (
    <>
      <Section
        title={`Questionnaire funnel · ${RANGE_LABEL[days]}`}
        note="Each bar is people who reached that point (a person counts once). Completed vs skipped tells you the ratio; the skip table shows where they left."
      >
        <div className="admin-stat-grid" style={{ marginBottom: 16 }}>
          <Stat label="Shown" value={f.shown} />
          <Stat label="Completed" text={`${f.completed} · ${pctOf(f.completed, shown)}`} />
          <Stat label="Skipped" text={`${f.skipped} · ${pctOf(f.skipped, shown)}`} />
          <Stat label="AI hand-off" value={f.aiHandoff} />
          <Stat label="Median time to finish" text={secs(f.medianMs)} />
          <Stat label="Finished empty" value={data.outcomes.completedEmpty} />
        </div>
        <Breakdown items={steps} />
        {data.skipsByStep.length > 0 && (
          <>
            <SubTitle>Where people skip</SubTitle>
            <Breakdown items={data.skipsByStep.map((s) => ({ label: `Step ${s.step ?? "?"}${s.soft ? " (soft)" : ""}`, value: s.users }))} />
          </>
        )}
        {data.byEntry.length > 0 && (
          <>
            <SubTitle>By entry point</SubTitle>
            <Breakdown items={data.byEntry.map((e) => ({ label: `${cap(e.entry)} · ${e.completed} of ${e.shown} completed`, value: e.shown }))} />
          </>
        )}
      </Section>

      <Section title="Dietary answers" note="From the diets step. Scope is whether the answer applies to just them or the whole kitchen.">
        <div className="admin-stat-grid" style={{ marginBottom: 16 }}>
          <Stat label="Answered" value={data.dietary.answered} />
          <Stat label="Ticked a diet" text={`${data.dietary.withDiets} · ${pctOf(data.dietary.withDiets, data.dietary.answered)}`} />
          <Stat label="Picked proteins" text={`${data.dietary.withProteins} · ${pctOf(data.dietary.withProteins, data.dietary.answered)}`} />
        </div>
        {data.dietary.diets.length > 0 && (<><SubTitle top={0}>Diets</SubTitle><Breakdown items={data.dietary.diets.map((d) => ({ label: cap(d.label), value: d.value }))} /></>)}
        {data.dietary.proteins.length > 0 && (<><SubTitle>Proteins</SubTitle><Breakdown items={data.dietary.proteins.map((d) => ({ label: cap(d.label), value: d.value }))} /></>)}
        {data.dietary.scope.length > 0 && (<><SubTitle>Scope</SubTitle><Breakdown items={data.dietary.scope.map((d) => ({ label: cap(d.label), value: d.value }))} /></>)}
      </Section>

      <Section title="What they added" note="Starters are the curated list; usuals are the meals they typed themselves.">
        <div className="admin-stat-grid">
          <Stat label="Added from the list" text={`${data.starters.addedFromList} · ${pctOf(data.starters.addedFromList, f.completed)}`} />
          <Stat label="Starters offered → chosen → added (avg)" text={`${data.starters.avgOffered} → ${data.starters.avgChosen} → ${data.starters.avgAdded}`} />
          <Stat label="Starters added in total" value={data.starters.totalAdded} />
          <Stat label="Typed their own meals" text={`${data.usuals.typed} · ${pctOf(data.usuals.typed, shown)}`} />
          <Stat label="Got own recipes written" text={`${data.usuals.addedOwn} · ${pctOf(data.usuals.addedOwn, f.completed)}`} />
          <Stat label="Usuals: dishes / written / title-only / failed" text={`${data.usuals.dishes} / ${data.usuals.written} / ${data.usuals.titleOnly} / ${data.usuals.failed}`} />
          <Stat label="Usuals median generation time" text={secs(data.usuals.medianMs)} />
        </div>
      </Section>

      <Section title="The week after" note="Of the people who completed or skipped, how many did the things that make a habit within 7 days.">
        {[completedRow, skippedRow].filter(Boolean).map((r) => (
          <div key={r!.outcome}>
            <SubTitle top={8}>{cap(r!.outcome)} · {r!.users} people</SubTitle>
            <Breakdown
              items={[
                { label: `Added a recipe · ${pctOf(r!.addedRecipe, r!.users)}`, value: r!.addedRecipe },
                { label: `Planned a week · ${pctOf(r!.plannedWeek, r!.users)}`, value: r!.plannedWeek },
                { label: `Generated a list · ${pctOf(r!.generatedList, r!.users)}`, value: r!.generatedList },
                { label: `Finished a shop · ${pctOf(r!.finishedShop, r!.users)}`, value: r!.finishedShop },
              ]}
            />
          </div>
        ))}
        {data.followThrough.length === 0 && <Empty>Nobody has finished the questionnaire in this range.</Empty>}
      </Section>
    </>
  );
}
