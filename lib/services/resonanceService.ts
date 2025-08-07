import { createServerClient } from '../supabase/server'

export type SphereCode = 'S1'|'S2'|'S3'|'S4'|'S5'|'S6'|'S7'|'S8'|'S9'

export interface TaskForScoring {
  id: string
  user_id: string
  expected_effect: Record<string, number> | null
  secondary_spheres: string[] | null
  effort: number | null
  purpose_score: number | null
}

export interface WeightsMap {
  [sphereA: string]: { [sphereB: string]: number }
}

function clamp01(x: number): number { return x < 0 ? 0 : (x > 1 ? 1 : x) }

function computeDominoBonus(uniqueSphereCount: number, lambda = 0.2): number {
  // 1 + lambda * C(a); C=кол-во уникальных сфер в задаче (primary + secondary)
  const c = Math.max(1, uniqueSphereCount)
  return 1 + lambda * c
}

export async function getWeightsMap(userId: string): Promise<WeightsMap> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('resonance_weights')
    .select('sphere_a, sphere_b, weight')
    .eq('user_id', userId)

  if (error) throw new Error(`resonance_weights fetch failed: ${error.message}`)
  const map: WeightsMap = {}
  for (const row of data || []) {
    if (!map[row.sphere_a]) map[row.sphere_a] = {}
    map[row.sphere_a][row.sphere_b] = Number(row.weight)
  }
  return map
}

function getWeightSymmetric(weights: WeightsMap, a: string, b: string): number {
  const ab = weights[a]?.[b]
  const ba = weights[b]?.[a]
  if (typeof ab === 'number' && typeof ba === 'number') return Math.max(ab, ba)
  if (typeof ab === 'number') return ab
  if (typeof ba === 'number') return ba
  return 0
}

export function calcScoreInternal(task: TaskForScoring, weights: WeightsMap): number {
  if (!task || !task.expected_effect) return 0
  const effects = task.expected_effect as Record<string, number>
  const spheres = Object.keys(effects)
  if (spheres.length === 0) return 0

  // Sum over s: w_s * ΔS_s(a). Берем симметричный вес относительно primary↔secondary.
  let sum = 0
  for (const s of spheres) {
    const delta = clamp01(Number(effects[s] || 0))
    // Вес относительно S (приблизительно через средний/макс вклад между всеми парами в задаче)
    // Упростим: вес S относительно самого себя = 1, иначе максимальный вес к любому другому sphere в задаче
    let w = 1
    for (const t of spheres) {
      if (t === s) continue
      w = Math.max(w, getWeightSymmetric(weights, s, t))
    }
    sum += w * delta
  }

  const uniqueCount = new Set(spheres).size
  const domino = computeDominoBonus(uniqueCount, 0.2)
  const purpose = clamp01(Number(task.purpose_score ?? 0))
  const effort = Number(task.effort ?? 2)
  if (purpose < 0.5) return 0
  if (effort <= 0) return 0

  return (sum * domino * purpose) / effort
}

export async function topTasks(userId: string, n: number = 3): Promise<Array<{ id: string, score: number }>> {
  const supabase = createServerClient()
  const weights = await getWeightsMap(userId)

  const { data: tasks, error } = await supabase
    .from('user_tasks')
    .select('id,user_id,expected_effect,secondary_spheres,effort,purpose_score')
    .eq('user_id', userId)
    .is('is_completed', false)
    .limit(500)

  if (error) throw new Error(`user_tasks fetch failed: ${error.message}`)

  const scored = (tasks || []).map(t => ({ id: t.id, score: calcScoreInternal(t as any, weights) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, n)
}

export async function recalcAllScores(userId?: string): Promise<{ updated: number }> {
  const supabase = createServerClient()
  let filter = supabase.from('user_tasks')
    .select('id,user_id,expected_effect,secondary_spheres,effort,purpose_score')
    .is('is_completed', false)
    .limit(2000)

  if (userId) filter = filter.eq('user_id', userId)
  const { data: tasks, error } = await filter
  if (error) throw new Error(`user_tasks fetch failed: ${error.message}`)

  const updates: Array<{ id: string, score: number }> = []
  const byUser = new Map<string, any[]>()
  for (const t of tasks || []) {
    if (!byUser.has(t.user_id)) byUser.set(t.user_id, [])
    const arr = byUser.get(t.user_id) as any[]
    arr.push(t)
  }

  for (const [uid, arr] of byUser.entries()) {
    const weights = await getWeightsMap(uid)
    for (const t of arr) {
      const score = calcScoreInternal(t as any, weights)
      updates.push({ id: t.id, score })
    }
  }

  let updated = 0
  const chunk = 100
  for (let i = 0; i < updates.length; i += chunk) {
    const slice = updates.slice(i, i + chunk)
    const { error: upErr } = await supabase
      .from('user_tasks')
      .upsert(slice, { onConflict: 'id' })
    if (!upErr) updated += slice.length
  }

  return { updated }
} 