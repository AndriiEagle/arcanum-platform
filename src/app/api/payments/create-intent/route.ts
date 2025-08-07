import { NextRequest, NextResponse } from 'next/server'
import { createPaymentIntent, PRODUCT_PRICES } from '../../../../../lib/services/paymentService'

// Валидация типов продуктов
const VALID_PRODUCT_TYPES = [
  'token_limit',
  'mascot', 
  'premium_model',
  'premium_subscription'
] as const

type ProductType = typeof VALID_PRODUCT_TYPES[number]

interface CreateIntentRequest {
  amount: number
  product_type: ProductType
  user_id: string
  description?: string
}

/**
 * POST /api/payments/create-intent
 * Создает Payment Intent для различных типов продуктов
 */
export async function POST(request: NextRequest) {
  try {
    // Парсинг и валидация JSON
    let requestData: CreateIntentRequest
    try {
      requestData = await request.json()
    } catch (error) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid JSON format',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      )
    }

    const { amount, product_type, user_id, description } = requestData

    // Базовая валидация параметров
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Amount must be a positive number',
          code: 'INVALID_AMOUNT'
        },
        { status: 400 }
      )
    }

    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
      return NextResponse.json(
        { 
          success: false,
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      )
    }

    if (!product_type || !VALID_PRODUCT_TYPES.includes(product_type)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Product type must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`,
          code: 'INVALID_PRODUCT_TYPE',
          valid_types: VALID_PRODUCT_TYPES
        },
        { status: 400 }
      )
    }

    // Валидация цен против предопределенных значений
    const expectedPrice = getExpectedPrice(product_type)
    if (expectedPrice && Math.abs(amount - expectedPrice) > 0.01) {
      return NextResponse.json(
        { 
          success: false,
          error: `Invalid amount for ${product_type}. Expected: $${expectedPrice}`,
          code: 'PRICE_MISMATCH',
          expected_amount: expectedPrice,
          received_amount: amount
        },
        { status: 400 }
      )
    }

    // Создание Payment Intent через сервис
    console.log(`💳 API: Создание Payment Intent для ${user_id}, продукт: ${product_type}, сумма: $${amount}`)
    
    const result = await createPaymentIntent({
      amount: amount,
      productType: product_type,
      userId: user_id,
      description: description
    })

    // Логирование успешного создания
    console.log(`✅ API: Payment Intent создан: ${result.payment_intent_id}`)

    // Возврат успешного результата
    return NextResponse.json({
      success: true,
      client_secret: result.client_secret,
      payment_intent_id: result.payment_intent_id,
      amount: result.amount,
      currency: result.currency,
      product_type: product_type,
      user_id: user_id,
      created_at: new Date().toISOString()
    })

  } catch (error) {
    // Детальное логирование ошибок
    console.error('❌ API Payment Intent Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    // Различные типы ошибок
    if (error.message.includes('Stripe error:')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Payment service temporarily unavailable',
          code: 'STRIPE_ERROR',
          details: error.message
        },
        { status: 502 }
      )
    }

    if (error.message.includes('Amount must be greater than 0')) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Общая ошибка сервера
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: 'Payment processing failed. Please try again.'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/payments/create-intent
 * Возвращает информацию о доступных продуктах и ценах
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Payment Intent API',
      version: '1.0.0',
      available_products: VALID_PRODUCT_TYPES,
      prices: {
        token_limit: PRODUCT_PRICES.TOKEN_PACKAGE_SMALL,
        mascot: PRODUCT_PRICES.MASCOT_GENERATION,
        premium_model: PRODUCT_PRICES.PREMIUM_MODEL_ACCESS,
        premium_subscription: PRODUCT_PRICES.PREMIUM_SUBSCRIPTION
      },
      currency: 'usd',
      endpoint: '/api/payments/create-intent',
      methods: ['POST', 'GET'],
      required_fields: ['amount', 'product_type', 'user_id'],
      optional_fields: ['description']
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get payment info',
        code: 'INFO_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * Получает ожидаемую цену для типа продукта
 */
function getExpectedPrice(productType: ProductType): number | null {
  const priceMap: Record<ProductType, number> = {
    'token_limit': PRODUCT_PRICES.TOKEN_PACKAGE_SMALL,
    'mascot': PRODUCT_PRICES.MASCOT_GENERATION,
    'premium_model': PRODUCT_PRICES.PREMIUM_MODEL_ACCESS,
    'premium_subscription': PRODUCT_PRICES.PREMIUM_SUBSCRIPTION
  }
  
  return priceMap[productType] || null
} 