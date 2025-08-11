import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const supabase = createServerClient()

    // If user already has spheres, do nothing
    const { data: existing, error: existErr } = await supabase
      .from('life_spheres')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
    if (!existErr && existing && existing.length > 0) {
      return NextResponse.json({ ok: true, userId, skipped: true })
    }

    // Try RPC first
    const rpc = await supabase.rpc('seed_spheres_v9', { p_user_id: userId })
    if (rpc.error) {
      // Fallback: insert 3 basic active spheres
      const basic = [
        { sphere_name: 'S1 — Vitality (Тело/Реактор)', health_percentage: 50 },
        { sphere_name: 'S2 — Mind/Code (Разум/Код)', health_percentage: 50 },
        { sphere_name: 'S3 — Habitat (Среда/Кокон)', health_percentage: 50 },
      ]
      const payload = basic.map(b => ({ user_id: userId, is_active: true, ...b }))
      const { error: insErr } = await supabase.from('life_spheres').insert(payload)
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
      return NextResponse.json({ ok: true, userId, fallback: true })
    }

    return NextResponse.json({ ok: true, userId, rpc: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
} 