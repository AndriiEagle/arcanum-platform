// Прямое создание таблиц через Supabase HTTP API
const fs = require('fs')
const path = require('path')

// Конфигурация
const SUPABASE_URL = 'https://ixerlqcqwpevjpycwkwv.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXJscWNxd3BldmpweWN3a3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTgzOTY3MSwiZXhwIjoyMDU3NDE1NjcxfQ.hkmU-K-tUZxKivWkoHmUwDS6QvZ4HuCYWSvVacs2YA0'

async function executeSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    })
    
    return { success: response.ok, response }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function createTablesDirectly() {
  console.log('🚀 ПРЯМОЕ СОЗДАНИЕ ТАБЛИЦ ЧЕРЕЗ SUPABASE API')
  console.log('============================================')
  
  // Определяем SQL команды для создания таблиц
  const tables = [
    {
      name: 'ui_layouts',
      sql: `
        CREATE TABLE IF NOT EXISTS ui_layouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          layout_config JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'life_spheres',
      sql: `
        CREATE TABLE IF NOT EXISTS life_spheres (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          sphere_name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          health_percentage INT DEFAULT 0,
          resonance_degree FLOAT DEFAULT 0,
          global_goal TEXT,
          category_mascot_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'user_stats',
      sql: `
        CREATE TABLE IF NOT EXISTS user_stats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE NOT NULL,
          level INTEGER DEFAULT 1,
          current_xp INTEGER DEFAULT 0,
          next_level_xp INTEGER DEFAULT 1000,
          energy INTEGER DEFAULT 100,
          total_tokens_used BIGINT DEFAULT 0,
          total_cost_spent DECIMAL(10,4) DEFAULT 0.0000,
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'user_tasks',
      sql: `
        CREATE TABLE IF NOT EXISTS user_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          sphere_id UUID,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
          xp_reward INTEGER DEFAULT 10,
          is_completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          due_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'sphere_categories',
      sql: `
        CREATE TABLE IF NOT EXISTS sphere_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sphere_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          icon VARCHAR(10),
          progress INTEGER DEFAULT 0,
          mascot_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'generated_mascots',
      sql: `
        CREATE TABLE IF NOT EXISTS generated_mascots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          category_id UUID,
          prompt TEXT NOT NULL,
          image_url TEXT NOT NULL,
          model_used VARCHAR(100) DEFAULT 'dall-e-3',
          generation_cost DECIMAL(8,4) DEFAULT 0.0000,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'user_buffs',
      sql: `
        CREATE TABLE IF NOT EXISTS user_buffs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(10) CHECK (type IN ('buff', 'debuff')) DEFAULT 'buff',
          effect_value INTEGER DEFAULT 0,
          duration_minutes INTEGER DEFAULT 60,
          expires_at TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'ai_model_usage',
      sql: `
        CREATE TABLE IF NOT EXISTS ai_model_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          model_id VARCHAR(50) NOT NULL,
          prompt_tokens INTEGER DEFAULT 0,
          completion_tokens INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          cost DECIMAL(8,6) DEFAULT 0.000000,
          request_type VARCHAR(50) DEFAULT 'chat',
          session_id VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'scheduled_rewards',
      sql: `
        CREATE TABLE IF NOT EXISTS scheduled_rewards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          trigger_level INTEGER NOT NULL,
          reward_type VARCHAR(50) DEFAULT 'message',
          reward_content TEXT NOT NULL,
          is_claimed BOOLEAN DEFAULT FALSE,
          claimed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    }
  ]
  
  // Создаем индексы
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_ui_layouts_user_id ON ui_layouts(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_life_spheres_user_id ON life_spheres(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_life_spheres_active ON life_spheres(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_tasks_completed ON user_tasks(is_completed);',
    'CREATE INDEX IF NOT EXISTS idx_sphere_categories_sphere_id ON sphere_categories(sphere_id);',
    'CREATE INDEX IF NOT EXISTS idx_generated_mascots_user_id ON generated_mascots(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_buffs_user_id ON user_buffs(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_buffs_active ON user_buffs(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_ai_model_usage_user_id ON ai_model_usage(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_scheduled_rewards_user_id ON scheduled_rewards(user_id);'
  ]
  
  console.log('📋 Создание таблиц через прямые HTTP запросы...')
  
  let successCount = 0
  let totalCount = tables.length
  
  // Пробуем альтернативный подход - создание через готовый скрипт
  try {
    // Читаем миграционные файлы
    const migration1Path = path.join(__dirname, 'supabase/migrations/0000_initial_schema.sql')
    const migration2Path = path.join(__dirname, 'supabase/migrations/0001_additional_tables.sql')
    
    let migration1 = ''
    let migration2 = ''
    
    if (fs.existsSync(migration1Path)) {
      migration1 = fs.readFileSync(migration1Path, 'utf8')
      console.log('✅ Первая миграция загружена')
    }
    
    if (fs.existsSync(migration2Path)) {
      migration2 = fs.readFileSync(migration2Path, 'utf8')  
      console.log('✅ Вторая миграция загружена')
    }
    
    // Создаем объединенный SQL файл для ручного выполнения
    const combinedSQL = `-- Автоматически созданные таблицы Arcanum Platform
-- Выполните в Supabase SQL Editor

${migration1}

${migration2}

-- Готово! Все таблицы созданы.
`
    
    fs.writeFileSync('EXECUTE_IN_SUPABASE.sql', combinedSQL)
    console.log('📄 Создан файл EXECUTE_IN_SUPABASE.sql')
    
    // Упрощенная проверка - используем Supabase JS клиент
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    console.log('\n🔍 ПРОВЕРКА СУЩЕСТВУЮЩИХ ТАБЛИЦ:')
    
    const expectedTables = [
      'ui_layouts', 'life_spheres', 'user_stats', 'user_tasks',
      'sphere_categories', 'generated_mascots', 'user_buffs', 
      'ai_model_usage', 'scheduled_rewards'
    ]
    
    let existingTables = []
    let missingTables = []
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1)
        if (error) {
          missingTables.push(tableName)
          console.log(`❌ ${tableName} - не найдена`)
        } else {
          existingTables.push(tableName)
          console.log(`✅ ${tableName} - существует`)
        }
      } catch (e) {
        missingTables.push(tableName)
        console.log(`❌ ${tableName} - недоступна`)
      }
    }
    
    console.log('\n📊 РЕЗУЛЬТАТ:')
    console.log(`✅ Существующие таблицы: ${existingTables.length}/${expectedTables.length}`)
    console.log(`❌ Отсутствующие таблицы: ${missingTables.length}/${expectedTables.length}`)
    
    if (existingTables.length === expectedTables.length) {
      console.log('\n🎉 ВСЕ ТАБЛИЦЫ УЖЕ СОЗДАНЫ!')
      console.log('🚀 Персонализация полностью активирована!')
      
      // Создаем демо данные
      await createDemoData(supabase)
      
    } else if (missingTables.length > 0) {
      console.log('\n🔧 НЕОБХОДИМО СОЗДАТЬ ТАБЛИЦЫ ВРУЧНУЮ:')
      console.log('')
      console.log('1️⃣ Откройте Supabase Dashboard:')
      console.log('   https://supabase.com/dashboard/project/ixerlqcqwpevjpycwkwv')
      console.log('')
      console.log('2️⃣ Перейдите в SQL Editor → New Query')
      console.log('')
      console.log('3️⃣ Скопируйте и выполните содержимое файла:')
      console.log('   EXECUTE_IN_SUPABASE.sql')
      console.log('')
      console.log('4️⃣ Проверьте результат:')
      console.log('   node direct-sql-create.js')
      console.log('')
      
      console.log('📋 ОТСУТСТВУЮЩИЕ ТАБЛИЦЫ:')
      missingTables.forEach(table => console.log(`   ❌ ${table}`))
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message)
    console.log('\n💡 АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ:')
    console.log('Создайте таблицы вручную через Supabase Dashboard SQL Editor')
  }
}

async function createDemoData(supabase) {
  console.log('\n🌱 Проверка и создание демо данных...')
  
  try {
    // Проверяем есть ли данные в life_spheres
    const { data: existingSpheres } = await supabase
      .from('life_spheres')
      .select('*')
      .limit(1)
    
    if (existingSpheres && existingSpheres.length === 0) {
      console.log('📝 Создание начальных демо данных...')
      
      const demoUserId = '00000000-0000-0000-0000-000000000000'
      
      // Создаем демо сферы
      const demoSpheres = [
        { user_id: demoUserId, sphere_name: 'Здоровье', health_percentage: 78, resonance_degree: 0.85, is_active: true },
        { user_id: demoUserId, sphere_name: 'Карьера', health_percentage: 92, resonance_degree: 0.92, is_active: true },
        { user_id: demoUserId, sphere_name: 'Отношения', health_percentage: 65, resonance_degree: 0.70, is_active: true },
        { user_id: demoUserId, sphere_name: 'Финансы', health_percentage: 88, resonance_degree: 0.89, is_active: true }
      ]
      
      const { error: spheresError } = await supabase
        .from('life_spheres')
        .insert(demoSpheres)
      
      if (!spheresError) {
        console.log('✅ Демо сферы созданы')
      }
      
      // Создаем демо статистику
      const { error: statsError } = await supabase
        .from('user_stats')
        .insert({
          user_id: demoUserId,
          level: 15,
          current_xp: 2340,
          next_level_xp: 3000,
          energy: 85
        })
      
      if (!statsError) {
        console.log('✅ Демо статистика создана')
      }
    } else {
      console.log('ℹ️ Демо данные уже существуют')
    }
    
  } catch (error) {
    console.log('⚠️ Ошибка создания демо данных:', error.message)
  }
}

// Запуск
createTablesDirectly().catch(console.error) 