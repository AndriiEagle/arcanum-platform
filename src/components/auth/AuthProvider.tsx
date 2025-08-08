'use client'

import { useEffect, ReactNode, useRef, useState } from 'react'
import { useAuth } from '../../../lib/stores/authStore'

interface AuthProviderProps {
  children: ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized, isLoading } = useAuth()
  const didInitRef = useRef(false)
  const [hydrated, setHydrated] = useState(false)

  // Единоразовый вызов initialize()
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true
      initialize()
    }
  }, [initialize])

  // Отмечаем, что клиентская гидратация завершена
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Показываем загрузку только после гидратации, чтобы избежать SSR/CSR mismatch
  if (hydrated && !isInitialized && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold mb-2">Arcanum Platform</h2>
          <p className="text-gray-400">Инициализация системы авторизации...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 