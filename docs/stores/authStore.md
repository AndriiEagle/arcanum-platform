# authStore

Файл: `lib/stores/authStore.ts`

Состояние:
- `user: { id, email, name, avatarUrl?, level, createdAt, role?, permissions? } | null`
- `isAuthenticated: boolean`, `isLoading: boolean`, `isInitialized: boolean`

Действия:
- `login(email, password)`
- `logout()`
- `register(email, password, name)`
- `updateUser(updates)`
- `initialize()`
- `generateDemoUser()`

Утилиты:
- `getCurrentUserId()`
- `hasRole(role)`
- `isAdmin()`

Экспортируемые хуки:
- `useCurrentUserId()` → string | null
- `useAuth()` → объект с полями/действиями
- `useRole()` → { hasRole, isAdmin, currentRole }