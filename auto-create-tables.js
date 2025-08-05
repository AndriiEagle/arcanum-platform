// Автоматическое создание таблиц в Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Конфигурация из предоставленных ключей
const SUPABASE_URL = 'https://ixerlqcqwpevjpycwkwv.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXJscWNxd3BldmpweWN3a3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTgzOTY3MSwiZXhwIjoyMDU3NDE1NjcxfQ.hkmU-K-tUZxKivWkoHmUwDS6QvZ4HuCYWSvVacs2YA0'

async function createTablesAutomatically() {
  console.log('🚀 АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ТАБЛИЦ SUPABASE')
  console.log('==========================================')
  
  // Создаем клиент с service key для административных операций
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
  
  console.log('✅ Supabase клиент инициализирован с service key')
  
  try {
    // Читаем SQL миграции
    const migration1Path = path.join(__dirname, 'supabase/migrations/0000_initial_schema.sql')
    const migration2Path = path.join(__dirname, 'supabase/migrations/0001_additional_tables.sql')
    
    if (!fs.existsSync(migration1Path) || !fs.existsSync(migration2Path)) {
      console.log('❌ Файлы миграций не найдены!')
      return
    }
    
    const migration1 = fs.readFileSync(migration1Path, 'utf8')
    const migration2 = fs.readFileSync(migration2Path, 'utf8')
    
    console.log('📄 Миграционные файлы загружены')
    
    // Выполняем SQL команды через HTTP API напрямую
    console.log('🔧 Выполнение команд создания таблиц...')
    
    // Объединяем все SQL команды
    const allSQL = migration1 + '\n\n' + migration2
    
    // Разбиваем на отдельные команды
    const commands = allSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
      .map(cmd => cmd + ';')
    
    console.log(`📋 Найдено ${commands.length} SQL команд для выполнения`)
    
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    // Выполняем команды через REST API
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      console.log(`🔄 Выполнение команды ${i + 1}/${commands.length}...`)
      
      try {
        // Используем rpc для выполнения произвольного SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
          },
          body: JSON.stringify({
            sql: command
          })
        })
        
        if (response.ok) {
          successCount++
          console.log(`✅ Команда ${i + 1} выполнена успешно`)
        } else {
          const errorData = await response.text()
          // Игнорируем ошибки "already exists"
          if (errorData.includes('already exists') || errorData.includes('уже существует')) {
            successCount++
            console.log(`✅ Команда ${i + 1} - объект уже существует (ОК)`)
          } else {
            errorCount++
            errors.push(`Команда ${i + 1}: ${errorData}`)
            console.log(`⚠️ Команда ${i + 1} - ошибка: ${errorData.substring(0, 100)}...`)
          }
        }
      } catch (error) {
        // Пробуем альтернативный способ - прямое выполнение SQL
        try {
          const result = await supabase.rpc('exec_sql', { sql: command })
          if (result.error) {
            if (result.error.message.includes('already exists')) {
              successCount++
              console.log(`✅ Команда ${i + 1} - объект уже существует (ОК)`)
            } else {
              errorCount++
              errors.push(`Команда ${i + 1}: ${result.error.message}`)
              console.log(`⚠️ Команда ${i + 1} - ошибка: ${result.error.message}`)
            }
          } else {
            successCount++
            console.log(`✅ Команда ${i + 1} выполнена успешно`)
          }
        } catch (finalError) {
          errorCount++
          errors.push(`Команда ${i + 1}: ${finalError.message}`)
          console.log(`❌ Команда ${i + 1} - критическая ошибка: ${finalError.message}`)
        }
      }
      
      // Небольшая задержка между командами
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('\n📊 РЕЗУЛЬТАТ ВЫПОЛНЕНИЯ:')
    console.log(`✅ Успешно: ${successCount}/${commands.length}`)
    console.log(`❌ Ошибки: ${errorCount}/${commands.length}`)
    
    if (errors.length > 0) {
      console.log('\n⚠️ ДЕТАЛИ ОШИБОК:')
      errors.forEach(error => console.log(`   ${error}`))
    }
    
    // Проверяем созданные таблицы
    console.log('\n🔍 ПРОВЕРКА СОЗДАННЫХ ТАБЛИЦ:')
    await checkCreatedTables(supabase)
    
  } catch (error) {
    console.log('❌ Критическая ошибка:', error.message)
  }
}

