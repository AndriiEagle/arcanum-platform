// Сервис аналитики для отслеживания всех paywall метрик
// Интегрируется с A/B тестированием для максимизации конверсии

import { createClient } from '../supabase/client'

// Типы событий аналитики
export type AnalyticsEventType = 
  | 'paywall_shown' 
  | 'paywall_clicked' 
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'user_converted'
  | 'session_started'
  | 'feature_used'

// Типы продуктов для аналитики  
export type ProductType = 'token_limit' | 'mascot' | 'premium_subscription'

// Событие аналитики
export interface AnalyticsEvent {
  id?: string
  user_id: string
  session_id?: string
  event_type: AnalyticsEventType
  product_type?: ProductType
  variant_id?: string // Для A/B тестирования
  properties: Record<string, any>
  timestamp: Date
  page_url?: string
  user_agent?: string
  device_type?: 'desktop' | 'mobile' | 'tablet'
}

// Метрики конверсии продукта
export interface ProductMetrics {
  product_type: ProductType
  variant_id?: string
  time_period: '24h' | '7d' | '30d' | 'all'
  
  // Воронка
  impressions: number    // Показы paywall
  clicks: number         // Клики на "Купить"
  initiations: number    // Начало оплаты
  completions: number    // Успешные оплаты
  
  // Конверсии (%)
  click_rate: number           // clicks / impressions
  initiation_rate: number      // initiations / clicks  
  completion_rate: number      // completions / initiations
  overall_conversion: number   // completions / impressions
  
  // Финансовые
  total_revenue: number
  average_order_value: number
  
  // Временные
  avg_time_to_decision: number // Среднее время от показа до клика
  avg_payment_time: number     // Среднее время оплаты
}

// Пользовательские метрики
export interface UserMetrics {
  user_id: string
  first_seen: Date
  last_seen: Date
  total_sessions: number
  total_events: number
  
  // Поведение
  avg_session_duration: number
  pages_per_session: number
  bounce_rate: number
  
  // Монетизация
  lifetime_value: number
  total_purchases: number
  avg_purchase_value: number
  days_to_first_purchase: number
  
  // Сегментация
  user_segment: 'new' | 'active' | 'convert' | 'churn'
  device_preference: 'desktop' | 'mobile' | 'tablet'
}

// Конфигурация отслеживания
const ANALYTICS_CONFIG = {
  // Включенные события
  enabledEvents: [
    'paywall_shown',
    'paywall_clicked', 
    'payment_initiated',
    'payment_completed',
    'payment_failed',
    'user_converted'
  ],
  
  // Батчинг для производительности
  batchSize: 10,
  flushInterval: 5000, // 5 секунд
  
  // Сессии
  sessionTimeout: 30 * 60 * 1000, // 30 минут
  
  // Дебаг
  debug: process.env.NODE_ENV === 'development'
}

// Внутренний буфер для батчинга
let eventBuffer: AnalyticsEvent[] = []
let flushTimer: NodeJS.Timeout | null = null

/**
 * Генерирует уникальный ID сессии
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Определяет тип устройства по User Agent
 */  
function detectDeviceType(userAgent?: string): 'desktop' | 'mobile' | 'tablet' {
  if (!userAgent) return 'desktop'
  
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile')) return 'mobile'
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet'
  return 'desktop'
}

/**
 * Основная функция отслеживания события
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  userId: string,
  properties: Record<string, any> = {},
  options: {
    productType?: ProductType
    variantId?: string
    sessionId?: string
    immediate?: boolean
  } = {}
): Promise<void> {
  
  if (!ANALYTICS_CONFIG.enabledEvents.includes(eventType)) {
    if (ANALYTICS_CONFIG.debug) {
      console.log(`📊 Событие ${eventType} отключено в конфигурации`)
    }
    return
  }

  const event: AnalyticsEvent = {
    user_id: userId,
    session_id: options.sessionId || generateSessionId(),
    event_type: eventType,
    product_type: options.productType,
    variant_id: options.variantId,
    properties: {
      ...properties,
      timestamp_client: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined
    },
    timestamp: new Date(),
    page_url: typeof window !== 'undefined' ? window.location.pathname : undefined,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    device_type: typeof navigator !== 'undefined' ? detectDeviceType(navigator.userAgent) : 'desktop'
  }

  if (ANALYTICS_CONFIG.debug) {
    console.log(`📊 Отслеживание события:`, {
      type: eventType,
      user: userId,
      product: options.productType,
      variant: options.variantId,
      properties: Object.keys(properties)
    })
  }

  if (options.immediate) {
    await flushEvent(event)
  } else {
    eventBuffer.push(event)
    
    if (eventBuffer.length >= ANALYTICS_CONFIG.batchSize) {
      await flushBatch()
    } else {
      scheduleFlush()
    }
  }
}

/**
 * Немедленная отправка одного события
 */
