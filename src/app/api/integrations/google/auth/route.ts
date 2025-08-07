import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const clientId = process.env.GOOGLE_CLIENT_ID
  const site = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })
  }
  if (!clientId || !site) {
    return NextResponse.json({ ok: false, error: 'GOOGLE_CLIENT_ID and SITE_URL required' }, { status: 500 })
  }

  const redirectUri = `${site}/api/integrations/google/callback`
  const state = encodeURIComponent(JSON.stringify({ userId }))
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`

  return NextResponse.redirect(authUrl)
} 