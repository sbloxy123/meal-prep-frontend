// Shared shapes for the recipe API. These mirror the existing backend
// responses exactly (routes/recipesRouter.js) — do not change the contract.

export interface Recipe {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  link_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  is_on_menu: boolean;
  favorite: boolean;
  // Added in step 8 (Cloudinary); optional so the app works before the migration.
  image_url?: string | null;
  image_public_id?: string | null;
  // Attribution (E) — who created the recipe. Nullable (user_id is SET NULL on
  // account deletion); only surfaced in shared households.
  user_id?: string | null;
  created_by_name?: string | null;
  // Nutrition (Feature 2) — per-serving macros; optional so the app works before
  // the migration. `macros_source` records where the numbers came from so estimates
  // can be labelled as rough.
  servings?: number | null;
  calories?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  fat_g?: number | null;
  macros_source?: "manual" | "imported" | "estimated" | null;
}

export interface Tag {
  id: number;
  name: string;
}

// GET /recipes — the list endpoint. Tags and ingredients are keyed by recipe
// *title* (that's how the existing queries return them).
export interface RecipesResponse {
  recipes: Recipe[];
  tags: Tag[];
  recipeTags: { tag_recipe_title: string; name: string }[];
  recipeIngredients: {
    recipe_title: string;
    ingredient: string;
    ingredient_id: number;
    quantity: number | string | null;
    unit: string | null;
  }[];
  shoppingListIngredientsByRecipe: unknown;
}

// GET /recipes/:id — detail. Ingredients/tags here are keyed by the recipe id.
export interface RecipeDetail extends Recipe {
  recipe_ingredients: {
    title: string;
    name: string;
    quantity: number | string | null;
    unit: string | null;
  }[];
  recipe_tags: { tag_name: string; recipe_id: number }[];
}

// ── Admin dashboard (/back-of-house) ──────────────────────────────────────
// Read-only usage analytics. Mirrors the admin router in meal-prep-app. Almost
// everything is optional/nullable so the page renders even before the backend
// ships or while the forward-only event series are still empty.

// One point in a daily time-series. `values` keys vary by series (e.g. AI usage
// splits into import/estimate/generate); simple series use `count`.
export interface AdminSeriesPoint {
  date: string; // ISO date (day bucket)
  count?: number;
  values?: Record<string, number>;
}

// Every action the AI ledger records. Keep in step with AI_ACTIONS in
// meal-prep-app controllers/adminController.js.
export type AdminAiAction =
  | "import" | "estimate" | "generate" | "photo" | "improve" | "suggest"
  | "social" | "aisle" | "parse" | "usuals";

export type AdminAiActionCounts = Partial<Record<AdminAiAction, number>> & { total?: number };

export interface AdminRetentionPoint {
  eligible?: number;
  retained?: number;
  rate?: number | null;
  rolling?: number | null;
}

/** GET /admin/ai?days= — the AI ledger sliced for the cost & latency panel. */
export interface AdminAiStats {
  days?: number;
  totals?: {
    actions?: number;
    modelCalls?: number;
    credits?: number;
    costPence?: number;
    costUsd?: number;
    failed?: number;
    refunded?: number;
    rejected?: number;
  };
  byAction?: {
    action: string;
    actions: number;
    charged: number;
    refunded: number;
    failed: number;
    rejected: number;
    stale: number;
    modelCalls: number;
    credits: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    costUsd: number;
    costPence: number;
    p50Ms: number | null;
    p95Ms: number | null;
    maxMs: number | null;
  }[];
  byModel?: { model: string; actions: number; modelCalls: number; inputTokens: number; outputTokens: number; costPence: number }[];
  outcomes?: { action: string; outcome: string; count: number }[];
  topHouseholds?: { id: string; name: string | null; plan: string; emails: string; actions: number; credits: number; costPence: number; rejected: number }[];
  daily?: { date: string; costPence: number; count: number }[];
  // Rows backfilled from the old call log: they have no tokens/cost/latency and
  // are excluded from the per-action figures above.
  legacyRows?: number;
  generated_at?: string;
}

