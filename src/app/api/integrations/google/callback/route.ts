import { NextRequest, NextResponse } from 'next/server'
import { saveGoogleTokens } from '../../../../../../lib/services/googleDriveService'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const stateRaw = url.searchParams.get('state')
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL

    if (!code || !stateRaw) return NextResponse.json({ ok: false, error: 'Missing code/state' }, { status: 400 })
    if (!clientId || !clientSecret || !site) return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 500 })

    const { userId } = JSON.parse(decodeURIComponent(stateRaw))
    if (!userId) return NextResponse.json({ ok: false, error: 'Missing userId in state' }, { status: 400 })

    const redirectUri = `${site}/api/integrations/google/callback`

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }) as any
    })

    if (!tokenResp.ok) {
      const errText = await tokenResp.text()
      return NextResponse.json({ ok: false, error: errText }, { status: 500 })
    }

    const tokens = await tokenResp.json()
    const expiresIn = typeof tokens.expires_in === 'number' ? tokens.expires_in : undefined
    const expiryIso = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined

    await saveGoogleTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: expiryIso
    })

    return NextResponse.redirect(`${site}/auth/welcome`)
  } catch (err: any) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 