"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Plus, Sparkles, ChevronDown } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { useMenu } from "@/lib/menu";
import { AllowanceNote, isWeeklyLimit, WEEKLY_LIMIT_MESSAGE } from "@/components/ai-allowance";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageDrop, type RecipePhoto } from "@/components/image-drop";

export interface RecipeFormInitial {
  title?: string;
  description?: string | null;
  instructions?: string | null;
  link_url?: string | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  ingredients?: { name: string; quantity: string; unit: string }[];
  collections?: string[];
  image_url?: string | null;
  image_public_id?: string | null;
  servings?: number | null;
  calories?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  fat_g?: number | null;
  macros_source?: MacrosSource | null;
}

type MacrosSource = "manual" | "imported" | "estimated";

interface RecipeFormProps {
  mode: "create" | "edit";
  recipeId?: number;
  initial?: RecipeFormInitial;
  // Collapsible mode (used on /recipes/new so the manual form is a fallback).
  // Omitted on the edit page → always expanded, no toggle.
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  // Set by /recipes/[id]/edit?improve=1 (the detail page's "Improve recipe"
  // button) — runs the improve pass once, as soon as the form mounts.
  autoImprove?: boolean;
}

type IngredientRow = { name: string; quantity: string; unit: string };

// Postgres numeric / possibly-null macro value → the string an <input> wants.
function numToInput(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

export function RecipeForm({
  mode,
  recipeId,
  initial = {},
  collapsible = false,
  open = true,
  onToggle,
  autoImprove = false,
}: RecipeFormProps) {
  // Collapsed only applies in collapsible mode; otherwise always shown.
  const expanded = !collapsible || open;
  const router = useRouter();
  const menu = useMenu();

  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [instructions, setInstructions] = useState(initial.instructions ?? "");
  const [link, setLink] = useState(initial.link_url ?? "");
  const [prep, setPrep] = useState(initial.prep_time_minutes?.toString() ?? "");
  const [cook, setCook] = useState(initial.cook_time_minutes?.toString() ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial.ingredients?.length ? initial.ingredients : [{ name: "", quantity: "", unit: "" }],
  );
  const [collections, setCollections] = useState<string[]>(initial.collections ?? []);
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [photo, setPhoto] = useState<RecipePhoto | null>(
    initial.image_url ? { url: initial.image_url, publicId: initial.image_public_id ?? "" } : null,
  );
  const [servings, setServings] = useState(initial.servings?.toString() ?? "");
  const [calories, setCalories] = useState(numToInput(initial.calories));
  const [protein, setProtein] = useState(numToInput(initial.protein_g));
  const [carb, setCarb] = useState(numToInput(initial.carb_g));
  const [fat, setFat] = useState(numToInput(initial.fat_g));
  const [macrosSource, setMacrosSource] = useState<MacrosSource | null>(initial.macros_source ?? null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState("");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cancelHref = mode === "edit" && recipeId ? `/recipes/${recipeId}` : "/recipes";
  const suggestions = menu.collections.map((c) => c.name).filter((n) => !collections.includes(n));

  function setIngredient(i: number, patch: Partial<IngredientRow>) {
    setIngredients((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function addIngredient() {
    setIngredients((prev) => [...prev, { name: "", quantity: "", unit: "" }]);
  }
  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  // A hand-typed macro means the numbers are the user's own, not an estimate.
  function editMacro(setter: (v: string) => void, value: string) {
    setter(value);
    setMacrosSource("manual");
  }

  const canEstimate = title.trim() !== "" && ingredients.some((r) => r.name.trim());

  // Estimates from sparse data — no serving count, or half+ of the ingredients
  // with no amount — are rougher, so we flag it when the numbers are estimated.
  const namedRows = ingredients.filter((r) => r.name.trim());
  const missingQty = namedRows.filter((r) => !r.quantity.trim()).length;
  const estimateIsRough =
    servings.trim() === "" || (namedRows.length > 0 && missingQty / namedRows.length >= 0.5);

  // Shared macro estimate call — used by the "Estimate macros" button and as
  // the fallback after "Improve recipe" when the improve pass doesn't return
  // macros of its own.
  type Macros = {
    calories: number | null;
    protein_g: number | null;
    carb_g: number | null;
    fat_g: number | null;
  };
  async function requestEstimate(rows: IngredientRow[], servingsStr: string): Promise<Macros> {
    return apiFetch<Macros>("/recipes/estimate-macros", {
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        servings: servingsStr.trim() ? Number(servingsStr) : undefined,
        ingredients: rows.map((r) => ({
          name: r.name.trim(),
          quantity: r.quantity.trim() || undefined,
          unit: r.unit.trim() || undefined,
        })),
      }),
    });
  }

  function applyMacros(m: Macros) {
    setCalories(numToInput(m.calories));
    setProtein(numToInput(m.protein_g));
    setCarb(numToInput(m.carb_g));
    setFat(numToInput(m.fat_g));
    setMacrosSource("estimated");
  }

  async function estimateMacros() {
    if (estimating || !canEstimate || menu.allowance.exhausted) return;
    if (!(await menu.confirmAiSpend())) return;
    setEstimating(true);
    setEstimateError("");
    const rows = ingredients.filter((r) => r.name.trim());
    try {
      applyMacros(await requestEstimate(rows, servings));
      void menu.refresh(); // reflect the decremented weekly allowance
    } catch (err) {
      setEstimateError(
        isWeeklyLimit(err)
          ? WEEKLY_LIMIT_MESSAGE
          : err instanceof ApiError && err.status === 429
            ? "Estimate limit reached — 20 per 6 hours. Try again later."
            : "Couldn’t estimate macros. Please try again.",
      );
    } finally {
      setEstimating(false);
    }
  }

  // "Improve recipe" — an AI pass that fills in the gaps (sensible ingredient
  // quantities/units, a fuller method/description, a serving count) and returns
  // fresh per-serving macros. We only fill *blank* fields so the user's own
  // entries are never overwritten; macros are always refreshed (the whole point).
  async function improveRecipe() {
    if (improving || !canEstimate || menu.allowance.exhausted) return;
    if (!(await menu.confirmAiSpend())) return;
    setImproving(true);
    setImproveError("");
    const rows = ingredients.filter((r) => r.name.trim());
    try {
      const res = await apiFetch<{
        description: string | null;
        servings: number | null;
        instructions: string | null;
        ingredients: { name: string; quantity: number | string | null; unit: string | null }[];
        calories: number | null;
        protein_g: number | null;
        carb_g: number | null;
        fat_g: number | null;
      }>("/recipes/improve", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          servings: servings.trim() ? Number(servings) : undefined,
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          ingredients: rows.map((r) => ({
            name: r.name.trim(),
            quantity: r.quantity.trim() || undefined,
            unit: r.unit.trim() || undefined,
          })),
        }),
      });

      if (!description.trim() && res.description) setDescription(res.description);
      const resolvedServings =
        servings.trim() || (res.servings != null ? String(res.servings) : "");
      if (!servings.trim() && res.servings != null) setServings(String(res.servings));
      if (!instructions.trim() && res.instructions) setInstructions(res.instructions);

      // Merge the improved amounts into the rows (response aligns, in order, with
      // the named rows we sent) — only filling fields the user left blank. Build
      // the new array up front so we can reuse it for the macro fallback below.
      let pos = -1;
      const improved = ingredients.map((row) => {
        if (!row.name.trim()) return row;
        pos += 1;
        const imp = res.ingredients?.[pos];
        if (!imp) return row;
        const impQty = imp.quantity == null || imp.quantity === "" ? "" : String(imp.quantity);
        return {
          ...row,
          quantity: row.quantity.trim() ? row.quantity : impQty,
          unit: row.unit.trim() ? row.unit : imp.unit ?? "",
        };
      });
      setIngredients(improved);

      // Prefer the macros the improve pass returned; if it didn't include any,
      // estimate them from the freshly-improved quantities so the user never has
      // to run "Estimate macros" as a second step.
      const hasMacros = [res.calories, res.protein_g, res.carb_g, res.fat_g].some((v) => v != null);
      if (hasMacros) {
        applyMacros(res);
      } else {
        try {
          applyMacros(await requestEstimate(improved.filter((r) => r.name.trim()), resolvedServings));
        } catch {
          // Quantities are already improved; a failed macro fallback is non-fatal.
        }
      }
      void menu.refresh(); // reflect the decremented weekly allowance
    } catch (err) {
      setImproveError(
        isWeeklyLimit(err)
          ? WEEKLY_LIMIT_MESSAGE
          : err instanceof ApiError && err.status === 429
            ? "Improve limit reached — 15 per 6 hours. Try again later."
            : "Couldn’t improve this recipe. Please try again.",
      );
    } finally {
      setImproving(false);
    }
  }

  // Arriving from the detail page's "Improve recipe" button. The ref keeps it to
  // one run — including across StrictMode's double-invoked effects in dev.
  const autoImproveFired = useRef(false);
  useEffect(() => {
    if (!autoImprove || autoImproveFired.current) return;
    autoImproveFired.current = true;
    if (menu.allowance.exhausted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImproveError(WEEKLY_LIMIT_MESSAGE);
      return;
    }
    // Nothing to improve — the hint by the button already explains why.
    if (!canEstimate) return;
    void improveRecipe();
    // Fires on the flag alone; improveRecipe reads current state when it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoImprove]);

  function addCollection(name: string) {
    const value = name.trim();
    if (value && !collections.includes(value)) setCollections((prev) => [...prev, value]);
    setNewCollection("");
    setAddingCollection(false);
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFormError("");

    const rows = ingredients.filter((r) => r.name.trim());
    const hasMacros = [calories, protein, carb, fat].some((v) => v.trim());
    const body: Record<string, unknown> = {
      recipe_title: title.trim(),
      recipe_description: description.trim() || undefined,
      recipe_instructions: instructions.trim() || undefined,
      recipe_link_url: link.trim() || undefined,
      prep_time_minutes: prep.trim() ? Number(prep) : undefined,
      cook_time_minutes: cook.trim() ? Number(cook) : undefined,
      ingredient_name: rows.map((r) => r.name.trim()),
      ingredient_quantity: rows.map((r) => (r.quantity.trim() ? Number(r.quantity) : 0)),
      ingredient_unit: rows.map((r) => r.unit.trim()),
      tags: collections,
      image_url: photo?.url,
      image_public_id: photo?.publicId,
      servings: servings.trim() ? Number(servings) : undefined,
      calories: calories.trim() ? Number(calories) : undefined,
      protein_g: protein.trim() ? Number(protein) : undefined,
      carb_g: carb.trim() ? Number(carb) : undefined,
      fat_g: fat.trim() ? Number(fat) : undefined,
      macros_source: hasMacros ? macrosSource ?? "manual" : undefined,
    };

    try {
      await apiFetch(`/recipes${mode === "edit" ? `/${recipeId}` : ""}`, {
        method: mode === "edit" ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      await menu.refresh();
      router.push(cancelHref);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // The 400 body carries per-field Zod errors.
        let parsed: { errors?: Record<string, string[]> } = {};
        try {
          parsed = JSON.parse(err.body);
        } catch {
          /* non-JSON body */
        }
        setErrors(parsed.errors ?? {});
        setSaving(false);
        return;
      }
      setFormError("Something went wrong saving the recipe. Please try again.");
      setSaving(false);
    }
  }

  async function doDelete() {
    if (recipeId == null) return;
    // Shared with the list's delete button so both tidy the shopping list.
    await menu.deleteRecipe(recipeId);
    setConfirmDelete(false);
    router.push("/recipes");
  }

  const titleError = errors.recipe_title?.[0];

  return (
    <div className="rf">
      <header className="rf-head">
        {collapsible ? (
          <button
            type="button"
            className="rf-head-toggle"
            aria-expanded={expanded}
            aria-controls="rf-body"
            onClick={onToggle}
          >
            <span className="rf-kicker">New recipe</span>
            <span className="rf-title rf-title--toggle">
              <span className="rf-title-text">Recipe details</span>
              <span className="rf-head-toggle-cue">
                {!expanded && <span className="rf-head-open">Open</span>}
                <span className="rf-toggle-chevron">
                  <ChevronDown
                    size={18}
                    className={`rf-chevron${expanded ? " is-open" : ""}`}
                    aria-hidden
                  />
                </span>
              </span>
            </span>
            {!expanded && (
              <span className="rf-head-hint">Write it by hand, or generate one above.</span>
            )}
          </button>
        ) : (
          <div>
            <div className="rf-kicker">{mode === "edit" ? "Editing" : "New recipe"}</div>
            <h1 className="rf-title">Recipe details</h1>
          </div>
        )}
      </header>

      <form
        id="rf-body"
        className="rf-body"
        hidden={!expanded}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="field">
          <label htmlFor="rf-title">Title</label>
          <input
            id="rf-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={titleError ? true : undefined}
          />
          {titleError && <p className="rf-error">{titleError}</p>}
        </div>

        <ImageDrop value={photo} onChange={setPhoto} />

        <div className="field">
          <label htmlFor="rf-desc">Description</label>
          <textarea
            id="rf-desc"
            className="input"
            style={{ minHeight: 56 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="rf-row2">
          <div className="field">
            <label htmlFor="rf-prep">Prep (mins)</label>
            <input
              id="rf-prep"
              className="input"
              inputMode="numeric"
              value={prep}
              onChange={(e) => setPrep(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rf-cook">Cook (mins)</label>
            <input
              id="rf-cook"
              className="input"
              inputMode="numeric"
              value={cook}
              onChange={(e) => setCook(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rf-servings">Serves</label>
            <input
              id="rf-servings"
              className="input"
              inputMode="numeric"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="rf-link">Source link</label>
          <input
            id="rf-link"
            className="input"
            placeholder="example.com/recipe"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <hr className="rf-divider" />

        <div className="field">
          <label htmlFor="rf-instructions">Method</label>
          <textarea
            id="rf-instructions"
            className="input"
            style={{ minHeight: 96, whiteSpace: "pre-wrap" }}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <p className="rf-hint text-muted">One step per line.</p>
        </div>

        <hr className="rf-divider" />

        <div className="rf-section-head">
          <h6>Ingredients</h6>
          <span className="rf-section-rule" />
          <span className="rf-count">{ingredients.filter((r) => r.name.trim()).length}</span>
        </div>
        <div className="rf-ings">
          {ingredients.map((row, i) => (
            <div className="rf-ing" key={i}>
              <input
                className="input rf-ing-name"
                placeholder="Ingredient"
                value={row.name}
                onChange={(e) => setIngredient(i, { name: e.target.value })}
                aria-label="Ingredient name"
              />
              <input
                className="input rf-ing-qty"
                placeholder="Qty"
                inputMode="decimal"
                value={row.quantity}
                onChange={(e) => setIngredient(i, { quantity: e.target.value })}
                aria-label="Quantity"
              />
              <input
                className="input rf-ing-unit"
                placeholder="Unit"
                value={row.unit}
                onChange={(e) => setIngredient(i, { unit: e.target.value })}
                aria-label="Unit"
              />
              <button
                type="button"
                className="rf-ing-remove"
                aria-label="Remove ingredient"
                onClick={() => removeIngredient(i)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-secondary rf-add-ing" onClick={addIngredient}>
          Add ingredient
        </button>

        <hr className="rf-divider" />

        <div className="rf-section-head">
          <h6>Nutrition</h6>
          <span className="rf-section-rule" />
          {macrosSource === "estimated" && <span className="tag tag-outline rf-macros-tag">Estimated</span>}
        </div>
        <p className="rf-hint text-muted" style={{ marginTop: -4 }}>
          Per serving. Enter your own, or estimate from the ingredients above.
        </p>
        <div className="rf-macros">
          <div className="field">
            <label htmlFor="rf-cal">Calories</label>
            <input
              id="rf-cal"
              className="input"
              inputMode="numeric"
              value={calories}
              onChange={(e) => editMacro(setCalories, e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rf-protein">Protein (g)</label>
            <input
              id="rf-protein"
              className="input"
              inputMode="decimal"
              value={protein}
              onChange={(e) => editMacro(setProtein, e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rf-carb">Carbs (g)</label>
            <input
              id="rf-carb"
              className="input"
              inputMode="decimal"
              value={carb}
              onChange={(e) => editMacro(setCarb, e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rf-fat">Fat (g)</label>
            <input
              id="rf-fat"
              className="input"
              inputMode="decimal"
              value={fat}
              onChange={(e) => editMacro(setFat, e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ai rf-estimate"
          onClick={estimateMacros}
          disabled={estimating || improving || !canEstimate || menu.allowance.exhausted}
        >
          <Sparkles size={15} className="btn-ai-spark" aria-hidden />
          {estimating ? "Estimating…" : "Estimate macros"}
        </button>
        {canEstimate && <AllowanceNote source="estimate_macros_button" />}
        {!canEstimate && (
          <p className="rf-hint text-muted">
            Add a title and at least one ingredient to estimate.
          </p>
        )}
        {macrosSource === "estimated" && estimateIsRough && (
          <p className="rf-hint text-muted">
            Estimated — treat as a rough guide. Add serving size and ingredient amounts for a closer
            figure.
          </p>
        )}
        {estimateError && (
          <p className="rf-error" role="alert">
            {estimateError}
          </p>
        )}

        <hr className="rf-divider" />

        <div>
          <h6 style={{ margin: "0 0 8px" }}>Collections</h6>
          <div className="rf-collections">
            {collections.map((name) => (
              <span key={name} className="tag tag-accent rf-chip">
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() => setCollections((prev) => prev.filter((c) => c !== name))}
                >
                  <X size={12} aria-hidden />
                </button>
              </span>
            ))}
            {addingCollection ? (
              <input
                className="rf-collection-input"
                autoFocus
                list="rf-collection-suggestions"
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCollection(newCollection);
                  } else if (e.key === "Escape") {
                    setAddingCollection(false);
                    setNewCollection("");
                  }
                }}
                onBlur={() => addCollection(newCollection)}
                placeholder="Collection"
              />
            ) : (
              <button
                type="button"
                className="tag tag-outline rf-add-collection"
                onClick={() => setAddingCollection(true)}
              >
                <Plus size={12} aria-hidden style={{ marginRight: 3 }} /> Add
              </button>
            )}
            <datalist id="rf-collection-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>

        {formError && <p className="rf-form-error" role="alert">{formError}</p>}
      </form>

      <div className="rf-foot" hidden={!expanded}>
        {improveError ? (
          <p className="rf-error rf-foot-note" role="alert">
            {improveError}
          </p>
        ) : (
          canEstimate && (
            <p className="rf-hint text-muted rf-foot-note">
              Improve fills in missing amounts, method and macros — your own entries are kept.
            </p>
          )
        )}
        <div className="rf-foot-actions">
          {mode === "edit" && (
            <button
              type="button"
              className="btn btn-ghost rf-delete"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="btn btn-ai rf-improve"
            onClick={improveRecipe}
            disabled={estimating || improving || !canEstimate || menu.allowance.exhausted}
          >
            <Sparkles size={15} className="btn-ai-spark" aria-hidden />
            {improving ? "Improving…" : "Improve recipe"}
          </button>
          <button
            type="button"
            className="btn btn-primary rf-save"
            onClick={submit}
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create recipe"}
          </button>
        </div>
        <Link href={cancelHref} className="btn btn-ghost rf-cancel">
          Cancel
        </Link>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this recipe?"
          body="This permanently removes the recipe and its ingredients. It can't be undone."
          confirmLabel="Delete"
          onConfirm={doDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
