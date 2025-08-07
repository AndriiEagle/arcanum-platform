// A/B тестирование цен для Arcanum Platform
// Оптимизирует конверсию всех точек монетизации

import { createClient } from '../supabase/client'

// Типы A/B тестов
export type ABTestType = 'token_limit' | 'mascot' | 'premium_subscription'

// Варианты цен для тестирования
export interface PriceVariant {
  id: string
  multiplier: number // 1.0 = базовая цена, 1.5 = +50%, 0.75 = -25%
  label: string
  description: string
}

// Результат A/B теста
export interface ABTestResult {
  userId: string
  testType: ABTestType
  variantId: string
  basePrice: number
  testPrice: number
  multiplier: number
  timestamp: Date
}

// Метрики конверсии
export interface ConversionMetrics {
  testType: ABTestType
  variantId: string
  impressions: number // Показы paywall
  clicks: number      // Клики "Купить"
  conversions: number // Успешные покупки
  revenue: number     // Общий доход
  conversionRate: number // Процент конверсии
  averageOrderValue: number // Средний чек
}

// Предопределенные варианты для тестирования
export const PRICE_VARIANTS: Record<string, PriceVariant[]> = {
  'token_limit': [
    { id: 'control', multiplier: 1.0, label: 'Контроль', description: 'Базовая цена' },
    { id: 'premium_20', multiplier: 1.2, label: 'Премиум +20%', description: 'Повышенная цена' },
    { id: 'discount_25', multiplier: 0.75, label: 'Скидка -25%', description: 'Акционная цена' },
    { id: 'psychological', multiplier: 0.99, label: 'Психологическая', description: '$1.99 вместо $2.00' }
  ],
  
  'mascot': [
    { id: 'control', multiplier: 1.0, label: 'Контроль', description: 'Базовая цена $1.00' },
    { id: 'premium_50', multiplier: 1.5, label: 'Премиум +50%', description: 'Высокая цена $1.50' },
    { id: 'budget', multiplier: 0.5, label: 'Бюджет -50%', description: 'Низкая цена $0.50' }
  ],
  
  'premium_subscription': [
    { id: 'control', multiplier: 1.0, label: 'Контроль', description: 'Базовая цена $9.99' },
    { id: 'premium', multiplier: 1.3, label: 'Премиум +30%', description: 'Высокая цена $12.99' },
    { id: 'launch_discount', multiplier: 0.7, label: 'Скидка запуска', description: 'Специальная цена $6.99' },
    { id: 'psychological', multiplier: 0.95, label: 'Психологическая', description: '$9.49' }
  ]
}

// Базовые цены продуктов
export const BASE_PRICES: Record<ABTestType, number> = {
  'token_limit': 2.00,
  'mascot': 1.00, 
  'premium_subscription': 9.99
}

/**
 * Генерирует стабильный хэш из строки пользователя
 * Используется для консистентного распределения по группам
 */
function hashUserId(userId: string): number {
  let hash = 0
  if (userId.length === 0) return hash
  
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Конвертируем в 32-битное число
  }
  
  return Math.abs(hash)
}

/**
 * Получает вариант цены для пользователя на основе A/B теста
 * Пользователь всегда получает один и тот же вариант
 */
export function getPriceVariant(
  userId: string, 
  testType: ABTestType
): { price: number; variant: PriceVariant; testResult: ABTestResult } {
  
  const basePrice = BASE_PRICES[testType]
  const variants = PRICE_VARIANTS[testType]
  
  if (!variants || variants.length === 0) {
    // Fallback к базовой цене
    const controlVariant = { id: 'control', multiplier: 1.0, label: 'Контроль', description: 'Базовая цена' }
    return {
      price: basePrice,
      variant: controlVariant,
      testResult: {
        userId,
        testType,
        variantId: 'control',
        basePrice,
        testPrice: basePrice,
        multiplier: 1.0,
        timestamp: new Date()
      }
    }
  }
  
  // Используем хэш для стабильного распределения
  const hash = hashUserId(userId + testType) // Добавляем testType для разных тестов
  const variantIndex = hash % variants.length
  const selectedVariant = variants[variantIndex]
  
  const testPrice = Number((basePrice * selectedVariant.multiplier).toFixed(2))
  
  const testResult: ABTestResult = {
    userId,
    testType,
    variantId: selectedVariant.id,
    basePrice,
    testPrice,
    multiplier: selectedVariant.multiplier,
    timestamp: new Date()
  }
  
  console.log(`🧪 A/B тест ${testType} для ${userId}: вариант ${selectedVariant.id}, цена $${testPrice}`)
  
  return {
    price: testPrice,
    variant: selectedVariant,
    testResult
  }
}

/**
 * Логирует показ paywall для аналитики A/B теста
 */
export async function logPaywallImpression(testResult: ABTestResult): Promise<void> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('ab_test_events')
      .insert([{
        user_id: testResult.userId,
        test_type: testResult.testType,
        variant_id: testResult.variantId,
        event_type: 'impression',
        base_price: testResult.basePrice,
        test_price: testResult.testPrice,
        multiplier: testResult.multiplier,
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('❌ Ошибка логирования impression:', error)
    } else {
      console.log(`📊 Impression залогирован: ${testResult.testType} / ${testResult.variantId}`)
    }
  } catch (error) {
    console.error('❌ Критическая ошибка логирования impression:', error)
  }
}

