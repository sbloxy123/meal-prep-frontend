"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { ApiError, apiFetch, apiSend } from "@/lib/api";
import { logEvent } from "@/lib/analytics";
import { useMenu } from "@/lib/menu";
import { useToast } from "@/lib/toast";
import { useModalA11y } from "@/lib/use-modal";
import { pickStarters, TARGET, type DietFlag, type Scope } from "@/lib/starter-picker";
import { matchDishes } from "@/lib/dish-match";
import {
  STARTER_IMAGES,
  STARTER_RECIPES,
  type Protein,
  type StarterRecipe,
} from "@/lib/starter-recipes";
import type { RecipesResponse, UsualResult, UsualsResponse } from "@/lib/types";

// "Let's get you started" — five steps that turn an empty account into a
// usable kitchen in about a minute. Every step is skippable and the flow ends
// by actually putting recipes in the list, which is the payoff the first
// screen promises.
//
// Preferences are saved on leaving step 3 (PUT /household/dietary) because the
// answers are the durable value and must survive a seeding failure. The
// separate onboarding write, which stops the questionnaire being offered again,
// fires only on genuine completion.
//
// Step 4 asks what they actually cook. Those dishes become real recipes via
// POST /recipes/usuals — free, and deliberately not metered against the weekly
// AI pool. A dish that matches a curated starter uses the curated recipe
// instead: real photo, checked macros, properly stepped method, no AI call.

/** Hint stashed for the inspiration sheet when we hand a vegan/GF user over to
    the recipe generator, so it can honour the diet before R2 makes that
    automatic. */
export const INSPIRE_HINT_KEY = "fornetto:inspireHint";
/** Suppresses the wizard for this browser session after a soft dismiss. */
export const SNOOZE_KEY = "fornetto:onboardingSnoozed";

/** Kept byte-identical with the backend's USUALS_TAG. */
const USUALS_TAG = "My usuals";
/** Matches the backend's USUALS_MAX_DISHES / USUALS_MAX_TITLE_LEN, so the
    count we show is the count that gets written. */
const MAX_DISHES = 10;
const MAX_DISH_LEN = 80;
/** The server budgets 45s of generation plus writes. Without a ceiling here a
    hung request would lock the dialog with no way out. */
const USUALS_TIMEOUT_MS = 90_000;

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

/** Newlines and semicolons always separate dishes. Commas only do when it's
    all on one line — otherwise "chicken, leek and bacon pie" on its own line
    would arrive as two dishes. */
function parseDishes(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let parts = trimmed.split(/[\n;]+/);
  if (parts.length === 1) parts = trimmed.split(",");

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const dish = raw.trim().replace(/\s+/g, " ").slice(0, MAX_DISH_LEN);
    if (!dish) continue;
    const key = dish.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dish);
    if (out.length === MAX_DISHES) break;
  }
  return out;
}

/** One thing we're about to create: a curated recipe, with whatever tags it
    should carry (their own dishes also get "My usuals"). */
interface SeedItem {
  recipe: StarterRecipe;
  tags: string[];
}

/** A row in the YOURS list. Either a curated recipe we matched to what they
    typed, or a dish only the AI can write. */
type YoursItem =
  | { kind: "curated"; input: string; recipe: StarterRecipe }
  | { kind: "ai"; input: string };

