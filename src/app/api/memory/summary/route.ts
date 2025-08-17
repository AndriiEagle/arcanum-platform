import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const supabase = createServerClient()

    const [statsRes, spheresRes, opRes, sProfilesRes] = await Promise.all([
      supabase.from('user_stats').select('level,current_xp,next_level_xp,energy,coins').eq('user_id', userId).maybeSingle(),
      // Не фильтруем по is_active на уровне запроса — дальше нормализуем сами
      supabase.from('life_spheres').select('sphere_name,health_percentage,is_active,sphere_code').eq('user_id', userId),
      supabase.from('operator_profiles').select('version,last_update').eq('user_id', userId).maybeSingle(),
      supabase.from('sphere_profiles').select('sphere_code,meta,components,synergy').eq('user_id', userId)
    ])

    // Дедупликация сфер: ключ по коду, иначе по нормализованному имени
    const raw = (spheresRes.data || []) as any[]
    const map = new Map<string, any>()
    for (const s of raw) {
      const code = (s.sphere_code || '').toString().trim()
      const nameKey = (s.sphere_name || '').toString().toLowerCase().replace(/\s+/g, ' ').trim()
      const key = code ? `code:${code}` : `name:${nameKey}`
      const prev = map.get(key)
      if (!prev) map.set(key, s)
      else {
        const prefer = (a: any, b: any) => {
          if (a.sphere_code && !b.sphere_code) return a
          if (b.sphere_code && !a.sphere_code) return b
          if (a.health_percentage && !b.health_percentage) return a
          if (b.health_percentage && !a.health_percentage) return b
          return a
        }
        map.set(key, prefer(prev, s))
      }
    }
    const spheresDedup = Array.from(map.values())

    const summary = {
      userId,
      stats: statsRes.data || null,
      spheres: spheresDedup.map((s: any) => ({
        name: s.sphere_name,
        code: s.sphere_code,
        // Если is_active = null/undefined — считаем активной (совместимость со старыми данными)
        active: s.is_active !== false,
        health: typeof s.health_percentage === 'number' ? s.health_percentage : 50
      })),
      operator: opRes.data || null,
      sphereProfiles: (sProfilesRes.data || []).map((p: any) => ({
        code: p.sphere_code,
        keyGoals: p.components?.financial_goals_and_deadlines?.primary_goal || p.meta?.title || null
      }))
    }

    return NextResponse.json({ ok: true, summary })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
} 