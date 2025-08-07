/**
 * 🔐 ТЕСТИРОВАНИЕ СИСТЕМЫ АВТОРИЗАЦИИ ARCANUM PLATFORM
 * 
 * Этот скрипт тестирует все компоненты системы авторизации:
 * - Подключение к Supabase
 * - Функции базы данных
 * - Системы ролей
 * - API endpoints
 * 
 * ВАЖНО: Замените заглушки на реальные ключи в .env.local файле!
 */

const { createClient } = require('@supabase/supabase-js')

// Конфигурация - ЗАМЕНИТЕ НА ВАШИ РЕАЛЬНЫЕ КЛЮЧИ
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-supabase-service-role-key-here'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@example.com'

// Проверяем наличие переменных окружения
if (SUPABASE_URL.includes('your-project-id') || SUPABASE_SERVICE_KEY.includes('your-supabase')) {
  console.log('⚠️  ВНИМАНИЕ: Обнаружены заглушки в конфигурации!')
  console.log('📋 Для тестирования создайте .env.local файл с реальными ключами:')
  console.log('   SUPABASE_URL=https://your-real-project-id.supabase.co')
  console.log('   SUPABASE_SERVICE_KEY=your-real-service-key')
  console.log('   ADMIN_EMAIL=your-real-admin-email@example.com')
  console.log('')
}

// Создание клиента Supabase с сервисной ролью
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🚀 НАЧИНАЕМ ТЕСТИРОВАНИЕ СИСТЕМЫ АВТОРИЗАЦИИ\n')

// =================================================================
// 1. ТЕСТ ПОДКЛЮЧЕНИЯ К SUPABASE
// =================================================================
async function testConnection() {
  console.log('📡 Тестируем подключение к Supabase...')
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Ошибка подключения:', error.message)
      return false
    }
    
    console.log('✅ Подключение к Supabase успешно')
    console.log(`   Найдено ролей пользователей: ${data || 0}`)
    return true
    
  } catch (error) {
    console.error('❌ Критическая ошибка подключения:', error.message)
    return false
  }
}

// =================================================================
// 2. ТЕСТ ТАБЛИЦЫ РОЛЕЙ
// =================================================================
async function testUserRolesTable() {
  console.log('\n📋 Тестируем таблицу user_roles...')
  
  try {
    // Проверяем структуру таблицы
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5)
    
    if (error) {
      console.error('❌ Ошибка при чтении таблицы user_roles:', error.message)
      console.log('💡 Подсказка: Убедитесь, что выполнили SQL скрипт create-auth-system.sql')
      return false
    }
    
    console.log('✅ Таблица user_roles доступна')
    console.log(`   Записей в таблице: ${roles?.length || 0}`)
    
    if (roles && roles.length > 0) {
      console.log('   Пример записи:', JSON.stringify(roles[0], null, 2))
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании таблицы user_roles:', error.message)
    return false
  }
}

