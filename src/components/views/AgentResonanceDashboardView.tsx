'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import { SPHERE_CODE_TO_NAME, SPHERE_CODE_TO_ICON, type SphereCode } from '../../../lib/core/life-spheres'

interface CapabilityPairWeight { a: SphereCode; b: SphereCode; weight: number }
interface ResonanceCapability {
  id: string
  spheres: SphereCode[]
  synergy: number
  title: string
  description: string
  pairs: CapabilityPairWeight[]
}

const ALL_CODES: SphereCode[] = ['S1','S2','S3','S4','S5','S6','S7','S8','S9']

export default function AgentResonanceDashboardView() {
  const userId = useCurrentUserId()
  const [selected, setSelected] = useState<SphereCode[]>(['S1','S2','S9'])
  const [loading, setLoading] = useState(false)
  const [capabilities, setCapabilities] = useState<ResonanceCapability[]>([])

  const toggleCode = (code: SphereCode) => {
    setSelected(prev => prev.includes(code) ? prev.filter(c => c !== code) as SphereCode[] : [...prev, code])
  }

  const canExplore = selected.length >= 2 && !!userId

  const presets: Array<{ label: string; value: SphereCode[] }> = useMemo(() => ([
    { label: '💪+🧠+💰 S1+S2+S9', value: ['S1','S2','S9'] },
    { label: '💪+💰 S1+S9', value: ['S1','S9'] },
    { label: '🧠+💰 S2+S9', value: ['S2','S9'] },
    { label: '⚡+📚+🏆 S4+S8+S7', value: ['S4','S8','S7'] },
  ]), [])

  const explore = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const resp = await fetch('/api/agents/resonance/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ spheres: selected, limit: 3 })
      })
      const json = await resp.json()
      setCapabilities(Array.isArray(json?.capabilities) ? json.capabilities : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Автоисследование при первом рендере для дефолтного пресета
    if (userId) explore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return (
    <div className="w-full h-full relative bg-gray-900 p-4">
      <div className="flex items-start gap-6">
        <div className="w-80 bg-gray-800/80 border border-gray-700 rounded-lg p-4">
          <div className="text-white font-semibold mb-2">Агент-исследователь</div>
          <div className="text-xs text-gray-400 mb-3">Выберите комбинацию сфер (2-4) для выведения новой способности.</div>

          <div className="space-y-2">
            <div className="text-xs text-gray-300">Пресеты</div>
            <div className="flex flex-col gap-2">
              {presets.map(p => (
                <button key={p.label} onClick={() => setSelected(p.value)} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 text-left">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs text-gray-300">Сферы</div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_CODES.map(code => (
                <button
                  key={code}
                  onClick={() => toggleCode(code)}
                  className={`px-2 py-1 rounded text-xs border ${selected.includes(code) ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700 text-gray-200 border-gray-600'}`}
                >
                  {SPHERE_CODE_TO_ICON[code]} {code}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!canExplore || loading}
            onClick={explore}
            className="mt-4 w-full px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm"
          >
            {loading ? 'Исследование...' : 'Исследовать способность'}
          </button>
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white mb-3">Новые резонансные способности</h2>
          {capabilities.length === 0 ? (
            <div className="text-gray-400 text-sm">Нет данных. Выберите сферы и запустите исследование.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {capabilities.map(cap => (
                <div key={cap.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-medium">{cap.title}</div>
                    <div className="text-sm text-purple-300">Синергия: <span className="font-mono">{(cap.synergy * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-gray-300 text-sm mt-2">{cap.description}</div>
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-1">Попарные связи:</div>
                    <ul className="text-xs text-gray-300 space-y-1">
                      {cap.pairs.map((p, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded">{p.a}-{p.b}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-mono">{p.weight.toFixed(2)}</span>
                          <span className="text-gray-500">({SPHERE_CODE_TO_NAME[p.a]} × {SPHERE_CODE_TO_NAME[p.b]})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}