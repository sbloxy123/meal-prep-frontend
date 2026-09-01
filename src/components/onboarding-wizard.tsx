"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { apiFetch, apiSend } from "@/lib/api";
import { logEvent } from "@/lib/analytics";
import { useMenu } from "@/lib/menu";
import { useToast } from "@/lib/toast";
import { useModalA11y } from "@/lib/use-modal";
import { pickStarters, type DietFlag, type Scope } from "@/lib/starter-picker";
import { STARTER_IMAGES, type Protein, type StarterRecipe } from "@/lib/starter-recipes";
import type { RecipesResponse } from "@/lib/types";

// "Let's get you started" — four steps that turn an empty account into a usable
// kitchen in about thirty seconds. Every step is skippable and the flow ends by
// actually putting recipes in the list, which is the payoff the first screen
// promises.
//
// Preferences are saved on leaving step 3 (PUT /household/dietary) because the
// answers are the durable value and must survive a seeding failure. The
// separate onboarding write, which stops the questionnaire being offered again,
// fires only on genuine completion.

/** Hint stashed for the inspiration sheet when we hand a vegan/GF user over to
    the recipe generator, so it can honour the diet before R2 makes that
    automatic. */
export const INSPIRE_HINT_KEY = "fornetto:inspireHint";
/** Suppresses the wizard for this browser session after a soft dismiss. */
export const SNOOZE_KEY = "fornetto:onboardingSnoozed";

const PROTEIN_CHOICES: { value: Protein; label: string }[] = [
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "pork", label: "Pork" },
  { value: "lamb", label: "Lamb" },
  { value: "fish", label: "Fish" },
];

const DIET_CHOICES: { value: DietFlag; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "dairy-free", label: "Dairy-free" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "vegan", label: "Vegan" },
];

/** Lamb is off by default — one recipe carries it and it's the least common. */
const DEFAULT_PROTEINS: Protein[] = ["chicken", "beef", "pork", "fish"];

