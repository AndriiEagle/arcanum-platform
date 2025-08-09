# paymentService

Файл: `lib/services/paymentService.ts`

Экспортирует:
- `createPaymentIntent({ amount, productType, userId, description? })` → `{ client_secret, payment_intent_id, amount, currency }`
- `confirmPayment(paymentIntentId)` → статус и метаданные платежа
- `getUserPayments(userId, limit?)` → список PaymentIntent
- `createRefund(paymentIntentId, amount?, reason?)`
- `checkStripeHealth()` → проверка Stripe API
- `PRODUCT_PRICES` — константы цен
- Типы: `CreatePaymentIntentParams`, `PaymentResult`

Пример:
```ts
import { createPaymentIntent, PRODUCT_PRICES } from '@/lib/services/paymentService'
const res = await createPaymentIntent({ amount: PRODUCT_PRICES.TOKEN_PACKAGE_SMALL, productType: 'token_limit', userId })
```