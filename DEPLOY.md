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

## B. Households + auth release (held — deploy separately, later)

Adds households + enforced email verification + password reset (Resend). Lives
on `feat/households-auth`, deliberately unpushed. The frontend §6.1 auth pages
(verify-email, forgot/reset-password, unverified state) already ship in **A**.

The image migration took `004` on `api-refactor`, so households' migration must
be renumbered to `005` first.

```bash
# B0. Renumber the households migration (in the households worktree/branch)
git mv db/migrations/004_households.sql db/migrations/005_households.sql
git commit -m "Renumber households migration 004 -> 005 (image migration took 004)"

# B1. Merge into api-refactor locally so the migrations folder has 004_add_image + 005_households
git checkout api-refactor
git merge feat/households-auth

# B2. Migration 005 on prod FIRST (nullable household_id — old code ignores it)
railway run npm run migrate:up

# B3. Resend env on Railway
railway variables --set RESEND_API_KEY=<resend_key> --set EMAIL_FROM=<verified_sender>

# B4. (Optional) pre-verify existing users so they aren't locked out
railway connect Postgres      # then: UPDATE "user" SET "emailVerified" = true;

# B5. Push -> Railway deploys (npm install pulls resend)
git push origin api-refactor
```

**Do not run B5 before B2 completes** — pushing the households code before
migration 005 is applied 500s every request on the missing `household_id`
columns.

After deploy, smoke-test the auth flows (these weren't exercised end-to-end
against the verification backend):

1. Sign up → verification email link → auto-signed-in.
2. Forgot password → reset email link → set new password → sign in.
3. Sign in as an unverified user → routed to `/verify-email` (the sign-in code
   uses a 403/message heuristic; confirm it matches BetterAuth's real error and
   tighten if needed).
