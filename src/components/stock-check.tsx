"use client";

import { useRef, useState } from "react";
import { Check, Image as ImageIcon } from "lucide-react";
import { useModalA11y } from "@/lib/use-modal";

interface StockCheckProps {
  recipe: { id: number; title: string };
  ingredients: string[];
  initialSelected: Set<string>;
  isEdit: boolean;
  onSubmit: (ingredients: string[]) => Promise<void>;
  onClose: () => void;
}

export function StockCheck({
  recipe,
  ingredients,
  initialSelected,
  isEdit,
  onSubmit,
  onClose,
}: StockCheckProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalA11y(dialogRef, onClose);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const allSelected = ingredients.length > 0 && selected.size === ingredients.length;
  function needEverything() {
    setSelected(allSelected ? new Set() : new Set(ingredients));
  }

  async function submit() {
    setSubmitting(true);
    setError(false);
    try {
      await onSubmit([...selected]);
      onClose();
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  const count = selected.size;
  const plural = count === 1 ? "" : "s";
  const submitLabel = submitting
    ? isEdit
      ? "Saving…"
      : "Adding…"
    : isEdit
      ? count > 0
        ? `Save ${count} item${plural}`
        : "Save"
      : count > 0
        ? `Add recipe & ${count} item${plural}`
        : "Add recipe";

  return (
    <div
      className="sc-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sc"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-title"
        ref={dialogRef}
      >
        <div className="sc-photo" aria-hidden>
          <ImageIcon size={26} />
        </div>

        <div className="sc-inner">
          <div className="sc-grip" aria-hidden />

          <div>
            <div className="sc-kicker">Stock check</div>
            <h2 id="sc-title" className="sc-title">
              {recipe.title}
            </h2>
            <p className="sc-help text-muted">
              Tick the ingredients you need to buy. Leave anything you&rsquo;ve already got in.
            </p>
          </div>

          <hr className="hr" style={{ margin: 0 }} />

          {ingredients.length > 0 ? (
            <div className="sc-list">
              {ingredients.map((name) => (
                <label key={name} className="sc-item">
                  <input
                    type="checkbox"
                    checked={selected.has(name)}
                    onChange={() => toggle(name)}
                  />
                  <span className="sc-box" aria-hidden>
                    <Check size={13} />
                  </span>
                  <span className="sc-name">{name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-muted" style={{ fontSize: 14 }}>
              This recipe has no ingredients to check — you can still add it to this week.
            </p>
          )}

          <div className="sc-selectbar">
            {ingredients.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={needEverything}>
                {allSelected ? "Clear all" : "Need everything"}
              </button>
            )}
            <span className="sc-count text-muted">
              {count} of {ingredients.length} selected
            </span>
          </div>

          {error && (
            <p className="sc-error" role="alert">
              Couldn&rsquo;t save that.{" "}
              <button type="button" className="btn btn-ghost" onClick={submit}>
                Retry
              </button>
            </p>
          )}

          <div className="sc-actions">
            <button type="button" className="btn btn-ghost sc-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary sc-submit"
              onClick={submit}
              disabled={submitting}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
