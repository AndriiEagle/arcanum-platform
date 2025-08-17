const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseServiceKey || !supabaseUrl) {
  console.error('❌ Ключи Supabase не найдены!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQLMigration() {
  console.log('🚀 ВЫПОЛНЕНИЕ SQL МИГРАЦИИ')
  console.log('========================')
  
  const migrationSQL = `
    -- Добавляем поле sphere_details для хранения детальной информации о сферах
    ALTER TABLE life_spheres 
    ADD COLUMN IF NOT EXISTS sphere_details JSONB DEFAULT '{}'::jsonb;

    -- Создаем индекс для быстрого поиска по содержимому JSONB
    CREATE INDEX IF NOT EXISTS idx_life_spheres_sphere_details 
    ON life_spheres USING GIN (sphere_details);
  `
  
  try {
    console.log('💫 Выполняю SQL миграцию...')
    
    // Выполняем SQL напрямую
    const { data, error } = await supabase.rpc('sql', { query: migrationSQL })
    
    if (error) {
      console.error('❌ Ошибка выполнения SQL:', error)
      
      // Попробуем альтернативный способ через обычные запросы
      console.log('🔄 Пробую альтернативный способ...')
      
      // Сначала проверим структуру таблицы
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'life_spheres')
        .eq('table_schema', 'public')
      
      if (colError) {
        console.error('❌ Ошибка получения структуры таблицы:', colError)
        return false
      }
      
      console.log('📊 Текущие колонки таблицы life_spheres:')
      columns.forEach(col => console.log(`  - ${col.column_name}`))
      
      const hasDetailsColumn = columns.some(col => col.column_name === 'sphere_details')
      
      if (hasDetailsColumn) {
        console.log('✅ Поле sphere_details уже существует!')
        return true
      } else {
        console.log('❌ Поле sphere_details отсутствует')
        console.log('💡 Необходимо добавить поле sphere_details вручную в Supabase Dashboard')
        console.log('📋 SQL для выполнения в Supabase SQL Editor:')
        console.log(`
ALTER TABLE life_spheres 
ADD COLUMN sphere_details JSONB DEFAULT '{}'::jsonb;

CREATE INDEX idx_life_spheres_sphere_details 
ON life_spheres USING GIN (sphere_details);
        `)
        return false
      }
    }
    
    console.log('✅ SQL миграция выполнена успешно!')
    return true
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    return false
  }
}

// Запускаем миграцию
runSQLMigration().then(success => {
  if (success) {
    console.log('\n🎉 ГОТОВО! Теперь можно запускать импорт данных сфер')
  } else {
    console.log('\n⚠️ Выполните SQL команды вручную в Supabase Dashboard, затем запустите импорт')
  }
})
