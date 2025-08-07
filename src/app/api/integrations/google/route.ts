import { NextRequest, NextResponse } from 'next/server'
import { saveGoogleTokens } from '../../../../../lib/services/googleDriveService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, tokens } = body || {}
    if (!userId || !tokens?.access_token) {
      return NextResponse.json({ ok: false, error: 'userId and access_token required' }, { status: 400 })
    }
    await saveGoogleTokens(userId, tokens)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('google integration error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 