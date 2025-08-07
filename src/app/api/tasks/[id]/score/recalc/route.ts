import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../../../lib/supabase/server'
import { getWeightsMap, calcScoreInternal } from '../../../../../../../lib/services/resonanceService'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient()
    const userId = req.headers.get('x-user-id') || ''
    const id = params.id
    if (!userId || !id) return NextResponse.json({ ok: false, error: 'x-user-id and task id required' }, { status: 400 })

    const { data: task, error: tErr } = await supabase
      .from('user_tasks')
      .select('id,user_id,expected_effect,secondary_spheres,effort,purpose_score')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (tErr) throw tErr
    if (!task) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })

    const weights = await getWeightsMap(userId)
    const score = calcScoreInternal(task as any, weights)

    const { error: upErr } = await supabase
      .from('user_tasks')
      .update({ score })
      .eq('id', id)
    if (upErr) throw upErr

    return NextResponse.json({ ok: true, id, score })
  } catch (err: any) {
    console.error('task score recalc error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 