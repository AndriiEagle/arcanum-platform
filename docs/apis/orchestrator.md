# Orchestrator API

Требуется заголовок `x-cron-secret: <CRON_SECRET>` если переменная окружения задана.

- `POST /api/orchestrator/daily-run`
  - Тело: `{ user_id?: string }` — если не указан, обработает всех пользователей
  - Действия: пересчет скоринга задач, выбор `topTasks` (домино ≥3 сфер), запись в `orchestrator_events`
  - Ответ: `{ ok: true, users_processed, results }`

- `POST /api/orchestrator/weekly-run`
  - Запись заготовки недельного плана в `orchestrator_events`

- `POST /api/orchestrator/monthly-run`
  - Запись заготовки месячного плана в `orchestrator_events`