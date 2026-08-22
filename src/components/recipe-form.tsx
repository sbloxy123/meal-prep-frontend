"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { ApiError, apiFetch, apiSend } from "@/lib/api";
import { useMenu } from "@/lib/menu";
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
}

type IngredientRow = { name: string; quantity: string; unit: string };

// Postgres numeric / possibly-null macro value → the string an <input> wants.
function numToInput(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

export function RecipeForm({ mode, recipeId, initial = {} }: RecipeFormProps) {
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

  async function estimateMacros() {
    if (estimating || !canEstimate) return;
    setEstimating(true);
    setEstimateError("");
    const rows = ingredients.filter((r) => r.name.trim());
    try {
      const res = await apiFetch<{
        calories: number | null;
        protein_g: number | null;
        carb_g: number | null;
        fat_g: number | null;
      }>("/recipes/estimate-macros", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          servings: servings.trim() ? Number(servings) : undefined,
          ingredients: rows.map((r) => ({
            name: r.name.trim(),
            quantity: r.quantity.trim() || undefined,
            unit: r.unit.trim() || undefined,
          })),
        }),
      });
      setCalories(numToInput(res.calories));
      setProtein(numToInput(res.protein_g));
      setCarb(numToInput(res.carb_g));
      setFat(numToInput(res.fat_g));
      setMacrosSource("estimated");
    } catch (err) {
      setEstimateError(
        err instanceof ApiError && err.status === 429
          ? "Estimate limit reached — 20 per 6 hours. Try again later."
          : "Couldn’t estimate macros. Please try again.",
      );
    } finally {
      setEstimating(false);
    }
  }

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
    await apiSend(`/recipes/${recipeId}`, { method: "DELETE" });
    await menu.refresh();
    setConfirmDelete(false);
    router.push("/recipes");
  }

  const titleError = errors.recipe_title?.[0];

  return (
    <div className="rf">
      <header className="rf-head">
        <div>
          <div className="rf-kicker">{mode === "edit" ? "Editing" : "New recipe"}</div>
          <h1 className="rf-title">Recipe details</h1>
        </div>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancel
        </Link>
      </header>

      <form
        className="rf-body"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ImageDrop value={photo} onChange={setPhoto} />

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
          className="btn btn-secondary rf-estimate"
          onClick={estimateMacros}
          disabled={estimating || !canEstimate}
        >
          {estimating ? "Estimating…" : "Estimate macros"}
        </button>
        {!canEstimate && (
          <p className="rf-hint text-muted">Add a title and at least one ingredient to estimate.</p>
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

      <div className="rf-foot">
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
          className="btn btn-primary rf-save"
          onClick={submit}
          disabled={saving || !title.trim()}
        >
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create recipe"}
        </button>
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
