-- Таблица для хранения кастомных настроек интерфейса пользователя
CREATE TABLE ui_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  layout_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для 12 сфер жизни
CREATE TABLE life_spheres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sphere_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  health_percentage INT DEFAULT 0,
  resonance_degree FLOAT DEFAULT 0,
  -- Другие параметры, например, глобальная цель
  global_goal TEXT,
  -- Связь с категорией и маскотом
  category_mascot_url TEXT
); 