import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms))
}

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

    // Try RPC first, но с таймаутом
    try {
      const rpcRes = await Promise.race([
        supabase.rpc('seed_spheres_v9', { p_user_id: userId }),
        timeout(8000)
      ]) as { error: { message: string } | null }
      if (!rpcRes.error) {
        return NextResponse.json({ ok: true, userId, rpc: true })
      }
      console.warn('[seed] RPC error, fallback to insert', rpcRes.error)
    } catch (e: any) {
      console.warn('[seed] RPC timeout/failure, fallback to insert', e?.message)
    }

    // Fallback: insert 3 basic active spheres (idempotent enough for empty user)
    const basic = [
      { sphere_name: 'S1 — Vitality (Тело/Реактор)', health_percentage: 50 },
      { sphere_name: 'S2 — Mind/Code (Разум/Код)', health_percentage: 50 },
      { sphere_name: 'S3 — Habitat (Среда/Кокон)', health_percentage: 50 },
    ]
    const payload = basic.map(b => ({ user_id: userId, is_active: true, ...b }))

    const insertRes = await Promise.race([
      supabase.from('life_spheres').insert(payload),
      timeout(8000)
    ]) as { error: { message: string } | null }
    if (insertRes.error) return NextResponse.json({ error: insertRes.error.message }, { status: 500 })
    return NextResponse.json({ ok: true, userId, fallback: true })
  } catch (e: any) {
    console.error('[seed] fatal', e?.message)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
} 