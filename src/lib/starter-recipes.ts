// Curated common meals a new user can seed into their account (A1). A realistic
// mix for busy families cooking 6–7 nights a week: proper cook-from-scratch
// dinners AND quick oven/freezer/microwave assemblies (tagged "Easy"). Each has
// a title, collection tags, the ingredients you'd shop for (with ballpark
// quantities scaled to the serving count), a short method, serving count and
// ballpark per-serving macros. Created via POST /recipes, so the user can edit
// or delete them afterwards. Macros are rough estimates (macros_source:
// "estimated"); no AI is involved in seeding.

export interface StarterIngredient {
  name: string;
  quantity: number; // 0 = unspecified (shown blank)
  unit: string; // "" for countable items, e.g. "1 Onion"
}

export interface StarterRecipe {
  title: string;
  tags: string[];
  ingredients: StarterIngredient[];
  instructions: string; // one step per line
  servings: number;
  // Per serving, ballpark.
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

// Small helper to keep the ingredient lists terse and readable.
function ing(name: string, quantity: number, unit = ""): StarterIngredient {
  return { name, quantity, unit };
}

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    title: "Spaghetti Bolognese",
    tags: ["Beef", "Pasta"],
    ingredients: [
      ing("Beef mince", 500, "g"),
      ing("Spaghetti", 400, "g"),
      ing("Onion", 1),
      ing("Garlic", 2, "cloves"),
      ing("Carrot", 1),
      ing("Celery", 1, "stick"),
      ing("Chopped tomatoes", 400, "g"),
      ing("Tomato purée", 2, "tbsp"),
      ing("Beef stock", 1, "cube"),
      ing("Olive oil", 2, "tbsp"),
    ],
    instructions:
      "Finely chop the onion, carrot and celery and soften in olive oil for 8–10 minutes.\n" +
      "Add the garlic, then the beef mince, and brown well, breaking it up.\n" +
      "Stir in the tomato purée, chopped tomatoes and a beef stock cube.\n" +
      "Simmer gently for 30–45 minutes, topping up with a splash of water if needed.\n" +
      "Meanwhile cook the spaghetti in salted boiling water until al dente.\n" +
      "Season the sauce, drain the pasta and serve together.",
    servings: 4,
    calories: 735,
    protein_g: 37,
    carb_g: 79,
    fat_g: 28,
  },
  {
    title: "Chilli Con Carne",
    tags: ["Beef", "Spicy"],
    ingredients: [
      ing("Beef mince", 500, "g"),
      ing("Rice", 300, "g"),
      ing("Onion", 1),
      ing("Garlic", 2, "cloves"),
      ing("Red pepper", 1),
      ing("Kidney beans", 400, "g"),
      ing("Chopped tomatoes", 400, "g"),
      ing("Tomato purée", 2, "tbsp"),
      ing("Cumin", 1, "tsp"),
      ing("Chilli powder", 2, "tsp"),
      ing("Beef stock", 1, "cube"),
    ],
    instructions:
      "Soften the chopped onion and pepper in a little oil, then add the garlic.\n" +
      "Add the mince and brown, then stir in the cumin and chilli powder.\n" +
      "Add the tomato purée, chopped tomatoes and beef stock.\n" +
      "Simmer for 30 minutes, then stir in the drained kidney beans and cook 10 more.\n" +
      "Cook the rice separately and serve alongside the chilli.",
    servings: 4,
    calories: 650,
    protein_g: 34,
    carb_g: 79,
    fat_g: 20,
  },
  {
    title: "Chicken Fajitas",
    tags: ["Chicken"],
    ingredients: [
      ing("Chicken breast", 600, "g"),
      ing("Tortilla wraps", 8),
      ing("Onion", 1),
      ing("Red pepper", 1),
      ing("Green pepper", 1),
      ing("Fajita seasoning", 2, "tbsp"),
      ing("Olive oil", 1, "tbsp"),
    ],
    instructions:
      "Slice the chicken and peppers and onion into strips.\n" +
      "Toss the chicken with the fajita seasoning and a little oil.\n" +
      "Fry the chicken over high heat until cooked through, then set aside.\n" +
      "Fry the peppers and onion until charred and softened.\n" +
      "Return the chicken, warm the wraps, and serve for everyone to build their own.",
    servings: 4,
    calories: 510,
    protein_g: 43,
    carb_g: 55,
    fat_g: 13,
  },
  {
    title: "Cheeseburger & Chips",
    tags: ["Beef"],
    ingredients: [
      ing("Beef mince", 500, "g"),
      ing("Burger buns", 4),
      ing("Cheddar cheese", 4, "slices"),
      ing("Chips", 800, "g"),
      ing("Lettuce", 4, "leaves"),
      ing("Tomato", 1),
      ing("Onion", 1),
      ing("Ketchup", 4, "tbsp"),
    ],
    instructions:
      "Cook the oven chips per the pack.\n" +
      "Shape the mince into patties and season well.\n" +
      "Fry or grill the burgers 3–4 minutes each side, adding cheese to melt near the end.\n" +
      "Toast the buns and slice the lettuce, tomato and onion.\n" +
      "Build the burgers and serve with the chips.",
    servings: 4,
    calories: 855,
    protein_g: 39,
    carb_g: 84,
    fat_g: 40,
  },
  {
    title: "Sausage Carbonara",
    tags: ["Pork", "Pasta"],
    ingredients: [
      ing("Sausages", 6),
      ing("Spaghetti", 400, "g"),
      ing("Eggs", 4),
      ing("Parmesan", 60, "g"),
      ing("Garlic", 2, "cloves"),
      ing("Black pepper", 1, "tsp"),
      ing("Olive oil", 1, "tbsp"),
    ],
    instructions:
      "Squeeze the sausage meat from the skins and fry in pieces with the garlic until golden.\n" +
      "Cook the spaghetti in salted water; whisk the eggs with grated parmesan and lots of pepper.\n" +
      "Drain the pasta, keeping a mugful of the water.\n" +
      "Off the heat, toss the pasta with the sausage, then the egg mix, loosening with pasta water into a glossy sauce.\n" +
      "Serve straight away with extra parmesan.",
    servings: 4,
    calories: 770,
    protein_g: 37,
    carb_g: 77,
    fat_g: 34,
  },
  {
    title: "Steak & Chips",
    tags: ["Beef"],
    ingredients: [
      ing("Steak", 2),
      ing("Chips", 500, "g"),
      ing("Garlic", 2, "cloves"),
      ing("Butter", 30, "g"),
      ing("Olive oil", 1, "tbsp"),
    ],
    instructions:
      "Cook the chips in the oven until crisp.\n" +
      "Bring the steaks to room temperature and season generously.\n" +
      "Sear in a hot pan with a little oil, 2–3 minutes each side for medium.\n" +
      "Add butter and crushed garlic and baste for the last minute.\n" +
      "Rest the steak for 5 minutes, then serve with the chips.",
    servings: 2,
    calories: 975,
    protein_g: 62,
    carb_g: 61,
    fat_g: 55,
  },
  {
    title: "Chicken Gyros",
    tags: ["Chicken"],
    ingredients: [
      ing("Chicken thighs", 800, "g"),
      ing("Flatbreads", 4),
      ing("Garlic", 3, "cloves"),
      ing("Lemon", 1),
      ing("Natural yogurt", 300, "g"),
      ing("Oregano", 1, "tbsp"),
      ing("Tomato", 2),
      ing("Red onion", 1),
      ing("Cucumber", 0.5),
    ],
    instructions:
      "Marinate the chicken thighs in yogurt, garlic, lemon and oregano for 20 minutes.\n" +
      "Griddle or grill the chicken until charred and cooked through, then slice.\n" +
      "Mix a quick tzatziki with yogurt, grated cucumber and garlic.\n" +
      "Warm the flatbreads and slice the tomato and red onion.\n" +
      "Fill the flatbreads with chicken, salad and tzatziki.",
    servings: 4,
    calories: 575,
    protein_g: 47,
    carb_g: 48,
    fat_g: 23,
  },
  {
    title: "Jerk Chicken",
    tags: ["Chicken", "Spicy"],
    ingredients: [
      ing("Chicken thighs", 800, "g"),
      ing("Jerk seasoning", 3, "tbsp"),
      ing("Lime", 1),
      ing("Garlic", 2, "cloves"),
      ing("Spring onion", 3),
      ing("Rice", 300, "g"),
      ing("Kidney beans", 400, "g"),
    ],
    instructions:
      "Coat the chicken thighs in jerk seasoning, garlic and lime, and marinate if you have time.\n" +
      "Roast or grill the chicken for 30–35 minutes until sticky and cooked through.\n" +
      "Cook the rice with the kidney beans and sliced spring onion for a simple rice and peas.\n" +
      "Serve the chicken over the rice with extra lime.",
    servings: 4,
    calories: 645,
    protein_g: 46,
    carb_g: 73,
    fat_g: 19,
  },
  {
    title: "Oven Pizza",
    tags: ["Vegetarian", "Easy"],
    ingredients: [
      ing("Pizza base", 2),
      ing("Passata", 150, "g"),
      ing("Mozzarella", 125, "g"),
      ing("Basil", 1, "handful"),
      ing("Olive oil", 1, "tbsp"),
    ],
    instructions:
      "Heat the oven to 220°C.\n" +
      "Spread passata over the base and season.\n" +
      "Tear over the mozzarella and drizzle with a little oil.\n" +
      "Bake for 10–12 minutes until the cheese is bubbling and the base is crisp.\n" +
      "Scatter with fresh basil to serve.",
    servings: 2,
    calories: 515,
    protein_g: 23,
    carb_g: 51,
    fat_g: 25,
  },
  {
    title: "Fish & Chips",
    tags: ["Fish"],
    ingredients: [
      ing("Cod fillets", 2),
      ing("Potatoes", 600, "g"),
      ing("Plain flour", 120, "g"),
      ing("Sparkling water", 150, "ml"),
      ing("Garden peas", 200, "g"),
      ing("Vegetable oil", 500, "ml"),
    ],
    instructions:
      "Cut the potatoes into chips and parboil for 5 minutes, then drain and dry.\n" +
      "Heat the oil and fry the chips until golden, then keep warm.\n" +
      "Whisk the flour with cold sparkling water into a batter.\n" +
      "Coat the cod in batter and fry for 5–6 minutes until crisp and cooked.\n" +
      "Cook the peas and serve everything together.",
    servings: 2,
    calories: 805,
    protein_g: 42,
    carb_g: 106,
    fat_g: 24,
  },
  {
    title: "Chicken Pie",
    tags: ["Chicken"],
    ingredients: [
      ing("Chicken breast", 600, "g"),
      ing("Puff pastry", 320, "g"),
      ing("Onion", 1),
      ing("Leek", 1),
      ing("Butter", 30, "g"),
      ing("Plain flour", 2, "tbsp"),
      ing("Chicken stock", 300, "ml"),
      ing("Double cream", 100, "ml"),
    ],
    instructions:
      "Soften the sliced onion and leek in butter, then add diced chicken and brown lightly.\n" +
      "Stir in the flour, then gradually add the stock to make a sauce.\n" +
      "Add a splash of cream, season, and simmer until thick; cool slightly.\n" +
      "Tip into a dish, top with puff pastry and brush with egg.\n" +
      "Bake at 200°C for 25–30 minutes until golden.",
    servings: 4,
    calories: 670,
    protein_g: 40,
    carb_g: 33,
    fat_g: 42,
  },
  {
    title: "Shepherd's Pie",
    tags: ["Lamb"],
    ingredients: [
      ing("Lamb mince", 500, "g"),
      ing("Potatoes", 900, "g"),
      ing("Onion", 1),
      ing("Carrot", 2),
      ing("Garden peas", 150, "g"),
      ing("Tomato purée", 2, "tbsp"),
      ing("Beef stock", 300, "ml"),
      ing("Butter", 40, "g"),
      ing("Milk", 50, "ml"),
    ],
    instructions:
      "Brown the lamb mince with the chopped onion and carrot.\n" +
      "Stir in the tomato purée and stock and simmer 20 minutes, adding the peas near the end.\n" +
      "Meanwhile boil the potatoes and mash with butter and milk.\n" +
      "Spoon the mince into a dish and top with the mash, roughing up the surface.\n" +
      "Bake at 200°C for 25 minutes until golden on top.",
    servings: 4,
    calories: 660,
    protein_g: 30,
    carb_g: 50,
    fat_g: 39,
  },
  {
    title: "Roast Chicken Dinner",
    tags: ["Chicken"],
    ingredients: [
      ing("Whole chicken", 1.5, "kg"),
      ing("Potatoes", 900, "g"),
      ing("Carrots", 400, "g"),
      ing("Broccoli", 1, "head"),
      ing("Gravy granules", 4, "tbsp"),
      ing("Olive oil", 2, "tbsp"),
    ],
    instructions:
      "Heat the oven to 190°C. Rub the chicken with oil and salt and roast (about 20 min per 500g plus 20).\n" +
      "Parboil the potatoes, then roast in hot oil until crisp.\n" +
      "Boil or steam the carrots and broccoli.\n" +
      "Rest the chicken for 15 minutes while you make the gravy.\n" +
      "Carve and serve with the roast potatoes, veg and gravy.",
    servings: 4,
    calories: 535,
    protein_g: 36,
    carb_g: 53,
    fat_g: 21,
  },
  {
    title: "Beef Stew",
    tags: ["Beef"],
    ingredients: [
      ing("Stewing beef", 600, "g"),
      ing("Potatoes", 500, "g"),
      ing("Carrots", 3),
      ing("Onion", 1),
      ing("Celery", 2, "sticks"),
      ing("Beef stock", 700, "ml"),
      ing("Plain flour", 2, "tbsp"),
      ing("Bay leaves", 2),
    ],
    instructions:
      "Toss the beef in seasoned flour and brown in batches, then set aside.\n" +
      "Soften the chopped onion, carrot and celery in the same pan.\n" +
      "Return the beef, add the stock and bay leaves and bring to a simmer.\n" +
      "Cover and cook gently for 1.5–2 hours, adding chunks of potato for the last 40 minutes.\n" +
      "Season and serve.",
    servings: 4,
    calories: 420,
    protein_g: 36,
    carb_g: 33,
    fat_g: 17,
  },
  {
    title: "Mac & Cheese",
    tags: ["Vegetarian", "Pasta"],
    ingredients: [
      ing("Macaroni", 400, "g"),
      ing("Cheddar cheese", 200, "g"),
      ing("Butter", 40, "g"),
      ing("Plain flour", 40, "g"),
      ing("Milk", 600, "ml"),
      ing("Breadcrumbs", 50, "g"),
    ],
    instructions:
      "Cook the macaroni until just tender and drain.\n" +
      "Melt the butter, stir in the flour, then whisk in the milk to make a smooth sauce.\n" +
      "Stir in most of the grated cheddar and season.\n" +
      "Mix in the pasta, tip into a dish and top with breadcrumbs and the rest of the cheese.\n" +
      "Bake at 200°C for 20 minutes until golden and bubbling.",
    servings: 4,
    calories: 780,
    protein_g: 32,
    carb_g: 94,
    fat_g: 29,
  },
  {
    title: "Fish Pie",
    tags: ["Fish"],
    ingredients: [
      ing("White fish", 300, "g"),
      ing("Salmon fillets", 300, "g"),
      ing("Potatoes", 900, "g"),
      ing("Butter", 50, "g"),
      ing("Plain flour", 40, "g"),
      ing("Milk", 500, "ml"),
      ing("Garden peas", 150, "g"),
      ing("Cheddar cheese", 75, "g"),
    ],
    instructions:
      "Boil the potatoes and mash with butter and a splash of milk.\n" +
      "Make a white sauce with butter, flour and milk; season well.\n" +
      "Stir the chunks of fish and the peas into the sauce and tip into a dish.\n" +
      "Top with the mash and a little grated cheddar.\n" +
      "Bake at 200°C for 25–30 minutes until golden and piping hot.",
    servings: 4,
    calories: 670,
    protein_g: 45,
    carb_g: 56,
    fat_g: 30,
  },
  {
    title: "Chicken Curry & Rice",
    tags: ["Chicken", "Spicy"],
    ingredients: [
      ing("Chicken breast", 600, "g"),
      ing("Rice", 300, "g"),
      ing("Onion", 1),
      ing("Garlic", 2, "cloves"),
      ing("Ginger", 20, "g"),
      ing("Curry paste", 3, "tbsp"),
      ing("Chopped tomatoes", 400, "g"),
      ing("Coconut milk", 400, "ml"),
    ],
    instructions:
      "Fry the chopped onion until soft, then add the garlic, ginger and curry paste.\n" +
      "Add the diced chicken and brown lightly.\n" +
      "Stir in the chopped tomatoes and coconut milk.\n" +
      "Simmer for 20–25 minutes until the chicken is cooked and the sauce thickened.\n" +
      "Serve with steamed rice.",
    servings: 4,
    calories: 675,
    protein_g: 44,
    carb_g: 70,
    fat_g: 24,
  },
  {
    title: "Bangers & Mash",
    tags: ["Pork"],
    ingredients: [
      ing("Sausages", 8),
      ing("Potatoes", 900, "g"),
      ing("Onion", 1),
      ing("Gravy granules", 4, "tbsp"),
      ing("Butter", 40, "g"),
      ing("Milk", 50, "ml"),
    ],
    instructions:
      "Grill or bake the sausages until browned and cooked through.\n" +
      "Boil the potatoes and mash with butter and milk.\n" +
      "Slowly fry the sliced onion until soft and golden for onion gravy.\n" +
      "Make up the gravy and stir in the onions.\n" +
      "Serve the sausages over the mash with plenty of gravy.",
    servings: 4,
    calories: 605,
    protein_g: 23,
    carb_g: 51,
    fat_g: 36,
  },
  {
    title: "Tuna Pasta Bake",
    tags: ["Fish", "Pasta"],
    ingredients: [
      ing("Pasta", 400, "g"),
      ing("Tinned tuna", 2, "tins"),
      ing("Sweetcorn", 200, "g"),
      ing("Cheddar cheese", 150, "g"),
      ing("Milk", 500, "ml"),
      ing("Plain flour", 40, "g"),
      ing("Butter", 40, "g"),
    ],
    instructions:
      "Cook the pasta until just tender and drain.\n" +
      "Make a cheese sauce with butter, flour, milk and most of the cheddar.\n" +
      "Stir in the drained tuna, sweetcorn and pasta.\n" +
      "Tip into a dish and scatter with the remaining cheese.\n" +
      "Bake at 200°C for 20 minutes until golden.",
    servings: 4,
    calories: 775,
    protein_g: 41,
    carb_g: 93,
    fat_g: 26,
  },
  {
    title: "Oven Lasagne, Broccoli & Carrots",
    tags: ["Beef", "Pasta", "Easy"],
    ingredients: [
      ing("Frozen lasagne", 1),
      ing("Broccoli", 1, "head"),
      ing("Carrots", 2),
      ing("Garlic bread", 1),
    ],
    instructions:
      "Heat the oven to 200°C.\n" +
      "Put the frozen lasagne in to bake per the pack (about 40–45 minutes).\n" +
      "Add the garlic bread to the oven for the last 8–10 minutes.\n" +
      "Steam or microwave the broccoli and carrots until tender.\n" +
      "Serve the lasagne with the veg and garlic bread.",
    servings: 2,
    calories: 855,
    protein_g: 40,
    carb_g: 94,
    fat_g: 37,
  },
  {
    title: "Spaghetti & Meatballs",
    tags: ["Beef", "Pasta"],
    ingredients: [
      ing("Beef meatballs", 400, "g"),
      ing("Spaghetti", 400, "g"),
      ing("Passata", 500, "g"),
      ing("Onion", 1),
      ing("Garlic", 2, "cloves"),
      ing("Tomato purée", 2, "tbsp"),
      ing("Parmesan", 40, "g"),
    ],
    instructions:
      "Brown the meatballs all over in a little oil, then set aside.\n" +
      "Soften the chopped onion and garlic, then add the passata and tomato purée.\n" +
      "Return the meatballs and simmer for 20 minutes.\n" +
      "Cook the spaghetti until al dente and drain.\n" +
      "Serve the meatballs and sauce over the pasta with grated parmesan.",
    servings: 4,
    calories: 695,
    protein_g: 33,
    carb_g: 88,
    fat_g: 21,
  },
  {
    title: "Chicken Katsu Curry",
    tags: ["Chicken"],
    ingredients: [
      ing("Chicken breast", 600, "g"),
      ing("Breadcrumbs", 100, "g"),
      ing("Plain flour", 60, "g"),
      ing("Egg", 2),
      ing("Rice", 300, "g"),
      ing("Onion", 1),
      ing("Carrot", 1),
      ing("Katsu curry paste", 3, "tbsp"),
    ],
    instructions:
      "Coat the chicken breasts in flour, beaten egg and breadcrumbs.\n" +
      "Fry or oven-bake until golden and cooked through, then slice.\n" +
      "Soften the onion and carrot, stir in the katsu paste and a little water, and simmer into a sauce.\n" +
      "Cook the rice.\n" +
      "Serve the sliced chicken over rice with the curry sauce poured over.",
    servings: 4,
    calories: 715,
    protein_g: 49,
    carb_g: 97,
    fat_g: 17,
  },
  {
    title: "Sweet & Sour Chicken",
    tags: ["Chicken"],
    ingredients: [
      ing("Chicken breast", 600, "g"),
      ing("Rice", 300, "g"),
      ing("Pineapple", 200, "g"),
      ing("Red pepper", 1),
      ing("Onion", 1),
      ing("Sweet and sour sauce", 300, "g"),
      ing("Spring onion", 2),
    ],
    instructions:
      "Dice the chicken and stir-fry over high heat until cooked, then set aside.\n" +
      "Stir-fry the pepper and onion until just softened.\n" +
      "Return the chicken, add the pineapple chunks and the sweet and sour sauce.\n" +
      "Bubble for a couple of minutes to heat through.\n" +
      "Serve over rice, scattered with spring onion.",
    servings: 4,
    calories: 595,
    protein_g: 41,
    carb_g: 90,
    fat_g: 7,
  },
  {
    title: "Beef Tacos",
    tags: ["Beef", "Spicy"],
    ingredients: [
      ing("Beef mince", 500, "g"),
      ing("Taco shells", 8),
      ing("Taco seasoning", 2, "tbsp"),
      ing("Cheddar cheese", 100, "g"),
      ing("Lettuce", 4, "leaves"),
      ing("Tomato", 2),
      ing("Soured cream", 150, "g"),
    ],
    instructions:
      "Brown the mince, then stir in the taco seasoning and a splash of water.\n" +
      "Simmer for a few minutes until thickened.\n" +
      "Warm the taco shells in the oven.\n" +
      "Shred the lettuce, dice the tomato and grate the cheese.\n" +
      "Fill the shells with the beef and toppings and finish with soured cream.",
    servings: 4,
    calories: 580,
    protein_g: 33,
    carb_g: 19,
    fat_g: 40,
  },
  {
    title: "Breaded Chicken, Chips & Beans",
    tags: ["Chicken", "Easy"],
    ingredients: [
      ing("Breaded chicken", 4),
      ing("Chips", 800, "g"),
      ing("Baked beans", 400, "g"),
    ],
    instructions:
      "Heat the oven to 200°C.\n" +
      "Spread the chips on a tray and the breaded chicken on another.\n" +
      "Bake both per the packs (about 20–25 minutes) until crisp and cooked through.\n" +
      "Warm the baked beans in a pan or the microwave.\n" +
      "Serve together.",
    servings: 4,
    calories: 630,
    protein_g: 25,
    carb_g: 75,
    fat_g: 25,
  },
  {
    title: "Fish Fingers, Chips & Peas",
    tags: ["Fish", "Easy"],
    ingredients: [
      ing("Fish fingers", 12),
      ing("Chips", 800, "g"),
      ing("Garden peas", 300, "g"),
      ing("Tartare sauce", 4, "tbsp"),
    ],
    instructions:
      "Heat the oven to 200°C and cook the chips per the pack.\n" +
      "Add the fish fingers for the last 12–15 minutes, turning once.\n" +
      "Cook the peas in boiling water or the microwave.\n" +
      "Serve with tartare sauce.",
    servings: 4,
    calories: 605,
    protein_g: 19,
    carb_g: 69,
    fat_g: 28,
  },
  {
    title: "Sausage & Bean Casserole",
    tags: ["Pork", "Easy"],
    ingredients: [
      ing("Sausages", 8),
      ing("Baked beans", 400, "g"),
      ing("Chopped tomatoes", 400, "g"),
      ing("Onion", 1),
      ing("Mixed herbs", 1, "tsp"),
      ing("Crusty bread", 1, "loaf"),
    ],
    instructions:
      "Brown the sausages, then slice into chunks.\n" +
      "Soften the chopped onion in the same pan.\n" +
      "Add the chopped tomatoes, baked beans and a pinch of herbs.\n" +
      "Return the sausages and simmer for 15–20 minutes.\n" +
      "Serve with crusty bread to mop up.",
    servings: 4,
    calories: 690,
    protein_g: 33,
    carb_g: 74,
    fat_g: 29,
  },
  {
    title: "Toad in the Hole",
    tags: ["Pork"],
    ingredients: [
      ing("Sausages", 8),
      ing("Plain flour", 140, "g"),
      ing("Eggs", 3),
      ing("Milk", 200, "ml"),
      ing("Vegetable oil", 2, "tbsp"),
      ing("Gravy granules", 4, "tbsp"),
    ],
    instructions:
      "Whisk the flour, eggs and milk into a smooth batter and rest it.\n" +
      "Heat a little oil in a roasting tin with the sausages at 220°C until sizzling.\n" +
      "Pour the batter around the sausages and bake for 25–30 minutes until risen and golden — don't open the oven early.\n" +
      "Make up the gravy and serve.",
    servings: 4,
    calories: 610,
    protein_g: 28,
    carb_g: 38,
    fat_g: 39,
  },
  {
    title: "Cottage Pie",
    tags: ["Beef"],
    ingredients: [
      ing("Beef mince", 500, "g"),
      ing("Potatoes", 900, "g"),
      ing("Onion", 1),
      ing("Carrot", 2),
      ing("Garden peas", 150, "g"),
      ing("Beef stock", 300, "ml"),
      ing("Tomato purée", 2, "tbsp"),
      ing("Butter", 40, "g"),
      ing("Milk", 50, "ml"),
    ],
    instructions:
      "Brown the mince with the chopped onion and carrot.\n" +
      "Stir in the tomato purée and stock and simmer 20 minutes, adding peas near the end.\n" +
      "Boil and mash the potatoes with butter and milk.\n" +
      "Top the mince with the mash and fork the surface.\n" +
      "Bake at 200°C for 25 minutes until golden.",
    servings: 4,
    calories: 580,
    protein_g: 31,
    carb_g: 50,
    fat_g: 28,
  },
  {
    title: "Creamy Chicken & Bacon Pasta",
    tags: ["Chicken", "Pasta"],
    ingredients: [
      ing("Chicken breast", 500, "g"),
      ing("Bacon", 6, "rashers"),
      ing("Pasta", 400, "g"),
      ing("Garlic", 2, "cloves"),
      ing("Double cream", 200, "ml"),
      ing("Parmesan", 40, "g"),
      ing("Spinach", 100, "g"),
    ],
    instructions:
      "Fry the diced chicken until golden, then add the chopped bacon and garlic.\n" +
      "Cook the pasta until al dente and drain, keeping a little water.\n" +
      "Stir the cream into the pan and let it bubble, then add the spinach to wilt.\n" +
      "Toss through the pasta and parmesan, loosening with pasta water.\n" +
      "Season and serve.",
    servings: 4,
    calories: 855,
    protein_g: 54,
    carb_g: 73,
    fat_g: 37,
  },
  {
    title: "Tomato Soup & Cheese Toasties",
    tags: ["Vegetarian", "Easy"],
    ingredients: [
      ing("Tomato soup", 400, "g"),
      ing("Bread", 4, "slices"),
      ing("Cheddar cheese", 100, "g"),
      ing("Butter", 30, "g"),
    ],
    instructions:
      "Heat the tomato soup in a pan until steaming.\n" +
      "Butter the bread on the outside and fill with grated cheddar.\n" +
      "Toast in a pan or toastie maker until golden and melting.\n" +
      "Serve the toasties alongside the soup for dipping.",
    servings: 2,
    calories: 580,
    protein_g: 21,
    carb_g: 46,
    fat_g: 35,
  },
  {
    title: "Jacket Potatoes with Beans & Cheese",
    tags: ["Vegetarian", "Easy"],
    ingredients: [
      ing("Baking potatoes", 4),
      ing("Baked beans", 400, "g"),
      ing("Cheddar cheese", 100, "g"),
      ing("Butter", 30, "g"),
    ],
    instructions:
      "Prick the potatoes and microwave for 8–10 minutes to soften.\n" +
      "Finish in a hot oven for 15–20 minutes for crisp skins (optional).\n" +
      "Warm the baked beans.\n" +
      "Split the potatoes, add butter, then top with beans and grated cheese.",
    servings: 4,
    calories: 425,
    protein_g: 16,
    carb_g: 56,
    fat_g: 15,
  },
  {
    title: "Vegetable Stir Fry with Noodles",
    tags: ["Vegetarian", "Easy"],
    ingredients: [
      ing("Egg noodles", 300, "g"),
      ing("Stir fry vegetables", 500, "g"),
      ing("Garlic", 2, "cloves"),
      ing("Ginger", 20, "g"),
      ing("Soy sauce", 3, "tbsp"),
      ing("Sesame oil", 1, "tbsp"),
    ],
    instructions:
      "Cook the noodles per the pack and drain.\n" +
      "Stir-fry the garlic and ginger briefly in hot oil.\n" +
      "Add the stir-fry vegetables and toss over high heat until just tender.\n" +
      "Add the noodles, a good splash of soy and a little sesame oil.\n" +
      "Toss everything together and serve.",
    servings: 4,
    calories: 355,
    protein_g: 12,
    carb_g: 64,
    fat_g: 5,
  },
  {
    title: "Ham, Egg & Chips",
    tags: ["Pork", "Easy"],
    ingredients: [
      ing("Gammon steaks", 4),
      ing("Chips", 800, "g"),
      ing("Eggs", 4),
      ing("Garden peas", 200, "g"),
    ],
    instructions:
      "Cook the chips in the oven until crisp.\n" +
      "Grill or fry the gammon steaks for a few minutes each side.\n" +
      "Fry the eggs to your liking.\n" +
      "Cook the peas.\n" +
      "Plate up the gammon, egg, chips and peas.",
    servings: 4,
    calories: 725,
    protein_g: 56,
    carb_g: 54,
    fat_g: 32,
  },
  {
    title: "Pesto Pasta",
    tags: ["Vegetarian", "Pasta", "Easy"],
    ingredients: [
      ing("Pasta", 400, "g"),
      ing("Pesto", 150, "g"),
      ing("Cherry tomatoes", 200, "g"),
      ing("Parmesan", 30, "g"),
      ing("Pine nuts", 30, "g"),
    ],
    instructions:
      "Cook the pasta until al dente, keeping a splash of the water.\n" +
      "Drain and stir through the pesto, loosening with the pasta water.\n" +
      "Halve the cherry tomatoes and toss through.\n" +
      "Serve with grated parmesan and a few pine nuts.",
    servings: 4,
    calories: 615,
    protein_g: 18,
    carb_g: 74,
    fat_g: 25,
  },
  {
    title: "Beef Burritos",
    tags: ["Beef", "Spicy"],
    ingredients: [
      ing("Beef mince", 500, "g"),
      ing("Tortilla wraps", 4),
      ing("Rice", 250, "g"),
      ing("Kidney beans", 400, "g"),
      ing("Fajita seasoning", 2, "tbsp"),
      ing("Cheddar cheese", 100, "g"),
      ing("Soured cream", 150, "g"),
    ],
    instructions:
      "Brown the mince and stir in the seasoning and the drained kidney beans.\n" +
      "Cook the rice.\n" +
      "Warm the tortillas.\n" +
      "Fill each wrap with rice, beef, grated cheese and soured cream.\n" +
      "Fold into burritos and serve.",
    servings: 4,
    calories: 955,
    protein_g: 45,
    carb_g: 98,
    fat_g: 40,
  },
  {
    title: "Quiche, Chips & Salad",
    tags: ["Vegetarian", "Easy"],
    ingredients: [
      ing("Quiche", 1),
      ing("Chips", 800, "g"),
      ing("Salad leaves", 100, "g"),
      ing("Cherry tomatoes", 150, "g"),
      ing("Cucumber", 0.5),
    ],
    instructions:
      "Heat the quiche through in the oven per the pack.\n" +
      "Cook the chips alongside until crisp.\n" +
      "Toss the salad leaves, tomatoes and cucumber together.\n" +
      "Slice the quiche and serve with the chips and salad.",
    servings: 4,
    calories: 595,
    protein_g: 16,
    carb_g: 67,
    fat_g: 30,
  },
  {
    title: "Pork Chops, Mash & Veg",
    tags: ["Pork"],
    ingredients: [
      ing("Pork chops", 4),
      ing("Potatoes", 900, "g"),
      ing("Broccoli", 1, "head"),
      ing("Carrots", 3),
      ing("Butter", 40, "g"),
      ing("Gravy granules", 4, "tbsp"),
    ],
    instructions:
      "Season the pork chops and fry or grill for 4–5 minutes each side until cooked.\n" +
      "Boil and mash the potatoes with butter.\n" +
      "Steam or boil the broccoli and carrots.\n" +
      "Make up the gravy.\n" +
      "Serve the chops with mash, veg and gravy.",
    servings: 4,
    calories: 635,
    protein_g: 48,
    carb_g: 50,
    fat_g: 30,
  },
  {
    title: "Chicken Noodle Soup",
    tags: ["Chicken", "Easy"],
    ingredients: [
      ing("Chicken breast", 300, "g"),
      ing("Egg noodles", 200, "g"),
      ing("Chicken stock", 1.2, "L"),
      ing("Carrot", 2),
      ing("Sweetcorn", 150, "g"),
      ing("Spring onion", 2),
    ],
    instructions:
      "Bring the chicken stock to a simmer.\n" +
      "Add the diced chicken and sliced carrot and cook for 10 minutes.\n" +
      "Add the noodles and sweetcorn and cook until the noodles are tender.\n" +
      "Scatter with spring onion and serve.",
    servings: 4,
    calories: 315,
    protein_g: 25,
    carb_g: 47,
    fat_g: 3,
  },
  {
    title: "Omelette & Salad",
    tags: ["Vegetarian", "Easy"],
    ingredients: [
      ing("Eggs", 6),
      ing("Cheddar cheese", 60, "g"),
      ing("Salad leaves", 60, "g"),
      ing("Cherry tomatoes", 100, "g"),
      ing("Bread", 2, "slices"),
    ],
    instructions:
      "Beat the eggs and season.\n" +
      "Pour into a hot buttered pan and cook until almost set.\n" +
      "Scatter over grated cheese, fold and slide onto a plate.\n" +
      "Serve with a simple salad and bread.",
    servings: 2,
    calories: 450,
    protein_g: 30,
    carb_g: 20,
    fat_g: 26,
  },
];

