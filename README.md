# Arcanum Platform

To run locally:

- Install deps: `npm ci`
- Dev: `npm run dev`
- Lint+types: `npm run lint:ci`
- Build: `npm run build`

Env variables expected at runtime (not required for a static build after refactor):

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY (server-only, optional if anon key used)
- OPENAI_API_KEY (for /api/chat)
- SITE_URL or NEXT_PUBLIC_SITE_URL (for OAuth redirects)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (for Google integration)

The code initializes Supabase clients lazily inside functions and uses server-side clients for API routes to avoid build-time failures when env vars are not set.

# Operator Passport (Arcanum)

This guide explains how to store the Operator's Passport (S1..S9 rich JSON from `ArcanumPlatformDocs copy.md`) into Supabase.

## Prerequisites
- Set environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service role), and `DATABASE_URL` (psql connection string)
- Windows PowerShell shell
- `psql` available in PATH

## Migrate database
```powershell
cd arcanum-platform; npm run db:migrate:passport
```

## Seed S1..S9 (if needed for your user)
```powershell
# If not yet seeded for the user
npm run db:migrate:spheres
```

## Import Operator Passport from docs
Set your user id as environment variable and run import:
```powershell
$Env:TARGET_USER_ID = "<YOUR-USER-UUID>"
npm run import:passport
```
By default the script reads `../ArcanumPlatformDocs copy.md` from the monorepo root. Override with `--file` if needed:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "cross-env TS_NODE_PROJECT=./scripts/migrations/tsconfig.json node -r ts-node/register/transpile-only ./scripts/migrations/import-operator-passport.ts --file='C:/MyArcanum/ArcanumPlatformDocs copy.md' --user=$Env:TARGET_USER_ID"
```

## Tables created
- `operator_profiles(user_id, version, last_update, meta)` — one row per user
- `sphere_profiles(user_id, life_sphere_id, sphere_code, meta, components, synergy)` — one row per S1..S9 per user

Both tables have RLS policies: users can only access their own rows.
