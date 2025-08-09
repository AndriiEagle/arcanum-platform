# imageUpload

Файл: `lib/services/imageUpload.ts`

Экспортирует:
- `uploadImageResized(file: File, opts?: { bucket?: string, pathPrefix?: string, maxSize?: number }): Promise<{ url, path }>`

Пример (клиент):
```ts
import { uploadImageResized } from '@/lib/services/imageUpload'
const { url, path } = await uploadImageResized(file, { bucket: 'public-assets', pathPrefix: `avatars/${userId}`, maxSize: 256 })
```