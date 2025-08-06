import { NextRequest, NextResponse } from 'next/server'
import { createPaymentIntent, PRODUCT_PRICES } from '../../../../../lib/services/paymentService'

interface PaymentRequestBody {
  amount?: number
  product_type: string
  user_id: string
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequestBody = await request.json()
    
    // Валидация обязательных полей
    if (!body.product_type || !body.user_id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Отсутствуют обязательные поля: product_type, user_id' 
        },
        { status: 400 }
      )
    }

    // Определяем сумму на основе типа продукта если не указана
    let amount = body.amount
    if (!amount) {
      switch (body.product_type) {
        case 'token_limit':
          amount = PRODUCT_PRICES.TOKEN_PACKAGE_SMALL
          break
        case 'mascot':
          amount = PRODUCT_PRICES.MASCOT_GENERATION
          break
        case 'premium_model':
          amount = PRODUCT_PRICES.PREMIUM_MODEL_ACCESS
          break
        case 'premium_subscription':
          amount = PRODUCT_PRICES.PREMIUM_SUBSCRIPTION
          break
        default:
          amount = 1.00 // Дефолтная цена
      }
    }

    console.log(`💳 API: Создание платежа ${body.product_type} за $${amount} для пользователя ${body.user_id}`)

    // Создаем Payment Intent через наш сервис
    const paymentResult = await createPaymentIntent({
      amount: amount,
      productType: body.product_type,
      userId: body.user_id,
      description: body.description
    })

    // Логируем успешное создание
    console.log(`✅ API: Payment Intent создан успешно: ${paymentResult.payment_intent_id}`)

    return NextResponse.json({
      success: true,
      client_secret: paymentResult.client_secret,
      payment_intent_id: paymentResult.payment_intent_id,
      amount: paymentResult.amount,
      currency: paymentResult.currency
    })

  } catch (error: any) {
    console.error('❌ API Error при создании платежа:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Ошибка создания платежного намерения'
      },
      { status: 500 }
    )
  }
}

// Опционально: GET endpoint для получения информации о ценах
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      prices: PRODUCT_PRICES,
      currency: 'USD'
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка получения цен'
      },
      { status: 500 }
    )
  }
} 