'use client'

import { useState } from 'react'
import { useCurrentModel, useModelSelector, useModelStore, useUsageStats } from '../../../lib/stores/modelStore'
import { getAvailableModels, MODEL_CATEGORIES, AIModel } from '../../../lib/config/aiModels'

export default function ModelSelector() {
  const currentModel = useCurrentModel()
  const { isModelSelectorOpen, toggleModelSelector, setModelSelector } = useModelSelector()
  const { setSelectedModel } = useModelStore()
  const { totalTokensUsed, totalCostSpent, resetUsageStats } = useUsageStats()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const availableModels = getAvailableModels()

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId)
    setModelSelector(false)
  }

  const getCategoryModels = (category: string): AIModel[] => {
    if (category === 'all') return availableModels
    const categoryIds = MODEL_CATEGORIES[category as keyof typeof MODEL_CATEGORIES] || []
    return availableModels.filter(model => categoryIds.includes(model.id))
  }

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'ultrafast': return '⚡⚡'
      case 'fast': return '⚡'
      case 'standard': return '⏳'
      case 'slow': return '🐌'
      default: return '❓'
    }
  }

  const getIntelligenceIcon = (intelligence: string) => {
    switch (intelligence) {
      case 'basic': return '🧠'
      case 'advanced': return '🧠🧠'
      case 'expert': return '🧠🧠🧠'
      case 'genius': return '🧠✨'
      default: return '🧠'
    }
  }

  return (
    <div className="relative">
      {/* Кнопка вызова селектора */}
      <button
        onClick={toggleModelSelector}
        className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 transition-colors"
        title={`Текущая модель: ${currentModel.name}`}
      >
        <span style={{ color: currentModel.color }} className="text-lg">
          {currentModel.icon}
        </span>
        <div className="text-left">
          <div className="text-sm font-medium text-white">{currentModel.name}</div>
          <div className="text-xs text-gray-400">{getSpeedIcon(currentModel.speed)} {getIntelligenceIcon(currentModel.intelligence)}</div>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Панель селектора */}
      {isModelSelectorOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setModelSelector(false)}
          />
          
          {/* Панель */}
          <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 min-w-[480px] max-h-[600px] overflow-hidden">
            
            {/* Заголовок */}
            <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">🤖 Выбор AI Модели</h3>
                <button
                  onClick={() => setModelSelector(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Статистика использования */}
            <div className="bg-gray-800/50 p-3 border-b border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400">
                    📊 Токенов: <span className="text-cyan-400 font-mono">{totalTokensUsed.toLocaleString()}</span>
                  </span>
                  <span className="text-gray-400">
                    💰 Потрачено: <span className="text-green-400 font-mono">${totalCostSpent.toFixed(4)}</span>
                  </span>
                </div>
                <button
                  onClick={resetUsageStats}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Сбросить
                </button>
              </div>
            </div>

            {/* Категории */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', name: 'Все', icon: '🌐' },
                  { id: 'economical', name: 'Экономичные', icon: '💰' },
                  { id: 'balanced', name: 'Сбалансированные', icon: '⚖️' },
                  { id: 'premium', name: 'Премиум', icon: '💎' },
                  { id: 'reasoning', name: 'Рассуждающие', icon: '🧠' },
                  { id: 'nextgen', name: 'Будущее', icon: '🌟' }
                ].map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Список моделей */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              <div className="p-4 space-y-3">
                {getCategoryModels(selectedCategory).map(model => (
                  <div
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                      currentModel.id === model.id
                        ? 'border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-500/20'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    {/* Индикатор выбранной модели */}
                    {currentModel.id === model.id && (
                      <div className="absolute top-2 right-2">
                        <span className="text-green-400 text-sm">✓ Активна</span>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      {/* Иконка модели */}
                      <div 
                        className="text-2xl flex-shrink-0"
                        style={{ color: model.color }}
                      >
                        {model.icon}
                      </div>

                      {/* Информация о модели */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-white">{model.name}</h4>
                          {!model.isAvailable && (
                            <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded-full">
                              Скоро
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                          {model.description}
                        </p>

                        {/* Характеристики */}
                        <div className="flex items-center space-x-4 mb-2">
                          <span className="text-xs text-gray-500">
                            {getSpeedIcon(model.speed)} {model.speed}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getIntelligenceIcon(model.intelligence)} {model.intelligence}
                          </span>
                          <span className="text-xs text-gray-500">
                            📄 {(model.maxTokens / 1000).toFixed(0)}K
                          </span>
                        </div>

                        {/* Специальности */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {model.specialties.slice(0, 3).map(specialty => (
                            <span
                              key={specialty}
                              className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>

                        {/* Стоимость */}
                        <div className="text-xs text-gray-500">
                          💸 ${model.costPer1kTokens.input.toFixed(4)} / ${model.costPer1kTokens.output.toFixed(4)} за 1K токенов
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Подвал */}
            <div className="bg-gray-800/50 p-3 border-t border-gray-700">
              <div className="text-xs text-gray-500 text-center">
                💡 Модели автоматически обновляются при появлении новых версий
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.7);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.9);
        }
      `}</style>
    </div>
  )
} 