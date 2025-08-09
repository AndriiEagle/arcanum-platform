import { NextRequest, NextResponse } from 'next/server'
import { getTelegramSettings } from '../../../../../lib/services/customizationService'

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json()
    const tg = await getTelegramSettings(userId)
    if (!tg?.enabled || !tg.friendChatId) {
      return NextResponse.json({ ok: false, error: 'Telegram not configured' }, { status: 400 })
    }
    console.log('Send Telegram to friend:', tg.friendChatId, message)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('telegram notify error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 