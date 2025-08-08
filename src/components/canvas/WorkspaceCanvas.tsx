'use client'

import { useState, useEffect, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import debounce from 'lodash.debounce'
import { createClient } from '../../../lib/supabase/client'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import { useUIStore } from '../../../lib/stores/uiStore'
import DraggableWidget from './DraggableWidget'
import HeaderImageWidget from '../widgets/HeaderImageWidget'
import StatsColumnWidget from '../widgets/StatsColumnWidget'

interface Widget {
  id: string
  type: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
}

export default function WorkspaceCanvas() {
  const userId = useCurrentUserId()
  const { middleMousePanEnabled } = useUIStore()
  const [isMiddlePanning, setIsMiddlePanning] = useState(false)
  
  // Состояние для масштабирования
  const [transformState, setTransformState] = useState({
    scale: 1,
    positionX: 0,
    positionY: 0,
  })

  const handleTransformed = useCallback((ref: any, state: { scale: number; positionX: number; positionY: number }) => {
    setTransformState((prev) => {
      if (
        prev.scale === state.scale &&
        prev.positionX === state.positionX &&
        prev.positionY === state.positionY
      ) {
        return prev
      }
      return {
        scale: state.scale,
        positionX: state.positionX,
        positionY: state.positionY,
      }
    })
  }, [])

  // Состояние для управления интерфейсом
  const [showControlsInfo, setShowControlsInfo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Состояние для виджетов
  const [widgets, setWidgets] = useState<Widget[]>([
    {
      id: 'header-image-widget',
      type: 'HeaderImageWidget',
      position: { x: 150, y: 80 },
      data: {}
    },
    {
      id: 'stats-column-widget',
      type: 'StatsColumnWidget', 
      position: { x: 50, y: 120 },
      data: {}
    },
    {
      id: 'stats-widget',
      type: 'StatsWidget',
      position: { x: 500, y: 150 },
      data: { title: '📊 Stats Widget', content: 'Параметры пользователя' }
    },
    {
      id: 'quest-widget', 
      type: 'QuestWidget',
      position: { x: 700, y: 300 },
      data: { title: '🎯 Quest Widget', content: 'Активные задачи' }
    },
    {
      id: 'growth-widget',
      type: 'GrowthWidget', 
      position: { x: 600, y: 500 },
      data: { title: '🌱 Growth Widget', content: 'Прогресс развития' }
    }
  ])

  // Создаем Supabase клиент
  // Убираем глобальное создание клиента; создаем локально в местах использования

  // Функция загрузки макета из Supabase
  const loadLayout = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Получаем user ID из системы авторизации
      if (!userId) {
        console.log('User not authenticated, using default layout')
        setIsLoading(false)
        return
      }
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('ui_layouts')
        .select('layout_config')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading layout:', error)
        return
      }

      if (data?.layout_config?.widgets) {
        setWidgets(data.layout_config.widgets)
      }
    } catch (error) {
      console.error('Error loading layout:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Функция сохранения макета в Supabase
  const saveLayout = useCallback(async (widgetsToSave: Widget[]) => {
    if (!userId) return
    
    try {
      const supabase = createClient()
      const layoutConfig = {
        widgets: widgetsToSave,
        lastUpdated: new Date().toISOString()
      }

      const { error } = await supabase
        .from('ui_layouts')
        .upsert({
          user_id: userId,
          layout_config: layoutConfig,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving layout:', error)
      } else {
        console.log('Layout saved successfully')
      }
    } catch (error) {
      console.error('Error saving layout:', error)
    }
  }, [userId])

  // Debounced версия saveLayout для избежания частых сохранений
  const debouncedSaveLayout = useCallback(
    debounce((widgets: Widget[]) => {
      saveLayout(widgets)
    }, 1000),
    [saveLayout]
  )

  // Обработчик завершения перетаскивания
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    
    if (!delta) return

    setWidgets(prevWidgets => {
      const updatedWidgets = prevWidgets.map(widget => {
        if (widget.id === active.id) {
          return {
            ...widget,
            position: {
              x: widget.position.x + delta.x,
              y: widget.position.y + delta.y
            }
          }
        }
        return widget
      })

      // Сохраняем с debounce
      debouncedSaveLayout(updatedWidgets)
      
      return updatedWidgets
    })
  }

  // Загружаем макет при монтировании
  useEffect(() => {
    loadLayout()
  }, [loadLayout])

  // Рендеринг виджета по типу
  const renderWidgetContent = (widget: Widget) => {
    const { title, content } = widget.data || {}
    const titleStr = typeof title === 'string' ? title : 'Unknown Title'
    const contentStr = typeof content === 'string' ? content : 'No content'
    
    switch (widget.type) {
      case 'StatsWidget':
        return (
          <div className="bg-purple-800/90 backdrop-blur-sm rounded-lg p-4 border border-purple-700 shadow-xl min-w-[200px]">
            <h4 className="text-purple-300 font-medium mb-2">{titleStr}</h4>
            <p className="text-gray-400 text-sm">{contentStr}</p>
            <div className="mt-3 space-y-1 text-xs text-purple-200">
              <div>Уровень: 15</div>
              <div>XP: 2,340 / 3,000</div>
              <div>Энергия: 85%</div>
            </div>
          </div>
        )
      
      case 'QuestWidget':
        return (
          <div className="bg-blue-800/90 backdrop-blur-sm rounded-lg p-4 border border-blue-700 shadow-xl min-w-[200px]">
            <h4 className="text-blue-300 font-medium mb-2">{titleStr}</h4>
            <p className="text-gray-400 text-sm">{contentStr}</p>
            <div className="mt-3 space-y-1 text-xs text-blue-200">
              <div>• Медитация (15 мин)</div>
              <div>• Код-ревью проекта</div>
              <div>• Тренировка</div>
            </div>
          </div>
        )
      
      case 'GrowthWidget':
        return (
          <div className="bg-green-800/90 backdrop-blur-sm rounded-lg p-4 border border-green-700 shadow-xl min-w-[200px]">
            <h4 className="text-green-300 font-medium mb-2">{titleStr}</h4>
            <p className="text-gray-400 text-sm">{contentStr}</p>
            <div className="mt-3 space-y-1 text-xs text-green-200">
              <div>Здоровье: +15%</div>
              <div>Финансы: +8%</div>
              <div>Навыки: +23%</div>
            </div>
          </div>
        )
      
      case 'HeaderImageWidget':
        return <HeaderImageWidget {...widget.data} />
      
      case 'StatsColumnWidget':
        return <StatsColumnWidget {...widget.data} />
      
      default:
        return (
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700 shadow-xl">
            <h4 className="text-gray-300 font-medium mb-2">Unknown Widget</h4>
            <p className="text-gray-400 text-sm">Тип: {widget.type}</p>
          </div>
        )
    }
  }

  return (
    <div className="w-full h-full bg-gray-900 relative overflow-hidden">
      {/* Индикатор загрузки */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-blue-500 shadow-xl">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white text-sm">Загрузка макета...</span>
          </div>
        </div>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={5}
          centerOnInit={false}
          centerZoomedOut={false}
          limitToBounds={false}
          wheel={{ 
            wheelDisabled: false,
            touchPadDisabled: false,
            step: 0.15,
            activationKeys: [],
            excluded: []
          }}
          panning={{ 
            disabled: middleMousePanEnabled ? !isMiddlePanning : false,
            velocityDisabled: true,
            activationKeys: [],
            excluded: ['.draggable-widget', '.widget-content', 'button', 'input', 'textarea']
          }}
          doubleClick={{ 
            disabled: true
          }}
          pinch={{
            disabled: false
          }}
          onTransformed={handleTransformed}
        >
          <TransformComponent
            wrapperClass="w-full h-full"
            contentClass="w-full h-full relative"
          >
            <div
              className="relative min-w-[200vw] min-h-[200vh] bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900/20"
              onMouseDown={(e)=>{ if (middleMousePanEnabled && e.button === 1) setIsMiddlePanning(true) }}
              onMouseUp={(e)=>{ if (e.button === 1) setIsMiddlePanning(false) }}
              onMouseLeave={()=> setIsMiddlePanning(false)}
            >
              {/* Сетка для визуального ориентира */}
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" className="w-full h-full">
                  <defs>
                    <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" strokeWidth="0.5"/>
                    </pattern>
                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                      <rect width="100" height="100" fill="url(#smallGrid)"/>
                      <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Центральная точка фокуса */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-white/20">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-white font-semibold text-lg">Центр Вселенной</h3>
                  <p className="text-gray-400 text-sm mt-1">Главный фокус платформы</p>
                </div>
              </div>

              {/* Перетаскиваемые виджеты */}
              {widgets.map((widget) => (
                <DraggableWidget
                  key={widget.id}
                  id={widget.id}
                  initialPosition={widget.position}
                >
                  {renderWidgetContent(widget)}
                </DraggableWidget>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </DndContext>

      {/* Панель управления масштабом */}
      <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 shadow-xl">
        <div className="text-xs text-gray-400 mb-2">Масштаб: {transformState.scale.toFixed(2)}x</div>
        <div className="text-xs text-gray-400">X: {transformState.positionX.toFixed(0)}</div>
        <div className="text-xs text-gray-400">Y: {transformState.positionY.toFixed(0)}</div>
        <div className="text-xs text-green-400 mt-2">Виджетов: {widgets.length}</div>
      </div>

      {/* Кнопка показа/скрытия информации об управлении */}
      <button
        onClick={() => setShowControlsInfo(!showControlsInfo)}
        className="absolute top-4 left-4 w-12 h-12 bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm rounded-full border border-gray-700 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 z-30"
        title={showControlsInfo ? 'Скрыть инструкции' : 'Показать инструкции'}
      >
        <span className="text-2xl">{showControlsInfo ? '❌' : '❓'}</span>
      </button>

      {/* Управляемая панель инструкций */}
      {showControlsInfo && (
        <div className="absolute top-20 left-4 bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 border border-gray-700 shadow-xl max-w-xs z-20 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">🎮 Управление</h4>
            <button
              onClick={() => setShowControlsInfo(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-gray-400 space-y-2">
            <div className="flex items-start space-x-2">
              <span>🖱️</span>
              <span>Зажми ЛКМ и тяни для панорамирования</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>🔄</span>
              <span>Колесико мыши для плавного масштабирования</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>✋</span>
              <span className="text-purple-400">Тяни виджеты для перемещения</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>📌</span>
              <span className="text-blue-400">Позиция сохраняется автоматически</span>
            </div>
          </div>
        </div>
      )}

      {/* Стили для анимации */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
} 