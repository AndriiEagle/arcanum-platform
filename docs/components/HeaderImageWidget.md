# HeaderImageWidget

Файл: `src/components/widgets/HeaderImageWidget.tsx`

Пропсы:
- `onError?: (error: string) => void`

Функции:
- Генерация изображения через `POST /api/generate-header`
- Автогенерация при включённом `uiStore.autoGenerateHeaderImage`

Пример:
```tsx
<HeaderImageWidget onError={(e)=>console.warn(e)} />
```