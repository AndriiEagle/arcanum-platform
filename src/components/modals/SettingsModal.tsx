'use client'

import { useEffect, useRef, useState } from 'react'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import { getMascots, setMascot, getTelegramSettings, setTelegramEnabled, setTelegramFriend } from '../../../lib/services/customizationService'
import { uploadImageResized } from '../../../lib/services/imageUpload'
import { listDriveFiles } from '../../../lib/services/googleDriveService'

export default function SettingsModal() {
  const userId = useCurrentUserId()
  const [open, setOpen] = useState(false)
  const [site, setSite] = useState('')
  const [tokenPaste, setTokenPaste] = useState('')
  const [mascots, setMascotsState] = useState({ successUrl: '', punishmentUrl: '', warningUrl: '' })

  useEffect(() => {
    setSite(process.env.NEXT_PUBLIC_SITE_URL || '')
  }, [])

  useEffect(() => {
    (async () => {
      if (!userId) return
      const m = await getMascots(userId)
      setMascotsState({
        successUrl: m.successUrl || '',
        punishmentUrl: m.punishmentUrl || '',
        warningUrl: m.warningUrl || ''
      })
    })()
  }, [userId])

  const handleListDrive = async () => {
    if (!userId) return
    await listDriveFiles(userId)
  }

  return null
} 