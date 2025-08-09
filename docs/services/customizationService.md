# customizationService

Файл: `lib/services/customizationService.ts`

Экспорт:
- `getCustomization(userId)` → `UserCustomizationConfig`
- `setAvatarUrl(userId, url)`
- `setSphereIcon(userId, sphereId, iconUrl)`
- `setMascot(userId, type, url)`
- `setTelegramEnabled(userId, enabled)`
- `setTelegramFriend(userId, friendChatId, friendName?)`
- `getAvatarUrl(userId)`
- `getSphereIcons(userId)`
- `getMascots(userId)`
- `getTelegramSettings(userId)`

Пример:
```ts
import { setTelegramEnabled } from '@/lib/services/customizationService'
await setTelegramEnabled(userId, true)
```