# Конфигурация AI‑моделей

Файл: `lib/config/aiModels.ts`

Экспортирует:
- `OPENAI_MODELS: Record<string, AIModel>` — реестр моделей
- `MODEL_CATEGORIES` — группировка
- `MODEL_RECOMMENDATIONS` — рекомендации
- `getDefaultModel(): AIModel`
- `getAvailableModels(): AIModel[]`
- `getModelById(id: string): AIModel | null`
- `calculateCost(modelId, inputTokens, outputTokens): number`

Пример:

```ts
import { getDefaultModel, getModelById, calculateCost, getAvailableModels } from '@/lib/config/aiModels'

const model = getDefaultModel()
const same = getModelById(model.id)
const cost = calculateCost(model.id, 1200, 800) // стоимость в $ за ~2000 токенов
const available = getAvailableModels()
```