'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { useCurrentUserId } from '../../../lib/stores/authStore'

interface Sphere {
  id: string
  name: string
  health_percentage: number
  resonance_degree: number
  color: string
  icon: string
  isActive: boolean
  position: { x: number; y: number }
}

interface Connection {
  from: string
  to: string
  strength: number
  type: 'synergy' | 'conflict' | 'neutral'
}

export default function ResonanceView() {
  const [spheres, setSpheres] = useState<Sphere[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedSphere, setSelectedSphere] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [animationActive, setAnimationActive] = useState(true)

  const userId = useCurrentUserId()
  const supabase = createClient()

  // Центр круга
  const centerX = 400
  const centerY = 300
  const radius = 200

  // Загрузка данных сфер
  useEffect(() => {
    loadSpheresData()
  }, [userId])

  const loadSpheresData = async () => {
    try {
      setIsLoading(true)
      
      if (!userId) {
        // Создаем базовые сферы для неавторизованного пользователя
        createDefaultSpheres()
        return
      }

      // Пытаемся загрузить реальные данные из Supabase
      const { data: userSpheres, error } = await supabase
        .from('life_spheres')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        console.error('Error loading spheres from DB:', error)
        createDefaultSpheres()
        return
      }

      if (userSpheres && userSpheres.length > 0) {
        // Преобразуем данные из БД в формат для визуализации
        const mappedSpheres: Sphere[] = userSpheres.map((sphere: any, index: number) => {
          const angle = (index * 2 * Math.PI) / userSpheres.length
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          
          return {
            id: sphere.id,
            name: sphere.sphere_name,
            health_percentage: sphere.health_percentage || 50,
            resonance_degree: (sphere.health_percentage || 50) / 100,
            color: getSphereColor(sphere.sphere_name),
            icon: getSphereIcon(sphere.sphere_name),
            isActive: sphere.is_active,
            position: { x, y }
          }
        })
        
        setSpheres(mappedSpheres)
        generateConnections(mappedSpheres)
      } else {
        // Создаем базовые сферы для нового пользователя
        createDefaultSpheres()
      }
    } catch (error) {
      console.error('Error loading spheres:', error)
      createDefaultSpheres()
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultSpheres = () => {
    const defaultSpheres: Sphere[] = [
      { id: '1', name: 'Здоровье', health_percentage: 78, resonance_degree: 0.85, color: '#10B981', icon: '💪', isActive: true, position: { x: 0, y: 0 } },
      { id: '2', name: 'Карьера', health_percentage: 92, resonance_degree: 0.92, color: '#3B82F6', icon: '💼', isActive: true, position: { x: 0, y: 0 } },
      { id: '3', name: 'Отношения', health_percentage: 65, resonance_degree: 0.70, color: '#EC4899', icon: '❤️', isActive: true, position: { x: 0, y: 0 } },
      { id: '4', name: 'Финансы', health_percentage: 88, resonance_degree: 0.89, color: '#F59E0B', icon: '💰', isActive: true, position: { x: 0, y: 0 } },
      { id: '5', name: 'Саморазвитие', health_percentage: 73, resonance_degree: 0.75, color: '#8B5CF6', icon: '📚', isActive: true, position: { x: 0, y: 0 } },
      { id: '6', name: 'Хобби', health_percentage: 45, resonance_degree: 0.50, color: '#F97316', icon: '🎨', isActive: true, position: { x: 0, y: 0 } },
      { id: '7', name: 'Духовность', health_percentage: 60, resonance_degree: 0.65, color: '#A855F7', icon: '🧘', isActive: true, position: { x: 0, y: 0 } },
      { id: '8', name: 'Семья', health_percentage: 82, resonance_degree: 0.80, color: '#EF4444', icon: '👨‍👩‍👧‍👦', isActive: true, position: { x: 0, y: 0 } },
      { id: '9', name: 'Друзья', health_percentage: 67, resonance_degree: 0.72, color: '#06B6D4', icon: '👥', isActive: true, position: { x: 0, y: 0 } },
      { id: '10', name: 'Путешествия', health_percentage: 32, resonance_degree: 0.35, color: '#6366F1', icon: '✈️', isActive: false, position: { x: 0, y: 0 } },
      { id: '11', name: 'Жилье', health_percentage: 75, resonance_degree: 0.78, color: '#059669', icon: '🏠', isActive: true, position: { x: 0, y: 0 } },
      { id: '12', name: 'Экология', health_percentage: 55, resonance_degree: 0.58, color: '#84CC16', icon: '🌱', isActive: true, position: { x: 0, y: 0 } }
    ]

    // Расчет позиций по кругу
    const spheresWithPositions = defaultSpheres.map((sphere, index) => {
      const angle = (index * 2 * Math.PI) / defaultSpheres.length
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      return { ...sphere, position: { x, y } }
    })

    setSpheres(spheresWithPositions)
    generateConnections(spheresWithPositions)
  }

  const getSphereColor = (sphereName: string): string => {
    const colorMap: Record<string, string> = {
      'Здоровье': '#10B981',
      'Карьера': '#3B82F6',
      'Отношения': '#EC4899',
      'Финансы': '#F59E0B',
      'Саморазвитие': '#8B5CF6',
      'Хобби': '#F97316',
      'Духовность': '#A855F7',
      'Семья': '#EF4444',
      'Друзья': '#06B6D4',
      'Путешествия': '#6366F1',
      'Жилье': '#059669',
      'Экология': '#84CC16'
    }
    return colorMap[sphereName] || '#6B7280'
  }

  const getSphereIcon = (sphereName: string): string => {
    const iconMap: Record<string, string> = {
      'Здоровье': '💪', 'Карьера': '💼', 'Отношения': '❤️', 'Финансы': '💰',
      'Саморазвитие': '📚', 'Хобби': '🎨', 'Духовность': '🧘', 'Семья': '👨‍👩‍👧‍👦',
      'Друзья': '👥', 'Путешествия': '✈️', 'Жилье': '🏠', 'Экология': '🌱'
    }
    return iconMap[sphereName] || '⭐'
  }

  // Генерация связей между сферами
  const generateConnections = (sphereList: Sphere[]) => {
    const newConnections: Connection[] = []
    
    // Логика определения связей на основе здоровья сфер
    for (let i = 0; i < sphereList.length; i++) {
      for (let j = i + 1; j < sphereList.length; j++) {
        const sphere1 = sphereList[i]
        const sphere2 = sphereList[j]
        
        // Определяем силу связи на основе резонанса
        const avgResonance = (sphere1.resonance_degree + sphere2.resonance_degree) / 2
        const healthDiff = Math.abs(sphere1.health_percentage - sphere2.health_percentage)
        
        // Случайные связи для демонстрации (в продакшене будет AI-анализ)
        if (Math.random() < 0.3) {
          let connectionType: 'synergy' | 'conflict' | 'neutral' = 'neutral'
          
          if (avgResonance > 0.8 && healthDiff < 20) {
            connectionType = 'synergy'
          } else if (avgResonance < 0.5 || healthDiff > 40) {
            connectionType = 'conflict'
          }
          
          newConnections.push({
            from: sphere1.id,
            to: sphere2.id,
            strength: avgResonance,
            type: connectionType
          })
        }
      }
    }
    
    setConnections(newConnections)
  }

  // Обработка клика по сфере
  const handleSphereClick = (sphereId: string) => {
    setSelectedSphere(sphereId === selectedSphere ? null : sphereId)
  }

  // Получение статистики резонанса
  const getResonanceStats = () => {
    const activeSpheres = spheres.filter(s => s.isActive)
    const avgHealth = activeSpheres.reduce((sum, s) => sum + s.health_percentage, 0) / activeSpheres.length
    const avgResonance = activeSpheres.reduce((sum, s) => sum + s.resonance_degree, 0) / activeSpheres.length
    const synergyConnections = connections.filter(c => c.type === 'synergy').length
    const conflictConnections = connections.filter(c => c.type === 'conflict').length
    
    return {
      avgHealth: Math.round(avgHealth || 0),
      avgResonance: Math.round((avgResonance || 0) * 100),
      synergyConnections,
      conflictConnections,
      totalConnections: connections.length
    }
  }

  const stats = getResonanceStats()

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Загрузка резонансной карты...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-900 relative overflow-hidden">
      {/* Контролы и статистика */}
      <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 z-10">
        <h3 className="text-lg font-semibold text-white mb-2">🌐 Резонансная Карта</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Среднее здоровье:</span>
            <span className="text-white font-medium">{stats.avgHealth}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Общий резонанс:</span>
            <span className="text-white font-medium">{stats.avgResonance}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-400">Синергии:</span>
            <span className="text-green-400 font-medium">{stats.synergyConnections}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-400">Конфликты:</span>
            <span className="text-red-400 font-medium">{stats.conflictConnections}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={animationActive}
              onChange={(e) => setAnimationActive(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600 text-purple-500"
            />
            <span className="text-sm text-gray-300">Анимация частиц</span>
          </label>
        </div>
      </div>

      {/* SVG визуализация */}
      <svg 
        viewBox="0 0 800 600" 
        className="w-full h-full"
        style={{ background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 50%)' }}
      >
        {/* Центральный узел */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r="20"
            fill="url(#centerGradient)"
            stroke="#FFD700"
            strokeWidth="2"
            className="cursor-pointer"
          />
          <text
            x={centerX}
            y={centerY + 35}
            textAnchor="middle"
            className="fill-yellow-400 text-sm font-bold"
          >
            ⭐ Центр Силы
          </text>
        </g>

        {/* Связи между сферами */}
        {connections.map((connection, index) => {
          const fromSphere = spheres.find(s => s.id === connection.from)
          const toSphere = spheres.find(s => s.id === connection.to)
          
          if (!fromSphere || !toSphere) return null
          
          const strokeColor = connection.type === 'synergy' ? '#10B981' : 
                             connection.type === 'conflict' ? '#EF4444' : '#6B7280'
          
          return (
            <line
              key={index}
              x1={fromSphere.position.x}
              y1={fromSphere.position.y}
              x2={toSphere.position.x}
              y2={toSphere.position.y}
              stroke={strokeColor}
              strokeWidth={Math.max(1, connection.strength * 3)}
              strokeOpacity={0.6}
              className="transition-all duration-300"
            />
          )
        })}

        {/* Анимированные частицы */}
        {animationActive && connections.map((connection, index) => {
          const fromSphere = spheres.find(s => s.id === connection.from)
          const toSphere = spheres.find(s => s.id === connection.to)
          
          if (!fromSphere || !toSphere || connection.type === 'conflict') return null
          
          return (
            <circle
              key={`particle-${index}`}
              r="2"
              fill="#FFD700"
              opacity="0.8"
            >
              <animateMotion
                dur={`${3 + Math.random() * 2}s`}
                repeatCount="indefinite"
                path={`M ${fromSphere.position.x} ${fromSphere.position.y} L ${toSphere.position.x} ${toSphere.position.y}`}
              />
            </circle>
          )
        })}

        {/* Сферы жизни */}
        {spheres.map((sphere) => (
          <g key={sphere.id}>
            <circle
              cx={sphere.position.x}
              cy={sphere.position.y}
              r={sphere.isActive ? "25" : "15"}
              fill={sphere.color}
              fillOpacity={sphere.isActive ? 0.8 : 0.4}
              stroke={selectedSphere === sphere.id ? "#FFD700" : "white"}
              strokeWidth={selectedSphere === sphere.id ? "3" : "2"}
              className="cursor-pointer transition-all duration-300 hover:scale-110"
              onClick={() => handleSphereClick(sphere.id)}
            />
            <text
              x={sphere.position.x}
              y={sphere.position.y + 40}
              textAnchor="middle"
              className="fill-white text-xs font-medium"
            >
              {sphere.icon} {sphere.name}
            </text>
            <text
              x={sphere.position.x}
              y={sphere.position.y + 55}
              textAnchor="middle"
              className="fill-gray-300 text-xs"
            >
              {sphere.health_percentage}%
            </text>
          </g>
        ))}

        {/* Градиенты */}
        <defs>
          <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </radialGradient>
        </defs>
      </svg>

      {/* Детальная информация о выбранной сфере */}
      {selectedSphere && (
        <div className="absolute top-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 max-w-xs z-10">
          {(() => {
            const sphere = spheres.find(s => s.id === selectedSphere)
            if (!sphere) return null
            
            return (
              <>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {sphere.icon} {sphere.name}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Здоровье:</span>
                    <span className="text-white font-medium">{sphere.health_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Резонанс:</span>
                    <span className="text-white font-medium">{Math.round(sphere.resonance_degree * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Статус:</span>
                    <span className={sphere.isActive ? "text-green-400" : "text-gray-400"}>
                      {sphere.isActive ? "Активная" : "Неактивная"}
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${sphere.health_percentage}%`,
                      backgroundColor: sphere.color
                    }}
                  />
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
} 