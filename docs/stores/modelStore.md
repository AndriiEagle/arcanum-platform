# modelStore

Файл: `lib/stores/modelStore.ts`

Состояние:
- `selectedModel: AIModel`
- `isModelSelectorOpen: boolean`
- `totalTokensUsed: number`, `totalCostSpent: number`

Действия:
- `setSelectedModel(modelId)`
- `toggleModelSelector()` / `setModelSelector(isOpen)`
- `addTokenUsage(inputTokens, outputTokens)`
- `resetUsageStats()`

Утилиты:
- `getCurrentModelId()`
- `canUseModel(modelId)`

Хуки:
- `useCurrentModel()`
- `useModelSelector()` → { isModelSelectorOpen, toggleModelSelector, setModelSelector }
- `useUsageStats()` → { totalTokensUsed, totalCostSpent, resetUsageStats }