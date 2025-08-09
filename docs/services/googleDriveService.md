# googleDriveService

Файл: `lib/services/googleDriveService.ts`

Экспортирует:
- `saveGoogleTokens(userId, tokens)` → сохраняет токены в `user_integrations`
- `getGoogleAccessToken(userId)` → `string | null`
- `listDriveFiles(userId)` → массив файлов Google Drive (требуется валидный access_token)