async function flushEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('analytics_events')
      .insert([{
        user_id: event.user_id,
        session_id: event.session_id,
        event_type: event.event_type,
        product_type: event.product_type,
        variant_id: event.variant_id,
        properties: event.properties,
        page_url: event.page_url,
        user_agent: event.user_agent,
        device_type: event.device_type,
        created_at: event.timestamp.toISOString()
      }])
    
    if (error) {
      console.error('❌ Ошибка отправки события аналитики:', error)
    } else if (ANALYTICS_CONFIG.debug) {
      console.log(`✅ Событие ${event.event_type} отправлено`)
    }
  } catch (error) {
    console.error('❌ Критическая ошибка аналитики:', error)
  }
}

/**
 * Пакетная отправка событий
 */
async function flushBatch(): Promise<void> {
  if (eventBuffer.length === 0) return
  
  const eventsToFlush = [...eventBuffer]
  eventBuffer = []
  
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  
  try {
    const supabase = createClient()
    
    const records = eventsToFlush.map(event => ({
      user_id: event.user_id,
      session_id: event.session_id,
      event_type: event.event_type,
      product_type: event.product_type,
      variant_id: event.variant_id,
      properties: event.properties,
      page_url: event.page_url,
      user_agent: event.user_agent,
      device_type: event.device_type,
      created_at: event.timestamp.toISOString()
    }))
    
    const { error } = await supabase
      .from('analytics_events')
      .insert(records)
    
    if (error) {
      console.error('❌ Ошибка пакетной отправки аналитики:', error)
      // Возвращаем события обратно в буфер для повторной попытки
      eventBuffer = [...eventsToFlush, ...eventBuffer]
    } else if (ANALYTICS_CONFIG.debug) {
      console.log(`✅ Пакет из ${eventsToFlush.length} событий отправлен`)
    }
  } catch (error) {
    console.error('❌ Критическая ошибка пакетной отправки:', error)
    eventBuffer = [...eventsToFlush, ...eventBuffer]
  }
}

/**
 * Планирование отложенной отправки
 */
function scheduleFlush(): void {
  if (flushTimer) return
  
  flushTimer = setTimeout(() => {
    flushBatch()
  }, ANALYTICS_CONFIG.flushInterval)
}

/**
 * Специализированные функции отслеживания для каждого типа события
 */

// Показ paywall
export async function trackPaywallShown(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('paywall_shown', userId, {
    ...properties,
    trigger: properties.trigger || 'limit_reached', // token_limit, feature_request, etc.
    price: properties.price,
    currency: properties.currency || 'USD'
  }, { productType, variantId })
}

// Клик на paywall
export async function trackPaywallClicked(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('paywall_clicked', userId, {
    ...properties,
    button_text: properties.button_text || 'Купить сейчас',
    time_to_click: properties.time_to_click, // Время от показа до клика
    price: properties.price
  }, { productType, variantId })
}

// Начало оплаты
export async function trackPaymentInitiated(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('payment_initiated', userId, {
    ...properties,
    payment_method: properties.payment_method || 'stripe',
    amount: properties.amount,
    currency: properties.currency || 'USD',
    payment_intent_id: properties.payment_intent_id
  }, { productType, variantId, immediate: true })
}

// Завершение оплаты
export async function trackPaymentCompleted(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('payment_completed', userId, {
    ...properties,
    amount: properties.amount,
    currency: properties.currency || 'USD',
    payment_intent_id: properties.payment_intent_id,
    transaction_id: properties.transaction_id,
    payment_duration: properties.payment_duration
  }, { productType, variantId, immediate: true })
}

// Ошибка оплаты
export async function trackPaymentFailed(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('payment_failed', userId, {
    ...properties,
    error_code: properties.error_code,
    error_message: properties.error_message,
    payment_intent_id: properties.payment_intent_id,
    failure_reason: properties.failure_reason
  }, { productType, variantId, immediate: true })
}

// Конверсия пользователя
export async function trackUserConverted(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('user_converted', userId, {
    ...properties,
    first_purchase: properties.first_purchase || false,
    total_spent: properties.total_spent,
    conversion_path: properties.conversion_path, // Путь до конверсии
    days_to_convert: properties.days_to_convert
  }, { productType, variantId, immediate: true })
}

/**
 * Получение метрик по продукту
 */
