'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { useCurrentUserId } from '../../../lib/stores/authStore'

interface Sphere {
  id: string
  name: string
  health_percentage: number
  color: string
  icon: string
}

interface Category {
  id: string
  name: string
  progress: number
  total_tasks: number
  completed_tasks: number
  tasks: Task[]
  mascot_url?: string
}

interface Task {
  id: string
  name: string
  xp_reward: number
  priority: 'high' | 'medium' | 'low'
  is_completed: boolean
  category_id: string
}

interface SphereDevelopmentTreeProps {
  sphere: Sphere | null
  isOpen: boolean
  onClose: () => void
}

export default function SphereDevelopmentTree({ sphere, isOpen, onClose }: SphereDevelopmentTreeProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isGeneratingMascot, setIsGeneratingMascot] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [totalXPEarned, setTotalXPEarned] = useState(0)

  const userId = useCurrentUserId()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && sphere) {
      loadCategoriesForSphere()
    }
  }, [isOpen, sphere, userId])

  const loadCategoriesForSphere = async () => {
    if (!userId || !sphere) return
    
    setIsLoading(true)
    try {
      // Пытаемся загрузить категории из БД
      const { data: dbCategories, error } = await supabase
        .from('sphere_categories')
        .select(`
          *,
          tasks:sphere_tasks(*)
        `)
        .eq('user_id', userId)
        .eq('sphere_id', sphere.id)

      if (error) {
        console.error('Error loading categories:', error)
        // Fallback на предустановленные категории
        loadFallbackCategories()
      } else if (dbCategories && dbCategories.length > 0) {
        // Преобразуем данные из БД
        const mappedCategories = dbCategories.map((cat: any) => ({
          id: cat.id,
          name: cat.category_name,
          progress: cat.progress || 0,
          total_tasks: cat.tasks?.length || 0,
          completed_tasks: cat.tasks?.filter((t: any) => t.is_completed).length || 0,
          tasks: cat.tasks || [],
          mascot_url: cat.mascot_url
        }))
        setCategories(mappedCategories)
        setSelectedCategory(mappedCategories[0]?.id || '')
      } else {
        // Создаем базовые категории для новой сферы
        await createDefaultCategoriesForSphere()
      }
    } catch (error) {
      console.error('Error in loadCategoriesForSphere:', error)
      loadFallbackCategories()
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultCategoriesForSphere = async () => {
    if (!userId || !sphere) return

    const defaultCategories = getDefaultCategoriesForSphere(sphere.name)
    
    try {
      // Создаем категории в БД
      const { data: createdCategories, error } = await supabase
        .from('sphere_categories')
        .insert(
          defaultCategories.map(cat => ({
            user_id: userId,
            sphere_id: sphere.id,
            category_name: cat.name,
            progress: 0
          }))
        )
        .select()

      if (error) {
        console.error('Error creating categories:', error)
        loadFallbackCategories()
        return
      }

      // Создаем задачи для каждой категории
      for (let i = 0; i < createdCategories.length; i++) {
        const category = createdCategories[i]
        const defaultTasks = defaultCategories[i].tasks

        await supabase
          .from('sphere_tasks')
          .insert(
            defaultTasks.map(task => ({
              user_id: userId,
              category_id: category.id,
              task_name: task.name,
              xp_reward: task.xp_reward,
              priority: task.priority,
              is_completed: false
            }))
          )
      }

      // Перезагружаем данные
      loadCategoriesForSphere()
    } catch (error) {
      console.error('Error creating default categories:', error)
      loadFallbackCategories()
    }
  }

  const loadFallbackCategories = () => {
    if (!sphere) return

    const fallbackData = getDefaultCategoriesForSphere(sphere.name)
    setCategories(fallbackData)
    setSelectedCategory(fallbackData[0]?.id || '')
  }

  const getDefaultCategoriesForSphere = (sphereName: string) => {
    const baseCategories = {
      'Здоровье': [
        {
          id: 'health-physical',
          name: 'Физическая Активность',
          progress: 65,
          total_tasks: 8,
          completed_tasks: 5,
          tasks: [
            { id: 'h1', name: 'Утренняя зарядка 20 мин', xp_reward: 50, priority: 'high' as const, is_completed: true, category_id: 'health-physical' },
            { id: 'h2', name: 'Пробежка 3 км', xp_reward: 100, priority: 'high' as const, is_completed: false, category_id: 'health-physical' },
            { id: 'h3', name: 'Силовая тренировка', xp_reward: 120, priority: 'medium' as const, is_completed: true, category_id: 'health-physical' }
          ]
        },
        {
          id: 'health-nutrition',
          name: 'Питание и Рацион',
          progress: 80,
          total_tasks: 6,
          completed_tasks: 5,
          tasks: [
            { id: 'h4', name: 'Составить план питания', xp_reward: 80, priority: 'high' as const, is_completed: true, category_id: 'health-nutrition' },
            { id: 'h5', name: 'Пить 2л воды в день', xp_reward: 40, priority: 'medium' as const, is_completed: false, category_id: 'health-nutrition' }
          ]
        }
      ],
      'Карьера': [
        {
          id: 'career-skills',
          name: 'Профессиональные Навыки',
          progress: 92,
          total_tasks: 5,
          completed_tasks: 4,
          tasks: [
            { id: 'c1', name: 'Изучить новый фреймворк', xp_reward: 200, priority: 'high' as const, is_completed: true, category_id: 'career-skills' },
            { id: 'c2', name: 'Сертификация по технологии', xp_reward: 300, priority: 'high' as const, is_completed: false, category_id: 'career-skills' }
          ]
        },
        {
          id: 'career-network',
          name: 'Профессиональные Связи',
          progress: 60,
          total_tasks: 4,
          completed_tasks: 2,
          tasks: [
            { id: 'c3', name: 'Участие в профконференции', xp_reward: 150, priority: 'medium' as const, is_completed: true, category_id: 'career-network' },
            { id: 'c4', name: 'Обновить LinkedIn профиль', xp_reward: 50, priority: 'low' as const, is_completed: false, category_id: 'career-network' }
          ]
        }
      ]
    }

    return baseCategories[sphereName as keyof typeof baseCategories] || [
      {
        id: 'general-1',
        name: 'Основные Задачи',
        progress: 50,
        total_tasks: 3,
        completed_tasks: 1,
        tasks: [
          { id: 'g1', name: 'Поставить цель', xp_reward: 100, priority: 'high' as const, is_completed: false, category_id: 'general-1' },
          { id: 'g2', name: 'Составить план', xp_reward: 80, priority: 'medium' as const, is_completed: true, category_id: 'general-1' },
          { id: 'g3', name: 'Начать действовать', xp_reward: 120, priority: 'high' as const, is_completed: false, category_id: 'general-1' }
        ]
      }
    ]
  }

  // Генерация AI маскота для категории
  const generateMascot = async (categoryId: string, categoryName: string) => {
    setIsGeneratingMascot(categoryId)
    
    try {
      const response = await fetch('/api/generate-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Создай милого AI маскота-помощника для категории "${categoryName}" в сфере "${sphere?.name}". Стиль: дружелюбный, мотивирующий, cartoon, яркие цвета, размер 256x256px`
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Обновляем локальное состояние
        setCategories(prev => prev.map(cat => 
          cat.id === categoryId 
            ? { ...cat, mascot_url: data.imageUrl }
            : cat
        ))
        
        // Сохраняем URL маскота в Supabase
        if (userId) {
          await supabase
            .from('sphere_categories')
            .update({ mascot_url: data.imageUrl })
            .eq('id', categoryId)
            .eq('user_id', userId)
        }
        
        console.log('Mascot generated and saved for category:', categoryId, data.imageUrl)
      }
    } catch (error) {
      console.error('Error generating mascot:', error)
    } finally {
      setIsGeneratingMascot(null)
    }
  }

  // Переключение выполнения задачи
  const toggleTaskCompletion = async (taskId: string, categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    const task = category?.tasks.find(t => t.id === taskId)
    
    if (!task) return

    const newCompletionStatus = !task.is_completed
    
    // Обновляем локальное состояние
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? {
            ...cat,
            tasks: cat.tasks.map(t => 
              t.id === taskId 
                ? { ...t, is_completed: newCompletionStatus }
                : t
            ),
            completed_tasks: newCompletionStatus 
              ? cat.completed_tasks + 1 
              : cat.completed_tasks - 1,
            progress: Math.round(((newCompletionStatus ? cat.completed_tasks + 1 : cat.completed_tasks - 1) / cat.total_tasks) * 100)
          }
        : cat
    ))
    
    // Сохраняем изменения в Supabase и обновляем XP пользователя
    if (userId) {
      try {
        // Обновляем статус задачи
        await supabase
          .from('sphere_tasks')
          .update({ is_completed: newCompletionStatus })
          .eq('id', taskId)
          .eq('user_id', userId)

        // Если задача выполнена - добавляем XP
        if (newCompletionStatus) {
          const xpToAdd = task.xp_reward
          setTotalXPEarned(prev => prev + xpToAdd)

          // Обновляем XP пользователя в БД
          const { data: currentStats } = await supabase
            .from('user_stats')
            .select('current_xp, level')
            .eq('user_id', userId)
            .single()

          if (currentStats) {
            const newXP = currentStats.current_xp + xpToAdd
            let newLevel = currentStats.level

            // Простая логика повышения уровня (каждые 1000 XP)
            if (newXP >= currentStats.level * 1000) {
              newLevel = Math.floor(newXP / 1000) + 1
            }

            await supabase
              .from('user_stats')
              .update({ 
                current_xp: newXP,
                level: newLevel
              })
              .eq('user_id', userId)

            console.log(`Task completed! +${xpToAdd} XP. Total XP: ${newXP}, Level: ${newLevel}`)
          }
        }

        // Обновляем прогресс категории
        const updatedCategory = categories.find(cat => cat.id === categoryId)
        if (updatedCategory) {
          await supabase
            .from('sphere_categories')
            .update({ progress: updatedCategory.progress })
            .eq('id', categoryId)
            .eq('user_id', userId)
        }

      } catch (error) {
        console.error('Error updating task completion:', error)
      }
    }
  }

  if (!isOpen || !sphere) return null

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-[90%] h-[90%] max-w-6xl flex overflow-hidden">
        
        {/* Левая панель - Категории */}
        <div className="w-1/3 bg-gray-900 p-6 border-r border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {sphere.icon} {sphere.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{category.name}</h3>
                    <span className="text-sm opacity-75">{category.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${category.progress}%` }}
                    />
                  </div>
                  
                  <div className="text-xs opacity-75">
                    {category.completed_tasks}/{category.total_tasks} задач выполнено
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Правая панель - Задачи и маскот */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedCategoryData ? (
            <>
              {/* Заголовок категории с маскотом */}
              <div className="flex items-start space-x-6 mb-8">
                <div className="flex-1">
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {selectedCategoryData.name}
                  </h3>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                      Прогресс: {selectedCategoryData.progress}%
                    </div>
                    <div className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                      {selectedCategoryData.completed_tasks}/{selectedCategoryData.total_tasks} задач
                    </div>
                  </div>
                </div>

                {/* AI Маскот */}
                <div className="flex flex-col items-center">
                  {selectedCategoryData.mascot_url ? (
                    <img
                      src={selectedCategoryData.mascot_url}
                      alt={`Маскот для ${selectedCategoryData.name}`}
                      className="w-24 h-24 rounded-lg object-cover mb-2"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-2xl">🤖</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => generateMascot(selectedCategoryData.id, selectedCategoryData.name)}
                    disabled={isGeneratingMascot === selectedCategoryData.id}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 px-3 py-1 rounded text-xs font-medium transition-colors"
                  >
                    {isGeneratingMascot === selectedCategoryData.id ? '⏳' : '🎨'} Маскот
                  </button>
                </div>
              </div>

              {/* Список задач */}
              <div className="space-y-3">
                <h4 className="text-xl font-semibold text-white mb-4">Задачи для выполнения</h4>
                {selectedCategoryData.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      task.is_completed
                        ? 'bg-green-900/30 border-green-500/50 text-green-100'
                        : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-750'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={task.is_completed}
                        onChange={() => toggleTaskCompletion(task.id, selectedCategoryData.id)}
                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`font-medium ${task.is_completed ? 'line-through' : ''}`}>
                            {task.name}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            task.priority === 'high' ? 'bg-red-600 text-white' :
                            task.priority === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {task.priority === 'high' ? 'Высокий' : 
                             task.priority === 'medium' ? 'Средний' : 'Низкий'}
                          </span>
                        </div>
                        <div className="text-sm opacity-75">
                          Награда: {task.xp_reward} XP
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-lg">Выберите категорию для просмотра задач</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 