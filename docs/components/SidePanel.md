# SidePanel

Файл: `src/components/layout/SidePanel.tsx`

Пропсы:
- `position: 'left' | 'right'`

Функции:
- Тогглы панелей из `uiStore`
- Загрузка сфер пользователя из Supabase
- Программируемые кнопки (локально)
- Вызов модалок настроек и планировщика

Пример:
```tsx
<SidePanel position="left" />
<SidePanel position="right" />
```