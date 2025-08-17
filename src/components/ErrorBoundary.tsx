'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // В продакшене отправить в сервис мониторинга ошибок
    if (typeof window !== 'undefined') {
      // Например, Sentry, LogRocket, или ваш собственный сервис
      // window.errorLogger?.captureException(error, { extra: errorInfo })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Если передан кастомный fallback компонент
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} reset={this.handleReset} />
      }

      // Дефолтный fallback UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
          <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full border border-red-500/30">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Произошла ошибка приложения
              </h1>
              <p className="text-gray-400 mb-6">
                К сожалению, что-то пошло не так. Мы уже работаем над устранением проблемы.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={this.handleReset}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                🔄 Попробовать снова
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                🔃 Перезагрузить страницу
              </button>
            </div>

            {/* Детали ошибки для разработки */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 bg-gray-900/50 rounded p-4">
                <summary className="text-red-400 font-medium cursor-pointer mb-2">
                  🔍 Детали ошибки (только для разработки)
                </summary>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong className="text-red-300">Ошибка:</strong>
                    <pre className="text-red-200 bg-gray-900 p-2 rounded mt-1 overflow-auto text-xs">
                      {this.state.error.message}
                    </pre>
                  </div>
                  <div>
                    <strong className="text-red-300">Stack Trace:</strong>
                    <pre className="text-red-200 bg-gray-900 p-2 rounded mt-1 overflow-auto text-xs">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong className="text-red-300">Component Stack:</strong>
                      <pre className="text-red-200 bg-gray-900 p-2 rounded mt-1 overflow-auto text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 