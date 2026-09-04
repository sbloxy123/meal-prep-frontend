# CLAUDE.md

**Fornetto** — a recipe + weekly-menu + shopping-list app. This repo is the Next.js frontend.

- **Live:** `https://fornetto.app` (Cloudflare registrar/DNS, grey-cloud / DNS-only → **Vercel**). Apex is primary; `www` 308-redirects to it. `meal-prep-frontend.vercel.app` still resolves.
- **API:** Express + Postgres at `github.com/sbloxy123/meal-prep-app` (branch `api-refactor`), deployed on **Railway**. Its own `CLAUDE.md` documents the backend.
- **Deploy runbook:** see `DEPLOY.md`.

## Commands

```bash
npm run dev    # dev server on localhost:3000 (Turbopack)
npm run build  # production build
npm run lint
npm test       # node --test (native TS stripping); currently src/lib/instructions.test.ts
```

## Environment variables

```
NEXT_PUBLIC_API_URL=http://localhost:3001          # proxy destination (next.config.ts only)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ipuvfjk4         # public
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=recipe-inventory-preset
```

On Vercel, `NEXT_PUBLIC_API_URL` = `https://meal-prep-app-production-7120.up.railway.app`.

## Architecture

Next.js 16 App Router (React 19, TS, Turbopack). Pages under `src/app/`.

### Design system — vendored, NOT Tailwind-for-visuals

`src/styles/classical.css` holds the design tokens (CSS custom properties: colour, radius, shadow, spacing), the type (**Cormorant Garamond** headings + **Lora** body, via `@import`), and base component classes (`.btn`, `.input`, `.field`, `.tag`, `.dialog`…). Per-feature CSS lives in `src/styles/*.css` (`shell`, `recipes`, `week`, `shopping`, `shop`, `recipe-form`, `auth`, `account`, `toast`), all imported in `src/app/layout.tsx`. Tailwind is present but used only for incidental layout. Accent `#b68235` is a **stroke** colour, not a fill.

### Route groups & the shell

- `(auth)` — sign-in, sign-up, verify-email, forgot-password, reset-password. No session needed.
- `(app)` — authenticated pages. `(app)/layout.tsx` redirects to `/sign-in` when `useSession()` resolves to no session, and mounts `MenuProvider` → `ToastProvider` → `<PendingInvite/>` → `<AppShell>`.
- `household/join/[token]` — standalone (outside both groups) so logged-out invitees can reach it.
- `/` and `/about` — the public **marketing page** (outside both groups → root layout only, no auth gate, no data-API calls). Both render one shared server component `src/components/marketing-home.tsx`; the interactive bits live in `src/components/marketing-client.tsx`. On `/`, `<RedirectIfAuthed>` sends signed-in visitors to `/recipes`; `/about` never redirects, so existing users can revisit the tour (linked from the rail + Account as "How to use Fornetto"). Styling is class-based in `src/styles/home.css` (scoped under `.home`); the `<details>` burger keeps `data-burger*` hooks. Auth-adaptive CTAs default to signed-out (correct SSR) and swap to "Back to app" when a session is present.

`AppShell` (`src/components/app-shell.tsx`): desktop left **rail** (≥1024px) with the Fornetto oven mark + wordmark (links to `/recipes`), nav, collections, user link; mobile **bottom tab bar** (Recipes / This week / List / Account) + a sticky **top brand header**.

### Auth (BetterAuth)

`src/lib/auth-client.ts` — `createAuthClient()` with no `baseURL` (uses current origin). Auth calls hit `/api/auth/*`, proxied to Railway. Email verification is enforced by the backend; sign-up routes to `/verify-email` when no session token is returned, else does a **full-page load** to `/recipes` (SPA push would race `useSession` and bounce to sign-in).

### API calls

`src/lib/api.ts`: `apiFetch<T>(path, opts?)` (returns parsed JSON) and `apiSend(path, opts?)` (for empty-body writes). Both use `/backend` base → proxied to Railway root. Non-2xx throws `ApiError { status, body }` (401 body = `"UNAUTHORISED"`); used for validation branching and the offline write-queue's transient/permanent classification.

