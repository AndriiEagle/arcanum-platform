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

    // Проверяем, есть ли у пользователя все 9 сфер с sphere_code
    const { data: existingSpheres, error: existErr } = await supabase
      .from('life_spheres')
      .select('sphere_code')
      .eq('user_id', userId)
      .not('sphere_code', 'is', null)
    
    if (existErr) {
      console.error('[seed] Error checking existing spheres:', existErr)
    }

    const existingCodes = new Set((existingSpheres || []).map(s => s.sphere_code))
    const missingCodes = SPHERES9.filter(s => !existingCodes.has(s.code))

    // Если у пользователя уже есть все 9 сфер, ничего не делаем
    if (missingCodes.length === 0) {
      console.log('[seed] User already has all 9 spheres, skipping')
      return NextResponse.json({ ok: true, userId, skipped: true, existing: existingCodes.size })
    }

    console.log('[seed] Missing spheres for user:', missingCodes.map(s => s.code))

    // Создаем только недостающие сферы
    const payload = missingCodes.map(s => ({
      user_id: userId,
      sphere_code: s.code,
      sphere_name: s.name,
      is_active: true,
      health_percentage: 50
    }))

    // Используем простой upsert вместо RPC для надежности
    const { error: upsertError } = await supabase
      .from('life_spheres')
      .upsert(payload, { onConflict: 'user_id,sphere_code' })

    if (upsertError) {
      console.error('[seed] Upsert error:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    console.log('[seed] Successfully created/updated spheres for user:', userId)
    return NextResponse.json({ 
      ok: true, 
      userId, 
      created: payload.length, 
      sphereCodes: payload.map(s => s.sphere_code) 
    })
  } catch (e: any) {
    console.error('[seed] fatal', e?.message)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
} 