"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useMenu } from "@/lib/menu";
import type { DietFlag, Scope } from "@/lib/starter-picker";
import type { Protein } from "@/lib/starter-recipes";

// Account → food preferences. Named for what it holds rather than "Preferences"
// — that name is already taken by the theme card.
//
// Reads straight from MenuProvider (the values ride GET /shopping-list, so
// there's nothing to fetch) and writes with the same shape as HouseholdName:
// a status union, a derived dirty flag, and a re-read rather than an
// optimistic patch.

const PROTEINS: { value: Protein; label: string }[] = [
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "pork", label: "Pork" },
  { value: "lamb", label: "Lamb" },
  { value: "fish", label: "Fish" },
];

const DIETS: { value: DietFlag; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "dairy-free", label: "Dairy-free" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "vegan", label: "Vegan" },
];

export function DietaryCard() {
  const menu = useMenu();
  // The form seeds its state from `saved` at mount, so it must not mount before
  // MenuProvider has the values — same guard-then-hand-down shape as
  // HouseholdCard.
  if (!menu.loaded) {
    return (
      <section className="account-card">
        <h2>Food preferences</h2>
        <p className="text-muted">Loading…</p>
      </section>
    );
  }
  return <DietaryForm />;
}

function DietaryForm() {
  const menu = useMenu();
  const saved = menu.foodPrefs;

  const [proteins, setProteins] = useState<Set<Protein>>(
    () => new Set(saved?.proteins ?? []),
  );
  const [diets, setDiets] = useState<Set<DietFlag>>(() => new Set(saved?.diets ?? []));
  const [scope, setScope] = useState<Scope>(saved?.scope ?? "me");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [ruleBlocked, setRuleBlocked] = useState(false);

  const proteinList = useMemo(
    () => PROTEINS.map((p) => p.value).filter((p) => proteins.has(p)),
    [proteins],
  );
  const dietList = useMemo(() => DIETS.map((d) => d.value).filter((d) => diets.has(d)), [diets]);

  const same = (a: string[], b: string[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);
  const dirty =
    !same(proteinList, saved?.proteins ?? []) ||
    !same(dietList, saved?.diets ?? []) ||
    scope !== (saved?.scope ?? "me");

  function toggle<T>(set: Set<T>, value: T, apply: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
    setStatus("idle");
    setRuleBlocked(false);
  }

  async function save() {
    if (!dirty || status === "saving") return;
    setStatus("saving");
    setRuleBlocked(false);
    try {
      // apiFetch, not apiSend: this endpoint answers with JSON telling us
      // whether the kitchen-wide rule actually applied.
      const res = await apiFetch<{ householdRuleApplied?: boolean }>("/household/dietary", {
        method: "PUT",
        body: JSON.stringify({ proteins: proteinList, diets: dietList, scope }),
      });
      // A non-owner's own answers still save; only the kitchen-wide rule is
      // the owner's to set, so say so rather than pretending it applied.
      if (scope === "everyone" && dietList.length > 0 && res?.householdRuleApplied === false) {
        setRuleBlocked(true);
      }
      setStatus("saved");
      await menu.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="account-card">
      <h2>Food preferences</h2>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 12 }}>
        What your household eats. We use this to suggest recipes that fit.
      </p>

      <div className="field">
        <label>Proteins</label>
        <div className="ob-choices">
          {PROTEINS.map((p) => {
            const on = proteins.has(p.value);
            return (
              <button
                key={p.value}
                type="button"
                className={`ob-choice${on ? " is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(proteins, p.value, setProteins)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label>Dietary needs</label>
        <div className="ob-choices">
          {DIETS.map((d) => {
            const on = diets.has(d.value);
            return (
              <button
                key={d.value}
                type="button"
                className={`ob-choice${on ? " is-on" : ""}`}
                aria-pressed={on}
                onClick={() => toggle(diets, d.value, setDiets)}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {diets.size > 0 && (
        <div className="field">
          <label>Who&rsquo;s that for?</label>
          <div className="ob-choices">
            <button
              type="button"
              className={`ob-choice${scope === "me" ? " is-on" : ""}`}
              aria-pressed={scope === "me"}
              onClick={() => {
                setScope("me");
                setStatus("idle");
              }}
            >
              Just me
            </button>
            <button
              type="button"
              className={`ob-choice${scope === "everyone" ? " is-on" : ""}`}
              aria-pressed={scope === "everyone"}
              onClick={() => {
                setScope("everyone");
                setStatus("idle");
              }}
            >
              Everyone in the kitchen
            </button>
          </div>
        </div>
      )}

      <div className="account-inline-row" style={{ marginTop: 4 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={save}
          disabled={!dirty || status === "saving"}
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        <Link href="/recipes?onboarding=1" className="btn btn-ghost">
          Retake the questions
        </Link>
      </div>

      {status === "saved" && !ruleBlocked && <p className="account-ok">Preferences saved.</p>}
      {status === "saved" && ruleBlocked && (
        <p className="account-ok">
          Saved for you. Only the household owner can set a kitchen-wide rule.
        </p>
      )}
      {status === "error" && <p className="account-err">Couldn&rsquo;t save that.</p>}
    </section>
  );
}
