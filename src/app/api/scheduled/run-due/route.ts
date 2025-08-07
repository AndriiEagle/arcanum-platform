import { NextRequest, NextResponse } from 'next/server'
import { getDueEvents, markFired } from '../../../../../lib/services/scheduledEventsService'

export async function POST(req: NextRequest) {
  try {
    const secretHeader = req.headers.get('x-cron-secret')
    const secretEnv = process.env.CRON_SECRET
    if (secretEnv && secretHeader !== secretEnv) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const nowISO = new Date().toISOString()
    const due = await getDueEvents(nowISO)

    for (const ev of due) {
      await markFired(ev.user_id, ev.id)
      // TODO: hook into websocket/UI to trigger playback/mascots/text rendering client-side
      console.log('Scheduled event fired:', ev.id, ev.event_type)
    }

    return NextResponse.json({ ok: true, fired: due.length })
  } catch (err: any) {
    console.error('run-due error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 