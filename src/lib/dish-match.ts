// Matches a dish someone typed during onboarding against the curated starter
// set. A match means we hand them the curated recipe instead of asking the AI
// for one: a real photo, checked macros and a properly stepped method beat an
// AI first draft every time, and it costs nothing.
//
// Pure and deterministic — same input, same output — so the onboarding funnel
// and any support conversation stay reproducible.

import { STARTER_RECIPES, type StarterRecipe } from "./starter-recipes";

/** How many starters one typed dish may knock out of the "gaps" list. Two,
    because "chicken curry" legitimately covers both curry starters, but a
    vaguer phrase shouldn't be allowed to empty the list. */
const MAX_MATCHES_PER_DISH = 2;

/** Multi-word shorthand, expanded before tokenising. Longest first — "mac n
    cheese" must win before "mac" would. UK kitchen vernacular only; anything
    not in here simply goes to the AI, which is the safe direction. */
const SYNONYMS: [RegExp, string][] = [
  [/\bspag(?:hetti)? bol(?:ognaise|ognese|og)?\b/g, "spaghetti bolognese"],
  [/\bbolognaise\b/g, "bolognese"],
  [/\bmac(?:aroni)? (?:n|and) cheese\b/g, "mac cheese"],
  [/\bmacaroni cheese\b/g, "mac cheese"],
  [/\bshep(?:herds)? pie\b/g, "shepherds pie"],
  [/\bjacket (?:spuds?|potato)\b/g, "jacket potatoes"],
  [/\bstir[- ]?fry\b/g, "stir fry"],
  // "dinner" is a stopword and "roast" alone is too generic to match, so the
  // commonest way to say this needs spelling out. ("chilli con carne" needs no
  // rule — it already matches the title outright, and so does a bare "con
  // carne" by subset.)
  [/\b(?:sunday roast|roast dinner)\b/g, "roast chicken dinner"],
  [/\bfish fingers?\b/g, "fish fingers"],
  [/\btoad in the hole\b/g, "toad hole"],
];

/** Words that carry no dish identity. "mum's" and "homemade" are the point:
    they're how people actually type, and they must not stop a match. */
const STOPWORDS = new Set([
  "and", "with", "the", "a", "an", "of", "in", "on", "for", "or", "some",
  "my", "our", "his", "her", "their",
  "homemade", "home", "made", "easy", "quick", "simple", "proper", "basic",
  "best", "favourite", "favorite", "classic", "traditional", "style",
  "mum", "mums", "mother", "mothers", "dad", "dads", "father", "fathers",
  "nan", "nans", "nana", "nanas", "gran", "grans", "grandma", "grandmas",
  "granny", "grannys", "auntie", "aunties", "aunt", "aunts",
  "night", "dinner", "tea", "meal",
]);

/** Words too broad to identify a dish on their own. A bare "chicken" must
    match nothing — otherwise one typed word wipes out half the starter list.
    These still count inside a multi-word match ("chicken curry" is fine). */
const GENERIC = new Set([
  "chicken", "beef", "pork", "lamb", "fish", "turkey", "bacon", "sausage",
  "sausages", "mince", "steak", "ham", "egg", "eggs", "cheese", "veg",
  "vegetable", "vegetables", "salad", "soup", "stew", "casserole", "bake",
  "roast", "curry", "pie", "pasta", "noodles", "rice", "chips", "mash",
  "potato", "potatoes", "beans", "peas", "sauce", "gravy", "bread", "wrap",
  "wraps", "sandwich", "toastie", "toasties", "dish", "food", "meat",
]);

/** Lower-case, expand shorthand, drop punctuation and possessives. Kept
    separate from tokenising so it can be tested (and read) on its own. */
export function normaliseDish(input: string): string {
  let s = input.toLowerCase();
  // "&" and a standalone "n" both mean "and" in the way people write dishes.
  s = s.replace(/&/g, " and ").replace(/\bn'?\b/g, " and ");
  // Possessives before punctuation-stripping, so "mum's" doesn't become "mums"
  // in one place and "mum s" in another.
  s = s.replace(/'s\b/g, "s").replace(/'/g, "");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  for (const [pattern, replacement] of SYNONYMS) s = s.replace(pattern, replacement);
  return s.replace(/\s+/g, " ").trim();
}

export function dishTokens(input: string): Set<string> {
  return new Set(
    normaliseDish(input)
      .split(" ")
      .filter((w) => w.length > 1 && !STOPWORDS.has(w)),
  );
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
  for (const w of a) if (!b.has(w)) return false;
  return true;
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

/** Deliberately conservative: a false match costs someone the recipe they
    asked for, a missed match only costs an AI call we were happy to make. */
export function looksSame(typed: string, title: string): boolean {
  const a = dishTokens(typed);
  const b = dishTokens(title);
  if (a.size === 0 || b.size === 0) return false;

  // One meaningful word: only ever matches a distinctive one ("lasagne",
  // "carbonara"), never a category ("chicken", "pie").
  if (a.size === 1) {
    const [only] = [...a];
    return !GENERIC.has(only) && b.has(only);
  }

  // Two or more each way, and one describes the other. Subset rather than
  // equality so "steak and chips with peppercorn sauce" still finds
  // "Steak & Chips", and "chicken curry" still finds "Chicken Curry & Rice".
  return b.size >= 2 && (isSubset(a, b) || isSubset(b, a));
}

export interface DishMatch {
  /** Exactly what they typed, kept for the "you said: …" line. */
  input: string;
  /** The curated recipes it covers, best first. `[0]` is the one we adopt;
      all of them drop out of the starter suggestions. */
  matches: StarterRecipe[];
}

/**
 * Match every typed dish against the curated set.
 *
 * `available` should already exclude titles the household has (the wizard
 * passes the same filtered pool `pickStarters` uses), so a retake can't offer
 * back a recipe they already own.
 */
export function matchDishes(
  dishes: string[],
  available: StarterRecipe[] = STARTER_RECIPES,
): DishMatch[] {
  const taken = new Set<string>();
  return dishes.map((input) => {
    const typed = dishTokens(input);
    const scored = available
      .map((recipe, index) => {
        const title = dishTokens(recipe.title);
        return { recipe, index, score: overlap(typed, title), size: title.size };
      })
      .filter(({ recipe }) => !taken.has(recipe.title) && looksSame(input, recipe.title))
      // Highest overlap first, then the tightest title — "fish and chips"
      // should adopt "Fish & Chips", not "Fish Fingers, Chips & Peas". File
      // order breaks any remaining tie so the result is stable.
      .sort((x, y) => y.score - x.score || x.size - y.size || x.index - y.index)
      .slice(0, MAX_MATCHES_PER_DISH);

    for (const { recipe } of scored) taken.add(recipe.title);
    return { input, matches: scored.map((s) => s.recipe) };
  });
}
