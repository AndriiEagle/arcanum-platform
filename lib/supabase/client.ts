import { createClient as createSupabaseBrowserClient, SupabaseClient } from '@supabase/supabase-js'

declare global {
  // eslint-disable-next-line no-var
  var __ARCANUM_SB__: SupabaseClient | undefined
}

let cachedClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (cachedClient) return cachedClient
  if (typeof window !== 'undefined' && globalThis.__ARCANUM_SB__) {
    cachedClient = globalThis.__ARCANUM_SB__!
    return cachedClient
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  cachedClient = createSupabaseBrowserClient(url, anon, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
      storageKey: 'arcanum-auth-v1'
    }
  })
  if (typeof window !== 'undefined') {
    globalThis.__ARCANUM_SB__ = cachedClient
  }
  return cachedClient
} 