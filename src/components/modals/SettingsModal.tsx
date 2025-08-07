'use client'

import { useEffect, useRef, useState } from 'react'
import { useCurrentUserId } from '../../../lib/stores/authStore'
import { getMascots, setMascot, getTelegramSettings, setTelegramEnabled, setTelegramFriend } from '../../../lib/services/customizationService'
import { uploadImageResized } from '../../../lib/services/imageUpload'
import { listDriveFiles } from '../../../lib/services/googleDriveService'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const userId = useCurrentUserId()

  const [successUrl, setSuccessUrl] = useState<string | undefined>()
  const [penaltyUrl, setPenaltyUrl] = useState<string | undefined>()
  const [warningUrl, setWarningUrl] = useState<string | undefined>()

  const [tgEnabled, setTgEnabled] = useState(false)
  const [friendChatId, setFriendChatId] = useState('')
  const [friendName, setFriendName] = useState('')
  const [saving, setSaving] = useState(false)

  const [driveConnected, setDriveConnected] = useState<boolean | null>(null)
  const [driveFiles, setDriveFiles] = useState<any[]>([])
  const [tokenPaste, setTokenPaste] = useState('')

  const successRef = useRef<HTMLInputElement | null>(null)
  const penaltyRef = useRef<HTMLInputElement | null>(null)
  const warningRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen || !userId) return
    (async () => {
      const mascots = await getMascots(userId)
      setSuccessUrl(mascots.successUrl)
      setPenaltyUrl(mascots.punishmentUrl)
      setWarningUrl(mascots.warningUrl)
      const tg = await getTelegramSettings(userId)
      setTgEnabled(Boolean(tg.enabled))
      setFriendChatId(tg.friendChatId || '')
      setFriendName(tg.friendName || '')
    })()
  }, [isOpen, userId])

  const uploadMascot = async (type: 'successUrl' | 'punishmentUrl' | 'warningUrl', file: File) => {
    if (!userId) return
    const { url } = await uploadImageResized(file, { bucket: 'public-assets', pathPrefix: `mascots/${userId}`, maxSize: 128 })
    await setMascot(userId, type, url)
    if (type === 'successUrl') setSuccessUrl(url)
    if (type === 'punishmentUrl') setPenaltyUrl(url)
    if (type === 'warningUrl') setWarningUrl(url)
  }

  const onFileChange = async (type: 'successUrl' | 'punishmentUrl' | 'warningUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    await uploadMascot(type, f)
    e.target.value = ''
  }

  const saveTelegram = async () => {
    if (!userId) return
    setSaving(true)
    try {
      await setTelegramEnabled(userId, tgEnabled)
      if (friendChatId) await setTelegramFriend(userId, friendChatId, friendName || undefined)
    } finally {
      setSaving(false)
    }
  }

  const checkDrive = async () => {
    if (!userId) return
    try {
      const files = await listDriveFiles(userId)
      setDriveConnected(true)
      setDriveFiles(files)
    } catch {
      setDriveConnected(false)
      setDriveFiles([])
    }
  }

  const startGoogleOAuth = async () => {
    if (!userId) return
    const site = process.env.NEXT_PUBLIC_SITE_URL || ''
    const url = `/api/integrations/google/auth?userId=${encodeURIComponent(userId)}`
    window.location.href = url
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl mx-4" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-bold">Настройки</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl">✕</button>
        </div>

        <div className="space-y-6">
          <section>
            <h4 className="text-white font-semibold mb-3">Маскоты (PNG Transparent)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-750 rounded p-3">
                <div className="text-sm text-gray-300 mb-2">Успех</div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                    {successUrl ? <img src={successUrl} alt="success" className="w-16 h-16 object-cover"/> : <span>🎉</span>}
                  </div>
                  <div>
                    <button className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded" onClick={() => successRef.current?.click()}>Загрузить</button>
                    <input ref={successRef} type="file" accept="image/png,image/webp" className="hidden" onChange={(e)=>onFileChange('successUrl', e)} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-750 rounded p-3">
                <div className="text-sm text-gray-300 mb-2">Штраф</div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                    {penaltyUrl ? <img src={penaltyUrl} alt="penalty" className="w-16 h-16 object-cover"/> : <span>⚠️</span>}
                  </div>
                  <div>
                    <button className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded" onClick={() => penaltyRef.current?.click()}>Загрузить</button>
                    <input ref={penaltyRef} type="file" accept="image/png,image/webp" className="hidden" onChange={(e)=>onFileChange('punishmentUrl', e)} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-750 rounded p-3">
                <div className="text-sm text-gray-300 mb-2">Warning</div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                    {warningUrl ? <img src={warningUrl} alt="warning" className="w-16 h-16 object-cover"/> : <span>🔔</span>}
                  </div>
                  <div>
                    <button className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded" onClick={() => warningRef.current?.click()}>Загрузить</button>
                    <input ref={warningRef} type="file" accept="image/png,image/webp" className="hidden" onChange={(e)=>onFileChange('warningUrl', e)} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-3">Telegram уведомления</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-gray-200">
                <input type="checkbox" checked={tgEnabled} onChange={(e)=>setTgEnabled(e.target.checked)} />
                <span>Включить уведомления другу в Telegram</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={friendChatId} onChange={(e)=>setFriendChatId(e.target.value)} placeholder="Friend Chat ID" className="bg-gray-700 text-white rounded px-3 py-2 outline-none" />
                <input value={friendName} onChange={(e)=>setFriendName(e.target.value)} placeholder="Имя друга (опц.)" className="bg-gray-700 text-white rounded px-3 py-2 outline-none" />
              </div>
              <div>
                <button disabled={saving} onClick={saveTelegram} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white px-4 py-2 rounded">
                  {saving ? 'Сохранение...' : 'Сохранить' }
                </button>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-white font-semibold mb-3">Google Drive</h4>
            <div className="space-y-3">
              <div className="text-sm text-gray-300">Подключение (полный OAuth или временный токен)</div>
              <div className="flex items-center gap-3 mb-2">
                <button onClick={startGoogleOAuth} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Войти через Google</button>
                <button onClick={checkDrive} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded">Проверить</button>
              </div>
              {driveConnected === true && (
                <div className="text-green-400 text-sm">Подключено. Файлы:</div>
              )}
              {driveConnected === false && (
                <div className="text-red-400 text-sm">Не подключено. Проверьте токен.</div>
              )}
              {driveFiles.length > 0 && (
                <ul className="text-sm text-gray-200 list-disc pl-5">
                  {driveFiles.map((f)=> (
                    <li key={f.id}>{f.name} ({f.mimeType})</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
} 