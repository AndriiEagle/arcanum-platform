# Payments (Stripe)

Эндпоинты:

- `POST /api/payments/create-checkout-session`
  - Тело: `{ product_type: 'token_limit'|'mascot'|'premium_model'|'premium_subscription', amount?: number, user_id: string, variant_id?: string, description?: string }`
  - Ответ: `{ success: boolean, sessionId?: string, error?: string }`
  - Для subscription требуется `STRIPE_PRICE_PREMIUM_SUBSCRIPTION`.

- `POST /api/payments/create-intent`
  - Тело: `{ product_type: string, user_id: string, amount?: number, description?: string }`
  - Если Stripe не настроен — возвращает demo‑ответ.
  - Ответ: `{ success: true, client_secret, payment_intent_id, amount, currency }`

- `POST /api/payments/confirm`
  - Тело: `{ session_id: string }`
  - Возвращает статус сессии/интента; в dev‑режиме — demo‑ответ.

Пример интеграции на клиенте: см. компонент `src/components/payments/PaywallModal.tsx`.