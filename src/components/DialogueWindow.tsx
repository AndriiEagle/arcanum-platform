// @ts-nocheck
'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '../../lib/supabase/client'
import { useCurrentUserId } from '../../lib/stores/authStore'
import { useCurrentModel, useModelStore } from '../../lib/stores/modelStore'
import { useUIStore } from '../../lib/stores/uiStore'
import ModelSelector from './ai/ModelSelector'
import PaywallModal from './payments/PaywallModal'
import { getPriceVariant, logPaywallImpression, logPaywallClick } from '../../lib/services/abTestService'
import { trackPaywallShown, trackPaywallClicked, trackPaymentInitiated } from '../../lib/services/analyticsService'
import { getAvatarUrl, setAvatarUrl } from '../../lib/services/customizationService'
import { uploadImageResized } from '../../lib/services/imageUpload'

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

// 🚀 ОПТИМИЗАЦИЯ: Мемоизированный компонент сообщения
const MessageItem = React.memo(({ message }: { message: any }) => {
  const formattedTime = useMemo(() => 
    message.timestamp.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }), [message.timestamp])

  const messageClassName = useMemo(() => {
    const baseClasses = 'max-w-[80%] p-3 rounded-lg text-sm'
    if (message.sender === 'user') {
      return `${baseClasses} bg-blue-600 text-white rounded-br-none`
    } else if (message.type === 'system') {
      return `${baseClasses} bg-purple-900/50 text-purple-200 rounded-bl-none border border-purple-700`
    } else {
      return `${baseClasses} bg-gray-700 text-gray-200 rounded-bl-none`
    }
  }, [message.sender, message.type])

  const containerClassName = useMemo(() => 
    `flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`,
    [message.sender]
  )

  return (
    <div className={containerClassName}>
      <div className={messageClassName}>
        <p className="leading-relaxed">{message.content}</p>
        <div className="text-xs opacity-70 mt-1">
          {formattedTime}
        </div>
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'

// 🚀 ОПТИМИЗАЦИЯ: Компонент индикатора загрузки
const TypingIndicator = React.memo(() => (
  <div className="flex justify-start">
    <div className="bg-gray-700 text-gray-200 p-3 rounded-lg rounded-bl-none">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  </div>
))

TypingIndicator.displayName = 'TypingIndicator'

export default function DialogueWindow({ isOpen = true, onToggle }: DialogueWindowProps) {
  const userId = useCurrentUserId()
  const currentModel = useCurrentModel()
  const { addTokenUsage } = useModelStore()
  const { isRightPanelOpen } = useUIStore()
  console.log('[DBG][DialogueWindow] render', { isOpen, userId, model: currentModel?.id })
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Привет! Войдите в аккаунт, чтобы начать полноценно общаться с MOYO. 🚀',
      sender: 'moyo',
      timestamp: new Date(),
      type: 'system'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTools, setShowTools] = useState(false)
  
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isDocked, setIsDocked] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState({ width: 384, height: 500 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallConfig, setPaywallConfig] = useState({
    type: 'token_limit' as 'token_limit' | 'mascot' | 'premium_subscription',
    cost: 2.00,
    description: ''
  })
  const [currentABTest, setCurrentABTest] = useState<any>(null)

  // Заглушки для функций/состояний, чтобы не ломать UI
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Ошибка доступа к микрофону. Проверьте разрешения.')
    }
  }
  
  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }
  
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      
      const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (response.ok && result.transcription) {
        setInputValue((prev: string) => prev + (prev ? ' ' : '') + result.transcription)
        inputRef.current?.focus()
      } else {
        console.error('Transcription error:', result.error)
        alert('Ошибка транскрибации: ' + (result.error || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      alert('Ошибка при отправке аудио на сервер')
    } finally {
      setIsTranscribing(false)
    }
  }
  const toggleDocked = () => setIsDocked((prev: boolean) => !prev)
  const handleMouseDown = () => {}
  const tools: { id: string; name: string; icon: string; command?: string; action?: string }[] = []
  const handleToolClick = (command: string) => {
    setInputValue(command)
    setShowTools(false)
    inputRef.current?.focus()
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // 🚀 ОПТИМИЗАЦИЯ: Ограничиваем количество отображаемых сообщений для производительности
  const MAX_VISIBLE_MESSAGES = 50
  const visibleMessages = useMemo(() => 
    messages.slice(-MAX_VISIBLE_MESSAGES), 
    [messages]
  )

  // 🚀 ОПТИМИЗАЦИЯ: Мемоизируем обработчики
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }, [])

  const handleFileUpload = (_e: React.ChangeEvent<HTMLInputElement>) => {}
  const handleResizeStart = (_e: React.MouseEvent) => {}

  const supabase = createClient()

  const getAdaptivePosition = () => {
    if (isDocked) {
      const rightOffset = isRightPanelOpen ? 240 : 24
      return { bottom: 24, right: rightOffset, position: 'fixed' as const }
    }
    return { top: position.y, left: position.x, position: 'fixed' as const }
  }

  // 🚀 ОПТИМИЗАЦИЯ: Мемоизированная прокрутка
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  // 🚀 ОПТИМИЗАЦИЯ: Прокрутка только при добавлении новых сообщений, не при каждом изменении
  useEffect(() => { 
    if (messages.length > 0) {
      scrollToBottom() 
    }
  }, [messages.length, scrollToBottom])
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus() }, [isOpen])

  // Personalized greeting after login
  useEffect(() => {
    let cancelled = false
    async function loadPersonalGreeting() {
      try {
        if (!userId) return
        // fetch stats and spheres summary
        const summaryRes = await fetch(`/api/memory/summary?userId=${encodeURIComponent(userId)}`)
        const summaryJson = await summaryRes.json().catch(() => ({}))
        const level = summaryJson?.summary?.stats?.level ?? null
        const spheres = (summaryJson?.summary?.spheres || []).filter((s: any) => s.active)
        // fetch top tasks ids
        const topRes = await fetch(`/api/tasks/top?userId=${encodeURIComponent(userId)}&n=3`)
        const topJson = await topRes.json().catch(() => ({ items: [] }))
        const topIds: string[] = (topJson?.items || []).map((i: any) => i.id)
        // fetch task details to show titles and sphere codes
        let tasksInfo: Array<{ title: string; sphere: string | null; due: string | null }> = []
        if (topIds.length > 0) {
          const { data, error } = await supabase
            .from('user_tasks')
            .select('id,title,sphere_id,due_date')
            .in('id', topIds)
          if (!error && data) {
            // map sphere_id -> code
            const sphereIds = Array.from(new Set(data.map((t: any) => t.sphere_id).filter(Boolean)))
            let codeBySphereId = new Map<string, string>()
            if (sphereIds.length > 0) {
              const { data: srows } = await supabase
                .from('life_spheres')
                .select('id,sphere_code')
                .in('id', sphereIds)
              for (const r of (srows || [])) codeBySphereId.set(r.id, r.sphere_code)
            }
            tasksInfo = data.map((t: any) => ({
              title: t.title,
              sphere: t.sphere_id ? (codeBySphereId.get(t.sphere_id) || null) : null,
              due: t.due_date || null
            }))
          }
        }

        // compute time left to evening report (23:00 local)
        const now = new Date()
        const reportAt = new Date(now)
        reportAt.setHours(23, 0, 0, 0)
        if (reportAt.getTime() <= now.getTime()) reportAt.setDate(reportAt.getDate() + 1)
        const msLeft = reportAt.getTime() - now.getTime()
        const hrs = Math.floor(msLeft / 3600000)
        const mins = Math.floor((msLeft % 3600000) / 60000)
        const timeLeftStr = `${hrs}ч ${mins}м`

        const tasksLine = tasksInfo.length
          ? tasksInfo.map(t => `• ${t.title}${t.sphere ? ` [${t.sphere}]` : ''}`).join('\n')
          : 'Задачи не найдены — добавь цель в любой сфере.'
        const spheresLine = spheres.length
          ? spheres.map((s: any) => `${s.code || s.name} (${s.health}%)`).join(', ')
          : 'Нет активных сфер — нажми кнопку Seed в левом сайдбаре, чтобы создать S1..S9'

        const greeting = `Привет! ${level ? `Твой уровень: ${level}. ` : ''}Активные сферы: ${spheresLine}.\nТоп задачи на сейчас:\n${tasksLine}\n⏳ До вечернего рапорта: ${timeLeftStr}.`

        if (!cancelled) {
          const greetMsg: Message = {
            id: 'greet_' + Date.now().toString(),
            content: greeting,
            sender: 'moyo',
            timestamp: new Date(),
            type: 'system'
          }
          setMessages((prev: Message[]) => {
            // replace initial system message if it is the default guest prompt
            if (prev.length > 0 && prev[0].type === 'system') {
              return [greetMsg, ...prev.slice(1)]
            }
            return [greetMsg, ...prev]
          })
        }
      } catch (e) {
        // ignore errors, keep default message
      }
    }
    loadPersonalGreeting()
    return () => { cancelled = true }
  }, [userId])

  const handleSendMessage = async () => {
    console.log('[DBG][DialogueWindow] handleSendMessage click', { userId, isLoading })
    if (!inputValue.trim() || isLoading) return

    if (!userId) {
      console.log('[DBG][DialogueWindow] not authenticated -> system notice')
      setMessages((prev: Message[]) => [...prev, {
        id: Date.now().toString(),
        content: 'Требуется вход в систему. Нажмите «Войти» в верхнем баре и повторите попытку.',
        sender: 'moyo',
        timestamp: new Date(),
        type: 'system'
      }])
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    }

    setMessages((prev: Message[]) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.content,
          context: 'dialogue',
          userId,
          modelId: currentModel.id
        }),
      })

      let responseText = 'Произошла ошибка соединения с Arcanum Brain.'
      let messageType: 'text' | 'command' | 'system' = 'text'

      if (response.status === 401) {
        responseText = 'Требуется вход для использования чата. Нажмите «Войти» в правом верхнем углу.'
      } else if (response.ok) {
        const data = await response.json()
        responseText = data.response || 'MOYO получил пустой ответ от сервера.'
        messageType = data.type || data.commandType || 'text'
        if (data.tokensUsed) {
          console.log('[DBG][DialogueWindow] tokensUsed', data.tokensUsed)
          addTokenUsage(Math.floor(data.tokensUsed * 0.6), Math.floor(data.tokensUsed * 0.4))
        }
      } else if (response.status === 402) {
        try {
          const errorData = await response.json()
          if (errorData.paywall) {
            const productType = (errorData.paywall.type || 'token_limit') as 'token_limit' | 'mascot' | 'premium_subscription'
            const baseCost = errorData.paywall.cost || 2.0
            // Получаем A/B вариант для пользователя
            if (userId) {
              const { price, variant, testResult } = getPriceVariant(userId, productType)
              setCurrentABTest({ price, variant, testResult })
              setPaywallConfig({ type: productType, cost: price, description: errorData.paywall.message })
              // Логируем показ
              logPaywallImpression(testResult)
              trackPaywallShown(userId, productType, variant.id, { price })
              // Сохраняем контекст A/B для последующей фиксации конверсии после редиректа
              try {
                localStorage.setItem('ab_last_variant', JSON.stringify({
                  userId,
                  productType,
                  variantId: variant.id,
                  price
                }))
              } catch {}
            } else {
              setCurrentABTest({ price: baseCost, variant: { id: 'control' }, testResult: { variantId: 'control' } })
              setPaywallConfig({ type: productType, cost: baseCost, description: errorData.paywall.message })
            }
            setShowPaywall(true)
            setIsLoading(false)
            return
          }
        } catch {}
        responseText = 'Достигнут лимит токенов. Обновите тариф.'
      } else {
        responseText = `Ошибка API (${response.status}): ${response.statusText}`
      }

      const moyoResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        sender: 'moyo',
        timestamp: new Date(),
        type: messageType
      }
      setMessages((prev: Message[]) => [...prev, moyoResponse])
    } catch (error) {
      setMessages((prev: Message[]) => [...prev, { id: (Date.now() + 1).toString(), content: 'Произошла ошибка при отправке сообщения. Проверьте интернет.', sender: 'moyo', timestamp: new Date(), type: 'system' }])
    } finally {
      setIsLoading(false)
    }
  }

  const adaptivePosition = getAdaptivePosition()
  
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null)
  const [avatarKey, setAvatarKey] = useState<number>(0) // Для принудительной перерисовки
  
  useEffect(() => {
    (async () => {
      if (!userId) return
      console.log('[DialogueWindow] Loading avatar for user:', userId)
      const url = await getAvatarUrl(userId)
      console.log('[DialogueWindow] Got avatar URL:', url)
      if (url) setAvatarUrlState(url)
    })()
  }, [userId])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file || !userId) return
      
      console.log('[DialogueWindow] Starting avatar upload:', file.name)
      
      // Используем новый параметр isAvatar для правильной загрузки
      const { url } = await uploadImageResized(file, { 
        bucket: 'public-assets', 
        pathPrefix: `avatars/${userId}`, 
        maxSize: 128,
        isAvatar: true // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ!
      })
      
      console.log('[DialogueWindow] Avatar uploaded, saving to DB:', url)
      await setAvatarUrl(userId, url)
      
      console.log('[DialogueWindow] Avatar saved, updating state')
      setAvatarUrlState(url)
      
      // Принудительно обновляем ключ для перерисовки изображения
      setAvatarKey((prev: number) => prev + 1)
      
      console.log('[DialogueWindow] Avatar update complete:', url)
    } catch (err) {
      console.error('Avatar upload error:', err)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!isOpen) {
    return (
      <button onClick={onToggle} className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 border-2 border-white/20 z-50" style={{ position: 'fixed', bottom: 24, right: isRightPanelOpen ? 240 : 24 }} title="Открыть диалог с MOYO">
        <div className="text-2xl animate-pulse">🤖</div>
      </button>
    )
  }

  return (
    <div ref={dialogRef} className={`bg-gray-800/95 backdrop-blur-lg rounded-lg border border-gray-700 shadow-2xl flex flex-col overflow-hidden ${isDragging ? 'shadow-purple-500/50 scale-105' : 'shadow-2xl'} ${isResizing ? 'shadow-blue-500/50' : ''} transition-all duration-200`} style={{ ...adaptivePosition, width: size.width, height: size.height, zIndex: isDocked ? 40 : 50, cursor: isDragging ? 'grabbing' : isDocked ? 'default' : 'grab' }}>
      {/* Заголовок с функциями управления */}
      <div 
        className="bg-gradient-to-r from-purple-800 to-blue-800 p-4 border-b border-gray-700 select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Аватар MOYO с индикацией модели */}
            <div className="relative">
              <button type="button" onClick={handleAvatarClick} className="focus:outline-none">
                {avatarUrl ? (
                  <img
                    key={avatarKey} // Добавляем ключ для принудительной перерисовки
                    src={avatarUrl}
                    alt="MOYO Avatar"
                    className="w-10 h-10 rounded-full object-cover border-2"
                    style={{ borderColor: currentModel.color }}
                  />
                ) : (
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
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
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
        {visibleMessages.map((message: Message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        {/* Индикатор печатания */}
        {isLoading && <TypingIndicator />}
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
                onClick={() => {
                  if (tool.action === 'voice') {
                    startVoiceRecording()
                    setShowTools(false)
                  } else {
                    handleToolClick(tool.command || '')
                  }
                }}
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

          {/* 🎤 Кнопка голосовой записи */}
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            disabled={isTranscribing}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                : isTranscribing
                ? 'bg-yellow-600 text-white cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={
              isRecording 
                ? "Остановить запись (говорите о своих делах)" 
                : isTranscribing 
                ? "Обрабатываю голос..." 
                : "Рассказать о делах голосом"
            }
          >
            {isTranscribing ? (
              <div className="animate-spin">⚡</div>
            ) : isRecording ? (
              <div className="text-lg">🔴</div>
            ) : (
              <div className="text-lg">🎤</div>
            )}
          </button>
          
          {/* Поле ввода */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }} placeholder={userId ? 'Спроси MOYO о чем угодно...' : 'Войдите, чтобы общаться с MOYO'} className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm" />

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
      {showPaywall && (
        <PaywallModal
          isOpen={showPaywall}
          type={paywallConfig.type}
          cost={paywallConfig.cost}
          description={paywallConfig.description}
          onClose={() => setShowPaywall(false)}
          userId={userId || 'anonymous-user'}
          onSuccess={(paymentIntentId) => {
            // Клик/инициация уже будет зафиксирована при редиректе, но продублируем безопасно
            if (userId && currentABTest?.variant?.id) {
              logPaywallClick(currentABTest.testResult)
              trackPaywallClicked(userId, paywallConfig.type, currentABTest.variant.id, { price: paywallConfig.cost })
              trackPaymentInitiated(userId, paywallConfig.type, currentABTest.variant.id, { amount: paywallConfig.cost, payment_intent_id: paymentIntentId })
            }
          }}
          onPurchase={({ sessionId }) => {
            if (userId && currentABTest?.variant?.id) {
              logPaywallClick(currentABTest.testResult)
              trackPaywallClicked(userId, paywallConfig.type, currentABTest.variant.id, { price: paywallConfig.cost })
              trackPaymentInitiated(userId, paywallConfig.type, currentABTest.variant.id, { amount: paywallConfig.cost, payment_intent_id: sessionId })
            }
          }}
        />
      )}
    </div>
  )
} 