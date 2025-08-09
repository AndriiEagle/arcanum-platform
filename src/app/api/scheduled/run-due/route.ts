import { NextRequest, NextResponse } from 'next/server'
import { getDueEvents, markFired } from '../../../../../lib/services/scheduledEventsService'

export async function POST(req: NextRequest) {
  try {
    const { now } = await req.json().catch(() => ({}))
    const nowISO = now || new Date().toISOString()
    const due = await getDueEvents(nowISO)

    for (const ev of due) {
      // Здесь можно добавить фактическое выполнение событии по типу
      await markFired(ev.user_id, ev.id)
    }

    return NextResponse.json({ ok: true, fired: due.length })
  } catch (err: any) {
    console.error('scheduled/run-due error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 