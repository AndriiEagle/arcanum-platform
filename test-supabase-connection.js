// Тест подключения к Supabase и проверка всех таблиц
// Запуск: node test-supabase-connection.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К SUPABASE')
console.log('=====================================')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения SUPABASE!')
  console.log('URL:', supabaseUrl ? '✅ Настроен' : '❌ Отсутствует')
  console.log('KEY:', supabaseKey ? '✅ Настроен' : '❌ Отсутствует')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🌐 URL:', supabaseUrl)
console.log('🔑 API Key:', supabaseKey.substring(0, 20) + '...')

// Список всех таблиц которые должны существовать
const requiredTables = [
  'ui_layouts',
  'life_spheres', 
  'user_stats',
  'user_tasks',
  'sphere_categories',
  'generated_mascots',
  'user_buffs',
  'ai_model_usage',
  'scheduled_rewards'
]

async function checkConnection() {
  try {
    console.log('\n📡 Проверка подключения к Supabase...')
    
    // Простой запрос для проверки соединения
    const { data, error } = await supabase
      .rpc('get_public_tables', {}, { count: 'exact' })

    if (error) {
      console.error('❌ Ошибка подключения:', error.message)
      return false
    }

    console.log('✅ Подключение к Supabase успешно!')
    console.log(`📊 Найдено таблиц в схеме public: ${data.length}`)

    return data
  } catch (err) {
    console.error('❌ Критическая ошибка:', err.message)
    return false
  }
}

async function checkTables(existingTables) {
  console.log('\n🔍 ПРОВЕРКА ТАБЛИЦ')
  console.log('==================')

  const tableNames = existingTables.map(t => t.table_name)
  const results = {
    existing: [],
    missing: []
  }

  for (const tableName of requiredTables) {
    if (tableNames.includes(tableName)) {
      console.log(`✅ ${tableName} - существует`)
      results.existing.push(tableName)
      
      // Проверяем структуру таблицы
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (!error) {
          console.log(`   📝 Записей: ${count || 0}`)
        }
      } catch (e) {
        console.log(`   ⚠️  Ошибка проверки записей: ${e.message}`)
      }
    } else {
      console.log(`❌ ${tableName} - отсутствует`)
      results.missing.push(tableName)
    }
  }

  return results
}

async function testBasicOperations() {
  console.log('\n🧪 ТЕСТИРОВАНИЕ БАЗОВЫХ ОПЕРАЦИЙ')
  console.log('=================================')

  // Тест аутентификации
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user) {
      console.log('✅ Пользователь авторизован:', user.email)
    } else {
      console.log('ℹ️  Пользователь не авторизован (норма для анонимного ключа)')
    }
  } catch (e) {
    console.log('⚠️  Auth проверка пропущена:', e.message)
  }

  // Тест RLS политик на существующих таблицах
  try {
    const { data, error } = await supabase
      .from('ui_layouts')
      .select('*')
      .limit(1)

    if (error && error.code === 'PGRST301') {
      console.log('✅ RLS политики активны (получили ошибку доступа)')
    } else if (!error) {
      console.log('✅ Доступ к ui_layouts работает')
    } else {
      console.log('⚠️  Ошибка доступа к ui_layouts:', error.message)
    }
  } catch (e) {
    console.log('⚠️  Тест ui_layouts пропущен:', e.message)
  }
}

async function checkOpenAI() {
  console.log('\n🤖 ПРОВЕРКА OPENAI API')
  console.log('======================')

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    console.log('❌ OPENAI_API_KEY не настроен')
    return false
  }

  console.log('🔑 OpenAI Key:', openaiKey.substring(0, 20) + '...')
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ OpenAI API подключен!')
      console.log(`📊 Доступно моделей: ${data.data.length}`)
      
      // Проверяем наличие наших основных моделей
      const modelIds = data.data.map(m => m.id)
      const ourModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4']
      
      console.log('\n🎯 Проверка доступности моделей:')
      ourModels.forEach(model => {
        if (modelIds.includes(model)) {
          console.log(`✅ ${model} - доступна`)
        } else {
          console.log(`❌ ${model} - недоступна`)
        }
      })
      
      return true
    } else {
      console.log('❌ Ошибка OpenAI API:', response.status, response.statusText)
      return false
    }
  } catch (e) {
    console.log('❌ Ошибка проверки OpenAI:', e.message)
    return false
  }
}

async function generateReport(tableResults, supabaseOk, openaiOk) {
  console.log('\n📋 ИТОГОВЫЙ ОТЧЁТ')
  console.log('==================')

  console.log(`🌐 Supabase: ${supabaseOk ? '✅ Подключено' : '❌ Проблемы'}`)
  console.log(`🤖 OpenAI: ${openaiOk ? '✅ Подключено' : '❌ Проблемы'}`)
  console.log(`📊 Таблиц существует: ${tableResults.existing.length}/${requiredTables.length}`)
  console.log(`❌ Таблиц отсутствует: ${tableResults.missing.length}`)

  if (tableResults.missing.length > 0) {
    console.log('\n🔧 ТРЕБУЕМЫЕ ДЕЙСТВИЯ:')
    console.log('Выполните миграции в Supabase Dashboard:')
    console.log('1. Откройте https://supabase.com/dashboard')
    console.log('2. Перейдите в SQL Editor')
    console.log('3. Выполните содержимое файлов:')
    console.log('   - supabase/migrations/0000_initial_schema.sql')
    console.log('   - supabase/migrations/0001_additional_tables.sql')
  }

  const totalScore = (
    (supabaseOk ? 50 : 0) + 
    (openaiOk ? 30 : 0) + 
    (tableResults.existing.length / requiredTables.length * 20)
  )

  console.log(`\n🎯 ГОТОВНОСТЬ СИСТЕМЫ: ${Math.round(totalScore)}%`)
  
  if (totalScore >= 90) {
    console.log('🎉 Система полностью готова к работе!')
  } else if (totalScore >= 70) {
    console.log('⚠️  Система частично готова, есть недостатки')
  } else {
    console.log('❌ Система требует настройки')
  }

  return totalScore
}

// Основная функция
async function main() {
  try {
    const existingTables = await checkConnection()
    if (!existingTables) {
      console.log('❌ Не удалось подключиться к Supabase')
      process.exit(1)
    }

    const tableResults = await checkTables(existingTables)
    await testBasicOperations()
    const openaiOk = await checkOpenAI()

    const readiness = await generateReport(tableResults, true, openaiOk)
    
    console.log('\n✨ Проверка завершена!')
    process.exit(readiness >= 70 ? 0 : 1)

  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  }
}

main() 