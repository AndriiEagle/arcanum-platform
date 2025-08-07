import { NextRequest, NextResponse } from 'next/server'
import { dailyReview } from '../../../../../lib/services/disciplineService'

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-cron-secret')
    const secretEnv = process.env.CRON_SECRET
    if (secretEnv && secretHeader !== secretEnv) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const userId = body?.userId
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 })
    }

    const result = await dailyReview(userId)
    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    console.error('daily-review error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 