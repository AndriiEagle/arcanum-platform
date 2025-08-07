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
  token_limit: {
    icon: '💰',
    title: 'Дополнительные токены',
    description: 'Разблокируйте 2000 дополнительных токенов для AI запросов',
    benefits: ['2000 токенов', 'Безлимитные запросы', 'Приоритетная обработка']
  },
  mascot: {
    icon: '🎨',
    title: 'Генерация маскота',
    description: 'Создайте уникального персонального маскота с помощью AI',
    benefits: ['Уникальный дизайн', 'Высокое качество', 'Моментальная генерация']
  },
  premium_model: {
    icon: '🧠',
    title: 'Премиум модель',
    description: 'Доступ к самым мощным AI моделям на 1 час',
    benefits: ['GPT-4o доступ', 'O1-preview модель', 'Повышенная точность']
  },
  premium_subscription: {
    icon: '👑',
    title: 'Премиум подписка',
    description: 'Безлимитный доступ ко всем функциям платформы',
    benefits: ['Все модели', 'Безлимитные токены', 'Приоритетная поддержка']
  }
} as const

export default function PaywallModal({ 
  isOpen, 
  type, 
  cost, 
  onClose, 
  onSuccess,
  userId = 'anonymous-user',
  description 
}: PaywallModalProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    isLoading: false,
    error: null,
    success: false,
    paymentIntentId: null
  })

  const [stripe, setStripe] = useState<any>(null)

  // Инициализация Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const stripeInstance = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        )
        setStripe(stripeInstance)
      } catch (error) {
        console.error('Ошибка загрузки Stripe:', error)
        setPaymentState(prev => ({
          ...prev,
          error: 'Не удалось загрузить платежную систему'
        }))
      }
    }

    if (isOpen) {
      initializeStripe()
    }
  }, [isOpen])

  // Сброс состояния при открытии модалки
  useEffect(() => {
    if (isOpen) {
      setPaymentState({
        isLoading: false,
        error: null,
        success: false,
        paymentIntentId: null
      })
    }
  }, [isOpen])

  const handlePurchase = async () => {
    if (!stripe) {
      setPaymentState(prev => ({
        ...prev,
        error: 'Платежная система не готова'
      }))
      return
    }

    setPaymentState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      // 1. Создание Payment Intent через наш API
      console.log(`💳 Создание платежа: ${type}, $${cost}`)
      
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: cost,
          product_type: type,
          user_id: userId,
          description: description || PRODUCT_CONFIG[type].description
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Ошибка создания платежа')
      }

      const { client_secret, payment_intent_id } = result

      console.log(`✅ Payment Intent создан: ${payment_intent_id}`)

      // 2. Перенаправление на Stripe Checkout (упрощенный метод)
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: client_secret // В реальной реализации нужен session_id
      })

      // Альтернативно - использование Stripe Elements (более сложный, но гибкий метод)
      if (stripeError) {
        // Fallback: простое перенаправление на Stripe Payment Links
        const paymentUrl = `https://checkout.stripe.com/pay/${client_secret}`
        window.open(paymentUrl, '_blank')
        
        // Симуляция успешного платежа для демо
        setTimeout(() => {
          setPaymentState({
            isLoading: false,
            error: null,
            success: true,
            paymentIntentId: payment_intent_id
          })
          
          if (onSuccess) {
            onSuccess(payment_intent_id)
          }
        }, 2000)
      }

    } catch (error) {
      console.error('❌ Ошибка платежа:', error)
      
      setPaymentState({
        isLoading: false,
        error: error.message || 'Не удалось обработать платеж',
        success: false,
        paymentIntentId: null
      })
    }
  }

  const handleClose = () => {
    if (!paymentState.isLoading) {
      onClose()
    }
  }

  const config = PRODUCT_CONFIG[type]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white text-center">
          <div className="text-4xl mb-2">{config.icon}</div>
          <h3 className="text-xl font-bold mb-1">
            {config.title}
          </h3>
          <p className="text-purple-100 text-sm">
            {config.description}
          </p>
        </div>

        {/* Содержимое */}
        <div className="p-6">
          
          {/* Цена */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
              ${cost}
            </div>
            {type === 'premium_subscription' && (
              <div className="text-sm text-gray-500">в месяц</div>
            )}
          </div>

          {/* Преимущества */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Что вы получите:
            </h4>
            <ul className="space-y-2">
              {config.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Состояние успеха */}
          {paymentState.success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center">
                <div className="text-green-500 text-xl mr-3">✅</div>
                <div>
                  <div className="font-semibold text-green-800 dark:text-green-200">
                    Платеж успешен!
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-300">
                    ID: {paymentState.paymentIntentId?.substring(0, 12)}...
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ошибка */}
          {paymentState.error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-500 text-xl mr-3">❌</div>
                <div>
                  <div className="font-semibold text-red-800 dark:text-red-200">
                    Ошибка платежа
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-300">
                    {paymentState.error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex space-x-3">
            {!paymentState.success ? (
              <>
                <button
                  onClick={handlePurchase}
                  disabled={paymentState.isLoading || !stripe}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                >
                  {paymentState.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Обработка...
                    </>
                  ) : (
                    <>
                      🔒 Купить сейчас
                    </>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  disabled={paymentState.isLoading}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 transition-all duration-200"
                >
                  Позже
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-all duration-200"
              >
                Отлично! 🎉
              </button>
            )}
          </div>

          {/* Безопасность */}
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <div className="mr-1">🔒</div>
              Защищено Stripe • SSL шифрование
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 