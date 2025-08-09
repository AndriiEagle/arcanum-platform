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
