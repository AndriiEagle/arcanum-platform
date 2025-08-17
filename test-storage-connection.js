import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testStorageConnection() {
  console.log('🧪 ТЕСТИРОВАНИЕ ПОДКЛЮЧЕНИЯ К STORAGE')
  console.log('=====================================\n')

  try {
    // 1. Проверка списка buckets
    console.log('1️⃣ Получение списка buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Ошибка получения buckets:', bucketsError.message)
      return
    }

    console.log(`📊 Найдено buckets: ${buckets?.length || 0}`)
    buckets?.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'публичный' : 'приватный'})`)
    })

    // 2. Проверка конкретного bucket
    const publicAssetsBucket = buckets?.find(b => b.name === 'public-assets')
    if (publicAssetsBucket) {
      console.log('\n✅ Bucket public-assets найден!')
      console.log(`   Публичный: ${publicAssetsBucket.public ? 'Да' : 'Нет'}`)
      console.log(`   Создан: ${publicAssetsBucket.created_at}`)
    } else {
      console.log('\n❌ Bucket public-assets НЕ найден')
      console.log('Создайте его через Supabase Dashboard → Storage → New bucket')
      return
    }

    // 3. Тестирование загрузки файла
    console.log('\n2️⃣ Тестирование загрузки файла...')
    
    // Создаем тестовый файл
    const testContent = `Тест загрузки ${new Date().toISOString()}`
    const testBlob = new Blob([testContent], { type: 'text/plain' })
    const testFileName = `test-${Date.now()}.txt`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('public-assets')
      .upload(testFileName, testBlob, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Ошибка загрузки:', uploadError.message)
      console.log('Возможные причины:')
      console.log('- Нет прав на загрузку (нужны политики RLS)')
      console.log('- Bucket не настроен правильно')
      console.log('- Проблемы с аутентификацией')
    } else {
      console.log('✅ Файл загружен успешно!')
      console.log(`   Путь: ${uploadData.path}`)

      // 4. Получение публичного URL
      const { data: urlData } = supabase.storage
        .from('public-assets')
        .getPublicUrl(testFileName)

      console.log(`   URL: ${urlData.publicUrl}`)

      // 5. Очистка - удаление тестового файла
      console.log('\n3️⃣ Удаление тестового файла...')
      const { error: deleteError } = await supabase.storage
        .from('public-assets')
        .remove([testFileName])

      if (deleteError) {
        console.log('⚠️ Не удалось удалить тестовый файл:', deleteError.message)
      } else {
        console.log('✅ Тестовый файл удален')
      }
    }

    console.log('\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО')

  } catch (error) {
    console.error('❌ Общая ошибка:', error.message)
  }
}

testStorageConnection()
