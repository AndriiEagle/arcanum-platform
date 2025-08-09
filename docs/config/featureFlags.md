# Флаги фич

Файл: `lib/config/featureFlags.ts`

Экспортирует:
- `getResonanceEnabledServer(): boolean`
- `getResonanceEnabledClient(): boolean`
- `isResonanceEnabled(): boolean`

ENV:
- `RESONANCE_ENABLED` (server)
- `NEXT_PUBLIC_RESONANCE_ENABLED` (client)

```ts
import { isResonanceEnabled } from '@/lib/config/featureFlags'
if (isResonanceEnabled()) {
  // включаем UI/функции резонанса
}
```