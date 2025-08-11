import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase/server'

function sanitizeSource(md: string): string { return md.replace(/\[cite_start\]/g, '') }
interface ParsedEntry { version: string; last_update: string; profile_part: string; data: Record<string, unknown> }
function parseMultiJsonLike(md: string): ParsedEntry[] {
  const src = sanitizeSource(md); const entries: ParsedEntry[] = []; let depth = 0; let start = -1
  for (let i = 0; i < src.length; i++) { const ch = src[i]; if (ch === '{') { if (depth === 0) start = i; depth++ } else if (ch === '}') { depth--; if (depth === 0 && start >= 0) { const block = src.slice(start, i + 1); try { const obj = JSON.parse(block); if (obj && obj.version && obj.last_update && obj.data) entries.push(obj as ParsedEntry) } catch {} start = -1 } } }
  return entries
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
] as const

export async function POST(req: NextRequest) {
  try {
    const { userId, raw } = await req.json()
    if (!userId || !raw) return NextResponse.json({ ok: false, error: 'userId and raw required' }, { status: 400 })
    const supabase = createServerClient()

    const entries = parseMultiJsonLike(String(raw))
    if (!entries.length) return NextResponse.json({ ok: false, error: 'no JSON entries detected' }, { status: 400 })

    const ensurePayload = SPHERES9.map(s => ({ user_id: userId, sphere_code: s.code, sphere_name: s.name, is_active: true, health_percentage: 50 }))
    await supabase.from('life_spheres').upsert(ensurePayload, { onConflict: 'user_id,sphere_code' })

    const latest = entries[0]
    const meta = { profile_parts: entries.map(e => e.profile_part) }
    { const { error } = await supabase.from('operator_profiles').upsert({ user_id: userId, version: latest.version, last_update: latest.last_update, meta }, { onConflict: 'user_id' }); if (error) throw error }

    const { data: lifeRows } = await supabase.from('life_spheres').select('id,sphere_code').eq('user_id', userId)
    const codeToLifeId = new Map<string, string>(); (lifeRows || []).forEach(r => r.sphere_code && codeToLifeId.set(r.sphere_code, r.id))

    for (const entry of entries) {
      for (const [key, value] of Object.entries(entry.data)) {
        const m = key.match(/^(S[1-9])_/) ; if (!m) continue
        const sCode = m[1]; const node: any = value
        const payload = { user_id: userId, life_sphere_id: codeToLifeId.get(sCode) || null, sphere_code: sCode, meta: node.meta ?? {}, components: node.components ?? {}, synergy: node.synergy ?? {} }
        const { error } = await supabase.from('sphere_profiles').upsert(payload as any, { onConflict: 'user_id,sphere_code' }); if (error) throw error
      }
    }

    return NextResponse.json({ ok: true, imported: entries.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
} 