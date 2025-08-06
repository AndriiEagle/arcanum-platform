import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '../../../../lib/supabase/client'
import { logTokenUsage, getUserTokenUsage } from '../../../../lib/services/tokenService'
import { calculateCost } from '../../../../lib/config/aiModels'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const ARCANUM_BRAIN_PROMPT = `Ты — Chief Orchestrator AI платформы Arcanum...` // [existing prompt content]

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
    
    const activeSpheres = (spheres && spheres.length > 0)
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

// Обработка специальных команд
async function processSpecialCommands(
  message: string, 
  aiResponse: string, 
  userId: string, 
  commandType: string
): Promise<{ text: string; actions?: Record<string, unknown> }> {
  
  switch (commandType) {
    case 'create_button':
      return {
        text: `${aiResponse}\n\n🔘 Button Programming Agent активирован! Для создания кнопки мне нужны детали: название, функция и расположение.`,
        actions: { type: 'create_button', data: { message } }
      }
      
    case 'create_task':
      return {
        text: `${aiResponse}\n\n✅ Task Assessor Agent готов создать задачу! Уточните: в какой сфере, приоритет и дедлайн?`,
        actions: { type: 'create_task', data: { message } }
      }
      
    case 'analyze_spheres':
      return {
        text: `${aiResponse}\n\n🌐 Анализ 12 сфер жизни:\n• Топ-сферы: Карьера (92%), Финансы (88%)\n• Требуют внимания: Хобби (45%), Путешествия (32%)\n• Рекомендация: сфокусируйтесь на повышении Хобби до 60%`,
        actions: { type: 'analyze_spheres', data: { userId } }
      }
      
    case 'focus_mode':
      return {
        text: `${aiResponse}\n\n🎯 Global Design Agent готов изменить дизайн! На какой сфере сфокусируемся? Это изменит цветовую схему всей платформы.`,
        actions: { type: 'focus_mode', data: { message } }
      }
      
    case 'generate_image':
      return {
        text: `${aiResponse}\n\n🎨 Mascot Generator Agent активирован! Какой стиль и тематику предпочитаете для генерации?`,
        actions: { type: 'generate_image', data: { message } }
      }
      
    case 'show_progress':
      return {
        text: `${aiResponse}\n\n📊 Ваш текущий прогресс:\n• Уровень: 15 (+73% до следующего)\n• Энергия: 85% (отличный показатель!)\n• Сферы выше 80%: 3 из 12\n• Следующий milestone: Уровень 16 через 2-3 дня`,
        actions: { type: 'show_progress', data: { userId } }
      }
      
    default:
      return {
        text: aiResponse
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId = 'anonymous', modelId = 'gpt-4o-mini' } = await request.json()

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

    // Проверяем токен-лимиты перед вызовом OpenAI API (монетизация)
    if (userId !== 'anonymous') {
      try {
        const userTokensUsed = await getUserTokenUsage(userId)
        
        // Определяем статус пользователя (пока заглушка, позже будет из БД)
        const isPremium = false // TODO: получать из user_stats или auth metadata
        const tokenLimit = isPremium ? 10000 : 1000
        
        if (userTokensUsed > tokenLimit) {
          console.log(`🚫 Token limit exceeded for user ${userId}: ${userTokensUsed}/${tokenLimit}`)
          
          return NextResponse.json({
            error: 'Token limit reached',
            upgrade_url: '/upgrade',
            tokens_used: userTokensUsed,
            limit: tokenLimit,
            paywall: {
              type: 'token_limit',
              cost: 2.00,
              message: 'Разблокировать 2000 токенов за $2?',
              features: ['Дополнительные 2000 токенов', 'Приоритетная обработка', '24 часа доступа']
            }
          }, { status: 402 })
        } else if (userTokensUsed > tokenLimit * 0.8) {
          // Предупреждение при 80% лимита
          console.log(`⚠️ Token usage warning for user ${userId}: ${userTokensUsed}/${tokenLimit} (${Math.round((userTokensUsed/tokenLimit)*100)}%)`)
        }
      } catch (error) {
        console.error('Error checking token limits:', error)
        // Продолжаем выполнение при ошибке проверки лимитов
      }
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

    // Логируем использование токенов для монетизации
    if (userId !== 'anonymous' && response.usage) {
      try {
        await logTokenUsage({
          user_id: userId,
          model_id: modelId,
          prompt_tokens: response.usage.prompt_tokens || 0,
          completion_tokens: response.usage.completion_tokens || 0,
          total_tokens: response.usage.total_tokens || 0,
          cost: calculateCost(modelId, response.usage.prompt_tokens || 0, response.usage.completion_tokens || 0)
        })
        console.log(`💰 Logged ${response.usage.total_tokens} tokens for user ${userId}`)
      } catch (error) {
        console.error('Failed to log token usage:', error)
        // Не прерываем выполнение если логирование не удалось
      }
    }

    // Обрабатываем специальные команды
    const processedResponse = await processSpecialCommands(message, aiResponse, userId, commandType)

    return NextResponse.json({ 
      response: processedResponse.text,
      actions: processedResponse.actions,
      commandType,
      modelUsed: modelId,
      tokensUsed: response.usage?.total_tokens || 0
    })

  } catch (error) {
    console.error('Error in Arcanum Brain API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      response: `Извините, произошла ошибка: ${errorMessage}. Попробуйте еще раз.`,
      type: 'system'
    }, { status: 500 })
  }
}

// GET метод для тестирования
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