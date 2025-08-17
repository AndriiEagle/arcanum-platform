import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const VALID_PRODUCT_TYPES = ['token_limit', 'mascot', 'premium_model', 'premium_subscription'] as const

type ProductType = typeof VALID_PRODUCT_TYPES[number]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { product_type, amount, user_id, variant_id, description } = body as {
      product_type: ProductType
      amount?: number
      user_id?: string
      variant_id?: string
      description?: string
    }

    if (!product_type || !VALID_PRODUCT_TYPES.includes(product_type)) {
      return NextResponse.json({ success: false, error: 'Invalid product_type' }, { status: 400 })
    }
    if (!user_id || user_id === 'anonymous') {
      return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // If Stripe is not configured, return demo response to keep dev UX working
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('🔧 DEMO MODE: create-checkout-session without STRIPE_SECRET_KEY')
      return NextResponse.json({ success: true, sessionId: 'cs_demo_' + Date.now() })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { typescript: true })

    // Subscription must use predefined price
    if (product_type === 'premium_subscription') {
      const priceId = process.env.STRIPE_PRICE_PREMIUM_SUBSCRIPTION
      if (!priceId) {
        return NextResponse.json({ success: false, error: 'Price ID not configured' }, { status: 500 })
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/?checkout=cancel`,
        metadata: { user_id, product_type, variant_id: variant_id || '', description: description || '' }
      })

      return NextResponse.json({ success: true, sessionId: session.id })
    }

    // One-time payments — whitelist validation
    const whitelistAmountsUSD: Record<ProductType, number[]> = {
      token_limit: [1.5, 1.99, 2.0, 2.4],
      mascot: [0.5, 1.0, 1.5],
      premium_model: [0.5, 1.0],
      premium_subscription: []
    }
    const finalAmount = typeof amount === 'number' ? Number(amount.toFixed(2)) : undefined
    if (!variant_id && (finalAmount === undefined || !whitelistAmountsUSD[product_type].includes(finalAmount))) {
      return NextResponse.json({ success: false, error: 'Price not allowed' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Arcanum: ${product_type}` },
            unit_amount: Math.round((finalAmount as number) * 100)
          },
          quantity: 1
        }
      ],
      success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancel` ,
      metadata: { user_id, product_type, variant_id: variant_id || '', description: description || '' }
    })

    return NextResponse.json({ success: true, sessionId: session.id })
  } catch (error: any) {
    console.error('❌ create-checkout-session error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
} 