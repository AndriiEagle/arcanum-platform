-- Создание таблицы для A/B тестирования цен в Arcanum Platform
-- Используется для отслеживания показов, кликов и конверсий

CREATE TABLE IF NOT EXISTS ab_test_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  test_type TEXT NOT NULL, -- 'token_limit', 'mascot', 'premium_subscription'
  variant_id TEXT NOT NULL, -- 'control', 'premium_20', 'discount_25', etc.
  event_type TEXT NOT NULL, -- 'impression', 'click', 'conversion'
  base_price DECIMAL(10,2) NOT NULL,
  test_price DECIMAL(10,2) NOT NULL,
  multiplier DECIMAL(5,3) NOT NULL,
  payment_intent_id TEXT, -- Только для conversion events
  actual_amount DECIMAL(10,2), -- Только для conversion events
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Индексы для быстрых запросов
  CONSTRAINT valid_test_type CHECK (test_type IN ('token_limit', 'mascot', 'premium_subscription')),
  CONSTRAINT valid_event_type CHECK (event_type IN ('impression', 'click', 'conversion')),
  CONSTRAINT positive_prices CHECK (base_price > 0 AND test_price > 0),
  CONSTRAINT positive_multiplier CHECK (multiplier > 0)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_ab_test_events_user_id ON ab_test_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_test_type ON ab_test_events(test_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant_id ON ab_test_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_event_type ON ab_test_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_created_at ON ab_test_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_composite ON ab_test_events(test_type, variant_id, event_type);

-- Включение Row Level Security
ALTER TABLE ab_test_events ENABLE ROW LEVEL SECURITY;

-- Политика безопасности: пользователи могут видеть только свои события
CREATE POLICY "Users can view own ab test events" ON ab_test_events
  FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Политика безопасности: пользователи могут создавать свои события
CREATE POLICY "Users can insert own ab test events" ON ab_test_events
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

-- Политика для анонимных пользователей (для тестирования)
CREATE POLICY "Anonymous users can insert events" ON ab_test_events
  FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- Комментарии для документации
COMMENT ON TABLE ab_test_events IS 'События A/B тестирования цен для отслеживания конверсии';
COMMENT ON COLUMN ab_test_events.user_id IS 'ID пользователя или анонимный идентификатор';
COMMENT ON COLUMN ab_test_events.test_type IS 'Тип A/B теста: token_limit, mascot, premium_subscription';
COMMENT ON COLUMN ab_test_events.variant_id IS 'ID варианта: control, premium_20, discount_25, etc.';
COMMENT ON COLUMN ab_test_events.event_type IS 'Тип события: impression, click, conversion';
COMMENT ON COLUMN ab_test_events.base_price IS 'Базовая цена продукта';
COMMENT ON COLUMN ab_test_events.test_price IS 'Тестовая цена с учетом multiplier';
COMMENT ON COLUMN ab_test_events.multiplier IS 'Множитель цены для A/B теста';
COMMENT ON COLUMN ab_test_events.payment_intent_id IS 'ID успешного платежа (только для conversion)';
COMMENT ON COLUMN ab_test_events.actual_amount IS 'Реальная сумма платежа (может отличаться от test_price)';

-- Создание view для аналитики конверсии
CREATE OR REPLACE VIEW ab_test_analytics AS
SELECT 
  test_type,
  variant_id,
  COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
  COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as conversions,
  SUM(CASE WHEN event_type = 'conversion' THEN COALESCE(actual_amount, test_price) ELSE 0 END) as revenue,
  ROUND(
    COUNT(CASE WHEN event_type = 'conversion' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN event_type = 'impression' THEN 1 END), 0) * 100, 
    2
  ) as conversion_rate,
  ROUND(
    SUM(CASE WHEN event_type = 'conversion' THEN COALESCE(actual_amount, test_price) ELSE 0 END) / 
    NULLIF(COUNT(CASE WHEN event_type = 'conversion' THEN 1 END), 0), 
    2
  ) as average_order_value,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event,
  COUNT(DISTINCT user_id) as unique_users
FROM ab_test_events
GROUP BY test_type, variant_id
ORDER BY test_type, variant_id;

-- Комментарий для view
COMMENT ON VIEW ab_test_analytics IS 'Аналитика A/B тестов с метриками конверсии по вариантам';

-- Тестовые данные для проверки (опционально)
-- INSERT INTO ab_test_events (user_id, test_type, variant_id, event_type, base_price, test_price, multiplier) VALUES
-- ('test-user-1', 'token_limit', 'control', 'impression', 2.00, 2.00, 1.0),
-- ('test-user-1', 'token_limit', 'control', 'click', 2.00, 2.00, 1.0),
-- ('test-user-2', 'token_limit', 'premium_20', 'impression', 2.00, 2.40, 1.2),
-- ('test-user-3', 'mascot', 'discount_25', 'impression', 1.00, 0.75, 0.75);

-- Функция для получения лучшего варианта
CREATE OR REPLACE FUNCTION get_best_variant(p_test_type TEXT)
RETURNS TABLE (
  variant_id TEXT,
  conversion_rate DECIMAL,
  revenue DECIMAL,
  recommendation TEXT
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    a.variant_id,
    a.conversion_rate,
    a.revenue,
    CASE 
      WHEN a.impressions < 10 THEN 'Недостаточно данных для анализа'
      ELSE 'Лучший вариант: ' || a.variant_id || ' с конверсией ' || a.conversion_rate || '% и доходом $' || a.revenue
    END as recommendation
  FROM ab_test_analytics a
  WHERE a.test_type = p_test_type
    AND a.impressions >= 10
  ORDER BY a.revenue DESC, a.conversion_rate DESC
  LIMIT 1;
$$;

-- Комментарий для функции
COMMENT ON FUNCTION get_best_variant(TEXT) IS 'Возвращает лучший вариант A/B теста по доходу и конверсии';

-- Вывод информации о созданных объектах
SELECT 'A/B Test Infrastructure Created Successfully!' as status,
       'Table: ab_test_events' as table_created,
       'View: ab_test_analytics' as view_created,
       'Function: get_best_variant()' as function_created; 