### Proxy (next.config.ts)

Keeps cookies same-origin (avoids `SameSite=Lax`/Safari ITP):

```
/api/:path*      →  NEXT_PUBLIC_API_URL/api/:path*   (BetterAuth)
/backend/:path*  →  NEXT_PUBLIC_API_URL/:path*        (data API)
```

### Shared state

- `src/lib/menu.tsx` — **MenuProvider**, the backbone. Backed by one endpoint (`GET /shopping-list`): `thisWeek`, `onMenuIds`, `listCount`, `collections`, `shoppingList`, ingredient/tag lookups, `openStockCheck`, `requestRemoveRecipe`, `clearAllRecipes`, `deleteRecipe`, `refresh`, plus the onboarding fields (`onboardingNeeded`, `onboardingOutcome`, `foodPrefs`, `dietaryRule`). Hosts the StockCheck sheet + a ConfirmDialog. Refetches on window focus/visibility.
  - **Delete recipes via `menu.deleteRecipe(id)`** so the menu and shopping list refresh with it. The API clears the recipe's shopping-list items itself (meal-prep-app#22); it didn't until 2026-09-02, and the client-side workaround that covered the gap has been removed — don't reintroduce one.
- **Credits, trial and plan — `menu.allowance` (`AiAllowance` in `menu.tsx`).** Derived from `GET /shopping-list`'s `entitlement` (backend `lib/credits.js` shape): `plan` (`free` | `trial` | `premium`), `isPremium` (premium OR trial), `trialDaysLeft`, `used/limit/remaining` (credits this period; `Infinity` when unlimited), `resetsAt` (the signup-anniversary turnover — copy says "tops up on the 14th" via `resetDay()`), `weights`, `memberLimit`, and two helpers every AI surface uses: **`costOf(action)`** and **`canAfford(action)`** (a photo scan costs 3, most things 1, the shopping list 0 — so aisle-sort has no guard at all). `confirmAiSpend(action)` prices the dialog by the action. A 429 with `error: "CREDIT_LIMIT"` (or the older `WEEKLY_LIMIT`) is detected by `isCreditLimit(err)` and shown with `creditLimitMessage(err)` — the server's sentence carries the balance and reset day. Falls back to the pre-credits fields (`plan/aiUsedThisWeek/aiWeeklyLimit/weekResetsAt`) when `entitlement` is absent. Prices: £3.99/month, Free 50 credits, Premium and trial 300, comps unlimited; the knobs live in the backend's `app_config` and are edited from `/back-of-house` ("Plan settings").
- `src/lib/toast.tsx` — ToastProvider: `show(msg)` + `showUndo({message,onUndo,onCommit})`; flushes pending commits on `pagehide`.
- `src/lib/write-queue.ts` — offline write queue (localStorage; retries on `online` + interval); `useWriteQueue()` → `{pending, offline}`.
- **`instructions.ts` — `parseInstructions` + the prose fallback.** The method is one TEXT column, one step per line. When it holds a single long line (what the AI paths used to write) it is split on sentence boundaries so old recipes render as steps without a migration; short one-liners and anything already multi-line are left exactly as they are. `splitSentences` is a byte-for-byte twin of the backend's `lib/steps.js`, which stops new prose being written — change them together. `shouldTakeMethod` lets **Improve** replace a single line of prose with real steps, and never touches a method that already has them.
- Also: `use-modal.ts` (a11y focus-trap/Escape/scroll-lock), `use-wake-lock.ts`, `cloudinary.ts` (unsigned upload + `next/image` loader), `format.ts`, `starter-recipes.ts` (the 40 curated starters), `starter-picker.ts`, `dish-match.ts`.
- **`useModalA11y` sets its trap up once and holds `onClose` in a ref.** Callers define `onClose` inline, so depending on its identity re-ran the effect on every render — and the effect's mount step focuses the first control, which made typing inside a modal impossible (it also shut the mobile keyboard). Don't add `onClose` back to the dependency array. Its focusable selector must keep listing `textarea`/`select`, or fields are skipped by Tab entirely.

