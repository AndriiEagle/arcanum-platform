# Auth Components

## AuthButton
Файл: `src/components/auth/AuthButton.tsx`

- Показывает состояние авторизации, логин/регистрацию и demo‑вход.
- Использует хук `useAuth()` из `authStore`.

Пример:
```tsx
import AuthButton from '@/components/auth/AuthButton'
<AuthButton />
```

## AuthProvider
Файл: `src/components/auth/AuthProvider.tsx`

- Вызывает `initialize()` один раз на клиенте.
- Показывает сплэш‑экран во время инициализации.

Пример:
```tsx
import AuthProvider from '@/components/auth/AuthProvider'
<AuthProvider>{children}</AuthProvider>
```