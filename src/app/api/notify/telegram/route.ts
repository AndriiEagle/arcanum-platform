import { NextRequest, NextResponse } from 'next/server'
import { getTelegramSettings } from '../../../../../lib/services/customizationService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, message } = body || {}
    if (!userId || !message) {
      return NextResponse.json({ ok: false, error: 'userId and message required' }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Bot token not configured' })
    }

    const settings = await getTelegramSettings(userId)
    if (!settings?.enabled || !settings?.friendChatId) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Telegram disabled or friendChatId missing' })
    }

    const text = settings?.friendName
      ? `Hi ${settings.friendName}! User ${userId} update:\n${message}`
      : `User ${userId} update:\n${message}`

    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: settings.friendChatId, text })
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return NextResponse.json({ ok: false, error: errText }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Telegram send error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 