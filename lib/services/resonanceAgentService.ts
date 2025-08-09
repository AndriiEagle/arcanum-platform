import { createServerClient } from '../supabase/server'
import { SPHERE_CODE_TO_NAME, type SphereCode } from '../core/life-spheres'

export interface CapabilityPairWeight {
  a: SphereCode
  b: SphereCode
  weight: number
}

export interface ResonanceCapability {
  id: string
  spheres: SphereCode[]
  synergy: number
  title: string
  description: string
  pairs: CapabilityPairWeight[]
}

export interface ExploreRequest {
  userId: string
  spheres: SphereCode[]
  limit?: number
}

function clamp01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x }

function getTitleForSpheres(codes: SphereCode[]): string {
  const names = codes.map(c => SPHERE_CODE_TO_NAME[c])
  return names.join(' × ')
}

function pairsOf<T>(arr: T[]): Array<[T, T]> {
  const res: Array<[T, T]> = []
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      res.push([arr[i], arr[j]])
    }
  }
  return res
}

async function getWeightsMap(userId: string): Promise<Record<string, Record<string, number>>> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('resonance_weights')
    .select('sphere_a, sphere_b, weight')
    .eq('user_id', userId)
  if (error) throw new Error(`resonance_weights fetch failed: ${error.message}`)
  const map: Record<string, Record<string, number>> = {}
  for (const row of data || []) {
    if (!map[row.sphere_a]) map[row.sphere_a] = {}
    map[row.sphere_a][row.sphere_b] = Number(row.weight)
  }
  return map
}

function getSymmetricWeight(map: Record<string, Record<string, number>>, a: string, b: string): number {
  const ab = map[a]?.[b]
  const ba = map[b]?.[a]
  if (typeof ab === 'number' && typeof ba === 'number') return Math.max(ab, ba)
  if (typeof ab === 'number') return ab
  if (typeof ba === 'number') return ba
  return 0
}

export async function exploreResonanceCapabilities(req: ExploreRequest): Promise<ResonanceCapability[]> {
  const { userId, spheres } = req
  const limit = Math.min(Math.max(Number(req.limit ?? 3), 1), 6)

  const uniqueSpheres = Array.from(new Set(spheres)) as SphereCode[]
  if (uniqueSpheres.length < 2) return []

  const weights = await getWeightsMap(userId)
  const pr = pairsOf(uniqueSpheres)

  const pairWeights: CapabilityPairWeight[] = pr.map(([a, b]) => ({
    a: a as SphereCode,
    b: b as SphereCode,
    weight: clamp01(getSymmetricWeight(weights, a as string, b as string))
  }))

  // Синергия как среднее по попарным весам, усиленная количеством сфер
  const baseSynergy = pairWeights.reduce((s, p) => s + p.weight, 0) / Math.max(1, pairWeights.length)
  const scaleByCardinality = 1 + (uniqueSpheres.length - 2) * 0.15 // бонус за 3+ сфер
  const synergy = clamp01(baseSynergy * scaleByCardinality)

  const title = getTitleForSpheres(uniqueSpheres)
  const description = `Гипотеза способности: объединение ${uniqueSpheres.join('+')} повышает эффект через сильные связи между парами. Интеграция даёт суммарную синергию ≈ ${(synergy * 100).toFixed(0)}%. Провести эксперимент и закрепить протокол.`

  const capability: ResonanceCapability = {
    id: `${uniqueSpheres.join('-')}`,
    spheres: uniqueSpheres,
    synergy,
    title,
    description,
    pairs: pairWeights
  }

  // На будущее: можно генерировать несколько сценариев (вариации протоколов). Пока возвращаем один основной
  return [capability].slice(0, limit)
}