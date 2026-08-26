// Per-serving nutrition block, shared by the recipe detail page and the shared
// recipe preview so the two never diverge. Renders as a small stat grid; only
// the macros that are present show up. Returns null when there's nothing to show.

interface RecipeMacrosProps {
  calories?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  fat_g?: number | null;
  estimated?: boolean;
}

export function RecipeMacros({ calories, protein_g, carb_g, fat_g, estimated }: RecipeMacrosProps) {
  const cells = [
    { key: "cal", name: "Calories", value: calories, unit: "kcal", accent: true },
    { key: "p", name: "Protein", value: protein_g, unit: "g", accent: false },
    { key: "c", name: "Carbs", value: carb_g, unit: "g", accent: false },
    { key: "f", name: "Fat", value: fat_g, unit: "g", accent: false },
  ].filter((c) => c.value != null);

  if (cells.length === 0) return null;

  return (
    <div className="macros">
      <div className="macros-head">
        <span className="macros-label">Per serving</span>
        {estimated && <span className="tag tag-outline macros-est">Estimated</span>}
      </div>
      <div className={`macros-grid macros-grid--${cells.length}`}>
        {cells.map((c) => (
          <div key={c.key} className={`macros-cell${c.accent ? " macros-cell--cal" : ""}`}>
            <span className="macros-value">
              {c.value}
              <span className="macros-unit">{c.unit}</span>
            </span>
            <span className="macros-name">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
