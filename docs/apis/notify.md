# Notify API

Email:
- `POST /api/notify/email`
  - Тело: `{ to, subject, html }`
  - Требует SMTP ENV, иначе `skipped: true`

Telegram:
- `POST /api/notify/telegram`
  - Тело: `{ userId, message }`
  - Требует `TELEGRAM_BOT_TOKEN` и включенные настройки у пользователя (`customizationService.getTelegramSettings`).