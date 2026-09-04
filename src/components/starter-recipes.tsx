"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useModalA11y } from "@/lib/use-modal";
import { STARTER_RECIPES, STARTER_IMAGES } from "@/lib/starter-recipes";

// A1 — "Add starter recipes" picker. Pre-selects all; on confirm, creates each
// selected recipe via the existing POST /recipes (parallel ingredient arrays,
// quantities 0 / units blank, since these are just shopping raw materials).
export function StarterRecipes({
  onClose,
  onAdded,
  existingTitles,
}: {
  onClose: () => void;
  onAdded: () => Promise<void> | void;
  // Lowercased titles the user already has — those starters are hidden so they
  // can't be added twice. Defaults to none (empty-state entry point).
  existingTitles?: Set<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y(ref, onClose);
  // Indices (into STARTER_RECIPES) the user doesn't already have.
  const available = STARTER_RECIPES.map((_, i) => i).filter(
    (i) => !existingTitles?.has(STARTER_RECIPES[i].title.toLowerCase()),
  );
  // Start with nothing selected — the user ticks the ones they want.
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const allSelected = available.length > 0 && selected.size === available.length;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

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
    setError(false);
    try {
      // Sequential — keeps tag creation on the backend from racing on the same
      // shared tag name across recipes.
      for (const i of selected) {
        const r = STARTER_RECIPES[i];
        const img = STARTER_IMAGES[r.title];
        await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({
            recipe_source: "starter",
            recipe_title: r.title,
            recipe_instructions: r.instructions,
            tags: r.tags,
            ingredient_name: r.ingredients.map((i) => i.name),
            ingredient_quantity: r.ingredients.map((i) => i.quantity),
            ingredient_unit: r.ingredients.map((i) => i.unit),
            servings: r.servings,
            calories: r.calories,
            protein_g: r.protein_g,
            carb_g: r.carb_g,
            fat_g: r.fat_g,
            macros_source: "estimated",
            image_url: img?.image_url,
            image_public_id: img?.image_public_id,
          }),
        });
      }
      await onAdded();
      onClose();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 70 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="dialog starter-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="starter-title"
        ref={ref}
      >
        <h2 id="starter-title" className="dialog-title">
          Add starter recipes
        </h2>
        <p className="dialog-body" style={{ margin: 0 }}>
          Tick the meals you&rsquo;d like to add — you can edit or delete them anytime.
        </p>

        {available.length > 0 && (
          <div className="starter-toolbar">
            <button
              type="button"
              className="btn btn-ghost"
              style={{ height: 30, fontSize: 13 }}
              onClick={() => setSelected(allSelected ? new Set() : new Set(available))}
              disabled={saving}
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
        )}

        {available.length > 0 ? (
          <div className="starter-list">
            {available.map((i) => {
              const r = STARTER_RECIPES[i];
              const on = selected.has(i);
              return (
                <label key={r.title} className={`starter-item ${on ? "is-on" : ""}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(i)} disabled={saving} />
                  <span className="starter-item-main">
                    <span className="starter-item-title">{r.title}</span>
                    <span className="starter-item-ings text-muted">
                      {r.ingredients.slice(0, 5).map((i) => i.name).join(" · ")}
                      {r.ingredients.length > 5 ? " …" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
            You&rsquo;ve already added all the starter recipes.
          </p>
        )}

        {error && (
          <p className="sc-error" role="alert" style={{ margin: 0 }}>
            Couldn&rsquo;t add those. Please try again.
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
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
        </div>
      </div>
    </div>
  );
}
