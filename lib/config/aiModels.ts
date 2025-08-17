// Конфигурация всех доступных моделей OpenAI для Arcanum Platform

export interface AIModel {
  id: string
  name: string
  description: string
  maxTokens: number
  costPer1kTokens: {
    input: number  // в долларах
    output: number // в долларах  
  }
  speed: 'ultrafast' | 'fast' | 'standard' | 'slow'
  intelligence: 'basic' | 'advanced' | 'expert' | 'genius'
  specialties: string[]
  color: string
  icon: string
  isAvailable: boolean
}

export const OPENAI_MODELS: Record<string, AIModel> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Самая быстрая и экономичная модель для повседневных задач',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
    speed: 'ultrafast',
    intelligence: 'advanced', 
    specialties: ['Быстрые ответы', 'Базовые задачи', 'Экономия токенов'],
    color: '#10B981', // зеленый
    icon: '⚡',
    isAvailable: true
  },
  
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Оптимизированная мультимодальная модель с отличным балансом скорости и качества',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.0025, output: 0.01 },
    speed: 'fast',
    intelligence: 'expert',
    specialties: ['Мультимодальность', 'Анализ изображений', 'Комплексные задачи'],
    color: '#3B82F6', // синий
    icon: '🔥',
    isAvailable: true
  },
  
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Мощная модель с расширенным контекстом для сложных задач',
    maxTokens: 128000,
    costPer1kTokens: { input: 0.01, output: 0.03 },
    speed: 'standard',
    intelligence: 'expert',
    specialties: ['Большой контекст', 'Глубокий анализ', 'Программирование'],
    color: '#8B5CF6', // фиолетовый
    icon: '🚀',
    isAvailable: true
  },
  
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Классическая модель высокого качества для профессиональных задач',
    maxTokens: 8192,
    costPer1kTokens: { input: 0.03, output: 0.06 },
    speed: 'standard',
    intelligence: 'expert',
    specialties: ['Высокая точность', 'Логические рассуждения', 'Творчество'],
    color: '#F59E0B', // жёлтый
    icon: '💎',
    isAvailable: true
  },
  
  'o1-preview': {
    id: 'o1-preview',
    name: 'o1 Preview', 
    description: 'Рассуждающая модель для сложных логических и научных задач',
    maxTokens: 32768,
    costPer1kTokens: { input: 0.015, output: 0.06 },
    speed: 'slow',
    intelligence: 'genius',
    specialties: ['Глубокие рассуждения', 'Математика', 'Наука', 'Логика'],
    color: '#EC4899', // розовый
    icon: '🧠',
    isAvailable: true
  },
  
  'o1-mini': {
    id: 'o1-mini',
    name: 'o1 Mini',
    description: 'Быстрая рассуждающая модель для кодинга и STEM задач',
    maxTokens: 65536,
    costPer1kTokens: { input: 0.003, output: 0.012 },
    speed: 'fast',
    intelligence: 'genius',
    specialties: ['Программирование', 'STEM', 'Быстрые рассуждения'],
    color: '#06B6D4', // голубой
    icon: '⚡🧠',
    isAvailable: true
  },
  
  'o3': {
    id: 'o3',
    name: 'o3',
    description: 'Революционная модель следующего поколения с невиданными возможностями',
    maxTokens: 200000,
    costPer1kTokens: { input: 0.06, output: 0.24 }, // примерная цена
    speed: 'slow',
    intelligence: 'genius',
    specialties: ['Сверхинтеллект', 'Сложные задачи', 'Инновации', 'AGI-уровень'],
    color: '#DC2626', // красный
    icon: '🌟',
    isAvailable: false // пока не доступна широко
  }
}

// Группировка моделей по категориям
export const MODEL_CATEGORIES = {
  economical: ['gpt-4o-mini'],
  balanced: ['gpt-4o', 'gpt-4-turbo'],
  premium: ['gpt-4'],
  reasoning: ['o1-preview', 'o1-mini'],
  nextgen: ['o3']
}

// Рекомендации по использованию
export const MODEL_RECOMMENDATIONS = {
  'quick-chat': 'gpt-4o-mini',
  'complex-analysis': 'gpt-4-turbo', 
  'math-science': 'o1-preview',
  'coding': 'o1-mini',
  'creative-writing': 'gpt-4o',
  'maximum-intelligence': 'o3'
}

// Получение модели по умолчанию
export const getDefaultModel = (): AIModel => OPENAI_MODELS['gpt-4o-mini']

// Получение доступных моделей
export const getAvailableModels = (): AIModel[] => {
  return Object.values(OPENAI_MODELS).filter(model => model.isAvailable)
}

// Получение модели по ID
export const getModelById = (id: string): AIModel | null => {
  return OPENAI_MODELS[id] || null
}

// Расчет стоимости для токенов
export const calculateCost = (modelId: string, inputTokens: number, outputTokens: number): number => {
  const model = getModelById(modelId)
  if (!model) return 0
  
  const inputCost = (inputTokens / 1000) * model.costPer1kTokens.input
  const outputCost = (outputTokens / 1000) * model.costPer1kTokens.output
  
  return inputCost + outputCost
} 