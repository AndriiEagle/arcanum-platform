import { NextRequest, NextResponse } from 'next/server'
import { exploreResonanceCapabilities } from '../../../../../../lib/services/resonanceAgentService'

const S_CODES = new Set(['S1','S2','S3','S4','S5','S6','S7','S8','S9'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = (req.headers.get('x-user-id') || body?.user_id || '').toString()
    const spheres = Array.isArray(body?.spheres) ? body.spheres.map((s: any) => String(s)) : []
    const limit = Number(body?.limit ?? 3)

    if (!userId) return NextResponse.json({ ok: false, error: 'x-user-id header or user_id required' }, { status: 400 })
    const valid = spheres.filter((s: string) => S_CODES.has(s))
    if (valid.length < 2) return NextResponse.json({ ok: false, error: 'Provide at least two spheres (S1..S9)' }, { status: 400 })

    const capabilities = await exploreResonanceCapabilities({ userId, spheres: valid as any, limit })
    return NextResponse.json({ ok: true, capabilities })
  } catch (err: any) {
    console.error('agents/resonance/explore error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 })
  }
}