/**
 * Логирует клик по кнопке "Купить" для аналитики A/B теста
 */
export async function logPaywallClick(testResult: ABTestResult): Promise<void> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('ab_test_events')
      .insert([{
        user_id: testResult.userId,
        test_type: testResult.testType,
        variant_id: testResult.variantId,
        event_type: 'click',
        base_price: testResult.basePrice,
        test_price: testResult.testPrice,
        multiplier: testResult.multiplier,
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('❌ Ошибка логирования click:', error)
    } else {
      console.log(`📊 Click залогирован: ${testResult.testType} / ${testResult.variantId}`)
    }
  } catch (error) {
    console.error('❌ Критическая ошибка логирования click:', error)
  }
}

/**
 * Логирует успешную конверсию (покупку) для аналитики A/B теста
 */
export async function logPaywallConversion(
  testResult: ABTestResult, 
  paymentIntentId: string,
  actualAmount: number
): Promise<void> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('ab_test_events')
      .insert([{
        user_id: testResult.userId,
        test_type: testResult.testType,
        variant_id: testResult.variantId,
        event_type: 'conversion',
        base_price: testResult.basePrice,
        test_price: testResult.testPrice,
        multiplier: testResult.multiplier,
        payment_intent_id: paymentIntentId,
        actual_amount: actualAmount,
        created_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('❌ Ошибка логирования conversion:', error)
    } else {
      console.log(`📊 Conversion залогирован: ${testResult.testType} / ${testResult.variantId} / $${actualAmount}`)
    }
  } catch (error) {
    console.error('❌ Критическая ошибка логирования conversion:', error)
  }
}

/**
 * Получает метрики конверсии для A/B теста
 */
export async function getConversionMetrics(
  testType: ABTestType,
  dateFrom?: Date,
  dateTo?: Date
): Promise<ConversionMetrics[]> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('ab_test_events')
      .select('*')
      .eq('test_type', testType)
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom.toISOString())
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo.toISOString())
    }
    
    const { data: events, error } = await query
    
    if (error) {
      console.error('❌ Ошибка получения метрик:', error)
      return []
    }
    
    // Группируем события по вариантам
    const variantGroups = events?.reduce((groups, event) => {
      if (!groups[event.variant_id]) {
        groups[event.variant_id] = []
      }
      groups[event.variant_id].push(event)
      return groups
    }, {} as Record<string, any[]>) || {}
    
    // Вычисляем метрики для каждого варианта
    const metrics: ConversionMetrics[] = Object.entries(variantGroups).map(([variantId, variantEvents]) => {
      const impressions = variantEvents.filter(e => e.event_type === 'impression').length
      const clicks = variantEvents.filter(e => e.event_type === 'click').length
      const conversions = variantEvents.filter(e => e.event_type === 'conversion').length
      
      const revenue = variantEvents
        .filter(e => e.event_type === 'conversion')
        .reduce((sum, e) => sum + (e.actual_amount || 0), 0)
      
      const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0
      const averageOrderValue = conversions > 0 ? revenue / conversions : 0
      
      return {
        testType,
        variantId,
        impressions,
        clicks, 
        conversions,
        revenue,
        conversionRate: Number(conversionRate.toFixed(2)),
        averageOrderValue: Number(averageOrderValue.toFixed(2))
      }
    })
    
    console.log(`📊 Получены метрики для ${testType}: ${metrics.length} вариантов`)
    
    return metrics
    
  } catch (error) {
    console.error('❌ Критическая ошибка получения метрик:', error)
    return []
  }
}

/**
 * Получает лучший вариант цены на основе метрик
 */
export async function getBestPriceVariant(testType: ABTestType): Promise<{
  variantId: string
  conversionRate: number
  revenue: number
  recommendation: string
} | null> {
  try {
    const metrics = await getConversionMetrics(testType)
    
    if (metrics.length === 0) {
      return null
    }
    
    // Находим вариант с лучшей конверсией (минимум 10 impressions для статистической значимости)
    const validMetrics = metrics.filter(m => m.impressions >= 10)
    
    if (validMetrics.length === 0) {
      return {
        variantId: 'insufficient_data',
        conversionRate: 0,
        revenue: 0,
        recommendation: 'Недостаточно данных для анализа. Требуется минимум 10 показов на вариант.'
      }
    }
    
    // Сортируем по доходу (revenue), затем по конверсии
    const bestVariant = validMetrics.sort((a, b) => {
      if (Math.abs(a.revenue - b.revenue) < 0.01) {
        return b.conversionRate - a.conversionRate
      }
      return b.revenue - a.revenue
    })[0]
    
    const recommendation = `Лучший вариант: ${bestVariant.variantId} с конверсией ${bestVariant.conversionRate}% и доходом $${bestVariant.revenue.toFixed(2)}`
    
    console.log(`🏆 Лучший вариант для ${testType}: ${recommendation}`)
    
    return {
      variantId: bestVariant.variantId,
      conversionRate: bestVariant.conversionRate,
      revenue: bestVariant.revenue,
      recommendation
    }
    
  } catch (error) {
    console.error('❌ Ошибка определения лучшего варианта:', error)
    return null
  }
}

// Экспорт типов для использования в других файлах
export type { ABTestType, PriceVariant, ABTestResult, ConversionMetrics } 