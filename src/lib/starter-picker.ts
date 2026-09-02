// Chooses a starter kitchen from the questionnaire answers. Pure and
// deterministic — the same answers always give the same list, which keeps the
// onboarding funnel and any support conversation reproducible.

import {
  STARTER_RECIPES,
  isDairyFree,
  isPescatarian,
  isVegetarian,
  type Protein,
  type StarterRecipe,
} from "./starter-recipes";

/** Kept byte-identical with the backend's lib/dietary.js. */
export type DietFlag = "vegetarian" | "vegan" | "pescatarian" | "dairy-free" | "gluten-free";
export type Scope = "me" | "everyone";

/** A week of dinners minus a couple of takeaway/leftover nights. Enough that
    This week and the shopping list are immediately real, few enough to fit the
    preview without heavy scrolling and to seed in a couple of seconds. */
export const TARGET = 8;
/** Below this the pool is too thin to call a starter kitchen — we say so and
    offer the recipe generator instead of a near-empty list. */
export const MIN_GOOD = 4;

/** Diets the starter set genuinely cannot serve. Vegan: every meat-free recipe
    here contains cheese, butter or egg. Gluten-free: not inferable (see
    DietaryClaim). Recorded as a preference either way — the AI honours it. */
const UNSERVABLE: DietFlag[] = ["vegan", "gluten-free"];

/** Share of the list that honours a personal ("just me") dietary need. Matches
    the 60/40 blend the AI suggestions use. */
const ON_DIET_SHARE = 0.6;

export interface PickInput {
  proteins: Protein[];
  diets: DietFlag[];
  scope: Scope;
  /** Lowercased titles the household already has, so a retake can't re-add. */
  existingTitles?: Set<string>;
}

export interface PickResult {
  picks: StarterRecipe[];
  /** The data can't honour these answers — show the AI hand-off instead. */
  handOff: boolean;
  /** Which chosen diets we can't serve, for the honest copy. */
  unservable: DietFlag[];
  /** Picks ignoring the diet filter, for "show me the starters anyway". */
  relaxed: StarterRecipe[];
  /** Everything else the same pool could have offered, same order, for the
      "Show more ideas" toggle. Never overlaps `picks`. */
  rest: StarterRecipe[];
  /** The equivalent remainder for `relaxed`. */
  relaxedRest: StarterRecipe[];
}

function dietPredicate(diet: DietFlag): ((r: StarterRecipe) => boolean) | null {
  if (diet === "vegetarian") return isVegetarian;
  if (diet === "pescatarian") return isPescatarian;
  if (diet === "dairy-free") return isDairyFree;
  return null; // vegan / gluten-free — nothing here can claim these
}

/** Constraints about what someone eats at all, as opposed to ingredients they
    avoid. "Show me the starters anyway" keeps these and drops the avoidance
    ones: a vegan may accept swapping the cheese, but should never be handed a
    beef stew. Vegan falls back to vegetarian — the closest honest offer. */
function identityPredicate(diet: DietFlag): ((r: StarterRecipe) => boolean) | null {
  if (diet === "vegetarian" || diet === "vegan") return isVegetarian;
  if (diet === "pescatarian") return isPescatarian;
  return null; // dairy-free / gluten-free are avoidance — droppable, with a caption
}

/** Meat-free dishes suit everyone (a chicken-eating household still eats
    pizza); otherwise every protein in the dish must be one they eat. `every`,
    not `some` — that's what drops the bacon and beef-stock cases. */
function eatsAll(r: StarterRecipe, chosen: Set<Protein>): boolean {
  return r.proteins.length === 0 || r.proteins.every((p) => chosen.has(p));
}

/** Round-robin across protein buckets so eight picks read like a varied week
    rather than eight chicken dinners. Curated file order is kept within each
    bucket, and the user's own tick order decides which bucket goes first. */
function diversify(pool: StarterRecipe[], order: Protein[], limit: number): StarterRecipe[] {
  const buckets: StarterRecipe[][] = [];
  const meatFree = pool.filter((r) => r.proteins.length === 0);
  for (const p of order) {
    const bucket = pool.filter((r) => r.proteins[0] === p);
    if (bucket.length > 0) buckets.push(bucket);
  }
  if (meatFree.length > 0) buckets.push(meatFree);
  // Anything whose primary protein wasn't in the tick order (shouldn't happen
  // after eatsAll, but keeps this total).
  const seen = new Set(buckets.flat());
  const rest = pool.filter((r) => !seen.has(r));
  if (rest.length > 0) buckets.push(rest);

  const out: StarterRecipe[] = [];
  for (let i = 0; out.length < limit; i++) {
    let tookAny = false;
    for (const bucket of buckets) {
      if (i < bucket.length) {
        out.push(bucket[i]);
        tookAny = true;
        if (out.length === limit) break;
      }
    }
    if (!tookAny) break;
  }
  return out;
}

