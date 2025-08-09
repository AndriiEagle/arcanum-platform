# scheduledEventsService

Файл: `lib/services/scheduledEventsService.ts`

Экспортирует:
- Типы: `ScheduledEventType`, `ScheduledEvent`
- `createEvent(userId, title, eventType, scheduledAtISO, payload)` → создаёт событие
- `listEvents(userId)` → список событий
- `cancelEvent(userId, id)` → отменяет событие
- `getDueEvents(nowISO)` → события к исполнению
- `markFired(userId, id)` → отметка как выполненное