type Phase = "idle" | "writing" | "adding" | "done";

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
  const menu = useMenu();
  const toast = useToast();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [proteins, setProteins] = useState<Set<Protein>>(() => new Set(DEFAULT_PROTEINS));
  const [diets, setDiets] = useState<Set<DietFlag>>(() => new Set());
  const [scope, setScope] = useState<Scope>("everyone");
  const [showRelaxed, setShowRelaxed] = useState(false);
  const [dishText, setDishText] = useState("");
  // Deselections rather than selections: everything offered starts ticked (this
  // is a curated payoff, so people untick rather than hunt), and deriving the
  // ticked set means a changed answer can't leave stale state behind.
  const [unticked, setUnticked] = useState<Set<string>>(() => new Set());
  const [untickedUsuals, setUntickedUsuals] = useState<Set<string>>(() => new Set());
  // "Show more ideas" is the opposite polarity — those start off.
  const [showMore, setShowMore] = useState(false);
  const [extraTicked, setExtraTicked] = useState<Set<string>>(() => new Set());
  const [phase, setPhase] = useState<Phase>("idle");
  const [added, setAdded] = useState(0);
  const [toAdd, setToAdd] = useState(0);
  const [writingNames, setWritingNames] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [usualsResults, setUsualsResults] = useState<UsualResult[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const prefsSaved = useRef(false);
  const loggedShown = useRef(false);
  const loggedTyped = useRef(false);

  // Top of the funnel. The ref keeps StrictMode's double-invoked effect (and
  // any re-render) from inflating it.
  const shownAt = useRef<number>(0);
  useEffect(() => {
    if (loggedShown.current) return;
    loggedShown.current = true;
    shownAt.current = Date.now();
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

  const dishes = useMemo(() => parseDishes(dishText), [dishText]);

  // Match against the same pool pickStarters uses, so a retake can't offer back
  // a recipe the household already owns.
  const available = useMemo(
    () => STARTER_RECIPES.filter((r) => !existingTitles?.has(r.title.toLowerCase())),
    [existingTitles],
  );

  /** Their dishes, with any curated recipe we can hand them instead of an AI
      draft, plus the starter titles those matches take out of the gap list. */
  const { yours, suppressed } = useMemo(() => {
    const matched = matchDishes(dishes, available);
    const out: YoursItem[] = [];
    const drop = new Set<string>();
    for (const { input, matches } of matched) {
      for (const r of matches) drop.add(r.title);
      out.push(matches[0] ? { kind: "curated", input, recipe: matches[0] } : { kind: "ai", input });
    }
    return { yours: out, suppressed: drop };
  }, [dishes, available]);

  // Which list step 5 offers: the honest picks, or the relaxed set when the
  // user asked to see the starters anyway.
  const offeredBase = showRelaxed ? result.relaxed : result.picks;
  const offeredRest = showRelaxed ? result.relaxedRest : result.rest;

  /** Still eight suggestions even after their own dishes take some out —
      backfilled from the same pool, in the same deterministic order. */
  const gaps = useMemo(() => {
    const kept = offeredBase.filter((r) => !suppressed.has(r.title));
    const fill = offeredRest.filter((r) => !suppressed.has(r.title));
    return [...kept, ...fill].slice(0, TARGET);
  }, [offeredBase, offeredRest, suppressed]);

  const extras = useMemo(() => {
    const shown = new Set(gaps.map((r) => r.title));
    return offeredRest.filter((r) => !suppressed.has(r.title) && !shown.has(r.title));
  }, [gaps, offeredRest, suppressed]);

  const chosenUsuals = yours.filter((y) => !untickedUsuals.has(y.input));
  const chosenGaps = gaps.filter((r) => !unticked.has(r.title));
  const chosenExtras = extras.filter((r) => extraTicked.has(r.title));

  // A thin or unservable pool is no longer a dead end once they've typed their
  // own dishes — those still get created, and the generator is offered
  // afterwards rather than instead.
  const handOff =
    result.handOff && !showRelaxed && (chosenUsuals.length === 0 || result.unservable.length > 0);

  const totalChosen =
    chosenUsuals.length + (handOff ? 0 : chosenGaps.length + chosenExtras.length);

  // One POST can't report a real count, so name what's being written instead of
  // faking a progress bar.
  useEffect(() => {
    if (phase !== "writing" || writingNames.length === 0) return;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, [phase, writingNames.length]);

  function toggle<T>(set: Set<T>, value: T, apply: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  /** Escape / backdrop — deliberately soft. An accidental tap shouldn't cost
      the questionnaire for good, so this only hides it for the session. */
  function dismiss() {
    if (phase !== "idle" && phase !== "done") return;
    try {
      sessionStorage.setItem(SNOOZE_KEY, "1");
    } catch {
      // Private mode — it'll simply reappear on the next load.
    }
    logEvent("onboarding_skipped", { step, soft: true });
    onClose("snoozed");
  }

  useModalA11y(ref, dismiss);

  // Where focus goes on each step. Declared after useModalA11y deliberately:
  // that hook focuses the first control on mount, and effects run in
  // declaration order, so this one gets the last word.
  //
  // The primary action, not the heading — landing on Skip was too easy, and
  // Enter should just carry you forward. Step 4 is the exception: it asks you
  // to type, so focus the box. The title is aria-live, so screen readers still
  // hear the new step even though focus sits on a button.
  useEffect(() => {
    if (phase === "writing" || phase === "adding") return;
    const node = ref.current;
    if (!node) return;
    const target =
      step === 4
        ? node.querySelector<HTMLElement>("#ob-dishes")
        : node.querySelector<HTMLElement>(".ob-primary:not([disabled])");
    target?.focus();
  }, [step, phase]);

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
      // How long the questionnaire took, shown → done.
      ms: shownAt.current ? Date.now() - shownAt.current : undefined,
      // Under a hand-off the starter list is never created, so don't report it
      // as chosen — the funnel would show recipes that never existed.
      offered: handOff ? 0 : gaps.length,
      chosen: handOff ? 0 : chosenGaps.length + chosenExtras.length,
      diets: dietList,
      scope,
      proteins: proteinList,
      usuals: dishes.length,
      usualsWritten: usualsResults?.filter((r) => r.status === "written").length ?? 0,
      usualsTitleOnly: usualsResults?.filter((r) => r.status === "title_only").length ?? 0,
      ...meta,
    });
  }

  /** Hand a vegan/GF (or too-thin) household to the generator, which can write
      recipes the starter set can't offer. */
  async function goToGenerator(alreadyAdded = 0) {
    logEvent("onboarding_ai_handoff", { diets: dietList });
    try {
      if (dietList.length > 0) sessionStorage.setItem(INSPIRE_HINT_KEY, describe(dietList));
    } catch {
      /* ignore */
    }
    if (phase !== "done") await markComplete({ added: alreadyAdded });
    await menu.refresh();
    onClose("completed");
    router.push("/recipes?inspire=1");
  }

  /** Their typed dishes, written up server-side. Returns the notice alongside
      the results rather than only setting state: commit() has to branch on it
      in the same tick, where the `notice` state still holds its old value. */
  async function writeUsuals(
    aiDishes: string[],
  ): Promise<{ results: UsualResult[]; notice: string | null }> {
    if (aiDishes.length === 0) return { results: [], notice: null };
    setWritingNames(aiDishes);
    setPhase("writing");
    try {
      const res = await apiFetch<UsualsResponse>("/recipes/usuals", {
        method: "POST",
        body: JSON.stringify({ dishes: aiDishes }),
        signal: AbortSignal.timeout(USUALS_TIMEOUT_MS),
      });
      return { results: res.results ?? [], notice: null };
    } catch (err) {
      // Never dead-end: say what happened and carry on to the starters, which
      // are the part we can always deliver.
      let message =
        "We couldn’t write your own recipes just now — you can add them from Add recipe.";
      if (err instanceof ApiError && err.status === 429) {
        message = "You’ve done this a few times today.";
        try {
          const body = JSON.parse(err.body) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          /* keep the fallback */
        }
      }
      setNotice(message);
      return { results: [], notice: message };
    }
  }

  async function commit() {
    if (inFlight.current || totalChosen === 0) return;
    inFlight.current = true;
    setError(null);
    setFailed([]);
    setAdded(0);
    setNotice(null);

    // Curated matches are created here, not by the AI — better recipes, no
    // call, and they carry the same tag so they read as one set.
    const curated: SeedItem[] = chosenUsuals
      .filter((y): y is Extract<YoursItem, { kind: "curated" }> => y.kind === "curated")
      .map((y) => ({ recipe: y.recipe, tags: [USUALS_TAG, ...y.recipe.tags] }));
    // A retry resends only what hasn't already been written — anything else
    // would create their dishes twice.
    const settled = new Set(
      (usualsResults ?? []).filter((r) => r.status !== "failed").map((r) => r.input.toLowerCase()),
    );
    const aiDishes = chosenUsuals
      .filter((y) => y.kind === "ai" && !settled.has(y.input.toLowerCase()))
      .map((y) => y.input);

    const attempt = async (items: SeedItem[]) => {
      for (const { recipe: r, tags } of items) {
        const img = STARTER_IMAGES[r.title];
        // Sequential — parallel POSTs race the backend's shared tag creation.
        await apiFetch("/recipes", {
          method: "POST",
          body: JSON.stringify({
            recipe_source: "starter",
            recipe_title: r.title,
            recipe_instructions: r.instructions,
            tags,
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
    const missing = async (want: SeedItem[]) => {
      const after = await apiFetch<RecipesResponse>("/recipes");
      const have = new Set(after.recipes.map((r) => r.title.toLowerCase()));
      return want.filter((it) => !have.has(it.recipe.title.toLowerCase()));
    };

    try {
      // Their own dishes first — that's the part they're waiting for.
      const { results: fresh, notice: usualsNotice } = await writeUsuals(aiDishes);
      // Keep what earlier attempts achieved; a retry only reports on what it
      // actually resent.
      const prior = usualsResults ?? [];
      const written = [
        ...prior.filter((p) => !fresh.some((f) => f.input === p.input)),
        ...fresh,
      ];
      setUsualsResults(written);

      // Pass 2: the AI may have resolved a dish to something our pre-pass
      // didn't match, so dedupe the starters against what actually came back.
      const claimed = new Set<string>();
      for (const r of written) {
        if (r.canonical) claimed.add(r.canonical.toLowerCase());
        if (r.title) claimed.add(r.title.toLowerCase());
      }
      const starters: SeedItem[] = handOff
        ? []
        : [...chosenGaps, ...chosenExtras]
            .filter((r) => !claimed.has(r.title.toLowerCase()))
            .map((r) => ({ recipe: r, tags: r.tags }));

      // On a retry, reconcile first: the curated recipes and starters that
      // landed last time must not be created a second time.
      let work = [...curated, ...starters];
      if (usualsResults !== null) work = await missing(work);
      setToAdd(work.length);
      setPhase("adding");

      await attempt(work).catch(() => {});
      let gone = await missing(work);
      if (gone.length > 0) {
        await attempt(gone).catch(() => {});
        gone = await missing(work);
      }

      const landed = work.length - gone.length;
      const titleOnly = written.filter((r) => r.status !== "written");
      await savePrefs();
      // Pass the counts explicitly: markComplete's defaults read usualsResults
      // from state, which this closure was created before setting.
      await markComplete({
        added: landed + written.filter((r) => r.recipeId).length,
        usualsWritten: written.filter((r) => r.status === "written").length,
        usualsTitleOnly: written.filter((r) => r.status === "title_only").length,
      });
      await menu.refresh();

      // Only stop to explain when there's something to explain.
      if (gone.length === 0 && titleOnly.length === 0 && !usualsNotice && !handOff) {
        const total = landed + written.filter((r) => r.recipeId).length;
        toast.show(`Added ${total} recipe${total === 1 ? "" : "s"} to your collection.`);
        onClose("completed");
        return;
      }
      if (gone.length > 0) {
        setFailed(gone.map((it) => it.recipe.title));
        setError(`Added ${landed} of ${work.length} starter recipes.`);
      }
      setPhase("done");
    } catch {
      setError("Couldn’t add those. Please try again.");
      setPhase("done");
    } finally {
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
      return;
    }
    if (step === 4) {
      // Fired once on leaving, 0 when they typed nothing — the pair with the
      // server's onboarding_usuals event is the drop-off measure.
      if (!loggedTyped.current) {
        loggedTyped.current = true;
        logEvent("onboarding_usuals_typed", { dishes: dishes.length });
      }
      setStep(5);
    }
  }

  const busy = phase === "writing" || phase === "adding";
  const titleOnly = usualsResults?.filter((r) => r.status !== "written") ?? [];
  const unservableLabel = describe(result.unservable);
  const dots = (
    <div
      className="ob-dots"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
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
          <h2 id="ob-title" className="dialog-title" aria-live="polite">
            {step === 1 && "Let’s get you started"}
            {step === 2 && "What does your household eat?"}
            {step === 3 && "Anything we should work around?"}
            {step === 4 && "What do you cook most?"}
            {step === 5 &&
              (phase === "done"
                ? "Almost there"
                : handOff && chosenUsuals.length === 0
                  ? "Saved — let’s write you some recipes"
                  : "Here’s your kitchen")}
          </h2>
        </div>

        <div className="ob-body">
          {step === 1 && (
            <p className="dialog-body" style={{ margin: 0 }}>
              A few quick questions and we’ll fill your kitchen. Takes under a minute.
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

              {/* Say it as soon as they tick it, never as a surprise later. */}
              {result.unservable.length > 0 && (
                <p className="ob-note">
                  Noted — we’ll remember that. Our ready-made recipes aren’t {unservableLabel},
                  so rather than hand you a list you can’t cook, we’ll write you some that fit.
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

          {step === 4 && (
            <>
              <p className="dialog-body" style={{ margin: 0 }}>
                Name the meals you actually cook and we’ll write them up — one per line. This
                one’s on us; it doesn’t use any credits.
              </p>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="ob-dishes">Your go-to meals</label>
                <textarea
                  id="ob-dishes"
                  className="input ob-textarea"
                  rows={5}
                  value={dishText}
                  placeholder={"spag bol\nchicken curry\nmum’s lasagne"}
                  onChange={(e) => setDishText(e.target.value)}
                />
              </div>
              <p className="ob-count text-muted">
                {dishes.length} of {MAX_DISHES}
                {dishes.length >= MAX_DISHES && " — we’ll write the first ten"}
              </p>
              <p className="ob-note">
                These come back as first drafts in your handwriting. Type “mum’s lasagne” and
                you’ll get a lasagne, called that, ready for you to change to how she actually
                made it.
              </p>
            </>
          )}

          {step === 5 && (
            <>
              {phase === "idle" && (
                <p className="dialog-body" style={{ margin: 0 }}>
                  {chosenUsuals.length > 0
                    ? "Your meals, plus a few to round out the week. Untick anything you don’t fancy — you can edit or delete them later."
                    : `${gaps.length} recipe${gaps.length === 1 ? "" : "s"} picked for what you eat. Untick anything you don’t fancy — you can edit or delete them later.`}
                </p>
              )}

              {yours.length > 0 && (
                <div className="ob-group">
                  <h3 className="ob-subhead">Yours</h3>
                  <div className="starter-list">
                    {yours.map((y) => {
                      const on = !untickedUsuals.has(y.input);
                      return (
                        <label key={y.input} className={`starter-item ${on ? "is-on" : ""}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={busy}
                            onChange={() => toggle(untickedUsuals, y.input, setUntickedUsuals)}
                          />
                          <span className="starter-item-main">
                            <span className="starter-item-title">
                              {y.kind === "curated" ? y.recipe.title : y.input}
                            </span>
                            {y.kind === "curated" ? (
                              <span className="ob-said text-muted">you said: “{y.input}”</span>
                            ) : (
                              <span className="starter-item-ings text-muted">
                                we’ll write this one for you
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {handOff ? (
                <p className="ob-note">
                  {result.unservable.length > 0
                    ? `Our ready-made recipes aren’t ${unservableLabel}, so we won’t pad your list with things you can’t cook. The generator writes recipes that fit — it takes about a minute.`
                    : "We’ve only got a recipe or two that fit, and the generator can do better. It takes about a minute."}
                </p>
              ) : (
                <div className="ob-group">
                  {yours.length > 0 && <h3 className="ob-subhead">To fill the gaps</h3>}
                  {showRelaxed && result.unservable.length > 0 && (
                    <p className="ob-note">
                      These aren’t {unservableLabel} — you’d be swapping a few ingredients.
                    </p>
                  )}
                  <div className="starter-list">
                    {gaps.map((r) => {
                      const on = !unticked.has(r.title);
                      return (
                        <label key={r.title} className={`starter-item ${on ? "is-on" : ""}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={busy}
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

                  {/* Outside .starter-list — each item is a <label> wrapping a
                      checkbox, so a button can't live inside one. */}
                  {extras.length > 0 && !showMore && (
                    <button
                      type="button"
                      className="ob-more"
                      disabled={busy}
                      onClick={() => setShowMore(true)}
                    >
                      Show more ideas ({extras.length})
                    </button>
                  )}
                  {showMore && extras.length > 0 && (
                    <div className="starter-list">
                      {extras.map((r) => {
                        const on = extraTicked.has(r.title);
                        return (
                          <label key={r.title} className={`starter-item ${on ? "is-on" : ""}`}>
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={busy}
                              onChange={() => toggle(extraTicked, r.title, setExtraTicked)}
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
                  )}
                </div>
              )}

              {phase === "writing" && (
                <p className="ob-progress text-muted" aria-live="polite">
                  Writing your recipes… {writingNames[tick % writingNames.length]}
                </p>
              )}
              {phase === "adding" && (
                <p className="ob-progress text-muted" aria-live="polite">
                  Adding {Math.min(added + 1, toAdd)} of {toAdd}…
                </p>
              )}

              {notice && <p className="ob-note">{notice}</p>}

              {phase === "done" && titleOnly.length > 0 && (
                <p className="ob-note">
                  We couldn’t write {titleOnly.length === 1 ? "one of these" : "some of these"} in
                  full, so {titleOnly.length === 1 ? "it’s" : "they’re"} saved as{" "}
                  {titleOnly.length === 1 ? "a recipe" : "recipes"} with just the name for you to
                  fill in: {titleOnly.map((r) => r.title).join(", ")}.
                </p>
              )}

              {error && (
                <p className="sc-error" role="alert" style={{ margin: 0 }}>
                  {error}{" "}
                  {failed.length > 0 && (
                    <button type="button" className="ai-allowance-link" onClick={commit}>
                      Try again
                    </button>
                  )}
                </p>
              )}
            </>
          )}
        </div>

        <div className="ob-actions">
          {/* Skip sits over here, quiet and away from the primary action: it's
              a real "don't ask me again", so it shouldn't read as the twin of
              Next or sit under a thumb heading for it. */}
          <div className="ob-actions-left">
            {/* Hidden once the work starts: going back and forward again would
                create everything twice. */}
            {step > 1 && phase === "idle" && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              >
                Back
              </button>
            )}
            {step < 5 && (
              <button type="button" className="ob-skip" onClick={skipForGood}>
                {step === 1 ? "Skip for now" : "Skip"}
              </button>
            )}
          </div>
          <div className="ob-actions-right">
            {step < 5 && (
              <button type="button" className="btn btn-primary ob-primary" onClick={next}>
                {step === 1 ? "Start" : "Next"}
              </button>
            )}

            {step === 5 && phase === "done" && (
              <>
                {handOff && (
                  <button type="button" className="btn btn-ai" onClick={() => goToGenerator(added)}>
                    <Sparkles size={15} className="btn-ai-spark" aria-hidden />
                    Generate more
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary ob-primary"
                  onClick={() => onClose("completed")}
                >
                  Done
                </button>
              </>
            )}

            {step === 5 && phase !== "done" && (
              <>
                {handOff && result.relaxed.length > 0 && !busy && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowRelaxed(true)}
                  >
                    Show me the starters anyway
                  </button>
                )}
                {handOff && chosenUsuals.length === 0 ? (
                  <button type="button" className="btn btn-ai ob-primary" onClick={() => goToGenerator(0)}>
                    <Sparkles size={15} className="btn-ai-spark" aria-hidden />
                    Generate recipes
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary ob-primary"
                    onClick={commit}
                    disabled={busy || totalChosen === 0}
                  >
                    {busy
                      ? "Adding…"
                      : totalChosen === 0
                        ? "Add recipes"
                        : `Add ${totalChosen} recipe${totalChosen === 1 ? "" : "s"}`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
