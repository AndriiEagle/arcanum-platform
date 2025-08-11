'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import SphereHealthBar from './SphereHealthBar'
import SphereDevelopmentTree from '../modals/SphereDevelopmentTree'
import PaywallModal from '../payments/PaywallModal'
import { getSphereIcons, setSphereIcon } from '../../../lib/services/customizationService'
import { uploadImageResized } from '../../../lib/services/imageUpload'

interface Sphere {
  id: string
  name: string
  health_percentage: number
  color: string
  icon: string
  global_goal?: string
}

interface UserStats {
  level: number
  currentXP: number
  nextLevelXP: number
  energy: number
  hourlyIncome: number
  financialGoal: number
}

interface Task {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  status: 'active' | 'completed' | 'in_progress'
}

interface Buff {
  id: string
  name: string
  type: 'buff' | 'debuff'
  description: string
  duration: string
}

export default function StatsColumnWidget() {
  const userId = useCurrentUserId()
  console.log('[DBG][StatsColumnWidget] render', { userId })
  
  // Состояние для пользовательских статистик
  const [userStats, setUserStats] = useState<UserStats>({
    level: 15,
    currentXP: 2340,
    nextLevelXP: 3000,
    energy: 85,
    hourlyIncome: 45.50,
    financialGoal: 2000
  })

  // Состояние для сфер жизни
  const [spheres, setSpheres] = useState<Sphere[]>([])

  // Состояние для задач
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Медитация 15 мин', priority: 'high', status: 'in_progress' },
    { id: '2', title: 'Код-ревью проекта', priority: 'high', status: 'active' },
    { id: '3', title: 'Тренировка в зале', priority: 'medium', status: 'active' },
    { id: '4', title: 'Звонок родителям', priority: 'medium', status: 'active' },
    { id: '5', title: 'Чтение 30 страниц', priority: 'low', status: 'active' }
  ])

  // Состояние для баффов/дебаффов
  const [buffs, setBuffs] = useState<Buff[]>([
    { id: '1', name: 'Бодрость', type: 'buff', description: 'После ледяной ванны', duration: '2ч' },
    { id: '2', name: 'Фокус', type: 'buff', description: 'Deep Work режим', duration: '45м' },
    { id: '3', name: 'Усталость', type: 'debuff', description: 'Недосып вчера', duration: '4ч' }
  ])

  // Состояние для модального окна дерева развития
  const [selectedSphereForTree, setSelectedSphereForTree] = useState<Sphere | null>(null)
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false)
 
  // Состояние для простой модальной формы добавления сферы
  const [isAddSphereOpen, setIsAddSphereOpen] = useState(false)
  const [newSphereName, setNewSphereName] = useState('')
  const [isCreatingSphere, setIsCreatingSphere] = useState(false)
  const [createSphereError, setCreateSphereError] = useState<string | null>(null)

  // Состояние для простого модального окна (старое)
  const [selectedSphere, setSelectedSphere] = useState<Sphere | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Состояние для Paywall Modal (генерация маскотов)
  const [showMascotPaywall, setShowMascotPaywall] = useState(false)
  const [generatedMascot, setGeneratedMascot] = useState<string | null>(null)
  const [isGeneratingMascot, setIsGeneratingMascot] = useState(false)

  const [sphereIconUrls, setSphereIconUrls] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Supabase client should be created inside functions to keep stable deps and avoid re-renders

  // Функция загрузки данных сфер из Supabase
  const loadSpheresFromSupabase = useCallback(async () => {
    console.log('[DBG][StatsColumnWidget] loadSpheresFromSupabase start', { userId })
    try {
      setIsLoading(true)
      if (!userId) {
        console.log('User not authenticated, using static spheres data')
        setIsLoading(false)
        return
      }
      const supabase = createClient()
      const { data, error } = await supabase
        .from('life_spheres')
        .select('*')
        .eq('user_id', userId)

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading spheres:', error)
        return
      }

      if (data && data.length > 0) {
        console.log('[DBG][StatsColumnWidget] spheres loaded', data.length)
        const mappedSpheres = data.map((sphere: any) => ({
          id: sphere.id,
          name: sphere.sphere_name,
          health_percentage: sphere.health_percentage,
          color: 'blue',
          icon: getSphereIcon(sphere.sphere_name),
          global_goal: sphere.global_goal
        }))
        setSpheres(mappedSpheres)
      }
    } catch (error) {
      console.error('Error in loadSpheresFromSupabase:', error)
    } finally {
      console.log('[DBG][StatsColumnWidget] loadSpheresFromSupabase end')
      setIsLoading(false)
    }
  }, [userId])

  // Функция для получения иконки сферы
  const getSphereIcon = (sphereName: string): string => {
    const iconMap: Record<string, string> = {
      'Здоровье': '💪', 'Карьера': '💼', 'Отношения': '❤️', 'Финансы': '💰',
      'Саморазвитие': '📚', 'Хобби': '🎨', 'Духовность': '🧘', 'Семья': '👨‍👩‍👧‍👦',
      'Друзья': '👥', 'Путешествия': '✈️', 'Жилье': '🏠', 'Экология': '🌱'
    }
    return iconMap[sphereName] || '⭐'
  }

  // Функция обработки клика по сфере - открывает дерево развития
  const handleSphereClick = (sphere: Sphere) => {
    setSelectedSphereForTree(sphere)
    setIsTreeModalOpen(true)
  }

  // Подписка на внешнее событие открытия дерева конкретной сферы
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sphereId?: string, sphereName?: string }
      if (!detail?.sphereId && !detail?.sphereName) return
      // находим сферу по id или имени
      const found = spheres.find(s => (detail.sphereId && s.id === detail.sphereId) || (detail.sphereName && s.name === detail.sphereName))
      if (found) {
        setSelectedSphereForTree(found)
        setIsTreeModalOpen(true)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('OPEN_SPHERE_TREE', handler as EventListener)
      return () => window.removeEventListener('OPEN_SPHERE_TREE', handler as EventListener)
    }
  }, [spheres])

  // Создание новой сферы через Supabase и открытие дерева
  const handleCreateSphere = async () => {
    if (!userId) {
      alert('Войдите в аккаунт, чтобы добавлять сферы')
      return
    }
    const trimmed = newSphereName.trim()
    if (!trimmed) {
      setCreateSphereError('Введите название сферы')
      return
    }
    setIsCreatingSphere(true)
    setCreateSphereError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('life_spheres')
        .insert([{ user_id: userId, sphere_name: trimmed, health_percentage: 50 }])
        .select()
        .single()
      if (error) throw error

      const created: Sphere = {
        id: data.id,
        name: data.sphere_name,
        health_percentage: data.health_percentage || 50,
        color: 'blue',
        icon: getSphereIcon(data.sphere_name)
      }

      setSpheres(prev => [created, ...prev])
      setIsAddSphereOpen(false)
      setNewSphereName('')
      // Открываем дерево — внутри автоматически создадутся дефолтные категории/задачи
      handleSphereClick(created)
    } catch (e: any) {
      setCreateSphereError(e.message || 'Не удалось создать сферу')
    } finally {
      setIsCreatingSphere(false)
    }
  }

  // Закрытие дерева развития
  const closeTreeModal = () => {
    setIsTreeModalOpen(false)
    setSelectedSphereForTree(null)
  }

  // Функция для генерации маскота с paywall
  const handleGenerateMascot = () => {
    console.log('🎨 Запрос на генерацию маскота')
    setShowMascotPaywall(true)
  }

  // Функция успешной оплаты маскота
  const handleMascotPaymentSuccess = async (paymentIntentId: string) => {
    console.log('✅ Оплата маскота успешна:', paymentIntentId)
    setShowMascotPaywall(false)
    setIsGeneratingMascot(true)
    
    try {
      // Симуляция генерации маскота (в реальном проекте - вызов AI API)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Случайные маскоты для демо
      const mascots = [
        '🐱 Кот-воин с мечом',
        '🦊 Мудрая лиса-маг',
        '🐺 Волк-следопыт',
        '🦅 Орел-наблюдатель',
        '🐉 Дракон-защитник',
        '🦄 Единорог-целитель',
        '🐯 Тигр-берсерк',
        '🐧 Пингвин-алхимик'
      ]
      
      const randomMascot = mascots[Math.floor(Math.random() * mascots.length)]
      setGeneratedMascot(randomMascot)
      
      console.log(`✨ Маскот сгенерирован: ${randomMascot}`)
      
    } catch (error) {
      console.error('❌ Ошибка генерации маскота:', error)
    } finally {
      setIsGeneratingMascot(false)
    }
  }

  // Загружаем данные при монтировании
  useEffect(() => {
    console.log('[DBG][StatsColumnWidget] effect mount -> loadSpheresFromSupabase')
    loadSpheresFromSupabase()
  }, [loadSpheresFromSupabase])

  useEffect(() => {
    (async () => {
      if (!userId) return
      console.log('[DBG][StatsColumnWidget] effect icons load for user', userId)
      const icons = await getSphereIcons(userId)
      setSphereIconUrls(icons)
    })()
  }, [userId])

  const openIconPicker = (sphereId: string) => {
    fileInputRefs.current[sphereId]?.click()
  }

  const handleIconSelected = async (sphereId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file || !userId) return
      const { url } = await uploadImageResized(file, { bucket: 'public-assets', pathPrefix: `sphere-icons/${userId}`, maxSize: 128 })
      await setSphereIcon(userId, sphereId, url)
      setSphereIconUrls(prev => ({ ...prev, [sphereId]: url }))
    } catch (err) {
      console.error('Sphere icon upload error:', err)
    } finally {
      if (fileInputRefs.current[sphereId]) fileInputRefs.current[sphereId]!.value = ''
    }
  }

  // Функция для получения цвета приоритета
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-900/30'
      case 'medium': return 'text-yellow-400 bg-yellow-900/30'
      case 'low': return 'text-green-400 bg-green-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  // Рассчет процента XP
  const xpPercentage = (userStats.currentXP / userStats.nextLevelXP) * 100

  return (
    <>
      <div className="bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-sm rounded-lg p-6 border border-gray-700 shadow-2xl min-w-[320px] max-w-[400px] h-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <span className="mr-2">📊</span>
            Командный Центр
          </h2>
          <button 
            onClick={loadSpheresFromSupabase}
            disabled={isLoading}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isLoading ? '🔄' : '↻'}
          </button>
        </div>

        {/* Основные статистики */}
        <div className="space-y-4 mb-6">
          {/* Уровень */}
          <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-purple-300 font-medium">⭐ Уровень</span>
              <span className="text-2xl font-bold text-white">{userStats.level}</span>
            </div>
            {/* XP Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000 ease-out relative"
                style={{ width: `${xpPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="text-xs text-purple-200 mt-1">
              {userStats.currentXP.toLocaleString()} / {userStats.nextLevelXP.toLocaleString()} XP
            </div>
          </div>

          {/* Энергия */}
          <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-300 font-medium">⚡ Энергия</span>
              <span className="text-xl font-bold text-white">{userStats.energy}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${userStats.energy}%` }}
              ></div>
            </div>
          </div>

          {/* Финансы */}
          <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-yellow-300 font-medium">💰 Доход/час</div>
                <div className="text-lg font-bold text-white">${userStats.hourlyIncome}</div>
              </div>
              <div className="text-right">
                <div className="text-yellow-300 text-sm">Цель/месяц</div>
                <div className="text-lg font-bold text-white">${userStats.financialGoal}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Приоритетные задачи */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <span className="mr-2">🎯</span>
            Активные Задачи
          </h3>
          <div className="space-y-2">
            {tasks.filter(task => task.status !== 'completed').slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-center justify-between bg-gray-800/50 rounded p-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-sm text-gray-300">{task.title}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Активные баффы/дебаффы */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <span className="mr-2">✨</span>
            Эффекты
          </h3>
          <div className="space-y-2">
            {buffs.map((buff) => (
              <div key={buff.id} className={`p-2 rounded-lg ${buff.type === 'buff' ? 'bg-green-900/30 border-l-4 border-green-500' : 'bg-red-900/30 border-l-4 border-red-500'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`font-medium text-sm ${buff.type === 'buff' ? 'text-green-300' : 'text-red-300'}`}>
                      {buff.type === 'buff' ? '↗️' : '↘️'} {buff.name}
                    </div>
                    <div className="text-xs text-gray-400">{buff.description}</div>
                  </div>
                  <span className="text-xs text-gray-500">{buff.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Сферы Жизни */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <span className="mr-2">🌐</span>
            Сферы Жизни ({spheres.length}/12)
            <button
              onClick={() => setIsAddSphereOpen(true)}
              className="ml-auto text-xs px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded"
              title="Добавить сферу"
            >
              + Сфера
            </button>
          </h3>
          <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
            {spheres.map((sphere) => (
              <div key={sphere.id} className="flex items-center">
                <SphereHealthBar 
                  sphere={sphere} 
                  onClick={handleSphereClick}
                  iconUrl={sphereIconUrls[sphere.id]}
                  onUploadIcon={() => openIconPicker(sphere.id)}
                />
                <input
                  ref={(el) => { fileInputRefs.current[sphere.id] = el }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleIconSelected(sphere.id, e)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Старое модальное окно для простой детализации */}
        {selectedSphere && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedSphere(null)}>
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-2 text-2xl">{selectedSphere.icon}</span>
                  Детализация: {selectedSphere.name}
                </h3>
                <button 
                  onClick={() => setSelectedSphere(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-900/50 rounded p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {selectedSphere.health_percentage}%
                    </div>
                    <div className="text-gray-400">Текущее здоровье сферы</div>
                  </div>
                </div>
                
                <div className="text-gray-300 text-sm">
                  <p>🎯 <strong>Для +1%:</strong> Выполни 1 задачу в этой сфере</p>
                  <p>🚀 <strong>Для +5%:</strong> Достигни недельной цели</p>
                  <p>💫 <strong>Глобальная цель:</strong> {selectedSphere.global_goal || 'Улучшить качество жизни в этой области'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Кастомные стили для скроллбара */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(55, 65, 81, 0.3);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(107, 114, 128, 0.7);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(107, 114, 128, 0.9);
          }
        `}</style>
      </div>

      {/* Дерево развития сферы */}
      <SphereDevelopmentTree
        sphere={selectedSphereForTree}
        isOpen={isTreeModalOpen}
        onClose={closeTreeModal}
      />

      {/* Модалка добавления сферы */}
      {isAddSphereOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsAddSphereOpen(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 w-full max-w-sm mx-4" onClick={(e)=>e.stopPropagation()}>
            <h4 className="text-white font-semibold mb-3">Добавить новую сферу</h4>
            <input
              type="text"
              value={newSphereName}
              onChange={(e)=>setNewSphereName(e.target.value)}
              placeholder="Например: Бокс"
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
            {createSphereError && <div className="text-red-400 text-xs mb-2">{createSphereError}</div>}
            <div className="flex space-x-2">
              <button
                onClick={handleCreateSphere}
                disabled={isCreatingSphere}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded px-3 py-2"
              >
                {isCreatingSphere ? 'Создание...' : 'Создать'}
              </button>
              <button
                onClick={() => setIsAddSphereOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded px-3 py-2"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paywall Modal для генерации маскотов */}
      {/* Временная заглушка до исправления импорта */}
      {showMascotPaywall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              🎨 Генерация маскота
            </h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Создайте уникального персонального маскота с помощью AI
            </p>
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Что вы получите:</div>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Уникальный дизайн маскота</li>
                <li>• Высокое качество изображения</li>
                <li>• Моментальная генерация</li>
              </ul>
            </div>
            <p className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
              $1.00
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={() => {
                  console.log('💳 Переход к покупке маскота')
                  handleMascotPaymentSuccess(`pi_mascot_${Date.now()}`)
                }}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2 px-4 rounded hover:from-pink-700 hover:to-purple-700 transition-all"
              >
                Купить сейчас
              </button>
              <button 
                onClick={() => setShowMascotPaywall(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 