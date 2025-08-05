import Image from "next/image";

export default function Home() {
  return (
    <div className="p-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-white mb-4">
          🚀 Инициализация завершена
        </h3>
        <div className="space-y-3 text-gray-300">
          <p>✅ Next.js 15.4.5 с TypeScript</p>
          <p>✅ Tailwind CSS настроен</p>
          <p>✅ Supabase интеграция готова</p>
          <p>✅ Базовый макет создан</p>
          <p>✅ Боковые панели функционируют</p>
        </div>
        
        <div className="mt-6 p-4 bg-purple-900/30 rounded border border-purple-700">
          <h4 className="font-medium text-purple-300 mb-2">Следующие шаги:</h4>
          <ul className="text-sm text-purple-200 space-y-1">
            <li>• Настройка глобального управления состоянием</li>
            <li>• Детальная реализация SidePanel компонента</li>
            <li>• Создание WorkspaceCanvas для Режима Дашборда</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
