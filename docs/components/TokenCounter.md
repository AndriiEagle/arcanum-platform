# TokenCounter

Файл: `src/components/payments/TokenCounter.tsx`

Пропсы:
- `userId?: string` (если `anonymous`, покажет приглашение к входу)
- `onUpgrade?: () => void`
- `compact?: boolean`
- `showDetails?: boolean`

Функции:
- Читает состояние из `tokenStore`
- Пуллит `updateUsage(userId)` каждые 30 сек
- Показывает предупреждения и кнопку Upgrade

Пример:
```tsx
<TokenCounter userId={userId!} onUpgrade={()=>setPaywallOpen(true)} />
```