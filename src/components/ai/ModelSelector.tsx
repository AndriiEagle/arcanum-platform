'use client'

import { useState } from 'react'
import { useCurrentModel, useModelSelector, useModelStore, useUsageStats } from '../../../lib/stores/modelStore'
import { getAvailableModels, MODEL_CATEGORIES, AIModel } from '../../../lib/config/aiModels'
import PaywallModal from '../payments/PaywallModal'

export default function ModelSelector() {
  const currentModel = useCurrentModel()
  const { isModelSelectorOpen, toggleModelSelector, setModelSelector } = useModelSelector()
  const { setSelectedModel } = useModelStore()
  const { totalTokensUsed, totalCostSpent, resetUsageStats } = useUsageStats()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  // Состояние для Premium Paywall Modal
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false)
  const [blockedModelId, setBlockedModelId] = useState<string | null>(null)
  
  // Определение премиум моделей (дорогие модели требуют подписку)
  const premiumModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'o1-preview', 'o1-mini']
  
  // Временная проверка премиум статуса (в реальном проекте - из authStore)
  const isPremium = false // TODO: получить из user.isPremium
  
  const availableModels = getAvailableModels()

  const handleModelSelect = (modelId: string) => {
    // Проверка премиум моделей
    if (premiumModels.includes(modelId) && !isPremium) {
      console.log(`🚫 Блокировка премиум модели: ${modelId}`)
      setBlockedModelId(modelId)
      setShowPremiumPaywall(true)
      return
    }
    
    // Обычная логика выбора модели
    console.log(`✅ Выбрана модель: ${modelId}`)
    setSelectedModel(modelId)
    setModelSelector(false)
  }
  
  // Обработка успешной оплаты премиум подписки
  const handlePremiumPaymentSuccess = (paymentIntentId: string) => {
    console.log('👑 Премиум подписка активирована:', paymentIntentId)
    setShowPremiumPaywall(false)
    
    if (blockedModelId) {
      console.log(`✅ Разблокирована модель: ${blockedModelId}`)
      setSelectedModel(blockedModelId)
      setBlockedModelId(null)
      setModelSelector(false)
    }
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
                    {/* Индикатор выбранной модели и премиум статус */}
                    <div className="absolute top-2 right-2 flex flex-col items-end space-y-1">
                      {premiumModels.includes(model.id) && (
                        <div className={`text-xs px-2 py-1 rounded-full flex items-center ${
                          isPremium 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-yellow-600 text-white'
                        }`}>
                          {isPremium ? '👑 Премиум' : '🔒 Премиум'}
                        </div>
                      )}
                      {currentModel.id === model.id && (
                        <span className="text-green-400 text-sm">✓ Активна</span>
                      )}
                    </div>

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
                          <h4 className={`font-semibold ${
                            premiumModels.includes(model.id) && !isPremium ? 'text-yellow-300' : 'text-white'
                          }`}>
                            {model.name}
                          </h4>
                          {!model.isAvailable && (
                            <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded-full">
                              Скоро
                            </span>
                          )}
                          {premiumModels.includes(model.id) && !isPremium && (
                            <span className="text-xs bg-yellow-700 text-yellow-200 px-2 py-0.5 rounded-full">
                              Требует подписку
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

      {/* Premium Paywall Modal */}
      {/* Временная заглушка до исправления импорта */}
      {showPremiumPaywall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              👑 Премиум подписка
            </h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Получите доступ к самым мощным AI моделям и безлимитным токенам
            </p>
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Что включено:</div>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li>• Все премиум модели (GPT-4, o1-preview)</li>
                <li>• Безлимитные токены</li>
                <li>• Приоритетная поддержка</li>
                <li>• Расширенная аналитика</li>
              </ul>
            </div>
            {blockedModelId && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  🎯 Разблокируется модель: <span className="font-semibold">{blockedModelId}</span>
                </div>
              </div>
            )}
            <p className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
              $9.99 <span className="text-sm font-normal text-gray-500">/ месяц</span>
            </p>
            <div className="flex space-x-4">
              <button 
                onClick={() => {
                  console.log('💳 Переход к оформлению премиум подписки')
                  handlePremiumPaymentSuccess(`pi_premium_${Date.now()}`)
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4 rounded hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Оформить подписку
              </button>
              <button 
                onClick={() => {
                  setShowPremiumPaywall(false)
                  setBlockedModelId(null)
                }}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 