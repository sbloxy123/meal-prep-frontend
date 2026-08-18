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