// Seed recipe photos (Unsplash → our Cloudinary via the unsigned preset, so
// next/image renders them). Recipes not listed here have no photo and fall back
// to the placeholder — some niche UK dishes had no good Unsplash match. Keyed by
// exact recipe title.
export const STARTER_IMAGES: Record<string, { image_url: string; image_public_id: string }> = {
  "Spaghetti Bolognese": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471274/starter-recipes/juayha0vtgf8rx2xbohg.jpg", image_public_id: "starter-recipes/juayha0vtgf8rx2xbohg" },
  "Chilli Con Carne": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471275/starter-recipes/pqryjjoxjbpg9avjvslw.jpg", image_public_id: "starter-recipes/pqryjjoxjbpg9avjvslw" },
  "Chicken Fajitas": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471276/starter-recipes/ca5uf3vmigbolxmkmxec.jpg", image_public_id: "starter-recipes/ca5uf3vmigbolxmkmxec" },
  "Cheeseburger & Chips": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471277/starter-recipes/g92yha9vumo5sww399ob.jpg", image_public_id: "starter-recipes/g92yha9vumo5sww399ob" },
  "Sausage Carbonara": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471279/starter-recipes/j8uqzhm4za1eqelixcqn.jpg", image_public_id: "starter-recipes/j8uqzhm4za1eqelixcqn" },
  "Steak & Chips": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471280/starter-recipes/jkudznwt8l1a1flakah2.jpg", image_public_id: "starter-recipes/jkudznwt8l1a1flakah2" },
  "Jerk Chicken": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471285/starter-recipes/jdoa50jirunmx72nf3ee.jpg", image_public_id: "starter-recipes/jdoa50jirunmx72nf3ee" },
  "Oven Pizza": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471286/starter-recipes/zwcs8xkoy0awdyf4od1i.jpg", image_public_id: "starter-recipes/zwcs8xkoy0awdyf4od1i" },
  "Fish & Chips": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471287/starter-recipes/av8d2qhoo9nqkg7jynjr.jpg", image_public_id: "starter-recipes/av8d2qhoo9nqkg7jynjr" },
  "Chicken Pie": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471289/starter-recipes/cncbxsmrdgseyongkkkv.jpg", image_public_id: "starter-recipes/cncbxsmrdgseyongkkkv" },
  "Roast Chicken Dinner": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471291/starter-recipes/vsmi1f0stjsrc22h8zhj.jpg", image_public_id: "starter-recipes/vsmi1f0stjsrc22h8zhj" },
  "Beef Stew": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471293/starter-recipes/gdpjkmq97l3f5j6jdseq.jpg", image_public_id: "starter-recipes/gdpjkmq97l3f5j6jdseq" },
  "Mac & Cheese": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471294/starter-recipes/ypj9br2jonjvimrqbzgk.jpg", image_public_id: "starter-recipes/ypj9br2jonjvimrqbzgk" },
  "Chicken Curry & Rice": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471296/starter-recipes/ztm93v6fb1qspggf9jfo.jpg", image_public_id: "starter-recipes/ztm93v6fb1qspggf9jfo" },
  "Bangers & Mash": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471298/starter-recipes/nbgwm6md3q6hdxvqg98o.jpg", image_public_id: "starter-recipes/nbgwm6md3q6hdxvqg98o" },
  "Tuna Pasta Bake": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471300/starter-recipes/wdceat2rwiqdypkluczj.jpg", image_public_id: "starter-recipes/wdceat2rwiqdypkluczj" },
  "Oven Lasagne, Broccoli & Carrots": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471301/starter-recipes/gqnvkqtckjexyyzmuxl0.jpg", image_public_id: "starter-recipes/gqnvkqtckjexyyzmuxl0" },
  "Spaghetti & Meatballs": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471302/starter-recipes/w9gr3z0qz3ujhit5art8.jpg", image_public_id: "starter-recipes/w9gr3z0qz3ujhit5art8" },
  "Sweet & Sour Chicken": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471305/starter-recipes/wlfb8jtnzt5uqva3b6rl.jpg", image_public_id: "starter-recipes/wlfb8jtnzt5uqva3b6rl" },
  "Beef Tacos": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471306/starter-recipes/ipmomqwh5wzc7sjnqtnq.jpg", image_public_id: "starter-recipes/ipmomqwh5wzc7sjnqtnq" },
  "Breaded Chicken, Chips & Beans": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471427/starter-recipes/owj3ett4othdjjzabq91.jpg", image_public_id: "starter-recipes/owj3ett4othdjjzabq91" },
  "Fish Fingers, Chips & Peas": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471309/starter-recipes/j8zotbnnb7zbm7eoiaww.jpg", image_public_id: "starter-recipes/j8zotbnnb7zbm7eoiaww" },
  "Toad in the Hole": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471425/starter-recipes/pfwzcgruxy4flhlvxf8s.jpg", image_public_id: "starter-recipes/pfwzcgruxy4flhlvxf8s" },
  "Cottage Pie": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471313/starter-recipes/x7qrip89reaw6iav3zne.jpg", image_public_id: "starter-recipes/x7qrip89reaw6iav3zne" },
  "Creamy Chicken & Bacon Pasta": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471314/starter-recipes/lkslbmr27nouteralmpg.jpg", image_public_id: "starter-recipes/lkslbmr27nouteralmpg" },
  "Vegetable Stir Fry with Noodles": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471318/starter-recipes/fdc4hbtsdigdz1iwd73g.jpg", image_public_id: "starter-recipes/fdc4hbtsdigdz1iwd73g" },
  "Ham, Egg & Chips": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471319/starter-recipes/idggom4c3np0sbdqutwv.jpg", image_public_id: "starter-recipes/idggom4c3np0sbdqutwv" },
  "Pesto Pasta": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471321/starter-recipes/obgclyvksqkwl6ebqtlx.jpg", image_public_id: "starter-recipes/obgclyvksqkwl6ebqtlx" },
  "Beef Burritos": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471322/starter-recipes/skklh636g75ndtpiuway.jpg", image_public_id: "starter-recipes/skklh636g75ndtpiuway" },
  "Quiche, Chips & Salad": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471323/starter-recipes/vz46fl6nvqjywaqzdd9p.jpg", image_public_id: "starter-recipes/vz46fl6nvqjywaqzdd9p" },
  "Pork Chops, Mash & Veg": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471324/starter-recipes/wj0xvsjukkxrtmtaswcm.jpg", image_public_id: "starter-recipes/wj0xvsjukkxrtmtaswcm" },
  "Chicken Noodle Soup": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787471326/starter-recipes/cuux5wsqyg983ukoksks.jpg", image_public_id: "starter-recipes/cuux5wsqyg983ukoksks" },
  "Chicken Gyros": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608767/starter-recipes/vvglysg7tn1fb9eyzql0.jpg", image_public_id: "starter-recipes/vvglysg7tn1fb9eyzql0" },
  "Shepherd's Pie": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608781/starter-recipes/ofcmq0et25liaogfolgm.jpg", image_public_id: "starter-recipes/ofcmq0et25liaogfolgm" },
  "Fish Pie": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608782/starter-recipes/g1esxk81ilmtvkvxa9is.jpg", image_public_id: "starter-recipes/g1esxk81ilmtvkvxa9is" },
  "Chicken Katsu Curry": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608783/starter-recipes/fvpforj3sztbtsuexgdz.jpg", image_public_id: "starter-recipes/fvpforj3sztbtsuexgdz" },
  "Sausage & Bean Casserole": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608785/starter-recipes/n55jdf9wsow003okjm9m.jpg", image_public_id: "starter-recipes/n55jdf9wsow003okjm9m" },
  "Tomato Soup & Cheese Toasties": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608787/starter-recipes/arlmuaeapqs5jgfwiljj.jpg", image_public_id: "starter-recipes/arlmuaeapqs5jgfwiljj" },
  "Jacket Potatoes with Beans & Cheese": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608789/starter-recipes/z5wr6tkfaklvrlchyqyu.jpg", image_public_id: "starter-recipes/z5wr6tkfaklvrlchyqyu" },
  "Omelette & Salad": { image_url: "https://res.cloudinary.com/ipuvfjk4/image/upload/v1787608790/starter-recipes/nnkgbievlgkranhiu18j.jpg", image_public_id: "starter-recipes/nnkgbievlgkranhiu18j" },
};

