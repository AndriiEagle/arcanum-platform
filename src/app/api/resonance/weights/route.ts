import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

const S_CODES = new Set(['S1','S2','S3','S4','S5','S6','S7','S8','S9'])

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const userId = req.headers.get('x-user-id') || ''
    if (!userId) return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('resonance_weights')
      .select('sphere_a,sphere_b,weight')
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ ok: true, items: data || [] })
  } catch (err: any) {
    console.error('resonance/weights GET error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await req.json().catch(() => ({}))
    const userId = req.headers.get('x-user-id') || body?.user_id

    const { sphere_a, sphere_b } = body || {}
    const weightRaw = body?.weight

    if (!userId) return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 })
    if (!S_CODES.has(sphere_a) || !S_CODES.has(sphere_b)) {
      return NextResponse.json({ ok: false, error: 'sphere_a and sphere_b must be S1..S9' }, { status: 400 })
    }
    const w = Number(weightRaw)
    if (!(w >= 0 && w <= 1)) {
      return NextResponse.json({ ok: false, error: 'weight must be in 0..1' }, { status: 400 })
    }

    const rows = [
      { user_id: userId, sphere_a, sphere_b, weight: w },
      { user_id: userId, sphere_a: sphere_b, sphere_b: sphere_a, weight: w }
    ]

    const { error } = await supabase
      .from('resonance_weights')
      .upsert(rows, { onConflict: 'user_id,sphere_a,sphere_b' })

    if (error) throw error

    return NextResponse.json({ ok: true, updated: rows.length })
  } catch (err: any) {
    console.error('resonance/weights POST error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 