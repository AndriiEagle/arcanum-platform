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
        console.log('[AuthConfirm] mounted')
        const url = new URL(window.location.href)
        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
        const hashParams = new URLSearchParams(hash)

        const code = search.get('code') || hashParams.get('code')
        const access_token = search.get('access_token') || hashParams.get('access_token')
        const refresh_token = search.get('refresh_token') || hashParams.get('refresh_token')
        const type = search.get('type') || hashParams.get('type')
        const error_description = search.get('error_description') || hashParams.get('error_description')

        if (error_description) console.warn('[AuthConfirm] error_description:', error_description)

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) console.error('[AuthConfirm] exchangeCodeForSession error', error)
          else console.log('[AuthConfirm] exchangeCodeForSession OK')
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) console.error('[AuthConfirm] setSession error', error)
          else console.log('[AuthConfirm] setSession OK, type:', type)
        } else {
          console.log('[AuthConfirm] No auth params found')
        }
      } catch (err) {
        console.error('[AuthConfirm] processing error', err)
      } finally {
        try {
          const clean = '/auth/confirm'
          window.history.replaceState({}, '', clean)
        } catch {}
        try { router.replace('/') } catch {}
        setTimeout(() => { try { window.location.replace('/') } catch {} }, 300)
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