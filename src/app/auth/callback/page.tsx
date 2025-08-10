"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const search = useSearchParams()

  useEffect(() => {
    const supabase = createClient()

    const process = async () => {
      try {
        console.log('[AuthCallback] mounted')
        const url = new URL(window.location.href)
        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
        const hashParams = new URLSearchParams(hash)

        const code = search.get('code') || hashParams.get('code')
        const access_token = search.get('access_token') || hashParams.get('access_token')
        const refresh_token = search.get('refresh_token') || hashParams.get('refresh_token')
        const type = search.get('type') || hashParams.get('type')
        const error_description = search.get('error_description') || hashParams.get('error_description')

        if (error_description) console.warn('[AuthCallback] error_description:', error_description)

        if (code) {
          const { error } = await Promise.race([
            supabase.auth.exchangeCodeForSession(code),
            new Promise<any>(resolve => setTimeout(() => resolve({ error: null, _t: 'timeout' }), 1500))
          ])
          if (error) console.error('[AuthCallback] exchangeCodeForSession error', error)
          else console.log('[AuthCallback] exchangeCodeForSession OK')
        } else if (access_token && refresh_token) {
          const { error } = await Promise.race([
            supabase.auth.setSession({ access_token, refresh_token }),
            new Promise<any>(resolve => setTimeout(() => resolve({ error: null, _t: 'timeout' }), 1500))
          ])
          if (error) console.error('[AuthCallback] setSession error', error)
          else console.log('[AuthCallback] setSession OK, type:', type)
        } else {
          console.log('[AuthCallback] No auth params found')
        }

        try {
          const { data: { session } } = await supabase.auth.getSession()
          console.log('[AuthCallback] session?', !!session, session?.user?.id ? session.user.id.slice(0,8)+'...' : null)
        } catch (e) {
          console.warn('[AuthCallback] getSession check failed', e)
        }
      } catch (err) {
        console.error('[AuthCallback] processing error', err)
      } finally {
        try {
          const clean = '/auth/callback'
          window.history.replaceState({}, '', clean)
        } catch {}
        // Надёжный редирект: сначала через router, затем принудительно через location
        try { router.replace('/') } catch {}
        setTimeout(() => { try { window.location.replace('/') } catch {} }, 300)
      }
    }

    process()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-300">
      Обрабатываем вход...
    </div>
  )
} 