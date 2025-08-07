'use client'

import { useEffect, useState } from 'react'
import { useEffectsStore } from '../../../lib/stores/effectsStore'
import { useAuthStore } from '../../../lib/stores/authStore'
import dynamic from 'next/dynamic'

// Динамический импорт LevelUpAnimation только на клиентской стороне
const LevelUpAnimation = dynamic(() => import('../effects/LevelUpAnimation'), {
  ssr: false
})
// Динамический импорт Fireworks
const Fireworks = dynamic(() => import('../effects/Fireworks'), {
  ssr: false
})

interface EffectsProviderProps {
  children: React.ReactNode
}

export function EffectsProvider({ children }: EffectsProviderProps) {
  const [isClient, setIsClient] = useState(false)
  
  // Инициализация только на клиентской стороне
  useEffect(() => {
    setIsClient(true)
  }, [])

  const { 
    isLevelUpActive, 
    currentLevel, 
    completeLevelUp,
    triggerLevelUp, 
    isFireworksActive, 
    completeFireworks
  } = useEffectsStore()
  
  const { isAuthenticated, generateDemoUser } = useAuthStore()

  // Автоинициализация demo пользователя при первом запуске
  useEffect(() => {
    if (!isClient) return
    
    if (!isAuthenticated) {
      // Автоматически создаем demo пользователя для первого опыта
      const timer = setTimeout(() => {
        generateDemoUser()
      }, 1000) // Небольшая задержка для плавности UX
      
      return () => clearTimeout(timer)
    }
  }, [isClient, isAuthenticated, generateDemoUser])

  // Глобальные горячие клавиши для тестирования
  useEffect(() => {
    if (!isClient) return
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl + L = Trigger Level Up для тестирования
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        triggerLevelUp(currentLevel + 1)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isClient, currentLevel, triggerLevelUp])

  if (!isClient) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      
      {/* Глобальная анимация Level Up */}
      <LevelUpAnimation
        isActive={isLevelUpActive}
        newLevel={currentLevel}
        onComplete={completeLevelUp}
      />

      {/* Глобальный салют (после оплаты) */}
      <Fireworks
        isActive={isFireworksActive}
        onComplete={completeFireworks}
      />
    </>
  )
} 