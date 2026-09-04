"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { useModalA11y } from "@/lib/use-modal";
import { useMenu } from "@/lib/menu";
import { AllowanceNote, isCreditLimit, creditLimitMessage } from "@/components/ai-allowance";
import { INSPIRE_HINT_KEY } from "@/components/onboarding-wizard";

// A2 — "Give me inspiration". Asks the AI for a handful of recipe ideas
// (optionally hinted, e.g. "kids meals"), the user multi-selects the ones they
// like, and they're saved straight into the collection via the existing
// POST /recipes — as light, editable stubs (ingredient names, no quantities /
// method; user fleshes them out or uses Improve / Estimate-macros later). Modelled
// on StarterRecipes: same modal shell + sequential add flow.

type Suggestion = { title: string; tags: string[]; ingredients: string[] };

// One-tap steers. "Kids meals" leads — it's the headline prompt for the mums
// this feature is aimed at.
const QUICK_HINTS = ["Kids meals", "Quick dinners", "Vegetarian", "Comfort food"];

export function RecipeInspiration({
  onClose,
  onAdded,
  existingTitles,
}: {
  onClose: () => void;
  onAdded: () => Promise<void> | void;
  // Lowercased titles the user already has — hidden from the results so they
  // can't be added twice.
  existingTitles?: Set<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useModalA11y(ref, onClose);
  const menu = useMenu();

  // Seeded from the onboarding hand-off: a vegan/gluten-free household arrives
  // here because the starter recipes can't serve them, so their requirement is
  // pre-filled rather than left for them to retype.
  const [hint, setHint] = useState(() => {
    try {
      const stashed = sessionStorage.getItem(INSPIRE_HINT_KEY);
      if (stashed) {
        sessionStorage.removeItem(INSPIRE_HINT_KEY);
        return stashed;
      }
    } catch {
      // Private mode — just start empty.
    }
    return "";
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState(false);

  const available = suggestions
    .map((s, i) => i)
    .filter((i) => !existingTitles?.has(suggestions[i].title.toLowerCase()));

  // Preset steer → just fill the field; the user reviews it and clicks Suggest.
  // (Keeps quick chips from each spending an AI call.)
  function fillHint(h: string) {
    setHint(h);
    inputRef.current?.focus();
  }

  async function suggest() {
    if (pending || !menu.allowance.canAfford("suggest")) return;
    if (!(await menu.confirmAiSpend("suggest"))) return;
    const h = hint.trim();
    setPending(true);
    setError(null);
    setAddError(false);
    setSelected(new Set());
    try {
      const res = await apiFetch<{ suggestions: Suggestion[] }>("/recipes/suggest", {
        method: "POST",
        body: JSON.stringify({ hint: h || undefined }),
      });
      setSuggestions(res.suggestions ?? []);
      void menu.refresh(); // reflect the spent credits
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        isCreditLimit(err)
          ? creditLimitMessage(err)
          : status === 429
            ? "Limit reached — 15 suggestions per 6 hours. Try again later."
            : "Couldn’t get ideas just now. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function add() {
    if (saving || selected.size === 0) return;
    setSaving(true);
    setAddError(false);
    try {
      // Sequential — keeps tag creation on the backend from racing on the same
      // shared tag name across recipes (same reasoning as StarterRecipes).
      for (const i of selected) {
        const s = suggestions[i];
        await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({
            recipe_title: s.title,
            tags: s.tags,
            ingredient_name: s.ingredients,
            ingredient_quantity: s.ingredients.map(() => 0),
            ingredient_unit: s.ingredients.map(() => ""),
          }),
        });
      }
      await onAdded();
      onClose();
    } catch {
      setAddError(true);
      setSaving(false);
    }
  }

  const busy = pending || saving;

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 70 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="dialog starter-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspire-title"
        ref={ref}
      >
        <span className="card-kicker inspire-kicker">
          <Sparkles size={14} aria-hidden /> Fornetto AI
        </span>
        <h2 id="inspire-title" className="dialog-title">
          Recipe inspiration
        </h2>
        <p className="dialog-body" style={{ margin: 0 }}>
          Not sure what to cook? Get a few ideas and add the ones you fancy — edit them anytime.
        </p>

        <div className="inspire-hintrow">
          <input
            ref={inputRef}
            className="input"
            type="text"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                suggest();
              }
            }}
            placeholder="e.g. kids meals, quick dinners, vegetarian"
            aria-label="What kind of recipes?"
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-ai"
            onClick={suggest}
            disabled={busy || !menu.allowance.canAfford("suggest")}
          >
            <Sparkles size={14} className="btn-ai-spark" aria-hidden />
            {pending ? "Thinking…" : suggestions.length ? "Again" : "Suggest"}
          </button>
        </div>

        <AllowanceNote source="recipe_inspiration" action="suggest" />

        <div className="inspire-chips">
          {QUICK_HINTS.map((h) => (
            <button
              key={h}
              type="button"
              className="tag chip tag-neutral"
              onClick={() => fillHint(h)}
              disabled={busy}
            >
              {h}
            </button>
          ))}
        </div>

        {error && (
          <p className="sc-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}

        {available.length > 0 && (
          <div className="starter-list">
            {available.map((i) => {
              const s = suggestions[i];
              const on = selected.has(i);
              return (
                <label key={s.title} className={`starter-item ${on ? "is-on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(i)}
                    disabled={saving}
                  />
                  <span className="starter-item-main">
                    <span className="starter-item-title">{s.title}</span>
                    {s.tags.length > 0 && (
                      <span className="inspire-item-tags text-muted">{s.tags.join(" · ")}</span>
                    )}
                    <span className="starter-item-ings text-muted">
                      {s.ingredients.slice(0, 5).join(" · ")}
                      {s.ingredients.length > 5 ? " …" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {suggestions.length > 0 && available.length === 0 && !pending && (
          <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
            You’ve already got all of these — try a different steer.
          </p>
        )}

        {addError && (
          <p className="sc-error" role="alert" style={{ margin: 0 }}>
            Couldn’t add those. Please try again.
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            {suggestions.length ? "Done" : "Cancel"}
          </button>
          {available.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={add}
              disabled={saving || selected.size === 0}
            >
              {saving
                ? "Adding…"
                : selected.size === 0
                  ? "Add recipes"
                  : `Add ${selected.size} recipe${selected.size === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
