# ModelSelector

Файл: `src/components/ai/ModelSelector.tsx`

Пропсы:
- `renderPanel?: boolean` (по умолчанию true)

Функции:
- Показывает текущую модель (`useCurrentModel`)
- Переключает панель выбора моделей (`useModelSelector`)
- Сегментация по категориям из `MODEL_CATEGORIES`
- Блокировка премиум‑моделей для не‑премиум пользователей (примерная логика)

Пример:
```tsx
import ModelSelector from '@/components/ai/ModelSelector'
<ModelSelector />
```