### Pages

| Route | File | Notes |
|---|---|---|
| `/` `/about` | `app/page.tsx`, `app/about/page.tsx` → `components/marketing-home.tsx` | public marketing page (see route-groups note); `/` redirects signed-in users to `/recipes`, `/about` doesn't. Install button → native prompt where one exists, else the install sheet |
| `/install` | `app/install/page.tsx` → `components/install-page.tsx` | public step-by-step install guide (see PWA section); where the install email, Account card and rail link land. `?from=` is analytics only; `?platform=ios-safari` etc. previews another phone's guide |
|---|---|---|
| `/sign-in` `/sign-up` | `(auth)/…` | BetterAuth |
| `/verify-email` `/forgot-password` `/reset-password` | `(auth)/…` | email-verification + reset flow |
| `/recipes` | `(app)/recipes/page.tsx` | list; search, collection/favourite chips, **sort (Newest/Oldest/A–Z by id)**; per-card favourite + **delete** (confirm dialog → `menu.deleteRecipe`); empty state leads with the **questionnaire** when it's still on offer, else the **Add starter recipes** picker |
| `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit` | `(app)/recipes/…` | RecipeForm (shared); photo upload via Cloudinary |
| `/this-week` | `(app)/this-week/page.tsx` | menu; edit stock check, remove, **Clear all recipes** |
| `/shopping-list` | `(app)/shopping-list/page.tsx` | draft list; add own items, AI parse box, Generate/Show list by aisle |
| `/shopping-list/shop` | `(app)/shopping-list/shop/page.tsx` | shopping mode: wake lock, offline queue, aisle reorder, Finish shop |
| `/account` | `(app)/account/page.tsx` | profile (name/email/member-since), **Household** section, change password, delete account |
| `/household/join/[token]` | `app/household/…` | accept-invite page |

### Onboarding — "Let's get you started"

A five-step dialog (`src/components/onboarding-wizard.tsx`) that turns an empty account into a usable kitchen: intro → proteins → diets + scope → **the meals you actually cook** → preview. It ends by creating recipes, which is the payoff the first screen promises.

- **Two entry points, one component.** `OnboardingGate` (`(app)/layout.tsx`) opens it automatically, `entry="auto"`; `recipes/page.tsx` mounts it for the retake via `?onboarding=1`, `entry="account"`, passing `existingTitles` so a retake can't re-add what the household has. The gate's decision rides `GET /shopping-list` (no extra request) and is latched, so a MenuProvider refetch can't yank the dialog away mid-step.
- **The trigger** (server-side) is `(onboarded_at IS NULL OR onboarding_outcome = 'pre_existing') AND NOT has_recipes`. `pre_existing` is the migration-014 backfill meaning "was already using the app", **not** an answer — so an established account that empties its recipe list qualifies again. Only a real `completed`/`skipped` settles it.
- **Answers are saved on leaving step 3** (`PUT /household/dietary`), before anything can go wrong with seeding. The separate `PUT /household/onboarding` write, which stops the questionnaire being offered again, fires only on genuine completion. Per-member answers live on `household_member.food_prefs`; the kitchen-wide rule is `household.dietary_rule` and is **owner-only**.
- **Step 4, "My usuals"** posts the typed dishes to `POST /recipes/usuals`, which writes them up as real recipes tagged `My usuals`. It is **free** — logged to `app_events`, never `recipe_imports` — so `aiUsedThisWeek` must not move; that's the check to repeat after touching it. Server caps: 10 dishes, 3 runs/24h per household (429 `USUALS_LIMIT`, show the server's `message`). Send it an `AbortSignal`, or a hung request locks the dialog.
- **A typed dish matching a curated starter uses the curated recipe** instead of an AI draft (`dish-match.ts` — synonym expansion, conservative token rules; a bare "chicken" matches nothing). Better recipe, no AI call.
- **`starter-picker.ts` is pure and deterministic** — same answers, same list, so the funnel and any support conversation are reproducible. Filtering reads a recipe's `proteins` field, never its `tags` (tags are user-facing collections and they lie). Vegan/gluten-free are `UNSERVABLE` by the curated set, so the wizard hands those users to the AI generator rather than offering a list they can't cook — but only when they haven't typed dishes of their own.
- Funnel events (`onboarding_shown` → `_started` → `_step` → `_usuals_typed` → `_completed`/`_skipped`/`_ai_handoff`) are fire-and-forget via `logEvent`, and are **whitelisted server-side by name and by meta key** — an unlisted name or field is silently dropped. They surface on `/back-of-house`.

