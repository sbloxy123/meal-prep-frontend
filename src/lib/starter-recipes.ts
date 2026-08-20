// Curated common meals a new user can seed into their account (A1). Kept
// deliberately minimal — title, a couple of collection tags, and the standard
// raw materials you'd shop for, nothing exotic. Each is created as a normal
// recipe via POST /recipes, so the user can edit or delete them afterwards.

export interface StarterRecipe {
  title: string;
  tags: string[];
  ingredients: string[];
}

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    title: "Spaghetti Bolognese",
    tags: ["Beef", "Pasta"],
    ingredients: [
      "Beef mince",
      "Spaghetti",
      "Onion",
      "Garlic",
      "Carrot",
      "Celery",
      "Chopped tomatoes",
      "Tomato purée",
      "Beef stock",
      "Olive oil",
    ],
  },
  {
    title: "Chilli Con Carne",
    tags: ["Beef", "Spicy"],
    ingredients: [
      "Beef mince",
      "Rice",
      "Onion",
      "Garlic",
      "Red pepper",
      "Kidney beans",
      "Chopped tomatoes",
      "Tomato purée",
      "Cumin",
      "Chilli powder",
      "Beef stock",
    ],
  },
  {
    title: "Chicken Fajitas",
    tags: ["Chicken"],
    ingredients: [
      "Chicken breast",
      "Tortilla wraps",
      "Onion",
      "Red pepper",
      "Green pepper",
      "Fajita seasoning",
      "Olive oil",
    ],
  },
  {
    title: "Cheeseburger & Chips",
    tags: ["Beef"],
    ingredients: [
      "Beef mince",
      "Burger buns",
      "Cheddar cheese",
      "Chips",
      "Lettuce",
      "Tomato",
      "Onion",
      "Ketchup",
    ],
  },
  {
    title: "Sausage Carbonara",
    tags: ["Pork", "Pasta"],
    ingredients: [
      "Sausages",
      "Spaghetti",
      "Eggs",
      "Parmesan",
      "Garlic",
      "Black pepper",
      "Olive oil",
    ],
  },
  {
    title: "Steak & Chips",
    tags: ["Beef"],
    ingredients: ["Steak", "Chips", "Garlic", "Butter", "Olive oil"],
  },
  {
    title: "Chicken Gyros",
    tags: ["Chicken"],
    ingredients: [
      "Chicken thighs",
      "Flatbreads",
      "Garlic",
      "Lemon",
      "Natural yogurt",
      "Oregano",
      "Tomato",
      "Red onion",
      "Cucumber",
    ],
  },
  {
    title: "Jerk Chicken",
    tags: ["Chicken", "Spicy"],
    ingredients: [
      "Chicken thighs",
      "Jerk seasoning",
      "Lime",
      "Garlic",
      "Spring onion",
      "Rice",
      "Kidney beans",
    ],
  },
  {
    title: "Oven Pizza",
    tags: ["Vegetarian"],
    ingredients: ["Pizza base", "Passata", "Mozzarella", "Basil", "Olive oil"],
  },
];
