# Интеграция Google

- `GET /api/integrations/google/auth?userId=<uuid>`
  - Редиректит на Google OAuth. ENV: `GOOGLE_CLIENT_ID`, `SITE_URL | NEXT_PUBLIC_SITE_URL`.

- `GET /api/integrations/google/callback`
  - Обрабатывает `code`, сохраняет токены в БД через `saveGoogleTokens`, редиректит на `/auth/welcome`.
  - ENV: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SITE_URL | NEXT_PUBLIC_SITE_URL`.

- `POST /api/integrations/google`
  - Тело: `{ userId, tokens: { access_token, refresh_token?, ... } }`
  - Сохраняет токены в `user_integrations`.