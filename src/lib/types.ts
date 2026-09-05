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

/** GET /admin/config — the knobs in app_config. Values are JSON; a change
    applies to households created afterwards (existing ones keep their
    snapshot). */
export interface AdminConfig {
  config: {
    trial_days: number;
    free_credit_allowance: number | null;
    premium_credit_allowance: number | null;
    credit_weights: Record<string, number>;
    member_limit_free: number;
    founders_coupon: string | null;
    founders_cap: number;
  };
  meta?: Record<string, { updatedAt?: string; updatedBy?: string | null }>;
  defaults?: AdminConfig["config"];
}

/** GET /admin/credits?days= — the credit model in numbers. */
export interface AdminCreditStats {
  days?: number;
  byPlan?: Record<
    string,
    {
      households: number;
      active: number;
      atCeiling: number;
      nearCeiling: number;
      avgUsed: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      max: number;
      p50Active: number;
      p90Active: number;
    }
  >;
  trial?: {
    active: number;
    endingSoon: number;
    expiredFree: number;
    paying: number;
    startedInRange: number;
    convertedInRange: number;
    emailsInRange?: number;
    cardsInRange?: number;
  };
  rejections?: { count: number; households: number };
  householdLimitHits?: number;
  subscriptions?: { monthly: number; annual: number; founders: number };
  generated_at?: string;
}

