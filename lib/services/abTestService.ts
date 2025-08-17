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

function hashUserId(userId: string): number {
  let hash = 0
  if (userId.length === 0) return hash
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getPriceVariant(
  userId: string, 
  testType: ABTestType
): { price: number; variant: PriceVariant; testResult: ABTestResult } {
  const basePrice = BASE_PRICES[testType]
  const variants = PRICE_VARIANTS[testType]
  if (!variants || variants.length === 0) {
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
  const hash = hashUserId(userId + testType)
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
  return { price: testPrice, variant: selectedVariant, testResult }
}

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
    }
  } catch (error) {
    console.error('❌ Критическая ошибка логирования impression:', error)
  }
}

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
    }
  } catch (error) {
    console.error('❌ Критическая ошибка логирования click:', error)
  }
}

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
    }
  } catch (error) {
    console.error('❌ Критическая ошибка логирования conversion:', error)
  }
} 