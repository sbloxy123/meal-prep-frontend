// Instructions live in a single TEXT column (brief notes, a few short steps).
// Per HANDOFF §10: split on newlines. Two or more non-empty lines render as an
// ordered list; a single line renders as one paragraph. Strip any leading
// "1.", "1)", "-" or "•" the user typed so numbering never doubles up.

const LEADING_MARKER = /^\s*(?:\d+[.)]|[-•*])\s+/;

export function parseInstructions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(LEADING_MARKER, "").trim())
    .filter((line) => line.length > 0);
}
