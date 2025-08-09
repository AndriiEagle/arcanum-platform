# SettingsModal

Файл: `src/components/modals/SettingsModal.tsx`

Пропсы:
- `isOpen: boolean`
- `onClose: () => void`

Секции:
- Маскоты (загрузка через `uploadImageResized`, сохранение в customizationService)
- Telegram (включение, чат‑ID, имя; сохранение через customizationService)
- Google Drive (OAuth через `/api/integrations/google/auth`, проверка `/api/integrations/google`)