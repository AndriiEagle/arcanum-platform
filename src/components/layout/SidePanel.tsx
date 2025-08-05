'use client'

import { useUIStore } from '../../../lib/stores/uiStore'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase/client'

interface SidePanelProps {
  position: 'left' | 'right';
}

interface Sphere {
  id: string
  name: string
  health_percentage: number
  icon: string
}

interface ProgrammableButton {
  id: string
  label: string
  action: string
  icon: string
  isActive: boolean
}

interface Category {
  id: string
  name: string
  type: 'skill' | 'ability' | 'custom'
  progress: number
}

export default function SidePanel({ position }: SidePanelProps) {
  const { 
    isLeftPanelOpen, 
    isRightPanelOpen, 
    toggleLeftPanel, 
    toggleRightPanel 
  } = useUIStore()
  
  const userId = useCurrentUserId()
  const [spheres, setSpheres] = useState<Sphere[]>([])
  const [isLoadingSpheres, setIsLoadingSpheres] = useState(false)
  const [programmableButtons, setProgrammableButtons] = useState<ProgrammableButton[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showAddButton, setShowAddButton] = useState(false)
  const [newButtonLabel, setNewButtonLabel] = useState('')
  
  const isOpen = position === 'left' ? isLeftPanelOpen : isRightPanelOpen
  const togglePanel = position === 'left' ? toggleLeftPanel : toggleRightPanel
  
  const supabase = createClient()
  
  // Загрузка всех данных при инициализации
  useEffect(() => {
    if (userId && position === 'left') {
      loadUserSpheres()
      loadProgrammableButtons()
      loadCategories()
    }
  }, [userId, position])
  
  const loadUserSpheres = async () => {
    if (!userId) return
    
    setIsLoadingSpheres(true)
    try {
      const { data, error } = await supabase
        .from('life_spheres')
        .select('id, sphere_name, health_percentage')
        .eq('user_id', userId)
        .order('sphere_name')
      
      if (error) {
        console.error('Error loading spheres:', error)
        // Создаем базовые сферы для нового пользователя
        setSpheres([
          { id: '1', name: 'Здоровье', health_percentage: 78, icon: '💪' },
          { id: '2', name: 'Карьера', health_percentage: 92, icon: '💼' },
          { id: '3', name: 'Финансы', health_percentage: 88, icon: '💰' },
          { id: '4', name: 'Отношения', health_percentage: 65, icon: '❤️' },
          { id: '5', name: 'Саморазвитие', health_percentage: 73, icon: '📚' }
        ])
      } else if (data && data.length > 0) {
        const mappedSpheres = data.map((sphere: { id: string; sphere_name: string; health_percentage: number }) => ({
          id: sphere.id,
          name: sphere.sphere_name,
          health_percentage: sphere.health_percentage,
          icon: getSphereIcon(sphere.sphere_name)
        }))
        setSpheres(mappedSpheres)
      } else {
        // Создаем базовые сферы для нового пользователя
        setSpheres([
          { id: '1', name: 'Здоровье', health_percentage: 50, icon: '💪' },
          { id: '2', name: 'Карьера', health_percentage: 50, icon: '💼' },
          { id: '3', name: 'Финансы', health_percentage: 50, icon: '💰' }
        ])
      }
    } catch (error) {
      console.error('Error in loadUserSpheres:', error)
    } finally {
      setIsLoadingSpheres(false)
    }
  }

  const loadProgrammableButtons = async () => {
    if (!userId) return
    
    try {
      // Пока используем базовые кнопки, но структура готова для БД
      setProgrammableButtons([
        { id: '1', label: 'Квесты', action: 'open_quests', icon: '🎯', isActive: true },
        { id: '2', label: 'Статы', action: 'show_stats', icon: '📊', isActive: true },
        { id: '3', label: 'Инвентарь', action: 'open_inventory', icon: '🎒', isActive: true }
      ])
    } catch (error) {
      console.error('Error loading programmable buttons:', error)
    }
  }

  const loadCategories = async () => {
    if (!userId) return
    
    try {
      // Динамические категории на основе активности пользователя
      setCategories([
        { id: '1', name: 'Физические Способности', type: 'ability', progress: 78 },
        { id: '2', name: 'Ментальные Навыки', type: 'skill', progress: 92 },
        { id: '3', name: 'Социальные Связи', type: 'skill', progress: 65 },
        { id: '4', name: 'Творческие Таланты', type: 'ability', progress: 45 }
      ])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }
  
  const getSphereIcon = (sphereName: string): string => {
    const iconMap: Record<string, string> = {
      'Здоровье': '💪', 'Карьера': '💼', 'Отношения': '❤️', 'Финансы': '💰',
      'Саморазвитие': '📚', 'Хобби': '🎨', 'Духовность': '🧘', 'Семья': '👨‍👩‍👧‍👦',
      'Друзья': '👥', 'Путешествия': '✈️', 'Жилье': '🏠', 'Экология': '🌱'
    }
    return iconMap[sphereName] || '⭐'
  }

  const handleButtonAction = (action: string) => {
    console.log(`Executing action: ${action}`)
    // Здесь будет логика выполнения действий кнопок
    switch (action) {
      case 'open_quests':
        // Открыть панель квестов
        break
      case 'show_stats':
        // Показать детальную статистику
        break
      case 'open_inventory':
        // Открыть инвентарь
        break
      default:
        console.log('Unknown action:', action)
    }
  }

  const addNewButton = async () => {
    if (!newButtonLabel.trim()) return
    
    const newButton: ProgrammableButton = {
      id: `btn_${Date.now()}`,
      label: newButtonLabel,
      action: 'custom_action',
      icon: '⚡',
      isActive: true
    }
    
    setProgrammableButtons(prev => [...prev, newButton])
    setNewButtonLabel('')
    setShowAddButton(false)
    
    // TODO: Сохранить в БД когда будет готова таблица programmable_buttons
  }

  return (
    <div className={`
      bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out relative
      ${isOpen ? 'w-[15%]' : 'w-[5%]'}
    `}>
      {/* Кнопка переключения */}
      <button 
        onClick={togglePanel}
        className="absolute -right-3 top-4 w-6 h-6 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white text-xs transition-colors z-10"
        title={isOpen ? 'Свернуть панель' : 'Развернуть панель'}
      >
        {isOpen ? '◀' : '▶'}
      </button>
    
      <div className={`p-4 ${!isOpen && 'px-2'}`}>
        {isOpen ? (
          <>
            <h2 className="text-lg font-semibold text-gray-300 mb-4">
              {position === 'left' ? 'Управление' : 'Правая панель'}
            </h2>
            
            {/* Программируемые кнопки */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Быстрые действия</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {programmableButtons.map((button) => (
                  <button 
                    key={button.id}
                    onClick={() => handleButtonAction(button.action)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 p-2 rounded text-sm font-medium transition-all duration-200 transform hover:scale-105"
                    title={`Действие: ${button.action}`}
                  >
                    {button.icon} {button.label}
                  </button>
                ))}
                <button 
                  onClick={() => setShowAddButton(true)}
                  className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-gray-400 hover:text-white transition-colors border-2 border-dashed border-gray-600"
                  title="Добавить кнопку"
                >
                  ➕
                </button>
              </div>

              {/* Форма добавления новой кнопки */}
              {showAddButton && (
                <div className="bg-gray-750 p-3 rounded mb-4">
                  <input
                    type="text"
                    placeholder="Название кнопки"
                    value={newButtonLabel}
                    onChange={(e) => setNewButtonLabel(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mb-2"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addNewButton}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {setShowAddButton(false); setNewButtonLabel('')}}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              )}
              
              {/* Динамические категории способностей */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Развитие</h3>
                {categories.map((category) => (
                  <div key={category.id} className="bg-gray-750 p-2 rounded hover:bg-gray-700 transition-colors cursor-pointer">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-300">{category.name}</span>
                      <span className="text-xs text-gray-500">{category.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-1">
                      <div 
                        className={`h-1 rounded-full transition-all duration-300 ${
                          category.type === 'ability' ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                        }`}
                        style={{ width: `${category.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Сферы жизни */}
            <div className="flex-1 mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Сферы жизни</h3>
              {isLoadingSpheres ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {spheres.map((sphere) => (
                    <div key={sphere.id} className="flex items-center space-x-2 p-2 bg-gray-750 rounded hover:bg-gray-700 transition-colors cursor-pointer">
                      <span className="text-lg">{sphere.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{sphere.name}</div>
                        <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                          <div 
                            className={`h-1 rounded-full transition-all duration-300 ${
                              sphere.health_percentage >= 80 ? 'bg-green-500' :
                              sphere.health_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${sphere.health_percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{sphere.health_percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Нижние кнопки настроек */}
            <div className="space-y-2">
              <button className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-left transition-colors">
                ⚙️ Настройки
              </button>
              <button className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-left transition-colors">
                👤 Профиль
              </button>
              <button className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-left transition-colors">
                ❓ Помощь
              </button>
            </div>
          </>
        ) : (
          /* Свернутое состояние - только иконки */
          <div className="space-y-3">
            {programmableButtons.slice(0, 3).map((button) => (
              <button 
                key={button.id}
                onClick={() => handleButtonAction(button.action)}
                className="w-full aspect-square bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center text-lg transition-colors"
                title={button.label}
              >
                {button.icon}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6B7280;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  )
} 