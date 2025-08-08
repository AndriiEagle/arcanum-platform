'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface DraggableWidgetProps {
  id: string
  children: React.ReactNode
  initialPosition: { x: number; y: number }
  className?: string
  disabled?: boolean
}

export default function DraggableWidget({ 
  id, 
  children, 
  initialPosition,
  className = '',
  disabled = false
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: id,
    disabled
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Блокируем всплытие события для предотвращения панорамирования дашборда
    e.stopPropagation()
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'absolute' as const,
        left: initialPosition.x,
        top: initialPosition.y,
      }}
      className={`
        draggable-widget
        ${className}
        ${isDragging ? 'opacity-50 scale-105' : 'opacity-100'}
        transition-all duration-200 ease-out
        ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        hover:shadow-xl
      `}
      onMouseDown={handleMouseDown}
      {...listeners}
      {...attributes}
    >
      <div className="widget-content">
        {children}
      </div>
    </div>
  )
} 