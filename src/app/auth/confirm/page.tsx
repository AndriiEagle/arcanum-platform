"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'

export default function AuthConfirmPage() {
  const router = useRouter()
  const search = useSearchParams()

  useEffect(() => {
    const supabase = createClient()

    const process = async () => {
      try {
        const url = new URL(window.location.href)
        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
        const hashParams = new URLSearchParams(hash)

        const code = search.get('code') || hashParams.get('code')
        const access_token = search.get('access_token') || hashParams.get('access_token')
        const refresh_token = search.get('refresh_token') || hashParams.get('refresh_token')

        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
          console.log('[AuthConfirm] exchangeCodeForSession OK')
        } else if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
          console.log('[AuthConfirm] setSession OK')
        } else {
          console.log('[AuthConfirm] No auth params found')
        }
      } catch (err) {
        console.error('[AuthConfirm] processing error', err)
      } finally {
        try {
          const clean = '/' // на главную
          window.history.replaceState({}, '', clean)
        } catch {}
        router.replace('/')
      }
    }

    process()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-300">
      Подтверждаем вход...
    </div>
  )
} 