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

export interface AdminTotals {
  users?: number;
  verifiedUsers?: number;
  activeUsers7d?: number;
  activeUsers30d?: number;
  recipes?: number;
  aiCalls?: { import?: number; estimate?: number; generate?: number; photo?: number; improve?: number; total?: number } | null;
  shares?: number;
  households?: number;
  multiMemberHouseholds?: number;
  // Invite funnel + adoption (secondary section).
  invitesSent?: number;
  invitesAccepted?: number;
  invitesPending?: number;
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
  recipe_count?: number;
  ai_usage?: { import?: number; estimate?: number; generate?: number; photo?: number; improve?: number; total?: number } | null;
  shares_created?: number | null;
  week_adds?: number | null;
  lists_generated?: number | null;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
}
