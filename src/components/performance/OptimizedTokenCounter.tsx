// Оптимизированная версия TokenCounter для максимальной производительности
// Использует все техники оптимизации для повышения конверсии

import React, { memo, useCallback, useMemo, useRef } from 'react'
import { 
  useDebounce, 
  useThrottle, 
  useMemoizedSelector, 
  useIntersectionObserver,
  usePerformanceMonitor,
  useCachedComputation,
  usePrefetch
} from '../../lib/hooks/usePerformanceOptimization'

// Оптимизированные типы
interface OptimizedTokenCounterProps {
  userId?: string
  onUpgrade?: () => void
  compact?: boolean
  showDetails?: boolean
  className?: string
}

interface TokenState {
  used: number
  limit: number
  isLoading: boolean
  isPremium: boolean
  lastUpdated: Date
}

// Мемоизированные селекторы для предотвращения лишних рендеров
const selectTokenUsage = (state: TokenState) => ({
  used: state.used,
  limit: state.limit,
  percentage: state.limit > 0 ? (state.used / state.limit) * 100 : 0,
  isPremium: state.isPremium
})

const selectTokenStatus = (state: TokenState) => {
  const percentage = state.limit > 0 ? (state.used / state.limit) * 100 : 0
  
  if (percentage >= 100) return { level: 'critical', color: 'red', message: 'Лимит превышен' }
  if (percentage >= 85) return { level: 'warning', color: 'orange', message: 'Близко к лимиту' }
  if (percentage >= 70) return { level: 'caution', color: 'yellow', message: 'Внимание' }
  return { level: 'normal', color: 'green', message: 'В норме' }
}

// Мемоизированный компонент прогресс-бара
const ProgressBar = memo<{
  percentage: number
  color: string
  animated?: boolean
}>(({ percentage, color, animated = false }) => {
  const progressStyle = useMemo(() => ({
    width: `${Math.min(percentage, 100)}%`,
    backgroundColor: color,
    transition: 'width 0.3s ease-in-out',
    animation: animated ? 'pulse 2s infinite' : 'none'
  }), [percentage, color, animated])

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div 
        className="h-full rounded-full"
        style={progressStyle}
      />
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
})
ProgressBar.displayName = 'ProgressBar'

// Мемоизированная кнопка обновления
const UpgradeButton = memo<{
  onUpgrade: () => void
  level: string
  compact: boolean
}>(({ onUpgrade, level, compact }) => {
  const buttonText = useMemo(() => {
    switch (level) {
      case 'critical': return compact ? 'Купить' : 'Купить токены'
      case 'warning': return compact ? 'Обновить' : 'Обновить тариф'
      default: return compact ? 'Upgrade' : 'Премиум'
    }
  }, [level, compact])

  const buttonClass = useMemo(() => {
    const baseClass = 'transition-all duration-200 font-medium rounded px-3 py-1 text-sm'
    const levelClass = level === 'critical' 
      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
      : 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-105'
    
    return `${baseClass} ${levelClass}`
  }, [level])

  return (
    <button
      onClick={onUpgrade}
      className={buttonClass}
      aria-label={`${buttonText} - улучшить тарифный план`}
    >
      {buttonText}
    </button>
  )
})
UpgradeButton.displayName = 'UpgradeButton'

