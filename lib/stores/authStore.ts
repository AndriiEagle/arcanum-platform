import { create } from 'zustand'
import { createClient } from '../supabase/client'

// Интерфейс пользователя с реальными данными Supabase
interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  level: number
  createdAt: string
  role?: 'admin' | 'user' | 'premium'
  permissions?: Record<string, any>
}

// Интерфейс состояния авторизации
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  
  // Действия
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  updateUser: (updates: Partial<User>) => void
  
  // Утилиты
  getCurrentUserId: () => string | null
  hasRole: (role: string) => boolean
  isAdmin: () => boolean
  
  // Инициализация
  initialize: () => Promise<void>
  
  // Demo режим (для разработки)
  generateDemoUser: () => void
}

// Создание Supabase клиента
const supabase = createClient()

// Генерация уникального ID для demo
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Создание demo пользователя
const createDemoUser = (): User => {
  const userId = generateUserId()
  return {
    id: userId,
    email: 'demo@arcanum.dev',
    name: 'Arcanum Explorer',
    level: 15,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
    role: 'user'
  }
}

// Получение профиля пользователя из базы данных
const fetchUserProfile = async (userId: string): Promise<Partial<User> | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_user_profile', { user_uuid: userId })
    
    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
    
    return data as Partial<User>
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  // =================================================================
  // АВТОРИЗАЦИЯ (РЕАЛЬНАЯ SUPABASE ИНТЕГРАЦИЯ)
  // =================================================================
  login: async (email: string, password: string) => {
    set({ isLoading: true })
    
    try {
      // Demo режим для разработки
      if (email === 'demo@arcanum.dev' && password === 'demo') {
        const demoUser = createDemoUser()
        set({ 
          user: demoUser, 
          isAuthenticated: true, 
          isLoading: false 
        })
        return { success: true }
      }
      
      // Реальная авторизация через Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        set({ isLoading: false })
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        // Получаем дополнительную информацию о пользователе
        const profile = await fetchUserProfile(data.user.id)
        
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: profile?.name || data.user.user_metadata?.name || 'Пользователь',
          level: 1, // Базовый уровень, можно получать из user_stats
          createdAt: data.user.created_at,
          role: profile?.role || 'user',
          permissions: profile?.permissions || {}
        }
        
        set({ 
          user, 
          isAuthenticated: true, 
          isLoading: false 
        })
        
        return { success: true }
      }
      
      set({ isLoading: false })
      return { success: false, error: 'Не удалось войти в систему' }
      
    } catch (error: any) {
      console.error('Login error:', error)
      set({ isLoading: false })
      return { success: false, error: error.message || 'Произошла ошибка при входе' }
    }
  },

  // =================================================================
  // РЕГИСТРАЦИЯ
  // =================================================================
  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true })
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            name: name
          }
        }
      })
      
      if (error) {
        set({ isLoading: false })
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        // После успешной регистрации пользователь получит email для подтверждения
        // Профиль будет создан автоматически через trigger в базе данных
        set({ isLoading: false })
        return { 
          success: true, 
          error: 'Проверьте email для подтверждения регистрации' 
        }
      }
      
      set({ isLoading: false })
      return { success: false, error: 'Не удалось зарегистрировать пользователя' }
      
    } catch (error: any) {
      console.error('Register error:', error)
      set({ isLoading: false })
      return { success: false, error: error.message || 'Произошла ошибка при регистрации' }
    }
  },

  // =================================================================
  // ВЫХОД
  // =================================================================
  logout: async () => {
    try {
      await supabase.auth.signOut()
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Все равно очищаем состояние локально
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      })
    }
  },

  // =================================================================
  // УТИЛИТЫ
  // =================================================================
  updateUser: (updates: Partial<User>) => {
    const { user } = get()
    if (user) {
      set({ 
        user: { ...user, ...updates } 
      })
    }
  },

  getCurrentUserId: () => {
    const { user } = get()
    return user?.id || null
  },

  hasRole: (role: string) => {
    const { user } = get()
    if (!user) return false
    if (user.role === 'admin') return true // Админы имеют доступ ко всему
    return user.role === role
  },

  isAdmin: () => {
    const { user } = get()
    return user?.role === 'admin' || false
  },

  // =================================================================
  // ИНИЦИАЛИЗАЦИЯ СЕССИИ
  // =================================================================
  initialize: async () => {
    if (get().isInitialized) return
    
    set({ isLoading: true })
    
    try {
      // Проверяем текущую сессию
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Session error:', error)
        set({ isLoading: false, isInitialized: true })
        return
      }
      
      if (session?.user) {
        // Получаем профиль пользователя
        const profile = await fetchUserProfile(session.user.id)
        
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          name: profile?.name || session.user.user_metadata?.name || 'Пользователь',
          level: 1,
          createdAt: session.user.created_at,
          role: profile?.role || 'user',
          permissions: profile?.permissions || {}
        }
        
        set({ 
          user, 
          isAuthenticated: true, 
          isLoading: false,
          isInitialized: true
        })
      } else {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          isInitialized: true
        })
      }
      
      // Подписываемся на изменения состояния авторизации
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          
          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: profile?.name || session.user.user_metadata?.name || 'Пользователь',
            level: 1,
            createdAt: session.user.created_at,
            role: profile?.role || 'user',
            permissions: profile?.permissions || {}
          }
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } else if (event === 'SIGNED_OUT') {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        }
      })
      
    } catch (error) {
      console.error('Initialize error:', error)
      set({ 
        isLoading: false,
        isInitialized: true
      })
    }
  },

  // =================================================================
  // DEMO РЕЖИМ (для разработки)
  // =================================================================
  generateDemoUser: () => {
    const demoUser = createDemoUser()
    set({ 
      user: demoUser, 
      isAuthenticated: true 
    })
  }
}))

// =================================================================
// ЭКСПОРТИРУЕМЫЕ ХУКИ
// =================================================================

// Хук для получения текущего user ID
export const useCurrentUserId = () => {
  const getCurrentUserId = useAuthStore(state => state.getCurrentUserId)
  return getCurrentUserId()
}

// Основной хук авторизации
export const useAuth = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isInitialized,
    login, 
    logout, 
    register, 
    hasRole,
    isAdmin,
    initialize
  } = useAuthStore()
  
  return { 
    user, 
    isAuthenticated, 
    isLoading, 
    isInitialized,
    login, 
    logout, 
    register,
    hasRole,
    isAdmin,
    initialize
  }
}

// Хук для проверки ролей
export const useRole = () => {
  const hasRole = useAuthStore(state => state.hasRole)
  const isAdmin = useAuthStore(state => state.isAdmin)
  const user = useAuthStore(state => state.user)
  
  return {
    hasRole,
    isAdmin,
    currentRole: user?.role || null
  }
} 