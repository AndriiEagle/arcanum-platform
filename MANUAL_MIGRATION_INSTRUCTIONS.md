# 🚨 ОБЯЗАТЕЛЬНАЯ МИГРАЦИЯ БАЗЫ ДАННЫХ

Для импорта детальной информации о сферах необходимо добавить поле `sphere_details` в таблицу `life_spheres`.

## Шаги выполнения:

### 1. Откройте Supabase Dashboard
- Перейдите на https://supabase.com/dashboard
- Выберите свой проект: **ixerlqcqwpevjpycwkwv**

### 2. Откройте SQL Editor
- В левом меню выберите **SQL Editor**
- Нажмите **New query**

### 3. Скопируйте и выполните SQL код:

```sql
-- Добавляем поле sphere_details для хранения детальной информации о сферах
ALTER TABLE life_spheres 
ADD COLUMN IF NOT EXISTS sphere_details JSONB DEFAULT '{}'::jsonb;

-- Создаем индекс для быстрого поиска по содержимому JSONB
CREATE INDEX IF NOT EXISTS idx_life_spheres_sphere_details 
ON life_spheres USING GIN (sphere_details);

-- Проверяем что поле добавлено
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'life_spheres' 
AND table_schema = 'public'
ORDER BY column_name;
```

### 4. Нажмите **RUN**

### 5. Проверьте результат
Должны увидеть список колонок таблицы `life_spheres`, включая новую колонку `sphere_details` с типом `jsonb`.

### 6. После успешного выполнения
Запустите импорт данных командой:
```powershell
node import-sphere-details.js
```

## Что это даст?

После импорта на платформе Arcanum будет отображаться **вся детальная информация** о каждой сфере жизни:
- Компоненты и протоколы
- Синергии между сферами  
- Психологические модели
- Стратегии монетизации
- Блокеры и уязвимости
- И многое другое из файла WholeMyMemory.md
