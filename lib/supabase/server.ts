import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let cachedServerClient: SupabaseClient | null = null

export function createServerClient(): SupabaseClient {
  // Защита: не использовать server client в браузере
  if (typeof window !== 'undefined') {
    throw new Error('createServerClient() should not be called on the client')
  }
  if (cachedServerClient) return cachedServerClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string
  if (!url || !key) {
    throw new Error('Supabase env vars are not configured (NEXT_PUBLIC_SUPABASE_URL and service or anon key)')
  }
  cachedServerClient = createSupabaseClient(url, key)
  return cachedServerClient
} 