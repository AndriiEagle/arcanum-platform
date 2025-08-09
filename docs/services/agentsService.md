# agentsService

Файл: `lib/services/agentsService.ts`

Экспортирует:
- `proposeTasks(sphereId: string, opts?: { n?: number }): Promise<ProposedTaskInput[]>`
- Типы: `ProposedTaskInput`, `ProposedTasksResponse`

Пример:
```ts
import { proposeTasks } from '@/lib/services/agentsService'
const tasks = await proposeTasks('<sphere_id>', { n: 3 })
```

HTTP-обертка: `POST /api/agents/propose-tasks` (см. apis/README).