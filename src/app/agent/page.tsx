'use client'

import { useEffect } from 'react'
import { useUIStore } from '../../../lib/stores/uiStore'

export default function AgentPage() {
  const setActiveView = useUIStore(s => s.setActiveView)
  useEffect(() => {
    setActiveView('agent')
  }, [setActiveView])
  return null
}