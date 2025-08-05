'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface DraggableWidgetProps {
  id: string
  children: React.ReactNode
  initialPosition: { x: number; y: number }
  className?: string
}

export default function DraggableWidget({ 
  id, 
  children, 
  initialPosition,
  className = ''
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
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
        ${className}
        ${isDragging ? 'opacity-50 scale-105' : 'opacity-100'}
        transition-all duration-200 ease-out
        cursor-grab active:cursor-grabbing
        hover:shadow-xl
      `}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  )
} 