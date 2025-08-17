const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

console.log('🔍 ПРОВЕРКА ПОДКЛЮЧЕНИЯ К SUPABASE')
console.log('================================')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixerlqcqwpevjpycwkwv.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

console.log('🌐 URL:', supabaseUrl)
console.log('🔑 Service Key:', supabaseServiceKey ? 'Найден' : 'НЕ НАЙДЕН')
console.log('🐛 DEBUG - All env vars related to SUPABASE:')
Object.keys(process.env).filter(key => key.includes('SUPABASE')).forEach(key => {
  console.log(`   ${key}: ${process.env[key] ? 'установлен' : 'не установлен'}`)
})

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY не найден в .env файле!')
  console.log('💡 Убедитесь, что файл .env содержит: SUPABASE_SERVICE_KEY=ваш_ключ')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  try {
    console.log('🚀 Тестируем подключение...')
    
    const { data, error } = await supabase
      .from('life_spheres')
      .select('id, sphere_name, sphere_code')
      .limit(3)
    
    if (error) {
      console.error('❌ Ошибка подключения:', error)
      return false
    }
    
    console.log('✅ Подключение успешно!')
    console.log('📊 Найдено сфер:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('📋 Примеры сфер:')
      data.forEach(sphere => {
        console.log(`  - ${sphere.sphere_code || 'NO_CODE'}: ${sphere.sphere_name}`)
      })
    }
    
    return true
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    return false
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Подключение работает! Можно приступать к импорту.')
  } else {
    console.log('\n💀 Подключение не работает. Проверьте настройки.')
  }
})
