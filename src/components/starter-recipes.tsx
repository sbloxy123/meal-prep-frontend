"use client";

import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useModalA11y } from "@/lib/use-modal";
import { STARTER_RECIPES } from "@/lib/starter-recipes";

// A1 — "Add starter recipes" picker. Pre-selects all; on confirm, creates each
// selected recipe via the existing POST /recipes (parallel ingredient arrays,
// quantities 0 / units blank, since these are just shopping raw materials).
export function StarterRecipes({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y(ref, onClose);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(STARTER_RECIPES.map((_, i) => i)),
  );
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
        await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({
            recipe_title: r.title,
            tags: r.tags,
            ingredient_name: r.ingredients,
            ingredient_quantity: r.ingredients.map(() => 0),
            ingredient_unit: r.ingredients.map(() => ""),
            servings: r.servings,
            calories: r.calories,
            protein_g: r.protein_g,
            carb_g: r.carb_g,
            fat_g: r.fat_g,
            macros_source: "estimated",
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
          Pick a few common meals to get going — you can edit or delete them anytime.
        </p>

        <div className="starter-list">
          {STARTER_RECIPES.map((r, i) => {
            const on = selected.has(i);
            return (
              <label key={r.title} className={`starter-item ${on ? "is-on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(i)} disabled={saving} />
                <span className="starter-item-main">
                  <span className="starter-item-title">{r.title}</span>
                  <span className="starter-item-ings text-muted">
                    {r.ingredients.slice(0, 5).join(" · ")}
                    {r.ingredients.length > 5 ? " …" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

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
            {saving ? "Adding…" : `Add ${selected.size} recipe${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
