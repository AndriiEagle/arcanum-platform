import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'
import { recalcAllScores, topTasks } from '../../../../../lib/services/resonanceService'

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
    const results: Array<{ user_id: string; selected_count: number }> = []

    for (const userId of userIds) {
      await recalcAllScores(userId)

      // Fetch candidate top tasks (more than needed)
      const candidates = await topTasks(userId, 10)
      const ids = candidates.map((c: { id: string; score: number }) => c.id)

      // Load their expected_effect to enforce domino (>=3 spheres)
      const { data: details, error: dErr } = await supabase
        .from('user_tasks')
        .select('id, expected_effect')
        .in('id', ids)
      if (dErr) throw dErr
      const effectCountById = new Map<string, number>()
      for (const t of details || []) {
        const eff = (t.expected_effect || {}) as Record<string, number>
        effectCountById.set(t.id, Object.keys(eff).length)
      }

      const selected = [] as Array<{ id: string; score: number }>
      for (const c of candidates) {
        const cnt = effectCountById.get(c.id) || 0
        if (cnt >= 3) selected.push(c)
        if (selected.length >= 3) break
      }
      // Fallback: if not enough domino tasks, fill with remaining best
      if (selected.length < 3) {
        for (const c of candidates) {
          if (!selected.find(s => s.id === c.id)) selected.push(c)
          if (selected.length >= 3) break
        }
      }

      await supabase
        .from('orchestrator_events')
        .insert({
          user_id: userId,
          event_type: 'DAILY_PLAN',
          payload: { selected, totalCandidates: candidates.length, generated_at: new Date().toISOString() }
        })

      results.push({ user_id: userId, selected_count: selected.length })
    }

    return NextResponse.json({ ok: true, users_processed: results.length, results })
  } catch (err: any) {
    console.error('orchestrator/daily-run error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 