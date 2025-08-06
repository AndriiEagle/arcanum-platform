import Stripe from 'stripe'

// Безопасная инициализация Stripe с проверкой ключа
let stripe: Stripe | null = null

try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
      typescript: true
    })
  }
} catch (error) {
  console.warn('⚠️ Stripe не инициализирован: отсутствует STRIPE_SECRET_KEY')
}

// Интерфейсы для типизации
interface CreatePaymentIntentParams {
  amount: number // В долларах (будет конвертировано в центы)
  productType: string
  userId: string
  description?: string
}

interface PaymentResult {
  client_secret: string
  payment_intent_id: string
  amount: number
  currency: string
}

/**
 * Создает Payment Intent для токенов, маскотов или премиум функций
 * @param params Параметры платежа
 * @returns client_secret для завершения платежа на клиенте
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentResult> {
  try {
    // Проверка инициализации Stripe
    if (!stripe) {
      throw new Error('Stripe не инициализирован. Проверьте STRIPE_SECRET_KEY.')
    }
    
    // Валидация параметров
    if (!params.amount || params.amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }
    
    if (!params.userId) {
      throw new Error('User ID is required')
    }
    
    if (!params.productType) {
      throw new Error('Product type is required')
    }
    
    // Определяем описание на основе типа продукта
    const descriptions: Record<string, string> = {
      'token_limit': `Дополнительные токены для AI запросов`,
      'mascot': 'Генерация персонального маскота',
      'premium_model': 'Доступ к премиум AI моделям',
      'premium_subscription': 'Премиум подписка Arcanum Platform'
    }
    
    const description = params.description || descriptions[params.productType] || 'Покупка в Arcanum Platform'
    
    // Создание Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Конвертируем в центы
      currency: 'usd',
      description: description,
      metadata: {
        user_id: params.userId,
        product_type: params.productType,
        platform: 'arcanum',
        created_at: new Date().toISOString()
      },
      // Автоматическое подтверждение для упрощения процесса
      confirmation_method: 'automatic',
      // Методы платежа
      payment_method_types: ['card'],
      // Настройки для лучшего UX
      setup_future_usage: 'off_session' // Для будущих платежей без повторного ввода карты
    })
    
    console.log(`💳 Payment Intent создан: ${paymentIntent.id} для пользователя ${params.userId}`)
    
    return {
      client_secret: paymentIntent.client_secret!,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка создания Payment Intent:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message}`)
    }
    
    throw new Error(`Payment creation failed: ${error.message || error}`)
  }
}

/**
 * Подтверждает успешный платеж и возвращает детали
 * @param paymentIntentId ID платежного намерения для проверки
 * @returns Детали успешного платежа
 */
export async function confirmPayment(paymentIntentId: string): Promise<{
  status: string
  amount: number
  currency: string
  metadata: Stripe.MetadataParam
}> {
  try {
    if (!stripe) {
      throw new Error('Stripe не инициализирован. Проверьте STRIPE_SECRET_KEY.')
    }
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status === 'succeeded') {
      console.log(`✅ Платеж подтвержден: ${paymentIntentId}`)
      
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      }
    } else {
      throw new Error(`Payment not completed. Status: ${paymentIntent.status}`)
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка подтверждения платежа:', error)
    throw new Error(`Payment confirmation failed: ${error.message || error}`)
  }
}

/**
 * Получает список всех платежей пользователя для аналитики
 * @param userId ID пользователя
 * @param limit Количество платежей для получения
 * @returns Список платежей пользователя
 */
export async function getUserPayments(userId: string, limit: number = 10): Promise<Stripe.PaymentIntent[]> {
  try {
    if (!stripe) {
      throw new Error('Stripe не инициализирован. Проверьте STRIPE_SECRET_KEY.')
    }
    
    const paymentIntents = await stripe.paymentIntents.list({
      limit: limit,
      // Фильтруем по метаданным пользователя
      expand: ['data.payment_method']
    })
    
    // Фильтруем по user_id в метаданных
    const userPayments = paymentIntents.data.filter(
      payment => payment.metadata.user_id === userId
    )
    
    console.log(`📊 Найдено ${userPayments.length} платежей для пользователя ${userId}`)
    
    return userPayments
    
  } catch (error: any) {
    console.error('❌ Ошибка получения платежей пользователя:', error)
    throw new Error(`Failed to get user payments: ${error.message || error}`)
  }
}

/**
 * Создает возврат для платежа
 * @param paymentIntentId ID платежа для возврата
 * @param amount Сумма возврата (опционально, по умолчанию полный возврат)
 * @param reason Причина возврата
 * @returns Детали возврата
 */
export async function createRefund(
  paymentIntentId: string, 
  amount?: number, 
  reason?: string
): Promise<Stripe.Refund> {
  try {
    if (!stripe) {
      throw new Error('Stripe не инициализирован. Проверьте STRIPE_SECRET_KEY.')
    }
    
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount, // Если не указано, будет полный возврат
      reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
      metadata: {
        refund_date: new Date().toISOString(),
        platform: 'arcanum'
      }
    })
    
    console.log(`💰 Возврат создан: ${refund.id} для платежа ${paymentIntentId}`)
    
    return refund
    
  } catch (error: any) {
    console.error('❌ Ошибка создания возврата:', error)
    throw new Error(`Refund creation failed: ${error.message || error}`)
  }
}

/**
 * Проверяет статус Stripe API и доступность сервиса
 * @returns Статус подключения к Stripe
 */
export async function checkStripeHealth(): Promise<{
  isHealthy: boolean
  accountId?: string
  error?: string
}> {
  try {
    if (!stripe) {
      return {
        isHealthy: false,
        error: 'Stripe не инициализирован. Проверьте STRIPE_SECRET_KEY.'
      }
    }
    
    const account = await stripe.accounts.retrieve()
    
    return {
      isHealthy: true,
      accountId: account.id
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка проверки Stripe:', error)
    
    return {
      isHealthy: false,
      error: error.message || 'Unknown Stripe error'
    }
  }
}

// Константы для предопределенных цен
export const PRODUCT_PRICES = {
  TOKEN_PACKAGE_SMALL: 2.00,    // 2000 токенов
  TOKEN_PACKAGE_MEDIUM: 5.00,   // 5000 токенов  
  TOKEN_PACKAGE_LARGE: 10.00,   // 12000 токенов
  MASCOT_GENERATION: 1.00,      // Генерация 1 маскота
  PREMIUM_MODEL_ACCESS: 0.50,   // Доступ к премиум модели на 1 час
  PREMIUM_SUBSCRIPTION: 9.99    // Месячная подписка
} as const

// Экспорт типов для использования в других файлах
export type { CreatePaymentIntentParams, PaymentResult } 