/** At least two quick wins — freezer/oven nights are what make a set feel
    usable on a Tuesday. */
function ensureEasy(picks: StarterRecipe[], pool: StarterRecipe[], want = 2): StarterRecipe[] {
  const easy = (r: StarterRecipe) => r.tags.includes("Easy");
  const out = [...picks];
  let have = out.filter(easy).length;
  if (have >= want) return out;
  const chosen = new Set(out);
  for (const candidate of pool) {
    if (have >= want) break;
    if (chosen.has(candidate) || !easy(candidate)) continue;
    // Replace from the end, skipping the Easy ones we're trying to keep.
    for (let i = out.length - 1; i >= 0; i--) {
      if (!easy(out[i])) {
        chosen.delete(out[i]);
        out[i] = candidate;
        chosen.add(candidate);
        have++;
        break;
      }
    }
  }
  return out;
}

/** The rest of a pool, in the same deterministic order, minus what was already
    picked. Deliberately derived *after* the picks and never fed back into them:
    "Show more ideas" must not be able to change the eight we chose. */
function remainder(
  pool: StarterRecipe[],
  order: Protein[],
  picked: StarterRecipe[],
): StarterRecipe[] {
  const taken = new Set(picked.map((r) => r.title));
  return diversify(pool, order, pool.length).filter((r) => !taken.has(r.title));
}

export function pickStarters({
  proteins,
  diets,
  scope,
  existingTitles,
}: PickInput): PickResult {
  const chosen = new Set<Protein>(proteins);
  const available = STARTER_RECIPES.filter(
    (r) => !existingTitles?.has(r.title.toLowerCase()),
  );

  // Protein-filtered pool — the basis for both the on-diet and the open half.
  const openPool = available.filter((r) => eatsAll(r, chosen));

  const unservable = diets.filter((d) => UNSERVABLE.includes(d));
  // Diets AND together, and the filter is never relaxed to pad the list out.
  // A diet we can't claim falls back to its identity constraint rather than to
  // nothing, so `picks` is never a list of beef stews for a vegan even though
  // the hand-off screen is what actually gets shown.
  const predicates = diets
    .map((d) => dietPredicate(d) ?? identityPredicate(d))
    .filter(Boolean) as ((r: StarterRecipe) => boolean)[];
  const dietPool = openPool.filter((r) => predicates.every((fn) => fn(r)));

  // The fallback list keeps what someone will eat at all and drops only the
  // ingredient avoidances, so it never contradicts the answer outright.
  const identityPreds = diets
    .map(identityPredicate)
    .filter(Boolean) as ((r: StarterRecipe) => boolean)[];
  const relaxedPool = openPool.filter((r) => identityPreds.every((fn) => fn(r)));
  const relaxed = ensureEasy(diversify(relaxedPool, proteins, TARGET), relaxedPool);
  const relaxedRest = remainder(relaxedPool, proteins, relaxed);

  // Nothing to honour: the whole list comes from the open pool.
  if (diets.length === 0) {
    return {
      picks: relaxed,
      handOff: false,
      unservable: [],
      relaxed,
      rest: relaxedRest,
      relaxedRest,
    };
  }

  let picks: StarterRecipe[];
  if (scope === "everyone") {
    picks = ensureEasy(diversify(dietPool, proteins, TARGET), dietPool);
  } else {
    // 60/40: most of the week honours the personal need, the rest stays open
    // so nobody else in the household is put on someone else's diet.
    const onDietCount = Math.round(TARGET * ON_DIET_SHARE);
    const onDiet = diversify(dietPool, proteins, onDietCount);
    const taken = new Set(onDiet.map((r) => r.title));
    const rest = diversify(
      openPool.filter((r) => !taken.has(r.title)),
      proteins,
      TARGET - onDiet.length,
    );
    picks = ensureEasy([...onDiet, ...rest], openPool);
  }

  return {
    picks,
    // Either the answer is one the data can't express at all, or the honest
    // pool came out too thin to present as a starter kitchen.
    handOff: unservable.length > 0 || picks.length < MIN_GOOD,
    unservable,
    relaxed,
    // The same pool `picks` came from, so "show more ideas" can never surface
    // something the answers ruled out.
    rest: remainder(scope === "everyone" ? dietPool : openPool, proteins, picks),
    relaxedRest,
  };
}
