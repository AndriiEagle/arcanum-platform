import { NextRequest, NextResponse } from 'next/server'
import { topTasks } from '../../../../../lib/services/resonanceService'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || ''
    const nParam = req.nextUrl.searchParams.get('n')
    const n = Math.max(1, Math.min(20, Number(nParam ?? 3)))

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'x-user-id header required' }, { status: 400 })
    }

    const items = await topTasks(userId, n)
    return NextResponse.json({ ok: true, items })
  } catch (err: any) {
    console.error('tasks/top error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 