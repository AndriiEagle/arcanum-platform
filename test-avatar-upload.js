// 🧪 ТЕСТ СИСТЕМЫ ЗАГРУЗКИ АВАТАРОВ
// ===================================

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAvatarSystem() {
  console.log('🧪 ТЕСТИРОВАНИЕ СИСТЕМЫ АВАТАРОВ')
  console.log('================================\n')

  try {
    // 1. Проверка подключения к Supabase Storage
    console.log('1️⃣ Проверка Supabase Storage...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      throw new Error(`Storage error: ${bucketsError.message}`)
    }
    
    const publicAssetsBucket = buckets.find(b => b.name === 'public-assets')
    if (publicAssetsBucket) {
      console.log('✅ Bucket public-assets найден')
    } else {
      console.log('⚠️ Bucket public-assets не найден')
    }

    // 2. Проверка таблицы ui_layouts
    console.log('\n2️⃣ Проверка таблицы ui_layouts...')
    const { data: layoutsData, error: layoutsError } = await supabase
      .from('ui_layouts')
      .select('*')
      .limit(1)

    if (layoutsError) {
      console.log('❌ Ошибка доступа к ui_layouts:', layoutsError.message)
    } else {
      console.log('✅ Таблица ui_layouts доступна')
      console.log(`📊 Найдено записей: ${layoutsData?.length || 0}`)
    }

    // 3. Проверка существующих аватаров
    console.log('\n3️⃣ Проверка существующих аватаров...')
    const { data: files, error: filesError } = await supabase.storage
      .from('public-assets')
      .list('avatars', { limit: 10 })

    if (filesError) {
      console.log('❌ Ошибка получения списка аватаров:', filesError.message)
    } else {
      console.log(`✅ Найдено аватаров: ${files?.length || 0}`)
      if (files && files.length > 0) {
        files.forEach(file => {
          console.log(`   📁 ${file.name} (${file.metadata?.size || 'unknown'} bytes)`)
        })
      }
    }

    // 4. Тест получения публичного URL
    console.log('\n4️⃣ Тест генерации публичных URL...')
    const testPath = 'avatars/test-user/avatar.png'
    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(testPath)
    
    console.log('✅ Публичный URL сгенерирован:', urlData.publicUrl)

    // 5. Тест cache busting
    console.log('\n5️⃣ Тест cache busting...')
    const cacheBuster = Date.now()
    const urlWithCacheBuster = `${urlData.publicUrl}?v=${cacheBuster}`
    console.log('✅ URL с cache busting:', urlWithCacheBuster)

    // 6. Проверка пользователей с аватарами
    console.log('\n6️⃣ Проверка пользователей с аватарами...')
    const { data: usersWithAvatars, error: usersError } = await supabase
      .from('ui_layouts')
      .select('user_id, layout_config')
      .not('layout_config->avatarUrl', 'is', null)
      .limit(5)

    if (usersError) {
      console.log('❌ Ошибка получения пользователей:', usersError.message)
    } else {
      console.log(`✅ Пользователей с аватарами: ${usersWithAvatars?.length || 0}`)
      if (usersWithAvatars && usersWithAvatars.length > 0) {
        usersWithAvatars.forEach(user => {
          const avatarUrl = user.layout_config?.avatarUrl
          console.log(`   👤 User: ${user.user_id.substring(0, 8)}... -> ${avatarUrl?.substring(0, 50)}...`)
        })
      }
    }

    console.log('\n🎉 ТЕСТ ЗАВЕРШЕН УСПЕШНО!')

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message)
    console.error('🔧 Проверьте конфигурацию Supabase и переменные окружения')
  }
}

async function testAvatarUploadFlow() {
  console.log('\n🔄 ТЕСТИРОВАНИЕ ПРОЦЕССА ЗАГРУЗКИ')
  console.log('=================================\n')

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

    const testUserId = 'test-user-' + Date.now()
    const fileName = `avatars/${testUserId}/avatar.png`

    console.log('📤 Загружаем тестовый аватар...')
    
    // Тест загрузки с upsert
    const { data, error } = await supabase.storage
      .from('public-assets')
      .upload(fileName, testImageBlob, {
        cacheControl: '300',
        upsert: true,
        contentType: 'image/png'
      })

    if (error) {
      throw new Error(`Upload error: ${error.message}`)
    }

    console.log('✅ Аватар загружен:', data.path)

    // Получение публичного URL
    const { data: urlData } = supabase.storage
      .from('public-assets')
      .getPublicUrl(fileName)

    const finalUrl = `${urlData.publicUrl}?v=${Date.now()}`
    console.log('✅ Финальный URL с cache busting:', finalUrl)

    // Очистка (удаление тестового файла)
    console.log('🧹 Удаляем тестовый файл...')
    await supabase.storage
      .from('public-assets')
      .remove([fileName])

    console.log('✅ Тестовый файл удален')

  } catch (error) {
    console.error('❌ Ошибка тестирования загрузки:', error.message)
  }
}

// Запуск тестов
async function runAllTests() {
  await testAvatarSystem()
  await testAvatarUploadFlow()
  
  console.log('\n💡 РЕКОМЕНДАЦИИ:')
  console.log('================')
  console.log('1. Проверьте Developer Tools -> Console для логов загрузки')
  console.log('2. Попробуйте загрузить аватар в диалоге с MOYO')
  console.log('3. Если проблема сохраняется, очистите кэш браузера (Ctrl+Shift+R)')
  console.log('4. Проверьте Storage в Supabase Dashboard')
}

runAllTests().catch(console.error) 