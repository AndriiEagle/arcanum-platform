-- Скрипт очистки дублирующихся записей сфер в базе данных
-- ВАЖНО: Выполнить этот скрипт в Supabase SQL Editor!

BEGIN;

-- 1. Удаляем дубли на основе sphere_code для каждого пользователя
-- Оставляем только запись с наибольшим ID для каждой комбинации user_id + sphere_code
WITH duplicates_to_delete AS (
  SELECT id
  FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY user_id, sphere_code 
             ORDER BY id DESC
           ) as row_num
    FROM life_spheres 
    WHERE sphere_code IS NOT NULL
  ) ranked
  WHERE row_num > 1
)
DELETE FROM life_spheres 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- 2. Удаляем старые записи без sphere_code, если есть записи с sphere_code для того же пользователя
WITH old_records_to_delete AS (
  SELECT DISTINCT ls1.id
  FROM life_spheres ls1
  WHERE ls1.sphere_code IS NULL
    AND EXISTS (
      SELECT 1 
      FROM life_spheres ls2 
      WHERE ls2.user_id = ls1.user_id 
        AND ls2.sphere_code IS NOT NULL
    )
)
DELETE FROM life_spheres 
WHERE id IN (SELECT id FROM old_records_to_delete);

-- 3. Обновляем is_active=true для всех оставшихся записей с sphere_code
UPDATE life_spheres 
SET is_active = true 
WHERE sphere_code IS NOT NULL;

-- 4. Отчет по очистке
SELECT 
  'После очистки:' as status,
  user_id,
  COUNT(*) as sphere_count,
  string_agg(sphere_code, ', ' ORDER BY sphere_code) as sphere_codes
FROM life_spheres 
WHERE sphere_code IS NOT NULL
GROUP BY user_id
ORDER BY user_id;

COMMIT;