function describe(diets: DietFlag[]): string {
  const labels = diets.map((d) => DIET_CHOICES.find((c) => c.value === d)?.label.toLowerCase() ?? d);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function OnboardingWizard({
  entry,
  existingTitles,
  onClose,
}: {
  entry: "auto" | "account";
  existingTitles?: Set<string>;
  onClose: (outcome: "completed" | "skipped" | "snoozed") => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const menu = useMenu();
  const toast = useToast();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [proteins, setProteins] = useState<Set<Protein>>(() => new Set(DEFAULT_PROTEINS));
  const [diets, setDiets] = useState<Set<DietFlag>>(() => new Set());
  const [scope, setScope] = useState<Scope>("everyone");
  const [showRelaxed, setShowRelaxed] = useState(false);
  // Deselections rather than selections: everything offered starts ticked (this
  // is a curated payoff, so people untick rather than hunt), and deriving the
  // ticked set means a changed answer can't leave stale state behind.
  const [unticked, setUnticked] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const prefsSaved = useRef(false);
  const loggedShown = useRef(false);

  // Top of the funnel. The ref keeps StrictMode's double-invoked effect (and
  // any re-render) from inflating it.
  useEffect(() => {
    if (loggedShown.current) return;
    loggedShown.current = true;
    logEvent("onboarding_shown", { entry });
  }, [entry]);

  const dietList = useMemo(() => [...diets], [diets]);
  const proteinList = useMemo(
    () => PROTEIN_CHOICES.map((c) => c.value).filter((p) => proteins.has(p)),
    [proteins],
  );

  const result = useMemo(
    () => pickStarters({ proteins: proteinList, diets: dietList, scope, existingTitles }),
    [proteinList, dietList, scope, existingTitles],
  );

  // Which list step 4 offers: the honest picks, or the relaxed set when the
  // user asked to see the starters anyway.
  const offered = showRelaxed ? result.relaxed : result.picks;
  const handOff = result.handOff && !showRelaxed;

  // useModalA11y focuses the first control once on mount only, so each step has
  // to move focus itself. Keying the dialog per step would re-run the modal
  // stack push/pop and the scroll lock, so move focus instead of remounting.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const chosen = offered.filter((r) => !unticked.has(r.title));

  function toggle<T>(set: Set<T>, value: T, apply: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  /** Escape / backdrop — deliberately soft. An accidental tap shouldn't cost
      the questionnaire for good, so this only hides it for the session. */
  function dismiss() {
    if (saving) return;
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {
      // Private mode — it'll simply reappear on the next load.
    }
    logEvent("onboarding_skipped", { step, soft: true });
    onClose("snoozed");
  }

  useModalA11y(ref, dismiss);

  /** The explicit Skip button — a real "don't ask me again". */
  async function skipForGood() {
    logEvent("onboarding_skipped", { step, soft: false });
    try {
      await apiSend("/household/onboarding", {
        method: "PUT",
        body: JSON.stringify({
          outcome: "skipped",
          ...(step > 2 ? { proteins: proteinList, diets: dietList, scope } : {}),
        }),
      });
      await menu.refresh();
    } catch {
      // Never block leaving; the gate falls back to the session snooze.
      try {
        sessionStorage.setItem(SNOOZE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    onClose("skipped");
  }

  /** Leaving step 3: persist the answers before anything can go wrong with
      seeding. Failure here must not block the user reaching the payoff. */
  async function savePrefs() {
    if (prefsSaved.current) return;
    prefsSaved.current = true;
    try {
      await apiSend("/household/dietary", {
        method: "PUT",
        body: JSON.stringify({ proteins: proteinList, diets: dietList, scope }),
      });
    } catch {
      prefsSaved.current = false; // retried alongside the completion write
    }
  }

  async function markComplete(meta: Record<string, unknown>) {
    try {
      await apiSend("/household/onboarding", {
        method: "PUT",
        body: JSON.stringify({
          outcome: "completed",
          proteins: proteinList,
          diets: dietList,
          scope,
        }),
      });
    } catch {
      // The questionnaire may be offered again; the answers are what matter.
    }
    logEvent("onboarding_completed", {
      offered: offered.length,
      chosen: chosen.length,
      diets: dietList,
      scope,
      proteins: proteinList,
      ...meta,
    });
  }

  /** Hand a vegan/GF (or too-thin) household to the generator, which can write
      recipes the starter set can't offer. */
  async function goToGenerator() {
    logEvent("onboarding_ai_handoff", { diets: dietList });
    try {
      if (dietList.length > 0) sessionStorage.setItem(INSPIRE_HINT_KEY, describe(dietList));
    } catch {
      /* ignore */
    }
    await markComplete({ added: 0 });
    await menu.refresh();
    onClose("completed");
    router.push("/recipes?inspire=1");
  }

  async function seed() {
    if (inFlight.current || chosen.length === 0) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    setFailed([]);
    setAdded(0);

    const attempt = async (recipes: StarterRecipe[]) => {
      for (const r of recipes) {
        const img = STARTER_IMAGES[r.title];
        // Sequential — parallel POSTs race the backend's shared tag creation.
        await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({
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
        setAdded((n) => n + 1);
      }
    };

    // POST /recipes answers 201 even when the insert fails (createRecipe
    // swallows its error), so a 201 is not proof. Reconcile against the real
    // list and retry once for anything that didn't land.
    const missing = async (want: StarterRecipe[]) => {
      const after = await apiFetch<RecipesResponse>("/recipes");
      const have = new Set(after.recipes.map((r) => r.title.toLowerCase()));
      return want.filter((r) => !have.has(r.title.toLowerCase()));
    };

    try {
      await attempt(chosen).catch(() => {});
      let gone = await missing(chosen);
      if (gone.length > 0) {
        await attempt(gone).catch(() => {});
        gone = await missing(chosen);
      }

      const landed = chosen.length - gone.length;
      await savePrefs();
      await markComplete({ added: landed });
      await menu.refresh();

      if (gone.length === 0) {
        toast.show(`Added ${landed} recipe${landed === 1 ? "" : "s"} to your collection.`);
        onClose("completed");
        return;
      }
      setFailed(gone.map((r) => r.title));
      setError(`Added ${landed} of ${chosen.length}.`);
    } catch {
      setError("Couldn’t add those. Please try again.");
    } finally {
      setSaving(false);
      inFlight.current = false;
    }
  }

  function next() {
    if (step === 1) {
      logEvent("onboarding_started", {});
      setStep(2);
      return;
    }
    if (step === 2) {
      logEvent("onboarding_step", { step: 2 });
      setStep(3);
      return;
    }
    if (step === 3) {
      logEvent("onboarding_step", { step: 3 });
      void savePrefs();
      setStep(4);
    }
  }

  const unservableLabel = describe(result.unservable);
  const dots = (
    <div
      className="ob-dots"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of 4`}
    >
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`ob-dot${i <= step ? " is-on" : ""}`} aria-hidden />
      ))}
    </div>
  );

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 70 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className="dialog ob-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ob-title"
        ref={ref}
      >
        <div className="ob-head">
          {dots}
          <h2 id="ob-title" className="dialog-title" tabIndex={-1} ref={headingRef}>
            {step === 1 && "Let’s get you started"}
            {step === 2 && "What does your household eat?"}
            {step === 3 && "Anything we should work around?"}
            {step === 4 && (handOff ? "Saved — let’s write you some recipes" : "Here’s a starter kitchen")}
          </h2>
        </div>

        <div className="ob-body">
          {step === 1 && (
            <p className="dialog-body" style={{ margin: 0 }}>
              Three quick questions and we’ll fill your kitchen. Takes about 30 seconds.
            </p>
          )}

          {step === 2 && (
            <>
              <p className="dialog-body" style={{ margin: 0 }}>
                Tick everything that gets eaten. You can change this any time.
              </p>
              <div className="ob-choices">
                {PROTEIN_CHOICES.map((c) => {
                  const on = proteins.has(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      className={`ob-choice${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggle(proteins, c.value, setProteins)}
                    >
                      {c.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`ob-choice ob-choice-wide${proteins.size === 0 ? " is-on" : ""}`}
                  aria-pressed={proteins.size === 0}
                  onClick={() => setProteins(new Set())}
                >
                  We don’t eat much meat
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="dialog-body" style={{ margin: 0 }}>
                Leave it blank if not — most people do.
              </p>
              <div className="ob-choices">
                {DIET_CHOICES.map((c) => {
                  const on = diets.has(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      className={`ob-choice${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => toggle(diets, c.value, setDiets)}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Say it as soon as they tick it, never as a surprise on step 4. */}
              {result.unservable.length > 0 && (
                <p className="ob-note">
                  Noted — we’ll remember that. Our ready-made recipes aren’t {unservableLabel},
                  so rather than hand you a list you can’t cook, we’ll point you at the recipe
                  generator. It writes recipes that fit.
                </p>
              )}

              {diets.size > 0 && (
                <>
                  <h3 className="ob-subhead">Who’s that for?</h3>
                  <div className="ob-choices">
                    <button
                      type="button"
                      className={`ob-choice${scope === "me" ? " is-on" : ""}`}
                      aria-pressed={scope === "me"}
                      onClick={() => setScope("me")}
                    >
                      Just me
                    </button>
                    <button
                      type="button"
                      className={`ob-choice${scope === "everyone" ? " is-on" : ""}`}
                      aria-pressed={scope === "everyone"}
                      onClick={() => setScope("everyone")}
                    >
                      Everyone in the kitchen
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {step === 4 && handOff && (
            <p className="dialog-body" style={{ margin: 0 }}>
              Your answers are saved.{" "}
              {result.unservable.length > 0
                ? `Our starter recipes aren’t ${unservableLabel}, so rather than give you a list you can’t use, the generator can write some that fit.`
                : "We’ve only got a recipe or two that fit, and the generator can do better."}{" "}
              It takes about a minute.
            </p>
          )}

          {step === 4 && !handOff && (
            <>
              <p className="dialog-body" style={{ margin: 0 }}>
                {offered.length} recipe{offered.length === 1 ? "" : "s"} picked for what you eat.
                Untick anything you don’t fancy — you can edit or delete them later.
              </p>
              {showRelaxed && result.unservable.length > 0 && (
                <p className="ob-note">
                  These aren’t {unservableLabel} — you’d be swapping a few ingredients.
                </p>
              )}
              <div className="starter-list">
                {offered.map((r) => {
                  const on = !unticked.has(r.title);
                  return (
                    <label key={r.title} className={`starter-item ${on ? "is-on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={saving}
                        onChange={() => toggle(unticked, r.title, setUnticked)}
                      />
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
              {saving && (
                <p className="ob-progress text-muted">
                  Adding {Math.min(added + 1, chosen.length)} of {chosen.length}…
                </p>
              )}
              {error && (
                <p className="sc-error" role="alert" style={{ margin: 0 }}>
                  {error}{" "}
                  {failed.length > 0 && (
                    <button type="button" className="ai-allowance-link" onClick={seed}>
                      Try again
                    </button>
                  )}
                </p>
              )}
            </>
          )}
        </div>

        <div className="ob-actions">
          <div>
            {step > 1 && !saving && (
              <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                Back
              </button>
            )}
          </div>
          <div className="ob-actions-right">
            {step < 4 && (
              <button type="button" className="btn btn-ghost" onClick={skipForGood}>
                {step === 1 ? "Skip for now" : "Skip"}
              </button>
            )}
            {step < 4 && (
              <button type="button" className="btn btn-primary" onClick={next}>
                {step === 1 ? "Start" : "Next"}
              </button>
            )}
            {step === 4 && handOff && (
              <>
                {result.relaxed.length > 0 && (
                  <button type="button" className="btn btn-ghost" onClick={() => setShowRelaxed(true)}>
                    Show me the starters anyway
                  </button>
                )}
                <button type="button" className="btn btn-ai" onClick={goToGenerator}>
                  <Sparkles size={15} className="btn-ai-spark" aria-hidden />
                  Generate recipes
                </button>
              </>
            )}
            {step === 4 && !handOff && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={seed}
                disabled={saving || chosen.length === 0}
              >
                {saving
                  ? "Adding…"
                  : chosen.length === 0
                    ? "Add recipes"
                    : `Add ${chosen.length} recipe${chosen.length === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