/** GET /admin/aisles — the ingredient → aisle cache review screen. */
export interface AdminAisleRow {
  id: number;
  key: string;
  label: string;
  aisle: string;
  source: "seed" | "model" | "human";
  confidence: number;
  usage_count: number;
  reviewed_at?: string | null;
  created_at?: string;
}
export interface AdminAisleReview {
  queue: AdminAisleRow[];
  misses: { id: number; key: string; raw_sample: string | null; hit_count: number; last_seen: string }[];
  stats: { total: number; seed: number; model: number; human: number; unreviewed: number; misses: number };
  aisles: Record<string, string>; // slug → label, in walking order
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
  // Installed app (migration 021): first/latest launch from a home screen.
  installed_at?: string | null;
  installed_platform?: string | null;
  last_standalone_at?: string | null;
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

/** GET /admin/history?months= — daily snapshots rolled up by month. */
export interface AdminHistoryMonth {
  month: string; // YYYY-MM
  days: number;
  partial: boolean;
  reconstructed: string[]; // stock metrics that were written after the fact for some day this month
  users?: number | null;
  verified_users?: number | null;
  households?: number | null;
  paid_households?: number | null;
  comped_households?: number | null;
  subs_monthly?: number | null;
  subs_annual?: number | null;
  subs_founders?: number | null;
  mrr_pence?: number | null;
  active_7d?: number | null;
  active_30d?: number | null;
  trials_active?: number | null;
  installed_users?: number | null;
  standalone_active_7d?: number | null;
  standalone_active_30d?: number | null;
  standalone_active_users?: number;
  signups: number;
  active_users: number;
  ai_actions: number;
  ai_rejected: number;
  ai_credits: number;
  ai_cost_pence: number;
  aisle_actions: number;
  aisle_model_calls: number;
  lists_generated: number;
  week_adds: number;
  shops_finished: number;
  recipes_created: number;
  trials_started: number;
  trials_converted: number;
  trials_expired: number;
  cancellations: number;
  subscriptions_ended: number;
  seat_hits: number;
  cta_taps: number;
  checkouts_started: number;
  onboarding_shown: number;
  onboarding_completed: number;
  onboarding_skipped: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
  d7_cohort: number;
  cost_per_paying_pence: number | null;
}
export interface AdminHistory {
  months: AdminHistoryMonth[];
  generated_at?: string;
}

/** GET /admin/onboarding?days= — the questionnaire, step by step. */
export interface AdminOnboarding {
  days: number;
  funnel: {
    shown: number; started: number; step2: number; step3: number; step4: number; step5: number;
    completed: number; skipped: number; aiHandoff: number; medianMs: number | null;
  };
  skipsByStep: { step: number | null; soft: boolean; users: number }[];
  byEntry: { entry: string; shown: number; completed: number }[];
  dietary: {
    answered: number; withDiets: number; withProteins: number;
    diets: { label: string; value: number }[];
    proteins: { label: string; value: number }[];
    scope: { label: string; value: number }[];
  };
  starters: { avgOffered: number; avgChosen: number; avgAdded: number; totalAdded: number; addedFromList: number };
  usuals: { typed: number; addedOwn: number; runs: number; dishes: number; written: number; titleOnly: number; failed: number; medianMs: number | null };
  outcomes: { completedEmpty: number };
  followThrough: { outcome: "completed" | "skipped"; users: number; addedRecipe: number; plannedWeek: number; generatedList: number; finishedShop: number }[];
  generated_at?: string;
}

/** GET /admin/recipes/overview?days= — what people add, nobody named. */
export interface AdminRecipesOverview {
  days: number;
  sources: Record<string, number>;
  shape: { recipes: number; withPhoto: number; withLink: number; favourited: number; withMacros: number; avgIngredients: number; avgSteps: number; everOnMenu: number };
  repeats: { title: string; households: number; count: number }[];
  topTags: { name: string; households: number; count: number }[];
  recent: { id: number; title: string | null; created_at: string | null; on_menu: boolean; favourite: boolean; has_photo: boolean; household_key: string; source: string | null; tags: string[] }[];
}

/** GET /admin/users/:id — one person: titles + metadata, never recipe text. */
export interface AdminUserDetail {
  user: {
    id: string; name: string | null; email: string; created_at: string; email_verified: boolean; role: string | null;
    onboarding_outcome: string | null; onboarded_at: string | null;
    installed_at: string | null; installed_platform: string | null; last_standalone_at: string | null;
    active_days_30: number; standalone_days_30: number;
  };
  household: { id: string; name: string | null; members: { user_id: string; name: string | null; email: string; role: string }[] } | null;
  entitlement: { plan: "free" | "trial" | "premium"; trialEndsAt: string | null; credits: { used: number; allowance: number | null; remaining: number | null; resetsAt: string | null }; memberLimit: number | null } | null;
  recipes: { id: number; title: string | null; created_at: string | null; is_on_menu: boolean; favorite: boolean; has_photo: boolean; has_link: boolean; macros_source: string | null; source: string | null; tags: string[]; ingredients: number; times_on_menu: number; mine: boolean }[];
  activity: { type: string; at: string; meta: Record<string, unknown> | null }[];
  ai: { action: string; count: number; costPence: number }[];
}

/** GET /admin/recipes/:id?reason= — the full recipe (logged with the reason). */
export interface AdminRecipeDetail {
  recipe: {
    id: number; title: string | null; description: string | null; instructions: string | null; link_url: string | null;
    prep_time_minutes: number | null; cook_time_minutes: number | null; servings: number | null; image_url: string | null;
    calories: number | null; protein_g: number | null; carb_g: number | null; fat_g: number | null; macros_source: string | null;
    created_at: string | null; added_by_email: string | null; tags: string[];
    ingredients: { name: string; quantity: string | number | null; unit: string | null }[];
  };
}

export interface AdminAccessLog {
  entries: { type: string; at: string; admin: string | null; target: string | null; recipe_id: number | null; reason: string | null }[];
}

/** GET /admin/installs?days= — the installed (home-screen) app vs the browser. */
export interface AdminInstallGroup {
  users: number;
  active: number;
  avgActiveDays: number;
  avgRecipes: number;
  avgLists: number;
  avgShops: number;
  avgWeekAdds: number;
  shopped: number;
  paying: number;
  d7: { cohort: number; retained: number };
  d30: { cohort: number; retained: number };
}
export interface AdminInstalls {
  days: number;
  totals: {
    users: number;
    installedUsers: number;
    installedInWindow: number;
    signupsInWindow: number;
    signupsInstalled: number;
    activeUsers: number;
    standaloneActive: number;
    mixed: number;
    activeDays: number;
    standaloneDays: number;
    medianDaysToInstall: number | null;
  };
  cohorts: { month: string; signups: number; installed: number; installed_1d: number; installed_7d: number }[];
  platforms: { platform: string; n: number }[];
  compare: { installed: AdminInstallGroup; browser: AdminInstallGroup };
  weekly: { week: string; active: number; inApp: number; browserOnly: number }[];
  recent: {
    id: string; name: string | null; email: string; created_at: string;
    installed_at: string; installed_platform: string | null; last_standalone_at: string | null;
    active_days_30: number; standalone_days_30: number;
  }[];
}
