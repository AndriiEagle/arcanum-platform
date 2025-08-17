'use client'

import React from 'react'
import { X } from 'lucide-react'

interface SphereDetailModalProps {
  sphere: any
  isOpen: boolean
  onClose: () => void
}

export default function SphereDetailModal({ sphere, isOpen, onClose }: SphereDetailModalProps) {
  if (!isOpen || !sphere) return null

  const details = sphere.sphere_details

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{sphere.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{sphere.name}</h2>
                {details?.meta?.mission && (
                  <p className="text-gray-400 text-sm mt-1">{details.meta.mission}</p>
                )}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4 mt-4">
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <div className="text-gray-400 text-xs">Здоровье</div>
              <div className="text-white font-bold">{sphere.health_percentage}%</div>
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <div className="text-gray-400 text-xs">Резонанс</div>
              <div className="text-white font-bold">{Math.round(sphere.resonance_degree * 100)}%</div>
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              <div className="text-gray-400 text-xs">Позиция</div>
              <div className="text-white font-bold">{details?.meta?.matrix_position || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Components */}
          {details?.components && (
            <section>
              <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center">
                🧩 Компоненты сферы
              </h3>
              <div className="space-y-4">
                {Object.entries(details.components).map(([key, value]: [string, any]) => (
                  <div key={key} className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-2 capitalize">
                      {key.replace(/_/g, ' ')}
                    </h4>
                    
                    {typeof value === 'object' && value !== null ? (
                      <div className="space-y-2">
                        {Object.entries(value).map(([subKey, subValue]: [string, any]) => (
                          <div key={subKey} className="ml-4">
                            <div className="text-gray-300 text-sm font-medium">
                              {subKey.replace(/_/g, ' ')}:
                            </div>
                            <div className="text-gray-400 text-sm ml-2">
                              {typeof subValue === 'string' ? subValue : 
                               Array.isArray(subValue) ? (
                                 <ul className="list-disc list-inside space-y-1">
                                   {subValue.map((item, idx) => (
                                     <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                                   ))}
                                 </ul>
                               ) : JSON.stringify(subValue)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">{String(value)}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Synergy */}
          {details?.synergy && (
            <section>
              <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center">
                🔗 Синергии
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {details.synergy.produces_for && (
                  <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                    <h4 className="text-green-300 font-medium mb-2 flex items-center">
                      ▲ Усиливает
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(details.synergy.produces_for).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm">
                          <div className="text-green-200 font-medium">{key.replace(/_/g, ' ')}</div>
                          <div className="text-green-100/80 ml-2">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {details.synergy.consumes_from && (
                  <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
                    <h4 className="text-orange-300 font-medium mb-2 flex items-center">
                      ▼ Потребляет от
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(details.synergy.consumes_from).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm">
                          <div className="text-orange-200 font-medium">{key.replace(/_/g, ' ')}</div>
                          <div className="text-orange-100/80 ml-2">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Protocols and Strategies */}
          {details?.components && Object.keys(details.components).some(key => 
            key.includes('protocol') || key.includes('strategy') || key.includes('doctrine')
          ) && (
            <section>
              <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center">
                ⚡ Протоколы и Стратегии
              </h3>
              <div className="space-y-3">
                {Object.entries(details.components)
                  .filter(([key]) => key.includes('protocol') || key.includes('strategy') || key.includes('doctrine'))
                  .map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                      <div className="text-blue-200 font-medium mb-1">
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="text-blue-100/80 text-sm">
                        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
