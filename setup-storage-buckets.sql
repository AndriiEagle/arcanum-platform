-- ================================
-- НАСТРОЙКА SUPABASE STORAGE
-- ================================
-- Выполните этот скрипт в Supabase Dashboard > SQL Editor

-- 1. Создание bucket public-assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  10485760, -- 10MB
  '{"image/png","image/jpeg","image/gif","image/webp","image/svg+xml"}'
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = '{"image/png","image/jpeg","image/gif","image/webp","image/svg+xml"}';

-- 2. Включение RLS для storage.objects (если еще не включено)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- 4. Создаем новые политики доступа

-- Публичный доступ на чтение всех файлов в public-assets
CREATE POLICY "Public read access for public-assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'public-assets');

-- Аутентифицированные пользователи могут загружать файлы
CREATE POLICY "Authenticated users can upload to public-assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.role() = 'authenticated'
);

-- Пользователи могут обновлять файлы в своих папках
CREATE POLICY "Users can update own files in public-assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'public-assets'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.role() = 'authenticated'
);

-- Пользователи могут удалять файлы в своих папках
CREATE POLICY "Users can delete own files in public-assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND auth.role() = 'authenticated'
);

-- 5. Проверка результата
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'public-assets';

-- Показать все политики для storage.objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