async function checkCreatedTables(supabase) {
  const expectedTables = [
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
  let missingTables = []
  
  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          missingTables.push(tableName)
          console.log(`❌ ${tableName} - не найдена`)
        } else {
          console.log(`⚠️ ${tableName} - ошибка доступа: ${error.message}`)
        }
      } else {
        createdTables.push(tableName)
        console.log(`✅ ${tableName} - создана и доступна`)
      }
    } catch (e) {
      missingTables.push(tableName)
      console.log(`❌ ${tableName} - недоступна: ${e.message}`)
    }
  }
  
  console.log(`\n🎯 ИТОГО:`)
  console.log(`✅ Созданных таблиц: ${createdTables.length}/${expectedTables.length}`)
  console.log(`❌ Отсутствующих таблиц: ${missingTables.length}/${expectedTables.length}`)
  
  if (createdTables.length === expectedTables.length) {
    console.log('\n🎉 ВСЕ ТАБЛИЦЫ УСПЕШНО СОЗДАНЫ!')
    console.log('🚀 Персонализация и сохранение данных полностью разблокированы!')
    
    // Создаем начальные данные
    await createInitialData(supabase)
    
    console.log('\n✨ ARCANUM PLATFORM ГОТОВА К РАБОТЕ!')
    console.log('📋 Теперь можно запускать: npm run dev')
    
  } else if (createdTables.length > 0) {
    console.log('\n⚠️ Некоторые таблицы созданы, но не все')
    console.log('🔧 Попробуйте запустить скрипт повторно или создайте недостающие вручную')
    
  } else {
    console.log('\n❌ Таблицы не созданы')
    console.log('📋 Рекомендуется создать их вручную через Supabase Dashboard')
  }
}

async function createInitialData(supabase) {
  console.log('\n🌱 Создание начальных демо-данных...')
  
  try {
    // Создаем демо сферы жизни для тестирования (без привязки к конкретному user_id)
    const demoUserId = '00000000-0000-0000-0000-000000000000'
    
    const initialSpheres = [
      {
        user_id: demoUserId,
        sphere_name: 'Здоровье',
        health_percentage: 78,
        resonance_degree: 0.85,
        is_active: true,
        global_goal: 'Достичь идеального физического и ментального здоровья'
      },
      {
        user_id: demoUserId,
        sphere_name: 'Карьера',
        health_percentage: 92,
        resonance_degree: 0.92,
        is_active: true,
        global_goal: 'Стать экспертом в своей области и достичь профессионального роста'
      },
      {
        user_id: demoUserId,
        sphere_name: 'Отношения',
        health_percentage: 65,
        resonance_degree: 0.70,
        is_active: true,
        global_goal: 'Построить гармоничные и глубокие отношения с близкими'
      },
      {
        user_id: demoUserId,
        sphere_name: 'Финансы',
        health_percentage: 88,
        resonance_degree: 0.89,
        is_active: true,
        global_goal: 'Достичь финансовой независимости и стабильности'
      }
    ]
    
    const { error: spheresError } = await supabase
      .from('life_spheres')
      .upsert(initialSpheres, { onConflict: 'user_id,sphere_name' })
    
    if (!spheresError) {
      console.log('✅ Демо сферы жизни созданы')
    } else {
      console.log('⚠️ Ошибка создания демо сфер:', spheresError.message)
    }
    
    // Создаем демо статистику пользователя
    const { error: statsError } = await supabase
      .from('user_stats')
      .upsert({
        user_id: demoUserId,
        level: 15,
        current_xp: 2340,
        next_level_xp: 3000,
        energy: 85,
        total_tokens_used: 0,
        total_cost_spent: 0,
        current_streak: 3,
        longest_streak: 7
      }, { onConflict: 'user_id' })
    
    if (!statsError) {
      console.log('✅ Демо статистика пользователя создана')
    } else {
      console.log('⚠️ Ошибка создания демо статистики:', statsError.message)
    }
    
  } catch (error) {
    console.log('⚠️ Ошибка создания демо данных:', error.message)
  }
}

// Запуск автоматического создания
console.log('🎯 Запуск автоматического создания таблиц Supabase...')
createTablesAutomatically().catch(console.error) 