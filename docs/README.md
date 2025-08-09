# Arcanum Platform — Документация

Добро пожаловать! Здесь собрана документация по публичным API, сервисам, сторам и React‑компонентам.

- Список API: см. `docs/apis/README.md`
- Конфигурация моделей ИИ: см. `docs/config/aiModels.md`
- Флаги фич: см. `docs/config/featureFlags.md`
- Клиенты Supabase: см. `docs/supabase.md`
- Сервисы (бизнес‑логика): см. `docs/services/README.md`
- Zustand‑хранилища: см. `docs/stores/*`
- UI‑компоненты: см. `docs/components/*`

## Быстрый старт

1) Настройте переменные окружения:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY (опц., для server‑side задач)
- OPENAI_API_KEY (для чата, изображений, whisper)
- STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (для оплат)
- STRIPE_PRICE_PREMIUM_SUBSCRIPTION (для subscription)
- SITE_URL или NEXT_PUBLIC_SITE_URL (публичный адрес приложения)
- CRON_SECRET (для оркестратора/кронов)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (email)
- TELEGRAM_BOT_TOKEN (telegram‑уведомления)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (интеграция Google)
- NEXT_PUBLIC_APP_URL (URL для Stripe redirect)
- RESONANCE_ENABLED / NEXT_PUBLIC_RESONANCE_ENABLED (фичи резонанса)

2) Установите зависимости и запустите приложение.

```bash
npm install
npm run dev
```

3) Посмотрите примеры вызовов в разделах API и компонентов ниже.