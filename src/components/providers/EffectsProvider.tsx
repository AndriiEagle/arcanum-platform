'use client'

import { useEffect } from 'react'
import { useEffectsStore } from '../../../lib/stores/effectsStore'
import { useAuthStore } from '../../../lib/stores/authStore'
import LevelUpAnimation from '../effects/LevelUpAnimation'

interface EffectsProviderProps {
  children: React.ReactNode
}

export function EffectsProvider({ children }: EffectsProviderProps) {
  const { 
    isLevelUpActive, 
    currentLevel, 
    completeLevelUp,
    triggerLevelUp 
  } = useEffectsStore()
  
  const { isAuthenticated, generateDemoUser } = useAuthStore()

  // Автоинициализация demo пользователя при первом запуске
  useEffect(() => {
    if (!isAuthenticated) {
      // Автоматически создаем demo пользователя для первого опыта
      setTimeout(() => {
        generateDemoUser()
      }, 1000) // Небольшая задержка для плавности UX
    }
  }, [isAuthenticated, generateDemoUser])

  // Глобальные горячие клавиши для тестирования
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl + L = Trigger Level Up для тестирования
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        triggerLevelUp(currentLevel + 1)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress)
      return () => window.removeEventListener('keydown', handleKeyPress)
    }
  }, [currentLevel, triggerLevelUp])

  return (
    <>
      {children}
      
      {/* Глобальная анимация Level Up */}
      <LevelUpAnimation
        isActive={isLevelUpActive}
        newLevel={currentLevel}
        onComplete={completeLevelUp}
      />
    </>
  )
} 