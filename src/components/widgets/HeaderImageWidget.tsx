'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '../../../lib/stores/uiStore'

interface HeaderImageWidgetProps {
  onError?: (error: string) => void
}

export default function HeaderImageWidget({ onError }: HeaderImageWidgetProps = {}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState<string>('')
  const { autoGenerateHeaderImage } = useUIStore()

  const defaultPrompt = "Эпический цифровой арт, изображающий программиста и писателя, который играет на гитаре на вершине горы, в стиле киберпанк"

  const generateImage = async (customPrompt?: string) => {
    const promptToUse = customPrompt || defaultPrompt
    setCurrentPrompt(promptToUse)
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-header', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptToUse }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image')
      }

      setImageUrl(data.imageUrl)
      console.log('Image generated successfully:', data.imageUrl)
    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка'
      setError(errorMessage)
      onError?.(errorMessage)
      console.error('Error generating image:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Генерируем изображение при первой загрузке
  useEffect(() => {
    if (autoGenerateHeaderImage) {
      generateImage()
    }
  }, [])

  return (
    <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-sm rounded-lg p-6 border border-purple-700 shadow-2xl min-w-[400px] max-w-[500px]">
      {/* Заголовок виджета */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🖼️</span>
          Эпическая Шапка
        </h3>
        <button
          onClick={() => generateImage()}
          disabled={isGenerating}
          className={`
            px-3 py-1.5 rounded text-sm font-medium transition-all duration-200
            ${isGenerating 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105'
            }
          `}
        >
          {isGenerating ? '🔄 Генерация...' : '✨ Перегенерировать'}
        </button>
      </div>

      {/* Область изображения */}
      <div className="relative bg-gray-800/50 rounded-lg overflow-hidden mb-4 min-h-[200px] flex items-center justify-center">
        {isGenerating ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-white font-medium">🎨 ИИ создаёт шедевр...</p>
              <p className="text-gray-400 text-sm mt-1">Это может занять 10-30 секунд</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <div className="text-red-400 text-4xl mb-2">⚠️</div>
            <p className="text-red-300 font-medium mb-2">Ошибка генерации</p>
            <p className="text-red-200 text-sm break-words">{error}</p>
            <button
              onClick={() => generateImage()}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        ) : imageUrl ? (
          <div className="relative group">
            <img 
              src={imageUrl} 
              alt="AI-generated header" 
              className="w-full h-auto rounded transition-transform group-hover:scale-[1.02]"
              style={{ maxHeight: '300px', objectFit: 'cover' }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded"></div>
          </div>
        ) : (
          <div className="text-center p-4">
            <div className="text-gray-400 text-4xl mb-2">🎨</div>
            <p className="text-gray-300">Готов к генерации</p>
          </div>
        )}
      </div>

      {/* Информация о промпте */}
      <div className="bg-gray-800/30 rounded p-3 mb-3">
        <p className="text-xs text-gray-400 mb-1">Текущий промпт:</p>
        <p className="text-sm text-gray-300 leading-relaxed">{currentPrompt || 'Промпт не задан'}</p>
      </div>

      {/* Статистика */}
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>Версия: DALL-E 3</span>
        <span>Размер: 1024×1024</span>
        <span>Качество: Стандарт</span>
      </div>
    </div>
  )
} 