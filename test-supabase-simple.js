// Простая проверка подключения к Supabase
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const openaiKey = process.env.OPENAI_API_KEY

console.log('🔍 БЫСТРАЯ ПРОВЕРКА ПОДКЛЮЧЕНИЙ')
console.log('===============================')

// Проверка переменных окружения
console.log('🌐 Supabase URL:', supabaseUrl ? '✅ Настроен' : '❌ Отсутствует')
console.log('🔑 Supabase Key:', supabaseKey ? '✅ Настроен' : '❌ Отсутствует')
console.log('🤖 OpenAI Key:', openaiKey ? '✅ Настроен' : '❌ Отсутствует')

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Критическая ошибка: отсутствуют ключи Supabase!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupabaseConnection() {
  console.log('\n📡 Тестирование Supabase...')
  
  try {
    // Простейший тест - попытка выполнить запрос к базовой таблице
    const { data, error } = await supabase
      .from('ui_layouts')
      .select('*')
      .limit(1)

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Supabase подключен! (Таблица ui_layouts не существует, но соединение работает)')
        return { connected: true, tableExists: false }
      } else if (error.code === 'PGRST301') {
        console.log('✅ Supabase подключен! (RLS блокирует доступ, но таблица существует)')
        return { connected: true, tableExists: true }
      } else {
        console.log('⚠️  Supabase подключен, но есть проблема:', error.message)
        return { connected: true, tableExists: false, error: error.message }
      }
    } else {
      console.log('✅ Supabase полностью работает! Данные получены')
      console.log('📊 Записей в ui_layouts:', data?.length || 0)
      return { connected: true, tableExists: true, hasData: true }
    }
  } catch (e) {
    console.log('❌ Ошибка подключения к Supabase:', e.message)
    return { connected: false, error: e.message }
  }
}

async function testLifeSpheresTable() {
  console.log('\n🌐 Тестирование таблицы life_spheres...')
  
  try {
    const { data, error } = await supabase
      .from('life_spheres')
      .select('*')
      .limit(1)

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Таблица life_spheres не существует')
        return false
      } else if (error.code === 'PGRST301') {
        console.log('✅ Таблица life_spheres существует (RLS активен)')
        return true
      } else {
        console.log('⚠️  Таблица life_spheres: проблема -', error.message)
        return false
      }
    } else {
      console.log('✅ Таблица life_spheres работает!')
      console.log('📊 Записей:', data?.length || 0)
      return true
    }
  } catch (e) {
    console.log('❌ Ошибка проверки life_spheres:', e.message)
    return false
  }
}

async function testOpenAI() {
  console.log('\n🤖 Тестирование OpenAI...')
  
  if (!openaiKey) {
    console.log('❌ OpenAI API ключ не настроен')
    return false
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ OpenAI API работает!')
      console.log('📊 Доступно моделей:', data.data?.length || 0)
      
      // Проверяем ключевые модели
      const modelIds = data.data?.map(m => m.id) || []
      const keyModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4']
      console.log('\n🎯 Ключевые модели:')
      keyModels.forEach(model => {
        console.log(`${modelIds.includes(model) ? '✅' : '❌'} ${model}`)
      })
      
      return true
    } else {
      const errorText = await response.text()
      console.log('❌ OpenAI ошибка:', response.status, errorText)
      return false
    }
  } catch (e) {
    console.log('❌ Ошибка OpenAI:', e.message)
    return false
  }
}

async function main() {
  try {
    const supabaseResult = await testSupabaseConnection()
    const lifeSpheres = await testLifeSpheresTable()
    const openaiResult = await testOpenAI()

    console.log('\n📋 ИТОГОВЫЙ СТАТУС')
    console.log('==================')
    
    const supabaseOk = supabaseResult.connected
    const tablesOk = supabaseResult.tableExists || lifeSpheres
    const openaiOk = openaiResult

    console.log(`🌐 Supabase: ${supabaseOk ? '✅' : '❌'}`)
    console.log(`📊 Таблицы: ${tablesOk ? '✅' : '❌'}`)
    console.log(`🤖 OpenAI: ${openaiOk ? '✅' : '❌'}`)

    const readyComponents = [supabaseOk, tablesOk, openaiOk].filter(Boolean).length
    const readiness = Math.round((readyComponents / 3) * 100)

    console.log(`\n🎯 ГОТОВНОСТЬ: ${readiness}%`)

    if (readiness === 100) {
      console.log('🎉 Все системы готовы к работе!')
    } else if (readiness >= 67) {
      console.log('⚠️  Система частично готова')
    } else {
      console.log('❌ Требуется настройка')
    }

    if (!tablesOk) {
      console.log('\n🔧 НУЖНО ВЫПОЛНИТЬ:')
      console.log('1. Откройте https://supabase.com/dashboard')
      console.log('2. Выберите проект: ixerlqcqwpevjpycwkwv')
      console.log('3. Перейдите в SQL Editor')
      console.log('4. Выполните миграции из папки supabase/migrations/')
    }

    process.exit(readiness >= 67 ? 0 : 1)

  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  }
}

main() 