// Оптимизированная версия PaywallModal для максимальной производительности
// Фокус на скорости загрузки и плавности анимаций для повышения конверсии

import React, { memo, useState, useCallback, useMemo, useRef, useEffect, Suspense } from 'react'
import { 
  useDebounce, 
  useLazyLoad, 
  usePerformanceMonitor,
  usePrefetch,
  useCachedComputation,
  useBatchedState
} from '../../lib/hooks/usePerformanceOptimization'

// Ленивая загрузка тяжелых компонентов
const LazyStripeElements = React.lazy(() => 
  import('../payments/StripeElements').catch(() => ({ 
    default: () => <div>Stripe недоступен</div> 
  }))
)

// Оптимизированные типы
interface OptimizedPaywallModalProps {
  isOpen: boolean
  type: 'token_limit' | 'mascot' | 'premium_subscription'
  cost: number
  onClose: () => void
  onPaymentSuccess?: (paymentIntent: any) => void
  variant?: string
  userId?: string
  className?: string
}

interface PaymentState {
  step: 'selection' | 'payment' | 'processing' | 'success' | 'error'
  isLoading: boolean
  error: string | null
  paymentIntent: any
}

// Мемоизированные конфигурации продуктов
const PRODUCT_CONFIGS = {
  token_limit: {
    title: 'Дополнительные токены',
    description: 'Разблокируйте 2000 дополнительных токенов для ИИ',
    icon: '🔥',
    benefits: ['2000 токенов', 'Доступ ко всем моделям', 'Приоритетная поддержка'],
    urgency: 'Лимит скоро закончится!'
  },
  mascot: {
    title: 'Персональный маскот',
    description: 'ИИ создаст уникального маскота именно для вас',
    icon: '🎨',
    benefits: ['Уникальный дизайн', 'HD качество', 'Коммерческое использование'],
    urgency: 'Только сегодня специальная цена!'
  },
  premium_subscription: {
    title: 'Премиум подписка',
    description: 'Безлимитный доступ ко всем возможностям платформы',
    icon: '👑',
    benefits: ['Безлимитные токены', 'Премиум модели', 'VIP поддержка', 'Ранний доступ'],
    urgency: 'Присоединяйтесь к элите пользователей!'
  }
} as const

// Мемоизированная кнопка закрытия
const CloseButton = memo<{ onClose: () => void }>(({ onClose }) => (
  <button
    onClick={onClose}
    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 z-10"
    aria-label="Закрыть modal"
  >
    <span className="text-gray-600 text-lg">×</span>
  </button>
))
CloseButton.displayName = 'CloseButton'

// Мемоизированный индикатор загрузки
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center space-x-2">
    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    <span>Обработка платежа...</span>
  </div>
))
LoadingSpinner.displayName = 'LoadingSpinner'

// Мемоизированный список преимуществ
const BenefitsList = memo<{ benefits: string[] }>(({ benefits }) => (
  <ul className="space-y-2 mb-6">
    {benefits.map((benefit, index) => (
      <li key={index} className="flex items-center space-x-2">
        <span className="text-green-500 text-sm">✓</span>
        <span className="text-sm text-gray-700">{benefit}</span>
      </li>
    ))}
  </ul>
))
BenefitsList.displayName = 'BenefitsList'

