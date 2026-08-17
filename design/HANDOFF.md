# Frontend redesign — Claude Code brief

**What this is.** A complete specification for restyling and partly restructuring `sbloxy123/meal-prep-frontend`. The design is approved and final. Read this whole file before writing code.

**Working setup.** Open Claude Code in the parent folder containing both `meal-prep-frontend` and `meal-prep-app`. You will read from both; you will only write to the frontend, except where §9 explicitly says otherwise.

---

## 1. Ground rules

Read these first. Most of the ways this job goes wrong are here.

- **Do not change the API contract.** No new response shapes, no renamed fields, no altered status codes. The one permitted backend change is §9 (a migration and two small endpoints), and it is called out explicitly.
- **`routes/*.js` in `meal-prep-app@api-refactor` is the truth for endpoints.** Read them before wiring anything. The old EJS templates use `?_method=PUT` form overrides — that is a legacy artefact, not the current API. Where this document names a path, verify it against the router.
- **Do not refactor data fetching, auth, or the Next.js proxy.** `apiFetch`, the BetterAuth client, and the `next.config.ts` rewrites all work. Leave them.
- **Do not add libraries** beyond `lucide-react` and (later) a Cloudinary upload widget and a PWA plugin, without asking.
- **The existing frontend styling is throwaway.** It was scaffolding to prove data flow. Delete it freely. Inter goes entirely.
- **When a design detail is ambiguous, match the design file and state the assumption in your commit message.** Do not invent a third option.
- **Stop at the gates in §12.** Do not run the whole build in one pass.

---

## 2. Files provided

Copied into `design/` in the frontend repo:

| File | What it is |
| --- | --- |
| `design/Meal Plan Redesign.dc.html` | **The design.** Open it in a browser. |
| `design/support.js`, `design/image-slot.js` | Required for that file to render. Not app code. |
| `design/classical/styles.css` | The design system. Vendor this into the app. |
| `design/legacy-views/` | The retired EJS templates. **Behavioural** reference only — never a styling reference. |
| `design/HANDOFF.md` | This file. |

### How to read the design file

It contains three sections, top to bottom:

1. **Turn 2 — desktop.** Four screens at 1280px. **Build these.**
2. **Turn 1 — option `1a`.** The approved mobile flow. **Build this.**
3. **Turn 1 — option `1b`.** A rejected alternative. **Ignore entirely.** If you find yourself building a stepped picker with a progress bar, you are in the wrong section.
4. **Core screens.** Shared mobile screens: login, recipe detail, draft list, aisle list, empty state, recipe form. **Build these.**

Photos in the design are drag-and-drop placeholders. They indicate size and position only.

---

## 3. Design system contract

Vendor `design/classical/styles.css` unchanged into the app and import it once in the root layout. Use its CSS custom properties directly. **Do not translate the palette into a Tailwind theme** — the design leans on the ramps heavily and a translation will drift. Tailwind for layout utilities is fine; colour, type and radius come from the variables.

**Type.** Cormorant Garamond headings (`--font-heading`), Lora body (`--font-body`), both from Google Fonts. Remove Inter and every reference to it.

