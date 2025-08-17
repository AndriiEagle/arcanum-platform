import { create } from 'zustand'

interface EffectsState {
  // Level Up анимация
  isLevelUpActive: boolean
  currentLevel: number
  
  // Глобальный дизайн и фокус
  currentFocusSphere: string | null
  globalTheme: 'default' | 'health' | 'career' | 'finance' | 'relationships' | 'personal-growth'
  
  // Звуковые настройки
  soundEnabled: boolean
  soundVolume: number
  
  // Частицы и эффекты
  particlesEnabled: boolean
  
  // Новый: Салют после оплаты
  isFireworksActive: boolean
  triggerFireworks: (durationMs?: number) => void
  completeFireworks: () => void
  
  // Запланированные награды
  scheduledRewards: ScheduledReward[]
  
  // Действия для Level Up
  triggerLevelUp: (newLevel: number) => void
  completeLevelUp: () => void
  
  // Управление фокусом и темой
  setFocusSphere: (sphereId: string | null) => void
  setGlobalTheme: (theme: EffectsState['globalTheme']) => void
  
  // Управление звуком
  toggleSound: () => void
  setSoundVolume: (volume: number) => void
  
  // Управление эффектами
  toggleParticles: () => void
  
  // Запланированные награды
  addScheduledReward: (reward: Omit<ScheduledReward, 'id'>) => void
  removeScheduledReward: (id: string) => void
  checkAndTriggerRewards: (currentLevel: number) => ScheduledReward[]
}

interface ScheduledReward {
  id: string
  triggerLevel: number
  rewardType: 'video' | 'message' | 'achievement' | 'unlock'
  rewardContent: string
  isTriggered: boolean
}

// Темы для разных сфер
const SPHERE_THEMES = {
  'health': {
    primary: '#10B981', // Зеленый
    secondary: '#059669',
    accent: '#34D399'
  },
  'career': {
    primary: '#3B82F6', // Синий
    secondary: '#2563EB',
    accent: '#60A5FA'
  },
  'finance': {
    primary: '#F59E0B', // Оранжевый/золотой
    secondary: '#D97706',
    accent: '#FBBF24'
  },
  'relationships': {
    primary: '#EC4899', // Розовый
    secondary: '#DB2777',
    accent: '#F472B6'
  },
  'personal-growth': {
    primary: '#8B5CF6', // Фиолетовый
    secondary: '#7C3AED',
    accent: '#A78BFA'
  }
}

export const useEffectsStore = create<EffectsState>((set, get) => ({
  // Начальное состояние
  isLevelUpActive: false,
  currentLevel: 15,
  currentFocusSphere: null,
  globalTheme: 'default',
  soundEnabled: true,
  soundVolume: 0.7,
  particlesEnabled: true,
  // Новый: салют флаг
  isFireworksActive: false,
  scheduledRewards: [
    {
      id: 'reward-20',
      triggerLevel: 20,
      rewardType: 'achievement',
      rewardContent: 'Поздравляю! Ты достиг 20 уровня! Теперь доступны новые возможности.',
      isTriggered: false
    },
    {
      id: 'reward-25',
      triggerLevel: 25,
      rewardType: 'video',
      rewardContent: 'https://example.com/video-message-25.mp4',
      isTriggered: false
    }
  ],

  // Level Up действия
  triggerLevelUp: (newLevel: number) => {
    set({ 
      isLevelUpActive: true, 
      currentLevel: newLevel 
    })
    
    // Проверяем запланированные награды
    const state = get()
    const triggeredRewards = state.checkAndTriggerRewards(newLevel)
    
    // Логируем событие (в реальном приложении отправлять в аналитику)
    console.log(`🎉 Level UP! New level: ${newLevel}`, {
      previousLevel: newLevel - 1,
      triggeredRewards: triggeredRewards.length,
      timestamp: new Date().toISOString()
    })
  },

  completeLevelUp: () => {
    set({ isLevelUpActive: false })
  },

  // Новый: Салют
  triggerFireworks: () => {
    set({ isFireworksActive: true })
  },
  completeFireworks: () => {
    set({ isFireworksActive: false })
  },

  // Управление фокусом
  setFocusSphere: (sphereId: string | null) => {
    const themeMap: Record<string, EffectsState['globalTheme']> = {
      '1': 'health',      // Здоровье
      '2': 'career',      // Карьера
      '4': 'finance',     // Финансы
      '3': 'relationships', // Отношения
      '5': 'personal-growth' // Саморазвитие
    }
    
    const newTheme = sphereId ? themeMap[sphereId] || 'default' : 'default'
    
    set({ 
      currentFocusSphere: sphereId,
      globalTheme: newTheme
    })
    
    // Применяем изменения к CSS переменным для глобального эффекта
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      if (newTheme !== 'default' && SPHERE_THEMES[newTheme as keyof typeof SPHERE_THEMES]) {
        const theme = SPHERE_THEMES[newTheme as keyof typeof SPHERE_THEMES]
        root.style.setProperty('--theme-primary', theme.primary)
        root.style.setProperty('--theme-secondary', theme.secondary)
        root.style.setProperty('--theme-accent', theme.accent)
        
        // Добавляем класс для анимированного перехода
        document.body.classList.add('theme-transition')
        setTimeout(() => {
          document.body.classList.remove('theme-transition')
        }, 1000)
      } else {
        // Сброс к дефолтной теме
        root.style.removeProperty('--theme-primary')
        root.style.removeProperty('--theme-secondary')
        root.style.removeProperty('--theme-accent')
      }
    }
    
    console.log(`🎯 Focus changed to sphere: ${sphereId}, theme: ${newTheme}`)
  },

  setGlobalTheme: (theme: EffectsState['globalTheme']) => {
    set({ globalTheme: theme })
  },

  // Управление звуком
  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }))
  },

  setSoundVolume: (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    set({ soundVolume: clampedVolume })
  },

  // Управление эффектами
  toggleParticles: () => {
    set((state) => ({ particlesEnabled: !state.particlesEnabled }))
  },

  // Запланированные награды
  addScheduledReward: (reward: Omit<ScheduledReward, 'id'>) => {
    const newReward: ScheduledReward = {
      ...reward,
      id: `reward-${Date.now()}`,
      isTriggered: false
    }
    
    set((state) => ({
      scheduledRewards: [...state.scheduledRewards, newReward]
    }))
  },

  removeScheduledReward: (id: string) => {
    set((state) => ({
      scheduledRewards: state.scheduledRewards.filter(r => r.id !== id)
    }))
  },

  checkAndTriggerRewards: (currentLevel: number) => {
    const state = get()
    const triggeredRewards: ScheduledReward[] = []
    
    const updatedRewards = state.scheduledRewards.map(reward => {
      if (!reward.isTriggered && currentLevel >= reward.triggerLevel) {
        triggeredRewards.push(reward)
        return { ...reward, isTriggered: true }
      }
      return reward
    })
    
    if (triggeredRewards.length > 0) {
      set({ scheduledRewards: updatedRewards })
    }
    
    return triggeredRewards
  }
}))

// Хук для использования глобальных CSS переменных темы
export const useThemeStyles = () => {
  const { globalTheme } = useEffectsStore()
  
  if (globalTheme === 'default') {
    return {
      primary: '#8B5CF6',
      secondary: '#7C3AED', 
      accent: '#A78BFA'
    }
  }
  
  return SPHERE_THEMES[globalTheme as keyof typeof SPHERE_THEMES] || SPHERE_THEMES['personal-growth']
} 