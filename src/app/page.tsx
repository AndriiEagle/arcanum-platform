"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    if (!hash) return
    const p = new URLSearchParams(hash)
    if (p.get('access_token') || p.get('refresh_token') || p.get('code')) {
      router.replace('/auth/callback' + window.location.search + window.location.hash)
    }
  }, [router])

  return (
    <div className="w-full h-full">
      {/* Реальный интерфейс Arcanum Platform отображается через ClientLayoutWrapper в layout.tsx */}
      {/* Включает: DashboardView, ResonanceView, SidePanel, DialogueWindow */}
    </div>
  )
}
