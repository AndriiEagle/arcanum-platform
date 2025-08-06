-- Создание таблицы аналитики для отслеживания всех paywall метрик
-- Интегрируется с A/B тестированием для полной аналитики

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  product_type TEXT, -- 'token_limit', 'mascot', 'premium_subscription'
  variant_id TEXT,   -- Для A/B тестирования
  properties JSONB DEFAULT '{}',
  page_url TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ограничения
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'paywall_shown', 'paywall_clicked', 'payment_initiated', 
    'payment_completed', 'payment_failed', 'user_converted',
    'session_started', 'feature_used'
  )),
  CONSTRAINT valid_product_type CHECK (
    product_type IS NULL OR 
    product_type IN ('token_limit', 'mascot', 'premium_subscription')
  ),
  CONSTRAINT valid_device_type CHECK (
    device_type IS NULL OR 
    device_type IN ('desktop', 'mobile', 'tablet')
  )
);

-- Создание индексов для быстрой обработки запросов
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_product_type ON analytics_events(product_type);
CREATE INDEX IF NOT EXISTS idx_analytics_variant_id ON analytics_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_device_type ON analytics_events(device_type);

-- Составные индексы для сложных запросов
CREATE INDEX IF NOT EXISTS idx_analytics_funnel ON analytics_events(product_type, variant_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user_journey ON analytics_events(user_id, created_at, event_type);

-- Включение Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (
    auth.uid()::text = user_id OR 
    auth.role() = 'service_role' OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can insert own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR 
    auth.role() = 'service_role' OR
    user_id IS NOT NULL
  );

-- Политика для анонимных пользователей
CREATE POLICY "Anonymous users can insert events" ON analytics_events
  FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- Комментарии для документации
COMMENT ON TABLE analytics_events IS 'События аналитики для отслеживания всех paywall метрик и A/B тестов';
COMMENT ON COLUMN analytics_events.user_id IS 'ID пользователя или анонимный идентификатор';
COMMENT ON COLUMN analytics_events.session_id IS 'ID сессии пользователя';
COMMENT ON COLUMN analytics_events.event_type IS 'Тип события: paywall_shown, paywall_clicked, payment_completed, etc.';
COMMENT ON COLUMN analytics_events.product_type IS 'Тип продукта: token_limit, mascot, premium_subscription';
COMMENT ON COLUMN analytics_events.variant_id IS 'ID варианта A/B теста';
COMMENT ON COLUMN analytics_events.properties IS 'Дополнительные свойства события в JSON формате';
COMMENT ON COLUMN analytics_events.page_url IS 'URL страницы где произошло событие';
COMMENT ON COLUMN analytics_events.user_agent IS 'User Agent браузера';
COMMENT ON COLUMN analytics_events.device_type IS 'Тип устройства: desktop, mobile, tablet';

-- Создание view для воронки конверсии
CREATE OR REPLACE VIEW conversion_funnel AS
SELECT 
  product_type,
  variant_id,
  COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END) as impressions,
  COUNT(CASE WHEN event_type = 'paywall_clicked' THEN 1 END) as clicks,
  COUNT(CASE WHEN event_type = 'payment_initiated' THEN 1 END) as initiations,
  COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END) as completions,
  COUNT(CASE WHEN event_type = 'payment_failed' THEN 1 END) as failures,
  
  -- Конверсии в процентах
  ROUND(
    COUNT(CASE WHEN event_type = 'paywall_clicked' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END), 0) * 100, 
    2
  ) as click_rate,
  
  ROUND(
    COUNT(CASE WHEN event_type = 'payment_initiated' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN event_type = 'paywall_clicked' THEN 1 END), 0) * 100, 
    2
  ) as initiation_rate,
  
  ROUND(
    COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN event_type = 'payment_initiated' THEN 1 END), 0) * 100, 
    2
  ) as completion_rate,
  
  ROUND(
    COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END), 0) * 100, 
    2
  ) as overall_conversion,
  
  -- Доходы
  SUM(
    CASE WHEN event_type = 'payment_completed' 
    THEN COALESCE((properties->>'amount')::DECIMAL, 0) 
    ELSE 0 END
  ) as total_revenue,
  
  ROUND(
    SUM(
      CASE WHEN event_type = 'payment_completed' 
      THEN COALESCE((properties->>'amount')::DECIMAL, 0) 
      ELSE 0 END
    ) / NULLIF(COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END), 0), 
    2
  ) as average_order_value,
  
  -- Временные метрики
  MIN(created_at) as first_event,
  MAX(created_at) as last_event,
  COUNT(DISTINCT user_id) as unique_users
  
FROM analytics_events
WHERE product_type IS NOT NULL
GROUP BY product_type, variant_id
ORDER BY product_type, variant_id;

