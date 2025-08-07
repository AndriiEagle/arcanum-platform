import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'
import { proposeTasks } from '../../../../../lib/services/agentsService'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await req.json()
    const sphere_id = String(body?.sphere_id || '')
    const n = Number(body?.n || 3)

    if (!sphere_id) return NextResponse.json({ ok: false, error: 'sphere_id required' }, { status: 400 })

    const tasks = await proposeTasks(sphere_id, { n })

    const inserts = tasks.map(t => ({
      user_id: body?.user_id || null,
      sphere_id,
      title: t.title,
      description: t.description || null,
      expected_effect: t.expected_effect,
      secondary_spheres: t.secondary_spheres || [],
      effort: t.effort ?? 2.0,
      purpose_score: t.purpose_score ?? 0.8,
      due_date: t.due_date || null
    }))

    const { data, error } = await supabase.from('user_tasks').insert(inserts).select('id')
    if (error) throw error

    return NextResponse.json({ ok: true, created: data?.map((d: any) => d.id) || [] })
  } catch (err: any) {
    console.error('agents/propose-tasks error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
} 