### Households & invites (frontend side)

`src/components/household-card.tsx` (on Account) — members + roles, invite-by-email, pending invites, leave/remove, rename (owner). Talks to the backend `/household/*` endpoints. **Invite auto-join:** the join page stashes the token in `localStorage` (`fornetto:pendingInvite`) when the invitee is logged out; `src/components/pending-invite.tsx` (in the `(app)` layout) consumes it on the first authenticated load, so invitees land already joined.

### PWA / offline

Manual `src/app/manifest.ts` + `public/sw.js` (`ServiceWorkerRegister`). **In local dev the service worker serves stale JS**: a change can appear not to have applied at all, across reloads and restarts. Unregister it and clear the `mise-v1` cache (DevTools → Application → Service Workers) before concluding a fix doesn't work. Icons/favicons in `public/` (Fornetto oven mark: `favicon.svg`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192/512.png`). Offline writes queue; shop page holds a Wake Lock.

**Installing — there is no iOS install prompt, and there never will be.** WebKit's standards position on `BeforeInstallPromptEvent` is "oppose" (Apple: install prompts are "rife for abuse"); Safari has no `appinstalled`, `navigator.share()` can't reach Add to Home Screen, and a page can't ask whether it's on the Home Screen. Every iPhone install is a manual Share → Add to Home Screen, in Safari or (since iOS 16.4) Chrome/Firefox/Edge. Don't re-investigate: the only alternatives are a `.mobileconfig` web clip (Settings → Profile → passcode, unverified as a real web app) or an App Store wrapper (Apple IAP for Premium), both declined 2026-09-03. So the "prompt" is ours. Everything lives in `src/lib/install.ts` (native-prompt capture at module level — imported from `ServiceWorkerRegister` so the listener exists before the event fires; `detectPlatform()`; the auto-prompt policy in localStorage `fornetto:installPrompt`; `logInstall`/`logStandaloneOpen`):

