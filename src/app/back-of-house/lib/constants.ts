const RANGES = [7, 30, 90, 365] as const;

type Range = (typeof RANGES)[number];

const RANGE_LABEL: Record<Range, string> = { 7: "7d", 30: "30d", 90: "90d", 365: "1y" };

// Every action the AI ledger records (backend AI_ACTIONS). The last four were
// invisible to the old dashboard — social + aisle-sort drew the allowance
// without being counted, and parse / usuals were never logged at all.
const AI_ACTIONS = [
  "import", "estimate", "generate", "photo", "improve", "suggest", "social", "aisle", "parse", "usuals",
] as const;

type AiAction = (typeof AI_ACTIONS)[number];

const AI_LABEL: Record<AiAction, string> = {
  import: "Import",
  estimate: "Estimate",
  generate: "Generate",
  photo: "Photo",
  improve: "Improve",
  suggest: "Suggest",
  social: "Social",
  aisle: "Aisle sort",
  parse: "Paste to list",
  usuals: "My usuals",
};

type Segment = "all" | "active" | "inactive" | "unverified" | "recipes" | "premium";

type SortKey = "name" | "joined" | "active" | "recipes" | "ai" | "household" | "plan";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active (30d)" },
  { key: "inactive", label: "Inactive" },
  { key: "unverified", label: "Unverified" },
  { key: "recipes", label: "Has recipes" },
  { key: "premium", label: "Premium" },
];

const PLAN_LABEL: Record<string, string> = { free: "Free", trial: "Trial", premium: "Premium" };

export { RANGES, RANGE_LABEL, AI_ACTIONS, AI_LABEL, SEGMENTS, PLAN_LABEL };
export type { Range, AiAction, Segment, SortKey };
