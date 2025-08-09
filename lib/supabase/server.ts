import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string
  if (!url || !key) {
    throw new Error('Supabase env vars are not configured (NEXT_PUBLIC_SUPABASE_URL and service or anon key)')
  }
  return createSupabaseClient(url, key)
} 