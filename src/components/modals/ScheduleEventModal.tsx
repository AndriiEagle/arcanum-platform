'use client'

import { useEffect, useState } from 'react'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import { createEvent, ScheduledEventType } from '../../../lib/services/scheduledEventsService'

interface ScheduleEventModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ScheduleEventModal({ isOpen, onClose }: ScheduleEventModalProps) {
  const userId = useCurrentUserId()
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<ScheduledEventType>('image')
  const [scheduledAt, setScheduledAt] = useState('')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [mascots, setMascots] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setTitle(''); setEventType('image'); setScheduledAt(''); setUrl(''); setText(''); setMascots('')
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!userId) return
    if (!scheduledAt) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      if (eventType === 'image' || eventType === 'video' || eventType === 'audio') payload.url = url
      if (eventType === 'text') payload.text = text
      if (eventType === 'mascots') payload.mascots = mascots.split(',').map(s => s.trim()).filter(Boolean)
      await createEvent(userId, title || 'Событие', eventType, new Date(scheduledAt).toISOString(), payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-lg mx-4" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-bold">Запланировать событие</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl">✕</button>
        </div>

        <div className="space-y-3">
          <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Название" className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={eventType} onChange={(e)=>setEventType(e.target.value as ScheduledEventType)} className="bg-gray-700 text-white rounded px-3 py-2 outline-none">
              <option value="image">Изображение</option>
              <option value="video">Видео</option>
              <option value="audio">Музыка</option>
              <option value="mascots">Маскоты</option>
              <option value="text">Текст</option>
            </select>
            <input type="datetime-local" value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)} className="bg-gray-700 text-white rounded px-3 py-2 outline-none" />
          </div>

          {(eventType === 'image' || eventType === 'video' || eventType === 'audio') && (
            <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="URL контента" className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none" />
          )}

          {eventType === 'text' && (
            <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder="Краткий текст" className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none min-h-[100px]" />
          )}

          {eventType === 'mascots' && (
            <input value={mascots} onChange={(e)=>setMascots(e.target.value)} placeholder="Список URL через запятую" className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none" />
          )}

          <div className="flex space-x-2 pt-2">
            <button disabled={saving} onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded px-3 py-2">{saving ? 'Сохранение...' : 'Сохранить'}</button>
            <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white rounded px-3 py-2">Отмена</button>
          </div>
        </div>
      </div>
    </div>
  )
} 