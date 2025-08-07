import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

const S_CODES = ['S1','S2','S3','S4','S5','S6','S7','S8','S9'] as const

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()

    const role = (req.headers.get('x-role') || 'user').toLowerCase()
    const reqUserId = req.headers.get('x-user-id') || ''
    const body = await req.json().catch(() => ({}))
    const targetUserId: string = (role === 'admin' || role === 'orchestrator')
      ? (body?.user_id || req.headers.get('x-target-user-id') || reqUserId)
      : reqUserId

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 })
    }

    const rows = S_CODES.map((code) => ({
      user_id: targetUserId,
      sphere_code: code,
      sphere_name: `${code}`,
      is_active: false,
      level: 0,
      currency: {},
      kpi: {}
    }))

    const { error } = await supabase
      .from('life_spheres')
      .upsert(rows, { onConflict: 'user_id,sphere_code' })

    if (error) throw error

    return NextResponse.json({ ok: true, user_id: targetUserId, seeded: S_CODES.length })
  } catch (err: any) {
    console.error('spheres/seed error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 