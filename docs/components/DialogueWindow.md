# DialogueWindow

Файл: `src/components/DialogueWindow.tsx`

Пропсы:
- `isOpen?: boolean` (default true)
- `onToggle?: () => void`

Функции:
- Отправка сообщений в `POST /api/chat`
- Управление A/B‑paywall при лимите токенов (интеграция с `abTestService` и `analyticsService`)
- Загрузка аватарки через `uploadImageResized` + `setAvatarUrl`

Использование:
```tsx
import DialogueWindow from '@/components/DialogueWindow'

<DialogueWindow isOpen={true} onToggle={()=>{}} />
```