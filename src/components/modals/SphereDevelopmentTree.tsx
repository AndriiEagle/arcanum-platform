'use client'

import { useState, useEffect } from 'react'
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
          tasks: (cat.tasks || []).map((t:any)=>({
            id: t.id,
            name: t.task_name,
            xp_reward: t.xp_reward,
            priority: t.priority,
            is_completed: t.is_completed,
            category_id: t.category_id
          })),
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

  const getDefaultCategoriesForSphere = (_sphereName: string) => {
    // Generic defaults independent of legacy names
    return [
      {
        id: 'general-1',
        name: 'Core Improvements',
        progress: 0,
        total_tasks: 3,
        completed_tasks: 0,
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
        .insert([{ user_id: userId, sphere_id: sphere.id, category_name: name, progress: 0 }])
        .select()
        .single()
      if (error) throw error

      const newCat: Category = { id: data.id, name: data.category_name, progress: 0, total_tasks: 0, completed_tasks: 0, tasks: [] }
      setCategories(prev => [newCat, ...prev])
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
      setCategories(prev => prev.map(cat => cat.id === selectedCategory ? { ...cat, tasks: [newTask, ...cat.tasks], total_tasks: (cat.total_tasks || 0) + 1 } : cat))
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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsAddCategoryOpen(true)}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                title="Добавить категорию"
              >
                + Категория
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-bold text-white mb-2">
                      {selectedCategoryData.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsAddTaskOpen(true)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                        title="Добавить задачу"
                      >
                        + Задача
                      </button>
                      <button
                        onClick={() => setIsDeclareOpen(true)}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded"
                        title="Задекларировать цель"
                      >
                        Декларировать
                      </button>
                    </div>
                  </div>
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
                <div className="flex-1 max-w-[120px] flex flex-col items-center">
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

      {/* Модалка добавления категории */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={()=>setIsAddCategoryOpen(false)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 w-full max-w-sm mx-4" onClick={(e)=>e.stopPropagation()}>
            <h4 className="text-white font-semibold mb-3">Добавить категорию</h4>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e)=>setNewCategoryName(e.target.value)}
              placeholder="Например: Бокс"
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-2 outline-none focus:ring-2 focus:ring-purple-500"
            />
            {addCategoryError && <div className="text-red-400 text-xs mb-2">{addCategoryError}</div>}
            <div className="flex space-x-2">
              <button
                onClick={handleCreateCategory}
                disabled={isCreatingCategory}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded px-3 py-2"
              >
                {isCreatingCategory ? 'Создание...' : 'Создать'}
              </button>
              <button
                onClick={()=>setIsAddCategoryOpen(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded px-3 py-2"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка добавления задачи */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={()=>setIsAddTaskOpen(false)}>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={()=>setIsDeclareOpen(false)}>
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
    </div>
  )
} 