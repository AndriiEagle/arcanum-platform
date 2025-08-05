require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function createAllTables() {
  console.log('🚀 СОЗДАНИЕ ТАБЛИЦ SUPABASE')
  console.log('============================')
  
  // Проверка переменных окружения
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Ошибка: Не найдены переменные окружения')
    console.log('📁 Проверьте файл .env.local:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL=ваш_url')
    console.log('   SUPABASE_SERVICE_KEY=ваш_service_key')
    return
  }
  
  console.log('✅ Переменные окружения найдены')
  console.log(`🔗 Supabase URL: ${supabaseUrl.substring(0, 30)}...`)
  
  // Создаем клиент с service key для административных операций
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
  
  try {
    // Читаем SQL миграции
    const migration1 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/0000_initial_schema.sql'), 'utf8')
    const migration2 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/0001_additional_tables.sql'), 'utf8')
    
    console.log('📄 Миграционные файлы загружены')
    
    // Выполняем первую миграцию
    console.log('🔧 Выполнение миграции 0000_initial_schema.sql...')
    const result1 = await supabase.rpc('exec_sql', { sql_query: migration1 })
    
    if (result1.error) {
      console.log('⚠️ Ошибка в первой миграции (возможно, таблицы уже существуют):')
      console.log(result1.error.message)
    } else {
      console.log('✅ Первая миграция выполнена успешно')
    }
    
    // Выполняем вторую миграцию  
    console.log('🔧 Выполнение миграции 0001_additional_tables.sql...')
    const result2 = await supabase.rpc('exec_sql', { sql_query: migration2 })
    
    if (result2.error) {
      console.log('⚠️ Ошибка во второй миграции (возможно, таблицы уже существуют):')
      console.log(result2.error.message)
    } else {
      console.log('✅ Вторая миграция выполнена успешно')
    }
    
    // Альтернативный способ - выполнение SQL напрямую через HTTP API
    console.log('🔄 Пробуем альтернативный способ создания таблиц...')
    
    // Разбиваем SQL на отдельные команды
    const sql1Commands = migration1.split(';').filter(cmd => cmd.trim())
    const sql2Commands = migration2.split(';').filter(cmd => cmd.trim())
    
    let successCount = 0
    let totalCommands = sql1Commands.length + sql2Commands.length
    
    // Выполняем команды первой миграции
    for (const command of sql1Commands) {
      if (command.trim()) {
        try {
          const { error } = await supabase.rpc('exec_single_sql', { 
            sql_command: command.trim() + ';'
          })
          if (!error) successCount++
        } catch (e) {
          // Игнорируем ошибки "already exists"
          if (!e.message?.includes('already exists')) {
            console.log(`⚠️ Команда не выполнена: ${command.substring(0, 50)}...`)
          } else {
            successCount++
          }
        }
      }
    }
    
    // Выполняем команды второй миграции
    for (const command of sql2Commands) {
      if (command.trim()) {
        try {
          const { error } = await supabase.rpc('exec_single_sql', {
            sql_command: command.trim() + ';'
          })
          if (!error) successCount++
        } catch (e) {
          if (!e.message?.includes('already exists')) {
            console.log(`⚠️ Команда не выполнена: ${command.substring(0, 50)}...`)
          } else {
            successCount++
          }
        }
      }
    }
    
    console.log(`\n📊 РЕЗУЛЬТАТ СОЗДАНИЯ ТАБЛИЦ:`)
    console.log(`✅ Успешно выполнено: ${successCount}/${totalCommands} команд`)
    
    // Проверяем созданные таблицы
    console.log('\n🔍 ПРОВЕРКА СОЗДАННЫХ ТАБЛИЦ:')
    
    const tablesToCheck = [
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
    
    let createdTables = []
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1)
        if (!error) {
          createdTables.push(tableName)
          console.log(`✅ ${tableName} - создана и доступна`)
        } else {
          console.log(`❌ ${tableName} - не найдена`)
        }
      } catch (e) {
        console.log(`❌ ${tableName} - ошибка проверки`)
      }
    }
    
    console.log(`\n🎯 ИТОГО СОЗДАНО ТАБЛИЦ: ${createdTables.length}/${tablesToCheck.length}`)
    
    if (createdTables.length === tablesToCheck.length) {
      console.log('\n🎉 ВСЕ ТАБЛИЦЫ УСПЕШНО СОЗДАНЫ!')
      console.log('🚀 Персонализация и сохранение данных разблокированы!')
      
      // Создаем тестовые данные для демо-пользователя
      console.log('\n🧪 Создание тестовых данных...')
      await createDemoData(supabase)
      
    } else {
      console.log('\n⚠️ Некоторые таблицы не созданы')
      console.log('📝 Инструкция для ручного создания:')
      console.log('1. Откройте Supabase Dashboard')
      console.log('2. Перейдите в SQL Editor')
      console.log('3. Скопируйте содержимое миграционных файлов')
      console.log('4. Выполните SQL команды')
    }
    
  } catch (error) {
    console.log('❌ Критическая ошибка:', error.message)
    console.log('\n📋 РУЧНАЯ ИНСТРУКЦИЯ:')
    console.log('1. Откройте https://supabase.com/dashboard')
    console.log('2. Выберите ваш проект')
    console.log('3. Перейдите в SQL Editor')
    console.log('4. Создайте новый запрос')
    console.log('5. Скопируйте и выполните содержимое файлов:')
    console.log('   - supabase/migrations/0000_initial_schema.sql')
    console.log('   - supabase/migrations/0001_additional_tables.sql')
  }
}

async function createDemoData(supabase) {
  try {
    // Создаем тестового пользователя (условно)
    const demoUserId = '00000000-0000-0000-0000-000000000000'
    
    // Создаем базовые сферы жизни
    const demoSpheres = [
      { user_id: demoUserId, sphere_name: 'Здоровье', health_percentage: 78, resonance_degree: 0.85 },
      { user_id: demoUserId, sphere_name: 'Карьера', health_percentage: 92, resonance_degree: 0.92 },
      { user_id: demoUserId, sphere_name: 'Отношения', health_percentage: 65, resonance_degree: 0.70 },
      { user_id: demoUserId, sphere_name: 'Финансы', health_percentage: 88, resonance_degree: 0.89 }
    ]
    
    const { error: spheresError } = await supabase
      .from('life_spheres')
      .upsert(demoSpheres, { onConflict: 'user_id,sphere_name' })
    
    if (!spheresError) {
      console.log('✅ Демо сферы созданы')
    }
    
    // Создаем статистику пользователя
    const { error: statsError } = await supabase
      .from('user_stats')
      .upsert({
        user_id: demoUserId,
        level: 15,
        current_xp: 2340,
        next_level_xp: 3000,
        energy: 85
      }, { onConflict: 'user_id' })
    
    if (!statsError) {
      console.log('✅ Демо статистика создана')
    }
    
  } catch (error) {
    console.log('⚠️ Ошибка создания демо данных:', error.message)
  }
}

// Запуск
createAllTables().catch(console.error) 