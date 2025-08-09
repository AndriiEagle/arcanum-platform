# disciplineService

Файл: `lib/services/disciplineService.ts`

Экспортирует:
- `declareTask(userId, sphereId|null, title, dueISO, taskId?)` → создаёт запись в `task_declarations`
- `markDeclarationCompleted(userId, declarationId)` → помечает декларацию выполненной
- `dailyReview(userId)` → обрабатывает просроченные/выполненные декларации, начисляет/списывает XP, шлёт уведомления

Пример:
```ts
import { declareTask, dailyReview } from '@/lib/services/disciplineService'
const dec = await declareTask(userId, sphereId, 'Сделать зарядку', new Date().toISOString())
const res = await dailyReview(userId)
```