import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  level: number
  createdAt: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Действия
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (email: string, password: string, name: string) => Promise<boolean>
  updateUser: (updates: Partial<User>) => void
  
  // Утилиты
  getCurrentUserId: () => string | null
  generateDemoUser: () => void
}

// Генерация уникального ID пользователя
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Создание demo пользователя с уникальными данными
const createDemoUser = (): User => {
  const userId = generateUserId()
  return {
    id: userId,
    email: 'demo@arcanum.dev',
    name: 'Arcanum Explorer',
    level: 15,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        
        try {
          // Простая demo авторизация
          if (email === 'demo@arcanum.dev' && password === 'demo') {
            const demoUser = createDemoUser()
            set({ 
              user: demoUser, 
              isAuthenticated: true, 
              isLoading: false 
            })
            return true
          }
          
          // В реальном приложении здесь будет обращение к Supabase Auth
          // const { data, error } = await supabase.auth.signInWithPassword({
          //   email,
          //   password,
          // })
          
          set({ isLoading: false })
          return false
        } catch (error) {
          console.error('Login error:', error)
          set({ isLoading: false })
          return false
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true })
        
        try {
          // Создаем нового пользователя
          const newUser: User = {
            id: generateUserId(),
            email,
            name,
            level: 1,
            createdAt: new Date().toISOString()
          }
          
          // В реальном приложении здесь будет Supabase Auth
          // const { data, error } = await supabase.auth.signUp({
          //   email,
          //   password,
          //   options: {
          //     data: { name }
          //   }
          // })
          
          set({ 
            user: newUser, 
            isAuthenticated: true, 
            isLoading: false 
          })
          return true
        } catch (error) {
          console.error('Register error:', error)
          set({ isLoading: false })
          return false
        }
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        })
        
        // В реальном приложении:
        // await supabase.auth.signOut()
      },

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

      generateDemoUser: () => {
        const demoUser = createDemoUser()
        set({ 
          user: demoUser, 
          isAuthenticated: true 
        })
      }
    }))

// Хук для получения текущего user ID
export const useCurrentUserId = () => {
  const getCurrentUserId = useAuthStore(state => state.getCurrentUserId)
  return getCurrentUserId()
}

// Хук для проверки авторизации
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, logout, register } = useAuthStore()
  return { user, isAuthenticated, isLoading, login, logout, register }
} 