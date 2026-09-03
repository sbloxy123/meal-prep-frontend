// Instructions live in a single TEXT column (brief notes, a few short steps).
// Per HANDOFF §10: split on newlines. Two or more non-empty lines render as an
// ordered list; a single line renders as one paragraph. Strip any leading
// "1.", "1)", "-" or "•" the user typed so numbering never doubles up.
//
// Sentence fallback (2026-09): the AI paths — My usuals, generate-from-title,
// URL/social/photo import, improve — sometimes hand back the whole method as
// one prose paragraph, which then rendered as an unbroken wall of text (and on
// the shared page as a single numbered step). When the newline split yields one
// long line we split that on sentence boundaries instead. Deliberately
// conservative: a bad split is worse than no split, so a short one-liner is
// left exactly as it is.
//
// The backend has a twin of splitSentences in meal-prep-app `lib/steps.js`,
// which stops new prose being written in the first place. Keep the two regexes
// and the abbreviation list byte-for-byte identical.

const LEADING_MARKER = /^\s*(?:\d+[.)]|[-•*])\s+/;

// "…until it shimmers. 2. Add the onion." breaks after "shimmers." and again
// after the "2.", leaving the marker stranded as a piece of its own. It holds
// no content, so drop it.
const MARKER_ONLY = /^(?:\d+[.)]|[-•*])$/;

// Under this length a single line is treated as a genuine one-liner and left
// alone, even when it holds two sentences ("Mix everything. Bake for 20 mins.").
const MIN_PROSE_LENGTH = 120;

// Abbreviations whose trailing full stop is not the end of a sentence. Their
// dot is swapped for a placeholder before the split and restored afterwards.
// Units of time are deliberately absent: "Bake for 20 mins. Rest before
// slicing." is a real sentence break, and protecting it would lose the step.
const ABBREVIATIONS = /\b(?:tbsp|tsp|oz|lbs?|fl|approx|e\.g|i\.e)\./gi;
const DOT = "\u0000";

// A sentence ends at . ! or ? followed by whitespace and then the start of
// something new. Requiring the whitespace keeps decimals (1.5, gas mark 4.5)
// intact; requiring an upper-case letter, digit or opening quote after it
// avoids splitting on a stray lower-case continuation.
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z0-9"“(])/;

export function splitSentences(text: string): string[] {
  return text
    .replace(ABBREVIATIONS, (match) => match.slice(0, -1) + DOT)
    .split(SENTENCE_BOUNDARY)
    .map((piece) => piece.split(DOT).join(".").replace(LEADING_MARKER, "").trim())
    .filter((piece) => piece.length > 0 && !MARKER_ONLY.test(piece));
}

// Should an AI-written method replace what the form currently holds? Yes when
// there is nothing there, and yes when what is there is a single line of prose
// and the model has come back with real steps — that is the whole point of
// pressing Improve on one of the older AI recipes. Never when the current
// method already spans several lines: those are someone's own steps.
export function shouldTakeMethod(current: string, incoming: string): boolean {
  const mine = current.trim();
  if (!mine) return true;
  if (mine.includes("\n")) return false;
  // Only swap it for something genuinely better: real newline-separated steps,
  // not another paragraph of prose.
  return incoming.split(/\r?\n/).filter((line) => line.trim().length > 0).length >= 2;
}

export function parseInstructions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(LEADING_MARKER, "").trim())
    .filter((line) => line.length > 0);

  // Nothing to repair: no method at all, or the author already gave us steps.
  if (lines.length !== 1) return lines;

  const only = lines[0];
  if (only.length < MIN_PROSE_LENGTH) return lines;
  const sentences = splitSentences(only);
  return sentences.length >= 2 ? sentences : lines;
}
