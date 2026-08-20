# Deploy runbook

Two apps, two hosts:

| App | Repo | Host | Deploys from |
| --- | --- | --- | --- |
| Frontend (this repo) | `sbloxy123/meal-prep-frontend` | Vercel | `main` (auto-deploy on push) |
| Backend / API | `sbloxy123/meal-prep-app` | Railway | `api-refactor` (auto-deploy on push) |

Rules that bite if ignored:

- **Migrations run before the code that needs them.** Adding a column then
  deploying code that reads it is safe; deploying the code first 500s every
  request until the migration lands. Run migrations with
  `railway run npm run migrate:up` (Railway injects the prod `DATABASE_URL`;
  `dotenv` won't override an already-set var, so it targets prod).
- **Backend before frontend** — the API must have the new columns/endpoints
  before the UI that calls them goes live.
- **Never commit secrets.** `.env` / `.env.local` are gitignored. Cloudinary
  cloud name + upload preset are public (they ship in the client bundle);
  the Cloudinary API secret, `BETTER_AUTH_SECRET`, `RESEND_API_KEY` etc. live
  only in the host dashboards / local `.env`.

---

## A. Redesign deploy (the frontend rebuild + its API endpoints)

Backend commits on `api-refactor` for this: `POST /generated-shopping-list`
(§8.2a), `POST /shopping-list/finish` (§8.1), and recipe images (§9 — migration
`004_add_image_to_recipes` + Cloudinary asset cleanup).

### 1. Backend (Railway, `api-refactor`) — migration first

```bash
# in the meal-prep-app repo, on api-refactor

# 1a. Image columns on prod first (nullable — old code ignores them)
railway run npm run migrate:up

# 1b. Cloudinary env on Railway (fill in the key/secret from the Cloudinary dashboard)
railway variables \
  --set CLOUDINARY_CLOUD_NAME=ipuvfjk4 \
  --set CLOUDINARY_API_KEY=<api_key> \
  --set CLOUDINARY_API_SECRET=<api_secret>

# 1c. Push -> Railway builds (npm install pulls `cloudinary`) and deploys
git push origin api-refactor
```

### 2. Frontend (Vercel, `main`)

```bash
# in the meal-prep-frontend repo

# 2a. Public Cloudinary env on Vercel (Production)
vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production      # value: ipuvfjk4
vercel env add NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET production   # value: recipe-inventory-preset

# 2b. Merge the redesign into main and push -> Vercel auto-deploys
git checkout main
git merge feat/redesign-shell
git push origin main
```

(Env vars can also be set in the Railway / Vercel dashboards. `NEXT_PUBLIC_API_URL`
on Vercel and `DATABASE_URL` / `ALLOWED_ORIGINS` / `BETTER_AUTH_*` on Railway
should already be set.)

### 3. Post-deploy checks

- Railway `ALLOWED_ORIGINS` includes the Vercel URL.
- Smoke test on prod: sign in → create a recipe **with a photo** → add to this
  week (stock check) → generate list by aisle → tick items → finish shop →
  delete a recipe (confirm its Cloudinary asset is removed).

---

## B. Households release (built, held for deploy)

Adds household tenancy (shared recipes/menus/lists), enforced email
verification + password reset, and **invite/join/leave** so people can actually
share a kitchen. All built and locally tested; **nothing pushed**.

- **Backend**: branch `feat/households` (recipe-inventory) — the households
  merge, the invite/join endpoints (`/household/*`), and the `user_id` →
  `SET NULL` change. Merges fast-forward-ish into `api-refactor`.
- **Frontend**: branch `feat/households-ui` (meal-prep-frontend) — the account
  Household section + `/household/join/[token]` accept page. Merges into `main`.
- **Migrations added** (apply in order): `005_households`,
  `006_household_invites`, `007_user_id_set_null`.

**Prerequisite — Resend**: a Resend account with a **verified sending domain**.
`EMAIL_FROM` must be a sender on that domain, or invite/verification emails only
reach your own Resend account address.

### Deploy order (migrations first, backend before frontend)

```bash
# --- Backend (recipe-inventory) ---

# B1. Apply 005/006/007 to PROD FIRST. railway run uses the internal DB host,
#     which only resolves inside Railway — run through the Postgres service's
#     public URL instead (never printed):
git checkout feat/households   # working tree must hold the new migrations
railway run --service Postgres bash -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" npm run migrate:up'

# B2. Pre-verify existing users so turning on verification doesn't lock them out
railway run --service Postgres bash -c 'psql "$DATABASE_PUBLIC_URL" -c '\''UPDATE "user" SET "emailVerified"=true'\'''

# B3. Resend env on the backend service
railway variables --service meal-prep-app --set RESEND_API_KEY=<resend_key> --set EMAIL_FROM='Mise en Place <noreply@yourdomain>'

# B4. Ship the backend (Railway builds, npm install pulls resend; the start
#     command re-runs migrate:up which is now a no-op)
git checkout api-refactor && git merge feat/households && git push origin api-refactor

# --- Frontend (meal-prep-frontend), only after the backend is green ---
git checkout main && git merge feat/households-ui && git push origin main
```

**Never push B4 before B1 completes** — the new code 500s on missing
`household_id` columns until the migrations are applied.

### Post-deploy smoke test (these paths weren't exercised against a live email backend)
1. Sign up → verification email arrives → link verifies → signed in.
2. Forgot password → reset email → set new password → sign in.
3. Sign in as an unverified user → routed to `/verify-email`.
4. **Invite flow**: Account → Household → invite a second email → that person
   signs up/verifies → opens the invite link → Join → both see the shared
   recipes/list. Then test Leave and Remove.
5. Delete-account: a solo account deletes cleanly (household + Cloudinary gone);
   a shared member's deletion leaves the shared recipes intact (attribution
   nulled).
