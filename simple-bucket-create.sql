-- =============================================
-- ПРОСТОЕ СОЗДАНИЕ BUCKET БЕЗ СЛОЖНЫХ ПОЛИТИК
-- =============================================
-- Выполните по частям в Supabase SQL Editor

-- 1. Создание bucket (это должно сработать)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets', 
  true,
  10485760,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 2. Проверка создания
SELECT id, name, public, file_size_limit, created_at 
FROM storage.buckets 
WHERE id = 'public-assets';

-- =============================================
-- ЕСЛИ НУЖНЫ ПОЛИТИКИ (выполняйте только если у вас есть права)
-- =============================================

-- Включение RLS (может потребовать прав администратора)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Базовая политика публичного доступа (если сработает предыдущая команда)
-- CREATE POLICY "public_access" ON storage.objects
-- FOR ALL USING (bucket_id = 'public-assets');

-- =============================================
-- АЛЬТЕРНАТИВА: Создание через функцию
-- =============================================

-- Создаем функцию для создания bucket (если прямой INSERT не работает)
CREATE OR REPLACE FUNCTION create_public_assets_bucket()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Попытка создать bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('public-assets', 'public-assets', true, 10485760)
  ON CONFLICT (id) DO UPDATE SET public = true;
  
  RETURN 'Bucket public-assets создан или обновлен';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Ошибка: ' || SQLERRM;
END;
$$;

-- Вызываем функцию
SELECT create_public_assets_bucket();

-- Удаляем функцию (для безопасности)
DROP FUNCTION IF EXISTS create_public_assets_bucket();
