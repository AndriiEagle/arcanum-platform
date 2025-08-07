import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase/server'

function isValidSxKey(k: string) {
  return ['S1','S2','S3','S4','S5','S6','S7','S8','S9'].includes(k)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await req.json()

    const userId = req.headers.get('x-user-id') || body?.user_id
    if (!userId) return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 })

    const { title, description, primary_sphere, secondary_spheres, expected_effect, effort, purpose_score, due_date } = body || {}

    if (!title || typeof title !== 'string') return NextResponse.json({ ok: false, error: 'title required' }, { status: 400 })

    // Validate expected_effect keys and values
    const eff: Record<string, number> = expected_effect || {}
    for (const [k, v] of Object.entries(eff)) {
      if (!isValidSxKey(k)) return NextResponse.json({ ok: false, error: `invalid expected_effect key: ${k}` }, { status: 400 })
      const num = Number(v)
      if (!(num >= 0 && num <= 1)) return NextResponse.json({ ok: false, error: `invalid expected_effect value for ${k}` }, { status: 400 })
    }

    // Validate purpose_score
    if (purpose_score !== undefined) {
      const p = Number(purpose_score)
      if (!(p >= 0 && p <= 1)) return NextResponse.json({ ok: false, error: 'purpose_score must be 0..1' }, { status: 400 })
    }

    // Validate effort
    if (effort !== undefined) {
      const e = Number(effort)
      if (!(e >= 0.5 && e <= 5)) return NextResponse.json({ ok: false, error: 'effort must be 0.5..5' }, { status: 400 })
    }

    // Resolve primary sphere id (by code)
    let sphere_id: string | null = null
    if (primary_sphere && isValidSxKey(primary_sphere)) {
      const { data: srow, error: sErr } = await supabase
        .from('life_spheres')
        .select('id')
        .eq('user_id', userId)
        .eq('sphere_code', primary_sphere)
        .maybeSingle()
      if (sErr) throw sErr
      sphere_id = srow?.id || null
    }

    const insert = {
      user_id: userId,
      sphere_id,
      title,
      description: description || null,
      expected_effect: eff,
      secondary_spheres: Array.isArray(secondary_spheres) ? secondary_spheres.filter(isValidSxKey) : [],
      effort: effort ?? 2.0,
      purpose_score: purpose_score ?? 0.8,
      due_date: due_date || null
    }

    const { data, error } = await supabase
      .from('user_tasks')
      .insert(insert)
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, id: data.id })
  } catch (err: any) {
    console.error('tasks POST error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 