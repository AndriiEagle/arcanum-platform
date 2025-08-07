'use client'

import dynamic from "next/dynamic";
import ErrorBoundary from "../ErrorBoundary";
import AuthProvider from "../auth/AuthProvider";
import { useEffect } from 'react'
import { useEffectsStore } from '../../../lib/stores/effectsStore'
import { useTokenStore } from '../../../lib/stores/tokenStore'
import React from 'react'

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

  // Отслеживаем успех Stripe Checkout (?checkout=success)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const checkout = url.searchParams.get('checkout')
    const sessionId = url.searchParams.get('session_id')
    console.log('[DBG][ClientLayoutWrapper] effect run', {
      checkout,
      sessionId,
      processed: processedCheckoutRef.current
    })
    if (checkout === 'success' && !processedCheckoutRef.current) {
      processedCheckoutRef.current = true
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