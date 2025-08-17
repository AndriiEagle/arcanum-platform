# 🎯 ПРОСТАЯ НАСТРОЙКА STORAGE ЧЕРЕЗ UI

## ❌ Проблема
Ошибка `ERROR: 42501: must be owner of table objects` означает недостаток прав для SQL создания политик.

## ✅ РЕШЕНИЕ: Через Supabase Dashboard UI

### 1. Создание Bucket

1. **Откройте Supabase Dashboard**
   - Перейдите в ваш проект: https://supabase.com/dashboard
   
2. **Перейдите в Storage**
   - В левой панели: **Storage** → **Buckets**
   
3. **Создайте новый bucket**
   - Нажмите **"New bucket"**
   - **Bucket name:** `public-assets`
   - **Public bucket:** ✅ включите
   - **File size limit:** `10MB`
   - **Allowed MIME types:** оставьте пустым (или укажите: `image/*`)
   - Нажмите **"Create bucket"**

### 2. Настройка политик

1. **Перейдите в Authentication → Policies**
   - В левой панели: **Authentication** → **Policies**
   
2. **Найдите storage.objects**
   - В списке таблиц найдите `storage.objects`
   - Нажмите **"New Policy"**

3. **Создайте политики по одной:**

#### Политика 1: Публичное чтение
```sql
-- Policy name: Public read access
-- Operation: SELECT
-- Target roles: public

bucket_id = 'public-assets'
```

#### Политика 2: Загрузка для авторизованных
```sql
-- Policy name: Authenticated upload
-- Operation: INSERT  
-- Target roles: authenticated

bucket_id = 'public-assets'
```

#### Политика 3: Обновление своих файлов
```sql
-- Policy name: User update own files
-- Operation: UPDATE
-- Target roles: authenticated

bucket_id = 'public-assets' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### Политика 4: Удаление своих файлов
```sql
-- Policy name: User delete own files
-- Operation: DELETE
-- Target roles: authenticated

bucket_id = 'public-assets' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 3. Альтернатива: Упрощенные политики

Если сложные политики не работают, создайте только базовые:

#### Простая политика 1: Публичное чтение
```sql
-- Operation: SELECT, Target: public
true
```

#### Простая политика 2: Полный доступ для авторизованных
```sql
-- Operation: ALL, Target: authenticated  
bucket_id = 'public-assets'
```

## 🧪 Проверка

После создания bucket проверьте:

1. **В Storage → Buckets должен быть:**
   - ✅ `public-assets` (помечен как Public)

2. **Тест загрузки:**
   - Попробуйте загрузить файл через приложение
   - Или загрузите тестовый файл прямо в UI Dashboard

## 🚀 Быстрый тест

Откройте консоль браузера на странице вашего приложения и выполните:

```javascript
// Проверка доступности bucket
const { data: buckets, error } = await window.supabase.storage.listBuckets()
console.log('Buckets:', buckets)

// Тест загрузки
const testBlob = new Blob(['test'], { type: 'text/plain' })
const { data, error: uploadError } = await window.supabase.storage
  .from('public-assets')
  .upload('test.txt', testBlob)
console.log('Upload result:', data, uploadError)
```

## 📞 Если всё равно не работает

1. **Проверьте роль пользователя** в Supabase Dashboard → Authentication → Users
2. **Убедитесь что используете правильные API ключи**
3. **Попробуйте создать bucket с именем без дефисов:** `publicassets`
