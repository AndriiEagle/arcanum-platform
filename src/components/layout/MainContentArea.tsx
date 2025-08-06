'use client'

import DashboardView from '../views/DashboardView'
import ResonanceView from '../views/ResonanceView'
import { useUIStore } from '../../../lib/stores/uiStore'
import AuthButton from '../auth/AuthButton'
import ModelSelector from '../ai/ModelSelector'
// import TokenCounter from '../payments/TokenCounter'

interface MainContentAreaProps {
  children: React.ReactNode;
}

export default function MainContentArea({ children }: MainContentAreaProps) {
  const { activeView, setActiveView } = useUIStore()
  
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
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                activeView === 'dashboard'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-purple-600/50 hover:bg-purple-600/70 text-purple-200 hover:text-white'
              }`}
            >
              🎯 Режим Дашборда
            </button>
            <button 
              onClick={() => setActiveView('resonance')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                activeView === 'resonance'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-blue-600/50 hover:bg-blue-600/70 text-blue-200 hover:text-white'
              }`}
            >
              🌐 Режим Резонанса
            </button>
            
            <div className="border-l border-gray-600 pl-4">
              <ModelSelector />
            </div>
            
            <div className="border-l border-gray-600 pl-4">
              <span className="text-xs text-gray-400">Payment API готов</span>
            </div>
            
            <div className="border-l border-gray-600 pl-4">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>
      
      {/* Основная рабочая область с переключением режимов */}
      <div className="h-[calc(100vh-4rem)] relative">
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