'use client'

import React, { useEffect, useState } from 'react'
import { useTokenStore, selectTokenUsage as selectUsage, selectTokenWarning as selectWarning } from '../../../lib/stores/tokenStore'

interface TokenCounterSimpleProps {
  userId?: string
  onUpgrade?: () => void
  compact?: boolean
  showDetails?: boolean
}

export default function TokenCounterSimple({ userId = 'anonymous', onUpgrade, compact = false, showDetails = false }: TokenCounterSimpleProps) {
  const [isClient, setIsClient] = useState(false)

  const tokenUsage = useTokenStore(selectUsage)
  const tokenWarning = useTokenStore(selectWarning)
  const updateUsage = useTokenStore(s => s.updateUsage)
  const isPremium = useTokenStore(s => s.isPremium)

  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    if (!isClient) return
    if (!userId || userId === 'anonymous') return

    // Начальная загрузка и polling
    updateUsage(userId)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') updateUsage(userId)
    }, 30000)
    return () => clearInterval(interval)
  }, [isClient, userId, updateUsage])

  if (!isClient) {
    return (
      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2 animate-pulse">
        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
        <div className="w-20 h-4 bg-gray-600 rounded"></div>
        <div className="w-16 h-2 bg-gray-600 rounded-full"></div>
      </div>
    )
  }

  if (!userId || userId === 'anonymous') {
    return (
      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        <span className="text-sm text-gray-300">Войдите для отслеживания токенов</span>
      </div>
    )
  }

  const { used, limit, percentageUsed, isLoading } = tokenUsage
  const { showWarning, warningMessage, isNearLimit } = tokenWarning

  const getStatusColor = () => {
    if (percentageUsed >= 100) return 'red'
    if (percentageUsed >= 80) return 'orange'
    if (percentageUsed >= 60) return 'yellow'
    return 'green'
  }

  const statusColor = getStatusColor()
  const colorClasses = {
    green: { dot: 'bg-green-500', bar: 'bg-green-500', text: 'text-green-400' },
    yellow: { dot: 'bg-yellow-500', bar: 'bg-yellow-500', text: 'text-yellow-400' },
    orange: { dot: 'bg-orange-500', bar: 'bg-orange-500', text: 'text-orange-400' },
    red: { dot: 'bg-red-500 animate-pulse', bar: 'bg-red-500', text: 'text-red-400' }
  }

  const colors = colorClasses[statusColor as keyof typeof colorClasses]

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <span className={`text-xs ${colors.text}`}>{isLoading ? '...' : `${used.toLocaleString()}/${limit.toLocaleString()}`}</span>
        {isNearLimit && onUpgrade && (
          <button onClick={onUpgrade} className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded transition-colors">+</button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-3 bg-gray-800 rounded-lg px-4 py-3 shadow-lg">
        <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-300">{isPremium && <span className="text-purple-400 mr-1">👑</span>}Токены {isPremium ? 'Premium' : 'Basic'}</span>
            <span className={`text-sm font-mono ${colors.text}`}>{isLoading ? <span className="animate-pulse">Загрузка...</span> : `${used.toLocaleString()} / ${limit.toLocaleString()}`}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full transition-all duration-500 ease-out ${colors.bar}`} style={{ width: `${Math.min(percentageUsed, 100)}%`, boxShadow: percentageUsed > 90 ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none' }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">{percentageUsed.toFixed(1)}% использовано</span>
            {percentageUsed >= 100 && (<span className="text-xs text-red-400 font-medium animate-pulse">ЛИМИТ ПРЕВЫШЕН</span>)}
          </div>
        </div>
        {(isNearLimit || percentageUsed >= 100) && onUpgrade && (
          <button onClick={onUpgrade} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${percentageUsed >= 100 ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105'}`}>{percentageUsed >= 100 ? 'Разблокировать' : 'Upgrade'}</button>
        )}
      </div>

      {showWarning && warningMessage && (
        <div className={`${percentageUsed >= 100 ? 'bg-red-900/30 border border-red-500/30 text-red-300' : 'bg-orange-900/30 border border-orange-500/30 text-orange-300'} flex items-center space-x-2 px-3 py-2 rounded-lg text-sm`}>
          <span className="text-lg">⚠️</span>
          <span>{warningMessage}</span>
          {onUpgrade && (
            <button onClick={onUpgrade} className="ml-auto text-xs underline hover:no-underline opacity-75 hover:opacity-100">Подробнее</button>
          )}
        </div>
      )}

      {showDetails && (
        <div className="bg-gray-800/50 rounded-lg px-3 py-2 text-xs text-gray-400 space-y-1">
          <div className="flex justify-between"><span>Статус:</span><span className={isPremium ? 'text-purple-400' : 'text-blue-400'}>{isPremium ? 'Premium' : 'Basic'}</span></div>
          <div className="flex justify-between"><span>До лимита:</span><span className={colors.text}>{Math.max(0, limit - used).toLocaleString()} токенов</span></div>
        </div>
      )}
    </div>
  )
} 