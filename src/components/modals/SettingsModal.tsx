"use client"

import { useEffect, useState } from 'react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [site, setSite] = useState('')
  useEffect(() => { setSite(process.env.NEXT_PUBLIC_SITE_URL || '') }, [])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-bold">Настройки</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl">✕</button>
        </div>
        <div className="text-sm text-gray-300">
          <div className="mb-2">Site URL: <span className="text-purple-300">{site || '—'}</span></div>
          <div className="text-gray-400">Минимальная версия модального окна.</div>
        </div>
      </div>
    </div>
  )
} 