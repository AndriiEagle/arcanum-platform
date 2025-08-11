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
import ImageWidget from '../widgets/ImageWidget'
import InventoryWidget from '../widgets/InventoryWidget'
import { uploadImageResized } from '../../../lib/services/imageUpload'

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
  const [minimizedMap, setMinimizedMap] = useState<Record<string, boolean>>({})
  
  // Состояние для масштабирования
  const [transformState, setTransformState] = useState({
    scale: 1,
    positionX: 0,
    positionY: 0,
  })

  // NOTE: отключено обновление transformState во время трансформаций, чтобы
  // исключить потенциальный цикл обновлений. При необходимости можно вернуть
  // обработчик с дебаунсом/raf.

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

  // Загрузка/сохранение состояния минификации виджетов (localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('MINIMIZED_WIDGETS')
      if (raw) setMinimizedMap(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem('MINIMIZED_WIDGETS', JSON.stringify(minimizedMap)) } catch {}
  }, [minimizedMap])

  const toggleMinimized = (id: string) => {
    setMinimizedMap(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Добавление/удаление виджетов с сохранением
  const addWidget = (type: Widget['type']) => {
    const id = `w_${Date.now()}`
    const newWidget: Widget = {
      id,
      type,
      position: { x: 300, y: 200 },
      data: {}
    }
    setWidgets(prev => {
      const updated = [...prev, newWidget]
      setTimeout(() => debouncedSaveLayout(updated), 0)
      return updated
    })
  }

  const removeWidget = (id: string) => {
    setWidgets(prev => {
      const updated = prev.filter(w => w.id !== id)
      setTimeout(() => debouncedSaveLayout(updated), 0)
      return updated
    })
    setMinimizedMap(prev => { const { [id]: _, ...rest } = prev; return rest })
  }

  const [showAddMenu, setShowAddMenu] = useState(false)

  const getWidgetIcon = (w: Widget): string => {
    switch (w.type) {
      case 'StatsWidget': return '📊'
      case 'QuestWidget': return '🎯'
      case 'GrowthWidget': return '🌱'
      case 'HeaderImageWidget': return '🖼️'
      case 'StatsColumnWidget': return '📊'
      case 'ImageWidget': return '🖼️'
      default: return '📦'
    }
  }

  const getWidgetTitle = (w: Widget): string => {
    const title = (w.data && (w.data as any).title) as string | undefined
    if (title && typeof title === 'string') return title
    switch (w.type) {
      case 'StatsWidget': return 'Stats'
      case 'QuestWidget': return 'Quests'
      case 'GrowthWidget': return 'Growth'
      case 'HeaderImageWidget': return 'Header'
      case 'StatsColumnWidget': return 'Командный Центр'
      case 'ImageWidget': return 'Снимок'
      default: return 'Widget'
    }
  }

  // Пасте/дроп картинок → создаём ImageWidget
  const addImageWidget = useCallback((url: string) => {
    const id = `img_${Date.now()}`
    const newWidget: Widget = {
      id,
      type: 'ImageWidget',
      position: { x: 400, y: 120 },
      data: { url, title: 'Скриншот' }
    }
    setWidgets(prev => {
      const updated = [...prev, newWidget]
      setTimeout(() => debouncedSaveLayout(updated), 0)
      return updated
    })
  }, [])

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          try {
            const { url } = await uploadImageResized(file, { bucket: 'public-assets', pathPrefix: `screenshots/${userId || 'anon'}`, maxSize: 1920 })
            addImageWidget(url)
          } catch (err) {
            console.error('Upload failed:', err)
          }
          e.preventDefault()
          return
        }
      }
    }
  }, [addImageWidget, userId])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || [])
    const img = files.find(f => f.type.startsWith('image/'))
    if (img) {
      try {
        const { url } = await uploadImageResized(img, { bucket: 'public-assets', pathPrefix: `screenshots/${userId || 'anon'}`, maxSize: 1920 })
        addImageWidget(url)
      } catch (err) {
        console.error('Upload failed:', err)
      }
    }
  }, [addImageWidget, userId])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    e.preventDefault()
  }, [])

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
        // Убираем MusicPlayerWidget из сохранённого макета — глобальный плеер рендерится в лейауте
        const sanitized = (data.layout_config.widgets as Widget[]).filter(w => w.type !== 'MusicPlayerWidget')
        setWidgets(sanitized)
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

  // Глобальный обработчик открытия нужного виджета из боковой панели
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: string }
      const type = detail?.type
      if (!type) return
      setWidgets(prev => {
        const existingIndex = prev.findIndex(w => w.type === type)
        if (existingIndex >= 0) {
          // Поднять существующий виджет наверх (визуально спереди)
          const updated = [...prev]
          const [found] = updated.splice(existingIndex, 1)
          updated.push(found)
          setTimeout(() => debouncedSaveLayout(updated), 0)
          return updated
        }
        const id = `w_${Date.now()}`
        const newWidget: Widget = {
          id,
          type,
          position: { x: 320, y: 220 },
          data: {}
        }
        const updated = [...prev, newWidget]
        setTimeout(() => debouncedSaveLayout(updated), 0)
        return updated
      })
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('OPEN_WIDGET', handler as EventListener)
      return () => window.removeEventListener('OPEN_WIDGET', handler as EventListener)
    }
  }, [debouncedSaveLayout])

  // Рендеринг виджета по типу
  const renderWidgetContent = (widget: Widget) => {
    const { title, content, url } = widget.data || {}
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
      // Убрано: MusicPlayerWidget рендерится глобально из лейаута, чтобы не было дублей
      case 'ImageWidget':
        return <ImageWidget url={String(url || '')} title={titleStr} />
      case 'InventoryWidget':
        return <InventoryWidget />
      
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
    <div className="w-full h-full bg-gray-900 relative overflow-hidden"
         onPaste={handlePaste}
         onDrop={handleDrop}
         onDragOver={handleDragOver}
    >
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
          initialScale={1.2}
          minScale={0.25}
          maxScale={8}
          centerOnInit={true}
          centerZoomedOut={true}
          limitToBounds={false}
          wheel={{ 
            wheelDisabled: false,
            touchPadDisabled: false,
            step: 0.2,
            activationKeys: [],
            excluded: []
          }}
          panning={{ 
            disabled: middleMousePanEnabled ? !isMiddlePanning : false,
            velocityDisabled: true,
            activationKeys: [],
            excluded: ['draggable-widget', 'widget-content', 'button', 'input', 'textarea']
          }}
          doubleClick={{ 
            disabled: false
          }}
          pinch={{
            disabled: false
          }}
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
                  disabled={false}
                >
                  <div className="relative">
                    {/* Кнопка сворачивания/разворачивания */}
                    <button
                      onPointerDown={(e)=>{ e.stopPropagation(); e.preventDefault() }}
                      onMouseDown={(e)=>{ e.stopPropagation(); e.preventDefault() }}
                      onClick={(e)=>{ e.stopPropagation(); toggleMinimized(widget.id) }}
                      className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 shadow"
                      title={minimizedMap[widget.id] ? 'Развернуть' : 'Свернуть'}
                    >
                      {minimizedMap[widget.id] ? '▣' : '▭'}
                    </button>

                    {/* Кнопка удаления */}
                    <button
                      onPointerDown={(e)=>{ e.stopPropagation(); e.preventDefault() }}
                      onMouseDown={(e)=>{ e.stopPropagation(); e.preventDefault() }}
                      onClick={(e)=>{ e.stopPropagation(); removeWidget(widget.id) }}
                      className="absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:bg-red-700/60 shadow"
                      title="Удалить виджет"
                      aria-label="Удалить виджет"
                    >×</button>

                    {minimizedMap[widget.id] ? (
                      <div
                        className="draggable-widget pointer-events-auto bg-gray-800/90 backdrop-blur-sm rounded-lg pl-3 pr-8 py-2 border border-gray-700 flex items-center space-x-2 text-sm text-white min-w-[140px]"
                        title="Перетащи, чтобы переместить"
                        role="group"
                        aria-label="Свернутый виджет"
                      >
                        <span className="text-lg">{getWidgetIcon(widget)}</span>
                        <span className="opacity-90">{getWidgetTitle(widget)}</span>
                        <button
                          onPointerDown={(e)=>{ e.stopPropagation(); e.preventDefault() }}
                          onClick={(e)=>{ e.stopPropagation(); toggleMinimized(widget.id) }}
                          className="absolute right-1 top-1 w-5 h-5 rounded bg-gray-900 border border-gray-700 text-gray-300 hover:text-white"
                          title="Развернуть"
                          aria-label="Развернуть виджет"
                        >▣</button>
                      </div>
                    ) : (
                      renderWidgetContent(widget)
                    )}
                  </div>
                </DraggableWidget>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </DndContext>

      {/* Панель управления масштабом */}
      <div className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 shadow-xl pointer-events-none">
        <div className="text-xs text-gray-400 mb-1">Масштаб: {transformState.scale.toFixed(2)}x</div>
        <div className="text-[10px] text-gray-500">X: {transformState.positionX.toFixed(0)} • Y: {transformState.positionY.toFixed(0)}</div>
        <div className="text-[10px] text-green-400 mt-1">Виджетов: {widgets.length}</div>
      </div>

      {/* Кнопка добавления виджетов */}
      <div className="absolute bottom-4 left-4 z-30">
        <button
          onClick={() => setShowAddMenu(v => !v)}
          className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-2xl shadow-lg border border-purple-400"
          title={showAddMenu ? 'Скрыть меню' : 'Добавить виджет'}
        >+
        </button>
        {showAddMenu && (
          <div className="mt-2 bg-gray-800/95 border border-gray-700 rounded-lg shadow-xl p-2 space-y-1">
            <button className="w-full text-left text-sm text-gray-200 hover:text-white hover:bg-gray-700 rounded px-2 py-1" onClick={() => { addWidget('StatsWidget'); setShowAddMenu(false) }}>📊 Stats Widget</button>
            <button className="w-full text-left text-sm text-gray-200 hover:text-white hover:bg-gray-700 rounded px-2 py-1" onClick={() => { addWidget('QuestWidget'); setShowAddMenu(false) }}>🎯 Quest Widget</button>
            <button className="w-full text-left text-sm text-gray-200 hover:text-white hover:bg-gray-700 rounded px-2 py-1" onClick={() => { addWidget('GrowthWidget'); setShowAddMenu(false) }}>🌱 Growth Widget</button>
            <button className="w-full text-left text-sm text-gray-200 hover:text-white hover:bg-gray-700 rounded px-2 py-1" onClick={() => { addWidget('ImageWidget'); setShowAddMenu(false) }}>🖼️ Image Widget</button>
          </div>
        )}
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
            <div className="flex items-start space-x-2">
              <span>📋</span>
              <span className="text-emerald-400">Вставка скриншотов: Ctrl+V, или перетащи файл/картинку</span>
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