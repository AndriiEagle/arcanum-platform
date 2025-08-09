# resonanceService

Файл: `lib/services/resonanceService.ts`

Экспортирует:
- Типы: `SphereCode`, `TaskForScoring`, `WeightsMap`
- `getWeightsMap(userId)` → карта весов между сферами
- `calcScoreInternal(task, weights)` → вычисляет скор для задачи
- `topTasks(userId, n=3)` → топ‑задачи по скору
- `recalcAllScores(userId?)` → пересчитывает скоры и апсертит в `user_tasks`

Пример:
```ts
import { getWeightsMap, topTasks } from '@/lib/services/resonanceService'
const weights = await getWeightsMap(userId)
const top = await topTasks(userId, 5)
```