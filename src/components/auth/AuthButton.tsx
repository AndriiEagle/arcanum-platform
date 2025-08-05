'use client'

import { useState } from 'react'
import { useAuth } from '../../../lib/stores/authStore'

export default function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [email, setEmail] = useState('demo@arcanum.dev')
  const [password, setPassword] = useState('demo')

  const handleLogin = async () => {
    const success = await login(email, password)
    if (success) {
      setShowLoginForm(false)
    }
  }

  const handleDemoLogin = async () => {
    await login('demo@arcanum.dev', 'demo')
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-300">Загрузка...</span>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-white">{user.name.charAt(0)}</span>
          </div>
          <div className="text-sm">
            <div className="text-white font-medium">{user.name}</div>
            <div className="text-gray-400 text-xs">Уровень {user.level}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-white transition-colors"
          title="Выйти"
        >
          Выход
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {!showLoginForm ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDemoLogin}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            🚀 Demo Вход
          </button>
          <button
            onClick={() => setShowLoginForm(true)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Войти
          </button>
        </div>
      ) : (
        <div className="absolute right-0 top-0 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[250px] z-50">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleLogin}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Войти
              </button>
              <button
                onClick={() => setShowLoginForm(false)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Отмена
              </button>
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
              Demo: demo@arcanum.dev / demo
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 