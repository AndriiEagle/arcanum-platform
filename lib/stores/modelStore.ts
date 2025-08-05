import { create } from 'zustand'
import { AIModel, getDefaultModel, getModelById } from '../config/aiModels'

interface ModelState {
  selectedModel: AIModel
  isModelSelectorOpen: boolean
  totalTokensUsed: number
  totalCostSpent: number
  
  // Действия
  setSelectedModel: (modelId: string) => void
  toggleModelSelector: () => void
  setModelSelector: (isOpen: boolean) => void
  addTokenUsage: (inputTokens: number, outputTokens: number) => void
  resetUsageStats: () => void
  
  // Утилиты
  getCurrentModelId: () => string
  canUseModel: (modelId: string) => boolean
}

export const useModelStore = create<ModelState>((set, get) => ({
  selectedModel: getDefaultModel(),
  isModelSelectorOpen: false,
  totalTokensUsed: 0,
  totalCostSpent: 0,

  setSelectedModel: (modelId: string) => {
    const model = getModelById(modelId)
    if (model && model.isAvailable) {
      set({ selectedModel: model })
      
      // Логируем смену модели
      console.log(`🤖 Модель изменена на: ${model.name} (${model.id})`)
      
      // Можно добавить аналитику
      // analytics.track('model_changed', { from: get().selectedModel.id, to: modelId })
    }
  },

  toggleModelSelector: () => set((state) => ({ 
    isModelSelectorOpen: !state.isModelSelectorOpen 
  })),

  setModelSelector: (isOpen: boolean) => set({ 
    isModelSelectorOpen: isOpen 
  }),

  addTokenUsage: (inputTokens: number, outputTokens: number) => {
    const { selectedModel } = get()
    const cost = (inputTokens / 1000) * selectedModel.costPer1kTokens.input + 
                 (outputTokens / 1000) * selectedModel.costPer1kTokens.output
    
    set((state) => ({
      totalTokensUsed: state.totalTokensUsed + inputTokens + outputTokens,
      totalCostSpent: state.totalCostSpent + cost
    }))
  },

  resetUsageStats: () => set({
    totalTokensUsed: 0,
    totalCostSpent: 0
  }),

  getCurrentModelId: () => get().selectedModel.id,

  canUseModel: (modelId: string) => {
    const model = getModelById(modelId)
    return model ? model.isAvailable : false
  }
}))

// Хуки для удобства
export const useCurrentModel = () => {
  return useModelStore(state => state.selectedModel)
}

export const useModelSelector = () => {
  const { isModelSelectorOpen, toggleModelSelector, setModelSelector } = useModelStore()
  return { isModelSelectorOpen, toggleModelSelector, setModelSelector }
}

export const useUsageStats = () => {
  const { totalTokensUsed, totalCostSpent, resetUsageStats } = useModelStore()
  return { totalTokensUsed, totalCostSpent, resetUsageStats }
} 