// Unsplash photographer credit for each seed photo, keyed by Cloudinary
// public_id (parsed out of the image URL). Used to attribute stock photos and
// to detect that a recipe is still using a stock image (so we blur it and nudge
// the user to add their own).
export const STOCK_PHOTO_CREDITS: Record<string, { name: string; link: string }> = {
  "starter-recipes/juayha0vtgf8rx2xbohg": { name: "Homescreenify", link: "https://unsplash.com/photos/spaghetti-on-white-ceramic-plate-sA3wymYqyaI" },
  "starter-recipes/pqryjjoxjbpg9avjvslw": { name: "Artur Kornakov", link: "https://unsplash.com/photos/cooked-food-on-black-bowl-kwJhh14nUcs" },
  "starter-recipes/ca5uf3vmigbolxmkmxec": { name: "Thomas Park", link: "https://unsplash.com/photos/a-wooden-table-topped-with-plates-of-food-G3hZMCdLUdw" },
  "starter-recipes/g92yha9vumo5sww399ob": { name: "Jonathan Borba", link: "https://unsplash.com/photos/burger-with-fries-8l8Yl2ruUsg" },
  "starter-recipes/j8uqzhm4za1eqelixcqn": { name: "Rob Wicks", link: "https://unsplash.com/photos/a-white-plate-topped-with-spaghetti-and-bacon-fDLBn8X_IlU" },
  "starter-recipes/jkudznwt8l1a1flakah2": { name: "Tim Toomey", link: "https://unsplash.com/photos/grilled-meat-on-white-ceramic-plate-pe9dvM1rQkM" },
  "starter-recipes/jdoa50jirunmx72nf3ee": { name: "Mohammad Fahim", link: "https://unsplash.com/photos/grilled-chicken-leg-with-rice-and-stir-fried-vegetables-pvqcYluq7UI" },
  "starter-recipes/zwcs8xkoy0awdyf4od1i": { name: "Ivan Torres", link: "https://unsplash.com/photos/cheese-pizza-with-tomatoes-and-rosemary-MQUqbmszGGM" },
  "starter-recipes/av8d2qhoo9nqkg7jynjr": { name: "Meelan Bawjee", link: "https://unsplash.com/photos/cooked-meat-and-french-fries-in-white-disposable-plate-A_tPBct4tz8" },
  "starter-recipes/cncbxsmrdgseyongkkkv": { name: "Rob Wicks", link: "https://unsplash.com/photos/a-plate-of-food-_Ei6W_L_2Ak" },
  "starter-recipes/vsmi1f0stjsrc22h8zhj": { name: "Elena Leya", link: "https://unsplash.com/photos/chicken-breast-dinner-with-peas-DBVIb_rWUKw" },
  "starter-recipes/gdpjkmq97l3f5j6jdseq": { name: "Laura Ohlman", link: "https://unsplash.com/photos/a-bowl-of-food-y_7KLDoPlAc" },
  "starter-recipes/ypj9br2jonjvimrqbzgk": { name: "Giorgio Trovato", link: "https://unsplash.com/photos/mac-and-cheese-served-on-a-white-plate-DcjbDVkleqQ" },
  "starter-recipes/ztm93v6fb1qspggf9jfo": { name: "Kelsey He", link: "https://unsplash.com/photos/a-wooden-table-topped-with-a-plate-of-food-GW1BUTVR5Po" },
  "starter-recipes/nbgwm6md3q6hdxvqg98o": { name: "Jonathan Majam", link: "https://unsplash.com/photos/plate-of-mashed-potatoes-and-meatballs-on-a-wooden-table-4r-T1Hui-co" },
  "starter-recipes/wdceat2rwiqdypkluczj": { name: "David Trinks", link: "https://unsplash.com/photos/a-casserole-dish-sitting-on-a-stove-top-UN1mx680neg" },
  "starter-recipes/gqnvkqtckjexyyzmuxl0": { name: "joe boshra", link: "https://unsplash.com/photos/a-delicious-slice-of-lasagna-with-melted-cheese-JNCxXU3A0H0" },
  "starter-recipes/w9gr3z0qz3ujhit5art8": { name: "Carolina Cossío", link: "https://unsplash.com/photos/spaghetti-on-white-ceramic-plate-Ucwd8w-JHwM" },
  "starter-recipes/wlfb8jtnzt5uqva3b6rl": { name: "Janesca", link: "https://unsplash.com/photos/a-bowl-of-food-CteaqWgFq3M" },
  "starter-recipes/ipmomqwh5wzc7sjnqtnq": { name: "Jeswin Thomas", link: "https://unsplash.com/photos/beef-tacos-with-onion-and-cilantro-z_PfaGzeN9E" },
  "starter-recipes/owj3ett4othdjjzabq91": { name: "mahsa shamshiri fard", link: "https://unsplash.com/photos/a-plate-of-food-that-includes-fries-coleslaw-and-coleslaw--2p0aTN0vgM" },
  "starter-recipes/j8zotbnnb7zbm7eoiaww": { name: "Nik", link: "https://unsplash.com/photos/a-white-plate-topped-with-fries-and-dipping-sauce-it8E1AV4td8" },
  "starter-recipes/pfwzcgruxy4flhlvxf8s": { name: "Andy Kennedy", link: "https://unsplash.com/photos/golden-brown-yorkshire-puddings-in-a-glass-dish-YdoMntDbZwQ" },
  "starter-recipes/x7qrip89reaw6iav3zne": { name: "The Fry Family Food Co.", link: "https://unsplash.com/photos/a-casserole-dish-on-a-plate-with-a-fork-next-to-it-LHr6EN-B8NQ" },
  "starter-recipes/lkslbmr27nouteralmpg": { name: "Pixzolo Photography", link: "https://unsplash.com/photos/sauced-penne-pasta-dish-on-bowl-aeESmmFKH0M" },
  "starter-recipes/fdc4hbtsdigdz1iwd73g": { name: "Orijit Chatterjee", link: "https://unsplash.com/photos/stir-fried-noodles-with-vegetables-wEBg_pYtynw" },
  "starter-recipes/idggom4c3np0sbdqutwv": { name: "Gennady Zakharin", link: "https://unsplash.com/photos/sliced-ham-bread-and-boiled-eggs-on-a-plate-WE0aytJby7U" },
  "starter-recipes/obgclyvksqkwl6ebqtlx": { name: "Nerfee Mirandilla", link: "https://unsplash.com/photos/white-ceramic-plate-with-food-o1EDsUFmuXQ" },
  "starter-recipes/skklh636g75ndtpiuway": { name: "Ryan Concepcion", link: "https://unsplash.com/photos/wrapped-food-with-gravies-50KffXbjIOg" },
  "starter-recipes/vz46fl6nvqjywaqzdd9p": { name: "Jasmin Schreiber", link: "https://unsplash.com/photos/selective-focus-photography-of-vegetable-salad-V2Kw-YC7Cls" },
  "starter-recipes/wj0xvsjukkxrtmtaswcm": { name: "Nerfee Mirandilla", link: "https://unsplash.com/photos/cooked-food-on-ceramic-plate-UgKVWZuCxCk" },
  "starter-recipes/cuux5wsqyg983ukoksks": { name: "Markus Winkler", link: "https://unsplash.com/photos/a-bowl-of-noodles-DXVG6Rld_dQ" },
  "starter-recipes/vvglysg7tn1fb9eyzql0": { name: "Orkun Orcan", link: "https://unsplash.com/photos/a-burrito-with-a-side-of-pickles-and-a-small-bowl-of-ranch-dressing-C7ESFm-638Q" },
  "starter-recipes/ofcmq0et25liaogfolgm": { name: "Curated Lifestyle", link: "https://unsplash.com/photos/homemade-lasagna-food-photography-recipe-idea-SH2WezmP2eI" },
  "starter-recipes/g1esxk81ilmtvkvxa9is": { name: "Natalia Y.", link: "https://unsplash.com/photos/pizza-on-black-round-plate-cHgnxl9Gl5c" },
  "starter-recipes/fvpforj3sztbtsuexgdz": { name: "Anna Jakutajc-Wojtalik", link: "https://unsplash.com/photos/two-bowls-of-food-on-a-table-with-chopsticks-Jp6LI-LbA_c" },
  "starter-recipes/n55jdf9wsow003okjm9m": { name: "Fellipe Ditadi", link: "https://unsplash.com/photos/a-table-topped-with-bowls-of-food-and-a-wooden-spoon-8Vn3n1U6kwc" },
  "starter-recipes/arlmuaeapqs5jgfwiljj": { name: "Julia Kicova", link: "https://unsplash.com/photos/brown-soup-on-white-and-blue-ceramic-bowl-Qct8v6wdyRs" },
  "starter-recipes/z5wr6tkfaklvrlchyqyu": { name: "Will Ma", link: "https://unsplash.com/photos/a-sandwich-with-meat-and-vegetables-ZxAo9hnRo40" },
  "starter-recipes/nnkgbievlgkranhiu18j": { name: "JSB Co.", link: "https://unsplash.com/photos/a-white-plate-topped-with-an-omelet-next-to-a-salad-RntvjdTs-j0" },
};

// A recipe photo is a seed "stock" image if its Cloudinary URL is in the
// starter-recipes folder. We blur those + nudge the user to add their own.
export function isStockPhoto(src: string | null | undefined): boolean {
  return !!src && src.includes("/starter-recipes/");
}
export function stockPhotoCredit(src: string | null | undefined): { name: string; link: string } | null {
  if (!src) return null;
  const m = src.match(/\/(starter-recipes\/[^/.]+)\./);
  return m ? STOCK_PHOTO_CREDITS[m[1]] ?? null : null;
}
