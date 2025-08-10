'use client'

import { useEffect, useMemo, useState } from 'react'
import { getResonanceEnabledClient } from '../../../lib/config/featureFlags'
import { useCurrentUserId } from '../../../lib/stores/authStore'

type SphereCode = 'S1'|'S2'|'S3'|'S4'|'S5'|'S6'|'S7'|'S8'|'S9'
const CODES: SphereCode[] = ['S1','S2','S3','S4','S5','S6','S7','S8','S9']

export default function ResonanceBoardPage() {
  const enabled = getResonanceEnabledClient()
  const userId = useCurrentUserId()
  const [topTasks, setTopTasks] = useState<Array<{ id: string; score: number }>>([])
  const [weights, setWeights] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!enabled || !userId) return
    const run = async () => {
      setLoading(true)
      try {
        const tt = await fetch(`/api/tasks/top?n=5&userId=${encodeURIComponent(userId)}`).then(r => r.json()).catch(() => ({ items: [] }))
        const items = Array.isArray(tt?.items) ? tt.items : []
        setTopTasks(items)
        const wr = await fetch(`/api/resonance/weights?userId=${encodeURIComponent(userId)}`).then(r => r.json()).catch(() => ({ items: [] }))
        const map: Record<string, number> = {}
        for (const it of wr?.items || []) {
          map[`${it.sphere_a}-${it.sphere_b}`] = Number(it.weight)
        }
        setWeights(map)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [enabled, userId])

  const grid = useMemo(() => {
    return CODES.map(a => CODES.map(b => ({ key: `${a}-${b}`, a, b, value: weights[`${a}-${b}`] ?? (a === b ? 1 : 0.2) })))
  }, [weights])

  const onChangeCell = (a: SphereCode, b: SphereCode, val: number) => {
    const v = Math.max(0, Math.min(1, val))
    setWeights(prev => ({ ...prev, [`${a}-${b}`]: v }))
  }

  const onSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const payload = [] as Array<{ sphere_a: string; sphere_b: string; weight: number }>
      for (const a of CODES) for (const b of CODES) if (a !== b) {
        const key = `${a}-${b}`
        const w = typeof weights[key] === 'number' ? weights[key]! : 0.2
        payload.push({ sphere_a: a, sphere_b: b, weight: Math.max(0, Math.min(1, w)) })
      }
      await fetch('/api/resonance/weights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, items: payload }) })
    } finally {
      setSaving(false)
    }
  }

  if (!enabled) {
    return (
      <div className="p-6 text-gray-300">Resonance features are disabled. Set NEXT_PUBLIC_RESONANCE_ENABLED=true</div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-xl font-semibold text-gray-100">Resonance Board</h1>

      <section>
        <h2 className="text-lg mb-2 text-gray-200">Top Tasks</h2>
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <ul className="space-y-1">
            {topTasks.map(t => (
              <li key={t.id} className="text-gray-300 text-sm">{t.id} — <span className="font-mono">{t.score.toFixed(3)}</span></li>
            ))}
            {topTasks.length === 0 && <li className="text-gray-500">No tasks</li>}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="text-lg text-gray-200">Resonance Matrix (0..1)</h2>
          <button disabled={saving} onClick={onSave} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm">{saving ? 'Saving...' : 'Save'}</button>
        </div>
        <div className="overflow-auto border border-gray-700 rounded mt-2">
          <table className="min-w-[600px]">
            <thead>
              <tr>
                <th className="p-2 text-left text-gray-400">A\B</th>
                {CODES.map(b => <th key={b} className="p-2 text-gray-400">{b}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr key={i}>
                  <td className="p-2 text-gray-400">{CODES[i]}</td>
                  {row.map(cell => (
                    <td key={cell.key} className="p-1">
                      {cell.a === cell.b ? (
                        <div className="text-center text-gray-500">1.00</div>
                      ) : (
                        <input
                          type="number"
                          step="0.05"
                          min={0}
                          max={1}
                          value={Number(cell.value).toFixed(2)}
                          onChange={e => onChangeCell(cell.a as SphereCode, cell.b as SphereCode, parseFloat(e.target.value))}
                          className="w-20 bg-gray-800 text-gray-100 border border-gray-700 rounded px-2 py-1 text-sm"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
} 