export interface AdminTotals {
  users?: number;
  verifiedUsers?: number;
  activeUsers7d?: number;
  activeUsers30d?: number;
  recipes?: number;
  aiCalls?: AdminAiActionCounts | null;
  // Spend in the window, from the ai_usage ledger (pence at the FX rate in
  // force when each row was written; usd is what Anthropic actually bills).
  aiCost?: { pence?: number; usd?: number; byAction?: Record<string, number> } | null;
  // Classic day-N retention for users who signed up in the window: retained =
  // made an authenticated request on exactly day N; rolling = on any of days
  // 1..N. rate is a percentage, null until anyone is eligible.
  retention?: {
    cohort?: number;
    d1?: AdminRetentionPoint;
    d7?: AdminRetentionPoint;
    d30?: AdminRetentionPoint;
  } | null;
  // Households by member count, all-time.
  householdSizes?: { size: number; households: number }[] | null;
  shares?: number;
  households?: number;
  multiMemberHouseholds?: number;
  premiumHouseholds?: number;
  paidHouseholds?: number;
  compedHouseholds?: number;
  // Invite funnel + adoption (secondary section).
  invitesSent?: number;
  invitesAccepted?: number;
  invitesPending?: number;
  // Onboarding questionnaire funnel (forward-only, from app_events).
  onboarding?: {
    shown?: number;
    started?: number;
    completed?: number;
    skipped?: number;
    aiHandoff?: number;
    recipesSeeded?: number;
    // "My usuals" step. usualsTyped counts people who typed something;
    // usualsRuns counts server-side generation runs, so the pair is the
    // drop-off between intent and outcome.
    usualsTyped?: number;
    usualsRuns?: number;
    usualsDishes?: number;
    usualsWritten?: number;
    usualsTitleOnly?: number;
  } | null;
  // Install funnel (forward-only, from app_events). standaloneUsers is the one
  // that means "installed": distinct users seen launching from the home screen.
  install?: {
    shown?: number;
    nativeAccepted?: number;
    guide?: number;
    later?: number;
    never?: number;
    pageViews?: number;
    emailsSent?: number;
    standaloneUsers?: number;
    coach?: number;
    // Stale-layout alarm: iOS majors newer than the walkthrough registry has
    // been verified on (all-time), and the newest MAX_VERIFIED_IOS any client
    // has reported — the notice shows for majors above it.
    unverifiedIos?: { major: number; devices: number; firstSeen: string }[];
    maxVerifiedIos?: number | null;
  } | null;
  macrosSource?: Record<string, number> | null; // manual/imported/estimated → count
  topTags?: { name: string; count: number }[];
  deviceSplit?: Record<string, number> | null; // e.g. { mobile, desktop } from userAgent
}

export interface AdminOverview {
  days?: number; // the range this payload covers
  totals?: AdminTotals;
  series?: {
    signups?: AdminSeriesPoint[];
    activeUsers?: AdminSeriesPoint[];
    aiCalls?: AdminSeriesPoint[]; // values keyed by action
    recipesCreated?: AdminSeriesPoint[]; // forward-only
    listsGenerated?: AdminSeriesPoint[]; // forward-only
    weekAdds?: AdminSeriesPoint[]; // forward-only
    onboardingCompleted?: AdminSeriesPoint[]; // forward-only
  } | null;
  generated_at?: string;
}

export interface AdminUserRow {
  id: string;
  name?: string | null;
  email: string;
  created_at: string;
  email_verified?: boolean;
  last_active?: string | null;
  session_count?: number | null;
  household_id?: string | null;
  household_name?: string | null;
  household_member_count?: number | null;
  plan?: "free" | "premium";
  paid?: boolean; // premium via a real Stripe subscription (vs a comp)
  recipe_count?: number;
  ai_usage?: (AdminAiActionCounts & { cost_pence?: number; credits?: number }) | null;
  shares_created?: number | null;
  week_adds?: number | null;
  lists_generated?: number | null;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
}

/** POST /recipes/usuals — the dishes someone typed during onboarding, written
    up as real recipes. `results` comes back in input order. `canonical` is a
    generic dish name for client-side matching only; it is never stored. */
export interface UsualResult {
  input: string;
  title: string;
  canonical: string | null;
  recipeId: number | null;
  status: "written" | "title_only" | "failed";
}

export interface UsualsResponse {
  results: UsualResult[];
  counts: {
    requested: number;
    written: number;
    titleOnly: number;
    failed: number;
    dropped: number;
  };
}
