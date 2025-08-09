import { createServerClient } from '../supabase/server'

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  scope?: string
  token_type?: string
  expiry_date?: string
}

export async function saveGoogleTokens(userId: string, tokens: OAuthTokens) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('user_integrations')
    .upsert({
      user_id: userId,
      provider: 'google_drive',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      scope: tokens.scope || null,
      token_type: tokens.token_type || null,
      expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,provider' })
  if (error) throw error
}

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('user_integrations')
    .select('access_token, expiry_date')
    .eq('user_id', userId)
    .eq('provider', 'google_drive')
    .maybeSingle()
  if (error) throw error
  return data?.access_token || null
}

export async function listDriveFiles(userId: string) {
  const accessToken = await getGoogleAccessToken(userId)
  if (!accessToken) throw new Error('Google Drive not connected')
  const resp = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType)', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!resp.ok) throw new Error('Google API error')
  const json = await resp.json()
  return json.files || []
} 