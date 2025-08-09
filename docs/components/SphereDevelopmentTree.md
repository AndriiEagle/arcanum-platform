# SphereDevelopmentTree

Файл: `src/components/modals/SphereDevelopmentTree.tsx`

Пропсы:
- `sphere: { id, name, health_percentage, color, icon } | null`
- `isOpen: boolean`
- `onClose: () => void`

Функции:
- Загрузка/создание категорий и задач для сферы (Supabase)
- Генерация маскота категории через `/api/generate-header`
- Декларации задач через `declareTask`
- Автообновление прогресса и XP пользователя