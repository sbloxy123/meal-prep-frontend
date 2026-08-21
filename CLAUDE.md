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

- `src/lib/menu.tsx` — **MenuProvider**, the backbone. Backed by one endpoint (`GET /shopping-list`): `thisWeek`, `onMenuIds`, `listCount`, `collections`, `shoppingList`, ingredient/tag lookups, `openStockCheck`, `requestRemoveRecipe`, `clearAllRecipes`, `refresh`. Hosts the StockCheck sheet + a ConfirmDialog. Refetches on window focus/visibility.
- `src/lib/toast.tsx` — ToastProvider: `show(msg)` + `showUndo({message,onUndo,onCommit})`; flushes pending commits on `pagehide`.
- `src/lib/write-queue.ts` — offline write queue (localStorage; retries on `online` + interval); `useWriteQueue()` → `{pending, offline}`.
- Also: `use-modal.ts` (a11y focus-trap/Escape/scroll-lock), `use-wake-lock.ts`, `cloudinary.ts` (unsigned upload + `next/image` loader), `format.ts`, `starter-recipes.ts`.

### Pages

| Route | File | Notes |
|---|---|---|
| `/sign-in` `/sign-up` | `(auth)/…` | BetterAuth |
| `/verify-email` `/forgot-password` `/reset-password` | `(auth)/…` | email-verification + reset flow |
| `/recipes` | `(app)/recipes/page.tsx` | list; search, collection/favourite chips, **sort (Newest/Oldest/A–Z by id)**; empty state shows **"Welcome, {name}"** + **Add starter recipes** picker |
| `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit` | `(app)/recipes/…` | RecipeForm (shared); photo upload via Cloudinary |
| `/this-week` | `(app)/this-week/page.tsx` | menu; edit stock check, remove, **Clear all recipes** |
| `/shopping-list` | `(app)/shopping-list/page.tsx` | draft list; add own items, AI parse box, Generate/Show list by aisle |
| `/shopping-list/shop` | `(app)/shopping-list/shop/page.tsx` | shopping mode: wake lock, offline queue, aisle reorder, Finish shop |
| `/account` | `(app)/account/page.tsx` | profile (name/email/member-since), **Household** section, change password, delete account |
| `/household/join/[token]` | `app/household/…` | accept-invite page |

### Households & invites (frontend side)

`src/components/household-card.tsx` (on Account) — members + roles, invite-by-email, pending invites, leave/remove, rename (owner). Talks to the backend `/household/*` endpoints. **Invite auto-join:** the join page stashes the token in `localStorage` (`fornetto:pendingInvite`) when the invitee is logged out; `src/components/pending-invite.tsx` (in the `(app)` layout) consumes it on the first authenticated load, so invitees land already joined.

### PWA / offline

Manual `src/app/manifest.ts` + `public/sw.js` (`ServiceWorkerRegister`). Icons/favicons in `public/` (Fornetto oven mark: `favicon.svg`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192/512.png`). Offline writes queue; shop page holds a Wake Lock.

## Deployment

Vercel auto-deploys `main` on push. Backend (Railway) deploys from `api-refactor`. Backend `ALLOWED_ORIGINS` must list the frontend origins — currently `https://fornetto.app,https://www.fornetto.app,https://meal-prep-frontend.vercel.app` (first entry builds email links). See `DEPLOY.md` for the full sequence (esp. the migrate-first rule for backend schema changes).
