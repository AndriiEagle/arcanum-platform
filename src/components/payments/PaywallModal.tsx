'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'

// Типы для различных продуктов
type ProductType = 'token_limit' | 'mascot' | 'premium_model' | 'premium_subscription'

interface PaywallModalProps {
  isOpen: boolean
  type: ProductType
  cost: number
  onClose: () => void
  onSuccess?: (paymentIntentId: string) => void
  onPurchase?: (payload: { sessionId: string; productType: ProductType; amount: number; userId: string; description?: string }) => void
  userId?: string
  description?: string
}

interface PaymentState {
  isLoading: boolean
  error: string | null
  success: boolean
  paymentIntentId: string | null
}

// Конфигурация продуктов
const PRODUCT_CONFIG = {
  token_limit: { icon: '💰', title: 'Дополнительные токены', description: 'Разблокируйте 2000 дополнительных токенов для AI запросов', benefits: ['2000 токенов', 'Безлимитные запросы', 'Приоритетная обработка'] },
  mascot: { icon: '🎨', title: 'Генерация маскота', description: 'Создайте уникального персонального маскота с помощью AI', benefits: ['Уникальный дизайн', 'Высокое качество', 'Моментальная генерация'] },
  premium_model: { icon: '🧠', title: 'Премиум модель', description: 'Доступ к самым мощным AI моделям на 1 час', benefits: ['GPT-4o доступ', 'O1-preview модель', 'Повышенная точность'] },
  premium_subscription: { icon: '👑', title: 'Премиум подписка', description: 'Безлимитный доступ ко всем функциям платформы', benefits: ['Все модели', 'Безлимитные токены', 'Приоритетная поддержка'] }
} as const

export default function PaywallModal({ isOpen, type, cost, onClose, onSuccess, onPurchase, userId = 'anonymous-user', description }: PaywallModalProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>({ isLoading: false, error: null, success: false, paymentIntentId: null })
  const [stripe, setStripe] = useState<any>(null)

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripeInstance = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        setStripe(stripeInstance)
      } catch (error) {
        setPaymentState(prev => ({ ...prev, error: 'Не удалось загрузить платежную систему' }))
      }
    }
    if (isOpen) initializeStripe()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) setPaymentState({ isLoading: false, error: null, success: false, paymentIntentId: null })
  }, [isOpen])

  const handlePurchase = async () => {
    if (!stripe) {
      setPaymentState(prev => ({ ...prev, error: 'Платежная система не готова' }))
      return
    }

    if (!userId || userId === 'anonymous-user' || userId === 'anonymous') {
      setPaymentState(prev => ({ ...prev, error: 'Войдите в аккаунт, чтобы совершить покупку' }))
      return
    }

    setPaymentState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Checkout Sessions
      const sessionRes = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: type, amount: cost, user_id: userId, description: description || PRODUCT_CONFIG[type].description })
      })
      const sessionJson = await sessionRes.json()
      if (!sessionRes.ok || !sessionJson.success) {
        throw new Error(sessionJson.error || 'Не удалось создать Checkout Session')
      }

      // Логируем покупку (до редиректа)
      if (typeof onPurchase === 'function' && sessionJson.sessionId) {
        try {
          onPurchase({
            sessionId: sessionJson.sessionId,
            productType: type,
            amount: cost,
            userId: userId,
            description: description || PRODUCT_CONFIG[type].description
          })
        } catch {}
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: sessionJson.sessionId })
      if (stripeError && sessionJson.sessionId) {
        window.location.href = `https://checkout.stripe.com/c/pay/${sessionJson.sessionId}`
      }
    } catch (error: any) {
      setPaymentState({ isLoading: false, error: (error && error.message) ? error.message : 'Не удалось обработать платеж', success: false, paymentIntentId: null })
    }
  }

  const handleClose = () => { if (!paymentState.isLoading) onClose() }

  const config = PRODUCT_CONFIG[type]
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white text-center">
          <div className="text-4xl mb-2">{config.icon}</div>
          <h3 className="text-xl font-bold mb-1">{config.title}</h3>
          <p className="text-purple-100 text-sm">{config.description}</p>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">${cost}</div>
            {type === 'premium_subscription' && (<div className="text-sm text-gray-500">в месяц</div>)}
          </div>

          {paymentState.error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-500 text-xl mr-3">❌</div>
                <div className="text-sm text-red-600 dark:text-red-300">{paymentState.error}</div>
              </div>
              {(userId === 'anonymous' || userId === 'anonymous-user') && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Войдите через меню справа сверху, затем повторите оплату.</span>
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Что вы получите:</h4>
            <ul className="space-y-2">
              {config.benefits.map((b, i) => (
                <li key={i} className="flex items-center text-sm text-gray-700 dark:text-gray-300"><div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>{b}</li>
              ))}
            </ul>
          </div>

          <div className="flex space-x-3">
            <button onClick={handlePurchase} disabled={paymentState.isLoading || !stripe} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center">
              {paymentState.isLoading ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Обработка...</>) : (<>🔒 Купить сейчас</>)}
            </button>
            <button onClick={handleClose} disabled={paymentState.isLoading} className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 transition-all duration-200">Позже</button>
          </div>
        </div>
      </div>
    </div>
  )
} 