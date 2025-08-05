'use client'

import { useState } from 'react'
import WorkspaceCanvas from '../canvas/WorkspaceCanvas'
import DialogueWindow from '../DialogueWindow'

export default function DashboardView() {
  const [isDialogueOpen, setIsDialogueOpen] = useState(true)

  const toggleDialogue = () => {
    setIsDialogueOpen(!isDialogueOpen)
  }

  return (
    <div className="w-full h-full relative bg-gray-900">
      {/* Основная рабочая область - бесконечный холст */}
      <WorkspaceCanvas />
      
      {/* Диалоговое окно с ИИ-клоном MOYO */}
      <DialogueWindow 
        isOpen={isDialogueOpen}
        onToggle={toggleDialogue}
      />
    </div>
  )
} 