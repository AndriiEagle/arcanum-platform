'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../lib/supabase/client'
import { useCurrentUserId } from '../../lib/stores/authStore'
import { useCurrentModel, useModelStore } from '../../lib/stores/modelStore'
import ModelSelector from './ai/ModelSelector'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

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

      let responseText = 'Прошу прощения, но я временно недоступен. API /api/chat еще не реализован.'
      let messageType: 'text' | 'command' | 'system' = 'text'

      if (response.ok) {
        const data = await response.json()
        responseText = data.response || responseText
        messageType = data.type || 'text'
        
        // Обновляем статистику использования токенов
        if (data.usage) {
          addTokenUsage(data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0)
        }
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

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white/20"
        title="Открыть диалог с MOYO"
      >
        <div className="text-2xl animate-pulse">🤖</div>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-gray-800/95 backdrop-blur-lg rounded-lg border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-purple-800 to-blue-800 p-4 border-b border-gray-700">
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
            <ModelSelector />
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
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
    </div>
  )
} 