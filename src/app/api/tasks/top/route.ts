import { NextRequest, NextResponse } from 'next/server'
import { topTasks } from '../../../../../lib/services/resonanceService'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId') || ''
    const n = Math.max(1, Math.min(20, Number(url.searchParams.get('n') || 5)))
    if (!userId) return NextResponse.json({ items: [] })
    const items = await topTasks(userId, n)
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || 'unknown' }, { status: 500 })
  }
} 