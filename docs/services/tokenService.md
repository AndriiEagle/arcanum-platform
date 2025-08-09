# tokenService

Файл: `lib/services/tokenService.ts`

Экспортирует:
- `logTokenUsage(usage)` → запись использования токенов в `ai_model_usage`
- `getUserTokenUsage(userId)` → сумма токенов за 24ч
- `getUserTokenStats(userId)` → today/thisWeek/thisMonth/totalCost
- `checkTokenLimit(userId, isPremium?)` → { isWithinLimit, tokensUsed, limit, percentageUsed, upgradeRecommended }

Пример:
```ts
import { checkTokenLimit } from '@/lib/services/tokenService'
const { isWithinLimit, upgradeRecommended } = await checkTokenLimit(userId, false)
```