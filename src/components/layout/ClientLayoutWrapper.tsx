'use client'

import dynamic from "next/dynamic";
import ErrorBoundary from "../ErrorBoundary";
import AuthProvider from "../auth/AuthProvider";
import { useEffect } from 'react'
import { useEffectsStore } from '../../../lib/stores/effectsStore'
import { useTokenStore } from '../../../lib/stores/tokenStore'

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
  const { triggerFireworks } = useEffectsStore()
  const { setPremiumStatus, setLimit } = useTokenStore()

  // Отслеживаем успех Stripe Checkout (?checkout=success)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const checkout = url.searchParams.get('checkout')
    const sessionId = url.searchParams.get('session_id')
    if (checkout === 'success') {
      // Подтверждение на бекэнде (best-effort)
      fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      }).catch(() => {})

      // Мгновенный UX: ставим премиум и лимит
      setPremiumStatus(true)
      setLimit(10000)
      // Салют!
      triggerFireworks()

      // Чистим URL
      const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
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