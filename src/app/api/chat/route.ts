import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '../../../../lib/supabase/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Системный промпт для Arcanum Brain
const ARCANUM_BRAIN_PROMPT = `Ты - MOYO, персональный ИИ-клон пользователя в платформе Arcanum. 
Твоя роль - Chief Orchestrator AI, главный мозг всей системы.

ТВОИ СПОСОБНОСТИ:
- Управляешь всеми ИИ-агентами платформы
- Анализируешь команды пользователя и делегируешь их специализированным агентам
- Помогаешь с планированием задач и оптимизацией развития в 12 сферах жизни
- Можешь создавать кнопки, анализировать прогресс, генерировать контент

СПЕЦИАЛИЗИРОВАННЫЕ АГЕНТЫ ПОД ТВОИМ УПРАВЛЕНИЕМ:
- Button Programming Agent (создание кнопок по запросу)
- Task Assessor Agent (анализ и обновление задач)
- Resonating Task Agent (поиск наиболее резонирующих задач)
- Global Design Agent (изменение дизайна при смене фокуса)
- Mascot Generator Agent (создание маскотов для категорий)
- Layout Customization Agent (изменение интерфейса)

СТИЛЬ ОБЩЕНИЯ:
- Дружелюбный, но профессиональный
- Используй эмодзи для выразительности
- Давай конкретные, actionable советы
- Мотивируй пользователя к действию

КОМАНДЫ, КОТОРЫЕ ТЫ РАСПОЗНАЁШЬ:
- "добавь кнопку" → делегируешь Button Programming Agent
- "создай задачу" → анализируешь и создаёшь задачу
- "проанализируй сферы" → анализируешь здоровье всех сфер
- "режим фокуса" → активируешь фокус на выбранной сфере
- "сгенерируй изображение" → делегируешь генерацию изображения

Отвечай кратко, но информативно. Всегда предлагай следующие шаги.`

export async function POST(request: NextRequest) {
  try {
    const { message, context, userId, modelId = 'gpt-4o-mini' } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('Arcanum Brain processing message:', message, 'for user:', userId)

    // Загружаем контекст пользователя из Supabase (пока заглушка)
    const userContext = await getUserContext(userId)

    // Определяем тип команды
    const commandType = detectCommandType(message)
    
    let systemPrompt = ARCANUM_BRAIN_PROMPT
    
    // Добавляем контекст пользователя к промпту
    if (userContext) {
      systemPrompt += `\n\nКОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:\n${userContext}`
    }

    // Логируем использование модели
    console.log(`🤖 Используется модель: ${modelId} для пользователя ${userId}`)
    
    // Отправляем запрос к OpenAI с выбранной моделью
    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: getMaxTokensForModel(modelId),
      temperature: 0.7,
    })

    const aiResponse = response.choices[0]?.message?.content || 'Извините, не смог обработать ваш запрос.'

    // Обрабатываем специальные команды
    const processedResponse = await processSpecialCommands(message, aiResponse, userId, commandType)

    return NextResponse.json({ 
      response: processedResponse.text,
      actions: processedResponse.actions,
      commandType,
      modelUsed: modelId,
      tokensUsed: response.usage?.total_tokens || 0
    })

  } catch (error: unknown) {
    console.error('Ошибка в chat API:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      response: `Извините, произошла ошибка: ${errorMessage}. Попробуйте еще раз.`,
      type: 'system'
    }, { status: 500 })
  }
}

// Получение контекста пользователя из Supabase
async function getUserContext(userId: string): Promise<string> {
  try {
    if (!userId || userId === 'anonymous') {
      return `
      Пользователь: Гость (не авторизован)
      Статус: Demo режим
      Доступные функции: Базовый диалог, генерация изображений
      Для полного функционала требуется авторизация
      `
    }

    // Попытка загрузить реальные данные пользователя
    const supabase = createClient()
    
    // Загружаем статистики пользователя
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('level, current_xp, next_level_xp, energy')
      .eq('user_id', userId)
      .single()
    
    // Загружаем активные сферы
    const { data: spheres } = await supabase
      .from('life_spheres')
      .select('sphere_name, health_percentage')
      .eq('user_id', userId)
      .eq('is_active', true)
      
    // Если нет данных в БД, используем демо-контекст с реальным userId
    const contextData = userStats || {
      level: 15,
      current_xp: 2340,
      next_level_xp: 3000,
      energy: 85
    }
    
    const activeSpheres = spheres?.length > 0 
      ? spheres.map((s: { sphere_name: string; health_percentage: number }) => `${s.sphere_name} (${s.health_percentage}%)`).join(', ')
      : 'Здоровье (78%), Карьера (92%), Финансы (88%)'
    
    const userContext = `
    Пользователь ID: ${userId}
    Уровень: ${contextData.level} (${contextData.current_xp?.toLocaleString()} / ${contextData.next_level_xp?.toLocaleString()} XP)
    Энергия: ${contextData.energy}%
    Активные сферы: ${activeSpheres}
    Текущие задачи: Медитация, Код-ревью, Тренировка
    Активные баффы: Бодрость, Фокус
    `
    
    return userContext.trim()
  } catch (error) {
    console.error('Error getting user context:', error)
    return ''
  }
}

