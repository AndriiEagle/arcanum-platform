# tokenStore

Файл: `lib/stores/tokenStore.ts`

Состояние:
- `used, limit, isLoading, lastUpdated, isPremium`
- `stats: { today, thisWeek, thisMonth, totalCost }`
- `showWarning, warningMessage`

Действия:
- `updateUsage(userId)`
- `updateStats(userId)`
- `checkLimits(userId)` → { isWithinLimit, upgradeRecommended, percentageUsed }
- `setLimit(limit)`
- `setPremiumStatus(isPremium)`
- `resetWarning()`

Селекторы:
- `selectTokenUsage(state)` → { used, limit, percentageUsed, isLoading }
- `selectTokenWarning(state)` → { showWarning, warningMessage, isNearLimit }
- `selectTokenStats(state)` → { stats, isPremium, lastUpdated }

Хук:
- `useTokenAutoUpdate(userId, intervalMs?)` → { updateUsage, updateStats }