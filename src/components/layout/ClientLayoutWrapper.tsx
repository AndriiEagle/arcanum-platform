'use client'

import dynamic from "next/dynamic";
import ErrorBoundary from "../ErrorBoundary";
import AuthProvider from "../auth/AuthProvider";
import { useEffect } from 'react'
import { useEffectsStore } from '../../../lib/stores/effectsStore'
import { useTokenStore } from '../../../lib/stores/tokenStore'
import React from 'react'
import AuthButton from '../auth/AuthButton'

// Динамические импорты компонентов для избежания SSR проблем
const SidePanel = dynamic(() => import("@/components/layout/SidePanel"), {
  ssr: false,
  loading: () => <div className="w-64 bg-gray-800 animate-pulse" />
});

const MainContentArea = dynamic(() => import("@/components/layout/MainContentArea"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-gray-900 animate-pulse" />
});

const EffectsProvider = dynamic(() => import("@/components/providers/EffectsProvider").then(mod => ({ default: mod.EffectsProvider })), {
  ssr: false
});

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const triggerFireworks = useEffectsStore(s => s.triggerFireworks)
  const setPremiumStatus = useTokenStore(s => s.setPremiumStatus)
  const setLimit = useTokenStore(s => s.setLimit)

  const processedCheckoutRef = React.useRef(false)
  const [safeMode, setSafeMode] = React.useState(false)

  // SAFE MODE: включается через ?safe=1 или localStorage('SAFE_MODE')==='1'
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const url = new URL(window.location.href)
      const safe = url.searchParams.get('safe')
      const local = localStorage.getItem('SAFE_MODE')
      if (safe === '1' || local === '1') setSafeMode(true)
    } catch {}
  }, [])

  // Отслеживаем успех Stripe Checkout (?checkout=success)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const checkout = url.searchParams.get('checkout')
    const sessionId = url.searchParams.get('session_id')
    const processedKey = sessionId ? `checkout_processed_${sessionId}` : 'checkout_processed_generic'

    console.log('[DBG][ClientLayoutWrapper] effect run', {
      checkout,
      sessionId,
      processed: processedCheckoutRef.current
    })

    const alreadyProcessed = sessionStorage.getItem(processedKey) === '1'

    if (checkout === 'success' && !processedCheckoutRef.current && !alreadyProcessed) {
      processedCheckoutRef.current = true
      sessionStorage.setItem(processedKey, '1')
      console.log('[DBG][ClientLayoutWrapper] processing checkout success...')
      // Подтверждение на бекэнде (best-effort)
      fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      }).catch(() => {})

      // Мгновенный UX: ставим премиум и лимит
      console.log('[DBG][ClientLayoutWrapper] setPremiumStatus(true), setLimit(10000)')
      setPremiumStatus(true)
      setLimit(10000)
      // Салют!
      console.log('[DBG][ClientLayoutWrapper] triggerFireworks()')
      triggerFireworks()

      // Чистим URL
      url.searchParams.delete('checkout')
      url.searchParams.delete('session_id')
      const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
      console.log('[DBG][ClientLayoutWrapper] replaceState ->', cleanUrl)
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [setPremiumStatus, setLimit, triggerFireworks])

  if (safeMode) {
    return (
      <ErrorBoundary>
        <AuthProvider>
          <div className="min-h-screen w-full flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full text-center">
              <div className="text-2xl font-bold text-white mb-2">Safe Mode</div>
              <p className="text-gray-400 mb-4">Упрощённый рендер без тяжёлых компонентов для диагностики.</p>
              <div className="flex items-center justify-center">
                <AuthButton />
              </div>
            </div>
          </div>
        </AuthProvider>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <EffectsProvider>
          <div className="flex h-screen w-full">
            {/* Левая боковая панель */}
            <SidePanel position="left" />
            
            {/* Центральная область контента */}
            <MainContentArea>
              {children}
            </MainContentArea>
            
            {/* Правая боковая панель */}
            <SidePanel position="right" />
          </div>
        </EffectsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
} 