export async function getProductMetrics(
  productType: ProductType,
  timePeriod: '24h' | '7d' | '30d' | 'all' = '7d',
  variantId?: string
): Promise<ProductMetrics | null> {
  try {
    const supabase = createClient()
    
    // Определяем временные рамки
    let dateFilter = ''
    const now = new Date()
    
    switch (timePeriod) {
      case '24h':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        dateFilter = `created_at >= '${yesterday.toISOString()}'`
        break
      case '7d':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = `created_at >= '${weekAgo.toISOString()}'`
        break
      case '30d':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = `created_at >= '${monthAgo.toISOString()}'`
        break
      case 'all':
        dateFilter = '1=1' // Без фильтра
        break
    }
    
    let query = supabase
      .from('analytics_events')
      .select('*')
      .eq('product_type', productType)
    
    if (variantId) {
      query = query.eq('variant_id', variantId)
    }
    
    // Добавляем временной фильтр через raw SQL
    const { data: events, error } = await query
    
    if (error) {
      console.error('❌ Ошибка получения метрик:', error)
      return null
    }
    
    if (!events || events.length === 0) {
      return {
        product_type: productType,
        variant_id: variantId,
        time_period: timePeriod,
        impressions: 0,
        clicks: 0,
        initiations: 0,
        completions: 0,
        click_rate: 0,
        initiation_rate: 0,
        completion_rate: 0,
        overall_conversion: 0,
        total_revenue: 0,
        average_order_value: 0,
        avg_time_to_decision: 0,
        avg_payment_time: 0
      }
    }
    
    // Фильтруем по времени (поскольку raw SQL не сработал)
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.created_at)
      switch (timePeriod) {
        case '24h':
          return eventDate >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
        case '7d':
          return eventDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        case '30d':
          return eventDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        case 'all':
          return true
        default:
          return true
      }
    })
    
    // Считаем метрики
    const impressions = filteredEvents.filter(e => e.event_type === 'paywall_shown').length
    const clicks = filteredEvents.filter(e => e.event_type === 'paywall_clicked').length
    const initiations = filteredEvents.filter(e => e.event_type === 'payment_initiated').length
    const completions = filteredEvents.filter(e => e.event_type === 'payment_completed').length
    
    const totalRevenue = filteredEvents
      .filter(e => e.event_type === 'payment_completed')
      .reduce((sum, e) => sum + (e.properties?.amount || 0), 0)
    
    return {
      product_type: productType,
      variant_id: variantId,
      time_period: timePeriod,
      impressions,
      clicks,
      initiations,
      completions,
      click_rate: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      initiation_rate: clicks > 0 ? Number(((initiations / clicks) * 100).toFixed(2)) : 0,
      completion_rate: initiations > 0 ? Number(((completions / initiations) * 100).toFixed(2)) : 0,
      overall_conversion: impressions > 0 ? Number(((completions / impressions) * 100).toFixed(2)) : 0,
      total_revenue: Number(totalRevenue.toFixed(2)),
      average_order_value: completions > 0 ? Number((totalRevenue / completions).toFixed(2)) : 0,
      avg_time_to_decision: 0, // TODO: рассчитать из timestamps
      avg_payment_time: 0 // TODO: рассчитать из timestamps
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка получения метрик:', error)
    return null
  }
}

/**
 * Принудительная отправка всех накопленных событий
 */  
export async function flushAllEvents(): Promise<void> {
  await flushBatch()
}

/**
 * Получение общего дашборда метрик
 */
export async function getDashboardMetrics(): Promise<{
  products: Record<ProductType, ProductMetrics>
  totals: {
    total_users: number
    total_revenue: number
    overall_conversion: number
    top_variant: { product: ProductType; variant: string; conversion: number } | null
  }
}> {
  const productTypes: ProductType[] = ['token_limit', 'mascot', 'premium_subscription']
  
  const products: Record<ProductType, ProductMetrics> = {} as any
  let totalRevenue = 0
  let totalConversions = 0
  let totalImpressions = 0
  
  for (const productType of productTypes) {
    const metrics = await getProductMetrics(productType, '7d')
    if (metrics) {
      products[productType] = metrics
      totalRevenue += metrics.total_revenue
      totalConversions += metrics.completions
      totalImpressions += metrics.impressions
    }
  }
  
  return {
    products,
    totals: {
      total_users: 0, // TODO: подсчитать уникальных пользователей
      total_revenue: Number(totalRevenue.toFixed(2)),
      overall_conversion: totalImpressions > 0 ? Number(((totalConversions / totalImpressions) * 100).toFixed(2)) : 0,
      top_variant: null // TODO: найти лучший вариант A/B теста
    }
  }
}

// Экспорт типов
export type { AnalyticsEvent, ProductMetrics, UserMetrics } 