import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import { createServerClient } from '../supabase/server'
import { getDisplayNameForCode } from '../core/life-spheres'

export interface ProposedTaskInput {
  title: string
  description?: string
  expected_effect: Record<string, number>
  secondary_spheres?: string[]
  effort?: number
  purpose_score?: number
  due_date?: string | null
}

export interface ProposedTasksResponse {
  tasks: ProposedTaskInput[]
}

function isSCode(x: string): boolean {
  return /^S[1-9]$/.test(x)
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function validateTask(t: any): ProposedTaskInput | null {
  if (!t || typeof t !== 'object') return null
  if (typeof t.title !== 'string' || !t.title.trim()) return null

  const expected = t.expected_effect || {}
  if (typeof expected !== 'object' || Array.isArray(expected)) return null

  const eff: Record<string, number> = {}
  for (const k of Object.keys(expected)) {
    if (!isSCode(k)) continue
    const v = clamp01(Number(expected[k]))
    if (v > 0) eff[k] = v
  }
  if (Object.keys(eff).length === 0) return null

  const secondary = Array.isArray(t.secondary_spheres) ? t.secondary_spheres.filter((x: any) => typeof x === 'string' && isSCode(x)) : []
  const effort = Number(t.effort ?? 2.0)
  const purpose = clamp01(Number(t.purpose_score ?? 0.8))
  const due = typeof t.due_date === 'string' ? t.due_date : null

  if (!(effort >= 0.5 && effort <= 5.0)) return null

  return {
    title: t.title.trim(),
    description: typeof t.description === 'string' ? t.description : undefined,
    expected_effect: eff,
    secondary_spheres: secondary,
    effort,
    purpose_score: purpose,
    due_date: due
  }
}

function tryExtractJson(text: string): any | null {
  // Try direct JSON
  try { return JSON.parse(text) } catch {}
  // Try fenced code blocks
  const match = text.match(/```json[\s\S]*?```|```[\s\S]*?```/i)
  if (match) {
    const inner = match[0].replace(/```json|```/gi, '')
    try { return JSON.parse(inner) } catch {}
  }
  return null
}

function loadPrompt(relPath: string): string {
  const file = path.resolve(process.cwd(), 'arcanum-platform', relPath)
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf-8')
  return ''
}

export async function proposeTasks(sphereId: string, opts?: { n?: number }): Promise<ProposedTaskInput[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')
  const n = Math.min(Math.max(Number(opts?.n ?? 3), 1), 5)

  const supabase = createServerClient()
  const { data: sphere, error } = await supabase
    .from('life_spheres')
    .select('id, user_id, sphere_name, sphere_code')
    .eq('id', sphereId)
    .single()
  if (error) throw error
  if (!sphere) throw new Error('Sphere not found')

  const sCode = sphere.sphere_code as string | null
  const displayName = sCode ? getDisplayNameForCode(sCode) : sphere.sphere_name

  const orchestratorPrompt = loadPrompt('agents/orchestrator.prompt.md')
  const spherePrompt = sCode
    ? loadPrompt(`agents/spheres/${sCode}.prompt.md`)
    : loadPrompt('agents/spheres/DEFAULT.prompt.md')

  const schemaBlock = `You must return strict JSON with the following schema:
{
  "tasks": [
    {
      "title": "string (required)",
      "description": "string (optional)",
      "expected_effect": { "S1": 0.0..1.0, "S2": 0.0..1.0, ... },
      "secondary_spheres": ["Sx"...] (optional),
      "effort": 0.5..5.0 (optional default 2.0),
      "purpose_score": 0.0..1.0 (optional default 0.8),
      "due_date": "ISO string or null" (optional)
    }
  ]
}
Return only JSON.`

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const messages = [
    { role: 'system' as const, content: orchestratorPrompt.trim() },
    { role: 'system' as const, content: spherePrompt.trim() },
    { role: 'system' as const, content: schemaBlock },
    { role: 'user' as const, content: `Propose ${n} high-impact domino tasks for sphere ${sCode || sphere.sphere_name} (${displayName}).` }
  ]

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 800,
    messages
  })

  const raw = resp.choices?.[0]?.message?.content || '{}'
  const parsed = tryExtractJson(raw) || {}
  const arr = Array.isArray(parsed.tasks) ? parsed.tasks : []

  const result: ProposedTaskInput[] = []
  for (const item of arr) {
    const v = validateTask(item)
    if (v) result.push(v)
  }

  // Ensure at least one task present; fallback minimal stub aligned with sphere_code
  if (result.length === 0) {
    const key = sCode || 'S6'
    result.push({
      title: `Kickstart for ${displayName}`,
      expected_effect: { [key]: 0.8 },
      effort: 2.0,
      purpose_score: 0.8,
      secondary_spheres: []
    })
  }

  return result.slice(0, n)
} 