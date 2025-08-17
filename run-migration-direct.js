const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = 'https://jvrbxpbbrnficvemtyxm.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY не найден в .env файле!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSphereDetailsColumn() {
  console.log('🚀 ДОБАВЛЕНИЕ ПОЛЯ sphere_details В ТАБЛИЦУ life_spheres')
  console.log('==================================================')
  
  try {
    // Сначала проверим структуру таблицы
    console.log('🔍 Проверяем текущую структуру таблицы...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'life_spheres')
      .eq('table_schema', 'public')
    
    if (columnsError) {
      console.error('❌ Ошибка получения структуры таблицы:', columnsError)
      return false
    }
    
    console.log('📊 Текущие колонки:', columns.map(c => `${c.column_name} (${c.data_type})`).join(', '))
    
    // Проверяем, есть ли уже поле sphere_details
    const hasDetailsColumn = columns.some(col => col.column_name === 'sphere_details')
    
    if (hasDetailsColumn) {
      console.log('✅ Поле sphere_details уже существует!')
      return true
    }
    
    console.log('➕ Поле sphere_details отсутствует, добавляем...')
    
    // Выполняем прямой SQL запрос для добавления колонки
    const { data, error } = await supabase
      .from('life_spheres')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ Ошибка доступа к таблице:', error)
      return false
    }
    
    console.log('✅ Доступ к таблице life_spheres подтвержден')
    console.log('💡 Для добавления поля sphere_details выполните вручную в Supabase SQL Editor:')
    console.log(`
ALTER TABLE life_spheres 
ADD COLUMN sphere_details JSONB DEFAULT '{}'::jsonb;

CREATE INDEX idx_life_spheres_sphere_details ON life_spheres USING GIN (sphere_details);
`)
    
    return true
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    return false
  }
}

// Запускаем проверку
addSphereDetailsColumn().then(success => {
  if (success) {
    console.log('\n🎯 СЛЕДУЮЩИЙ ШАГ: Выполните SQL команды в Supabase, затем запустите импорт')
  }
})