**Colour.** Ground `--color-bg` (#f3f2f2), text `--color-text` (#201f1d), one accent `--color-accent` (#b68235). Each role has a 100–900 ramp. Tinted fills and subtle borders from 100–300; 500 is the base; 700–900 for text on tints and pressed states. Prefer ramp steps over ad-hoc `color-mix()`.

**The single most important rule: accent is stroke, not fill.** Buttons are an accent border on transparent (`.btn.btn-primary`). No solid accent blocks, no gradients, no filled cards. If a screen has a large area of gold in it, it is wrong.

**Structure comes from hairlines.** 1px `--color-divider` rules separate sections. Cards are bordered and unfilled. Shadows only via `--shadow-sm/md/lg`, and they are a whisper.

**Details that are easy to miss:**
- Never use `--color-accent` for body-size text — contrast fails. Use `--color-accent-700`.
- Counts, times, quantities, prices: `font-variant-numeric: tabular-nums`.
- Bold is avoided. Headings cap at the `--font-heading-weight` semibold. Emphasis is italic, not bold.
- Reuse the system's classes — `.btn`, `.tag`, `.field`, `.input`, `.card`, `.plate`, `.table`, `.dialog`, `.hr` — rather than writing parallel ones.
- Photographs go through `.plate`.
- Focus: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`. Never the browser default.
- Icons: Lucide (`lucide-react`) at its shipped defaults — `stroke-width: 2`, round caps and joins, `stroke="currentColor"`. Do not thin the stroke. The icons in the design file are approximations of Lucide glyphs; use the real ones, matched by name (`search`, `chevron-down`, `chevron-right`, `star`, `check`, `sparkles`, `book-open`, `calendar`, `list-checks`, `trash-2`, `pencil`).

---

## 4. Structural changes from the current app

1. **"The pan" is now "This week"** in all user-facing copy. `is_on_menu` stays as the field name. "Add to pan" → "Add to this week". "Remove from pan" → "Remove". "This week's menu" → "This week".
2. **Navigation:** mobile gets a fixed bottom tab bar (Recipes / This week / List); desktop gets a 216px left rail with counts, a collections list and the user at the foot. See §5.
3. **The stock check becomes a bottom sheet** on mobile and a **centred 560px dialog** on desktop. It replaces the inline `.ingredients__popout`.
4. **Stock-check boxes start unticked.** The user ticks what they *need to buy*; anything left unticked is assumed already in the fridge. "Need everything" ticks all. A live "3 of 5 selected" count. Primary action reads "Add recipe & N items". When re-opened via "Edit stock check", previously selected ingredients are ticked (this is the existing `isActive` logic in `index.ejs`).
5. **"This week" is a docked tray** above the mobile tab bar whenever ≥1 recipe is on the menu, and a permanent right column on desktop.
6. **Recipe detail is a real page** at `/recipes/[id]` — photo, tags, prep/cook time, ingredients in two columns, instructions, source link, favourite toggle, "Add to this week". `singleRecipe.ejs` is currently an unstyled dump; rebuild from the design.
7. **Collections filtering:** a search field plus a few pinned collection chips and an "All 23 ›" affordance opening the full list. Never render 23 chips in a row.
8. **The AI is explicit.** The paste box is labelled "Add with AI" with a sparkle icon and the helper "Type it however you like — it gets split into separate items."
9. **The generated list uses collapsing aisle sections** on mobile (expanded by default on desktop), each with a `collected/total` count, plus an overall `5/18` counter and a hairline progress rule. Collected items strike through and dim in place; the delete button appears once collected, as it does today.
10. **Quantities are hidden on the shopping list.** They appear on the recipe detail page and in the recipe form only. Exceptions: an aggregation multiplier (`×2`) and the existing "appears in x N recipes" note.
11. **Instructions render as steps.** See §10.
12. **Login** — email + password against BetterAuth, using the editorial hero from the design ("The week's shopping, in order."). Include a sign-up link.
13. **Empty states** for: no recipes, nothing on this week, empty draft list, empty generated list. The design shows the "This week" one — follow its pattern exactly (bordered icon, serif heading, one sentence, one primary action, one ghost alternative).

---

## 5. Responsive contract

Two real layouts, one breakpoint at **1024px**. Below it, mobile as drawn in `1a`. Above it, desktop as drawn in Turn 2. **Never stretch the mobile column across a desktop viewport.**

| | Mobile (<1024px) | Desktop (≥1024px) |
| --- | --- | --- |
| Navigation | Fixed bottom tab bar, safe-area padded | 216px left rail: wordmark, nav with counts, collections, user at foot |
| This week | Tray docked above the tabs → own screen | Permanent 290px right column on Recipes; no separate screen |
| Stock check | Bottom sheet | Centred dialog, 560px, photo panel on the left |
| Recipe list | Single-column rows, 76px square photo | Three-up card grid, 126px photo on top |
| Draft list | Stacked sections | Two columns — "From recipes" left, "Your own items" + AI box right |
| Generated list | Collapsing aisle sections, one column | Three CSS columns, `break-inside: avoid` per aisle, all aisles expanded |
| Page actions | In header or footer bar | Inline in the page header |

Aisle sections collapse on mobile because of thumb reach. On desktop they start open and collapsing is optional.

Touch targets never below 44px. The mobile tab bar and any docked tray must respect `env(safe-area-inset-bottom)`.

---

## 6. Screen inventory

Each screen below names its states. **A screen is not done until every state renders.**

### 6.1 Login
Email + password, `POST /api/auth/sign-in/email`. States: idle, submitting, invalid credentials, network error. Sign-up link to a matching page (`POST /api/auth/sign-up/email`, needs `name`).

### 6.2 Recipes (mobile `1a` screen 1 / desktop screen 1)
Search by title or ingredient; pinned collection chips + "All 23 ›"; recipe rows/cards with photo, title, tags, favourite star. Per card: "Add to this week" — or, when `is_on_menu`, an "On this week" marker plus "Edit stock check". Docked tray when ≥1 on menu. States: loading, empty (no recipes at all), no search results, error.

### 6.3 Stock check (sheet / dialog)
Opens from a recipe card. All boxes unticked by default; ticked items are the ones to buy. "Need everything", live count, "Add recipe & N items". Submits to the create-shopping-list endpoint with the recipe id and the selected ingredient names. States: open, submitting, error, re-opened with existing selections ticked.

### 6.4 This week (mobile screen 3 / desktop right column)
Recipes on the menu, each with its item count and an ingredient summary line, "Edit stock check", remove. Footer: "Add another recipe", "Review shopping list". States: populated, empty (the design's empty screen).

### 6.5 Recipe detail — `/recipes/[id]`
Hero photo, tags, prep/cook/ingredient-count meta row, ingredients in two columns *with* quantities, instructions as steps, source link, favourite toggle, "Add to this week". States: loading, not found, no photo, no instructions, no link.

### 6.6 Draft shopping list
Two clearly separated groups: **From recipes** (each row noting its recipe; "appears in x N recipes" where relevant) and **Your own items**. Inline edit and delete per row. Single-item add field. The "Add with AI" box. Primary action "Generate list by aisle". Secondary "Clear list". States: loading, both groups empty, one group empty, AI pending, AI error, generating.

### 6.7 Generated list / shopping mode
Collapsing aisle sections with per-aisle counts, overall counter and progress rule, tick to collect, delete once collected. Footer: "Forgot something? Add it…" + Add, "Clear collected", "Finish shop". States: loading, empty (never generated), all collected, offline, syncing.

The overall counter is the sum of every aisle's collected/total, including aisles scrolled out of view or collapsed. The mobile and desktop frames in the design use different sample lists (four aisles vs six) — that is sample data, not two different rules.

### 6.8 Add / edit recipe
Sectioned form: details (title, description, prep, cook, link), instructions, ingredients (name / quantity / unit, add and remove), collections (existing chips + add new). Image drop zone above Title (§9). States: create, edit, saving, validation errors from the Zod schema, delete confirmation.

---

## 7. Journey to preserve

Read `design/legacy-views/index.ejs`, `shoppingList.ejs` and `generatedShoppingList.ejs` before writing features. They define behaviour that must survive the redesign:

- Selecting individual ingredients per recipe, submitted with `recipeId` plus the chosen ingredient names.
- The strict separation of recipe-derived items from user-added custom products — this is how the data is managed, and the two have different endpoints. Never merge them in the draft list.
- Inline rename and per-item delete on both groups.
- Favourite toggling from the recipe list.
- Collections attached at recipe create/edit time, from existing tags or a newly typed one.
- The shared-ingredient dedup rule: an item only leaves the list when no other recipe on the menu still needs it. **This lives in the API. Do not reimplement it client-side.**

---

## 8. Known gaps to fix — development backlog

These are real defects in the current product, agreed with the client. Each says where it lives and what it costs. Work them in the order given in §12, not up front.

### 8.1 The loop never closes — "Finish shop" (highest priority)
**Problem.** There is no end state. After shopping, the list persists and every recipe still has `is_on_menu = true`, so next week starts dirty.
**Fix.** A "Finish shop" action on the generated list that: clears `shopping_list`, clears `generated_shopping_list`, and sets `is_on_menu = false` for all of the user's recipes. Confirm before running, with a clear description of what is about to be cleared.
**Where.** One new API endpoint composing existing queries (e.g. `POST /shopping-list/finish`). No schema change. Frontend: a dialog and a redirect to Recipes with a confirmation toast.

### 8.2 Regenerating destroys shopping progress
**Problem.** `generated_shopping_list` is cleared and rebuilt on every organise call. Regenerating mid-shop loses every tick.
**Fix, two parts.**
(a) **Add a single item directly to the generated list** — the "Forgot something? Add it…" field drawn in the design footer (mobile) and header (desktop). It appends one item without regenerating. Put it in an "Other" aisle, or let the AI place it if that is cheap; "Other" is acceptable and preferred for speed.
(b) **Guard the regenerate.** If a generated list exists and has any collected items, confirm first and say plainly that progress will be lost.
**Where.** (a) is one small endpoint (`POST /generated-shopping-list` with a product name) plus a row insert. (b) is frontend only.

### 8.3 The AI calls have no waiting state
**Problem.** `POST /shopping-list/organise` and `POST /shopping-list/parse-ingredients` are real network calls to Anthropic taking seconds. Nothing indicates work in progress, so users double-tap — and the second organise wipes the first.
**Fix.** Disable the button while in flight, show a pending state on the control itself, and render a visible error with a retry if it fails. **Guard against double submission** — this is the point of the item, not the spinner. Both controllers fall back through `jsonrepair`, but can still fail.
**Where.** Frontend only.

### 8.4 Replace `confirm()` with undo
**Problem.** Three native `confirm()` dialogs in the legacy views. Unstyled, jarring, and wrong against this design system.
**Fix.** Optimistic delete plus an undo toast (roughly 6 seconds) for item deletes. Keep an explicit styled confirmation dialog only for the genuinely destructive, non-undoable actions: clear-the-whole-list, delete-a-recipe, and finish-shop.
**Where.** Frontend only. Use the design system's `.dialog` for the confirmations.

### 8.5 Offline resilience — PWA plus a write queue
**Problem.** This app is used inside a supermarket. Signal is bad. Ticks are lost.
**Fix, two independent parts. Both are needed — the PWA alone does not solve this.**
(a) **PWA.** A web app manifest (name, icons, `display: standalone`, theme colour `--color-bg`) and a service worker that caches the app shell and the generated-list route so the app opens with no connection. Installable on iOS and Android.
(b) **A write queue.** Ticking is optimistic and updates local state immediately. Failed writes queue in `localStorage` and retry on reconnect (`online` event plus a periodic retry). A quiet inline status line — "offline · N changes will sync" — never a blocking modal.
**Do not rely on the Background Sync API.** Safari does not support it, and the phone in the shop is as likely to be an iPhone as not. The localStorage queue is the mechanism; the service worker is only for caching.
**Where.** Frontend only. Keep the service worker minimal — cache the shell, not the API responses, apart from the last generated list.

### 8.6 The screen sleeps mid-shop
**Fix.** Wake Lock API, requested only on the generated-list route, released on navigate away and re-requested on `visibilitychange`. Feature-detect; it is unsupported in some browsers and must fail silently.
**Where.** Frontend only, roughly ten lines.

### 8.7 Aisle order does not match the real store
**Problem.** The AI picks an order. The user's supermarket has a fixed, different layout.
**Fix.** Let the user drag aisle sections into their preferred order and persist that order in `localStorage` keyed by user id. Apply it as a sort over the API response. Aisles the user has never seen go to the bottom in AI order. Include a "reset to suggested order" action.
**Where.** Frontend only. **No schema change, no endpoint.** If per-store layouts are wanted later, this is the upgrade path — do not build for that now.

---

## 9. Recipe images (Cloudinary)

The design shows photos at: 76px square (mobile recipe row), 126px tall (desktop card), 230px hero (recipe detail), 200px panel (desktop stock-check dialog).

**This is the one permitted backend change.**

1. **Migration** in `meal-prep-app@api-refactor`: `003_add_image_to_recipes.sql` adding `image_url TEXT` and `image_public_id TEXT` to `recipes`. Return both from the recipe queries. Add both as optional strings in `schemas/recipe.schema.js`. Follow the existing `node-pg-migrate` pattern — do not introduce a different migration tool.
2. **Upload** unsigned, direct from the browser to Cloudinary, using a dedicated upload preset restricted to one folder. The API never proxies the file. On success, PUT `secure_url` and `public_id` onto the recipe.
3. **Env:** `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. **No API secret in the frontend.** If you need one, stop and ask.
4. **Rendering:** Cloudinary URL transformations, never full-size downloads — `f_auto,q_auto,c_fill` with an explicit width per usage (card 400w, hero 1200w, dialog 400w). `next/image` with the Cloudinary loader; add the domain to `next.config.ts`.
5. **Deleting a recipe** deletes its Cloudinary asset via `image_public_id`, from the API, not the browser.
6. **No image is the normal case.** Recipes without one get the bordered placeholder from the design. Test a mixed grid — half with photos, half without — and make sure the row rhythm survives.
7. **Upload UI:** a drop zone above "Title" in the recipe form, with progress, replace and remove. Bordered, no filled accent.
8. **Update `meal-prep-app/CLAUDE.md`** to document the new columns and the Cloudinary flow. A future session will not know they exist otherwise.

---

## 10. Instructions rendering

`recipes.instructions` is a single `TEXT` column holding brief notes — a few short steps, not prose. **No schema change.**

Render it by splitting on newlines: two or more non-empty lines become an ordered list with tabular step numbers in the accent; a single line renders as one paragraph. Strip any leading `1.`, `1)`, `-` or `•` the user typed, so numbering never doubles up.

In the recipe form, use a textarea with the hint "One step per line" and `white-space: pre-wrap`. This gets structured output from users without a schema migration or a repeater UI.

---

## 11. Accessibility floor

- Every checkbox is a real `<input type="checkbox">` inside a `<label>` — the tick graphic is styling over a native control, never a `<div>` with a click handler.
- The `collected/total` counters and any list mutation announce via a polite live region.
- The bottom sheet and the dialog trap focus, close on Escape, and return focus to the trigger.
- Icon-only buttons (favourite, delete) carry an `aria-label`.
- Collapsing aisle headers are `<button>` with `aria-expanded`.

---

## 12. Build order and stop gates

Commit at every step with a short message. **Stop where marked and wait.**

1. Vendor the stylesheet, load Cormorant and Lora, remove Inter, build the app shell: left rail on desktop, bottom tab bar on mobile, page header pattern. **← STOP. Show one screen at both widths and wait for approval.**
2. Recipes list (both layouts) + recipe detail page.
3. Stock check (sheet + dialog) + This week tray + This week screen. **← STOP. This is the core of the redesign; get it reviewed.**
4. Draft list, including the AI box, with §8.3 pending and error states built in from the start.
5. Generated list and shopping mode, including §8.2a "add an item", §8.2b regenerate guard, and §8.7 aisle reordering.
6. Login, add/edit recipe form, all empty states, §8.4 undo toasts.
7. §8.1 Finish shop — API endpoint plus the confirmation dialog.
8. §9 Cloudinary — migration first, run it, then upload UI, then rendering.
9. §8.5 PWA and write queue, §8.6 wake lock. Last, because they are hard to test until the rest is real.

---

## 13. Definition of done

Before calling any step complete:

- No Inter anywhere. Headings are Cormorant Garamond; body is Lora.
- No filled accent surfaces. Gold appears as borders, rules, small icons and tabular figures only.
- Every colour, radius and shadow traces to a CSS variable from `styles.css`.
- Both layouts checked at 390px and 1440px. Nothing stretched, nothing clipped.
- Every state in §6 renders — including loading, empty and error.
- Keyboard: tab through the screen, focus ring visible everywhere, no traps outside the modal.
- No native `confirm()` or `alert()` remains.
- Numbers set tabular wherever they are figures.

---

## 14. If you get stuck

Match the design file and say what you assumed. Do not invent a third pattern, do not reach for a component library, and do not change the API to make a screen easier. If a screen genuinely cannot be built without a backend change beyond §9 and §8.1–8.2, stop and ask.
