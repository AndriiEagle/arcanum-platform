import { create } from 'zustand'
import { getUserTokenUsage, getUserTokenStats, checkTokenLimit } from '../services/tokenService'

interface TokenState {
  // Основные данные
  used: number
  limit: number
  isLoading: boolean
  lastUpdated: Date | null
  isPremium: boolean
  
  // Детальная статистика
  stats: {
    today: number
    thisWeek: number  
    thisMonth: number
    totalCost: number
  }
  
  // Состояние UI
  showWarning: boolean
  warningMessage: string
  
  // Действия
  updateUsage: (userId: string) => Promise<void>
  updateStats: (userId: string) => Promise<void>
  checkLimits: (userId: string) => Promise<{
    isWithinLimit: boolean
    upgradeRecommended: boolean
    percentageUsed: number
  }>
  setLimit: (limit: number) => void
  setPremiumStatus: (isPremium: boolean) => void
  resetWarning: () => void
}

export const useTokenStore = create<TokenState>((set, get) => ({
    // Начальное состояние
    used: 0,
    limit: 1000,
    isLoading: false,
    lastUpdated: null,
    isPremium: false,
    
    stats: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      totalCost: 0
    },
    
    showWarning: false,
    warningMessage: '',

    // Обновление базовой статистики использования
    updateUsage: async (userId: string) => {
      set({ isLoading: true })
      
      try {
        const usage = await getUserTokenUsage(userId)
        const now = new Date()
        
        set({ 
          used: usage, 
          isLoading: false,
          lastUpdated: now
        })
        
        // Проверяем нужно ли показывать предупреждение
        const { limit } = get()
        const percentageUsed = (usage / limit) * 100
        
        if (percentageUsed > 80 && percentageUsed <= 100) {
          set({
            showWarning: true,
            warningMessage: `Вы использовали ${percentageUsed.toFixed(0)}% токенов. Скоро потребуется upgrade!`
          })
        } else if (percentageUsed > 100) {
          set({
            showWarning: true,
            warningMessage: 'Лимит токенов превышен! Требуется upgrade для продолжения работы.'
          })
        } else {
          set({ showWarning: false, warningMessage: '' })
        }
        
      } catch (error) {
        console.error('Failed to update token usage:', error)
        set({ 
          isLoading: false,
          showWarning: true,
          warningMessage: 'Ошибка загрузки статистики токенов'
        })
      }
    },

    // Обновление детальной статистики
    updateStats: async (userId: string) => {
      try {
        const stats = await getUserTokenStats(userId)
        set({ stats })
      } catch (error) {
        console.error('Failed to update token stats:', error)
      }
    },

    // Проверка лимитов с дополнительной логикой
    checkLimits: async (userId: string) => {
      const { isPremium } = get()
      
      try {
        const result = await checkTokenLimit(userId, isPremium)
        
        // Обновляем состояние на основе результата проверки
        set({
          used: result.tokensUsed,
          limit: result.limit,
          showWarning: result.upgradeRecommended,
          warningMessage: result.upgradeRecommended 
            ? `Использовано ${result.percentageUsed.toFixed(0)}% токенов. Рекомендуем upgrade!`
            : ''
        })
        
        return {
          isWithinLimit: result.isWithinLimit,
          upgradeRecommended: result.upgradeRecommended,
          percentageUsed: result.percentageUsed
        }
      } catch (error) {
        console.error('Failed to check token limits:', error)
        return {
          isWithinLimit: true,
          upgradeRecommended: false,
          percentageUsed: 0
        }
      }
    },

    // Установка лимита (обычно вызывается при изменении статуса пользователя)
    setLimit: (limit: number) => {
      set({ limit })
      
      // Пересчитываем предупреждения с новым лимитом
      const { used } = get()
      const percentageUsed = (used / limit) * 100
      
      if (percentageUsed > 80) {
        set({
          showWarning: true,
          warningMessage: `С новым лимитом вы используете ${percentageUsed.toFixed(0)}% токенов`
        })
      } else {
        set({ showWarning: false, warningMessage: '' })
      }
    },

    // Установка премиум статуса
    setPremiumStatus: (isPremium: boolean) => {
      const newLimit = isPremium ? 10000 : 1000
      set({ 
        isPremium,
        limit: newLimit
      })
      
      // Обновляем предупреждения с новым статусом
      const { used } = get()
      const percentageUsed = (used / newLimit) * 100
      
      if (isPremium && percentageUsed < 80) {
        set({
          showWarning: false,
          warningMessage: ''
        })
      }
    },

    // Сброс предупреждений
    resetWarning: () => set({ showWarning: false, warningMessage: '' })
  }))

// Селекторы для удобного использования в компонентах
export const selectTokenUsage = (state: TokenState) => ({
  used: state.used,
  limit: state.limit,
  percentageUsed: (state.used / state.limit) * 100,
  isLoading: state.isLoading
})

export const selectTokenWarning = (state: TokenState) => ({
  showWarning: state.showWarning,
  warningMessage: state.warningMessage,
  isNearLimit: (state.used / state.limit) > 0.8
})

export const selectTokenStats = (state: TokenState) => ({
  stats: state.stats,
  isPremium: state.isPremium,
  lastUpdated: state.lastUpdated
})

// Хук для автоматического обновления токенов (упрощенная версия)
export const useTokenAutoUpdate = (userId: string | null, intervalMs: number = 30000) => {
  const updateUsage = useTokenStore(state => state.updateUsage)
  const updateStats = useTokenStore(state => state.updateStats)
  
  // Простая логика обновления без subscribe
  return { updateUsage, updateStats }
} 