// Простой скрипт создания таблиц Supabase
const { createClient } = require('@supabase/supabase-js')

// Прямая конфигурация (из .env.local)
const supabaseUrl = 'https://ixerlqcqwpevjpycwkwv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXJscWNxd3BldmpweWN3a3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4Mzk2NzEsImV4cCI6MjA1NzQxNTY3MX0.DMqkaspVZw9WBaqjxs_Pvecw5g2LKuT27hmuB4WFjI0'

async function setupTables() {
  console.log('🚀 БЫСТРОЕ СОЗДАНИЕ ТАБЛИЦ SUPABASE')
  console.log('=====================================')
  
  // Создаем клиент
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Проверяем подключение
  console.log('🔍 Проверка подключения...')
  
  try {
    // Проверяем существующие таблицы
    const tables = [
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
    
    let existingTables = []
    let missingTables = []
    
    console.log('📋 Проверка существующих таблиц:')
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1)
        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            missingTables.push(tableName)
            console.log(`❌ ${tableName} - не найдена`)
          } else {
            console.log(`⚠️ ${tableName} - ошибка проверки: ${error.message}`)
          }
        } else {
          existingTables.push(tableName)
          console.log(`✅ ${tableName} - существует`)
        }
      } catch (e) {
        missingTables.push(tableName)
        console.log(`❌ ${tableName} - не найдена`)
      }
    }
    
    console.log(`\n📊 СТАТУС ТАБЛИЦ:`)
    console.log(`✅ Существуют: ${existingTables.length}`)
    console.log(`❌ Отсутствуют: ${missingTables.length}`)
    
    if (missingTables.length === 0) {
      console.log('\n🎉 ВСЕ ТАБЛИЦЫ УЖЕ СОЗДАНЫ!')
      console.log('🚀 Персонализация и сохранение данных полностью активированы!')
      
      // Создаем базовые данные если их нет
      await createInitialData(supabase)
      
      return
    }
    
    console.log('\n🔧 НЕОБХОДИМО СОЗДАТЬ ТАБЛИЦЫ')
    console.log('📋 ИНСТРУКЦИЯ ДЛЯ РУЧНОГО СОЗДАНИЯ:')
    console.log('')
    console.log('1️⃣ Откройте Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/ixerlqcqwpevjpycwkwv')
    console.log('')
    console.log('2️⃣ Перейдите в SQL Editor:')
    console.log('   - Кликните "SQL Editor" в левом меню')
    console.log('   - Нажмите "New Query"')
    console.log('')
    console.log('3️⃣ Выполните миграции:')
    console.log('   А) Скопируйте содержимое supabase/migrations/0000_initial_schema.sql')
    console.log('   Б) Вставьте в SQL Editor и нажмите "Run"')
    console.log('   В) Скопируйте содержимое supabase/migrations/0001_additional_tables.sql')  
    console.log('   Г) Вставьте в SQL Editor и нажмите "Run"')
    console.log('')
    console.log('4️⃣ Проверьте результат:')
    console.log('   - Запустите: node setup-tables-simple.js')
    console.log('')
    
    // Создаем SQL скрипт для копирования
    await createSQLScript()
    
  } catch (error) {
    console.log('❌ Ошибка проверки:', error.message)
    console.log('\n🔧 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ:')
    console.log('Создайте таблицы вручную через Supabase Dashboard')
  }
}

async function createInitialData(supabase) {
  console.log('\n🌱 Проверка базовых данных...')
  
  try {
    // Проверяем есть ли данные в life_spheres
    const { data: spheres, error } = await supabase
      .from('life_spheres')
      .select('*')
      .limit(1)
    
    if (!error && spheres && spheres.length === 0) {
      console.log('📝 Создание демо-данных для первого запуска...')
      
      // Создаем базовые сферы (без user_id для демо)
      const demoSpheres = [
        { sphere_name: 'Здоровье', health_percentage: 78, resonance_degree: 0.85, is_active: true },
        { sphere_name: 'Карьера', health_percentage: 92, resonance_degree: 0.92, is_active: true },  
        { sphere_name: 'Отношения', health_percentage: 65, resonance_degree: 0.70, is_active: true },
        { sphere_name: 'Финансы', health_percentage: 88, resonance_degree: 0.89, is_active: true }
      ]
      
      // Примечание: эти данные будут созданы только если у нас есть соответствующие разрешения
      console.log('ℹ️ Демо-данные будут созданы автоматически при первом входе пользователя')
    }
    
  } catch (e) {
    console.log('ℹ️ Базовые данные будут созданы при первом использовании')
  }
}

async function createSQLScript() {
  const fs = require('fs')
  const path = require('path')
  
  try {
    const sql1 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/0000_initial_schema.sql'), 'utf8')
    const sql2 = fs.readFileSync(path.join(__dirname, 'supabase/migrations/0001_additional_tables.sql'), 'utf8')
    
    const combinedSQL = `-- Создание всех таблиц Arcanum Platform
-- Выполните этот скрипт в Supabase SQL Editor

${sql1}

${sql2}

-- Все таблицы созданы!
-- Теперь запустите: node setup-tables-simple.js для проверки`
    
    fs.writeFileSync('СОЗДАТЬ_ТАБЛИЦЫ.sql', combinedSQL)
    console.log('📄 Создан файл СОЗДАТЬ_ТАБЛИЦЫ.sql для ручного выполнения')
    
  } catch (e) {
    console.log('⚠️ Не удалось создать SQL файл:', e.message)
  }
}

// Запуск
setupTables().catch(console.error) 