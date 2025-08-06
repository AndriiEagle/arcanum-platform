'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'
import { useCurrentUserId } from '../../lib/stores/authStore'
import { useCurrentModel, useModelStore } from '../../lib/stores/modelStore'
import { useUIStore } from '../../lib/stores/uiStore'
import ModelSelector from './ai/ModelSelector'
// import PaywallModal from './payments/PaywallModal'
// import { getPriceVariant, logPaywallImpression, logPaywallClick, logPaywallConversion } from '../../lib/services/abTestService'

interface Message {
  id: string
  content: string
  sender: 'user' | 'moyo'
  timestamp: Date
  type: 'text' | 'command' | 'system'
}

interface DialogueWindowProps {
  isOpen?: boolean
  onToggle?: () => void
}

export default function DialogueWindow({ isOpen = true, onToggle }: DialogueWindowProps) {
  const userId = useCurrentUserId()
  const currentModel = useCurrentModel()
  const { addTokenUsage } = useModelStore()
  const { isLeftPanelOpen, isRightPanelOpen } = useUIStore()
  
  // Состояние диалогового окна
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Приветствую! Я MOYO - твой персональный ИИ-клон в Arcanum Platform. Время до следующего обновления задач: 2ч 15м. Готов помочь тебе оптимизировать свое развитие! 🚀',
      sender: 'moyo',
      timestamp: new Date(),
      type: 'system'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTools, setShowTools] = useState(false)
  
  // Новые состояния для функциональности
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isDocked, setIsDocked] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 384, height: 500 }) // w-96 = 384px
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Состояние Paywall Modal
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallConfig, setPaywallConfig] = useState({
    type: 'token_limit' as const,
    cost: 2.00,
    description: ''
  })
  const [currentABTest, setCurrentABTest] = useState<any>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  // Вычисляем адаптивную позицию
  const getAdaptivePosition = () => {
    if (isDocked) {
      const rightOffset = isRightPanelOpen ? 240 : 24 // 15% ширины экрана ≈ 240px или отступ 24px
      return {
        bottom: 24,
        right: rightOffset,
        position: 'fixed' as const
      }
    } else {
      return {
        top: position.y,
        left: position.x,
        position: 'fixed' as const
      }
    }
  }

  // Автопрокрутка к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Фокус на поле ввода при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Обработчики перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDocked) return
    
    setIsDragging(true)
    const rect = dialogRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dialogRef.current) return
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // Ограничиваем перемещение границами экрана
    const maxX = window.innerWidth - size.width
    const maxY = window.innerHeight - size.height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Обработчики изменения размера
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return
    
    const rect = dialogRef.current?.getBoundingClientRect()
    if (rect) {
      const newWidth = Math.max(320, e.clientX - rect.left)
      const newHeight = Math.max(400, e.clientY - rect.top)
      
      setSize({
        width: Math.min(newWidth, window.innerWidth - position.x),
        height: Math.min(newHeight, window.innerHeight - position.y)
      })
    }
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
  }

  // Подписка на события мыши
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleResizeEnd)
    }
    return () => {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing, position])

  // Переключение режима закрепления
  const toggleDocked = () => {
    if (isDocked) {
      // Открепляем: устанавливаем позицию в центр экрана
      setPosition({
        x: (window.innerWidth - size.width) / 2,
        y: (window.innerHeight - size.height) / 2
      })
    }
    setIsDocked(!isDocked)
  }

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Отправляем запрос к Arcanum Brain (API пока заглушка)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage.content,
          context: 'dialogue',
          userId: userId || 'anonymous',
          modelId: currentModel.id
        }),
      })

      let responseText = 'Произошла ошибка соединения с Arcanum Brain.'
      let messageType: 'text' | 'command' | 'system' = 'text'

      if (response.ok) {
        const data = await response.json()
        responseText = data.response || 'MOYO получил пустой ответ от сервера.'
        messageType = data.type || data.commandType || 'text'
        
        // Обновляем статистику использования токенов
        if (data.tokensUsed) {
          addTokenUsage(Math.floor(data.tokensUsed * 0.6), Math.floor(data.tokensUsed * 0.4))
        }
        
        // Логируем успешный ответ для отладки
        console.log('🤖 MOYO Response:', {
          response: responseText,
          commandType: data.commandType,
          modelUsed: data.modelUsed,
          tokensUsed: data.tokensUsed,
          actions: data.actions
        })
              } else if (response.status === 402) {
          // Обработка ошибки достижения лимита токенов
          try {
            const errorData = await response.json()
            if (errorData.paywall) {
              console.log('💳 Токен-лимит достигнут, показываем paywall с A/B тестированием')
              
              // Симуляция A/B тестирования цены (временно без реального сервиса)
              const userId_safe = userId || 'anonymous'
              const basePrice = 2.00
              const testPrices = [1.50, 1.99, 2.00, 2.40] // Варианты A/B тестирования
              const userHash = userId_safe.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0)
              const priceIndex = userHash % testPrices.length
              const abTestPrice = testPrices[priceIndex]
              
              console.log(`🧪 A/B тест токен-лимитов: цена $${abTestPrice} (индекс ${priceIndex})`)
              
              const mockABTest = {
                price: abTestPrice,
                variant: { id: `variant_${priceIndex}`, label: `Тест ${priceIndex}` },
                testResult: { userId: userId_safe, testType: 'token_limit', variantId: `variant_${priceIndex}` }
              }
              setCurrentABTest(mockABTest)
              
              setPaywallConfig({
                type: errorData.paywall.type || 'token_limit',
                cost: abTestPrice, // Используем A/B тестовую цену
                description: errorData.paywall.message || `Разблокировать 2000 токенов за $${abTestPrice}?`
              })
              
              // Логируем показ paywall (симуляция)
              console.log(`📊 A/B тест impression: ${mockABTest.testResult.variantId}`)
              // await logPaywallImpression(abTestResult.testResult)
              
              setShowPaywall(true)
              setIsLoading(false)
              return // Прекращаем выполнение, чтобы не показывать ошибку как сообщение
            }
          } catch (parseError) {
            console.error('❌ Ошибка парсинга paywall данных:', parseError)
          }
          responseText = 'Достигнут лимит токенов. Обновите тариф для продолжения.'
      } else {
        // Логируем ошибку ответа
        console.error('❌ API Error:', response.status, response.statusText)
        responseText = `Ошибка API (${response.status}): ${response.statusText}`
      }

      const moyoResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        sender: 'moyo',
        timestamp: new Date(),
        type: messageType
      }

      setMessages(prev => [...prev, moyoResponse])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Произошла ошибка при отправке сообщения. Проверьте подключение к интернету.',
        sender: 'moyo',
        timestamp: new Date(),
        type: 'system'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Обработка нажатия Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Загрузка файлов
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileNames = Array.from(files).map(f => f.name).join(', ')
    const fileMessage: Message = {
      id: Date.now().toString(),
      content: `📎 Загружены файлы: ${fileNames}`,
      sender: 'user',
      timestamp: new Date(),
      type: 'system'
    }

    setMessages(prev => [...prev, fileMessage])

    // Загрузка файлов в Supabase Storage (если пользователь авторизован)
    if (userId && files.length > 0) {
      // В реальном приложении здесь будет загрузка файлов
      console.log('Uploading files for user:', userId, files)
    }
    const responseMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: 'Файлы получены! Обрабатываю содержимое для анализа...',
      sender: 'moyo',
      timestamp: new Date(),
      type: 'system'
    }

    setTimeout(() => {
      setMessages(prev => [...prev, responseMessage])
    }, 1000)
  }

  // Инструменты
  const tools = [
    { id: 'add-button', name: 'Добавить кнопку', icon: '🔘', command: 'добавь кнопку' },
    { id: 'create-task', name: 'Создать задачу', icon: '✅', command: 'создай задачу' },
    { id: 'analyze-spheres', name: 'Анализ сфер', icon: '🌐', command: 'проанализируй мои сферы' },
    { id: 'generate-image', name: 'Генерировать арт', icon: '🎨', command: 'сгенерируй изображение' },
    { id: 'focus-mode', name: 'Режим фокуса', icon: '🎯', command: 'активируй режим фокуса' },
    { id: 'level-check', name: 'Проверить прогресс', icon: '📊', command: 'покажи мой прогресс' }
  ]

  const handleToolClick = (command: string) => {
    setInputValue(command)
    setShowTools(false)
    inputRef.current?.focus()
  }

  const adaptivePosition = getAdaptivePosition()

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white/20 z-50"
        style={{
          position: 'fixed',
          bottom: 24,
          right: isRightPanelOpen ? 240 : 24
        }}
        title="Открыть диалог с MOYO"
      >
        <div className="text-2xl animate-pulse">🤖</div>
      </button>
    )
  }

  return (
    <div
      ref={dialogRef}
      className={`
        bg-gray-800/95 backdrop-blur-lg rounded-lg border border-gray-700 shadow-2xl flex flex-col overflow-hidden
        ${isDragging ? 'shadow-purple-500/50 scale-105' : 'shadow-2xl'}
        ${isResizing ? 'shadow-blue-500/50' : ''}
        transition-all duration-200
      `}
      style={{
        ...adaptivePosition,
        width: size.width,
        height: size.height,
        zIndex: isDocked ? 40 : 50,
        cursor: isDragging ? 'grabbing' : isDocked ? 'default' : 'grab'
      }}
    >
      {/* Заголовок с функциями управления */}
      <div 
        className="bg-gradient-to-r from-purple-800 to-blue-800 p-4 border-b border-gray-700 select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Аватар MOYO с индикацией модели */}
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center border-2 text-lg"
                style={{ 
                  borderColor: currentModel.color,
                  backgroundColor: `${currentModel.color}20`,
                  color: currentModel.color
                }}
              >
                {currentModel.icon}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse" title="Модель активна"></div>
            </div>
            <div>
              <h3 className="text-white font-bold">MOYO</h3>
              <p className="text-purple-200 text-xs">{currentModel.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Кнопка закрепления/открепления */}
            <button
              onClick={toggleDocked}
              className={`p-1.5 rounded transition-colors ${
                isDocked 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={isDocked ? 'Открепить окно' : 'Закрепить окно'}
            >
              {isDocked ? '📌' : '🔓'}
            </button>
            
            <ModelSelector />
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Свернуть диалог"
            >
              ⬇️
            </button>
          </div>
        </div>
      </div>

      {/* История сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] p-3 rounded-lg text-sm
                ${message.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : message.type === 'system'
                    ? 'bg-purple-900/50 text-purple-200 rounded-bl-none border border-purple-700'
                    : 'bg-gray-700 text-gray-200 rounded-bl-none'
                }
              `}
            >
              <p className="leading-relaxed">{message.content}</p>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {/* Индикатор печатания */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-200 p-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Панель инструментов */}
      {showTools && (
        <div className="bg-gray-900/90 border-t border-gray-700 p-3">
          <div className="text-xs text-gray-400 mb-2">Быстрые команды:</div>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.command)}
                className="flex items-center space-x-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 hover:text-white transition-colors"
              >
                <span>{tool.icon}</span>
                <span>{tool.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Поле ввода */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center space-x-2">
          {/* Кнопка файлов */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
            title="Добавить файлы"
          >
            📎
          </button>
          
          {/* Поле ввода */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Спроси MOYO о чем угодно..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
          />

          {/* Кнопка инструментов */}
          <button
            onClick={() => setShowTools(!showTools)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              showTools ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Инструменты"
          >
            🔧
          </button>

          {/* Кнопка отправки */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              inputValue.trim() && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            title="Отправить сообщение"
          >
            ➤
          </button>
        </div>

        {/* Скрытый input для файлов */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.mp4,.mov"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Ручка для изменения размера (только для незакрепленного режима) */}
      {!isDocked && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-gray-600 hover:bg-gray-500 cursor-se-resize"
          onMouseDown={handleResizeStart}
          title="Изменить размер"
        >
          <div className="absolute bottom-0.5 right-0.5 w-2 h-2">
            <svg viewBox="0 0 8 8" className="w-full h-full text-gray-400">
              <path d="M8,0L8,8L0,8" fill="currentColor" />
            </svg>
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
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.7);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.9);
        }
      `}</style>
      
      {/* Paywall Modal для обработки лимитов токенов */}
      {/* Временная заглушка до исправления импорта */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              💳 Лимит токенов достигнут
            </h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              {paywallConfig.description}
            </p>
            <p className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
              ${paywallConfig.cost}
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={async () => {
                  console.log('💳 Переход к покупке токенов')
                  
                  // Логируем клик A/B теста (симуляция)
                  if (currentABTest) {
                    console.log(`📊 A/B тест click: ${currentABTest.testResult.variantId}`)
                    // await logPaywallClick(currentABTest.testResult)
                    
                    // Симуляция успешной покупки для демо
                    const paymentIntentId = `pi_token_abtest_${Date.now()}`
                    console.log(`📊 A/B тест conversion: ${currentABTest.testResult.variantId}, payment: ${paymentIntentId}, price: $${currentABTest.price}`)
                    // await logPaywallConversion(currentABTest.testResult, paymentIntentId, currentABTest.price)
                    console.log(`✅ A/B тест конверсия залогирована: ${paymentIntentId}`)
                  }
                  
                  setShowPaywall(false)
                }}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors"
              >
                Купить сейчас
              </button>
              <button 
                onClick={() => setShowPaywall(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 