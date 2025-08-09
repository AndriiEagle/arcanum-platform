import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
    if (!clientId || !site) return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 500 })

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', `${site}/api/integrations/google/callback`)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'consent')

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })

    url.searchParams.set('state', encodeURIComponent(JSON.stringify({ userId })))

    return NextResponse.redirect(url.toString())
  } catch (err: any) {
    console.error('Google OAuth init error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 