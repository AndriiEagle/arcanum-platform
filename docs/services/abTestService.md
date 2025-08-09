# abTestService

Файл: `lib/services/abTestService.ts`

Экспортирует:
- `ABTestType = 'token_limit' | 'mascot' | 'premium_subscription'`
- `PRICE_VARIANTS: Record<string, PriceVariant[]>`
- `BASE_PRICES: Record<ABTestType, number>`
- `getPriceVariant(userId, testType)` → `{ price, variant, testResult }`
- `logPaywallImpression(testResult)`
- `logPaywallClick(testResult)`
- `logPaywallConversion(testResult, paymentIntentId, actualAmount)`

Пример:
```ts
import { getPriceVariant, logPaywallImpression } from '@/lib/services/abTestService'

const { price, variant, testResult } = getPriceVariant(userId, 'token_limit')
await logPaywallImpression(testResult)
```