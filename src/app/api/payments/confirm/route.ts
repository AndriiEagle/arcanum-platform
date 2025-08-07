import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json().catch(() => ({}))
    if (!session_id) {
      return NextResponse.json({ success: false, error: 'session_id required' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      // Dev mode: no Stripe configured
      console.log('🔧 DEMO MODE: /payments/confirm without STRIPE_SECRET_KEY')
      return NextResponse.json({ success: true, demo_mode: true, payment_intent_id: 'pi_demo', amount_total: 0, currency: 'usd' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { typescript: true })
    const session = await stripe.checkout.sessions.retrieve(session_id)

    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

    if (session.payment_status === 'paid' || session.status === 'complete') {
      return NextResponse.json({ 
        success: true, 
        status: session.payment_status || session.status,
        payment_intent_id: paymentIntentId || null,
        amount_total: session.amount_total || null,
        currency: session.currency || 'usd'
      })
    }

    return NextResponse.json({ 
      success: false, 
      status: session.payment_status || session.status,
      payment_intent_id: paymentIntentId || null,
      amount_total: session.amount_total || null,
      currency: session.currency || 'usd'
    }, { status: 409 })
  } catch (error: any) {
    console.error('❌ payments/confirm error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
} 