- **`src/lib/ios-layouts.ts` — where each iPhone browser keeps Add to Home Screen, per iOS version.** Safari 26+ (Compact layout: **•••** by the address bar → Share → **View More** → Add to Home Screen — the iOS 26 share sheet hides it behind View More; four taps), Safari 15–25 and ≤14 (centre Share button), Chrome (Share icon → **Open in Safari** → finish there: on real devices — BrowserStack iPhone 17/iOS 26.6 and iPhone 16/iOS 18.6 — Chrome's share sheet has NO Add to Home Screen, whatever Google's help page says), Firefox/Edge (≡ → Share). Each row has `verifiedOn`/`verifiedBy`; `MAX_VERIFIED_IOS` is the newest iOS anyone has checked it on and `ios-layouts.test.ts` fails if it's bumped without a row reaching it. **The September ritual:** after each iOS release, open the app on it in Safari and Chrome, check the buttons, add/extend rows, bump the number. **Safari on iOS 26+ freezes the UA's OS token at `iPhone OS 18_6/18_7`; only `Version/26.x` carries the real release** — `parseIosVersion` takes the newer of the two (Chrome/Firefox on iOS report the true OS token and no `Version/`). Preview any variant on desktop with `?platform=ios-safari&ios=17.5` (forced views aren't logged).
- **Device-verified 2026-09-03 (BrowserStack real devices, production):** Safari on iOS 17.3 and 18.6 (centre Share → scroll → Add to Home Screen), Safari on iOS 26.5 (••• → Share → View More → Add to Home Screen → Add; the icon installs and opens standalone at sign-in), Chrome on iOS 18.6 and 26.6 (no Add to Home Screen anywhere → Open in Safari). **Not device-verified:** Firefox and Edge on iPhone (BrowserStack iPhones only offer Safari and Chrome) — their rows are from Mozilla/Microsoft docs. To re-check: BrowserStack Live → iOS → hover a device row → the Safari/Chrome icons appear at the row's right end; type the URL into the device's own address bar (the dashboard URL box is unreliable); Vercel PR previews sit behind Vercel SSO, so test production.
- **The stale-layout alarm.** A phone on an iOS newer than `MAX_VERIFIED_IOS` gets the `GENERIC` walkthrough (layout-agnostic wording, no arrow) and logs `install_layout_unverified` once per session (`logLayoutUnverified`, from the gate). The backend emails `ADMIN_EMAILS` on the first sighting of each new major, and `/back-of-house` shows a notice until a build with a higher `MAX_VERIFIED_IOS` has been seen.
- `components/install-guide.tsx` — the platform-specific steps (iPhone branches from the registry, plus iOS in-app / Chrome < 16.4 → "open in Safari", Android with or without a native prompt, desktop, already installed). Shared by the sheet's single-screen mode and `/install`. Screenshots go in `public/install/` via `SHOTS`, keyed `${walkthrough.key}-${step}`; `install-illustrations.tsx` draws the controls until they land.
- `components/install-sheet.tsx` — bottom sheet on phones, dialog on desktop. **On an iPhone it is a one-step-at-a-time walkthrough**: offer → three big pictures (from the registry) → *Got it — point me at it*, which hands off to `install-coach.tsx`: a slim card on the screen edge where the real control is, bouncing arrow aimed at it (bottom-right for •••/≡, bottom-centre for Safari's Share, top-right for Chrome's), the three taps in one line; goes away on Got it / page hidden / 90 s, and hides the banner meanwhile (`body[data-install-coach]`). Owners render it via `useInstallCoach()`. Elsewhere it's the single-screen guide; Chrome/Edge get an **Install** button that fires the held native prompt. `source="auto"` offers *Not now* (7-day snooze; a plain close counts as later) and *Don't show this again*.
- `components/install-gate.tsx` — the auto-open, mounted after `OnboardingGate`: once per device on phones/tablets, never on desktop, never on top of the questionnaire (if onboarding was wanted at any point this session it sets `sessionStorage fornetto:installGateSkip` and waits for the next one). Also logs `install_standalone_open` once per session — **the only true install metric on iOS**.
- `components/install-banner.tsx` — the always-there fallback on phones; tapping it opens the sheet. Dismiss key `fornetto:iosInstallDismissed` kept from the old iOS-only hint.
- `MarketingInstallButton` (`marketing-client.tsx`, used on `/`, `/about` and Account) — native prompt if held, else the sheet.
- **Email**: the backend sends "Put Fornetto on your home screen" once after verification (`afterEmailVerification`, link to `/install?from=email`); `InstallEmailButton` (Account card + `/install` when signed in) resends it via `POST /install/email` (3/user/24h, 429 message shown verbatim).

Two traps the copy is built around: **links opened from the Gmail/Instagram apps land in an in-app browser with no Add to Home Screen** (the guide leads with "Open in Safari" + a Copy-link button; detection is a UA heuristic, so the Safari branch keeps a "can't see it?" escape hatch too), and **the installed iOS app has its own cookie jar**, so the last step tells people to sign in once inside it — otherwise it reads as a bug. Funnel events (`install_prompt_shown/_outcome` — outcome `coach` = handed to the arrow, `install_page_view`, `install_standalone_open`, `install_layout_unverified`; `install_email_sent` server-side) are whitelisted like the onboarding ones and surface on `/back-of-house`; `POST /events` needs a session, so guide views from signed-out phones don't count.

## Deployment

Vercel auto-deploys `main` on push. Backend (Railway) deploys from `api-refactor`. Backend `ALLOWED_ORIGINS` must list the frontend origins — currently `https://fornetto.app,https://www.fornetto.app,https://meal-prep-frontend.vercel.app` (first entry builds email links). See `DEPLOY.md` for the full sequence (esp. the migrate-first rule for backend schema changes).
