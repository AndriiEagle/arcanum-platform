// Сервис аналитики для отслеживания всех paywall метрик
// Интегрируется с A/B тестированием для максимизации конверсии

import { createClient } from '../supabase/client'

export type AnalyticsEventType = 
  | 'paywall_shown' 
  | 'paywall_clicked' 
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'user_converted'
  | 'session_started'
  | 'feature_used'

export type ProductType = 'token_limit' | 'mascot' | 'premium_subscription'

export interface AnalyticsEvent {
  id?: string
  user_id: string
  session_id?: string
  event_type: AnalyticsEventType
  product_type?: ProductType
  variant_id?: string
  properties: Record<string, any>
  timestamp: Date
  page_url?: string
  user_agent?: string
  device_type?: 'desktop' | 'mobile' | 'tablet'
}

const ANALYTICS_CONFIG = {
  enabledEvents: [
    'paywall_shown',
    'paywall_clicked', 
    'payment_initiated',
    'payment_completed',
    'payment_failed',
    'user_converted'
  ],
  batchSize: 10,
  flushInterval: 5000,
  sessionTimeout: 30 * 60 * 1000,
  debug: process.env.NODE_ENV === 'development'
}

let eventBuffer: AnalyticsEvent[] = []
let flushTimer: NodeJS.Timeout | null = null

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function detectDeviceType(userAgent?: string): 'desktop' | 'mobile' | 'tablet' {
  if (!userAgent) return 'desktop'
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile')) return 'mobile'
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet'
  return 'desktop'
}

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
      eventBuffer = [...eventsToFlush, ...eventBuffer]
    } else if (ANALYTICS_CONFIG.debug) {
      console.log(`✅ Пакет из ${eventsToFlush.length} событий отправлен`)
    }
  } catch (error) {
    console.error('❌ Критическая ошибка пакетной отправки:', error)
    eventBuffer = [...eventsToFlush, ...eventBuffer]
  }
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushBatch()
  }, ANALYTICS_CONFIG.flushInterval)
}

export async function trackPaywallShown(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('paywall_shown', userId, {
    ...properties,
    trigger: properties.trigger || 'limit_reached',
    price: properties.price,
    currency: properties.currency || 'USD'
  }, { productType, variantId })
}

export async function trackPaywallClicked(
  userId: string,
  productType: ProductType,
  variantId?: string,
  properties: Record<string, any> = {}
): Promise<void> {
  await trackEvent('paywall_clicked', userId, {
    ...properties,
    button_text: properties.button_text || 'Купить сейчас',
    time_to_click: properties.time_to_click,
    price: properties.price
  }, { productType, variantId })
}

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
    conversion_path: properties.conversion_path,
    days_to_convert: properties.days_to_convert
  }, { productType, variantId, immediate: true })
} 