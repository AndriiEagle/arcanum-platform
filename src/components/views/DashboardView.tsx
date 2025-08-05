import WorkspaceCanvas from '../canvas/WorkspaceCanvas'
import DialogueWindow from '../DialogueWindow'

export default function DashboardView() {
  return (
    <div className="w-full h-full relative bg-gray-900">
      {/* Заголовок режима дашборда */}
      <div className="absolute top-4 right-4 z-20 bg-purple-600/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-500 shadow-xl">
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold">🎯 Режим Дашборда</span>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Основная рабочая область - бесконечный холст */}
      <WorkspaceCanvas />
      
      {/* Диалоговое окно с ИИ-клоном MOYO */}
      <DialogueWindow />
    </div>
  )
} 