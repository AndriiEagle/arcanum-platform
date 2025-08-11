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
      supabase.from('life_spheres').select('sphere_name,health_percentage,is_active,sphere_code').eq('user_id', userId),
      supabase.from('operator_profiles').select('version,last_update').eq('user_id', userId).maybeSingle(),
      supabase.from('sphere_profiles').select('sphere_code,meta,components,synergy').eq('user_id', userId)
    ])

    const summary = {
      userId,
      stats: statsRes.data || null,
      spheres: (spheresRes.data || []).map((s: any) => ({
        name: s.sphere_name,
        code: s.sphere_code,
        active: !!s.is_active,
        health: s.health_percentage
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