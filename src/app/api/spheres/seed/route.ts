import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms))
}

const SPHERES9 = [
  { code: 'S1', name: 'S1 — Vitality (Тело/Реактор)' },
  { code: 'S2', name: 'S2 — Mind/Code (Разум/Код)' },
  { code: 'S3', name: 'S3 — Habitat (Среда/Кокон)' },
  { code: 'S4', name: 'S4 — Action/Vector (Действие/Вектор)' },
  { code: 'S5', name: 'S5 — Communication/Influence (Связи/Коммуникация/Влияние)' },
  { code: 'S6', name: 'S6 — Craft/Production (Производство/Крафт)' },
  { code: 'S7', name: 'S7 — Status/Discipline (Статус/Дисциплина)' },
  { code: 'S8', name: 'S8 — Network/Library (Сеть/Библиотека)' },
  { code: 'S9', name: 'S9 — Capital/Resources (Ресурсы/Капитал)' }
]

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
      // ensure step: активируем и нормализуем имена/код/проценты
      const ensurePayload = SPHERES9.map(s => ({
        user_id: userId,
        sphere_code: s.code,
        sphere_name: s.name,
        is_active: true,
        health_percentage: 50
      }))
      await supabase.from('life_spheres').upsert(ensurePayload, { onConflict: 'user_id,sphere_code' })
      return NextResponse.json({ ok: true, userId, skipped: true })
    }

    // Try RPC first, но с таймаутом
    let rpcOk = false
    try {
      const rpcRes = await Promise.race([
        supabase.rpc('seed_spheres_v9', { p_user_id: userId }),
        timeout(8000)
      ]) as { error: { message: string } | null }
      if (!rpcRes.error) {
        rpcOk = true
      } else {
        console.warn('[seed] RPC error, fallback to insert', rpcRes.error)
      }
    } catch (e: any) {
      console.warn('[seed] RPC timeout/failure, fallback to insert', e?.message)
    }

    // Обеспечивающий шаг: upsert всех 9 с дефолтами (покроет оба пути — RPC и fallback)
    const payload = SPHERES9.map(s => ({
      user_id: userId,
      sphere_code: s.code,
      sphere_name: s.name,
      is_active: true,
      health_percentage: 50
    }))
    const upsertRes = await Promise.race([
      supabase.from('life_spheres').upsert(payload, { onConflict: 'user_id,sphere_code' }),
      timeout(8000)
    ]) as { error: { message: string } | null }
    if (upsertRes.error) return NextResponse.json({ error: upsertRes.error.message }, { status: 500 })

    return NextResponse.json({ ok: true, userId, rpc: rpcOk, ensured: true })
  } catch (e: any) {
    console.error('[seed] fatal', e?.message)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
} 