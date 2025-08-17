'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import { declareTask, markDeclarationCompleted } from '../../../lib/services/disciplineService'

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
  icon?: string
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

  // New: add-category/task modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null)

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskXP, setNewTaskXP] = useState<number>(50)
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [addTaskError, setAddTaskError] = useState<string | null>(null)

  const [isDeclareOpen, setIsDeclareOpen] = useState(false)
  const [declareTitle, setDeclareTitle] = useState('')
  const [declareDue, setDeclareDue] = useState<string>('')
  const [declaring, setDeclaring] = useState(false)
  const [bindTaskId, setBindTaskId] = useState<string | null>(null)

  const userId = useCurrentUserId()
  const supabase = createClient()

  // 🚀 МАКСИМАЛЬНАЯ ОПТИМИЗАЦИЯ: ESC и клик вне модала для закрытия
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      event.stopPropagation()
      console.log('🚀 Закрытие модала по ESC')
      onClose()
    }
  }, [isOpen, onClose])

  const handleBackdropClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Убеждаемся что клик точно по backdrop, а не по его дочерним элементам
    if (event.target === event.currentTarget) {
      event.preventDefault()
      event.stopPropagation()
      console.log('🚀 Закрытие модала по клику на backdrop')
      onClose()
    }
  }, [onClose])

  // Принудительное закрытие модала
  const handleForceClose = useCallback((event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    console.log('🚀 Принудительное закрытие модала')
    onClose()
  }, [onClose])

  // 🚀 МАКСИМАЛЬНАЯ ОПТИМИЗАЦИЯ: Подписка на ESC и блокирование скролла
  useEffect(() => {
    if (isOpen) {
      // Сохраняем исходное состояние скролла
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight
      
      // Вычисляем ширину скроллбара
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      
      // Блокируем скролл и компенсируем исчезновение скроллбара
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollBarWidth}px`
      
      // Добавляем обработчик ESC
      document.addEventListener('keydown', handleEscapeKey, { capture: true })
      
      console.log('🚀 Модал открыт, скролл заблокирован')
      
      return () => {
        // Восстанавливаем исходное состояние
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
        document.removeEventListener('keydown', handleEscapeKey, { capture: true })
        console.log('🚀 Модал закрыт, скролл восстановлен')
      }
    }
  }, [isOpen, handleEscapeKey])

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
        .select('*')
        .eq('sphere_id', sphere.id)

      if (error) {
        console.error('Error loading categories:', error)
        // Fallback на предустановленные категории
        loadFallbackCategories()
      } else if (dbCategories && dbCategories.length > 0) {
        // Преобразуем данные из БД (без join по задачам)
        const mappedCategories: Category[] = dbCategories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          progress: cat.progress || 0,
          total_tasks: 0,
          completed_tasks: 0,
          tasks: [],
          mascot_url: cat.mascot_url,
          icon: cat.icon || '📋'
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
            name: cat.name,
            progress: cat.progress || 0,
            icon: cat.icon
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

  const getDefaultCategoriesForSphere = (_sphereName: string): Category[] => {
    // Generic defaults independent of legacy names
    return [
      {
        id: 'general-1',
        name: 'Core Improvements',
        progress: 0,
        total_tasks: 3,
        completed_tasks: 0,
        icon: '🎯',
        tasks: [
          { id: 'g1', name: 'Define 1 concrete improvement', xp_reward: 80, priority: 'high' as const, is_completed: false, category_id: 'general-1' },
          { id: 'g2', name: 'Prepare environment/tools', xp_reward: 60, priority: 'medium' as const, is_completed: false, category_id: 'general-1' },
          { id: 'g3', name: 'Execute micro-step', xp_reward: 50, priority: 'medium' as const, is_completed: false, category_id: 'general-1' }
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
        setCategories((prev: Category[]) => prev.map((cat: Category) => 
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

  // Create Category
  const handleCreateCategory = async () => {
    if (!userId || !sphere) return
    const name = newCategoryName.trim()
    if (!name) { setAddCategoryError('Введите название категории'); return }
    setIsCreatingCategory(true)
    setAddCategoryError(null)
    try {
      const { data, error } = await supabase
        .from('sphere_categories')
        .insert([{ user_id: userId, sphere_id: sphere.id, name, progress: 0 }])
        .select()
        .single()
      if (error) throw error

      const newCat: Category = { id: data.id, name: data.name, progress: 0, total_tasks: 0, completed_tasks: 0, tasks: [], icon: '📋' }
      setCategories((prev: Category[]) => [newCat, ...prev])
      setSelectedCategory(newCat.id)
      setIsAddCategoryOpen(false)
      setNewCategoryName('')
    } catch (e:any) {
      setAddCategoryError(e.message || 'Не удалось создать категорию')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  // Create Task
  const handleCreateTask = async () => {
    if (!userId || !selectedCategory) return
    const name = newTaskName.trim()
    if (!name) { setAddTaskError('Введите название задачи'); return }
    setIsCreatingTask(true)
    setAddTaskError(null)
    try {
      const { data, error } = await supabase
        .from('sphere_tasks')
        .insert([{ user_id: userId, category_id: selectedCategory, task_name: name, xp_reward: newTaskXP, priority: newTaskPriority, is_completed: false }])
        .select()
        .single()
      if (error) throw error

      const newTask: Task = { id: data.id, name: data.task_name, xp_reward: data.xp_reward, priority: data.priority, is_completed: false, category_id: selectedCategory }
      setCategories((prev: Category[]) => prev.map((cat: Category) => cat.id === selectedCategory ? { ...cat, tasks: [newTask, ...cat.tasks], total_tasks: (cat.total_tasks || 0) + 1 } : cat))
      setIsAddTaskOpen(false)
      setNewTaskName('')
      setNewTaskXP(50)
      setNewTaskPriority('medium')
      // bind for declaration if modal open
      if (isDeclareOpen) setBindTaskId(data.id)
    } catch (e:any) {
      setAddTaskError(e.message || 'Не удалось создать задачу')
    } finally {
      setIsCreatingTask(false)
    }
  }

  // Переключение выполнения задачи
  const toggleTaskCompletion = async (taskId: string, categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    const task = category?.tasks.find(t => t.id === taskId)
    
    if (!task) return

    const newCompletionStatus = !task.is_completed
    
    // Обновляем локальное состояние
    setCategories((prev: Category[]) => prev.map((cat: Category) => 
      cat.id === categoryId 
        ? {
            ...cat,
            tasks: cat.tasks.map((t: Task) => 
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

        // Try mark related declaration as completed
        try {
          if (userId) {
            const { data: dec } = await supabase
              .from('task_declarations')
              .select('id')
              .eq('user_id', userId)
              .eq('task_id', taskId)
              .eq('status', 'declared')
              .maybeSingle()
            if (dec?.id) {
              await markDeclarationCompleted(userId, dec.id)
            }
          }
        } catch {}

      } catch (error) {
        console.error('Error updating task completion:', error)
      }
    }
  }

  const handleDeclare = async () => {
    if (!userId || !sphere) return
    const title = declareTitle.trim() || newTaskName.trim() || 'Задача'
    const dueISO = declareDue ? new Date(declareDue).toISOString() : new Date().toISOString()
    setDeclaring(true)
    try {
      await declareTask(userId, sphere.id, title, dueISO, bindTaskId)
      setIsDeclareOpen(false)
      setDeclareTitle('')
      setDeclareDue('')
      setBindTaskId(null)
    } catch (e) {
      console.error('Declare task error', e)
    } finally {
      setDeclaring(false)
    }
  }

  // 🚀 МАКСИМАЛЬНАЯ ОПТИМИЗАЦИЯ: Не рендерим если закрыто
  if (!isOpen || !sphere) {
    return null
  }

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory)

  return (
    <>
      {/* 🚀 BACKDROP с фиксированным позиционированием и улучшенной обработкой событий */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ${
          isOpen ? 'opacity-100 z-[999]' : 'opacity-0 pointer-events-none z-[-1]'
        }`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem'
        }}
        onClick={handleBackdropClick}
      >
        {/* 🚀 МОДАЛЬНОЕ ОКНО с принудительным центрированием */}
        <div 
          className={`bg-gray-800 rounded-xl shadow-2xl flex overflow-hidden border border-gray-600 transform transition-all duration-300 ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          style={{
            width: '100%',
            maxWidth: '1152px', // max-w-6xl = 72rem = 1152px
            height: '100%',
            maxHeight: '90vh',
            position: 'relative',
            margin: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* 🚀 ЛЕВАЯ ПАНЕЛЬ - Категории */}
          <div className="w-1/3 bg-gray-900 p-6 border-r border-gray-700 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">{sphere.icon}</span>
                <span className="truncate">{sphere.name}</span>
              </h2>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => setIsAddCategoryOpen(true)}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  title="Добавить категорию"
                >
                  + Категория
                </button>
                <button
                  onClick={handleForceClose}
                  className="text-gray-400 hover:text-white hover:bg-gray-700 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  title="Закрыть (ESC)"
                >
                  ✕
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                <div className="text-sm text-gray-400 mb-3">
                  Категории развития ({categories.length})
                </div>
                
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📁</div>
                    <div className="text-sm">Пока нет категорий</div>
                    <button
                      onClick={() => createDefaultCategoriesForSphere()}
                      className="mt-3 text-purple-400 hover:text-purple-300 text-sm underline transition-colors"
                    >
                      Создать базовые категории
                    </button>
                  </div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedCategory === category.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{category.icon}</span>
                          <span className="font-medium truncate">{category.name}</span>
                        </div>
                        <span className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                          {category.progress}%
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 🚀 ПРАВАЯ ПАНЕЛЬ - Детали категории */}
          <div className="flex-1 bg-gray-800 flex flex-col">
            {selectedCategoryData ? (
              <>
                {/* Заголовок категории */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{selectedCategoryData.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedCategoryData.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex-1 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${selectedCategoryData.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-purple-400 font-medium">
                            {selectedCategoryData.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsAddTaskOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        + Задача
                      </button>
                      <button
                        onClick={() => setIsDeclareOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        🎯 Обещание
                      </button>
                    </div>
                  </div>
                </div>

                {/* Контент категории */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="text-sm text-gray-400">
                      Задачи для выполнения
                    </div>
                    
                    {/* Здесь будут задачи */}
                    <div className="space-y-3">
                      {/* Заглушка задач */}
                      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input type="checkbox" className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500" />
                            <span className="text-white">Пример задачи</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">+50 XP</span>
                            <span className="text-xs text-green-400">Высокий</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* XP Progress */}
                    <div className="mt-8 p-4 bg-gradient-to-r from-purple-900/50 to-purple-800/50 rounded-lg border border-purple-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">Заработано XP</div>
                          <div className="text-2xl font-bold text-purple-400">{totalXPEarned}</div>
                        </div>
                        <div className="text-4xl">⭐</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <div className="text-lg">Выберите категорию</div>
                  <div className="text-sm mt-2">чтобы увидеть задачи и прогресс</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 МОДАЛЬНЫЕ ОКНА для добавления категорий/задач */}
      {/* Добавление категории */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000]" onClick={() => setIsAddCategoryOpen(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-white font-semibold mb-4 text-lg">Добавить категорию</h4>
            {addCategoryError && (
              <div className="bg-red-900/50 border border-red-600 text-red-300 p-3 rounded-lg mb-4 text-sm">
                {addCategoryError}
              </div>
            )}
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название категории..."
              className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
              >
                {isCreatingCategory ? 'Создание...' : 'Создать'}
              </button>
              <button
                onClick={() => {
                  setIsAddCategoryOpen(false)
                  setNewCategoryName('')
                  setAddCategoryError(null)
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-3 px-4 rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка добавления задачи */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]" onClick={()=>setIsAddTaskOpen(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 w-full max-w-sm mx-4" onClick={(e)=>e.stopPropagation()}>
            <h4 className="text-white font-semibold mb-3">Добавить задачу</h4>
            <input
              type="text"
              value={newTaskName}
              onChange={(e)=>setNewTaskName(e.target.value)}
              placeholder="Например: Бой с тенью в лесу"
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-2 mb-2">
              <input
                type="number"
                min={0}
                value={newTaskXP}
                onChange={(e)=>setNewTaskXP(Number(e.target.value))}
                className="flex-1 bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="XP"
              />
              <select
                value={newTaskPriority}
                onChange={(e)=>setNewTaskPriority(e.target.value as any)}
                className="w-32 bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">Высокий</option>
                <option value="medium">Средний</option>
                <option value="low">Низкий</option>
              </select>
            </div>
            {addTaskError && <div className="text-red-400 text-xs mb-2">{addTaskError}</div>}
            <div className="flex space-x-2">
              <button
                onClick={handleCreateTask}
                disabled={isCreatingTask}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded px-3 py-2"
              >
                {isCreatingTask ? 'Создание...' : 'Создать'}
              </button>
              <button
                onClick={()=>setIsAddTaskOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded px-3 py-2"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка декларации задачи */}
      {isDeclareOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]" onClick={()=>setIsDeclareOpen(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 w-full max-w-sm mx-4" onClick={(e)=>e.stopPropagation()}>
            <h4 className="text-white font-semibold mb-3">Декларировать задачу</h4>
            <input
              type="text"
              value={declareTitle}
              onChange={(e)=>setDeclareTitle(e.target.value)}
              placeholder="Название (если пусто — возьмем из новой задачи)"
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2 outline-none focus:ring-2 focus:ring-amber-500"
            />
            <label className="text-sm text-gray-300">Дедлайн</label>
            <input
              type="datetime-local"
              value={declareDue}
              onChange={(e)=>setDeclareDue(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="text-xs text-gray-400 mb-2">Подсказка: если сейчас создадите задачу, декларация привяжется к ней автоматически.</div>
            <div className="flex space-x-2">
              <button
                onClick={handleDeclare}
                disabled={declaring}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white rounded px-3 py-2"
              >
                {declaring ? 'Создание...' : 'Создать'}
              </button>
              <button
                onClick={()=>setIsDeclareOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded px-3 py-2"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 