// Основной оптимизированный компонент
const OptimizedPaywallModal: React.FC<OptimizedPaywallModalProps> = memo(({
  isOpen,
  type,
  cost,
  onClose,
  onPaymentSuccess = () => {},
  variant = 'control',
  userId = '',
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  
  // Мониторинг производительности
  const performanceStats = usePerformanceMonitor('OptimizedPaywallModal')
  
  // Оптимизированное состояние с батчингом
  const [paymentState, setPaymentState] = useBatchedState<PaymentState>({
    step: 'selection',
    isLoading: false,
    error: null,
    paymentIntent: null
  })
  
  // Дебаунсированная цена для предотвращения лишних обновлений
  const debouncedCost = useDebounce(cost, 300)
  
  // Кэшированная конфигурация продукта
  const productConfig = useCachedComputation(
    (productType: typeof type) => PRODUCT_CONFIGS[productType],
    [type],
    60000 // 1 минута TTL
  )
  
  // Предзагрузка ресурсов оплаты
  const paymentUrls = useMemo(() => [
    '/api/payments/create-intent',
    '/api/payments/stripe-public-key'
  ], [])
  
  usePrefetch(paymentUrls, isOpen)
  
  // Ленивая загрузка Stripe Elements
  const { 
    component: StripeElements, 
    isLoading: isStripeLoading 
  } = useLazyLoad(
    () => import('../payments/StripeElements'),
    [paymentState.step === 'payment']
  )
  
  // Мемоизированный стиль modal backdrop
  const backdropStyle = useMemo(() => ({
    display: isOpen ? 'flex' : 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.3s ease-in-out'
  }), [isOpen])
  
  // Мемоизированный стиль modal content
  const modalStyle = useMemo(() => ({
    transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
    opacity: isOpen ? 1 : 0,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }), [isOpen])
  
  // Троттлированный обработчик покупки
  const handlePurchase = useCallback(async () => {
    if (paymentState.isLoading) return
    
    console.log('💳 Начало покупки', {
      type,
      cost: debouncedCost,
      variant,
      userId,
      timestamp: new Date().toISOString()
    })
    
    setPaymentState(prev => ({ 
      ...prev, 
      step: 'payment',
      isLoading: true,
      error: null 
    }))
    
    try {
      // Симуляция создания payment intent
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockPaymentIntent = {
        id: `pi_${type}_${Date.now()}`,
        amount: debouncedCost * 100, // В центах
        currency: 'usd',
        client_secret: `pi_${type}_secret_${Date.now()}`
      }
      
      setPaymentState(prev => ({
        ...prev,
        step: 'processing',
        paymentIntent: mockPaymentIntent,
        isLoading: false
      }))
      
      // Симуляция обработки платежа
      setTimeout(() => {
        setPaymentState(prev => ({ 
          ...prev, 
          step: 'success', 
          isLoading: false 
        }))
        
        console.log('✅ Платеж успешен', mockPaymentIntent)
        
        // Вызываем callback через 2 секунды
        setTimeout(() => {
          onPaymentSuccess(mockPaymentIntent)
          onClose()
        }, 2000)
      }, 2000)
      
    } catch (error) {
      console.error('❌ Ошибка платежа:', error)
      setPaymentState(prev => ({
        ...prev,
        step: 'error',
        isLoading: false,
        error: 'Ошибка обработки платежа. Попробуйте еще раз.'
      }))
    }
  }, [type, debouncedCost, variant, userId, paymentState.isLoading, setPaymentState, onPaymentSuccess, onClose])
  
  // Обработчик закрытия с аналитикой
  const handleClose = useCallback(() => {
    console.log('📊 Modal закрыт', {
      type,
      step: paymentState.step,
      cost: debouncedCost,
      userId,
      timeOpen: performanceStats.timeSinceMount
    })
    
    onClose()
  }, [type, paymentState.step, debouncedCost, userId, performanceStats.timeSinceMount, onClose])
  
  // Обработчик клика по backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }, [handleClose])
  
  // Блокировка скролла при открытом modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])
  
  // Мемоизированный контент по шагам
  const stepContent = useMemo(() => {
    switch (paymentState.step) {
      case 'selection':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">{productConfig.icon}</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {productConfig.title}
              </h2>
              <p className="text-gray-600 mb-4">
                {productConfig.description}
              </p>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                ${debouncedCost.toFixed(2)}
              </div>
              <div className="text-sm text-orange-600 font-medium">
                {productConfig.urgency}
              </div>
            </div>
            
            <BenefitsList benefits={productConfig.benefits} />
            
            <button
              onClick={handlePurchase}
              disabled={paymentState.isLoading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {paymentState.isLoading ? 'Загрузка...' : `Купить за $${debouncedCost.toFixed(2)}`}
            </button>
            
            <div className="text-xs text-gray-500 text-center">
              Безопасная оплата через Stripe • Возврат в течение 30 дней
            </div>
          </div>
        )
        
      case 'payment':
      case 'processing':
        return (
          <div className="text-center space-y-6">
            <LoadingSpinner />
            <div className="text-gray-600">
              {paymentState.step === 'payment' 
                ? 'Инициализация платежа...' 
                : 'Обработка вашего платежа...'
              }
            </div>
            <Suspense fallback={<div>Загрузка платежной формы...</div>}>
              {StripeElements && (
                <StripeElements
                  clientSecret={paymentState.paymentIntent?.client_secret}
                  onSuccess={onPaymentSuccess}
                />
              )}
            </Suspense>
          </div>
        )
        
      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-green-600">
              Платеж успешен!
            </h2>
            <p className="text-gray-600">
              Спасибо за покупку! Ваш {productConfig.title.toLowerCase()} уже активирован.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-800">
                <strong>Покупка:</strong> {productConfig.title}<br/>
                <strong>Сумма:</strong> ${debouncedCost.toFixed(2)}<br/>
                <strong>ID:</strong> {paymentState.paymentIntent?.id}
              </div>
            </div>
          </div>
        )
        
      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl">😔</div>
            <h2 className="text-2xl font-bold text-red-600">
              Ошибка платежа
            </h2>
            <p className="text-gray-600">
              {paymentState.error || 'Произошла ошибка при обработке платежа'}
            </p>
            <button
              onClick={() => setPaymentState(prev => ({ ...prev, step: 'selection', error: null }))}
              className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Попробовать еще раз
            </button>
          </div>
        )
        
      default:
        return null
    }
  }, [paymentState, productConfig, debouncedCost, handlePurchase, StripeElements, onPaymentSuccess, setPaymentState])
  
  // Ранний возврат для закрытого modal
  if (!isOpen) {
    return null
  }
  
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${className}`}
      style={backdropStyle}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton onClose={handleClose} />
        
        <div className="p-6">
          {stepContent}
        </div>
        
        {/* Debug информация в dev режиме */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-2 bg-gray-100 text-xs text-gray-600 border-t">
            <div>Рендеры: {performanceStats.renderCount}</div>
            <div>Время жизни: {performanceStats.timeSinceMount}ms</div>
            <div>Шаг: {paymentState.step}</div>
            <div>Вариант: {variant}</div>
          </div>
        )}
      </div>
    </div>
  )
})

OptimizedPaywallModal.displayName = 'OptimizedPaywallModal'

export default OptimizedPaywallModal 