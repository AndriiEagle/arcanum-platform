import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId') || ''
    if (!userId) return NextResponse.json({ items: [] })

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('resonance_weights')
      .select('sphere_a, sphere_b, weight')
      .eq('user_id', userId)

    if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 })
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || 'unknown' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await req.json().catch(() => ({}))
    const userId: string = body?.userId || ''
    const items: Array<{ sphere_a: string; sphere_b: string; weight: number }> = Array.isArray(body?.items) ? body.items : []
    if (!userId || items.length === 0) return NextResponse.json({ ok: true, updated: 0 })

    const rows = items
      .filter((x) => x && x.sphere_a && x.sphere_b)
      .map((x) => ({
        user_id: userId,
        sphere_a: x.sphere_a,
        sphere_b: x.sphere_b,
        weight: Math.max(0, Math.min(1, Number(x.weight ?? 0)))
      }))

    const { error } = await supabase
      .from('resonance_weights')
      .upsert(rows, { onConflict: 'user_id,sphere_a,sphere_b' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated: rows.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
} 