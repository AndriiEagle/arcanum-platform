# analyticsService

Файл: `lib/services/analyticsService.ts`

События: `paywall_shown`, `paywall_clicked`, `payment_initiated`, `payment_completed`, `payment_failed`, `user_converted`, `session_started`, `feature_used`.

Основная функция:
- `trackEvent(eventType, userId, properties?, options?)`

Шорткаты:
- `trackPaywallShown(userId, productType, variantId?, props?)`
- `trackPaywallClicked(userId, productType, variantId?, props?)`
- `trackPaymentInitiated(userId, productType, variantId?, props?)`
- `trackPaymentCompleted(userId, productType, variantId?, props?)`
- `trackPaymentFailed(userId, productType, variantId?, props?)`
- `trackUserConverted(userId, productType, variantId?, props?)`

Пример:
```ts
import { trackPaywallShown } from '@/lib/services/analyticsService'
await trackPaywallShown(userId, 'token_limit', 'control', { price: 2.0 })
```