// Основной оптимизированный компонент
const OptimizedTokenCounter: React.FC<OptimizedTokenCounterProps> = memo(({
  userId = '',
  onUpgrade = () => {},
  compact = false,
  showDetails = false,
  className = ''
}) => {
  const counterRef = useRef<HTMLDivElement>(null)
  
  // Мониторинг производительности
  const performanceStats = usePerformanceMonitor('OptimizedTokenCounter')
  
  // Отслеживание видимости для ленивой загрузки
  const { isIntersecting } = useIntersectionObserver(counterRef, {
    threshold: 0.1,
    rootMargin: '50px'
  })
  
  // Предзагрузка ресурсов оплаты при наведении
  const paymentUrls = useMemo(() => [
    '/api/payments/create-intent',
    '/api/payments/stripe-checkout'
  ], [])
  
  usePrefetch(paymentUrls, isIntersecting)
  
  // Мок состояния токенов (в реальности из store)
  const mockTokenState = useMemo<TokenState>(() => ({
    used: userId ? 750 : 0,
    limit: userId ? 1000 : 0,
    isLoading: false,
    isPremium: false,
    lastUpdated: new Date()
  }), [userId])
  
  // Оптимизированные селекторы
  const tokenUsage = useMemoizedSelector(selectTokenUsage, mockTokenState)
  const tokenStatus = useMemoizedSelector(selectTokenStatus, mockTokenState)
  
  // Дебаунсированные значения для избежания частых обновлений
  const debouncedUsage = useDebounce(tokenUsage, 500)
  
  // Кэшированные вычисления
  const displayText = useCachedComputation(
    (used: number, limit: number, isPremium: boolean) => {
      if (!userId) return 'Войти для отслеживания'
      if (isPremium) return `${used.toLocaleString()} токенов (∞)`
      return `${used.toLocaleString()} / ${limit.toLocaleString()}`
    },
    [debouncedUsage.used, debouncedUsage.limit, debouncedUsage.isPremium],
    30000 // 30 секунд TTL
  )
  
  // Троттлированный обработчик обновления
  const throttledUpgrade = useThrottle(onUpgrade, 1000)
  
  // Обработчик клика с аналитикой
  const handleUpgradeClick = useCallback(() => {
    // Аналитика клика
    console.log('📊 TokenCounter upgrade clicked', {
      userId,
      currentUsage: debouncedUsage.used,
      limit: debouncedUsage.limit,
      level: tokenStatus.level,
      timestamp: new Date().toISOString()
    })
    
    throttledUpgrade()
  }, [userId, debouncedUsage.used, debouncedUsage.limit, tokenStatus.level, throttledUpgrade])
  
  // Мемоизированный стиль контейнера
  const containerClass = useMemo(() => {
    const baseClass = 'flex items-center space-x-2 transition-all duration-300'
    const compactClass = compact ? 'text-sm' : 'text-base'
    const statusClass = tokenStatus.level === 'critical' ? 'animate-pulse' : ''
    
    return `${baseClass} ${compactClass} ${statusClass} ${className}`.trim()
  }, [compact, tokenStatus.level, className])
  
  // Ленивый рендер для невидимых компонентов
  if (!isIntersecting && performanceStats.renderCount > 1) {
    return (
      <div ref={counterRef} className={containerClass}>
        <span className="text-gray-400">●●●</span>
      </div>
    )
  }
  
  // Анонимные пользователи
  if (!userId) {
    return (
      <div ref={counterRef} className={containerClass}>
        <span className="text-gray-600">
          {compact ? 'Войти' : 'Войдите для отслеживания токенов'}
        </span>
      </div>
    )
  }
  
  const showUpgradeButton = !debouncedUsage.isPremium && 
    (tokenStatus.level === 'critical' || tokenStatus.level === 'warning')
  
  return (
    <div ref={counterRef} className={containerClass}>
      {/* Индикатор токенов */}
      <div className="flex items-center space-x-2">
        <div 
          className={`w-2 h-2 rounded-full`}
          style={{ backgroundColor: tokenStatus.color }}
          title={tokenStatus.message}
        />
        <span className="font-medium">
          {displayText}
        </span>
      </div>
      
      {/* Прогресс-бар */}
      {!compact && debouncedUsage.limit > 0 && (
        <div className="min-w-[60px]">
          <ProgressBar 
            percentage={debouncedUsage.percentage}
            color={tokenStatus.color}
            animated={tokenStatus.level === 'critical'}
          />
        </div>
      )}
      
      {/* Кнопка обновления */}
      {showUpgradeButton && (
        <UpgradeButton
          onUpgrade={handleUpgradeClick}
          level={tokenStatus.level}
          compact={compact}
        />
      )}
      
      {/* Детальная информация */}
      {showDetails && !compact && (
        <div className="text-xs text-gray-500">
          <div>Обновлено: {debouncedUsage.lastUpdated?.toLocaleTimeString()}</div>
          {process.env.NODE_ENV === 'development' && (
            <div>Рендеры: {performanceStats.renderCount}</div>
          )}
        </div>
      )}
    </div>
  )
})

OptimizedTokenCounter.displayName = 'OptimizedTokenCounter'

export default OptimizedTokenCounter 