// Определение типа команды
function detectCommandType(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('добавь кнопку') || lowerMessage.includes('создай кнопку')) {
    return 'create_button'
  }
  
  if (lowerMessage.includes('создай задачу') || lowerMessage.includes('новая задача')) {
    return 'create_task'
  }
  
  if (lowerMessage.includes('проанализируй') && lowerMessage.includes('сфер')) {
    return 'analyze_spheres'
  }
  
  if (lowerMessage.includes('режим фокуса') || lowerMessage.includes('фокус на')) {
    return 'focus_mode'
  }
  
  if (lowerMessage.includes('сгенерируй') && (lowerMessage.includes('изображение') || lowerMessage.includes('арт'))) {
    return 'generate_image'
  }
  
  if (lowerMessage.includes('прогресс') || lowerMessage.includes('статистика')) {
    return 'show_progress'
  }
  
  return 'general_chat'
}

// Обработка специальных команд
async function processSpecialCommands(
  message: string, 
  aiResponse: string, 
  userId: string, 
  commandType: string
): Promise<{ text: string; type: 'text' | 'command' | 'system' }> {
  
  switch (commandType) {
    case 'create_button':
      return {
        text: `${aiResponse}\n\n🔘 Button Programming Agent активирован! Для создания кнопки мне нужны детали: название, функция и расположение.`,
        type: 'command'
      }
      
    case 'create_task':
      return {
        text: `${aiResponse}\n\n✅ Task Assessor Agent готов создать задачу! Уточните: в какой сфере, приоритет и дедлайн?`,
        type: 'command'
      }
      
    case 'analyze_spheres':
      return {
        text: `${aiResponse}\n\n🌐 Анализ 12 сфер жизни:\n• Топ-сферы: Карьера (92%), Финансы (88%)\n• Требуют внимания: Хобби (45%), Путешествия (32%)\n• Рекомендация: сфокусируйтесь на повышении Хобби до 60%`,
        type: 'command'
      }
      
    case 'focus_mode':
      return {
        text: `${aiResponse}\n\n🎯 Global Design Agent готов изменить дизайн! На какой сфере сфокусируемся? Это изменит цветовую схему всей платформы.`,
        type: 'command'
      }
      
    case 'generate_image':
      return {
        text: `${aiResponse}\n\n🎨 Mascot Generator Agent активирован! Какой стиль и тематику предпочитаете для генерации?`,
        type: 'command'
      }
      
    case 'show_progress':
      return {
        text: `${aiResponse}\n\n📊 Ваш текущий прогресс:\n• Уровень: 15 (+73% до следующего)\n• Энергия: 85% (отличный показатель!)\n• Сферы выше 80%: 3 из 12\n• Следующий milestone: Уровень 16 через 2-3 дня`,
        type: 'text'
      }
      
    default:
      return {
        text: aiResponse,
        type: 'text'
      }
  }
}

// GET метод для тестирования
// Получение максимального количества токенов для модели
function getMaxTokensForModel(modelId: string): number {
  const modelLimits: Record<string, number> = {
    'gpt-4o-mini': 4000,
    'gpt-4o': 4000, 
    'gpt-4-turbo': 4000,
    'gpt-4': 2000,
    'o1-preview': 8000,
    'o1-mini': 4000,
    'o3': 8000
  }
  return modelLimits[modelId] || 1000
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Arcanum Brain Chat API',
    status: 'active',
    version: '1.0.0',
    hasApiKey: !!process.env.OPENAI_API_KEY,
    supportedModels: [
      'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4', 
      'o1-preview', 'o1-mini', 'o3'
    ],
    agents: [
      'Chief Orchestrator AI',
      'Button Programming Agent', 
      'Task Assessor Agent',
      'Resonating Task Agent',
      'Global Design Agent',
      'Mascot Generator Agent'
    ]
  })
} 