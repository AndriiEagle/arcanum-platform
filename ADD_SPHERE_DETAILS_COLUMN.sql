-- ==========================================
-- ОБЯЗАТЕЛЬНАЯ МИГРАЦИЯ ДЛЯ ИМПОРТА СФЕР
-- ==========================================
-- Выполните эти команды в Supabase Dashboard -> SQL Editor

-- 1. Добавляем поле sphere_details для хранения детальной информации о сферах
ALTER TABLE life_spheres 
ADD COLUMN IF NOT EXISTS sphere_details JSONB DEFAULT '{}'::jsonb;

-- 2. Создаем индекс для быстрого поиска по содержимому JSONB
CREATE INDEX IF NOT EXISTS idx_life_spheres_sphere_details 
ON life_spheres USING GIN (sphere_details);

-- 3. Проверяем что поле добавлено
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'life_spheres' 
AND table_schema = 'public'
ORDER BY column_name;
