'use client'

interface Sphere {
  id: string
  name: string
  health_percentage: number
  color: string
  icon: string
}

interface SphereHealthBarProps {
  sphere: Sphere
  onClick?: (sphere: Sphere) => void
}

export default function SphereHealthBar({ sphere, onClick }: SphereHealthBarProps) {
  const getHealthColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getHealthGlow = (percentage: number): string => {
    if (percentage >= 80) return 'shadow-green-500/30'
    if (percentage >= 60) return 'shadow-yellow-500/30'
    if (percentage >= 40) return 'shadow-orange-500/30'
    return 'shadow-red-500/30'
  }

  return (
    <div 
      className="group cursor-pointer hover:bg-gray-700/30 p-2 rounded transition-all duration-200"
      onClick={() => onClick?.(sphere)}
    >
      <div className="flex items-center space-x-3">
        <div className="text-lg">{sphere.icon}</div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-300">{sphere.name}</span>
            <span className="text-xs text-gray-400 font-mono">{sphere.health_percentage}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className={`
                h-full transition-all duration-700 ease-out
                ${getHealthColor(sphere.health_percentage)}
                group-hover:shadow-lg ${getHealthGlow(sphere.health_percentage)}
                relative
              `}
              style={{ width: `${sphere.health_percentage}%` }}
            >
              {/* Пульсирующий эффект для здоровых сфер */}
              {sphere.health_percentage >= 80 && (
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Hover tooltip */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-gray-400 mt-1 pl-8">
        Кликни для детализации
      </div>
    </div>
  )
} 