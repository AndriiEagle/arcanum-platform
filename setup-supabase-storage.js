import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют учетные данные Supabase')
  console.log('Убедитесь что в .env файле есть:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('SUPABASE_SERVICE_KEY=your_service_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSupabaseStorage() {
  console.log('🚀 НАСТРОЙКА SUPABASE STORAGE')
  console.log('============================\n')

  try {
    // 1. Проверяем текущие buckets
    console.log('1️⃣ Проверка существующих buckets...')
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Ошибка при получении списка buckets:', listError.message)
      return
    }

    console.log(`📊 Найдено buckets: ${existingBuckets?.length || 0}`)
    existingBuckets?.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'публичный' : 'приватный'})`)
    })

    // 2. Создаем bucket public-assets если не существует
    const publicAssetsBucket = existingBuckets?.find(b => b.name === 'public-assets')
    
    if (!publicAssetsBucket) {
      console.log('\n2️⃣ Создание bucket public-assets...')
      
      const { data: createData, error: createError } = await supabase.storage.createBucket('public-assets', {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
      })

      if (createError) {
        console.error('❌ Ошибка создания bucket:', createError.message)
        
        // Попробуем создать через SQL
        console.log('🔄 Пробуем создать через SQL...')
        await createBucketViaSQL()
      } else {
        console.log('✅ Bucket public-assets создан успешно')
      }
    } else {
      console.log('\n2️⃣ Bucket public-assets уже существует')
      
      // Проверяем, публичный ли он
      if (!publicAssetsBucket.public) {
        console.log('🔄 Делаем bucket публичным...')
        await makeBucketPublicViaSQL()
      }
    }

    // 3. Создаем политики доступа
    console.log('\n3️⃣ Настройка политик доступа...')
    await setupStoragePolicies()

    // 4. Тестируем загрузку
    console.log('\n4️⃣ Тестирование загрузки...')
    await testImageUpload()

    console.log('\n✅ НАСТРОЙКА ЗАВЕРШЕНА УСПЕШНО!')
    console.log('Теперь можно загружать изображения в приложении.')

  } catch (error) {
    console.error('❌ Общая ошибка:', error.message)
  }
}

async function createBucketViaSQL() {
  const createBucketSQL = `
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'public-assets',
      'public-assets',
      true,
      10485760,
      '{"image/png","image/jpeg","image/gif","image/webp"}'
    )
    ON CONFLICT (id) DO NOTHING;
  `

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: createBucketSQL })
  
  if (error) {
    console.error('❌ SQL создание не удалось:', error.message)
  } else {
    console.log('✅ Bucket создан через SQL')
  }
}

async function makeBucketPublicViaSQL() {
  const makePublicSQL = `
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'public-assets';
  `

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: makePublicSQL })
  
  if (error) {
    console.error('❌ Не удалось сделать bucket публичным:', error.message)
  } else {
    console.log('✅ Bucket сделан публичным')
  }
}

async function setupStoragePolicies() {
  const policies = [
    {
      name: 'Публичный доступ на чтение',
      sql: `
        CREATE POLICY IF NOT EXISTS "Public read access" 
        ON storage.objects 
        FOR SELECT 
        USING (bucket_id = 'public-assets');
      `
    },
    {
      name: 'Аутентифицированная загрузка',
      sql: `
        CREATE POLICY IF NOT EXISTS "Authenticated users can upload" 
        ON storage.objects 
        FOR INSERT 
        WITH CHECK (
          bucket_id = 'public-assets' 
          AND auth.role() = 'authenticated'
        );
      `
    },
    {
      name: 'Пользователи могут обновлять свои файлы',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can update own files" 
        ON storage.objects 
        FOR UPDATE 
        WITH CHECK (
          bucket_id = 'public-assets' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    },
    {
      name: 'Пользователи могут удалять свои файлы',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can delete own files" 
        ON storage.objects 
        FOR DELETE 
        USING (
          bucket_id = 'public-assets' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    }
  ]

  for (const policy of policies) {
    console.log(`   📝 Создание: ${policy.name}`)
    const { error } = await supabase.rpc('exec_sql', { sql_query: policy.sql })
    
    if (error) {
      console.log(`   ⚠️ ${policy.name}: ${error.message}`)
    } else {
      console.log(`   ✅ ${policy.name}: создана`)
    }
  }
}

async function testImageUpload() {
  try {
    // Создаем тестовое изображение (1x1 PNG)
    const testImageBlob = new Blob([
      new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // rest of IHDR
        0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x5C, 0xC2, 0xD2, 0x34, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
      ])
    ], { type: 'image/png' })

    const testFileName = `test/test-upload-${Date.now()}.png`

    console.log('   📤 Загрузка тестового файла...')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(testFileName, testImageBlob, {
        cacheControl: '300',
        upsert: true,
        contentType: 'image/png'
      })

    if (uploadError) {
      console.error('   ❌ Ошибка загрузки:', uploadError.message)
      return
    }

    console.log('   ✅ Файл загружен:', uploadData.path)

    // Проверяем публичный URL
    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(testFileName)

    console.log('   🌐 Публичный URL:', urlData.publicUrl)

    // Очищаем тестовый файл
    console.log('   🧹 Удаление тестового файла...')
    await supabase.storage
      .from('public-assets')
      .remove([testFileName])

    console.log('   ✅ Тест прошел успешно!')

  } catch (error) {
    console.error('   ❌ Ошибка при тестировании:', error.message)
  }
}

// Запускаем настройку
setupSupabaseStorage()
