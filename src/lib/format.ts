// "3 items" / "1 recipe" — shared so the pluralisation rule lives in one place.
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
