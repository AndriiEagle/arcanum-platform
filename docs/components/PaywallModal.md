# PaywallModal

Файл: `src/components/payments/PaywallModal.tsx`

Пропсы:
- `isOpen: boolean`
- `type: 'token_limit' | 'mascot' | 'premium_model' | 'premium_subscription'`
- `cost: number`
- `onClose: () => void`
- `onSuccess?: (paymentIntentId: string) => void`
- `onPurchase?: ({ sessionId, productType, amount, userId, description? }) => void`
- `userId?: string` (обязателен для покупки)
- `description?: string`

Поведение:
- Создаёт Stripe Checkout Session через `/api/payments/create-checkout-session`
- В dev‑режиме поддерживает DEMO‑поток

Пример:
```tsx
<PaywallModal isOpen type="token_limit" cost={2.0} onClose={()=>setOpen(false)} userId={userId!} />
```