-- View для пользовательских сессий
CREATE OR REPLACE VIEW user_sessions AS
SELECT 
  user_id,
  session_id,
  device_type,
  MIN(created_at) as session_start,
  MAX(created_at) as session_end,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as session_duration_seconds,
  COUNT(*) as events_count,
  COUNT(DISTINCT event_type) as unique_events,
  ARRAY_AGG(DISTINCT event_type ORDER BY event_type) as event_types,
  ARRAY_AGG(DISTINCT product_type ORDER BY product_type) FILTER (WHERE product_type IS NOT NULL) as products_viewed,
  MAX(CASE WHEN event_type = 'payment_completed' THEN 1 ELSE 0 END) as converted
FROM analytics_events
WHERE session_id IS NOT NULL
GROUP BY user_id, session_id, device_type
ORDER BY session_start DESC;

-- View для дневной аналитики
CREATE OR REPLACE VIEW daily_analytics AS
SELECT 
  DATE(created_at) as date,
  product_type,
  variant_id,
  device_type,
  COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END) as daily_impressions,
  COUNT(CASE WHEN event_type = 'paywall_clicked' THEN 1 END) as daily_clicks,
  COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END) as daily_conversions,
  SUM(CASE WHEN event_type = 'payment_completed' 
      THEN COALESCE((properties->>'amount')::DECIMAL, 0) 
      ELSE 0 END) as daily_revenue,
  COUNT(DISTINCT user_id) as daily_unique_users
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), product_type, variant_id, device_type
ORDER BY date DESC, product_type, variant_id;

-- Функция для получения метрик по периоду
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_product_type TEXT DEFAULT NULL,
  p_variant_id TEXT DEFAULT NULL,
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  period TEXT,
  impressions BIGINT,
  clicks BIGINT,
  conversions BIGINT,
  revenue DECIMAL,
  click_rate DECIMAL,
  conversion_rate DECIMAL,
  avg_order_value DECIMAL
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    CASE 
      WHEN p_days_back = 1 THEN 'Last 24 hours'
      WHEN p_days_back = 7 THEN 'Last 7 days'
      WHEN p_days_back = 30 THEN 'Last 30 days'
      ELSE p_days_back || ' days'
    END as period,
    COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END) as impressions,
    COUNT(CASE WHEN event_type = 'paywall_clicked' THEN 1 END) as clicks,
    COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END) as conversions,
    SUM(CASE WHEN event_type = 'payment_completed' 
        THEN COALESCE((properties->>'amount')::DECIMAL, 0) 
        ELSE 0 END) as revenue,
    ROUND(
      COUNT(CASE WHEN event_type = 'paywall_clicked' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END), 0) * 100, 
      2
    ) as click_rate,
    ROUND(
      COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(CASE WHEN event_type = 'paywall_shown' THEN 1 END), 0) * 100, 
      2
    ) as conversion_rate,
    ROUND(
      SUM(CASE WHEN event_type = 'payment_completed' 
          THEN COALESCE((properties->>'amount')::DECIMAL, 0) 
          ELSE 0 END) / 
      NULLIF(COUNT(CASE WHEN event_type = 'payment_completed' THEN 1 END), 0), 
      2
    ) as avg_order_value
  FROM analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL p_days_back || ' days'
    AND (p_product_type IS NULL OR product_type = p_product_type)
    AND (p_variant_id IS NULL OR variant_id = p_variant_id)
$$;

-- Функция для очистки старых событий (для управления размером БД)
CREATE OR REPLACE FUNCTION cleanup_old_analytics(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM analytics_events 
  WHERE created_at < CURRENT_DATE - INTERVAL days_to_keep || ' days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Комментарии для объектов
COMMENT ON VIEW conversion_funnel IS 'Воронка конверсии по продуктам и A/B вариантам';
COMMENT ON VIEW user_sessions IS 'Пользовательские сессии с агрегированными метриками';
COMMENT ON VIEW daily_analytics IS 'Дневная аналитика за последние 30 дней';
COMMENT ON FUNCTION get_analytics_summary(TEXT, TEXT, INTEGER) IS 'Получение сводных метрик за указанный период';
COMMENT ON FUNCTION cleanup_old_analytics(INTEGER) IS 'Очистка старых событий аналитики для управления размером БД';

-- Тестовые данные (опционально, закомментированы)
-- INSERT INTO analytics_events (user_id, session_id, event_type, product_type, variant_id, properties) VALUES
-- ('test-user-analytics', 'session_123', 'paywall_shown', 'token_limit', 'control', '{"price": 2.00, "trigger": "limit_reached"}'),
-- ('test-user-analytics', 'session_123', 'paywall_clicked', 'token_limit', 'control', '{"price": 2.00, "button_text": "Купить сейчас"}'),
-- ('test-user-analytics', 'session_123', 'payment_completed', 'token_limit', 'control', '{"amount": 2.00, "currency": "USD"}');

-- Проверка создания
SELECT 'Analytics Infrastructure Created Successfully!' as status,
       'Table: analytics_events' as table_created,
       'Views: conversion_funnel, user_sessions, daily_analytics' as views_created,
       'Functions: get_analytics_summary(), cleanup_old_analytics()' as functions_created; 