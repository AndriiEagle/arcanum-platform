'use client'

import { useState } from 'react'
import { useAuth } from '../../../lib/stores/authStore'
import { createClient } from '../../../lib/supabase/client'

type AuthMode = 'login' | 'register' | null

export default function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout, register } = useAuth()
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [pwd1, setPwd1] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [formData, setFormData] = useState({
    email: 'demo@arcanum.dev',
    password: 'demo',
    name: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChangePassword = async () => {
    setPwdError('')
    if (pwd1.length < 8) { setPwdError('Минимум 8 символов'); return }
    if (pwd1 !== pwd2) { setPwdError('Пароли не совпадают'); return }
    try {
      setPwdSaving(true)
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: pwd1 })
      if (error) { setPwdError(error.message); return }
      setShowChangePwd(false)
      setPwd1(''); setPwd2('')
    } finally {
      setPwdSaving(false)
    }
  }

  const handleAuth = async () => {
    if (!authMode) return

    setIsSubmitting(true)
    setError('')

    try {
      let result
      if (authMode === 'login') {
        result = await login(formData.email, formData.password)
      } else {
        result = await register(formData.email, formData.password, formData.name)
      }

      if (result.success) {
        setAuthMode(null)
        if (authMode === 'register' && result.error) {
          // Это сообщение о подтверждении email
          setError(result.error)
        }
      } else {
        setError(result.error || 'Произошла ошибка')
      }
    } catch (error) {
      setError('Произошла неожиданная ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsSubmitting(true)
    const result = await login('demo@arcanum.dev', 'demo')
    if (!result.success) {
      setError(result.error || 'Ошибка входа в demo режим')
    }
    setIsSubmitting(false)
  }

  const resetForm = () => {
    setAuthMode(null)
    setError('')
    setFormData({
      email: 'demo@arcanum.dev',
      password: 'demo',
      name: ''
    })
  }

  const handleLogout = async () => {
    await logout()
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
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">{user.name.charAt(0)}</span>
            </div>
          )}
          <div className="text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium">{user.name}</span>
              {user.role === 'admin' && (
                <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                  ADMIN
                </span>
              )}
              {user.role === 'premium' && (
                <span className="bg-yellow-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                  PRO
                </span>
              )}
            </div>
            <div className="text-gray-400 text-xs">Уровень {user.level}</div>
          </div>
        </div>
        <button
          onClick={() => setShowChangePwd(true)}
          className="text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
          title="Сменить пароль"
        >
          Сменить пароль
        </button>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-white transition-colors"
          title="Выйти"
        >
          Выход
        </button>

        {showChangePwd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={()=>setShowChangePwd(false)}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-full max-w-sm mx-4" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-medium">Сменить пароль</h3>
                <button onClick={()=>setShowChangePwd(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Новый пароль</label>
                  <input type="password" value={pwd1} onChange={(e)=>setPwd1(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500" placeholder="Минимум 8 символов" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Повторите пароль</label>
                  <input type="password" value={pwd2} onChange={(e)=>setPwd2(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500" />
                </div>
                {pwdError && <div className="bg-red-900/50 border border-red-700 rounded p-2 text-xs text-red-300">{pwdError}</div>}
                <div className="flex items-center justify-end space-x-2">
                  <button onClick={()=>setShowChangePwd(false)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded">Отмена</button>
                  <button onClick={handleChangePassword} disabled={pwdSaving} className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded">{pwdSaving ? 'Сохранение...' : 'Сохранить'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {!authMode ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDemoLogin}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          >
            {isSubmitting ? '...' : '🚀 Demo'}
          </button>
          <button
            onClick={() => setAuthMode('login')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Войти
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Регистрация
          </button>
        </div>
      ) : (
        <div className="absolute right-0 top-0 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[280px] z-50">
          <div className="space-y-3">
            {/* Заголовок */}
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">
                {authMode === 'login' ? 'Вход' : 'Регистрация'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Форма */}
            <div className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Имя</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="Ваше имя"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Пароль</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded p-2">
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleAuth}
                disabled={isSubmitting || !formData.email || !formData.password || (authMode === 'register' && !formData.name)}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                {isSubmitting ? 'Обработка...' : authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </button>
              
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {authMode === 'login' ? 'Регистрация' : 'Вход'}
                </button>
                <span className="text-gray-600">•</span>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>

            {/* Demo подсказка */}
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
              <strong>Demo:</strong> demo@arcanum.dev / demo
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 