import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

function hasValidSecret(req: NextRequest): boolean {
  const secretHeader = req.headers.get('x-cron-secret') || ''
  const secretEnv = process.env.CRON_SECRET || ''
  return !secretEnv || secretHeader === secretEnv
}

async function getAllUserIds(supabase: ReturnType<typeof createServerClient>): Promise<string[]> {
  const { data, error } = await supabase.from('life_spheres').select('user_id').neq('sphere_code', null)
  if (error) throw error
  const set = new Set<string>()
  for (const row of data || []) set.add(row.user_id)
  return Array.from(set)
}

export async function POST(req: NextRequest) {
  try {
    if (!hasValidSecret(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const body = await req.json().catch(() => ({}))
    const targetUserId: string | undefined = body?.user_id

    const userIds = targetUserId ? [targetUserId] : await getAllUserIds(supabase)
    for (const userId of userIds) {
      await supabase
        .from('orchestrator_events')
        .insert({
          user_id: userId,
          event_type: 'WEEKLY_PLAN',
          payload: { note: 'Weekly plan placeholder', generated_at: new Date().toISOString() }
        })
    }

    return NextResponse.json({ ok: true, users_processed: userIds.length })
  } catch (err: any) {
    console.error('orchestrator/weekly-run error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 