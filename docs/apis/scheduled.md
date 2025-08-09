# Scheduled API

- `POST /api/scheduled/run-due`
  - Headers: `x-cron-secret` (если задан в ENV)
  - Находит события со статусом `scheduled` и `scheduled_at <= now`, помечает `fired`.

Модель события: см. `lib/services/scheduledEventsService.ts` (`ScheduledEvent`).