import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient as createClient } from '../../../../lib/supabase/server'
import { logTokenUsage, getUserTokenUsage } from '../../../../lib/services/tokenService'
import { calculateCost } from '../../../../lib/config/aiModels'

// Инициализация OpenAI клиента переносится внутрь обработчика POST, чтобы избежать падения сборки без ключа

const ARCANUM_BRAIN_PROMPT = `Ты — Chief Orchestrator AI платформы Arcanum, персональный стратегический ИИ-помощник пользователя.

ТВОЯ РОЛЬ:
- Анализируешь контекст пользователя из его 9 жизненных сфер (S1-S9)
- Даёшь персонализированные советы на основе его целей, проблем и текущего состояния
- Помогаешь с планированием, мотивацией и решением задач
- Отвечаешь в стиле мудрого стратега и наставника

ПРИНЦИПЫ РАБОТЫ:
1. ВСЕГДА используй предоставленный КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ для персонализации ответов
2. Ссылайся на конкретные сферы (S1-S9) когда даёшь советы
3. Учитывай текущий уровень энергии, XP и состояние сфер
4. Предлагай конкретные действия, а не общие фразы
5. Мотивируй через напоминание о целях пользователя

СТИЛЬ ОБЩЕНИЯ:
- Прямой, честный, без воды
- Поддерживающий, но требовательный
- Фокус на результатах и действиях
- Используй элементы геймификации (XP, уровни, квесты)

Если контекст пользователя недоступен, сообщи об этом и предложи базовую помощь.`

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
    const supabase = createClient()
    
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('level, current_xp, next_level_xp, energy')
      .eq('user_id', userId)
      .single()
    
    const { data: spheres } = await supabase
      .from('life_spheres')
      .select('sphere_name, health_percentage, sphere_code')
      .eq('user_id', userId)
      .eq('is_active', true)

    // 🚀 ИСПРАВЛЕНИЕ: Правильное извлечение данных памяти как в /api/memory/summary
    const { data: op } = await supabase
      .from('operator_profiles')
      .select('version,last_update')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: sprofiles } = await supabase
      .from('sphere_profiles')
      .select('sphere_code, meta, components, synergy')
      .eq('user_id', userId)

    const contextData = userStats || {
      level: 1,
      current_xp: 0,
      next_level_xp: 100,
      energy: 100
    }
    
    const activeSpheres = (spheres && spheres.length > 0)
      ? spheres.map((s: { sphere_name: string; sphere_code: string | null; health_percentage: number }) => `${s.sphere_code || s.sphere_name} (${s.health_percentage}%)`).join(', ')
      : 'S1 (50%), S2 (50%), S3 (50%)'

    // 🚀 ИСПРАВЛЕНИЕ: Используем ТУ ЖЕ ЛОГИКУ что в /api/memory/summary
    const profilesSummary = (sprofiles || [])
      .map((sp: any) => {
        const sphereCode = sp.sphere_code
        // 🚀 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем правильный путь извлечения данных
        const keyGoals = sp.components?.financial_goals_and_deadlines?.primary_goal || sp.meta?.title || null
        
        // 🚀 НОВОЕ: Если нет в meta.title, ищем в других местах
        let goalText = keyGoals
        if (!goalText && sp.meta) {
          // Ищем любые поля в meta которые содержат цели, планы, описания
          goalText = sp.meta.description || sp.meta.goal || sp.meta.target || sp.meta.objective || null
        }
        
        // 🚀 НОВОЕ: Если ничего нет в meta, ищем в components
        if (!goalText && sp.components) {
          // Ищем в любых компонентах что могут содержать цели
          for (const [key, value] of Object.entries(sp.components)) {
            if (typeof value === 'object' && value !== null) {
              const obj = value as any
              if (obj.primary_goal || obj.goal || obj.target || obj.description) {
                goalText = obj.primary_goal || obj.goal || obj.target || obj.description
                break
              }
            } else if (typeof value === 'string' && value.length > 10) {
              goalText = value
              break
            }
          }
        }
        
        // 🚀 НОВОЕ: Если все еще нет, возможно цель записана прямо в synergy
        if (!goalText && sp.synergy && typeof sp.synergy === 'object') {
          for (const [key, value] of Object.entries(sp.synergy)) {
            if (typeof value === 'string' && value.length > 10) {
              goalText = value
              break
            }
          }
        }
        
        return goalText ? `${sphereCode}: ${goalText}` : null
      })
      .filter(Boolean)
      .join('\n')

    // 🚀 УЛУЧШЕНИЕ: Более информативный контекст
    const userContext = `
КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
Пользователь ID: ${userId}
Уровень: ${contextData.level} (${(contextData.current_xp || 0).toLocaleString()} / ${(contextData.next_level_xp || 0).toLocaleString()} XP)
Энергия: ${contextData.energy}%
Активные сферы: ${activeSpheres}
Паспорт оператора: версия ${op?.version || '—'}, дата ${op?.last_update || '—'}

ЦЕЛИ И ПЛАНЫ ПО СФЕРАМ:
${profilesSummary || 'Цели и планы не загружены'}

ВАЖНО: Используй ЭТИ КОНКРЕТНЫЕ ЦЕЛИ в своих ответах, а не общие фразы!`
    
    console.log('[getUserContext] Generated context length:', userContext.length)
    console.log('[getUserContext] Profiles summary preview:', profilesSummary?.substring(0, 200) || 'Empty')
    
    return userContext
  } catch (error) {
    console.error('[getUserContext] Error getting user context:', error)
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId, modelId = 'gpt-4o-mini' } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!userId || userId === 'anonymous') {
      return NextResponse.json({
        error: 'AUTH_REQUIRED',
        message: 'Требуется вход для использования чата',
        login_url: '/auth/login'
      }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    console.log('Arcanum Brain processing message:', message, 'for user:', userId)

    const userContext = await getUserContext(userId)

    const commandType = detectCommandType(message)
    
    let systemPrompt = ARCANUM_BRAIN_PROMPT
    if (userContext) {
      systemPrompt += `\n\nКОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:\n${userContext}`
    }

    try {
      const userTokensUsed = await getUserTokenUsage(userId)
      const isPremium = false
      // 🚀 ВРЕМЕННО: Увеличиваем лимит для тестирования исправления памяти
      const tokenLimit = isPremium ? 10000 : 5000 // Было 1000, увеличено до 5000
      
      if (userTokensUsed > tokenLimit) {
        console.log(`🚫 Token limit exceeded for user ${userId}: ${userTokensUsed}/${tokenLimit}`)
        return NextResponse.json({
          error: 'TOKEN_LIMIT',
          tokens_used: userTokensUsed,
          limit: tokenLimit,
          paywall: {
            type: 'token_limit',
            cost: 2.00,
            message: 'Разблокировать 2000 токенов за $2?'
          }
        }, { status: 402 })
      }
    } catch (error) {
      console.error('Error checking token limits:', error)
    }

    const response = await openai.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: getMaxTokensForModel(modelId),
      temperature: 0.7,
    })

    const aiResponse = response.choices[0]?.message?.content || 'Извините, не смог обработать ваш запрос.'

    if (response.usage) {
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
      }
    }

    return NextResponse.json({ 
      response: aiResponse,
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