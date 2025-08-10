'use client'

import DashboardView from '../views/DashboardView'
import ResonanceView from '../views/ResonanceView'
import { useUIStore } from '../../../lib/stores/uiStore'
import AuthButton from '../auth/AuthButton'
import ModelSelector from '../ai/ModelSelector'
import TokenCounterSimple from '../payments/TokenCounterSimple'
import { useCurrentUserId } from '../../../lib/stores/authStore'

interface MainContentAreaProps {
  children: React.ReactNode;
}

export default function MainContentArea({ children }: MainContentAreaProps) {
  const activeView = useUIStore(s => s.activeView)
  const setActiveView = useUIStore(s => s.setActiveView)
  const middleMousePanEnabled = useUIStore(s => s.middleMousePanEnabled)
  const toggleMiddleMousePan = useUIStore(s => s.toggleMiddleMousePan)
  const autoGenerateHeaderImage = useUIStore(s => s.autoGenerateHeaderImage)
  const toggleAutoGenerateHeaderImage = useUIStore(s => s.toggleAutoGenerateHeaderImage)
  const userId = useCurrentUserId() || 'anonymous'
  console.log('[DBG][MainContentArea] render', { activeView, userId })
  
  return (
    <main className="flex-1 bg-gray-900 relative overflow-hidden">
      {/* Заголовок центральной области */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Arcanum Platform
          </h1>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => { if (typeof window !== 'undefined') { console.log('[DBG][MainContentArea] setActiveView("dashboard")'); setActiveView('dashboard') } }}
              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                activeView === 'dashboard'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-purple-600/50 hover:bg-purple-600/70 text-purple-200 hover:text-white'
              }`}
            >
              🎯 Режим Дашборда
            </button>
            <button 
              onClick={() => { if (typeof window !== 'undefined') { console.log('[DBG][MainContentArea] setActiveView("resonance")'); setActiveView('resonance') } }}
              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                activeView === 'resonance'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-blue-600/50 hover:bg-blue-600/70 text-blue-200 hover:text-white'
              }`}
            >
              🌐 Режим Резонанса
            </button>
            
            {/* Тогглы UX */}
            <div className="border-l border-gray-600 pl-4 flex items-center space-x-3">
              <button
                onClick={() => { if (typeof window !== 'undefined') { console.log('[DBG][MainContentArea] toggleMiddleMousePan'); toggleMiddleMousePan() } }}
                className={`px-3 py-1 rounded text-xs ${middleMousePanEnabled ? 'bg-gray-700 text-green-300' : 'bg-gray-700 text-gray-300'}`}
                title="Перемещение средним колесом"
              >
                🖱️ Pan {middleMousePanEnabled ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => { if (typeof window !== 'undefined') { console.log('[DBG][MainContentArea] toggleAutoGenerateHeaderImage'); toggleAutoGenerateHeaderImage() } }}
                className={`px-3 py-1 rounded text-xs ${autoGenerateHeaderImage ? 'bg-gray-700 text-green-300' : 'bg-gray-700 text-gray-300'}`}
                title="Автогенерация шапки"
              >
                🎨 Auto {autoGenerateHeaderImage ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* ЕДИНСТВЕННЫЙ селектор модели (в хедере) */}
            <div className="border-l border-gray-600 pl-4">
              <ModelSelector />
            </div>
            
            <div className="border-l border-gray-600 pl-4">
              <TokenCounterSimple userId={userId} compact={true} />
            </div>
            
            <div className="border-l border-gray-600 pl-4">
              <span className="text-xs text-gray-400">{userId !== 'anonymous' ? 'Вход выполнен' : 'Гость'}</span>
            </div>
            
            <div className="border-l border-gray-600 pl-4">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>
      
      {/* Основная рабочая область с переключением режимов */}
      <div className="h-[calc(100vh-4rem)] relative">
        {/* Панель селектора НЕ дублируем — управляется компонентом в хедере */}
        {activeView === 'dashboard' ? (
          <DashboardView />
        ) : (
          <ResonanceView />
        )}
        
        {/* Дополнительный контент от children */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
} 