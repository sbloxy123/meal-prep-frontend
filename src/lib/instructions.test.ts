// Run with `npm test` (node --test, native TypeScript stripping).
//
// parseInstructions is pure, and it is the only thing standing between a
// prose method written by the AI and a wall of text on the recipe page. The
// cases below are the contract: repair prose, never mangle a method someone
// wrote themselves.

import test from "node:test";
import assert from "node:assert/strict";

import {
  parseInstructions,
  shouldTakeMethod,
  splitSentences,
} from "./instructions.ts";
import { STARTER_RECIPES } from "./starter-recipes.ts";

test("no method at all yields no steps", () => {
  assert.deepEqual(parseInstructions(null), []);
  assert.deepEqual(parseInstructions(undefined), []);
  assert.deepEqual(parseInstructions(""), []);
  assert.deepEqual(parseInstructions("   \n  \n"), []);
});

test("a prose method from an AI recipe splits into its sentences", () => {
  const prose =
    "Preheat the oven to 200C fan. Toss the potatoes with olive oil, salt and " +
    "pepper in a roasting tin. Roast for 35 minutes, turning them once halfway " +
    "through. Meanwhile, fry the chicken thighs skin-side down until the skin is " +
    "golden. Serve everything together with a squeeze of lemon.";
  assert.deepEqual(parseInstructions(prose), [
    "Preheat the oven to 200C fan.",
    "Toss the potatoes with olive oil, salt and pepper in a roasting tin.",
    "Roast for 35 minutes, turning them once halfway through.",
    "Meanwhile, fry the chicken thighs skin-side down until the skin is golden.",
    "Serve everything together with a squeeze of lemon.",
  ]);
});

test("decimals and unit abbreviations are not sentence ends", () => {
  const prose =
    "Heat 1.5 tbsp. oil in a large pan over a medium heat until it shimmers. " +
    "Add the onion with 0.5 tsp. salt and cook gently for 8 minutes.";
  // A naive split on every full stop would give four steps here.
  assert.deepEqual(parseInstructions(prose), [
    "Heat 1.5 tbsp. oil in a large pan over a medium heat until it shimmers.",
    "Add the onion with 0.5 tsp. salt and cook gently for 8 minutes.",
  ]);
});

test("a sentence ending in a time abbreviation still breaks", () => {
  const prose =
    "Brown the mince well in a heavy pan, breaking up any lumps as you go. " +
    "Add the tomatoes and simmer for 40 mins. Season, then stir through the " +
    "cooked pasta and serve.";
  assert.equal(parseInstructions(prose).length, 3);
});

test("a genuine one-liner stays one step", () => {
  assert.deepEqual(parseInstructions("Toss everything in a bowl and serve."), [
    "Toss everything in a bowl and serve.",
  ]);
});

test("a short two-sentence note is left alone", () => {
  // Under the length threshold: this reads as a note, not as steps.
  const short = "Mix everything together. Bake for 20 minutes.";
  assert.deepEqual(parseInstructions(short), [short]);
});

test("one long sentence with no boundary stays one step", () => {
  const long =
    "Simmer the stock with the bay leaves, thyme, peppercorns and a halved " +
    "onion over the lowest possible heat for a good three hours, skimming " +
    "occasionally, until it tastes of something worth eating";
  assert.deepEqual(parseInstructions(long), [long]);
});

test("a hand-typed numbered list is unchanged and never double-numbered", () => {
  const typed = "1. Heat the oil\n2. Add the onion\n3. Serve";
  assert.deepEqual(parseInstructions(typed), [
    "Heat the oil",
    "Add the onion",
    "Serve",
  ]);
});

test("bullets and Windows line endings are handled", () => {
  assert.deepEqual(parseInstructions("- Heat the oil\r\n• Add the onion\r\n"), [
    "Heat the oil",
    "Add the onion",
  ]);
});

test("an inline numbered list has its markers stripped", () => {
  const inline =
    "1. Heat the oil in a heavy pan until it shimmers. 2. Add the diced onion " +
    "and soften for ten minutes. 3. Stir in the garlic and cook for a minute more.";
  assert.deepEqual(parseInstructions(inline), [
    "Heat the oil in a heavy pan until it shimmers.",
    "Add the diced onion and soften for ten minutes.",
    "Stir in the garlic and cook for a minute more.",
  ]);
});

test("splitSentences does not split on semicolons or colons", () => {
  const text =
    "Make the dressing: whisk the oil, vinegar and mustard together; season it " +
    "well and set it aside while you cook.";
  assert.deepEqual(splitSentences(text), [text]);
});

test("Improve fills a blank method", () => {
  assert.equal(shouldTakeMethod("", "Heat the oil\nAdd the onion"), true);
  assert.equal(shouldTakeMethod("   ", "Heat the oil\nAdd the onion"), true);
});

test("Improve restructures a single line of prose into steps", () => {
  const prose = "Heat the oil, add the onion, then stir in the rice and stock.";
  assert.equal(shouldTakeMethod(prose, "Heat the oil\nAdd the onion\nStir in the rice"), true);
});

test("Improve never overwrites a method someone wrote as steps", () => {
  const mine = "Heat the oil\nAdd the onion\nServe";
  assert.equal(shouldTakeMethod(mine, "Step one\nStep two\nStep three"), false);
});

test("Improve does not swap prose for more prose", () => {
  const prose = "Heat the oil, add the onion, then stir in the rice and stock.";
  assert.equal(shouldTakeMethod(prose, "Heat the oil and add the onion, then the rice."), false);
});

test("the 40 curated starters parse exactly as they did before the fallback", () => {
  const LEADING_MARKER = /^\s*(?:\d+[.)]|[-•*])\s+/;
  for (const recipe of STARTER_RECIPES) {
    const before = recipe.instructions
      .split(/\r?\n/)
      .map((line) => line.replace(LEADING_MARKER, "").trim())
      .filter((line) => line.length > 0);
    assert.deepEqual(
      parseInstructions(recipe.instructions),
      before,
      `starter "${recipe.title}" changed`,
    );
    assert.ok(before.length >= 2, `starter "${recipe.title}" is not stepped`);
  }
});