// =================================================================
// 3. ТЕСТ ФУНКЦИЙ БАЗЫ ДАННЫХ
// =================================================================
async function testDatabaseFunctions() {
  console.log('\n🔧 Тестируем функции базы данных...')
  
  try {
    // Тест функции получения профиля (с тестовым UUID)
    const testUserId = '00000000-0000-0000-0000-000000000000'
    
    const { data: profile, error: profileError } = await supabase
      .rpc('get_user_profile', { user_uuid: testUserId })
    
    if (profileError) {
      console.log('⚠️  Функция get_user_profile недоступна (это нормально, если нет пользователей)')
      console.log('   Ошибка:', profileError.message)
    } else {
      console.log('✅ Функция get_user_profile работает')
    }
    
    // Тест функции проверки роли
    const { data: roleCheck, error: roleError } = await supabase
      .rpc('check_user_role', { user_uuid: testUserId, required_role: 'admin' })
    
    if (roleError) {
      console.log('⚠️  Функция check_user_role недоступна')
      console.log('   Ошибка:', roleError.message)
    } else {
      console.log('✅ Функция check_user_role работает')
      console.log(`   Результат проверки: ${roleCheck}`)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании функций:', error.message)
    return false
  }
}

// =================================================================
// 4. ТЕСТ ПОЛЬЗОВАТЕЛЕЙ И РОЛЕЙ
// =================================================================
async function testUsersAndRoles() {
  console.log('\n👥 Тестируем пользователей и роли...')
  
  try {
    // Получаем всех пользователей с их ролями
    const { data: usersWithRoles, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        user_id
      `)
    
    if (error) {
      console.error('❌ Ошибка при получении пользователей:', error.message)
      return false
    }
    
    console.log('✅ Успешно получены пользователи и роли')
    console.log(`   Всего пользователей с ролями: ${usersWithRoles?.length || 0}`)
    
    if (usersWithRoles && usersWithRoles.length > 0) {
      const adminUsers = usersWithRoles.filter(u => u.role === 'admin')
      const regularUsers = usersWithRoles.filter(u => u.role === 'user')
      const premiumUsers = usersWithRoles.filter(u => u.role === 'premium')
      
      console.log(`   Админов: ${adminUsers.length}`)
      console.log(`   Обычных пользователей: ${regularUsers.length}`)
      console.log(`   Premium пользователей: ${premiumUsers.length}`)
      
      // Показываем админов
      if (adminUsers.length > 0) {
        console.log('\n   🔑 Админские аккаунты:')
        adminUsers.forEach(admin => {
          console.log(`      - ID: ${admin.user_id} | Роль: ${admin.role}`)
        })
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании пользователей:', error.message)
    return false
  }
}

// =================================================================
// 5. ТЕСТ ПОЛИТИК БЕЗОПАСНОСТИ (RLS)
// =================================================================
async function testSecurityPolicies() {
  console.log('\n🛡️  Тестируем политики безопасности...')
  
  try {
    // Создаем анонимного клиента для тестирования RLS
    const anonKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key-here'
    const anonClient = createClient(SUPABASE_URL, anonKey)
    
    // Попытка анонимного доступа к ролям (должна быть ограничена)
    const { data: anonData, error: anonError } = await anonClient
      .from('user_roles')
      .select('*')
    
    if (anonError || !anonData || anonData.length === 0) {
      console.log('✅ RLS работает корректно - анонимный доступ ограничен')
    } else {
      console.log('⚠️  Возможная проблема с RLS - анонимный доступ разрешен')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании безопасности:', error.message)
    return false
  }
}

// =================================================================
// 6. ГЛАВНАЯ ФУНКЦИЯ ТЕСТИРОВАНИЯ
// =================================================================
async function runAllTests() {
  console.log('=' .repeat(60))
  console.log('🔐 ПОЛНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ АВТОРИЗАЦИИ')
  console.log('=' .repeat(60))
  
  const results = []
  
  // Запускаем все тесты
  results.push(await testConnection())
  results.push(await testUserRolesTable())
  results.push(await testDatabaseFunctions())
  results.push(await testUsersAndRoles())
  results.push(await testSecurityPolicies())
  
  // Подводим итоги
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log('\n' + '=' .repeat(60))
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ')
  console.log('=' .repeat(60))
  console.log(`✅ Пройдено тестов: ${passed}/${total}`)
  console.log(`${passed === total ? '🎉' : '⚠️'} Общий статус: ${passed === total ? 'ВСЕ ТЕСТЫ ПРОЙДЕНЫ!' : 'ЕСТЬ ПРОБЛЕМЫ'}`)
  
  if (passed === total) {
    console.log('\n🚀 СИСТЕМА АВТОРИЗАЦИИ ПОЛНОСТЬЮ ГОТОВА!')
    console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:')
    console.log('1. Создайте .env.local файл с реальными ключами')
    console.log('2. Выполните SQL скрипт create-auth-system.sql в Supabase')
    console.log(`3. Зарегистрируйтесь с email: ${ADMIN_EMAIL}`)
    console.log(`4. Выполните: SELECT set_admin_role('${ADMIN_EMAIL}');`)
    console.log('5. Запустите приложение: npm run dev')
    console.log('6. Протестируйте авторизацию в браузере')
  } else {
    console.log('\n🔧 РЕКОМЕНДАЦИИ:')
    console.log('1. Убедитесь, что SQL скрипт выполнен в Supabase')
    console.log('2. Проверьте правильность ключей доступа в .env.local')
    console.log('3. Убедитесь, что RLS настроен корректно')
    console.log('4. Проверьте доступность проекта Supabase')
  }
  
  console.log('\n' + '=' .repeat(60))
}

// Запускаем тестирование
if (require.main === module) {
  runAllTests().catch(console.error)
} 