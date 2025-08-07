import { create } from 'zustand'

interface UIState {
  // Состояние видимости панелей
  isLeftPanelOpen: boolean
  isRightPanelOpen: boolean
  
  // Активный режим центральной панели
  activeView: 'dashboard' | 'resonance'
  
  // Состояние диалогового окна
  isDialogueOpen: boolean

  // Тогглы UX
  middleMousePanEnabled: boolean
  autoGenerateHeaderImage: boolean
  
  // Действия для управления панелями
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  
  // Дополнительные действия
  setLeftPanel: (isOpen: boolean) => void
  setRightPanel: (isOpen: boolean) => void
  
  // Управление режимами
  setActiveView: (view: 'dashboard' | 'resonance') => void
  toggleView: () => void
  
  // Управление диалоговым окном
  toggleDialogue: () => void
  setDialogue: (isOpen: boolean) => void

  // Тогглы UX actions
  toggleMiddleMousePan: () => void
  toggleAutoGenerateHeaderImage: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Изначально обе панели открыты (15% ширины)
  isLeftPanelOpen: true,
  isRightPanelOpen: false,
  
  // По умолчанию активен режим дашборда
  activeView: 'dashboard',
  
  // Диалоговое окно открыто по умолчанию
  isDialogueOpen: true,

  // Тогглы UX (дефолты)
  middleMousePanEnabled: true,
  autoGenerateHeaderImage: true,
  
  // Переключение состояния панелей
  toggleLeftPanel: () => set((state) => ({ 
    isLeftPanelOpen: !state.isLeftPanelOpen 
  })),
  
  toggleRightPanel: () => set((state) => ({ 
    isRightPanelOpen: !state.isRightPanelOpen 
  })),
  
  // Прямая установка состояния панелей
  setLeftPanel: (isOpen: boolean) => set({ isLeftPanelOpen: isOpen }),
  setRightPanel: (isOpen: boolean) => set({ isRightPanelOpen: isOpen }),
  
  // Управление режимами
  setActiveView: (view: 'dashboard' | 'resonance') => set((state) => {
    // При переключении в режим резонанса сворачиваем панели до 5%
    if (view === 'resonance') {
      return {
        activeView: view,
        isLeftPanelOpen: false,
        isRightPanelOpen: false
      }
    }
    // При возврате в дашборд возвращаем панели
    return {
      activeView: view,
      isLeftPanelOpen: true,
      isRightPanelOpen: true
    }
  }),
  
  toggleView: () => set((state) => {
    const newView = state.activeView === 'dashboard' ? 'resonance' : 'dashboard'
    // Используем логику из setActiveView
    if (newView === 'resonance') {
      return {
        activeView: newView,
        isLeftPanelOpen: false,
        isRightPanelOpen: false
      }
    }
    return {
      activeView: newView,
      isLeftPanelOpen: true,
      isRightPanelOpen: true
    }
  }),
  
  // Управление диалоговым окном
  toggleDialogue: () => set((state) => ({ 
    isDialogueOpen: !state.isDialogueOpen 
  })),
  
  setDialogue: (isOpen: boolean) => set({ isDialogueOpen: isOpen }),

  // Тогглы UX actions
  toggleMiddleMousePan: () => set((state) => ({ middleMousePanEnabled: !state.middleMousePanEnabled })),
  toggleAutoGenerateHeaderImage: () => set((state) => ({ autoGenerateHeaderImage: !state.autoGenerateHeaderImage })),
})) 