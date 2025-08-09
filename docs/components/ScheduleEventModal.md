# ScheduleEventModal

Файл: `src/components/modals/ScheduleEventModal.tsx`

Пропсы:
- `isOpen: boolean`
- `onClose: () => void`

Функции:
- Создание события через `createEvent(userId, title, eventType, scheduledAtISO, payload)`
- Поддерживаемые `eventType`: `image | video | audio | mascots | text`