# CLAUDE.md

Next.js frontend for the Recipe Inventory app. Deployed on Vercel (`meal-prep-frontend.vercel.app`). The Express API lives at `github.com/sbloxy123/meal-prep-app` (branch `api-refactor`), deployed on Railway.

## Commands

```bash
npm run dev    # start dev server on localhost:3000
npm run build  # production build
npm run lint
```

## Environment Variables

```
# Used in next.config.ts as the proxy destination — not used directly in frontend code
NEXT_PUBLIC_API_URL=http://localhost:3001
```

On Vercel, `NEXT_PUBLIC_API_URL` is set to `https://meal-prep-app-production-7120.up.railway.app`.

## Architecture

Next.js App Router. All pages are under `src/app/`.

### Route groups

- `(auth)` — sign-in, sign-up pages (no session required)
- `(app)` — authenticated pages; layout redirects to `/sign-in` if no session

### Auth

BetterAuth client (`src/lib/auth-client.ts`) with no `baseURL` — it uses the current origin. Auth requests go to `/api/auth/*` which Next.js proxies to Railway.

```ts
export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
```

### API calls

`src/lib/api.ts` exports `apiFetch(path, options?)`. Uses `/backend` as base path, which Next.js proxies to the Railway API root.

```ts
// e.g. to fetch recipes:
apiFetch('/recipes')  →  /backend/recipes  →  Railway /recipes
```

### Proxy (next.config.ts)

All API traffic is proxied through Next.js to keep cookies same-origin (avoids `SameSite=Lax` / Safari ITP issues):

```
/api/:path*      →  NEXT_PUBLIC_API_URL/api/:path*   (BetterAuth)
/backend/:path*  →  NEXT_PUBLIC_API_URL/:path*        (data API)
```

### Pages

| Route | File | Notes |
|---|---|---|
| `/sign-in` | `(auth)/sign-in/page.tsx` | |
| `/sign-up` | `(auth)/sign-up/page.tsx` | |
| `/recipes` | `(app)/recipes/page.tsx` | Main app page (scaffold) |
| `/account` | `(app)/account/page.tsx` | Change password |

## Deployment

Vercel auto-deploys from `main` branch on push. No build config needed — Vercel detects Next.js automatically.

After deploying, make sure Railway's `ALLOWED_ORIGINS` includes the Vercel URL.
