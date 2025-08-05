-- Дополнительные таблицы для Arcanum Platform

-- Таблица для статистики пользователей
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  next_level_xp INTEGER DEFAULT 1000,
  energy INTEGER DEFAULT 100,
  total_tokens_used BIGINT DEFAULT 0,
  total_cost_spent DECIMAL(10,4) DEFAULT 0.0000,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Таблица для задач пользователя
CREATE TABLE user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sphere_id UUID REFERENCES life_spheres(id) ON DELETE CASCADE,
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

-- Таблица для категорий развития в сферах
CREATE TABLE sphere_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sphere_id UUID REFERENCES life_spheres(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  progress INTEGER DEFAULT 0,
  mascot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для маскотов (генерированных AI изображений)
CREATE TABLE generated_mascots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES sphere_categories(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used VARCHAR(100) DEFAULT 'dall-e-3',
  generation_cost DECIMAL(8,4) DEFAULT 0.0000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для пользовательских баффов/дебаффов
CREATE TABLE user_buffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(10) CHECK (type IN ('buff', 'debuff')) DEFAULT 'buff',
  effect_value INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для истории использования AI моделей
CREATE TABLE ai_model_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  model_id VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost DECIMAL(8,6) DEFAULT 0.000000,
  request_type VARCHAR(50) DEFAULT 'chat',
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для запланированных наград
CREATE TABLE scheduled_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trigger_level INTEGER NOT NULL,
  reward_type VARCHAR(50) DEFAULT 'message',
  reward_content TEXT NOT NULL,
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение Row Level Security для всех таблиц
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphere_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_mascots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_buffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_rewards ENABLE ROW LEVEL SECURITY;

-- Политики безопасности - пользователи видят только свои данные
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON user_stats FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tasks" ON user_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON user_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON user_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own categories" ON sphere_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM life_spheres WHERE life_spheres.id = sphere_categories.sphere_id AND life_spheres.user_id = auth.uid())
);

CREATE POLICY "Users can view own mascots" ON generated_mascots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mascots" ON generated_mascots FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own buffs" ON user_buffs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own buffs" ON user_buffs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own buffs" ON user_buffs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own AI usage" ON ai_model_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI usage" ON ai_model_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own rewards" ON scheduled_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rewards" ON scheduled_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rewards" ON scheduled_rewards FOR UPDATE USING (auth.uid() = user_id);

-- Индексы для производительности
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX idx_user_tasks_sphere_id ON user_tasks(sphere_id);
CREATE INDEX idx_user_tasks_completed ON user_tasks(is_completed);
CREATE INDEX idx_sphere_categories_sphere_id ON sphere_categories(sphere_id);
CREATE INDEX idx_generated_mascots_user_id ON generated_mascots(user_id);
CREATE INDEX idx_user_buffs_user_id ON user_buffs(user_id);
CREATE INDEX idx_user_buffs_active ON user_buffs(is_active);
CREATE INDEX idx_ai_model_usage_user_id ON ai_model_usage(user_id);
CREATE INDEX idx_ai_model_usage_created_at ON ai_model_usage(created_at);
CREATE INDEX idx_scheduled_rewards_user_id ON scheduled_rewards(user_id);
CREATE INDEX idx_scheduled_rewards_level ON scheduled_rewards(trigger_level);

-- Обновление первичной схемы тоже
ALTER TABLE ui_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_spheres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own layouts" ON ui_layouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own spheres" ON life_spheres FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ui_layouts_user_id ON ui_layouts(user_id);
CREATE INDEX idx_life_spheres_user_id ON life_spheres(user_id);
CREATE INDEX idx_life_spheres_active ON life_spheres(is_active); 