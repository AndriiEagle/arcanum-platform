const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = 'https://jvrbxpbbrnficvemtyxm.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY не найден в .env файле!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 ВЫПОЛНЕНИЕ МИГРАЦИИ: Добавление поля sphere_details')
  console.log('====================================================')
  
  const migrationSQL = `
    -- Add sphere_details field to store complete sphere information  
    ALTER TABLE life_spheres 
    ADD COLUMN IF NOT EXISTS sphere_details JSONB DEFAULT '{}'::jsonb;

    -- Create index for faster queries on sphere_details
    CREATE INDEX IF NOT EXISTS idx_life_spheres_sphere_details ON life_spheres USING GIN (sphere_details);
  `
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Ошибка выполнения миграции:', error)
      return false
    }
    
    console.log('✅ Миграция выполнена успешно!')
    console.log('📊 Добавлено поле sphere_details типа JSONB')
    console.log('🔍 Создан GIN индекс для быстрого поиска')
    return true
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    return false
  }
}

// Запускаем миграцию
runMigration().then(success => {
  if (success) {
    console.log('\n🎉 ГОТОВО! Теперь можно запускать импорт данных')
  } else {
    console.log('\n💀 ОШИБКА! Миграция не выполнена')
  }
})

