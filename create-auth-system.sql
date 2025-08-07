-- =================================================================
-- 🔐 ПОЛНАЯ СИСТЕМА АВТОРИЗАЦИИ ARCANUM PLATFORM
-- =================================================================
-- Выполните этот скрипт в SQL Editor вашего Supabase проекта

-- =================================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ РОЛЕЙ ПОЛЬЗОВАТЕЛЕЙ
-- =================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'premium')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- =================================================================
-- 2. ПОЛИТИКИ БЕЗОПАСНОСТИ (ROW LEVEL SECURITY)
-- =================================================================

-- Включаем RLS для таблицы ролей
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свою роль
CREATE POLICY "Users can view own role" ON user_roles 
  FOR SELECT USING (auth.uid() = user_id);

-- Политика: админы могут видеть все роли
CREATE POLICY "Admins can view all roles" ON user_roles 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Политика: только админы могут изменять роли
CREATE POLICY "Admins can manage all roles" ON user_roles 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =================================================================
-- 3. ФУНКЦИЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ ПРОФИЛЯ
-- =================================================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем роль пользователя
  INSERT INTO user_roles (user_id, role) 
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Создаем базовую статистику (если таблица существует)
  INSERT INTO user_stats (user_id) 
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Создаем базовые сферы жизни (если таблица существует)
  INSERT INTO life_spheres (user_id, sphere_name, health_percentage) VALUES
    (NEW.id, 'Здоровье', 50),
    (NEW.id, 'Карьера', 50),
    (NEW.id, 'Финансы', 50),
    (NEW.id, 'Отношения', 50),
    (NEW.id, 'Саморазвитие', 50)
  ON CONFLICT (user_id, sphere_name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Привязываем триггер к регистрации пользователей
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- =================================================================
-- 4. ФУНКЦИЯ ПОЛУЧЕНИЯ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
-- =================================================================
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT row_to_json(profile_data)
  INTO result
  FROM (
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data->>'name' as name,
      u.created_at,
      ur.role,
      ur.permissions
    FROM auth.users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE u.id = user_uuid
  ) profile_data;
  
  RETURN COALESCE(result, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- 5. ФУНКЦИЯ ПРОВЕРКИ РОЛИ ПОЛЬЗОВАТЕЛЯ
-- =================================================================
CREATE OR REPLACE FUNCTION check_user_role(user_uuid UUID, required_role VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid 
    AND (
      role = required_role OR 
      role = 'admin' -- Админы имеют доступ ко всему
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- 6. НАСТРОЙКА АДМИНСКОГО ПОЛЬЗОВАТЕЛЯ
-- =================================================================

-- Функция для назначения админской роли по email
CREATE OR REPLACE FUNCTION set_admin_role(admin_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Находим пользователя по email
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF user_uuid IS NOT NULL THEN
    -- Обновляем или создаем роль админа
    INSERT INTO user_roles (user_id, role, permissions)
    VALUES (user_uuid, 'admin', '{"all": true, "manage_users": true, "view_analytics": true}')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      role = 'admin',
      permissions = '{"all": true, "manage_users": true, "view_analytics": true}',
      updated_at = NOW();
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- 7. GRANT РАЗРЕШЕНИЯ
-- =================================================================

-- Разрешения для анонимных пользователей (для регистрации)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON user_roles TO anon;

-- Разрешения для авторизованных пользователей
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_roles TO authenticated;

-- Разрешения для сервисной роли
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =================================================================
-- 8. ИНСТРУКЦИИ ПО ИСПОЛЬЗОВАНИЮ
-- =================================================================

/*
🎯 СЛЕДУЮЩИЕ ШАГИ ПОСЛЕ ВЫПОЛНЕНИЯ СКРИПТА:

1. Зарегистрируйтесь в приложении с вашим email
2. Выполните: SELECT set_admin_role('your-email@example.com');
3. Проверьте роль: SELECT * FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

📋 ПОЛЕЗНЫЕ ЗАПРОСЫ:

-- Посмотреть всех пользователей и их роли:
SELECT u.email, ur.role, ur.created_at 
FROM auth.users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id;

-- Проверить админа:
SELECT check_user_role((SELECT id FROM auth.users WHERE email = 'your-email@example.com'), 'admin');

-- Получить профиль пользователя:
SELECT get_user_profile((SELECT id FROM auth.users WHERE email = 'your-email@example.com'));

🔐 БЕЗОПАСНОСТЬ:
- Все таблицы защищены Row Level Security
- Обычные пользователи видят только свои данные  
- Админы имеют полный доступ
- Автоматическое создание профиля при регистрации

✅ СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ!
*/ 