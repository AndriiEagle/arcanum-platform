'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEffectsStore } from '../../../lib/stores/effectsStore'
import { useAuthStore } from '../../../lib/stores/authStore'
import dynamic from 'next/dynamic'
import React from 'react'

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

  // One-time guard to avoid any chance of repeated scheduling
  const demoInitDoneRef = React.useRef(false)

  // Автоинициализация demo пользователя при первом запуске
  useEffect(() => {
    if (!isClient) return
    if (isAuthenticated) return
    if (demoInitDoneRef.current) return
    demoInitDoneRef.current = true
    console.log('[DBG][EffectsProvider] schedule demo user init in 1s')
    const timer = setTimeout(() => {
      console.log('[DBG][EffectsProvider] generating demo user...')
      generateDemoUser()
    }, 1000)
    return () => clearTimeout(timer)
  }, [isClient, isAuthenticated])

  // Глобальные горячие клавиши для тестирования
  useEffect(() => {
    if (!isClient) return
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl + L = Trigger Level Up для тестирования
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        console.log('[DBG][EffectsProvider] hotkey Ctrl+L -> triggerLevelUp', currentLevel + 1)
        triggerLevelUp(currentLevel + 1)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isClient, currentLevel, triggerLevelUp])

  const handleLevelUpComplete = useCallback(() => {
    console.log('[DBG][EffectsProvider] completeLevelUp()')
    completeLevelUp()
  }, [completeLevelUp])

  const handleFireworksComplete = useCallback(() => {
    console.log('[DBG][EffectsProvider] completeFireworks()')
    completeFireworks()
  }, [completeFireworks])

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
        onComplete={handleLevelUpComplete}
      />

      {/* Глобальный салют (после оплаты) */}
      <Fireworks
        isActive={isFireworksActive}
        onComplete={handleFireworksComplete}
      />
    </>
  )
} 