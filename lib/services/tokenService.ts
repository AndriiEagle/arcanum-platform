import { createServerClient } from '../supabase/server'

interface TokenUsage {
  user_id: string
  model_id: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost: number
}

/**
 * Логирует использование токенов в базу данных
 * Используется после каждого вызова OpenAI API
 */
export async function logTokenUsage(usage: TokenUsage): Promise<void> {
  const supabase = createServerClient()
  
  const { error } = await supabase
    .from('ai_model_usage')
    .insert([{
      ...usage,
      request_type: 'chat',
      created_at: new Date().toISOString()
    }])
  
  if (error) {
    console.error('Token logging failed:', error)
    throw new Error(`Failed to log token usage: ${error.message}`)
  }
}

/**
 * Получает количество токенов использованных пользователем за последние 24 часа
 * Используется для проверки лимитов перед API вызовами
 */
export async function getUserTokenUsage(userId: string): Promise<number> {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('ai_model_usage')
    .select('total_tokens')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
  
  if (error) {
    console.error('Failed to get user token usage:', error)
    return 0
  }
  
  return data?.reduce((sum, usage) => sum + usage.total_tokens, 0) || 0
}

/**
 * Получает детальную статистику использования токенов пользователем
 * Используется для аналитики и отображения в UI
 */
export async function getUserTokenStats(userId: string): Promise<{
  today: number
  thisWeek: number
  thisMonth: number
  totalCost: number
}> {
  const supabase = createServerClient()
  
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24*60*60*1000)
  const weekAgo = new Date(now.getTime() - 7*24*60*60*1000)
  const monthAgo = new Date(now.getTime() - 30*24*60*60*1000)
  
  const { data, error } = await supabase
    .from('ai_model_usage')
    .select('total_tokens, cost, created_at')
    .eq('user_id', userId)
    .gte('created_at', monthAgo.toISOString())
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Failed to get user token stats:', error)
    return { today: 0, thisWeek: 0, thisMonth: 0, totalCost: 0 }
  }
  
  const stats = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalCost: 0
  }
  
  data?.forEach(usage => {
    const createdAt = new Date(usage.created_at)
    stats.totalCost += usage.cost || 0
    
    if (createdAt >= dayAgo) {
      stats.today += usage.total_tokens
    }
    if (createdAt >= weekAgo) {
      stats.thisWeek += usage.total_tokens
    }
    if (createdAt >= monthAgo) {
      stats.thisMonth += usage.total_tokens
    }
  })
  
  return stats
}

/**
 * Проверяет достиг ли пользователь лимита токенов
 * Возвращает информацию о лимите и рекомендации по upgrade
 */
export async function checkTokenLimit(userId: string, isPremium: boolean = false): Promise<{
  isWithinLimit: boolean
  tokensUsed: number
  limit: number
  percentageUsed: number
  upgradeRecommended: boolean
}> {
  const tokensUsed = await getUserTokenUsage(userId)
  const limit = isPremium ? 10000 : 1000
  const percentageUsed = (tokensUsed / limit) * 100
  
  return {
    isWithinLimit: tokensUsed <= limit,
    tokensUsed,
    limit,
    percentageUsed,
    upgradeRecommended: percentageUsed > 80
  }
} 