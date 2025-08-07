# 🔐 ПОЛНОЕ РУКОВОДСТВО ПО ВНЕДРЕНИЮ СИСТЕМЫ АВТОРИЗАЦИИ

## **✅ ЧТО УЖЕ СДЕЛАНО**

### **1. Созданы файлы:**
- ✅ `create-auth-system.sql` - SQL скрипт для создания всех таблиц и функций
- ✅ `lib/stores/authStore.ts` - полностью переписанная система авторизации с Supabase
- ✅ `src/components/auth/AuthButton.tsx` - обновленный UI компонент с регистрацией
- ✅ `src/components/auth/AuthProvider.tsx` - провайдер для инициализации
- ✅ `test-auth-system.js` - скрипт для тестирования всей системы
- ✅ Обновлен `ClientLayoutWrapper.tsx` с интеграцией AuthProvider

### **2. Функциональность:**
- ✅ **Реальная авторизация Supabase** вместо demo-режима
- ✅ **Регистрация** новых пользователей с email подтверждением  
- ✅ **Система ролей** (admin, user, premium) с проверками
- ✅ **Персистентность сессии** - автоматическое восстановление при перезагрузке
- ✅ **Безопасность** - Row Level Security и политики доступа
- ✅ **Автоматическое создание профиля** при регистрации

---

## **🚀 ПОШАГОВАЯ ИНСТРУКЦИЯ ПО ЗАПУСКУ**

### **ШАГ 1: Создать .env файл** 
Создайте файл `.env.local` в корне папки `arcanum-platform/` с содержимым:

```env
# Supabase Configuration (Client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Supabase Configuration (Server-side) 
SUPABASE_SERVICE_KEY=your-supabase-service-role-key-here
SUPABASE_URL=https://your-project-id.supabase.co

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

NODE_ENV=development
```

### **ШАГ 2: Выполнить SQL скрипт**
1. Откройте **Supabase Dashboard**: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Перейдите в **SQL Editor**
3. Скопируйте весь код из файла `create-auth-system.sql`
4. Нажмите **Run** для выполнения

### **ШАГ 3: Установить зависимости**
```powershell
cd arcanum-platform
npm install @supabase/supabase-js @supabase/ssr
```

### **ШАГ 4: Протестировать систему** 
```powershell
# Установить зависимости для тестирования
npm install @supabase/supabase-js --save-dev

# Запустить тест (после настройки .env)
node test-auth-system.js
```

### **ШАГ 5: Запустить приложение**
```powershell
npm run dev
```

### **ШАГ 6: Создать админский аккаунт**
1. Откройте http://localhost:3000
2. Нажмите **"Регистрация"** 
3. Зарегистрируйтесь с вашим email
4. Подтвердите email (проверьте почту)
5. В Supabase SQL Editor выполните:
```sql
SELECT set_admin_role('your-admin-email@example.com');
```

---

## **🎯 КАК ИСПОЛЬЗОВАТЬ СИСТЕМУ АВТОРИЗАЦИИ**

### **В компонентах React:**

```typescript
import { useAuth, useRole } from '@/lib/stores/authStore'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  const { hasRole, isAdmin } = useRole()
  
  if (!isAuthenticated) {
    return <div>Войдите в систему</div>
  }
  
  return (
    <div>
      <h1>Привет, {user?.name}!</h1>
      
      {/* Контент только для админов */}
      {isAdmin() && (
        <AdminPanel />
      )}
      
      {/* Контент для Premium пользователей */}
      {hasRole('premium') && (
        <PremiumFeatures />
      )}
      
      <button onClick={logout}>Выйти</button>
    </div>
  )
}
```

### **API Routes с авторизацией:**

```typescript
// app/api/admin/route.ts
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  const supabase = createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Проверяем роль пользователя
  const { data: hasAccess } = await supabase
    .rpc('check_user_role', { 
      user_uuid: session.user.id, 
      required_role: 'admin' 
    })
  
  if (!hasAccess) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Логика для админов
  return Response.json({ message: 'Admin content' })
}
```

---

## **🔧 ПОЛЕЗНЫЕ КОМАНДЫ**

### **Управление пользователями в SQL:**

```sql
-- Посмотреть всех пользователей
SELECT u.email, ur.role, ur.created_at 
FROM auth.users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id;

-- Сделать пользователя админом
SELECT set_admin_role('email@example.com');

-- Изменить роль пользователя
UPDATE user_roles 
SET role = 'premium' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email@example.com');

-- Проверить роль
SELECT check_user_role(
  (SELECT id FROM auth.users WHERE email = 'email@example.com'), 
  'admin'
);
```

### **Отладка в браузере:**

```javascript
// В консоли браузера
console.log('Текущий пользователь:', useAuthStore.getState().user)
console.log('Авторизован:', useAuthStore.getState().isAuthenticated)

// Принудительный выход
useAuthStore.getState().logout()

// Demo вход
useAuthStore.getState().login('demo@arcanum.dev', 'demo')
```

---

## **🛡️ БЕЗОПАСНОСТЬ**

### **Что реализовано:**
- ✅ **Row Level Security (RLS)** - пользователи видят только свои данные
- ✅ **Политики доступа** - админы могут управлять всеми ролями
- ✅ **Валидация на клиенте и сервере**
- ✅ **Безопасные триггеры** с SECURITY DEFINER
- ✅ **Защита API endpoints** через проверку сессии

### **Рекомендации:**
- 🔐 Никогда не коммитьте .env файлы в Git
- 🔐 Регулярно ротируйте API ключи
- 🔐 Используйте HTTPS в продакшене
- 🔐 Настройте CORS правильно для продакшена

---

## **🎊 РЕЗУЛЬТАТ**

После выполнения всех шагов у вас будет:

### **🔐 ДЛЯ ОБЫЧНЫХ ПОЛЬЗОВАТЕЛЕЙ:**
- Регистрация с email подтверждением
- Вход/выход из системы
- Персональные данные (сферы жизни, статистика)
- Безопасность - видят только свои данные

### **👑 ДЛЯ АДМИНА:**
- Полный доступ ко всем данным
- Управление ролями пользователей
- Специальные UI элементы (значок ADMIN)
- Доступ к админским API endpoints

### **💻 ДЛЯ РАЗРАБОТЧИКА:**
- Полная система авторизации
- Demo-режим для быстрого тестирования  
- Удобные хуки для React компонентов
- Система ролей и прав доступа
- Автоматическое тестирование

---

## **❓ РЕШЕНИЕ ПРОБЛЕМ**

### **Ошибка подключения к Supabase:**
```
Проверьте правильность ключей в .env файле
Убедитесь что проект активен в Supabase Dashboard
```

### **RLS блокирует доступ:**
```sql
-- Временно отключить RLS для отладки
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
-- Не забудьте включить обратно!
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

### **Пользователь не видит свои данные:**
```sql
-- Проверить создался ли профиль
SELECT * FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email@example.com');

-- Создать профиль вручную
INSERT INTO user_roles (user_id, role) 
VALUES ((SELECT id FROM auth.users WHERE email = 'email@example.com'), 'user');
```

---

**🚀 СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ!** 

Теперь у вас есть полноценная, безопасная система авторизации с ролями, которая автоматически интегрируется со всеми компонентами Arcanum Platform. 